import { useCallback, useRef } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useSocketAuthentication");

/**
 * Custom hook for managing socket authentication
 * Handles token retrieval and socket authentication
 * Ensures compatibility with server-side socket-auth middleware
 * Implements a complete two-way authentication handshake
 *
 * @param {Object} user - Current user object
 * @returns {Object} Authentication utilities
 */
const useSocketAuthentication = (user) => {
  // Track authentication state
  const authStateRef = useRef({
    authSent: false,
    authConfirmed: false,
    lastAuthTime: null,
    attempts: 0,
    errors: [],
  });

  /**
   * Retrieves authentication token from local storage
   * @returns {string|null} Authentication token or null if not found
   */
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      logger.error("No auth token found");
      return null;
    }
    return token;
  }, []);

  /**
   * Authenticates the socket connection with the server
   * Uses a complete two-phase authentication approach:
   * 1. Token is sent in handshake auth (handled in socketFactory)
   * 2. User data is sent via authenticate event after connection
   * 3. Server confirms authentication with authenticated event
   *
   * @param {SocketIOClient.Socket} socket - Socket instance to authenticate
   */
  const authenticateSocket = useCallback(
    (socket) => {
      if (!socket) return;

      // Send authentication data to the server after connecting
      if (user && user.id && user.username) {
        logger.info("Authenticating with socket server", {
          userId: user.id,
          username: user.username,
          socketId: socket.id || "not_available_yet",
          attempt: authStateRef.current.attempts + 1,
        });

        // Track authentication attempt
        authStateRef.current.authSent = true;
        authStateRef.current.lastAuthTime = new Date().toISOString();
        authStateRef.current.attempts += 1;

        // Listen for authentication confirmation from server
        socket.off("authenticated"); // Remove any existing listener
        socket.on("authenticated", (response) => {
          if (response.success) {
            logger.info("Socket authentication confirmed by server", {
              socketId: response.socketId,
              timestamp: response.timestamp,
            });

            authStateRef.current.authConfirmed = true;

            // Re-subscribe to key events now that we're authenticated
            socket.emit("subscribe", { rooms: ["general"] });

            // Listen for subscription confirmation
            socket.off("subscribed"); // Remove previous listener if any
            socket.on("subscribed", (response) => {
              if (response.success) {
                logger.info("Successfully subscribed to rooms", {
                  rooms: response.rooms,
                  timestamp: response.timestamp,
                });
              } else {
                logger.warn("Failed to subscribe to rooms", {
                  error: response.error,
                });
              }
            });
          } else {
            logger.error("Socket authentication rejected by server", {
              error: response.error,
              timestamp: response.timestamp,
            });

            authStateRef.current.errors.push({
              time: new Date().toISOString(),
              error: response.error,
            });

            // Try to re-authenticate after a delay if needed
            if (authStateRef.current.attempts < 3) {
              setTimeout(() => {
                logger.info("Retrying socket authentication");
                sendAuthData(socket);
              }, 2000);
            }
          }
        });

        // Function to actually send the auth data
        const sendAuthData = (s) => {
          // Send authenticate event with user details
          s.emit("authenticate", {
            userId: user.id, // Server expects userId, not id
            username: user.username,
            timestamp: new Date().toISOString(), // Add timestamp for tracing
          });
        };

        // Send the authentication data now
        sendAuthData(socket);

        // Set a timeout to verify authentication status
        setTimeout(() => {
          if (socket.connected && !authStateRef.current.authConfirmed) {
            logger.warn("No authentication confirmation received", {
              socketId: socket.id,
              connected: socket.connected,
              timeSinceAuth:
                new Date().getTime() -
                new Date(authStateRef.current.lastAuthTime).getTime(),
            });
          }
        }, 3000);
      } else {
        logger.warn("Cannot authenticate socket - missing user data", {
          userPresent: !!user,
          userId: user?.id,
          socketId: socket?.id,
        });
      }
    },
    [user]
  );

  /**
   * Resets the authentication state
   * Useful when socket needs to be reconnected
   */
  const resetAuthState = useCallback(() => {
    logger.info("Resetting socket authentication state");
    authStateRef.current = {
      authSent: false,
      authConfirmed: false,
      lastAuthTime: null,
      attempts: 0,
      errors: [],
    };
  }, []);

  /**
   * Gets the current authentication state
   * @returns {Object} Authentication state
   */
  const getAuthState = useCallback(() => {
    return {
      isAuthenticated: authStateRef.current.authConfirmed,
      attempts: authStateRef.current.attempts,
      lastAttempt: authStateRef.current.lastAuthTime,
    };
  }, []);

  return {
    getAuthToken,
    authenticateSocket,
    resetAuthState,
    getAuthState,
  };
};

export default useSocketAuthentication;
