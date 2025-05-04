import { useEffect, useCallback } from "react";
import useSocketCore from "./useSocketCore";
import useSocketRegistry from "./useSocketRegistry";
import useSocketDebugger from "./useSocketDebugger";
import useSocketEmitter from "./useSocketEmitter";
import { createLogger } from "../utils/logger";

const logger = createLogger("useSocketEvents");

/**
 * Main socket events hook that integrates specialized socket hooks
 * This facade provides a unified interface for socket event handling
 *
 * @param {Object} socket - Socket.io instance
 * @param {Function} dispatch - Redux-style dispatch function for state updates
 * @param {Object} user - Current user object
 * @returns {Object} Socket event management utilities
 */
const useSocketEvents = (socket, dispatch, user) => {
  // Use specialized socket hooks
  const { getSafeSocketId, checkSocketReconnection, getSocketStatus } =
    useSocketCore(socket);

  const {
    createDebugEventHandler,
    createDebugEmit,
    getDiagnostics,
    resetCorrelationId,
    getCorrelationId,
  } = useSocketDebugger(socket, user, getSafeSocketId);

  const {
    registerEvent,
    registerMultipleEvents,
    //isEventRegistered,
    getRegisteredEvents,
    clearAllEvents,
  } = useSocketRegistry(socket, getSafeSocketId);

  const { emitEvent, emitEventAsync, emitMultiple, canEmit } = useSocketEmitter(
    socket,
    getSafeSocketId,
    createDebugEmit
  );

  /**
   * Enhanced event handler creator that combines debugging and registration
   * This creates an event handler with built-in debugging and deduplication
   *
   * @param {string} eventName - Socket event name
   * @param {Function} handlerFn - Handler function
   * @param {Object} options - Registration options
   * @returns {Function} - Registration cleanup function
   */
  const createAndRegisterEventHandler = useCallback(
    (eventName, handlerFn, options = {}) => {
      // Use debug wrapper around the original handler
      const debugHandler = createDebugEventHandler(
        eventName,
        handlerFn,
        options
      );

      // Register the wrapped handler
      return registerEvent(eventName, debugHandler, options);
    },
    [createDebugEventHandler, registerEvent]
  );

  // Handle socket reconnection effects
  useEffect(() => {
    if (!socket) return;

    const hasReconnected = checkSocketReconnection();

    if (hasReconnected) {
      logger.info(
        "Socket reconnection detected - generating new correlation ID"
      );
      resetCorrelationId();
      clearAllEvents();
    }

    // Set up a periodic health check for socket connection
    const healthCheckInterval = setInterval(() => {
      const status = getSocketStatus();
      logger.debug("Socket health check", status);
    }, 10000); // Check every 10 seconds

    // Return cleanup function
    return () => {
      clearInterval(healthCheckInterval);
      clearAllEvents();
      logger.info("Socket event handlers cleaned up");
    };
  }, [
    socket,
    checkSocketReconnection,
    resetCorrelationId,
    clearAllEvents,
    getSocketStatus,
  ]);

  // Create an enhanced diagnostics function that combines all hook data
  const getEnhancedDiagnostics = useCallback(() => {
    const coreDiagnostics = getDiagnostics();

    return {
      ...coreDiagnostics,
      registeredEvents: getRegisteredEvents(),
      canEmit: canEmit(),
      socketStatus: getSocketStatus(),
    };
  }, [getDiagnostics, getRegisteredEvents, canEmit, getSocketStatus]);

  return {
    // Core event registration
    registerEvent: createAndRegisterEventHandler, // Enhanced registration with debugging
    registerMultipleEvents,
    clearAllEvents,

    // Event emission
    emitEvent,
    emitEventAsync,
    emitMultiple,

    // Status and diagnostics
    getDiagnostics: getEnhancedDiagnostics,
    correlationId: getCorrelationId(),
    getRegisteredEvents,
    canEmit,
    getSocketStatus,
  };
};

export default useSocketEvents;
