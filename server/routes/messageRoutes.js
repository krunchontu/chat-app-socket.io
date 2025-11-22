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
 * Socket.IO handles real-time operations (send, edit, delete, react) separately
 */

/**
 * @swagger
 * /api/messages:
 *   get:
 *     tags: [Messages]
 *     summary: Get all messages
 *     description: Retrieve message history with pagination support
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of messages to return
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp (for pagination)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded (30 requests per minute)
 */
router.get("/", messageLimiter, auth, getMessages);

/**
 * @swagger
 * /api/messages/search:
 *   get:
 *     tags: [Messages]
 *     summary: Search messages
 *     description: Search messages by content using text search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: hello world
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 count:
 *                   type: integer
 *                   description: Number of results found
 *       400:
 *         description: Missing search query
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get("/search", messageLimiter, auth, searchMessages);

/**
 * @swagger
 * /api/messages/{parentId}/replies:
 *   get:
 *     tags: [Messages]
 *     summary: Get message replies
 *     description: Retrieve all replies to a specific message (threaded conversations)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent message ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Replies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 replies:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       404:
 *         description: Parent message not found
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get("/:parentId/replies", messageLimiter, auth, getMessageReplies);

module.exports = router;
