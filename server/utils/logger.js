/**
 * Enhanced structured logging utility for the server side
 * Provides consistent, structured logging with correlation IDs and context
 * Integrates with LogDNA in production for centralized logging
 */

const chalk = require("chalk");
const { v4: uuidv4 } = require("uuid");
const logdnaLogger = require("./logdna");

// Constants
const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== "production";

// Enable debug logging based on environment
const isDebugEnabled = isDevelopment || process.env.DEBUG_LOGGING === "true";

/**
 * Format a log entry for console output
 * @param {Object} entry - Log entry to format
 * @returns {string} Formatted log entry
 */
const formatLogEntry = (entry) => {
  const {
    timestamp,
    level,
    context,
    message,
    correlationId,
    userId,
    socketId,
  } = entry;

  // Base message with timestamp, level, and context
  let formatted = `${timestamp} [${level.toUpperCase()}] [${context}] ${message}`;

  // Add metadata if available
  const metadata = [];
  if (correlationId) metadata.push(`correlationId=${correlationId}`);
  if (userId) metadata.push(`userId=${userId}`);
  if (socketId) metadata.push(`socketId=${socketId}`);

  if (metadata.length > 0) {
    formatted += ` (${metadata.join(", ")})`;
  }

  return formatted;
};

/**
 * Color a log entry based on its level
 * @param {string} formattedEntry - Formatted log entry
 * @param {string} level - Log level
 * @returns {string} Colored log entry
 */
const colorizeEntry = (formattedEntry, level) => {
  switch (level) {
    case LogLevel.DEBUG:
      return chalk.gray(formattedEntry);
    case LogLevel.INFO:
      return chalk.blue(formattedEntry);
    case LogLevel.WARN:
      return chalk.yellow(formattedEntry);
    case LogLevel.ERROR:
      return chalk.red(formattedEntry);
    default:
      return formattedEntry;
  }
};

/**
 * Create a structured log entry
 * @param {string} level - Log level
 * @param {string} context - Logging context
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Structured log entry
 */
const createLogEntry = (level, context, message, data = {}, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const { correlationId = uuidv4(), userId, socketId } = metadata;

  return {
    timestamp,
    level,
    context,
    message,
    data,
    correlationId,
    userId,
    socketId,
  };
};

/**
 * Create a logger with a specific context
 * @param {string} context - Module or component name for context
 * @returns {Object} Logger object with methods for each log level
 */
const createLogger = (context) => {
  const log = (level, message, data = {}, metadata = {}) => {
    // Skip debug logs if not enabled
    if (level === LogLevel.DEBUG && !isDebugEnabled) {
      return;
    }

    // Create structured log entry
    const entry = createLogEntry(level, context, message, data, metadata);

    // Format and colorize for console
    const formattedEntry = formatLogEntry(entry);
    const colorizedEntry = colorizeEntry(formattedEntry, level);

    // Output to console
    console.log(colorizedEntry);

    // For error and warn levels, also log the data
    if (
      (level === LogLevel.ERROR || level === LogLevel.WARN) &&
      Object.keys(data).length > 0
    ) {
      if (data instanceof Error) {
        console.log(chalk.red(data.stack || data.message));
      } else {
        console.log(data);
      }
    }

    // Send to LogDNA in production
    if (!isDevelopment) {
      const logData = {
        context,
        ...metadata,
      };

      if (Object.keys(data).length > 0) {
        if (data instanceof Error) {
          logData.error = {
            message: data.message,
            stack: data.stack,
          };
        } else {
          logData.data = data;
        }
      }

      switch (level) {
        case LogLevel.DEBUG:
          logdnaLogger.debug(message, logData);
          break;
        case LogLevel.INFO:
          logdnaLogger.info(message, logData);
          break;
        case LogLevel.WARN:
          logdnaLogger.warn(message, logData);
          break;
        case LogLevel.ERROR:
          logdnaLogger.error(message, logData);
          break;
      }
    }

    return entry;
  };

  // Create a logger instance with methods for each log level
  return {
    debug: (message, data, metadata) =>
      log(LogLevel.DEBUG, message, data, metadata),
    info: (message, data, metadata) =>
      log(LogLevel.INFO, message, data, metadata),
    warn: (message, data, metadata) =>
      log(LogLevel.WARN, message, data, metadata),
    error: (message, data, metadata) =>
      log(LogLevel.ERROR, message, data, metadata),

    // Create a child logger with a subcontext
    createChild: (subContext) => createLogger(`${context}:${subContext}`),
  };
};

/**
 * Log a socket event
 * @param {string} eventName - Socket event name
 * @param {any} data - Event data
 * @param {Object} metadata - Additional metadata
 */
const logSocketEvent = (eventName, data, metadata = {}) => {
  const logger = createLogger("socket");
  logger.info(`Event: ${eventName}`, data, metadata);
};

/**
 * Log a socket connection event
 * @param {string} socketId - Socket ID
 * @param {string} userId - User ID
 * @param {string} username - Username
 */
const logSocketConnection = (socketId, userId, username) => {
  const logger = createLogger("socket");
  logger.info(`Connected: ${username}`, null, { socketId, userId });
};

/**
 * Log a socket disconnection event
 * @param {string} socketId - Socket ID
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {string} reason - Disconnection reason
 */
const logSocketDisconnection = (socketId, userId, username, reason) => {
  const logger = createLogger("socket");
  logger.info(`Disconnected: ${username}`, { reason }, { socketId, userId });
};

/**
 * Log a message operation
 * @param {string} operation - Operation type (create, update, delete)
 * @param {Object} message - Message object
 * @param {Object} metadata - Additional metadata
 */
const logMessageOperation = (operation, message, metadata = {}) => {
  const logger = createLogger("message");
  logger.info(`Operation: ${operation}`, message, metadata);
};

// Create default loggers for main components
const loggers = {
  app: createLogger("app"),
  api: createLogger("api"),
  socket: createLogger("socket"),
  db: createLogger("db"),
  auth: createLogger("auth"),
  message: createLogger("message"),
  system: createLogger("system"),
};

module.exports = {
  createLogger,
  logSocketEvent,
  logSocketConnection,
  logSocketDisconnection,
  logMessageOperation,
  ...loggers,
};
