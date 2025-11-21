const logger = require("../utils/logger");

/**
 * Socket.IO Rate Limiter
 *
 * Prevents abuse by limiting the number of events a socket can emit
 * within a specific time window. Uses in-memory tracking with automatic cleanup.
 *
 * Rate limits per event type:
 * - message: 30/minute (prevent spam)
 * - like: 60/minute
 * - reaction: 60/minute
 * - editMessage: 20/minute
 * - deleteMessage: 20/minute
 * - replyToMessage: 30/minute
 */

class SocketRateLimiter {
  constructor() {
    // Store rate limit data: { socketId: { eventType: [timestamps] } }
    this.rateLimitMap = new Map();

    // Rate limit configuration (events per window)
    this.limits = {
      message: { max: 30, window: 60000 }, // 30 per minute
      like: { max: 60, window: 60000 }, // 60 per minute
      reaction: { max: 60, window: 60000 }, // 60 per minute
      editMessage: { max: 20, window: 60000 }, // 20 per minute
      deleteMessage: { max: 20, window: 60000 }, // 20 per minute
      replyToMessage: { max: 30, window: 60000 }, // 30 per minute
    };

    // Cleanup interval - run every 5 minutes to free memory
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.socket.info("Socket.IO rate limiter initialized", {
      limits: this.limits,
    });
  }

  /**
   * Check if a socket has exceeded the rate limit for an event
   * @param {string} socketId - Socket ID
   * @param {string} eventType - Type of event (message, like, etc.)
   * @param {string} userId - User ID (for logging)
   * @returns {boolean} - True if rate limit exceeded
   */
  isRateLimited(socketId, eventType, userId = null) {
    // Get or create socket's rate limit data
    if (!this.rateLimitMap.has(socketId)) {
      this.rateLimitMap.set(socketId, {});
    }

    const socketData = this.rateLimitMap.get(socketId);

    // Get or create event type's timestamp array
    if (!socketData[eventType]) {
      socketData[eventType] = [];
    }

    const timestamps = socketData[eventType];
    const now = Date.now();
    const limit = this.limits[eventType];

    // If no limit configured for this event type, allow it
    if (!limit) {
      return false;
    }

    // Remove timestamps outside the current window
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < limit.window
    );
    socketData[eventType] = validTimestamps;

    // Check if limit exceeded
    if (validTimestamps.length >= limit.max) {
      logger.socket.warn("Socket rate limit exceeded", {
        socketId,
        userId,
        eventType,
        count: validTimestamps.length,
        limit: limit.max,
        window: `${limit.window / 1000}s`,
      });
      return true;
    }

    // Add current timestamp
    validTimestamps.push(now);
    return false;
  }

  /**
   * Remove rate limit data for a disconnected socket
   * @param {string} socketId - Socket ID to remove
   */
  removeSocket(socketId) {
    if (this.rateLimitMap.has(socketId)) {
      this.rateLimitMap.delete(socketId);
      logger.socket.debug("Rate limiter data cleaned for socket", {
        socketId,
      });
    }
  }

  /**
   * Clean up old rate limit data to prevent memory leaks
   * Called periodically via setInterval
   */
  cleanup() {
    const now = Date.now();
    let cleanedSockets = 0;
    let cleanedEvents = 0;

    for (const [socketId, socketData] of this.rateLimitMap.entries()) {
      let hasActiveData = false;

      for (const [eventType, timestamps] of Object.entries(socketData)) {
        const limit = this.limits[eventType];
        if (!limit) continue;

        // Remove old timestamps
        const validTimestamps = timestamps.filter(
          (timestamp) => now - timestamp < limit.window
        );

        if (validTimestamps.length > 0) {
          socketData[eventType] = validTimestamps;
          hasActiveData = true;
        } else {
          delete socketData[eventType];
          cleanedEvents++;
        }
      }

      // Remove socket if no active data
      if (!hasActiveData) {
        this.rateLimitMap.delete(socketId);
        cleanedSockets++;
      }
    }

    if (cleanedSockets > 0 || cleanedEvents > 0) {
      logger.socket.debug("Rate limiter cleanup completed", {
        cleanedSockets,
        cleanedEvents,
        remainingSockets: this.rateLimitMap.size,
      });
    }
  }

  /**
   * Get rate limit status for a socket
   * Useful for debugging and monitoring
   * @param {string} socketId - Socket ID
   * @returns {Object} - Rate limit status
   */
  getStatus(socketId) {
    const socketData = this.rateLimitMap.get(socketId);
    if (!socketData) {
      return { socketId, events: {} };
    }

    const status = { socketId, events: {} };
    const now = Date.now();

    for (const [eventType, timestamps] of Object.entries(socketData)) {
      const limit = this.limits[eventType];
      if (!limit) continue;

      const validTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < limit.window
      );

      status.events[eventType] = {
        count: validTimestamps.length,
        limit: limit.max,
        remaining: limit.max - validTimestamps.length,
        window: `${limit.window / 1000}s`,
      };
    }

    return status;
  }

  /**
   * Clean up on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.rateLimitMap.clear();
    logger.socket.info("Socket.IO rate limiter destroyed");
  }
}

// Create singleton instance
const rateLimiter = new SocketRateLimiter();

/**
 * Socket.IO middleware for rate limiting
 * @param {Object} socket - Socket.IO socket
 * @param {Function} next - Next middleware function
 */
const socketRateLimiterMiddleware = (socket, next) => {
  // Attach rate limiter check function to socket
  socket.checkRateLimit = (eventType) => {
    const userId = socket.user?.id || null;
    return rateLimiter.isRateLimited(socket.id, eventType, userId);
  };

  // Attach rate limiter status function to socket
  socket.getRateLimitStatus = () => {
    return rateLimiter.getStatus(socket.id);
  };

  // Clean up on disconnect
  const originalDisconnect = socket.disconnect;
  socket.disconnect = function (...args) {
    rateLimiter.removeSocket(socket.id);
    return originalDisconnect.apply(this, args);
  };

  next();
};

// Export middleware and rate limiter instance
module.exports = {
  socketRateLimiterMiddleware,
  rateLimiter,
};
