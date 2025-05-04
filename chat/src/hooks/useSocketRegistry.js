import { useRef, useCallback } from "react";
import { createLogger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

const logger = createLogger("useSocketRegistry");

/**
 * Manages socket event registration with deduplication and cleanup
 *
 * @param {Object} socket - Socket.io instance
 * @param {Function} getSafeSocketId - Function to get the socket ID safely
 * @returns {Object} Event registration utilities
 */
const useSocketRegistry = (socket, getSafeSocketId) => {
  // Use a ref to track registered events and prevent duplicates
  const registeredEvents = useRef(new Set());

  /**
   * Standard event handler wrapper factory
   * Encapsulates common handler logic
   *
   * @param {string} eventName - Name of the event
   * @param {Function} handlerFn - Original handler function
   * @param {Object} options - Options for the handler
   * @returns {Function} - Wrapped handler function
   */
  const createEventHandler = useCallback(
    (eventName, handlerFn, options = {}) => {
      const eventId = uuidv4();

      return (data) => {
        const socketIdentifier = getSafeSocketId();

        // Add standardized logging if needed
        if (options.enableLogging) {
          logger.debug(`Socket event: ${eventName}`, {
            eventId,
            socketId: socketIdentifier,
            connected: !!socket?.connected,
          });
        }

        try {
          // Call the original handler
          handlerFn(data);
        } catch (error) {
          logger.error(`Error in ${eventName} handler:`, error);
        }
      };
    },
    [getSafeSocketId, socket]
  );

  /**
   * Register an event handler with enhanced deduplication
   *
   * @param {string} eventName - Socket.io event name
   * @param {Function} handler - Event handler function
   * @param {Object} options - Registration options
   * @returns {Function} - Cleanup function
   */
  const registerEvent = useCallback(
    (eventName, handler, options = { enableLogging: true }) => {
      // Create a unique key for this event type
      const eventKey = eventName;

      // Check if already registered to prevent duplicates
      if (!registeredEvents.current.has(eventKey)) {
        // Create wrapped handler with common functionality
        const wrappedHandler = createEventHandler(eventName, handler, options);

        // First remove any existing handlers to avoid duplicates
        if (socket) {
          socket.off(eventName);
        }

        // Add new handler (with null check)
        if (socket) {
          socket.on(eventName, wrappedHandler);

          // Log registration with clear identifier
          logger.debug(`Socket event registered: '${eventName}'`, {
            socketId: getSafeSocketId(),
          });

          // Track registered events
          registeredEvents.current.add(eventKey);
        }

        // Return cleanup function with null check
        return () => {
          if (socket) {
            socket.off(eventName, wrappedHandler);
            logger.debug(`Socket event removed: '${eventName}'`);
          }
          registeredEvents.current.delete(eventKey);
        };
      } else {
        logger.debug(`Event '${eventName}' already registered - skipping`);
      }

      return () => {}; // Empty cleanup if not registered
    },
    [socket, getSafeSocketId, createEventHandler]
  );

  /**
   * Register multiple events with the same handler pattern
   *
   * @param {Array<string>} eventNames - Array of event names to register
   * @param {Function} handlerFactory - Factory function to create handlers for each event
   * @param {Object} options - Registration options
   * @returns {Function} - Combined cleanup function
   */
  const registerMultipleEvents = useCallback(
    (eventNames, handlerFactory, options = {}) => {
      const cleanupFunctions = eventNames.map((eventName) => {
        const handler = handlerFactory(eventName);
        return registerEvent(eventName, handler, options);
      });

      // Return a combined cleanup function
      return () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
      };
    },
    [registerEvent]
  );

  /**
   * Check if an event is already registered
   *
   * @param {string} eventName - Event name to check
   * @returns {boolean} - Whether the event is registered
   */
  const isEventRegistered = useCallback((eventName) => {
    return registeredEvents.current.has(eventName);
  }, []);

  /**
   * Get list of all currently registered events
   *
   * @returns {Array<string>} - Array of registered event names
   */
  const getRegisteredEvents = useCallback(() => {
    return Array.from(registeredEvents.current);
  }, []);

  /**
   * Clear all registered events
   *
   * @returns {void}
   */
  const clearAllEvents = useCallback(() => {
    if (socket) {
      const events = Array.from(registeredEvents.current);
      events.forEach((eventName) => {
        socket.off(eventName);
        logger.debug(`Socket event removed: '${eventName}'`);
      });
      registeredEvents.current.clear();
    }
  }, [socket]);

  return {
    registerEvent,
    registerMultipleEvents,
    isEventRegistered,
    getRegisteredEvents,
    clearAllEvents,
  };
};

export default useSocketRegistry;
