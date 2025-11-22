/**
 * Connection Socket Handlers
 *
 * Handles socket connection lifecycle:
 * - connection: User connects to socket
 * - disconnect: User disconnects from socket
 * - onlineUsers: Send list of online users to client
 */

const logger = require("../utils/logger");

/**
 * Handle new socket connection
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 * @param {Object} connectedUsers - Map of connected users by socket ID
 * @returns {boolean} - true if connection successful, false if rejected
 */
function handleConnection(socket, io, connectedUsers) {
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
    });

    // Broadcast user joined notification
    socket.broadcast.emit("userNotification", {
      type: "join",
      message: `${socket.user.username} has joined the chat`,
      timestamp: new Date(),
    });

    return true;
  } else {
    logger.socket.warn("Unauthenticated connection rejected", {
      socketId: socket.id,
    });
    socket.disconnect(true);
    return false;
  }
}

/**
 * Handle socket disconnection
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 * @param {Object} connectedUsers - Map of connected users by socket ID
 * @param {string} reason - Disconnection reason
 */
async function handleDisconnect(socket, io, connectedUsers, reason) {
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
      const User = require("../models/user");
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
}

/**
 * Send list of online users to client
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Object} connectedUsers - Map of connected users by socket ID
 */
function sendOnlineUsers(socket, connectedUsers) {
  socket.emit(
    "onlineUsers",
    Object.values(connectedUsers).map((user) => ({
      id: user.id,
      username: user.username,
    }))
  );
}

/**
 * Register disconnect handler for socket
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 * @param {Object} connectedUsers - Map of connected users by socket ID
 */
function registerDisconnectHandler(socket, io, connectedUsers) {
  socket.on("disconnect", async (reason) => {
    await handleDisconnect(socket, io, connectedUsers, reason);
  });
}

module.exports = {
  handleConnection,
  handleDisconnect,
  sendOnlineUsers,
  registerDisconnectHandler,
};
