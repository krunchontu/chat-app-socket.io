/**
 * Socket.IO Server
 * Configures and sets up the Socket.IO server with all event handlers
 */

const { createSocketServer } = require("../config/socketConfig");
const {
  handleNewMessage,
  handleToggleLike,
  handleToggleReaction,
  handleEditMessage,
  handleDeleteMessage,
  handleReplyToMessage,
} = require("./handlers/messageHandlers");
const {
  handleUserConnection,
  handleUserDisconnection,
} = require("./handlers/userHandlers");
const logger = require("../utils/logger");

/**
 * Initialize the Socket.IO server with all event handlers
 *
 * @param {Object} httpServer - HTTP server instance
 * @param {Object} corsOptions - CORS configuration options
 * @returns {Object} Configured Socket.IO server instance with all event handlers
 */
const initializeSocketServer = (httpServer, corsOptions) => {
  // Create Socket.IO server with proper configuration
  const io = createSocketServer(httpServer, corsOptions);

  // Set up connection handler
  io.on("connection", (socket) => {
    // Handle new user connection
    handleUserConnection(io, socket);

    // Set up event listeners for socket
    setupSocketEventListeners(io, socket);
  });

  return io;
};

/**
 * Set up all event listeners for a socket connection
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket instance for the current connection
 */
const setupSocketEventListeners = (io, socket) => {
  // Message handling events
  socket.on("message", (data) => handleNewMessage(io, socket, data));

  // Like handling (legacy support)
  socket.on("like", (data) => handleToggleLike(io, socket, data));

  // Reaction handling
  socket.on("reaction", (data) => handleToggleReaction(io, socket, data));

  // Message editing
  socket.on("editMessage", (data) => handleEditMessage(io, socket, data));

  // Message deletion
  socket.on("deleteMessage", (data) => handleDeleteMessage(io, socket, data));

  // Message replies
  socket.on("replyToMessage", (data) => handleReplyToMessage(io, socket, data));

  // Disconnection handling
  socket.on("disconnect", (reason) =>
    handleUserDisconnection(io, socket, reason)
  );

  // Log all registered event listeners
  const events = socket.eventNames();
  logger.socket.debug(
    `Socket event listeners registered for socket ${socket.id}`,
    {
      events,
      eventsCount: events.length,
    }
  );
};

module.exports = {
  initializeSocketServer,
};
