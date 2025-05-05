import socketIo from "socket.io-client";
import { createLogger } from "./logger";

const logger = createLogger("socketFactory");

/**
 * Creates a Socket.IO connection with proper configuration
 * Enhanced with optimized settings for better reliability
 *
 * @param {string} endpoint - Socket server endpoint URL
 * @param {string} token - Authentication token
 * @param {Object} user - User information
 * @returns {SocketIOClient.Socket} Configured socket instance
 */
export const createSocketConnection = (endpoint, token, user) => {
  const socketOptions = {
    // Enable transport fallback for better connection reliability
    transports: ["websocket", "polling"],
    upgradeTimeout: 10000, // Time to wait for upgrade to websocket
    rememberUpgrade: true, // Remember successful websocket upgrades

    // Authentication details
    auth: { token },

    // Optimized reconnection settings
    reconnection: true,
    reconnectionAttempts: Infinity, // Never stop trying to reconnect
    reconnectionDelay: 1000, // Initial delay of 1 second
    reconnectionDelayMax: 5000, // Maximum delay of 5 seconds
    timeout: 45000, // Connection timeout

    // Connection path & options
    path: "/socket.io/",
    forceNew: false, // Don't force new - allow reusing connections
    withCredentials: true, // Required for CORS
    autoConnect: true, // Connect immediately

    // Socket details
    upgrade: true, // Allow transport upgrades
    rememberUpgrade: true, // Remember if websocket was successful across reconnects

    // Query parameters for debugging and tracking
    query: {
      client_type: "web",
      user_id: user?.id || "anonymous",
      version: process.env.REACT_APP_VERSION || "1.0.0",
      t: Date.now(), // Add timestamp to prevent caching
    },
  };

  logger.info("Creating socket connection to:", {
    endpoint,
    hasToken: !!token,
    hasUser: !!user,
    timestamp: new Date().toISOString(),
    transportMode: socketOptions.transports.join(","),
  });

  try {
    // Create socket with retries on failure
    const socket = socketIo(endpoint, socketOptions);

    // Enhanced connection monitoring
    socket.io.on("error", (error) => {
      logger.error("Socket manager error detected:", {
        message: error.message,
        type: error.type,
        code: error.code,
        transport: socket.io.engine?.transport?.name,
        upgrades: socket.io.engine?.upgrades || [],
        readyState: socket.io.engine?.readyState,
      });
    });

    // Monitor transport changes
    socket.io.engine?.on("upgrade", (transport) => {
      logger.info("Socket transport upgraded:", {
        from: socket.io.engine.transport.name,
        to: transport.name,
      });
    });

    // Monitor failed upgrades
    socket.io.engine?.on("upgradeError", (err) => {
      logger.warn("Socket transport upgrade failed:", {
        error: err.message,
        transport: socket.io.engine?.transport?.name,
      });
    });

    // Add explicit open handler
    socket.io.on("open", () => {
      logger.info("Socket.io transport opened", {
        id: socket.id || "not_available",
        transport: socket.io.engine?.transport?.name || "unknown",
      });
    });

    return socket;
  } catch (error) {
    logger.error("Error initializing socket instance", {
      error: error.message,
      stack: error.stack?.split("\n")[0],
      endpoint,
    });
    throw error;
  }
};
