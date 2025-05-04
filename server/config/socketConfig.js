/**
 * Socket.IO Configuration
 * Centralizes Socket.IO server settings
 */

const { Server } = require("socket.io");
const logger = require("../utils/logger");
const socketAuth = require("../middleware/socketAuth");

/**
 * Creates and configures the Socket.IO server
 *
 * @param {Object} server - HTTP server instance
 * @param {Object} corsOptions - CORS configuration options
 * @returns {Object} Configured Socket.IO server instance
 */
const createSocketServer = (server, corsOptions) => {
  // Initialize Socket.IO Server with CORS configuration
  const io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
      methods: corsOptions.methods,
      credentials: corsOptions.credentials,
      allowedHeaders: corsOptions.allowedHeaders,
      exposedHeaders: corsOptions.exposedHeaders,
      maxAge: corsOptions.maxAge,
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    pingTimeout: 60000, // Increase ping timeout for better connection stability
    pingInterval: 25000, // Ping interval for keeping connections alive
    connectTimeout: 30000, // Connection timeout
  });

  // Log socket.io configuration
  logger.app.info("Socket.IO configuration initialized", {
    cors: {
      allowedOrigins:
        typeof corsOptions.origin === "function"
          ? "Function (dynamic origins)"
          : corsOptions.origin,
      methods: corsOptions.methods,
      credentials: corsOptions.credentials,
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  // Apply socket authentication middleware
  io.use(socketAuth);

  return io;
};

module.exports = {
  createSocketServer,
};
