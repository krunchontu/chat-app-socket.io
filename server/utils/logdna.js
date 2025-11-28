const { Logger } = require("@logdna/logger");
const os = require("os");

// Initialize LogDNA Logger
const initializeLogger = () => {
  // Return a dummy logger if no LogDNA key is provided
  if (!process.env.LOGDNA_KEY) {
    console.warn("LogDNA key not found. Falling back to console logging.");
    return {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  }

  // Create a real LogDNA logger with the new API
  const options = {
    app: "chat-app-backend",
    hostname: os.hostname(),
    indexMeta: true,
    tags: ["nodejs", "express", "socket.io", "chat-app"],
    env: process.env.NODE_ENV || "development",
  };

  const logger = new Logger(process.env.LOGDNA_KEY, options);

  // Enhance the logger with standard methods
  return {
    log: (message, meta = {}) => logger.log(message, { level: "INFO", meta }),
    info: (message, meta = {}) => logger.log(message, { level: "INFO", meta }),
    warn: (message, meta = {}) => logger.log(message, { level: "WARN", meta }),
    error: (message, meta = {}) =>
      logger.log(message, { level: "ERROR", meta }),
    debug: (message, meta = {}) =>
      logger.log(message, { level: "DEBUG", meta }),
  };
};

module.exports = initializeLogger();
