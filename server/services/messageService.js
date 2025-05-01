const Message = require("../models/message");
const { findUserByUsername, findMessageById } = require("../utils/dbUtils");
const { validateObjectId } = require("../utils/validationUtils");
const logger = require("../utils/logger").message; // Assuming logger setup allows this

/**
 * Service layer for handling message-related business logic.
 */
class MessageService {
  /**
   * Handles errors consistently within the service.
   * @param {string} operation - The operation being performed (e.g., 'creation', 'editing').
   * @param {Error} error - The error object.
   */
  _handleError(operation, error) {
    logger.error(`Error during message ${operation}`, {
      operation,
      errorMessage: error.message,
      stack: error.stack,
    });
    // Re-throw the error to be caught by the controller or calling function
    throw error;
  }

  /**
   * Creates a new message.
   * @param {Object} messageData - Data for the new message (user, text, tempId, etc.).
   * @returns {Promise<Message>} The saved message document.
   */
  async createMessage(messageData) {
    try {
      logger.info("Service: Creating new message", {
        user: messageData.user,
        tempId: messageData.tempId,
        correlationId: messageData._meta?.correlationId,
      });

      // Find the user by username to get userId
      const user = await findUserByUsername(messageData.user);

      // Create message with userId
      const message = new Message({
        ...messageData,
        userId: user._id,
        likedBy: [], // Initialize likedBy
        reactions: new Map(), // Initialize reactions
      });

      const savedMessage = await message.save();

      logger.info("Service: Message created successfully", {
        messageId: savedMessage._id,
        user: savedMessage.user,
        correlationId: messageData._meta?.correlationId,
      });

      return savedMessage;
    } catch (error) {
      logger.error("Service: Failed to create message", {
        error: error.message,
        user: messageData?.user,
        stack: error.stack,
        correlationId: messageData?._meta?.correlationId,
      });
      this._handleError("creation", error);
    }
  }

  /**
   * Checks if a user owns a specific message.
   * Throws an error if the user is not the owner.
   * @param {Message} message - The message document.
   * @param {string|ObjectId} userId - The ID of the user to check.
   */
  _checkOwnership(message, userId) {
    if (!message.userId.equals(userId)) {
      throw new Error("Not authorized to modify this message");
    }
  }

  /**
   * Edits an existing message.
   * @param {string} messageId - ID of the message to edit.
   * @param {string} userId - ID of the user performing the edit.
   * @param {string} newText - The new text content for the message.
   * @returns {Promise<Message>} The updated message document.
   */
  async editMessage(messageId, userId, newText) {
    try {
      logger.info("Service: Editing message", { messageId, userId });

      validateObjectId(messageId);
      validateObjectId(userId);

      if (!newText || !newText.trim()) {
        logger.warn("Service: Edit rejected - empty message text", {
          messageId,
          userId,
        });
        throw new Error("New message text cannot be empty");
      }

      const message = await findMessageById(messageId);
      this._checkOwnership(message, userId);

      if (message.isDeleted) {
        logger.warn("Service: Edit rejected - message is deleted", {
          messageId,
          userId,
        });
        throw new Error("Cannot edit a deleted message");
      }

      const editHistoryItem = {
        text: message.text,
        editedAt: new Date(),
      };

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        {
          text: newText,
          isEdited: true,
          $push: { editHistory: editHistoryItem },
        },
        { new: true }
      );

      logger.info("Service: Message edited successfully", {
        messageId,
        userId,
        editHistoryCount: (updatedMessage.editHistory || []).length,
      });

      return updatedMessage;
    } catch (error) {
      logger.error("Service: Failed to edit message", {
        messageId,
        userId,
        errorMessage: error.message,
        stack: error.stack,
      });
      this._handleError("editing", error);
    }
  }

  /**
   * Deletes a message (soft delete).
   * @param {string} messageId - ID of the message to delete.
   * @param {string} userId - ID of the user performing the deletion.
   * @returns {Promise<Message>} The updated message document with isDeleted flag.
   */
  async deleteMessage(messageId, userId) {
    try {
      logger.info("Service: Deleting message", { messageId, userId });

      validateObjectId(messageId);
      validateObjectId(userId);

      const message = await findMessageById(messageId);
      this._checkOwnership(message, userId);

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { isDeleted: true },
        { new: true }
      );

      logger.info("Service: Message deleted successfully", {
        messageId,
        userId,
      });
      return updatedMessage;
    } catch (error) {
      logger.error("Service: Failed to delete message", {
        messageId,
        userId,
        errorMessage: error.message,
        stack: error.stack,
      });
      this._handleError("deletion", error);
    }
  }

  /**
   * Creates a reply to a message.
   * @param {Object} messageData - Data for the reply message (user, text, etc.).
   * @param {string} parentId - ID of the parent message.
   * @returns {Promise<Message>} The saved reply message document.
   */
  async replyToMessage(messageData, parentId) {
    try {
      logger.info("Service: Creating reply to message", {
        parentId,
        user: messageData.user,
        tempId: messageData.tempId,
        correlationId: messageData._meta?.correlationId,
      });

      validateObjectId(parentId);
      await findMessageById(parentId); // Ensure parent exists

      const user = await findUserByUsername(messageData.user);

      const reply = new Message({
        ...messageData,
        userId: user._id,
        parentId: parentId,
        likedBy: [],
        reactions: new Map(),
      });

      const savedReply = await reply.save();

      logger.info("Service: Reply created successfully", {
        messageId: savedReply._id,
        parentId,
        user: savedReply.user,
        correlationId: messageData._meta?.correlationId,
      });

      return savedReply;
    } catch (error) {
      logger.error("Service: Failed to create reply", {
        error: error.message,
        user: messageData?.user,
        parentId,
        stack: error.stack,
        correlationId: messageData?._meta?.correlationId,
      });
      this._handleError("reply creation", error);
    }
  }

  /**
   * Toggles a reaction on a message.
   * @param {string} messageId - ID of the message to react to.
   * @param {string} userId - ID of the user adding/removing the reaction.
   * @param {string} emoji - The emoji reaction.
   * @returns {Promise<Message>} The updated message document.
   */
  async toggleReaction(messageId, userId, emoji) {
    try {
      logger.info("Service: Toggling reaction", { messageId, userId, emoji });

      validateObjectId(messageId);
      validateObjectId(userId);

      if (!emoji) {
        logger.warn("Service: Reaction rejected - missing emoji", {
          messageId,
          userId,
        });
        throw new Error("Emoji reaction required");
      }

      const message = await findMessageById(messageId);

      const currentReactions = message.reactions.get(emoji) || [];
      const userIndex = currentReactions.findIndex((id) => id.equals(userId));
      const updatedReactions = new Map(message.reactions);

      if (userIndex === -1) {
        // Add reaction
        updatedReactions.set(emoji, [...currentReactions, userId]);
      } else {
        // Remove reaction
        updatedReactions.set(
          emoji,
          currentReactions.filter((id) => !id.equals(userId))
        );
      }

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { reactions: updatedReactions },
        { new: true }
      );

      logger.info("Service: Reaction toggled successfully", {
        messageId,
        emoji,
        userId,
        newReactionCount: (updatedMessage.reactions.get(emoji) || []).length,
      });

      return updatedMessage;
    } catch (error) {
      logger.error("Service: Failed to toggle reaction", {
        messageId,
        userId,
        emoji,
        errorMessage: error.message,
        stack: error.stack,
      });
      this._handleError(`${emoji} reaction toggle`, error);
    }
  }

  /**
   * Toggles a like on a message (legacy support).
   * @param {string} messageId - ID of the message to like/unlike.
   * @param {string} userId - ID of the user performing the action.
   * @returns {Promise<Message>} The updated message document.
   */
  async toggleMessageLike(messageId, userId) {
    try {
      logger.info("Service: Toggling legacy like", { messageId, userId });
      validateObjectId(messageId);
      validateObjectId(userId);

      const message = await findMessageById(messageId);

      // Logic to update legacy 'likes' count and 'likedBy' array
      const userIndex = message.likedBy.indexOf(userId);
      let updatedLikes = message.likes;
      let updatedLikedBy = [...message.likedBy];

      if (userIndex === -1) {
        updatedLikedBy.push(userId);
        updatedLikes = (message.likes || 0) + 1;
      } else {
        updatedLikedBy.splice(userIndex, 1);
        updatedLikes = Math.max(0, (message.likes || 0) - 1);
      }

      // Also update the new reaction system for consistency ('👍')
      const updatedReactions = new Map(message.reactions);
      const thumbsUp = updatedReactions.get("👍") || [];
      if (userIndex === -1) {
        // Add thumbs up if not already present
        if (!thumbsUp.some((id) => id.equals(userId))) {
          updatedReactions.set("👍", [...thumbsUp, userId]);
        }
      } else {
        // Remove thumbs up
        updatedReactions.set(
          "👍",
          thumbsUp.filter((id) => !id.equals(userId))
        );
      }

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        {
          likes: updatedLikes,
          likedBy: updatedLikedBy,
          reactions: updatedReactions,
        },
        { new: true }
      );

      logger.info("Service: Legacy like toggled successfully", {
        messageId,
        userId,
      });
      return updatedMessage;
    } catch (error) {
      logger.error("Service: Failed to toggle legacy like", {
        messageId,
        userId,
        errorMessage: error.message,
        stack: error.stack,
      });
      this._handleError("like toggle", error);
    }
  }

  /**
   * Searches messages by content using text index.
   * @param {string} query - The search query string.
   * @param {number} page - Page number for pagination (0-indexed).
   * @param {number} limit - Number of results per page.
   * @returns {Promise<{messages: Array<Message>, pagination: Object}>} Search results and pagination info.
   */
  async searchMessages(query, page = 0, limit = 20) {
    try {
      logger.info("Service: Searching messages", { query, page, limit });

      if (!query || query.trim().length === 0) {
        logger.warn("Service: Search rejected - empty query");
        throw new Error("Search query is required");
      }

      const searchQuery = {
        $text: { $search: query },
        isDeleted: { $ne: true },
      };

      const totalMessages = await Message.countDocuments(searchQuery);
      const messages = await Message.find(searchQuery)
        .sort({ score: { $meta: "textScore" }, timestamp: -1 })
        .skip(page * limit)
        .limit(limit)
        .lean(); // Use lean for performance if full Mongoose docs aren't needed

      const pagination = this._buildPaginationMeta(totalMessages, page, limit);

      logger.info("Service: Search completed successfully", {
        query,
        resultsCount: messages.length,
        totalResults: totalMessages,
        page,
        limit,
      });

      return { messages, pagination };
    } catch (error) {
      logger.error("Service: Search failed", {
        query,
        error: error.message,
        stack: error.stack,
      });
      this._handleError("search", error);
    }
  }

  /**
   * Retrieves messages with pagination.
   * @param {number} page - Page number (0-indexed).
   * @param {number} limit - Number of messages per page.
   * @returns {Promise<{messages: Array<Message>, pagination: Object}>} Messages and pagination info.
   */
  async getMessages(page = 0, limit = 20) {
    try {
      logger.info("Service: Getting messages", { page, limit });
      const totalMessages = await Message.countDocuments();
      const messages = await Message.find()
        .sort({ timestamp: -1 }) // Newest first
        .skip(page * limit)
        .limit(limit)
        .lean(); // Use lean for performance

      const pagination = this._buildPaginationMeta(totalMessages, page, limit);

      logger.info("Service: Messages retrieved successfully", {
        count: messages.length,
        total: totalMessages,
        page,
        limit,
      });

      return { messages, pagination };
    } catch (error) {
      logger.error("Service: Failed to retrieve messages", {
        page,
        limit,
        error: error.message,
        stack: error.stack,
      });
      this._handleError("message retrieval", error);
    }
  }

  /**
   * Retrieves replies for a specific parent message.
   * @param {string} parentId - ID of the parent message.
   * @returns {Promise<Array<Message>>} Array of reply messages.
   */
  async getMessageReplies(parentId) {
    try {
      logger.info("Service: Getting replies for message", { parentId });
      validateObjectId(parentId);

      const replies = await Message.find({ parentId })
        .sort({ timestamp: 1 }) // Oldest first for replies
        .lean();

      logger.info("Service: Replies retrieved successfully", {
        parentId,
        count: replies.length,
      });

      return replies;
    } catch (error) {
      logger.error("Service: Failed to retrieve replies", {
        parentId,
        error: error.message,
        stack: error.stack,
      });
      this._handleError("reply retrieval", error);
    }
  }

  /**
   * Helper to build pagination metadata.
   * @param {number} total - Total number of items.
   * @param {number} page - Current page number (0-indexed).
   * @param {number} limit - Items per page.
   * @returns {Object} Pagination metadata.
   */
  _buildPaginationMeta(total, page, limit) {
    return {
      totalMessages: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    };
  }
}

// Export an instance of the service
module.exports = new MessageService();
