import { useState, useEffect, useRef, useCallback } from "react";
import { determineSocketEndpoint } from "../utils/socketConfigUtils";
import { createSocketConnection } from "../utils/socketFactory";
import useSocketAuthentication from "./useSocketAuthentication";
import useSocketErrorHandling from "./useSocketErrorHandling";
import useConnectionBackoff from "./useConnectionBackoff";
import useSocketCore from "./useSocketCore";
import { useAuth } from "../components/common/AuthContext";
import { createLogger } from "../utils/logger";

const logger = createLogger("useSocketConnection");

/**
 * Custom hook to manage the Socket.IO connection lifecycle.
 * Handles connection, authentication, disconnection, errors, and reconnection logic.
 * Uses modular approach with specialized sub-hooks for different responsibilities.
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
  const socketRef = useRef(null);
  const connectionAttemptTimerRef = useRef(null);

  // Extract socket endpoint configuration
  const ENDPOINT = determineSocketEndpoint();

  // Use specialized sub-hooks
  const {
    connectionError,
    clearConnectionError,
    handleAuthError,
    handleConnectionError,
    setConnectionError,
  } = useSocketErrorHandling(logout);

  const {
    getAuthToken,
    authenticateSocket,
    resetAuthState,
  } = useSocketAuthentication(user); // Removed unused getAuthState

  const {
    shouldThrottleConnection,
    getBackoffTime,
    trackConnectionAttempt,
    resetBackoff,
    getCurrentAttemptCount,
  } = useConnectionBackoff();

  // Get socket core functionality if socket exists
  const { getSocketStatus, checkSocketReconnection } = useSocketCore(socket);

  // Helper function to set up all socket event handlers - memoized to avoid dependency issues
  const setupSocketEventHandlers = useCallback(
    (newSocket) => {
      if (!newSocket) return;

      // Clean up existing connection state
      resetAuthState();

      // Clear existing event handlers if any
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.off("reconnect");
      newSocket.off("reconnect_attempt");
      newSocket.off("reconnect_error");
      newSocket.off("reconnect_failed");
      newSocket.off("error");
      newSocket.off("authenticated");

      // Connection event handlers
      newSocket.on("connect", () => {
        logger.info("Socket connected successfully", {
          socketId: newSocket.id,
          transport: newSocket.io?.engine?.transport?.name || "unknown",
        });
        setIsConnected(true);
        clearConnectionError();
        authenticateSocket(newSocket);
        resetBackoff(); // Reset backoff strategy on successful connection
      });

      newSocket.on("disconnect", (reason) => {
        logger.warn("Socket disconnected", {
          reason,
          socketId: newSocket.id,
          prevConnected: isConnected,
        });
        setIsConnected(false);

        // Reset auth state on specific disconnect reasons that indicate auth issues
        if (reason === "io server disconnect" || reason === "ping timeout") {
          logger.info("Resetting auth state due to disconnect reason:", reason);
          resetAuthState();
        }

        // Don't set error for expected disconnects like 'io client disconnect'
        if (reason !== "io client disconnect" && reason !== "transport close") {
          setConnectionError(
            `Disconnected: ${reason}. Attempting to reconnect...`
          );
        }
      });

      newSocket.on("connect_error", (error) => {
        const { isAuthError } = handleConnectionError(error);
        logger.error("Socket connection error", {
          error: error.message,
          isAuthError,
          code: error.code,
          type: error.type,
        });

        if (isAuthError) {
          handleAuthError(error, newSocket, isConnected);
        }
        setIsConnected(false);
      });

      // Reconnection Handlers
      newSocket.on("reconnect", (attemptNumber) => {
        logger.info(`Socket reconnected after ${attemptNumber} attempts`, {
          socketId: newSocket.id,
        });
        setIsConnected(true);
        clearConnectionError();
        resetBackoff();

        // Re-authenticate after reconnection
        authenticateSocket(newSocket);
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
        logger.error("Socket reconnection error", {
          message: error.message,
          code: error.code,
          type: error.type,
        });
        setConnectionError(
          `Reconnection failed: ${error.message}. Retrying...`
        );
      });

      newSocket.on("reconnect_failed", () => {
        logger.error("Socket reconnection failed after all attempts");
        setConnectionError(
          "Failed to reconnect to the server. Please check your connection or refresh."
        );

        // Force a new connection attempt with a clean slate
        setTimeout(() => {
          if (socketRef.current) {
            logger.info("Forcing new connection after reconnection failure");
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            resetBackoff();
          }
        }, 1000);
      });

      // Generic error handler
      newSocket.on("error", (error) => {
        logger.error("Generic socket error event", {
          error: typeof error === "object" ? error.message : error,
          socketId: newSocket.id,
        });
        handleConnectionError(error, { eventType: "error" });
      });
    },
    [
      clearConnectionError,
      authenticateSocket,
      resetBackoff,
      handleConnectionError,
      handleAuthError,
      setIsConnected,
      isConnected,
      setConnectionError,
      resetAuthState,
    ]
  );

  // Setup socket connection
  useEffect(() => {
    // Create a cleanup routine we'll use in multiple places
    const cleanupConnection = (reason) => {
      if (connectionAttemptTimerRef.current) {
        clearTimeout(connectionAttemptTimerRef.current);
        connectionAttemptTimerRef.current = null;
      }

      if (socketRef.current) {
        logger.info("Cleaning up socket connection", {
          socketId: socketRef.current.id,
          reason,
        });

        // Ensure we remove listeners before disconnecting to avoid any callbacks
        socketRef.current.off();
        try {
          socketRef.current.disconnect();
        } catch (e) {
          logger.warn("Error during socket disconnect", { error: e.message });
        }

        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };

    // User authentication check
    if (!isAuthenticated || !user) {
      cleanupConnection("User not authenticated");
      return;
    }

    // Connection throttling check with improved handling
    if (shouldThrottleConnection()) {
      const waitTime = getBackoffTime();
      logger.warn(
        `Throttling connection attempt - waiting ${waitTime}ms before reconnecting`
      );

      // Clear any existing timer
      if (connectionAttemptTimerRef.current) {
        clearTimeout(connectionAttemptTimerRef.current);
      }

      connectionAttemptTimerRef.current = setTimeout(() => {
        connectionAttemptTimerRef.current = null;
        logger.info("Throttle period elapsed, attempting reconnection");

        // Clear error state or update with attempt count
        setConnectionError((prev) => {
          if (!prev) return null;
          const attemptDisplay = getCurrentAttemptCount()
            ? ` (attempt ${getCurrentAttemptCount()})`
            : "";
          return `Reconnecting after delay...${attemptDisplay}`;
        });

        // Reset connection state completely before trying again
        cleanupConnection("Reconnection after throttle");
        resetAuthState();
      }, waitTime);

      return () => {
        if (connectionAttemptTimerRef.current) {
          clearTimeout(connectionAttemptTimerRef.current);
          connectionAttemptTimerRef.current = null;
        }
      };
    }

    // Existing connection check with improved logging
    if (socketRef.current) {
      // Check socket health instead of just trusting its state
      const status = getSocketStatus();

      if (
        status.connected ||
        socketRef.current.connected ||
        socketRef.current.connecting
      ) {
        logger.info(
          "Socket connection check: already connected or connecting",
          {
            reported: {
              connected: socketRef.current.connected,
              connecting: socketRef.current.connecting,
            },
            health: status,
          }
        );
        return;
      } else {
        logger.info("Existing socket found but not connected - will recreate", {
          health: status,
        });
        cleanupConnection("Recreating stale socket");
      }
    }

    // Track connection attempt for backoff
    trackConnectionAttempt();

    // Authentication token check
    const token = getAuthToken();
    if (!token) {
      setConnectionError("Authentication token not found. Please login again.");
      return;
    }

    // Create socket connection with improved error handling
    try {
      logger.info("Initiating socket connection with endpoint:", { ENDPOINT });

      // Reset auth state before creating a new connection
      resetAuthState();

      // Create socket with enhanced debug info
      const newSocket = createSocketConnection(ENDPOINT, token, user);

      // Store reference before setting up handlers to avoid race conditions
      socketRef.current = newSocket;
      setSocket(newSocket);

      // Log connection attempt details
      logger.info("Socket connection attempt initiated", {
        endpoint: ENDPOINT,
        hasToken: !!token,
        userPresent: !!user,
        socketId: newSocket?.id || "not_available_yet",
        timestamp: new Date().toISOString(),
      });

      // --- Set up event handlers ---
      setupSocketEventHandlers(newSocket);

      // Check for reconnection (for tracking purposes)
      checkSocketReconnection();
    } catch (error) {
      logger.error("Error initializing socket instance", {
        error: error.message,
        stack: error.stack?.split("\n")[0],
      });
      setConnectionError(
        "Failed to initialize chat connection: " + error.message
      );
      setIsConnected(false);
    }

    // --- Cleanup Function ---
    return () => cleanupConnection("Component unmounting");
  }, [
    // Dependencies
    isAuthenticated,
    user,
    ENDPOINT,
    shouldThrottleConnection,
    getBackoffTime,
    trackConnectionAttempt,
    getCurrentAttemptCount,
    getAuthToken,
    setConnectionError,
    setupSocketEventHandlers,
    getSocketStatus,
    checkSocketReconnection,
    resetAuthState,
  ]);

  return { socket, isConnected, connectionError, clearConnectionError };
};

export default useSocketConnection;
