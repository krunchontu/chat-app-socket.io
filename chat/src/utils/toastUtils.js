import toast from "react-hot-toast";

/**
 * Toast notification utilities for the application
 * Uses react-hot-toast for consistent notifications
 */

// Default toast options
const defaultOptions = {
  duration: 4000,
  position: "top-right",
};

/**
 * Show a default toast notification
 * @param {string} message - The message to display
 * @param {Object} options - Custom toast options
 */
export const showToast = (message, options = {}) => {
  return toast(message, { ...defaultOptions, ...options });
};

/**
 * Show a success toast notification
 * @param {string} message - The message to display
 * @param {Object} options - Custom toast options
 */
export const showSuccessToast = (message, options = {}) => {
  return toast.success(message, { ...defaultOptions, ...options });
};

/**
 * Show an info toast notification
 * @param {string} message - The message to display
 * @param {Object} options - Custom toast options
 */
export const showInfoToast = (message, options = {}) => {
  return toast(message, {
    ...defaultOptions,
    icon: "🔵",
    style: {
      borderLeft: "4px solid #3498db",
    },
    ...options,
  });
};

/**
 * Show an error toast notification
 * @param {string} message - The message to display
 * @param {Object} options - Custom toast options
 */
export const showErrorToast = (message, options = {}) => {
  return toast.error(message, { ...defaultOptions, ...options });
};

/**
 * Show a loading toast notification
 * @param {string} message - The message to display
 * @param {Object} options - Custom toast options
 */
export const showLoadingToast = (message, options = {}) => {
  return toast.loading(message, { ...defaultOptions, ...options });
};

/**
 * Update an existing toast notification
 * @param {string} toastId - The ID of the toast to update
 * @param {string} message - The new message to display
 * @param {Object} options - Custom toast options
 */
export const updateToast = (toastId, message, options = {}) => {
  return toast.update(toastId, {
    render: message,
    ...options,
  });
};

/**
 * Dismiss a specific toast notification
 * @param {string} toastId - The ID of the toast to dismiss
 */
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toast notifications
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

/**
 * Show a message notification toast
 * @param {Object} message - The message object from the server
 */
export const showMessageToast = (message) => {
  if (!message || !message.user) return null;

  return toast(
    <div className="flex items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white mr-2">
        {message.user.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <p className="font-semibold">{message.user}</p>
        <p className="text-sm truncate">{message.text}</p>
      </div>
    </div>,
    {
      ...defaultOptions,
      className: "message-toast",
      duration: 5000,
    }
  );
};

/**
 * Convert system notification preferences to toast preferences
 * @param {boolean} notificationsEnabled - Whether notifications are enabled
 */
export const syncNotificationPreferences = (notificationsEnabled) => {
  toast.remove();
  if (!notificationsEnabled) {
    // This doesn't disable toast completely, but we could add additional logic here
    // to control which types of toasts should be shown based on user preferences
  }
};
