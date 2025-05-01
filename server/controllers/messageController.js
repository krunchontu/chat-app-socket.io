const MessageService = require("../services/messageService");
const { validateObjectId } = require("../utils/validationUtils"); // Only need this for route param validation
const logger = require("../utils/logger").message;

/**
 * Controller for message operations, delegating business logic to MessageService.
 * Handles HTTP requests and responses for message-related API endpoints.
 * Note: Socket.IO event handling logic (create, edit, delete, reply, reaction)
 * is typically initiated elsewhere (e.g., main socket handler in index.js)
 * which then calls the corresponding MessageService methods.
 * These controller methods are primarily for the REST API.
 */

// Helper function to handle API errors consistently
const handleApiError = (res, error, operation) => {
  const statusCode = error.message.includes("Not authorized")
    ? 403
    : error.message.includes("not found") ||
      error.message.includes("Invalid ID format")
    ? 404
    : error.message.includes("required") ||
      error.message.includes("cannot be empty")
    ? 400
    : 500;

  logger.error(`API error during message ${operation}`, {
    operation,
    errorMessage: error.message,
    statusCode,
    // stack: error.stack, // Optionally include stack in logs but not response
  });

  res
    .status(statusCode)
    .json({ message: error.message || `Server error during ${operation}` });
};

// GET /api/messages - Retrieve messages with pagination
const getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    logger.info("Controller: Request to get messages", { page, limit });

    const result = await MessageService.getMessages(page, limit);
    res.status(200).json(result);
  } catch (error) {
    handleApiError(res, error, "retrieval");
  }
};

// --- Methods primarily for Socket.IO (called from socket handlers) ---
// These might not be directly exposed as REST endpoints but show the pattern

// Example: Create a new message (called by socket handler)
const createMessage = async (messageData) => {
  // Assumes messageData contains { text, user, tempId, _meta }
  // Assumes user validation/lookup happened in socket middleware or handler
  try {
    logger.info("Controller: Delegating message creation to service", {
      user: messageData.user,
      tempId: messageData.tempId,
    });
    // Note: No res object here as it's called internally
    const savedMessage = await MessageService.createMessage(messageData);
    return savedMessage; // Return to socket handler to emit
  } catch (error) {
    // Error handling might involve emitting an error event back to the specific client
    logger.error("Controller: Error during message creation delegation", {
      error: error.message,
      user: messageData?.user,
    });
    throw error; // Re-throw for the socket handler to manage
  }
};

// Example: Toggle like (called by socket handler)
const toggleMessageLike = async (messageId, userId) => {
  // Assumes messageId and userId are validated and provided by socket handler
  try {
    logger.info("Controller: Delegating legacy like toggle to service", {
      messageId,
      userId,
    });
    const updatedMessage = await MessageService.toggleMessageLike(
      messageId,
      userId
    );
    return updatedMessage; // Return to socket handler to emit
  } catch (error) {
    logger.error("Controller: Error during legacy like toggle delegation", {
      messageId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

// Example: Edit message (called by socket handler)
const editMessage = async (messageId, userId, newText) => {
  // Assumes parameters are validated and provided by socket handler
  try {
    logger.info("Controller: Delegating message edit to service", {
      messageId,
      userId,
    });
    const updatedMessage = await MessageService.editMessage(
      messageId,
      userId,
      newText
    );
    return updatedMessage; // Return to socket handler to emit
  } catch (error) {
    logger.error("Controller: Error during message edit delegation", {
      messageId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

// Example: Delete message (called by socket handler)
const deleteMessage = async (messageId, userId) => {
  // Assumes parameters are validated and provided by socket handler
  try {
    logger.info("Controller: Delegating message delete to service", {
      messageId,
      userId,
    });
    const updatedMessage = await MessageService.deleteMessage(
      messageId,
      userId
    );
    return updatedMessage; // Return to socket handler to emit 'messageDeleted'
  } catch (error) {
    logger.error("Controller: Error during message delete delegation", {
      messageId,
      userId,
      error: error.message,
    });
    throw error;
  }
};

// Example: Reply to message (called by socket handler)
const replyToMessage = async (messageData, parentId) => {
  // Assumes parameters are validated and provided by socket handler
  try {
    logger.info("Controller: Delegating message reply to service", {
      parentId,
      user: messageData.user,
    });
    const savedReply = await MessageService.replyToMessage(
      messageData,
      parentId
    );
    return savedReply; // Return to socket handler to emit 'replyCreated'
  } catch (error) {
    logger.error("Controller: Error during message reply delegation", {
      parentId,
      user: messageData?.user,
      error: error.message,
    });
    throw error;
  }
};

// Example: Toggle reaction (called by socket handler)
const toggleReaction = async (messageId, userId, emoji) => {
  // Assumes parameters are validated and provided by socket handler
  try {
    logger.info("Controller: Delegating reaction toggle to service", {
      messageId,
      userId,
      emoji,
    });
    const updatedMessage = await MessageService.toggleReaction(
      messageId,
      userId,
      emoji
    );
    return updatedMessage; // Return to socket handler to emit 'messageUpdated'
  } catch (error) {
    logger.error("Controller: Error during reaction toggle delegation", {
      messageId,
      userId,
      emoji,
      error: error.message,
    });
    throw error;
  }
};

// --- Methods primarily for REST API ---

// GET /api/messages/:parentId/replies - Retrieve replies for a message
const getMessageReplies = async (req, res) => {
  try {
    const { parentId } = req.params;
    logger.info("Controller: Request to get replies", { parentId });

    // Validate ID format before hitting the service
    validateObjectId(parentId);

    const replies = await MessageService.getMessageReplies(parentId);
    res.status(200).json(replies);
  } catch (error) {
    // Handle specific validation error or general service error
    if (error.message.includes("Invalid ID format")) {
      return res.status(400).json({ message: "Invalid message ID format" });
    }
    handleApiError(res, error, "reply retrieval");
  }
};

// GET /api/messages/search - Search messages
const searchMessages = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    logger.info("Controller: Request to search messages", {
      query,
      page,
      limit,
      userId: req.user?.id,
    });

    // Basic query validation
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const result = await MessageService.searchMessages(query, page, limit);
    res.status(200).json(result);
  } catch (error) {
    handleApiError(res, error, "search");
  }
};

module.exports = {
  getMessages, // Exposed API endpoint
  createMessage,
  toggleMessageLike,
  editMessage,
  deleteMessage,
  replyToMessage,
  getMessageReplies,
  toggleReaction,
  searchMessages,
};
