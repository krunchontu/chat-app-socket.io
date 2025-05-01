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

// POST /api/users/register - Register a new user (with validation and rate limiting)
router.post("/register", authLimiter, validateRegistration, registerUser);

// POST /api/users/login - Login a user (with validation and rate limiting)
router.post("/login", authLimiter, validateLogin, loginUser);

// GET /api/users/profile - Get current user profile (protected)
router.get("/profile", auth, getUserProfile);

// PUT /api/users/profile - Update current user profile (protected with validation)
router.put("/profile", auth, validateProfileUpdate, updateUserProfile);

// POST /api/users/logout - Logout current user (protected)
router.post("/logout", auth, logoutUser);

// GET /api/users/csrf-token - Get a CSRF token for form submissions
router.get("/csrf-token", getCsrfToken);

module.exports = router;
