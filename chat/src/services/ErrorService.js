/**
 * ErrorService - Centralized error handling service for the chat application
 *
 * This service provides methods for handling, formatting, and logging errors
 * with proper categorization and user-friendly messaging.
 */

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
  UNKNOWN: "unknown", // Uncategorized errors
};

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
 *
 * @param {Object} formattedError - Error formatted using formatError
 */
export const logError = (formattedError) => {
  const { message, category, severity, context, timestamp } = formattedError;

  const logPrefix = `[${timestamp}] [${severity.toUpperCase()}] [${category}]${
    context ? ` [${context}]` : ""
  }:`;

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

  // TODO: In a production environment, implement remote logging here
  // Example: sendToLogService(formattedError);
};

/**
 * Get a user-friendly error message based on error category and details
 *
 * @param {Object} formattedError - Error formatted using formatError
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyMessage = (formattedError) => {
  const { category, message } = formattedError;

  // Return appropriate user-friendly messages based on error category
  switch (category) {
    case ErrorCategory.NETWORK:
      return "Network connection issue. Please check your internet connection and try again.";

    case ErrorCategory.AUTHENTICATION:
      return "Authentication error. Please log in again.";

    case ErrorCategory.VALIDATION:
      return (
        message || "Invalid input. Please check your information and try again."
      );

    case ErrorCategory.SOCKET:
      return "Connection to chat server lost. Attempting to reconnect...";

    // For database and unknown errors, provide a generic message to avoid exposing
    // sensitive information, but log the actual error for debugging
    case ErrorCategory.DATABASE:
    case ErrorCategory.UNKNOWN:
      return "Something went wrong. Please try again later.";

    // For UI errors, try to provide the specific message when possible
    case ErrorCategory.UI:
      return message || "There was a problem displaying this content.";

    default:
      return "An unexpected error occurred. Please try again.";
  }
};

/**
 * Handle an error by formatting, logging, and returning a user-friendly message
 *
 * @param {Error|Object|string} error - The error to handle
 * @param {string} category - The error category (from ErrorCategory)
 * @param {string} severity - The error severity (from ErrorSeverity)
 * @param {string} context - Additional context about where the error occurred
 * @returns {string} User-friendly error message
 */
export const handleError = (
  error,
  category = ErrorCategory.UNKNOWN,
  severity = ErrorSeverity.ERROR,
  context = ""
) => {
  const formattedError = formatError(error, category, severity, context);

  // Log all errors
  logError(formattedError);

  // Return user-friendly message
  return getUserFriendlyMessage(formattedError);
};

/**
 * Specific error handler for API request errors
 *
 * @param {Error} error - The error from API call (typically from axios)
 * @param {string} context - Operation context (e.g. 'login', 'fetchMessages')
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error, context = "") => {
  // Determine error category based on status code
  let category = ErrorCategory.NETWORK;
  let severity = ErrorSeverity.ERROR;

  if (error.response) {
    // Request made and server responded with error status
    const { status } = error.response;

    if (status === 401 || status === 403) {
      category = ErrorCategory.AUTHENTICATION;
    } else if (status === 400 || status === 422) {
      category = ErrorCategory.VALIDATION;
      // Validation errors are typically less severe
      severity = ErrorSeverity.WARNING;
    } else if (status >= 500) {
      // Server errors could be database issues
      category = ErrorCategory.DATABASE;
    }
  } else if (error.request) {
    // Request made but no response received
    category = ErrorCategory.NETWORK;
    // Network errors prevent functionality but might be temporary
    severity = ErrorSeverity.ERROR;
  }

  return handleError(error, category, severity, context);
};

/**
 * Create an error boundary fallback renderer
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
    logError(formattedError);

    // Return a user-friendly error UI
    return (
      <div role="alert" className="error-boundary-fallback">
        <h3>Something went wrong</h3>
        <p>{getUserFriendlyMessage(formattedError)}</p>
        <button onClick={resetErrorBoundary} className="error-reset-btn">
          Try Again
        </button>
      </div>
    );
  };
};

// Default export for the service
const ErrorService = {
  formatError,
  logError,
  handleError,
  handleApiError,
  createErrorBoundaryFallback,
  ErrorSeverity,
  ErrorCategory,
};

export default ErrorService;
