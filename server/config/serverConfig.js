/**
 * Server Configuration
 * Centralizes all server-related configuration settings
 */

require("dotenv").config();

/**
 * Server configuration object
 */
const serverConfig = {
  // Server port configuration
  port: process.env.PORT || 4500,

  // Environment configuration
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  // Host configuration
  hostname:
    process.env.NODE_ENV === "production"
      ? process.env.HOST || "chat-app-backend-hgqg.onrender.com"
      : "localhost",

  // Protocol configuration
  httpProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  wsProtocol: process.env.NODE_ENV === "production" ? "wss" : "ws",

  // Other server settings
  clientOrigin:
    process.env.CLIENT_ORIGIN ||
    "http://localhost:3000,https://chat-app-frontend-hgqg.onrender.com,chat-app-frontend-hgqg.onrender.com",

  // Get the array of allowed origins
  getAllowedOrigins() {
    return this.clientOrigin.split(",");
  },
};

module.exports = serverConfig;
