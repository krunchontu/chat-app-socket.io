import { useCallback } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useSocketEmitter");

/**
 * Enhanced socket emit functionality with retry logic and error handling
 *
 * @param {Object} socket - Socket.io instance
 * @param {Function} getSafeSocketId - Function to get the socket ID safely
 * @param {Function} createDebugEmit - Optional debug wrapper function
 * @returns {Object} Emit utilities
 */
const useSocketEmitter = (socket, getSafeSocketId, createDebugEmit) => {
  /**
   * Enhanced emit function with retry logic and debugging
   *
   * @param {string} eventName - Socket.io event name
   * @param {any} data - Event data to send
   * @param {Object} options - Emit options
   * @param {boolean} options.retry - Whether to retry on failure
   * @param {number} options.retryCount - Number of retries (default: 3)
   * @param {number} options.retryDelay - Delay between retries in ms (default: 500)
   * @param {Function} options.onSuccess - Callback on successful emit
   * @param {Function} options.onError - Callback on failed emit after retries
   * @returns {Promise<boolean>} - Whether the emit was successful
   */
  const emitEvent = useCallback(
    (eventName, data, options = {}) => {
      // Default options
      const {
        retry = true,
        retryCount = 3,
        retryDelay = 500,
        onSuccess = null,
        onError = null,
      } = options;

      // Define emit function with retry logic
      const attemptEmit = (attempt = 0) => {
        // If socket is connected, attempt to send
        if (socket && socket.connected) {
          try {
            // Use the raw socket.emit
            socket.emit(eventName, data);
            logger.debug(`Socket emit success: ${eventName}`, {
              socketId: getSafeSocketId(),
            });
            if (onSuccess) onSuccess();
            return true;
          } catch (error) {
            logger.error(
              `Socket emit error (attempt ${attempt + 1}/${retryCount}):`,
              error
            );

            // If retries are enabled and we haven't exceeded retry count
            if (retry && attempt < retryCount - 1) {
              logger.debug(`Retrying emit in ${retryDelay}ms...`);
              setTimeout(() => attemptEmit(attempt + 1), retryDelay);
              return false;
            } else {
              if (onError) onError(error);
              return false;
            }
          }
        } else {
          logger.warn(
            `Socket emit failed: Socket not connected (${eventName})`
          );

          // Queue for later if retry enabled and socket is just disconnected temporarily
          if (retry && socket) {
            logger.debug(`Socket disconnected, will retry when reconnected...`);

            // We could implement queueing here for pending messages
            // This would need to store events and process them when the socket reconnects
            if (onError) onError(new Error("Socket not connected"));
            return false;
          }

          if (onError) onError(new Error("Socket not available"));
          return false;
        }
      };

      return attemptEmit();
    },
    [socket, getSafeSocketId]
  );

  /**
   * Enhanced emit function with Promise interface
   *
   * @param {string} eventName - Socket.io event name
   * @param {any} data - Event data to send
   * @param {Object} options - Emit options (see emitEvent)
   * @returns {Promise<boolean>} - Resolves when emit completes, rejects on failure
   */
  const emitEventAsync = useCallback(
    (eventName, data, options = {}) => {
      return new Promise((resolve, reject) => {
        const enhancedOptions = {
          ...options,
          onSuccess: () => resolve(true),
          onError: (error) => reject(error),
        };

        const result = emitEvent(eventName, data, enhancedOptions);
        if (!result) {
          // The emit was not even attempted (socket issues)
          reject(
            new Error(`Could not emit event ${eventName} - socket unavailable`)
          );
        }
      });
    },
    [emitEvent]
  );

  /**
   * Emit multiple events in sequence
   *
   * @param {Array<{eventName: string, data: any, options?: Object}>} events - Array of event configs
   * @returns {Promise<Array<boolean>>} - Array of results
   */
  const emitMultiple = useCallback(
    async (events) => {
      const results = [];

      for (const event of events) {
        try {
          const result = await emitEventAsync(
            event.eventName,
            event.data,
            event.options || {}
          );
          results.push(result);
        } catch (error) {
          logger.error(
            `Error in emitMultiple for event ${event.eventName}:`,
            error
          );
          results.push(false);
        }
      }

      return results;
    },
    [emitEventAsync]
  );

  /**
   * Check if socket is available for emitting
   *
   * @returns {boolean} - Whether socket is ready for emit
   */
  const canEmit = useCallback(() => {
    return !!(socket && socket.connected);
  }, [socket]);

  // Create enhanced emit function with debugging if provided
  let enhancedEmit = emitEvent;
  if (createDebugEmit) {
    // Wrap our emit with the debug wrapper
    enhancedEmit = createDebugEmit((eventName, data, options) => {
      return emitEvent(eventName, data, options);
    });
  }

  return {
    emitEvent: enhancedEmit,
    emitEventAsync,
    emitMultiple,
    canEmit,
  };
};

export default useSocketEmitter;
