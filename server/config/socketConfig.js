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
    upgradeTimeout: 10000, // Match client upgrade timeout
    pingTimeout: 30000, // Reduced for faster failure detection
    pingInterval: 10000, // More frequent keepalive
    connectTimeout: 45000, // Match client timeout
    maxHttpBufferSize: 1e6, // 1 MB
    allowUpgrades: true, // Enable transport upgrades
    transports: ["polling", "websocket"], // Start with polling for better compatibility
  });

  // Enhanced connection monitoring
  io.engine.on("connection_error", (err) => {
    logger.app.error("Transport connection error:", {
      error: err.message,
      code: err.code,
      context: err.context,
      timestamp: new Date().toISOString(),
    });
  });

  io.engine.on("initial_headers", (headers, req) => {
    logger.app.debug("Initial headers for new connection:", {
      remoteAddress: req.connection.remoteAddress,
      transport: req.headers.upgrade ? "websocket" : "polling",
      timestamp: new Date().toISOString(),
    });
  });

  // Enhanced logging of socket.io configuration
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
    transports: ["polling", "websocket"],
    timeouts: {
      connect: 45000,
      ping: 30000,
      upgrade: 10000,
    },
    features: {
      upgradeEnabled: true,
      maxBufferSize: "1 MB",
    },
  });

  // Apply socket authentication middleware
  io.use(socketAuth);

  return io;
};

module.exports = {
  createSocketServer,
};
