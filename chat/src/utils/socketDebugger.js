/**
 * Socket.IO Debugging Utility
 * Enhanced debugging tools for Socket.IO events with tracing and logging
 */

const DEBUG_LEVEL = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
};

// Set to DEBUG_LEVEL.TRACE for most verbose output
const CURRENT_DEBUG_LEVEL = DEBUG_LEVEL.TRACE;

// Enable to log all socket events to console
const ENABLE_CONSOLE_LOGGING = true;

// Enable to track socket event timing
const ENABLE_PERFORMANCE_TRACKING = true;

// Enable to store event history in memory (helpful for debugging)
const STORE_EVENT_HISTORY = true;

// Maximum number of events to keep in history
const MAX_EVENT_HISTORY = 100;

// Global event history storage
const eventHistory = [];

/**
 * Log socket event with detailed information
 *
 * @param {string} eventName - Name of the socket event
 * @param {any} data - Event data
 * @param {string} direction - 'incoming' or 'outgoing'
 * @param {string} socketId - Socket ID associated with the event
 * @param {string} correlationId - ID for tracking related events
 * @param {Object} metadata - Additional debugging metadata
 */
function logSocketEvent(
  eventName,
  data,
  direction,
  socketId,
  correlationId,
  metadata = {}
) {
  if (CURRENT_DEBUG_LEVEL < DEBUG_LEVEL.DEBUG) return;

  const timestamp = new Date().toISOString();
  const eventInfo = {
    timestamp,
    eventName,
    direction,
    socketId: socketId || "unknown",
    correlationId: correlationId || "none",
    data,
    metadata,
  };

  // Store in event history if enabled
  if (STORE_EVENT_HISTORY) {
    eventHistory.unshift(eventInfo);

    // Trim history if needed
    if (eventHistory.length > MAX_EVENT_HISTORY) {
      eventHistory.pop();
    }
  }

  // Log to console if enabled
  if (ENABLE_CONSOLE_LOGGING) {
    const prefix = direction === "outgoing" ? "↗️ OUT" : "↘️ IN";

    console.group(`🔌 SOCKET ${prefix} | ${eventName} | ${timestamp}`);
    console.log("Socket ID:", socketId || "unknown");
    console.log("Correlation ID:", correlationId || "none");
    console.log("Data:", data);

    if (Object.keys(metadata).length > 0) {
      console.log("Metadata:", metadata);
    }

    console.groupEnd();
  }

  return eventInfo;
}

/**
 * Create a performance tracker for socket events
 *
 * @param {string} eventName - Name of the socket event
 * @param {string} correlationId - ID for tracking related events
 * @returns {Function} - Function to call when event completes
 */
function trackEventPerformance(eventName, correlationId) {
  if (!ENABLE_PERFORMANCE_TRACKING) return () => {};

  const startTime = performance.now();
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(
      `⏱️ Socket Event Performance | ${eventName} | ${duration.toFixed(
        2
      )}ms | ID: ${correlationId || "none"}`
    );
    return duration;
  };
}

/**
 * Get the current event history
 *
 * @returns {Array} - Array of event history objects
 */
function getEventHistory() {
  return [...eventHistory];
}

/**
 * Clear the event history
 */
function clearEventHistory() {
  eventHistory.length = 0;
}

/**
 * Find related events by correlation ID
 *
 * @param {string} correlationId - Correlation ID to search for
 * @returns {Array} - Array of related events
 */
function findRelatedEvents(correlationId) {
  if (!correlationId) return [];
  return eventHistory.filter((event) => event.correlationId === correlationId);
}

/**
 * Analyze socket communication for a specific message flow
 * Helps identify where messages might be getting lost
 *
 * @param {string} correlationId - Correlation ID to analyze
 * @returns {Object} - Analysis results
 */
function analyzeMessageFlow(correlationId) {
  if (!correlationId)
    return { complete: false, error: "No correlation ID provided" };

  const events = findRelatedEvents(correlationId);
  const outgoingEvents = events.filter((e) => e.direction === "outgoing");
  const incomingEvents = events.filter((e) => e.direction === "incoming");

  // Check if we have a complete flow (outgoing message and incoming response)
  const hasOutgoing = outgoingEvents.length > 0;
  const hasIncoming = incomingEvents.length > 0;

  return {
    complete: hasOutgoing && hasIncoming,
    events: {
      total: events.length,
      outgoing: outgoingEvents.length,
      incoming: incomingEvents.length,
    },
    timeline: events.map((e) => ({
      timestamp: e.timestamp,
      direction: e.direction,
      eventName: e.eventName,
    })),
  };
}

export {
  logSocketEvent,
  trackEventPerformance,
  getEventHistory,
  clearEventHistory,
  findRelatedEvents,
  analyzeMessageFlow,
  DEBUG_LEVEL,
};
