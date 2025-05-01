import { useReducer, useCallback } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useChatNotifications");

// Initial state for notifications and online users
const initialState = {
  onlineUsers: [],
  notifications: [], // Stores system/user join/leave messages
};

// Reducer for notifications and online users state
const notificationsReducer = (state, action) => {
  switch (action.type) {
    case "SET_ONLINE_USERS":
      logger.debug("Setting online users", { count: action.payload?.length });
      return { ...state, onlineUsers: action.payload };
    case "ADD_USER_NOTIFICATION":
      const newNotification = {
        ...action.payload,
        // Add a unique ID for key prop in rendering and potential management
        id: `${action.payload.type}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
      };
      logger.debug("Adding user notification", {
        type: newNotification.type,
        message: newNotification.message,
      });

      // Simple deduplication: Avoid adding the exact same message type and text within a short time frame (e.g., 2 seconds)
      const isDuplicate = state.notifications.some((existingNotif) => {
        const isRecent =
          Math.abs(
            new Date(existingNotif.timestamp || 0).getTime() -
              new Date(newNotification.timestamp).getTime()
          ) < 2000; // 2 seconds window
        return (
          existingNotif.message === newNotification.message &&
          existingNotif.type === newNotification.type && // Check type as well
          isRecent
        );
      });

      if (isDuplicate) {
        logger.warn("Duplicate notification prevented", {
          message: newNotification.message,
        });
        return state;
      }

      // Optional: Limit the number of notifications stored
      const MAX_NOTIFICATIONS = 50;
      const updatedNotifications = [...state.notifications, newNotification];
      if (updatedNotifications.length > MAX_NOTIFICATIONS) {
        updatedNotifications.shift(); // Remove the oldest notification
      }

      return { ...state, notifications: updatedNotifications };
    case "CLEAR_NOTIFICATIONS":
      logger.info("Clearing all notifications");
      return { ...state, notifications: [] };
    default:
      return state;
  }
};

/**
 * Custom hook to manage online user list and system/user notifications.
 *
 * @returns {{
 *   notificationState: { onlineUsers: Array<string>, notifications: Array<object> };
 *   dispatchNotifications: function; // Raw dispatch function for the reducer
 *   addSystemNotification: (message: string) => void; // Convenience function
 * }}
 */
const useChatNotifications = () => {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);

  // Convenience function to add a system-type notification
  const addSystemNotification = useCallback(
    (message) => {
      dispatch({
        type: "ADD_USER_NOTIFICATION",
        payload: {
          type: "system", // Standardize system message type
          message,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [dispatch]
  );

  return {
    notificationState: state,
    dispatchNotifications: dispatch,
    addSystemNotification, // Provide the helper function
  };
};

export default useChatNotifications;
