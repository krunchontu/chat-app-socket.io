import { useEffect, useCallback } from "react";
import { processQueue } from "../utils/offlineQueue";
import { createLogger } from "../utils/logger";
import ErrorService from "../services/ErrorService";

const logger = createLogger("useMessageSynchronizer");

/**
 * Custom hook to manage synchronization between online/offline states
 * Handles message queue processing and resyncing after reconnection
 *
 * @param {Object} socket - Socket.io instance
 * @param {boolean} isConnected - Whether the socket is connected
 * @param {boolean} isOnline - Whether the browser reports being online
 * @param {Function} dispatchMessages - Message state dispatch function
 * @param {Function} addSystemNotification - Function to add system notifications
 * @param {Function} fetchInitialMessages - Function to fetch initial messages
 * @returns {Object} Synchronization utilities
 */
const useMessageSynchronizer = (
  socket,
  isConnected,
  isOnline,
  dispatchMessages,
  addSystemNotification,
  fetchInitialMessages
) => {
  /**
   * Process the offline message queue
   * Attempts to send queued messages now that we're reconnected
   *
   * @returns {Promise<Array>} Results of processing the queue
   */
  const processOfflineQueue = useCallback(async () => {
    if (!socket || !isConnected) {
      logger.warn("Cannot process offline queue - socket not connected");
      return [];
    }

    try {
      logger.info("Processing offline queue as we are online and connected");
      const results = await processQueue(socket, dispatchMessages);

      if (results && results.length > 0) {
        addSystemNotification(
          `Sent ${results.length} message(s) from offline queue`
        );
      }

      return results || [];
    } catch (err) {
      logger.error("Error processing offline queue:", err);
      ErrorService.handleError(
        err,
        "offline-queue",
        "error",
        "Failed to process offline messages."
      );
      return [];
    }
  }, [socket, isConnected, dispatchMessages, addSystemNotification]);

  /**
   * Perform full message resynchronization
   * Used after reconnecting to ensure client state matces server state
   *
   * @returns {Promise<void>}
   */
  const synchronizeMessages = useCallback(async () => {
    logger.info("Synchronizing messages with server");

    // Process any queued messages first

    // Then fetch latest messages from server to fill in any we missed
    if (fetchInitialMessages) {
      try {
        logger.info("Fetching initial messages from server");
        await fetchInitialMessages();
        logger.info("Message synchronization completed successfully");
      } catch (error) {
        logger.error("Error fetching messages during synchronization:", error);
        ErrorService.handleError(
          error,
          "message-sync",
          "error",
          "Failed to synchronize messages with server."
        );
      }
    }
  }, [processOfflineQueue, fetchInitialMessages]);

  // Handle online/offline status changes
  useEffect(() => {
    if (isOnline) {
      addSystemNotification("You are back online.");

      // Attempt to synchronize messages if we're also connected
      if (socket && isConnected) {
        synchronizeMessages().catch((err) => {
          logger.error("Error during auto-synchronization:", err);
        });
      } else {
        logger.info(
          "Online, but socket not connected yet. Queue will process on connect."
        );
      }
    } else {
      addSystemNotification(
        "You are offline. Messages will be sent when you reconnect."
      );
    }
  }, [
    isOnline,
    isConnected,
    socket,
    addSystemNotification,
    synchronizeMessages,
  ]);

  return {
    processOfflineQueue,
    synchronizeMessages,
    isInSync: isOnline && isConnected,
  };
};

export default useMessageSynchronizer;
