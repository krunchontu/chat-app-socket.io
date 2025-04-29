const express = require("express");
const router = express.Router();
const {
  getMessages,
  getMessageReplies,
  searchMessages,
} = require("../controllers/messageController");
const { messageLimiter } = require("../middleware/rateLimiter");
const { auth } = require("../middleware/auth");

/**
 * Message routes for HTTP endpoints
 * Socket.IO handles real-time operations separately
 */

// GET /api/messages - Get all messages (with rate limiting and auth)
router.get("/", messageLimiter, auth, getMessages);

// GET /api/messages/search - Search messages by content
router.get("/search", messageLimiter, auth, searchMessages);

// GET /api/messages/:parentId/replies - Get replies to a specific message
router.get("/:parentId/replies", messageLimiter, auth, getMessageReplies);

module.exports = router;
