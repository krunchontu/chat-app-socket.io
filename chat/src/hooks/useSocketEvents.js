import { useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

/**
 * Custom hook to manage socket event listeners with improved debugging
 * and prevention of duplicate event handlers
 *
 * @param {Object} socket - Socket.io instance
 * @param {Function} dispatch - Redux-style dispatch function for state updates
 * @param {Object} user - Current user object
 * @returns {Object} Socket event management utilities
 */
const useSocketEvents = (socket, dispatch, user) => {
  // Use a ref to track registered events and prevent duplicates
  const registeredEvents = useRef(new Set());

  // Track current socket ID to detect reconnections
  const socketIdRef = useRef(null);

  // Create a correlation ID for this hook instance to trace events
  const correlationId = useRef(uuidv4());

  /**
   * Log socket events in development mode with enhanced details
   * @param {string} eventName - Name of the socket event
   * @param {any} data - Event data
   * @param {string} direction - 'incoming' or 'outgoing'
   */
  const logSocketEvent = useCallback(
    (eventName, data, direction = "incoming") => {
      if (process.env.NODE_ENV !== "production") {
        const timestamp = new Date().toISOString();
        const prefix = direction === "outgoing" ? "↗️ OUT" : "↘️ IN";

        console.group(`${prefix} | Socket Event: ${eventName} | ${timestamp}`);
        console.log("SocketID:", socket?.id || "Not connected");
        console.log("CorrelationID:", correlationId.current);
        console.log("User:", user?.username || "Unknown");
        console.log("Data:", data);
        console.groupEnd();
      }
    },
    [socket, user]
  );

  /**
   * Register an event handler with deduplication
   * @param {string} eventName - Socket.io event name
   * @param {Function} handler - Event handler function
   */
  const registerEvent = useCallback(
    (eventName, handler) => {
      // Create a unique key for this event type
      const eventKey = `${eventName}`;

      // Check if already registered to prevent duplicates
      if (!registeredEvents.current.has(eventKey)) {
        const wrappedHandler = (data) => {
          logSocketEvent(eventName, data);
          handler(data);
        };

        // Remove existing handler if present (with null check)
        if (socket) {
          socket.off(eventName);
        }

        // Add new handler (with null check)
        if (socket) {
          socket.on(eventName, wrappedHandler);
        }

        // Mark as registered
        registeredEvents.current.add(eventKey);

        // Return cleanup function with null check
        return () => {
          if (socket) {
            socket.off(eventName, wrappedHandler);
          }
          registeredEvents.current.delete(eventKey);
        };
      }

      return () => {}; // Empty cleanup if not registered
    },
    [socket, logSocketEvent]
  );

  /**
   * Send a socket event with logging
   * @param {string} eventName - Socket.io event name
   * @param {any} data - Event data to send
   */
  const emitEvent = useCallback(
    (eventName, data) => {
      if (socket && socket.connected) {
        // Add correlation ID and timestamp to data for tracking
        const enhancedData = {
          ...data,
          _meta: {
            correlationId: correlationId.current,
            clientTimestamp: new Date().toISOString(),
            userId: user?.id || "anonymous",
          },
        };

        logSocketEvent(eventName, enhancedData, "outgoing");
        socket.emit(eventName, enhancedData);
        return true;
      }
      return false;
    },
    [socket, user, logSocketEvent]
  );

  // Clean up event handlers when socket changes or component unmounts
  useEffect(() => {
    if (!socket) return;

    // Check if this is a new socket connection
    if (socketIdRef.current !== socket.id) {
      // Clear all registered events if socket ID changed (reconnection)
      registeredEvents.current.clear();
      socketIdRef.current = socket.id;

      // Generate new correlation ID on reconnection
      correlationId.current = uuidv4();

      console.log(`Socket reconnected with new ID: ${socket.id}`);
      console.log(`New correlation ID: ${correlationId.current}`);
    }

    // Store current socket reference for cleanup
    const currentSocket = socket;

    // Return a cleanup function
    return () => {
      // Clear registered events safely
      registeredEvents.current.clear();
      // Reset socket ID reference
      socketIdRef.current = null;
    };
  }, [socket]);

  return {
    registerEvent,
    emitEvent,
    logSocketEvent,
    correlationId: correlationId.current,
  };
};

export default useSocketEvents;
