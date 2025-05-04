/**
 * Socket.IO User Event Handlers
 * Handles all user-related socket events (connections, disconnections, etc.)
 */

const logger = require("../../utils/logger");
const { connectedUsers } = require("./messageHandlers");

/**
 * Handles a new user connection
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket instance for the current connection
 */
const handleUserConnection = (io, socket) => {
  try {
    // Store authenticated user in connectedUsers
    if (socket.user) {
      connectedUsers[socket.id] = {
        id: socket.user.id,
        username: socket.user.username,
      };

      logger.socket.info("User connected", {
        socketId: socket.id,
        userId: socket.user.id,
        username: socket.user.username,
        onlineUsersCount: Object.keys(connectedUsers).length,
      });

      // Broadcast user joined notification
      socket.broadcast.emit("userNotification", {
        type: "join",
        message: `${socket.user.username} has joined the chat`,
        timestamp: new Date(),
      });

      // Send the list of online users to the newly connected client
      socket.emit(
        "onlineUsers",
        Object.values(connectedUsers).map((user) => ({
          id: user.id,
          username: user.username,
        }))
      );
    } else {
      logger.socket.warn("Unauthenticated connection rejected", {
        socketId: socket.id,
      });
      socket.disconnect(true);
    }
  } catch (error) {
    logger.socket.error("Error handling user connection", {
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Handles a user disconnection
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket instance for the current connection
 * @param {string} reason - Reason for disconnection
 */
const handleUserDisconnection = async (io, socket, reason) => {
  try {
    if (connectedUsers[socket.id]) {
      const { username, id } = connectedUsers[socket.id];

      logger.socket.info("User disconnected", {
        socketId: socket.id,
        userId: id,
        username,
        reason,
        onlineUsersCount: Object.keys(connectedUsers).length - 1,
      });

      // Broadcast user left notification
      socket.broadcast.emit("userNotification", {
        type: "leave",
        message: `${username} has left the chat`,
        timestamp: new Date(),
      });

      // Set user offline in database
      try {
        const User = require("../../models/user");
        await User.findByIdAndUpdate(id, { isOnline: false });
      } catch (error) {
        logger.socket.error("Failed to update user online status", {
          userId: id,
          username,
          errorMessage: error.message,
          stack: error.stack,
        });
      }

      // Remove user from connected users
      delete connectedUsers[socket.id];
    } else {
      logger.socket.warn("Unknown user disconnected", {
        socketId: socket.id,
      });
    }
  } catch (error) {
    logger.socket.error("Error handling user disconnection", {
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
    });
  }
};

module.exports = {
  handleUserConnection,
  handleUserDisconnection,
};
