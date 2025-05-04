/**
 * CORS Configuration
 * Centralizes CORS settings for both Express and Socket.IO
 */

const serverConfig = require("./serverConfig");
const logger = require("../utils/logger");

/**
 * Creates CORS configuration options
 * @returns {Object} CORS configuration object
 */
const createCorsConfig = () => {
  // Get allowed origins from server config
  const allowedOrigins = serverConfig.getAllowedOrigins();

  // Create CORS options object
  const corsOptions = {
    origin: function (origin, callback) {
      // Always allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Check if the origin is allowed
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        // Add current origin if not already in the allowed origins list
        if (
          origin &&
          !allowedOrigins.includes(origin) &&
          !allowedOrigins.includes("*")
        ) {
          logger.db.warn(`Adding current origin to allowed origins: ${origin}`);
          allowedOrigins.push(origin);
          callback(null, true);
        } else {
          logger.db.warn(`CORS blocked request from origin: ${origin}`);
          logger.db.warn(`Allowed origins are: ${allowedOrigins.join(", ")}`);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // Allow cookies for authentication if needed
    optionsSuccessStatus: 204,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-CSRF-Token",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // Cache preflight request results for 24 hours (in seconds)
  };

  // Log CORS configuration for debugging
  logger.app.info("CORS configuration initialized", {
    allowedOrigins,
    methods: corsOptions.methods,
    credentials: corsOptions.credentials,
  });

  return corsOptions;
};

module.exports = {
  createCorsConfig,
};
