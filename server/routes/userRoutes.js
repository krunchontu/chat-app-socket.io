const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  getCsrfToken,
} = require("../controllers/userController");
const { auth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
} = require("../middleware/validation");

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account with username, email, and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Unique username (alphanumeric and underscores only)
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Valid email address
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *       429:
 *         description: Rate limit exceeded (100 requests per 15 minutes)
 */
router.post("/register", authLimiter, validateRegistration, registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login a user
 *     description: Authenticate user and receive JWT token. Account locks for 15 minutes after 5 failed attempts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked due to too many failed login attempts
 *       429:
 *         description: Rate limit exceeded
 */
router.post("/login", authLimiter, validateLogin, loginUser);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get("/profile", auth, getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile (email only for now)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newemail@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put("/profile", auth, validateProfileUpdate, updateUserProfile);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout current user
 *     description: Invalidate the current JWT token (adds it to blacklist)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", auth, logoutUser);

/**
 * @swagger
 * /api/users/csrf-token:
 *   get:
 *     tags: [Authentication]
 *     summary: Get CSRF token
 *     description: Retrieve a CSRF token for form submissions (if CSRF protection is enabled)
 *     responses:
 *       200:
 *         description: CSRF token retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 */
router.get("/csrf-token", getCsrfToken);

module.exports = router;
