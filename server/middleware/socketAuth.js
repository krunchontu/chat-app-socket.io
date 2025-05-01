const jwt = require("jsonwebtoken");
const User = require("../models/user");

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
    console.log("Socket auth attempt for socket ID:", socket.id);

    // Get token from handshake auth
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log("Socket auth failed: No token provided");
      return next(new Error("Authentication token required"));
    }

    // Check token format
    if (typeof token !== "string" || !token.trim()) {
      console.log("Socket auth failed: Invalid token format");
      return next(new Error("Invalid authentication token format"));
    }

    // Verify token
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return next(new Error("Server configuration error"));
    }

    console.log("Token received, attempting to verify");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token verified successfully for user ID:", decoded.id);

      // Check if token is close to expiration
      if (isTokenNearExpiration(decoded)) {
        console.log(`Token for user ${decoded.id} is close to expiration`);
        socket.tokenNearExpiry = true; // Flag for potential refresh
      }
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        console.log("Socket auth failed: Token expired");
        return next(
          new Error("Authentication token expired, please log in again")
        );
      } else if (jwtError.name === "JsonWebTokenError") {
        console.log("Socket auth failed: Invalid token:", jwtError.message);
        return next(new Error("Invalid authentication token"));
      } else {
        console.log("Socket auth failed: JWT error:", jwtError.message);
        throw jwtError; // Re-throw unexpected errors
      }
    }

    // Check if user ID exists in decoded token
    if (!decoded.id) {
      console.log("Socket auth failed: No user ID in token");
      return next(new Error("Invalid token: missing user identification"));
    }

    // Find user with matching ID
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log("Socket auth failed: User not found for ID:", decoded.id);
      return next(new Error("User not found"));
    }

    // Check if user is active/enabled (if status field exists in the model)
    if (
      user.status &&
      (user.status === "disabled" || user.status === "banned")
    ) {
      console.log("Socket auth failed: User account disabled:", decoded.id);
      return next(new Error("Your account has been disabled"));
    }

    // Attach user object to socket
    socket.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    console.log("User authenticated successfully:", {
      username: user.username,
      socketId: socket.id,
    });

    // Mark user as online when socket connects
    user.isOnline = true;
    await user.save();

    console.log("User marked as online and saved to database");
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    console.log("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 150), // Just include the first part of the stack for brevity
    });
    next(new Error(`Authentication failed: ${error.message}`));
  }
};

module.exports = socketAuth;
