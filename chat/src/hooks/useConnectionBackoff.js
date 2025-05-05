import { useRef, useCallback } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useConnectionBackoff");

/**
 * Custom hook for managing connection backoff strategy
 * Completely redesigned with a fixed delay approach for more reliable connections
 * and to avoid excessive delays that can prevent reconnection
 *
 * @returns {Object} Backoff management utilities
 */
const useConnectionBackoff = () => {
  // Add connection attempt tracking for throttling
  const connectionAttemptsRef = useRef({
    count: 0,
    lastAttempt: 0,
    backoffDelay: 300, // Very short initial delay (300ms)
    maxAttempts: 20,
    resetTimer: null,
  });

  /**
   * Determines if connection should be throttled based on recent activity
   */
  const shouldThrottleConnection = useCallback(() => {
    // Clear any existing auto-reset timer when checking
    if (connectionAttemptsRef.current.resetTimer) {
      clearTimeout(connectionAttemptsRef.current.resetTimer);
      connectionAttemptsRef.current.resetTimer = null;
    }

    const now = Date.now();
    const timeSinceLastAttempt =
      now - connectionAttemptsRef.current.lastAttempt;

    // Use a fixed delay approach rather than exponential
    const currentDelay = Math.min(
      1000,
      300 + connectionAttemptsRef.current.count * 100
    );
    connectionAttemptsRef.current.backoffDelay = currentDelay;

    // Only throttle if we've tried several times recently (last 5 seconds)
    const recentAttempts =
      connectionAttemptsRef.current.count > 3 && timeSinceLastAttempt < 5000;

    // Only throttle if the last attempt was very recent
    return (
      recentAttempts &&
      timeSinceLastAttempt < connectionAttemptsRef.current.backoffDelay
    );
  }, []);

  /**
   * Gets the recommended backoff time
   */
  const getBackoffTime = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAttempt =
      now - connectionAttemptsRef.current.lastAttempt;

    // Fixed delay with small random jitter (to prevent connection stampedes)
    const jitter = Math.random() * 100;
    const delay = Math.max(
      0,
      connectionAttemptsRef.current.backoffDelay - timeSinceLastAttempt + jitter
    );

    return Math.min(delay, 2000); // Never delay more than 2 seconds
  }, []);

  /**
   * Resets the backoff strategy
   */
  const resetBackoff = useCallback(() => {
    // Clear any pending reset timer
    if (connectionAttemptsRef.current.resetTimer) {
      clearTimeout(connectionAttemptsRef.current.resetTimer);
    }

    // Reset state
    connectionAttemptsRef.current = {
      count: 0,
      lastAttempt: 0,
      backoffDelay: 300, // Reset to initial delay
      maxAttempts: 20,
      resetTimer: null,
    };
    logger.info("Backoff strategy reset");
  }, []);

  /**
   * Records a connection attempt
   */
  const trackConnectionAttempt = useCallback(() => {
    connectionAttemptsRef.current.count++;
    connectionAttemptsRef.current.lastAttempt = Date.now();

    // Calculate a reasonable delay based on attempt count, but cap it
    const attemptCount = connectionAttemptsRef.current.count;
    const newDelay = Math.min(1000, 300 + attemptCount * 100);
    connectionAttemptsRef.current.backoffDelay = newDelay;

    logger.info("Connection attempt tracked", {
      attemptNumber: connectionAttemptsRef.current.count,
      backoffDelay: connectionAttemptsRef.current.backoffDelay,
    });

    // Auto-reset after any connection attempt
    if (connectionAttemptsRef.current.resetTimer) {
      clearTimeout(connectionAttemptsRef.current.resetTimer);
    }

    connectionAttemptsRef.current.resetTimer = setTimeout(() => {
      // If we're still trying after 15 seconds, reset the counter but keep a record
      if (connectionAttemptsRef.current.count > 0) {
        logger.info("Auto-resetting backoff after timeout", {
          previousAttempts: connectionAttemptsRef.current.count,
        });
        resetBackoff();
      }
    }, 15000);
  }, [resetBackoff]); // Added resetBackoff dependency

  return {
    shouldThrottleConnection,
    getBackoffTime,
    trackConnectionAttempt,
    resetBackoff,
    getCurrentAttemptCount: () => connectionAttemptsRef.current.count,
  };
};

export default useConnectionBackoff;
