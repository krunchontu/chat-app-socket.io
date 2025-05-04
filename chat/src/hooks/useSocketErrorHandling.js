import { useState, useRef, useCallback } from "react";
import ErrorService, {
  ErrorCategory,
  ErrorSeverity,
} from "../services/ErrorService";
import { createLogger } from "../utils/logger";

const logger = createLogger("useSocketErrorHandling");

/**
 * Custom hook for handling socket connection errors
 * Manages error state, authentication errors, and error throttling
 *
 * @param {Function} logout - Auth logout function
 * @returns {Object} Error handling utilities
 */
const useSocketErrorHandling = (logout) => {
  const [connectionError, setConnectionError] = useState(null);

  // Auth error state tracking
  const authErrorRef = useRef({
    lastErrorTime: 0,
    errorCount: 0,
    shownNotification: false,
  });

  const clearConnectionError = useCallback(() => {
    setConnectionError(null);
  }, []);

  // Function to handle authentication errors specifically
  const handleAuthError = useCallback(
    (error, socket, isConnected) => {
      const now = Date.now();

      // Don't show more than one auth error notification per 30 seconds
      if (now - authErrorRef.current.lastErrorTime < 30000) {
        authErrorRef.current.errorCount++;

        logger.warn("Suppressing duplicate auth error notification", {
          timeSinceLast: now - authErrorRef.current.lastErrorTime,
          errorCount: authErrorRef.current.errorCount,
        });

        // If we've seen too many errors in a short time, stop showing them
        if (authErrorRef.current.errorCount > 3) {
          if (!authErrorRef.current.shownNotification) {
            setConnectionError(
              "Connection issues detected. Attempting to reconnect..."
            );
            authErrorRef.current.shownNotification = true;
          }
          return;
        }
        return;
      }

      // Reset error tracking if it's been a while
      if (now - authErrorRef.current.lastErrorTime > 60000) {
        authErrorRef.current.errorCount = 0;
        authErrorRef.current.shownNotification = false;
      }

      // Update the last error time
      authErrorRef.current.lastErrorTime = now;
      authErrorRef.current.errorCount++;

      // Check if this is actually a connection issue rather than an auth issue
      const isLikelyConnectionIssue = isConnected && socket && socket.connected;

      // Only show auth error for actual auth failures
      if (!isLikelyConnectionIssue) {
        logger.error("Socket Authentication Error", error);
        setConnectionError("Authentication error. Please log in again.");

        // Only log out if this is a genuine auth error, not a network issue
        if (
          error.message &&
          (error.message.includes("jwt expired") ||
            error.message.includes("invalid signature") ||
            error.message.includes("invalid token"))
        ) {
          // Optionally trigger logout after a delay
          setTimeout(() => {
            logout(); // Use logout function from useAuth
          }, 2000);
        }
      } else {
        // This is more likely a temporary connection issue
        logger.warn(
          "Suppressing auth error that appears to be a connection issue",
          {
            socketConnected: !!socket?.connected,
            isConnected,
          }
        );
        setConnectionError(
          "Connection issue detected. Attempting to reconnect..."
        );
      }
    },
    [logout]
  );

  const handleConnectionError = useCallback((error, errorContext = {}) => {
    logger.error("Socket connection error", {
      message: error.message,
      data: error.data,
      ...errorContext,
    });

    // Check for specific authentication errors
    const isAuthError =
      error.message?.toLowerCase().includes("authentication failed") ||
      error.message?.toLowerCase().includes("invalid token") ||
      error.message?.toLowerCase().includes("unauthorized") ||
      (error.data && error.data.type === "UnauthorizedError");

    if (isAuthError) {
      return { isAuthError: true };
    } else {
      const errorMessage = ErrorService.handleError(
        error,
        ErrorCategory.SOCKET,
        ErrorSeverity.ERROR,
        "socket-connection",
        { showToast: false }
      );
      setConnectionError(errorMessage || "Failed to connect to the server.");
      return { isAuthError: false };
    }
  }, []);

  return {
    connectionError,
    clearConnectionError,
    handleAuthError,
    handleConnectionError,
    setConnectionError,
  };
};

export default useSocketErrorHandling;
