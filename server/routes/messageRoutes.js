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

// GET /api/messages/replies/:messageId - Get replies to a specific message (fixed param name issue)
router.get("/replies/:messageId", messageLimiter, auth, getMessageReplies);

module.exports = router;
