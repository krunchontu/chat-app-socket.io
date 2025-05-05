import { useRef, useCallback, useEffect } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useSocketCore");

/**
 * Core socket functionality without debugging or event management
 * Focused on socket identification and basic socket operations
 * Enhanced with more robust connection detection and recovery
 *
 * @param {Object} socket - Socket.io instance
 * @returns {Object} - Core socket utilities
 */
const useSocketCore = (socket) => {
  // Track current socket ID to detect reconnections
  const socketIdRef = useRef(null);

  // Track socket connection stability
  const connectionStatsRef = useRef({
    reconnectCount: 0,
    lastConnectedAt: null,
    connectionAttempts: 0,
    socketState: "initializing", // initializing, connecting, connected, disconnected, error
    connectionErrors: [], // Track specific connection errors
  });

  // Safely get socket ID with enhanced fallback methods
  const getSafeSocketId = useCallback(() => {
    // Try multiple ways to get the socket ID
    let id = null;

    try {
      if (socket) {
        // Try direct access
        id = socket.id;

        // If undefined, try to get from io property
        if (!id && socket.io && socket.io.engine && socket.io.engine.id) {
          id = socket.io.engine.id;
          logger.debug("Using engine ID as fallback:", id);
        }

        // Try socket manager if available
        if (
          !id &&
          socket.io &&
          socket.io.engine &&
          socket.io.engine.transport
        ) {
          const transport = socket.io.engine.transport;
          logger.debug("Found socket transport:", transport.name);
        }

        // Log verbose debugging information if ID is still not available
        if (!id) {
          logger.warn("Socket ID is not available", {
            socketExists: !!socket,
            socketConnected: socket?.connected,
            socketConnecting: socket?.connecting,
            socketIoExists: !!socket?.io,
            socketReadyState: socket?.io?.engine?.readyState,
            transport: socket?.io?.engine?.transport?.name,
            query: socket?.io?.opts?.query,
            authPresent: !!socket?.auth,
            nsp: socket?.nsp?.name || "unknown",
          });
        }
      }
    } catch (error) {
      logger.error("Error getting socket ID:", error);
      connectionStatsRef.current.connectionErrors.push({
        time: new Date().toISOString(),
        type: "id_retrieval_error",
        message: error.message,
      });
    }

    return id || "unidentified";
  }, [socket]);

  // Get basic socket status information
  const getSocketStatus = useCallback(() => {
    const id = getSafeSocketId();
    const isConnected = socket?.connected || false;

    // Update socket state based on connection status
    if (isConnected && connectionStatsRef.current.socketState !== "connected") {
      connectionStatsRef.current.socketState = "connected";
      connectionStatsRef.current.lastConnectedAt = new Date().toISOString();
    } else if (
      !isConnected &&
      socket &&
      connectionStatsRef.current.socketState === "connected"
    ) {
      connectionStatsRef.current.socketState = "disconnected";
    }

    return {
      id,
      connected: isConnected,
      connecting: socket?.connecting || false,
      reconnectCount: connectionStatsRef.current.reconnectCount,
      lastConnectedAt: connectionStatsRef.current.lastConnectedAt,
      socketState: connectionStatsRef.current.socketState,
      readyState: socket?.io?.engine?.readyState || "closed",
      transport: socket?.io?.engine?.transport?.name || "none",
    };
  }, [socket, getSafeSocketId]);

  // Set up regular socket health check
  useEffect(() => {
    if (!socket) return;

    // Check socket health every 10 seconds
    const healthCheckInterval = setInterval(() => {
      const status = getSocketStatus();

      if (
        !status.connected &&
        connectionStatsRef.current.socketState === "connected"
      ) {
        // Socket was connected but is now disconnected
        logger.warn("Socket health check detected disconnect", status);
        connectionStatsRef.current.socketState = "disconnected";
      } else if (
        status.connected &&
        connectionStatsRef.current.socketState !== "connected"
      ) {
        // Socket is connected but state doesn't reflect it
        logger.info("Socket health check detected connection", status);
        connectionStatsRef.current.socketState = "connected";
        connectionStatsRef.current.lastConnectedAt = new Date().toISOString();
      }
    }, 10000);

    return () => clearInterval(healthCheckInterval);
  }, [socket, getSocketStatus]); // Added getSocketStatus dependency

  // Check if this is a new socket connection and update tracking
  const checkSocketReconnection = useCallback(() => {
    if (!socket) return false;

    // Get the current socket ID reliably
    const currentSocketId = getSafeSocketId();
    const hasReconnected =
      socketIdRef.current !== currentSocketId &&
      currentSocketId !== "unidentified" &&
      socketIdRef.current !== null;

    // Check if this is a new socket connection
    if (hasReconnected) {
      logger.info("Socket reconnection detected", {
        previousId: socketIdRef.current,
        newId: currentSocketId,
        connected: socket.connected,
      });

      // Record connection stats
      connectionStatsRef.current.reconnectCount++;
      connectionStatsRef.current.lastConnectedAt = new Date().toISOString();
      connectionStatsRef.current.socketState = "connecting";

      // Update the stored socket ID
      socketIdRef.current = currentSocketId;
    } else if (
      currentSocketId !== "unidentified" &&
      socketIdRef.current === null
    ) {
      // First connection
      logger.info("Initial socket connection", {
        socketId: currentSocketId,
        connected: socket.connected,
      });
      socketIdRef.current = currentSocketId;
      connectionStatsRef.current.socketState = "connecting";
    }

    return hasReconnected;
  }, [socket, getSafeSocketId]);

  return {
    getSafeSocketId,
    checkSocketReconnection,
    getSocketStatus,
    connectionStats: connectionStatsRef.current,
  };
};

export default useSocketCore;
