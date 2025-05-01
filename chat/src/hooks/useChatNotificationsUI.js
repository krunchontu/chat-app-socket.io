import { useState, useEffect, useCallback } from "react";
import {
  requestNotificationPermission,
  showMessageNotification,
  getNotificationPreference,
  saveNotificationPreference,
} from "../utils/notificationUtils";
import { createLogger } from "../utils/logger";

const logger = createLogger("useChatNotificationsUI");

/**
 * Custom hook to manage UI-related browser notification logic.
 * Handles permission requests, user preference state, and displaying notifications for new messages.
 *
 * @param {Array} messages - The current list of message objects.
 * @param {object | null} currentUser - The currently authenticated user object ({ username }).
 * @returns {{
 *   notificationsEnabled: boolean; // Whether notifications are currently enabled by the user
 *   toggleNotifications: () => void; // Function to toggle the notification preference
 * }}
 */
const useChatNotificationsUI = (messages, currentUser) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    getNotificationPreference
  );

  // Request notification permission on mount if enabled
  useEffect(() => {
    if (notificationsEnabled) {
      logger.info("Notifications enabled, requesting permission...");
      requestNotificationPermission()
        .then((granted) => {
          if (!granted) {
            logger.warn("Notification permission denied by user.");
            // If permission was denied, update user preference state and storage
            setNotificationsEnabled(false);
            saveNotificationPreference(false);
          } else {
            logger.info("Notification permission granted.");
          }
        })
        .catch((err) => {
          logger.error("Error requesting notification permission:", err);
        });
    }
  }, [notificationsEnabled]); // Rerun if the preference changes

  // Handle showing browser notifications for new messages
  useEffect(() => {
    // Only proceed if notifications are enabled and we have messages
    if (!notificationsEnabled || messages.length === 0) {
      return;
    }

    const latestMessage = messages[messages.length - 1];

    // Ensure latest message exists and wasn't sent by the current user
    if (latestMessage && latestMessage.user !== currentUser?.username) {
      logger.debug("Showing notification for new message", {
        id: latestMessage.id,
      });
      showMessageNotification(latestMessage, (message) => {
        // Optional: Callback when notification is clicked
        logger.debug("Notification clicked for message", { id: message.id });
        // Example: Focus window or scroll to message (logic would be in the component)
        window.focus();
      });
    }
  }, [messages, currentUser, notificationsEnabled]); // Rerun when messages, user, or preference change

  // Toggle notification settings (preference)
  const toggleNotifications = useCallback(() => {
    const newState = !notificationsEnabled;
    logger.info(`Toggling notifications ${newState ? "ON" : "OFF"}`);

    if (newState) {
      // If turning ON, request permission first
      requestNotificationPermission()
        .then((granted) => {
          if (granted) {
            setNotificationsEnabled(true);
            saveNotificationPreference(true);
            logger.info("Notifications turned ON and permission granted.");
          } else {
            logger.warn(
              "Notifications cannot be turned ON - permission denied."
            );
            // Keep state as false if permission denied
            setNotificationsEnabled(false);
            saveNotificationPreference(false);
          }
        })
        .catch((err) => {
          logger.error("Error requesting permission during toggle ON:", err);
          // Keep state as false on error
          setNotificationsEnabled(false);
          saveNotificationPreference(false);
        });
    } else {
      // If turning OFF, just update state and storage
      setNotificationsEnabled(false);
      saveNotificationPreference(false);
      logger.info("Notifications turned OFF.");
    }
  }, [notificationsEnabled]);

  return {
    notificationsEnabled,
    toggleNotifications,
  };
};

export default useChatNotificationsUI;
