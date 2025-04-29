/**
 * Notification utility functions for browser notifications
 */

// Check if browser notifications are supported
export const isNotificationSupported = () => {
  return "Notification" in window;
};

// Check if notification permission has been granted
export const hasNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return false;
  }
  return Notification.permission === "granted";
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Send a browser notification for a new message
export const showMessageNotification = (message, onClick) => {
  if (!hasNotificationPermission() || !message) {
    return;
  }

  // Prevent notification if tab is visible/active
  if (document.visibilityState === "visible") {
    return;
  }

  try {
    const options = {
      body: message.text || "New message received",
      icon: "/logo192.png",
      badge: "/logo192.png",
      vibrate: [100, 50, 100],
      timestamp: message.timestamp || Date.now(),
      renotify: false,
      requireInteraction: false,
      silent: false,
      data: { messageId: message.id },
    };

    const notification = new Notification(
      `New message from ${message.user || "User"}`,
      options
    );

    if (onClick && typeof onClick === "function") {
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        onClick(message);
        notification.close();
      };
    }

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  } catch (error) {
    console.error("Error showing notification:", error);
    return null;
  }
};

// Save notification preferences to localStorage
export const saveNotificationPreference = (enabled) => {
  localStorage.setItem("notificationsEnabled", enabled ? "true" : "false");
};

// Get notification preferences from localStorage
export const getNotificationPreference = () => {
  const preference = localStorage.getItem("notificationsEnabled");
  // If not set, default to true
  if (preference === null) {
    return true;
  }
  return preference === "true";
};
