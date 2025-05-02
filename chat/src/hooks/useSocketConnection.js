import { useState, useEffect, useCallback, useRef } from "react";
import socketIo from "socket.io-client";
import { useAuth } from "../components/common/AuthContext";
import ErrorService, {
  ErrorCategory,
  ErrorSeverity,
} from "../services/ErrorService";
import { createLogger } from "../utils/logger";

// Determine if we're in production using NODE_ENV for consistency
const isProduction = process.env.NODE_ENV === "production";

// Get hostname and prepare for backend URL construction
const hostname = window.location.hostname;

// Determine the backend host with improved logic
let backendHost;
if (hostname.includes("chat-app-frontend")) {
  // For Render deployments: convert frontend URL to backend URL
  backendHost = hostname.replace("frontend", "backend");
} else if (hostname === "localhost" || hostname === "127.0.0.1") {
  // For local development
  backendHost = "localhost:4500";
} else {
  // For other deployments, assume backend is at same host
  backendHost = hostname;
}

// Use environment variable for socket URL across all environments
// With improved fallback logic for production environments
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (isProduction ? `https://${backendHost}` : `http://${backendHost}`);

// Force HTTPS in production for security (unless explicitly set otherwise)
const secureSocketUrl =
  isProduction &&
  !SOCKET_URL.startsWith("https://") &&
  !SOCKET_URL.startsWith("/")
    ? SOCKET_URL.replace("http://", "https://")
    : SOCKET_URL;

// Final socket endpoint with proper WebSocket protocol
const wsProtocol = secureSocketUrl.startsWith("https://") ? "wss" : "ws";
const httpUrl = secureSocketUrl.startsWith("/")
  ? window.location.origin + secureSocketUrl
  : secureSocketUrl;

// Final socket endpoint
const ENDPOINT = process.env.REACT_APP_SOCKET_URL || httpUrl;

const logger = createLogger("useSocketConnection");

// Log the selected endpoint for debugging
logger.info("Socket endpoint configuration:", {
  endpoint: ENDPOINT,
  secureEndpoint: secureSocketUrl,
  isProduction,
  hostname: window.location.hostname,
  backendHost,
  env: process.env.NODE_ENV,
  socketUrl: process.env.REACT_APP_SOCKET_URL,
  protocol: window.location.protocol,
});

/**
 * Custom hook to manage the Socket.IO connection lifecycle.
 * Handles connection, authentication, disconnection, errors, and reconnection logic.
 *
 * @returns {{
 *   socket: SocketIOClient.Socket | null;
 *   isConnected: boolean;
 *   connectionError: string | null;
 *   clearConnectionError: () => void;
 * }}
 */
const useSocketConnection = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null); // Ref to hold the socket instance

  const clearConnectionError = useCallback(() => {
    setConnectionError(null);
  }, []);

  // Function to handle authentication errors specifically
  const handleAuthError = useCallback(
    (error) => {
      logger.error("Socket Authentication Error", error);
      setConnectionError("Authentication error. Please log in again.");
      // Optionally trigger logout after a delay
      setTimeout(() => {
        logout(); // Use logout function from useAuth
        // Redirect handled by AuthContext or App routing
      }, 2000);
    },
    [logout]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // If authentication state changes to logged out, disconnect socket
      if (socketRef.current) {
        logger.info(
          "User logged out or unauthenticated, disconnecting socket."
        );
        socketRef.current.disconnect();
        setSocket(null);
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Prevent multiple connections if socket already exists and is connecting/connected
    if (
      socketRef.current &&
      (socketRef.current.connected || socketRef.current.connecting)
    ) {
      logger.info(
        "Socket connection attempt skipped: already connected or connecting."
      );
      return;
    }

    logger.info("Attempting to establish socket connection", {
      userId: user.id,
    });
    const token = localStorage.getItem("token");

    if (!token) {
      logger.error("Socket connection failed: No auth token found.");
      setConnectionError("Authentication token not found. Please login again.");
      return;
    }

    const socketOptions = {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10, // Increased from 5
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000, // Increased from 20000
      path: "/socket.io", // Explicitly set the socket.io path
      forceNew: false, // Avoid creating multiple connections
      query: {
        client_type: "web", // Helps identify client type in logs
        version: process.env.REACT_APP_VERSION || "1.0.0",
      },
    };

    try {
      logger.info("Creating socket connection to:", {
        endpoint: ENDPOINT,
        options: JSON.stringify(socketOptions),
      });
      const newSocket = socketIo(ENDPOINT, socketOptions);
      socketRef.current = newSocket; // Store in ref immediately
      setSocket(newSocket); // Update state

      logger.info("Socket instance created", { endpoint: ENDPOINT });

      // --- Event Handlers ---
      newSocket.on("connect", () => {
        logger.info("Socket connected successfully", {
          socketId: newSocket.id,
        });
        setIsConnected(true);
        setConnectionError(null); // Clear previous errors on successful connect
      });

      newSocket.on("disconnect", (reason) => {
        logger.warn("Socket disconnected", { reason, socketId: newSocket.id });
        setIsConnected(false);
        // Don't set error for expected disconnects like 'io client disconnect'
        if (reason !== "io client disconnect") {
          setConnectionError(
            `Disconnected: ${reason}. Attempting to reconnect...`
          );
        }
      });

      newSocket.on("connect_error", (error) => {
        logger.error("Socket connection error", {
          message: error.message,
          data: error.data,
        }); // Log full error

        // Check for specific authentication errors within the error object or message
        const isAuthError =
          error.message?.toLowerCase().includes("authentication failed") ||
          error.message?.toLowerCase().includes("invalid token") ||
          error.message?.toLowerCase().includes("unauthorized") ||
          (error.data && error.data.type === "UnauthorizedError"); // Example check if server sends structured error

        if (isAuthError) {
          handleAuthError(error);
        } else {
          const errorMessage = ErrorService.handleError(
            error,
            ErrorCategory.SOCKET,
            ErrorSeverity.ERROR,
            "socket-connection",
            { showToast: false } // Let UI decide how to show error
          );
          setConnectionError(
            errorMessage || "Failed to connect to the server."
          );
        }
        setIsConnected(false); // Ensure connection status is false on error
      });

      // Reconnection Handlers
      newSocket.on("reconnect", (attemptNumber) => {
        logger.info(`Socket reconnected after ${attemptNumber} attempts`, {
          socketId: newSocket.id,
        });
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on("reconnect_attempt", (attemptNumber) => {
        logger.info(
          `Socket attempting to reconnect (attempt ${attemptNumber})`
        );
        setConnectionError(
          `Connection lost. Reconnecting (attempt ${attemptNumber})...`
        );
      });

      newSocket.on("reconnect_error", (error) => {
        logger.error("Socket reconnection error", error);
        setConnectionError(
          `Reconnection failed: ${error.message}. Retrying...`
        );
      });

      newSocket.on("reconnect_failed", () => {
        logger.error("Socket reconnection failed after all attempts");
        setConnectionError(
          "Failed to reconnect to the server. Please check your connection or refresh."
        );
        // Consider stopping further automatic attempts here if needed
      });

      // Generic error handler for other potential socket errors
      newSocket.on("error", (error) => {
        logger.error("Generic socket error event", error);
        const errorMessage = ErrorService.handleError(
          error,
          ErrorCategory.SOCKET,
          ErrorSeverity.ERROR,
          "socket-error-event",
          { showToast: true } // Show toast for unexpected errors
        );
        // Avoid overwriting specific connection errors unless it's a new issue
        if (
          !connectionError?.includes("Failed to connect") &&
          !connectionError?.includes("Reconnecting")
        ) {
          setConnectionError(
            errorMessage || "An unexpected socket error occurred."
          );
        }
      });
    } catch (error) {
      logger.error("Error initializing socket instance", error);
      setConnectionError(
        "Failed to initialize chat connection: " + error.message
      );
      setIsConnected(false);
    }

    // --- Cleanup Function ---
    return () => {
      if (socketRef.current) {
        logger.info("Cleaning up socket connection", {
          socketId: socketRef.current.id,
        });
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("reconnect");
        socketRef.current.off("reconnect_attempt");
        socketRef.current.off("reconnect_error");
        socketRef.current.off("reconnect_failed");
        socketRef.current.off("error");
        socketRef.current.disconnect();
        socketRef.current = null; // Clear the ref
        setSocket(null); // Clear state
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user, handleAuthError, connectionError]); // Rerun when auth state changes

  return { socket, isConnected, connectionError, clearConnectionError };
};

export default useSocketConnection;
