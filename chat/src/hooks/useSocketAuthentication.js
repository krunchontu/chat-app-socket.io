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
  // Enhanced authentication state tracking
  const authStateRef = useRef({
    authSent: false,
    authConfirmed: false,
    lastAuthTime: null,
    attempts: 0,
    errors: [],
    lastError: null,
    transportAtAuth: null,
    authTimeoutId: null,
    retryTimeoutId: null,
    maxRetries: 3,
    retryDelay: 2000,
    authTimeout: 5000,
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
  // Clear any pending timeouts
  const clearTimeouts = useCallback(() => {
    if (authStateRef.current.authTimeoutId) {
      clearTimeout(authStateRef.current.authTimeoutId);
      authStateRef.current.authTimeoutId = null;
    }
    if (authStateRef.current.retryTimeoutId) {
      clearTimeout(authStateRef.current.retryTimeoutId);
      authStateRef.current.retryTimeoutId = null;
    }
  }, []);

  const authenticateSocket = useCallback(
    (socket) => {
      if (!socket) return;

      // Clear any existing timeouts
      clearTimeouts();

      // Validate socket and user state
      if (!user?.id || !user?.username) {
        logger.warn("Cannot authenticate socket - missing user data", {
          userPresent: !!user,
          userId: user?.id,
          socketId: socket?.id,
        });
        return;
      }

      // Check socket transport state
      const transport = socket.io?.engine?.transport;
      const transportState = {
        name: transport?.name || "unknown",
        readyState: transport?.readyState,
        writable: transport?.writable,
        protocol: socket.io?.engine?.protocol,
      };

      logger.info("Authenticating with socket server", {
        userId: user.id,
        username: user.username,
        socketId: socket.id || "not_available_yet",
        attempt: authStateRef.current.attempts + 1,
        transport: transportState,
      });

      // Update auth state
      authStateRef.current.authSent = true;
      authStateRef.current.lastAuthTime = new Date().toISOString();
      authStateRef.current.attempts += 1;
      authStateRef.current.transportAtAuth = transportState;

      // Set up authentication timeout
      authStateRef.current.authTimeoutId = setTimeout(() => {
        if (!authStateRef.current.authConfirmed) {
          const currentTransport = socket.io?.engine?.transport;
          logger.error("Authentication timeout", {
            initialTransport: authStateRef.current.transportAtAuth,
            currentTransport: {
              name: currentTransport?.name,
              readyState: currentTransport?.readyState,
              writable: currentTransport?.writable,
            },
            attempts: authStateRef.current.attempts,
            connected: socket.connected,
          });

          // Retry if under max attempts
          if (authStateRef.current.attempts < authStateRef.current.maxRetries) {
            retryAuthentication(socket);
          }
        }
      }, authStateRef.current.authTimeout);

      // Enhanced authentication listener
      socket.off("authenticated").on("authenticated", (response) => {
        if (response.success) {
          clearTimeouts();

          logger.info("Socket authentication confirmed by server", {
            socketId: response.socketId,
            timestamp: response.timestamp,
            transport: socket.io?.engine?.transport?.name,
          });

          authStateRef.current.authConfirmed = true;
          authStateRef.current.lastError = null;

          // Subscribe to rooms with error handling
          subscribeToRooms(socket);
        } else {
          handleAuthenticationFailure(socket, response);
        }
      });

      // Function to send authentication data
      const sendAuthData = () => {
        if (!socket.connected) {
          logger.warn("Cannot send auth data - socket not connected");
          return;
        }

        socket.emit("authenticate", {
          userId: user.id,
          username: user.username,
          timestamp: new Date().toISOString(),
          attempt: authStateRef.current.attempts,
          transport: socket.io?.engine?.transport?.name,
        });
      };

      // Function to handle authentication failure
      const handleAuthenticationFailure = (socket, response) => {
        logger.error("Socket authentication rejected", {
          error: response.error,
          timestamp: response.timestamp,
          attempts: authStateRef.current.attempts,
          transport: socket.io?.engine?.transport?.name,
        });

        authStateRef.current.lastError = {
          time: new Date().toISOString(),
          error: response.error,
        };
        authStateRef.current.errors.push(authStateRef.current.lastError);

        if (authStateRef.current.attempts < authStateRef.current.maxRetries) {
          retryAuthentication(socket);
        }
      };

      // Function to retry authentication
      const retryAuthentication = (socket) => {
        clearTimeouts();

        authStateRef.current.retryTimeoutId = setTimeout(() => {
          logger.info("Retrying socket authentication", {
            attempt: authStateRef.current.attempts + 1,
            maxRetries: authStateRef.current.maxRetries,
            transport: socket.io?.engine?.transport?.name,
          });

          if (socket.connected) {
            sendAuthData();
          }
        }, authStateRef.current.retryDelay);
      };

      // Function to handle room subscriptions
      const subscribeToRooms = (socket) => {
        socket.emit("subscribe", { rooms: ["general"] });

        socket.off("subscribed").on("subscribed", (response) => {
          if (response.success) {
            logger.info("Successfully subscribed to rooms", {
              rooms: response.rooms,
              timestamp: response.timestamp,
              transport: socket.io?.engine?.transport?.name,
            });
          } else {
            logger.warn("Failed to subscribe to rooms", {
              error: response.error,
              transport: socket.io?.engine?.transport?.name,
            });
          }
        });
      };

      // Initiate authentication
      sendAuthData();
    },
    [user]
  );

  /**
   * Resets the authentication state and cleans up timeouts
   */
  const resetAuthState = useCallback(() => {
    logger.info("Resetting socket authentication state");
    clearTimeouts();

    authStateRef.current = {
      ...authStateRef.current,
      authSent: false,
      authConfirmed: false,
      lastAuthTime: null,
      attempts: 0,
      errors: [],
      lastError: null,
      transportAtAuth: null,
      authTimeoutId: null,
      retryTimeoutId: null,
    };
  }, [clearTimeouts]);

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
