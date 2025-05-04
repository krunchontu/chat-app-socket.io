import { useEffect, useRef, useCallback } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useChatSocketIntegration");

/**
 * Hook to integrate socket events with chat functionality
 * Manages socket event registration and lifecycle
 *
 * @param {Object} socket - Socket.io instance
 * @param {boolean} isConnected - Whether socket is connected
 * @param {Object} eventHandlers - Object containing event handler functions
 * @param {Function} registerEvent - Function to register socket events
 * @returns {Object} Socket integration utilities
 */
const useChatSocketIntegration = (
  socket,
  isConnected,
  eventHandlers,
  registerEvent
) => {
  // Keep track of whether event listeners are registered
  const eventListenersRegistered = useRef(false);

  // Track socket reconnection events
  const socketConnectionRef = useRef({
    lastRegisteredSocketId: null,
    registrationCount: 0,
  });

  /**
   * Register all needed chat socket events
   * This is called when socket connection changes
   *
   * @returns {Function} Cleanup function to unregister events
   */
  const registerAllEvents = useCallback(() => {
    if (!socket || !isConnected) {
      logger.debug(
        "Cannot register events - socket not available or connected"
      );
      return () => {};
    }

    // Skip if already registered for this socket
    if (
      eventListenersRegistered.current &&
      socketConnectionRef.current.lastRegisteredSocketId === socket.id
    ) {
      logger.debug("Events already registered for this socket, skipping");
      return () => {};
    }

    logger.info("Registering core socket event handlers");

    // Update tracking state
    eventListenersRegistered.current = true;
    socketConnectionRef.current.lastRegisteredSocketId = socket.id;
    socketConnectionRef.current.registrationCount++;

    // Register all event handlers
    const cleanupHandlers = [
      // Message events
      registerEvent("message", eventHandlers.handleNewMessage),
      registerEvent("sendMessage", eventHandlers.handleNewMessage),
      registerEvent("messageUpdated", eventHandlers.handleMessageUpdated),
      registerEvent("messageEdited", eventHandlers.handleMessageEdited),
      registerEvent("messageDeleted", eventHandlers.handleMessageDeleted),
      registerEvent("replyCreated", eventHandlers.handleReplyCreated),

      // User events
      registerEvent("onlineUsers", eventHandlers.handleOnlineUsers),
      registerEvent("userNotification", eventHandlers.handleUserNotification),

      // Connection events
      registerEvent("connect", eventHandlers.handleReconnect),
      registerEvent("disconnect", eventHandlers.handleDisconnect),
    ];

    // Return a combined cleanup function
    return () => {
      logger.info("Cleaning up socket event handlers");
      cleanupHandlers.forEach((cleanup) => cleanup());
      eventListenersRegistered.current = false;
    };
  }, [
    socket,
    isConnected,
    registerEvent,
    eventHandlers.handleNewMessage,
    eventHandlers.handleMessageUpdated,
    eventHandlers.handleMessageEdited,
    eventHandlers.handleMessageDeleted,
    eventHandlers.handleReplyCreated,
    eventHandlers.handleOnlineUsers,
    eventHandlers.handleUserNotification,
    eventHandlers.handleReconnect,
    eventHandlers.handleDisconnect,
  ]);

  // Effect to register event listeners when socket connection changes
  useEffect(() => {
    const cleanup = registerAllEvents();

    return () => {
      cleanup();
      logger.debug("Socket integration cleanup complete");
    };
  }, [registerAllEvents]);

  // Check if specific events are registered
  const isEventRegistered = useCallback((eventName) => {
    return eventListenersRegistered.current;
  }, []);

  // Force re-register all event handlers
  const refreshEventRegistration = useCallback(() => {
    if (eventListenersRegistered.current) {
      logger.debug("Forcing event handler refresh");
      eventListenersRegistered.current = false;
      return registerAllEvents();
    }
    return () => {};
  }, [registerAllEvents]);

  return {
    isEventRegistered,
    refreshEventRegistration,
    registrationStats: {
      isRegistered: eventListenersRegistered.current,
      registrationCount: socketConnectionRef.current.registrationCount,
    },
  };
};

export default useChatSocketIntegration;
