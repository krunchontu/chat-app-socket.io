import { useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  logSocketEvent,
  trackEventPerformance,
  getEventHistory,
  analyzeMessageFlow,
} from "../utils/socketDebugger";

/**
 * Custom hook to manage socket event listeners with enhanced debugging
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

  // Keep track of missed events for reliability statistics
  const missedEventsRef = useRef({
    count: 0,
    events: [],
  });

  /**
   * Register an event handler with enhanced debugging and deduplication
   *
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
          // Track event performance
          const endPerformanceTracking = trackEventPerformance(
            eventName,
            data?._meta?.correlationId || correlationId.current
          );

          // Create a unique event ID for this specific event
          const eventId = uuidv4();
          const socketIdentifier = socket?.id || "unknown";

          // Determine message correlation ID (use from data or generate new one)
          const msgCorrelationId =
            data?._meta?.correlationId || correlationId.current;

          // Log using enhanced debugger with detailed metadata
          logSocketEvent(
            eventName,
            data,
            "incoming",
            socketIdentifier,
            msgCorrelationId,
            {
              eventId,
              connected: !!socket?.connected,
              userId: user?.id || "anonymous",
              username: user?.username || "unknown",
              timestamp: new Date().toISOString(),
              registeredEvents: Array.from(registeredEvents.current),
            }
          );

          // Call the original handler
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in ${eventName} handler:`, error);
            // Track failed events for debugging
            missedEventsRef.current.events.push({
              eventName,
              errorMessage: error.message,
              data,
              timestamp: new Date().toISOString(),
            });
            missedEventsRef.current.count++;
          }

          // End performance tracking
          endPerformanceTracking();

          // Special debug for message related events
          if (eventName === "sendMessage" || eventName === "message") {
            console.group("🔍 DETAILED MESSAGE EVENT DEBUG");
            console.log("Time:", new Date().toLocaleTimeString());
            console.log("Event Name:", eventName);
            console.log("Data Structure:", Object.keys(data || {}));
            console.log("Message ID:", data?.id || data?._id || "missing");
            console.log("Message User:", data?.user || "missing");
            console.log("Message Text:", data?.text || "missing");
            console.log("Message TempID:", data?.tempId || "N/A");
            console.log("Socket Connected:", !!socket?.connected);
            console.log("Socket ID:", socket?.id || "unknown");
            console.log(
              "Registered Events:",
              Array.from(registeredEvents.current)
            );

            // Analyze event flow to detect any missing parts
            if (data?._meta?.correlationId) {
              const flowAnalysis = analyzeMessageFlow(
                data?._meta?.correlationId
              );
              console.log("Message Flow Analysis:", flowAnalysis);
            }

            console.groupEnd();
          }
        };

        // First remove any existing handlers to avoid duplicates
        if (socket) {
          socket.off(eventName);
        }

        // Add new handler (with null check)
        if (socket) {
          socket.on(eventName, wrappedHandler);

          // Log registration with clear identifier
          console.log(
            `🔌 SOCKET EVENT REGISTERED: '${eventName}' on socket ${
              socket.id || "unidentified"
            }`
          );

          // Log the full list of registered events for this socket
          registeredEvents.current.add(eventKey);
          console.log(
            "Currently registered events:",
            Array.from(registeredEvents.current)
          );
        }

        // Return cleanup function with null check
        return () => {
          if (socket) {
            socket.off(eventName, wrappedHandler);
            console.log(`🔌 SOCKET EVENT REMOVED: '${eventName}'`);
          }
          registeredEvents.current.delete(eventKey);
        };
      } else {
        console.log(`🔄 Event '${eventName}' already registered - skipping`);
      }

      return () => {}; // Empty cleanup if not registered
    },
    [socket, user]
  );

  /**
   * Enhanced emit function with retry logic and debugging
   *
   * @param {string} eventName - Socket.io event name
   * @param {any} data - Event data to send
   * @param {Object} options - Emit options
   * @param {boolean} options.retry - Whether to retry on failure
   * @param {number} options.retryCount - Number of retries (default: 3)
   * @param {number} options.retryDelay - Delay between retries in ms (default: 500)
   */
  const emitEvent = useCallback(
    (eventName, data, options = {}) => {
      // Default options
      const { retry = true, retryCount = 3, retryDelay = 500 } = options;

      // Generate unique correlation ID for this event chain
      const eventCorrelationId = uuidv4();

      // Create enhanced data with detailed metadata
      const enhancedData = {
        ...data,
        _meta: {
          correlationId: eventCorrelationId,
          clientTimestamp: new Date().toISOString(),
          userId: user?.id || "anonymous",
          username: user?.username || "unknown",
          socketId: socket?.id,
          retry: { enabled: retry, count: retryCount, delay: retryDelay },
        },
      };

      // Track event performance
      const endPerformanceTracking = trackEventPerformance(
        eventName,
        eventCorrelationId
      );

      // Log using enhanced debugger
      logSocketEvent(
        eventName,
        enhancedData,
        "outgoing",
        socket?.id || "unknown",
        eventCorrelationId,
        {
          connected: !!socket?.connected,
          socketReadyState: socket?.readyState,
          connectionError:
            socket?.io?.engine?.transport?.pollXhr?.xhr?.responseText,
        }
      );

      // Define emit function with retry logic
      const attemptEmit = (attempt = 0) => {
        // If socket is connected, attempt to send
        if (socket && socket.connected) {
          try {
            socket.emit(eventName, enhancedData);
            console.log(`🔌 SOCKET EMIT SUCCESS: ${eventName}`);
            endPerformanceTracking();
            return true;
          } catch (error) {
            console.error(
              `🔌 SOCKET EMIT ERROR (attempt ${attempt + 1}/${retryCount}):`,
              error
            );

            // If retries are enabled and we haven't exceeded retry count
            if (retry && attempt < retryCount - 1) {
              console.log(`🔄 Retrying emit in ${retryDelay}ms...`);
              setTimeout(() => attemptEmit(attempt + 1), retryDelay);
              return false;
            } else {
              endPerformanceTracking();
              return false;
            }
          }
        } else {
          console.warn(
            `🔌 SOCKET EMIT FAILED: Socket not connected (${eventName})`
          );

          // Queue for later if retry enabled and socket is just disconnected temporarily
          if (retry && socket) {
            console.log(
              `🔄 Socket disconnected, will retry when reconnected...`
            );

            // We could implement queueing here for pending messages
            // This would need to store events and process them when the socket reconnects

            endPerformanceTracking();
            return false;
          }

          endPerformanceTracking();
          return false;
        }
      };

      return attemptEmit();
    },
    [socket, user]
  );

  /**
   * Get diagnostic information about socket state
   * @returns {Object} Diagnostics data
   */
  const getDiagnostics = useCallback(() => {
    return {
      socketConnected: !!socket?.connected,
      socketId: socket?.id || null,
      registeredEvents: Array.from(registeredEvents.current),
      correlationId: correlationId.current,
      missedEvents: { ...missedEventsRef.current },
      eventHistory: getEventHistory().slice(0, 10), // Get last 10 events
    };
  }, [socket]);

  // Enhanced cleanup and reconnection handling
  useEffect(() => {
    if (!socket) return;

    // Check if this is a new socket connection
    if (socketIdRef.current !== socket.id) {
      console.group("🔄 SOCKET RECONNECTION DETECTED");
      console.log("Previous Socket ID:", socketIdRef.current);
      console.log("New Socket ID:", socket.id);

      // Clear all registered events if socket ID changed (reconnection)
      registeredEvents.current.clear();
      socketIdRef.current = socket.id;

      // Generate new correlation ID on reconnection
      correlationId.current = uuidv4();
      console.log("New correlation ID:", correlationId.current);

      // Track connection time for performance metrics
      console.log("Reconnection time:", new Date().toISOString());
      console.groupEnd();
    }

    // Set up a periodic health check for socket connection
    const healthCheckInterval = setInterval(() => {
      const isConnected = socket && socket.connected;
      const eventCount = registeredEvents.current.size;

      console.log(
        `🔋 Socket Health Check: ${
          isConnected ? "Connected" : "Disconnected"
        } | ${eventCount} events registered`
      );

      if (!isConnected && socket) {
        console.warn(
          "Socket disconnected but instance exists - possible connection issue"
        );
      }
    }, 10000); // Check every 10 seconds

    // Capture the current registered events for cleanup
    const registeredEventsSnapshot = registeredEvents.current;

    // Return a cleanup function
    return () => {
      clearInterval(healthCheckInterval);
      // Clear registered events safely using the snapshot
      registeredEventsSnapshot.clear();
      // Reset socket ID reference
      socketIdRef.current = null;

      console.log("🧹 Socket event handlers cleaned up");
    };
  }, [socket]);

  return {
    registerEvent,
    emitEvent,
    getDiagnostics,
    correlationId: correlationId.current,
  };
};

export default useSocketEvents;
