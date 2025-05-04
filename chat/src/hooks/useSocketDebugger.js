import { useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../utils/logger";
import {
  logSocketEvent,
  trackEventPerformance,
  getEventHistory,
  analyzeMessageFlow,
} from "../utils/socketDebugger";

const logger = createLogger("useSocketDebugger");

/**
 * Advanced debugging capabilities for socket events
 * Manages correlation IDs, performance tracking, and logging
 *
 * @param {Object} socket - Socket.io instance
 * @param {Object} user - Current user object
 * @param {Function} getSafeSocketId - Function to get the socket ID safely
 * @returns {Object} Debugging utilities
 */
const useSocketDebugger = (socket, user, getSafeSocketId) => {
  // Create a correlation ID for this hook instance to trace events
  const correlationId = useRef(uuidv4());

  // Keep track of missed events for reliability statistics
  const missedEventsRef = useRef({
    count: 0,
    events: [],
  });

  // Track event performance metrics
  const performanceMetricsRef = useRef({
    eventCounts: {},
    slowEvents: [],
    lastEventTime: null,
  });

  /**
   * Track a new missed event
   *
   * @param {string} eventName - Name of the event
   * @param {Error} error - The error that occurred
   * @param {any} data - Event data
   */
  const trackMissedEvent = useCallback((eventName, error, data) => {
    missedEventsRef.current.count++;
    missedEventsRef.current.events.push({
      eventName,
      errorMessage: error.message,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep array at a reasonable size by removing oldest events if needed
    if (missedEventsRef.current.events.length > 50) {
      missedEventsRef.current.events.shift();
    }
  }, []);

  /**
   * Create a wrapped handler function with debugging capabilities
   *
   * @param {string} eventName - Socket.io event name
   * @param {Function} handler - Original handler function
   * @param {Object} options - Debug options
   * @returns {Function} Enhanced handler function
   */
  const createDebugEventHandler = useCallback(
    (eventName, handler, options = {}) => {
      return (data) => {
        // Track event performance
        const endPerformanceTracking = trackEventPerformance(
          eventName,
          data?._meta?.correlationId || correlationId.current
        );

        // Create a unique event ID for this specific event
        const eventId = uuidv4();
        const socketIdentifier = getSafeSocketId();

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
          }
        );

        // Update performance monitoring data
        performanceMetricsRef.current.lastEventTime = new Date().toISOString();
        performanceMetricsRef.current.eventCounts[eventName] =
          (performanceMetricsRef.current.eventCounts[eventName] || 0) + 1;

        // Call the original handler
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in ${eventName} handler:`, error);
          // Track failed events for debugging
          trackMissedEvent(eventName, error, data);
        }

        // End performance tracking and record if it was a slow event
        const duration = endPerformanceTracking();
        if (duration > 100) {
          // Track events taking longer than 100ms
          performanceMetricsRef.current.slowEvents.push({
            eventName,
            duration,
            timestamp: new Date().toISOString(),
            correlationId: msgCorrelationId,
          });

          // Keep array at a reasonable size
          if (performanceMetricsRef.current.slowEvents.length > 20) {
            performanceMetricsRef.current.slowEvents.shift();
          }
        }

        // Special debug for message related events
        if (
          (eventName === "sendMessage" || eventName === "message") &&
          options.detailedMessageLogging
        ) {
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

          // Analyze event flow to detect any missing parts
          if (data?._meta?.correlationId) {
            const flowAnalysis = analyzeMessageFlow(data?._meta?.correlationId);
            console.log("Message Flow Analysis:", flowAnalysis);
          }

          console.groupEnd();
        }
      };
    },
    [socket, user, getSafeSocketId, trackMissedEvent]
  );

  /**
   * Create an enhanced emit function with debugging
   *
   * @param {Function} originalEmit - Original socket emit function
   * @returns {Function} Enhanced emit function
   */
  const createDebugEmit = useCallback(
    (originalEmit) => {
      return (eventName, data, options = {}) => {
        // Generate unique correlation ID for this event chain
        const eventCorrelationId = uuidv4();

        // Create enhanced data with detailed metadata
        const enhancedData = {
          ...data,
          _meta: {
            ...(data?._meta || {}),
            correlationId: eventCorrelationId,
            clientTimestamp: new Date().toISOString(),
            userId: user?.id || "anonymous",
            username: user?.username || "unknown",
            socketId: getSafeSocketId(),
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
          }
        );

        // Call the original emit function with enhanced data
        const result = originalEmit(eventName, enhancedData, options);

        // End performance tracking
        endPerformanceTracking();

        return result;
      };
    },
    [socket, user, getSafeSocketId]
  );

  /**
   * Get comprehensive diagnostic information about socket events
   *
   * @returns {Object} Diagnostic data
   */
  const getDiagnostics = useCallback(() => {
    return {
      socketConnected: !!socket?.connected,
      socketId: getSafeSocketId(),
      correlationId: correlationId.current,
      missedEvents: { ...missedEventsRef.current },
      performanceMetrics: { ...performanceMetricsRef.current },
      eventHistory: getEventHistory().slice(0, 10), // Get last 10 events
    };
  }, [socket, getSafeSocketId]);

  /**
   * Reset the correlation ID (useful after reconnection)
   */
  const resetCorrelationId = useCallback(() => {
    correlationId.current = uuidv4();
    return correlationId.current;
  }, []);

  /**
   * Get the current correlation ID
   */
  const getCorrelationId = useCallback(() => {
    return correlationId.current;
  }, []);

  return {
    createDebugEventHandler,
    createDebugEmit,
    getDiagnostics,
    resetCorrelationId,
    getCorrelationId,
    missedEvents: missedEventsRef.current,
  };
};

export default useSocketDebugger;
