/**
 * Socket.IO Event Handlers
 *
 * Central export point for all socket event handlers.
 * Organized into logical modules for better maintainability.
 */

const { registerMessageHandlers } = require("./messageHandlers");
const {
  handleConnection,
  sendOnlineUsers,
  registerDisconnectHandler,
} = require("./connectionHandlers");

module.exports = {
  // Message handlers
  registerMessageHandlers,

  // Connection handlers
  handleConnection,
  sendOnlineUsers,
  registerDisconnectHandler,
};
