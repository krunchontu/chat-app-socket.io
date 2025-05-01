/**
 * ErrorService - Centralized error handling service for the chat application
 *
 * This service provides methods for handling, formatting, and logging errors
 * with proper categorization and user-friendly messaging.
 *
 * Enhanced with:
 * - Better structured logging
 * - Integration with toast notifications
 * - Improved handling of offline errors
 * - Recovery instructions for common errors
 */
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

// Error severity levels
export const ErrorSeverity = {
  INFO: "info", // Informational messages
  WARNING: "warning", // Warnings that don't prevent functionality
  ERROR: "error", // Errors that impact some functionality
  CRITICAL: "critical", // Critical errors that prevent core functionality
};

// Error categories for better organization and handling
export const ErrorCategory = {
  NETWORK: "network", // Network/API request errors
  AUTHENTICATION: "auth", // Authentication/authorization errors
  VALIDATION: "validation", // Input validation errors
  DATABASE: "database", // Database-related errors
  UI: "ui", // UI rendering errors
  SOCKET: "socket", // Socket.IO connection errors
  OFFLINE: "offline", // Offline-related errors
  UNKNOWN: "unknown", // Uncategorized errors
};

// Environment detection
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Formats an error object into a standardized structure
 *
 * @param {Error|Object|string} error - The error to format
 * @param {string} category - The error category (from ErrorCategory)
 * @param {string} severity - The error severity (from ErrorSeverity)
 * @param {string} context - Additional context about where the error occurred
 * @returns {Object} Formatted error object
 */
export const formatError = (
  error,
  category = ErrorCategory.UNKNOWN,
  severity = ErrorSeverity.ERROR,
  context = ""
) => {
  // Get the error message depending on the error type
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : JSON.stringify(error);

  return {
    message: errorMessage,
    category,
    severity,
    context,
    timestamp: new Date().toISOString(),
    originalError: error,
  };
};

/**
 * Logs an error with appropriate severity level
 * Enhanced with structured logging and toast notifications
 *
 * @param {Object} formattedError - Error formatted using formatError
 * @param {Object} options - Additional options
 * @param {boolean} options.showToast - Whether to show a toast notification (default: true)
 * @param {boolean} options.silent - Whether to suppress console logging (default: false)
 */
export const logError = (formattedError, options = {}) => {
  const { message, category, severity, context, timestamp } = formattedError;
  const { showToast = true, silent = false } = options;

  const logPrefix = `[${timestamp}] [${severity.toUpperCase()}] [${category}]${
    context ? ` [${context}]` : ""
  }:`;

  // Only log in development or if not silent
  if (!silent || isDevelopment) {
    // Log with appropriate console method based on severity
    switch (severity) {
      case ErrorSeverity.INFO:
        console.info(`${logPrefix} ${message}`);
        break;
      case ErrorSeverity.WARNING:
        console.warn(`${logPrefix} ${message}`);
        break;
      case ErrorSeverity.CRITICAL:
        console.error(`${logPrefix} ${message}`, formattedError.originalError);
        break;
      case ErrorSeverity.ERROR:
      default:
        console.error(`${logPrefix} ${message}`);
        break;
    }
  }

  // Show toast notification if enabled
  if (showToast) {
    const userFriendlyMessage = getUserFriendlyMessage(formattedError);

    switch (severity) {
      case ErrorSeverity.INFO:
        showSuccessToast(userFriendlyMessage);
        break;
      case ErrorSeverity.WARNING:
        // Use showToast with custom styling for warnings
        showToast(userFriendlyMessage, {
          icon: "⚠️",
          style: {
            backgroundColor: "#FEF3C7", // Light amber background
            color: "#92400E", // Amber text
            border: "1px solid #F59E0B", // Amber border
          },
          className: "warning-toast",
        });
        break;
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        showErrorToast(userFriendlyMessage);
        break;
      default:
        showErrorToast(userFriendlyMessage);
    }
  }

  // In production, implement remote logging
  if (process.env.NODE_ENV === "production") {
    // TODO: send to remote logging service
    // sendToRemoteLoggingService(formattedError);
  }
};

/**
 * Get a user-friendly error message based on error category and details
 * Enhanced with more specific messages and recovery instructions
 *
 * @param {Object} formattedError - Error formatted using formatError
 * @returns {string} User-friendly error message with recovery instructions where applicable
 */
export const getUserFriendlyMessage = (formattedError) => {
  const { category, message, severity } = formattedError;

  // Return appropriate user-friendly messages based on error category
  switch (category) {
    case ErrorCategory.NETWORK:
      if (message && message.includes("timeout")) {
        return "The request timed out. Please check your connection speed and try again.";
      }
      return "Network connection issue. Please check your internet connection and try again.";

    case ErrorCategory.AUTHENTICATION:
      if (message && message.includes("expired")) {
        return "Your session has expired. Please log in again to continue.";
      }
      return "Authentication error. Please log in again to continue using the app.";

    case ErrorCategory.VALIDATION:
      return (
        message || "Invalid input. Please check your information and try again."
      );

    case ErrorCategory.SOCKET:
      return "Connection to chat server lost. The app is attempting to reconnect automatically.";

    case ErrorCategory.OFFLINE:
      return "You are currently offline. Your messages will be sent when your connection is restored.";

    // For database and unknown errors, provide a generic message to avoid exposing
    // sensitive information, but log the actual error for debugging
    case ErrorCategory.DATABASE:
      return "There was an issue accessing your data. Please try refreshing the page.";

    case ErrorCategory.UNKNOWN:
      return severity === ErrorSeverity.CRITICAL
        ? "A critical error occurred. Please refresh the page to continue."
        : "Something went wrong. Please try again later.";

    // For UI errors, try to provide the specific message when possible
    case ErrorCategory.UI:
      return (
        message ||
        "There was a problem displaying this content. Try refreshing the page."
      );

    default:
      return "An unexpected error occurred. Please try again.";
  }
};

/**
 * Handle an error by formatting, logging, and returning a user-friendly message
 * Enhanced with toast notification integration and additional options
 *
 * @param {Error|Object|string} error - The error to handle
 * @param {string} category - The error category (from ErrorCategory)
 * @param {string} severity - The error severity (from ErrorSeverity)
 * @param {string} context - Additional context about where the error occurred
 * @param {Object} options - Additional options
 * @param {boolean} options.showToast - Whether to show a toast notification
 * @param {boolean} options.silent - Whether to suppress console logging
 * @returns {string} User-friendly error message
 */
export const handleError = (
  error,
  category = ErrorCategory.UNKNOWN,
  severity = ErrorSeverity.ERROR,
  context = "",
  options = {}
) => {
  const formattedError = formatError(error, category, severity, context);

  // Log all errors with the specified options
  logError(formattedError, options);

  // Return user-friendly message
  return getUserFriendlyMessage(formattedError);
};

/**
 * Specific error handler for API request errors
 * Enhanced with better offline detection and error classification
 *
 * @param {Error} error - The error from API call (typically from axios)
 * @param {string} context - Operation context (e.g. 'login', 'fetchMessages')
 * @param {Object} options - Additional options
 * @param {boolean} options.showToast - Whether to show a toast notification
 * @param {boolean} options.silent - Whether to suppress logging
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error, context = "", options = {}) => {
  // Determine error category based on status code and other factors
  let category = ErrorCategory.NETWORK;
  let severity = ErrorSeverity.ERROR;

  // Check if user is offline
  if (!navigator.onLine) {
    category = ErrorCategory.OFFLINE;
    severity = ErrorSeverity.WARNING; // This is a warning as the app can still work offline
    return handleError(
      error.message || "You are currently offline",
      category,
      severity,
      context,
      options
    );
  }

  if (error.response) {
    // Request made and server responded with error status
    const { status } = error.response;

    if (status === 401 || status === 403) {
      category = ErrorCategory.AUTHENTICATION;
    } else if (status === 400 || status === 422) {
      category = ErrorCategory.VALIDATION;
      // Validation errors are typically less severe
      severity = ErrorSeverity.WARNING;
    } else if (status === 429) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.WARNING;
      return handleError(
        "Too many requests. Please wait before trying again.",
        category,
        severity,
        context,
        options
      );
    } else if (status >= 500) {
      // Server errors could be database issues
      category = ErrorCategory.DATABASE;
      severity = ErrorSeverity.ERROR;
    }
  } else if (error.request) {
    // Request made but no response received
    category = ErrorCategory.NETWORK;

    // Check if the error is likely a timeout
    if (error.message && error.message.includes("timeout")) {
      return handleError(
        "Request timed out. The server might be experiencing high load.",
        category,
        severity,
        context,
        options
      );
    }

    // Network errors prevent functionality but might be temporary
    severity = ErrorSeverity.ERROR;
  }

  return handleError(error, category, severity, context, options);
};

/**
 * Create an error boundary fallback renderer
 * Enhanced with better styling and recovery options
 *
 * @param {string} context - Component context for the error boundary
 * @returns {Function} Error boundary fallback render function
 */
export const createErrorBoundaryFallback = (context = "component") => {
  return ({ error, resetErrorBoundary }) => {
    // Log the error first
    const formattedError = formatError(
      error,
      ErrorCategory.UI,
      ErrorSeverity.ERROR,
      context
    );
    // Log but do not show toast since we're displaying UI
    logError(formattedError, { showToast: false });

    // Get a friendly message
    const friendlyMessage = getUserFriendlyMessage(formattedError);

    // Return a user-friendly error UI
    return (
      <div
        role="alert"
        className="error-boundary-fallback p-6 bg-white dark:bg-dark-bg-primary rounded-lg shadow-lg border border-red-200 dark:border-red-900/30"
      >
        <div className="flex items-center mb-4">
          <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-500 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
            Something went wrong
          </h3>
        </div>

        <p className="mb-4 text-gray-700 dark:text-dark-text-secondary">
          {friendlyMessage}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md shadow-sm transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 dark:bg-dark-bg-hover hover:bg-gray-300 dark:hover:bg-dark-bg-active text-gray-800 dark:text-dark-text-primary rounded-md shadow-sm transition-colors"
          >
            Reload Page
          </button>
        </div>

        {isDevelopment && (
          <details className="mt-4 p-2 bg-gray-50 dark:bg-dark-bg-hover rounded-md">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-dark-bg-active rounded-md text-xs overflow-auto">
              {error.stack || JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };
};

/**
 * Handle offline errors specifically
 *
 * @param {Function} dispatch - Redux/Context dispatch function for state updates
 * @returns {void}
 */
export const handleOfflineError = (dispatch) => {
  const formattedError = formatError(
    "You are currently offline",
    ErrorCategory.OFFLINE,
    ErrorSeverity.WARNING,
    "connectivity"
  );

  logError(formattedError);

  if (dispatch) {
    // Assuming there's a SET_ERROR action in your reducer
    dispatch({
      type: "SET_ERROR",
      payload: getUserFriendlyMessage(formattedError),
    });

    // You might also want to update the app's online status
    dispatch({
      type: "SET_ONLINE_STATUS",
      payload: false,
    });
  }
};

// Default export for the enhanced service
const ErrorService = {
  formatError,
  logError,
  handleError,
  handleApiError,
  createErrorBoundaryFallback,
  handleOfflineError,
  ErrorSeverity,
  ErrorCategory,
  getUserFriendlyMessage,
};

export default ErrorService;
