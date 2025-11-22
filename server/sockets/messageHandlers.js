/**
 * Message Socket Handlers
 *
 * Handles all message-related socket events:
 * - message: Create new message
 * - like: Toggle like on message
 * - reaction: Toggle emoji reaction on message
 * - editMessage: Edit existing message
 * - deleteMessage: Delete message (soft delete)
 * - replyToMessage: Reply to a message (threaded conversations)
 */

const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const {
  createMessage,
  toggleMessageLike,
  editMessage,
  deleteMessage,
  replyToMessage,
  toggleReaction,
} = require("../controllers/messageController");

/**
 * Register all message-related socket event handlers
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 */
function registerMessageHandlers(socket, io) {
  // Listen for new messages
  socket.on("message", async (newMessageData) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("message")) {
        socket.emit("rateLimit", {
          eventType: "message",
          message: "Too many messages. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      const correlationId = newMessageData._meta?.correlationId || uuidv4();
      logger.socket.info("Message received from client", {
        socketId: socket.id,
        userId: socket.user.id,
        username: socket.user.username,
        tempId: newMessageData.tempId,
        correlationId,
      });

      // Validate message text
      const text = newMessageData.text;

      // Basic validation
      if (!text || typeof text !== "string" || !text.trim()) {
        logger.socket.warn("Message rejected: empty text", {
          socketId: socket.id,
          userId: socket.user.id,
          correlationId,
        });
        socket.emit("error", { message: "Message text is required" });
        return;
      }

      // Check message length
      if (text.length > 500) {
        logger.socket.warn("Message rejected: too long", {
          socketId: socket.id,
          userId: socket.user.id,
          textLength: text.length,
          correlationId,
        });
        socket.emit("error", {
          message: "Message is too long (max 500 characters)",
        });
        return;
      }

      // Use authenticated user information from socket
      const userName = socket.user.username;

      // Prepare message data with correlation ID for tracing
      const messageData = {
        user: userName, // Use the server-known username
        text: text.trim(), // Sanitize the message text
        timestamp: new Date(), // Add timestamp
        likes: 0, // Initialize likes
        _meta: { correlationId, tempId: newMessageData.tempId },
      };

      // Save message to database
      const savedMessage = await createMessage(messageData);

      // Add correlation ID to the response for client-side tracking
      const messageResponse = {
        ...savedMessage.toObject(),
        tempId: newMessageData.tempId, // Return temp ID for optimistic UI update replacement
      };

      // Enhance the messageResponse with debug metadata
      const enhancedResponse = {
        ...messageResponse,
        _meta: {
          ...(messageResponse._meta || {}),
          eventType: "sendMessage", // Mark the event type
          correlationId,
          serverTimestamp: new Date().toISOString(),
          broadcastTime: Date.now(),
          fromSocketId: socket.id,
          fromUserId: socket.user.id,
          fromUsername: socket.user.username,
        },
      };

      // Log connected clients before broadcast
      const connectedClientIds = Object.keys(io.sockets.sockets);
      logger.socket.info(
        `Broadcasting message to ${connectedClientIds.length} connected clients`,
        {
          clientIds: connectedClientIds,
        }
      );

      // Broadcast using sendMessage event type
      io.emit("sendMessage", enhancedResponse);

      // Also create a variant with the "message" event type
      const messageTypeResponse = {
        ...enhancedResponse,
        _meta: {
          ...enhancedResponse._meta,
          eventType: "message", // Override event type for the message event
        },
      };

      // Also broadcast as plain "message" event for broader client compatibility
      io.emit("message", messageTypeResponse);

      // Log detailed broadcast information
      logger.socket.info("Message broadcast complete", {
        messageId: savedMessage._id,
        userId: socket.user.id,
        username: socket.user.username,
        tempId: newMessageData.tempId,
        correlationId,
        events: ["sendMessage", "message"],
        timestamp: new Date().toISOString(),
        clientCount: connectedClientIds.length,
      });

      // Debug: Verify each client socket received the message
      connectedClientIds.forEach((clientId) => {
        const clientSocket = io.sockets.sockets[clientId];
        logger.socket.debug(`Verifying message sent to client: ${clientId}`, {
          clientInfo: {
            id: clientId,
            connected: clientSocket?.connected || false,
          },
        });
      });
    } catch (error) {
      logger.socket.error("Error processing message", {
        socketId: socket.id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });

      // Notify the client of the error
      socket.emit("error", { message: "Failed to process message" });
    }
  });

  // Listen for like updates (backward compatibility for legacy clients)
  socket.on("like", async ({ id }) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("like")) {
        socket.emit("rateLimit", {
          eventType: "like",
          message: "Too many like requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      // Basic validation: Ensure message id is provided
      if (id && socket.user && socket.user.id) {
        // Toggle like status in the database
        const updatedMessage = await toggleMessageLike(id, socket.user.id);

        if (updatedMessage) {
          logger.socket.info("Like toggled", {
            messageId: id,
            userId: socket.user.id,
            username: socket.user.username,
            newLikeCount: updatedMessage.likes,
          });

          // Broadcast the update to all clients
          io.emit("messageUpdated", {
            id,
            likes: updatedMessage.likes,
            likedBy: updatedMessage.likedBy,
            reactions: updatedMessage.reactions,
          });
        } else {
          logger.socket.warn("Message not found for like", {
            messageId: id,
            userId: socket.user?.id,
          });
          socket.emit("error", { message: "Message not found" });
        }
      } else {
        logger.socket.warn("Invalid like event or user not authenticated", {
          hasId: !!id,
          hasUser: !!socket.user,
          hasUserId: !!socket.user?.id,
        });
        socket.emit("error", {
          message: "Invalid like data or not authenticated",
        });
      }
    } catch (error) {
      logger.socket.error("Error updating likes", {
        messageId: id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", { message: "Failed to update likes" });
    }
  });

  // Listen for reaction updates (new system for all emoji reactions)
  socket.on("reaction", async ({ id, emoji }) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("reaction")) {
        socket.emit("rateLimit", {
          eventType: "reaction",
          message: "Too many reaction requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      // Basic validation
      if (!id || !emoji || !socket.user || !socket.user.id) {
        socket.emit("error", {
          message: "Invalid reaction data or not authenticated",
        });
        return;
      }

      // Toggle reaction in the database
      const updatedMessage = await toggleReaction(id, socket.user.id, emoji);

      if (updatedMessage) {
        logger.socket.info("Reaction toggled", {
          messageId: id,
          userId: socket.user.id,
          username: socket.user.username,
          emoji,
        });

        // Broadcast the update to all clients
        io.emit("messageUpdated", {
          id,
          likes: updatedMessage.likes, // Include for backward compatibility
          likedBy: updatedMessage.likedBy, // Include for backward compatibility
          reactions: updatedMessage.reactions,
        });
      } else {
        socket.emit("error", { message: "Message not found" });
      }
    } catch (error) {
      logger.socket.error("Error handling reaction", {
        messageId: id,
        userId: socket.user?.id,
        emoji,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", { message: "Failed to update reaction" });
    }
  });

  // Listen for message edit requests
  socket.on("editMessage", async ({ id, text }) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("editMessage")) {
        socket.emit("rateLimit", {
          eventType: "editMessage",
          message: "Too many edit requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      // Basic validation
      if (!id || !text || typeof text !== "string" || !text.trim()) {
        socket.emit("error", { message: "Message ID and text are required" });
        return;
      }

      // Check message length
      if (text.length > 500) {
        socket.emit("error", {
          message: "Message is too long (max 500 characters)",
        });
        return;
      }

      // Edit message in database
      const updatedMessage = await editMessage(id, socket.user.id, text.trim());

      if (updatedMessage) {
        logger.socket.info("Message edited", {
          messageId: id,
          userId: socket.user.id,
          username: socket.user.username,
        });

        // Broadcast the updated message to all clients
        io.emit("messageEdited", updatedMessage);
      } else {
        socket.emit("error", { message: "Failed to edit message" });
      }
    } catch (error) {
      logger.socket.error("Error editing message", {
        messageId: id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", {
        message: error.message || "Failed to edit message",
      });
    }
  });

  // Listen for message delete requests
  socket.on("deleteMessage", async (data) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("deleteMessage")) {
        socket.emit("rateLimit", {
          eventType: "deleteMessage",
          message: "Too many delete requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      logger.socket.info("Delete message request received", {
        data,
        userId: socket.user?.id,
        username: socket.user?.username,
      });

      // Extract message ID from payload
      const { id } = data;

      // Basic validation
      if (!id) {
        socket.emit("error", { message: "Message ID is required" });
        return;
      }

      // Delete message in database (soft delete)
      const deletedMessage = await deleteMessage(id, socket.user.id);

      if (deletedMessage) {
        logger.socket.info("Message deleted", {
          messageId: id,
          userId: socket.user.id,
          username: socket.user.username,
        });

        // Broadcast the deletion to all clients
        io.emit("messageDeleted", { id });
      } else {
        socket.emit("error", { message: "Failed to delete message" });
      }
    } catch (error) {
      logger.socket.error("Error deleting message", {
        messageId: data?.id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", {
        message: error.message || "Failed to delete message",
      });
    }
  });

  // Listen for message replies
  socket.on("replyToMessage", async ({ parentId, text }) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("replyToMessage")) {
        socket.emit("rateLimit", {
          eventType: "replyToMessage",
          message: "Too many reply requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      // Validate required fields
      if (!parentId || !text || typeof text !== "string" || !text.trim()) {
        socket.emit("error", {
          message: "Parent message ID and reply text are required",
        });
        return;
      }

      // Check message length
      if (text.length > 500) {
        socket.emit("error", {
          message: "Reply is too long (max 500 characters)",
        });
        return;
      }

      // Use authenticated user information from socket
      const userName = socket.user.username;

      // Prepare message data
      const messageData = {
        user: userName,
        text: text.trim(),
        timestamp: new Date(),
        likes: 0,
      };

      // Save reply to database
      const savedReply = await replyToMessage(messageData, parentId);

      if (savedReply) {
        logger.socket.info("Reply created", {
          parentId,
          replyId: savedReply._id,
          userId: socket.user.id,
          username: userName,
        });

        // Broadcast the new reply to all clients
        io.emit("replyCreated", savedReply);
      } else {
        socket.emit("error", { message: "Failed to create reply" });
      }
    } catch (error) {
      logger.socket.error("Error creating reply", {
        parentId,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", {
        message: error.message || "Failed to create reply",
      });
    }
  });
}

module.exports = { registerMessageHandlers };
