const jwt = require("jsonwebtoken");
const User = require("../models/user");
const TokenBlacklist = require("../models/tokenBlacklist"); // ISSUE-010: Token invalidation
const logger = require("../utils/logger");

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify token
    if (!process.env.JWT_SECRET) {
      logger.auth.error("JWT_SECRET is not defined in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // SECURITY FIX (ISSUE-010): Check if token has been blacklisted
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      logger.auth.warn("Blacklisted token used", {
        userId: decoded.id,
        tokenPrefix: token.substring(0, 10) + "...",
      });
      return res.status(401).json({
        message: "Token has been invalidated. Please login again.",
      });
    }

    // Find user with matching ID
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user object and token to request
    req.user = user;
    req.token = token;
    req.tokenDecoded = decoded; // Also attach decoded token data

    next();
  } catch (error) {
    logger.auth.error("Auth middleware error", {
      error: error.message,
      stack: error.stack,
    });
    res.status(401).json({ message: "Authentication failed" });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Admin rights required." });
  }
  next();
};

module.exports = { auth, isAdmin };
