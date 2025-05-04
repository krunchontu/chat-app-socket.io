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
    // Use websocket only to prevent transport issues
    // Only fall back to polling if explicitly requested
    transports: ["websocket"],

    // Authentication details
    auth: { token },

    // Reconnection settings
    reconnection: true,
    reconnectionAttempts: Infinity, // Never stop trying to reconnect
    reconnectionDelay: 500, // Start with a short delay
    reconnectionDelayMax: 2000, // Don't increase delay beyond 2 seconds
    timeout: 45000, // Increased timeout to match server

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

    // Add instrumentation to detect bad connections early
    socket.io.on("error", (error) => {
      logger.error("Socket manager error detected:", {
        message: error.message,
        type: error.type,
        code: error.code,
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
