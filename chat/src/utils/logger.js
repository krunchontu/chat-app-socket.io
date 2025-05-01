/**
 * Enhanced logging utility for client-side logging
 * Provides structured, consistent logging with levels, context, and correlation IDs
 */

// Constants
export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};

// Enable debug mode in development or with localStorage flag
const isDebugMode = () =>
  process.env.NODE_ENV === "development" ||
  localStorage.getItem("debug_mode") === "true";

/**
 * Create a logger with a specific context
 * @param {string} context - Module or component name for context
 * @returns {Object} Logger object with methods for each log level
 */
export const createLogger = (context) => {
  const log = (level, message, data = {}, options = {}) => {
    // Skip debug logs in production unless debug mode is enabled
    if (level === LogLevel.DEBUG && !isDebugMode()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const { correlationId, skipConsole = false } = options;

    // Create structured log entry
    const logEntry = {
      timestamp,
      level,
      context,
      message,
      data,
      correlationId: correlationId || null,
    };

    // Output to console with appropriate styling
    if (!skipConsole) {
      const styles = getLogStyles(level);

      console.group(
        `%c${level.toUpperCase()} | ${context} | ${timestamp}`,
        styles.header
      );
      console.log("%cMessage:", styles.label, message);

      if (correlationId) {
        console.log("%cCorrelation ID:", styles.label, correlationId);
      }

      if (Object.keys(data).length > 0) {
        console.log("%cData:", styles.label, data);
      }

      console.groupEnd();
    }

    // Send to server or analytics in production
    if (process.env.NODE_ENV === "production" && level !== LogLevel.DEBUG) {
      // This could send logs to a server endpoint or analytics service
      // sendLogToServer(logEntry);
    }

    return logEntry;
  };

  // Style configurations for console logs
  const getLogStyles = (level) => {
    const commonStyles =
      "font-weight: bold; padding: 2px 5px; border-radius: 2px;";
    const headerStyles = {
      [LogLevel.DEBUG]: `${commonStyles} background-color: #8A8A8A; color: white;`,
      [LogLevel.INFO]: `${commonStyles} background-color: #2196F3; color: white;`,
      [LogLevel.WARN]: `${commonStyles} background-color: #FF9800; color: black;`,
      [LogLevel.ERROR]: `${commonStyles} background-color: #F44336; color: white;`,
    };

    return {
      header: headerStyles[level] || headerStyles[LogLevel.INFO],
      label: "font-weight: bold; color: #555;",
    };
  };

  // Create a logger instance with methods for each log level
  return {
    debug: (message, data, options) =>
      log(LogLevel.DEBUG, message, data, options),
    info: (message, data, options) =>
      log(LogLevel.INFO, message, data, options),
    warn: (message, data, options) =>
      log(LogLevel.WARN, message, data, options),
    error: (message, data, options) =>
      log(LogLevel.ERROR, message, data, options),

    // Group-related functions for organizing related logs
    group: (label) => {
      if (isDebugMode()) {
        console.group(label);
      }
    },

    groupEnd: () => {
      if (isDebugMode()) {
        console.groupEnd();
      }
    },

    // Create a child logger with a subcontext
    createChild: (subContext) => createLogger(`${context}:${subContext}`),
  };
};

// Create a default root logger
export const logger = createLogger("app");

// Convenience method to create loggers for components
export const createComponentLogger = (componentName) =>
  createLogger(`component:${componentName}`);

// Convenience method to create loggers for hooks
export const createHookLogger = (hookName) => createLogger(`hook:${hookName}`);

// Convenience method to create loggers for services
export const createServiceLogger = (serviceName) =>
  createLogger(`service:${serviceName}`);

// Convenience method to create loggers for utilities
export const createUtilLogger = (utilName) => createLogger(`util:${utilName}`);

export default logger;
