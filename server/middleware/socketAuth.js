const jwt = require("jsonwebtoken");
const User = require("../models/user");
const TokenBlacklist = require("../models/tokenBlacklist"); // ISSUE-010: Token invalidation
const logger = require("../utils/logger");

/**
 * Checks if a JWT token is about to expire
 * @param {Object} decoded - Decoded JWT token
 * @param {number} thresholdMinutes - Minutes threshold before expiration
 * @returns {boolean} True if token is close to expiration
 */
const isTokenNearExpiration = (decoded, thresholdMinutes = 10) => {
  if (!decoded.exp) return false;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;
  const thresholdMs = thresholdMinutes * 60 * 1000;

  return timeUntilExpiration < thresholdMs;
};

/**
 * Authenticates a socket connection using JWT token
 * With enhanced error handling and token expiration checks
 * @param {Object} socket - Socket.IO socket object
 * @param {Function} next - Socket.IO middleware next function
 */
const socketAuth = async (socket, next) => {
  try {
    logger.auth.debug("Socket authentication attempt", {
      socketId: socket.id,
    });

    // Get token from handshake auth
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.auth.warn("Socket auth failed: No token provided", {
        socketId: socket.id,
      });
      return next(new Error("Authentication token required"));
    }

    // Check token format
    if (typeof token !== "string" || !token.trim()) {
      logger.auth.warn("Socket auth failed: Invalid token format", {
        socketId: socket.id,
      });
      return next(new Error("Invalid authentication token format"));
    }

    // Verify token
    if (!process.env.JWT_SECRET) {
      logger.auth.error("JWT_SECRET is not defined in environment variables", {
        socketId: socket.id,
      });
      return next(new Error("Server configuration error"));
    }

    logger.auth.debug("Token received, attempting to verify", {
      socketId: socket.id,
    });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.auth.info("Token verified successfully", {
        socketId: socket.id,
        userId: decoded.id,
      });

      // Check if token is close to expiration
      if (isTokenNearExpiration(decoded)) {
        logger.auth.warn("Token is close to expiration", {
          socketId: socket.id,
          userId: decoded.id,
        });
        socket.tokenNearExpiry = true; // Flag for potential refresh
      }
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        logger.auth.warn("Socket auth failed: Token expired", {
          socketId: socket.id,
          error: jwtError.message,
        });
        return next(
          new Error("Authentication token expired, please log in again")
        );
      } else if (jwtError.name === "JsonWebTokenError") {
        logger.auth.warn("Socket auth failed: Invalid token", {
          socketId: socket.id,
          error: jwtError.message,
        });
        return next(new Error("Invalid authentication token"));
      } else {
        logger.auth.error("Socket auth failed: JWT error", {
          socketId: socket.id,
          error: jwtError.message,
          stack: jwtError.stack,
        });
        throw jwtError; // Re-throw unexpected errors
      }
    }

    // Check if user ID exists in decoded token
    if (!decoded.id) {
      logger.auth.warn("Socket auth failed: No user ID in token", {
        socketId: socket.id,
      });
      return next(new Error("Invalid token: missing user identification"));
    }

    // SECURITY FIX (ISSUE-010): Check if token has been blacklisted
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      logger.auth.warn("Socket auth failed: Blacklisted token used", {
        socketId: socket.id,
        userId: decoded.id,
        tokenPrefix: token.substring(0, 10) + "...",
      });
      return next(
        new Error("Token has been invalidated. Please login again.")
      );
    }

    // Find user with matching ID
    const user = await User.findById(decoded.id);

    if (!user) {
      logger.auth.warn("Socket auth failed: User not found", {
        socketId: socket.id,
        userId: decoded.id,
      });
      return next(new Error("User not found"));
    }

    // Check if user is active/enabled (if status field exists in the model)
    if (
      user.status &&
      (user.status === "disabled" || user.status === "banned")
    ) {
      logger.auth.warn("Socket auth failed: User account disabled", {
        socketId: socket.id,
        userId: decoded.id,
        status: user.status,
      });
      return next(new Error("Your account has been disabled"));
    }

    // Attach user object to socket
    socket.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    logger.auth.info("User authenticated successfully", {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Mark user as online when socket connects
    user.isOnline = true;
    await user.save();

    logger.auth.debug("User marked as online", {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
    });
    next();
  } catch (error) {
    logger.auth.error("Socket authentication error", {
      socketId: socket.id,
      errorName: error.name,
      error: error.message,
      stack: error.stack,
    });
    next(new Error(`Authentication failed: ${error.message}`));
  }
};

module.exports = socketAuth;
