const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * Authenticates a socket connection using JWT token
 * @param {Object} socket - Socket.IO socket object
 * @param {Function} next - Socket.IO middleware next function
 */
const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Verify token
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return next(new Error("Server configuration error"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user with matching ID
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error("User not found"));
    }

    // Attach user object to socket
    socket.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // Mark user as online when socket connects
    user.isOnline = true;
    await user.save();

    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication failed"));
  }
};

module.exports = socketAuth;
