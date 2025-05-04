import { createLogger } from "./logger";

const logger = createLogger("socketConfigUtils");

/**
 * Determines the appropriate Socket.IO endpoint based on environment and hostname
 * @returns {string} Configured endpoint URL
 */
export const determineSocketEndpoint = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const hostname = window.location.hostname;

  // Determine the backend host with improved logic
  let backendHost;
  if (hostname.includes("chat-app-frontend")) {
    backendHost = hostname.replace("frontend", "backend");
  } else if (hostname === "localhost" || hostname === "127.0.0.1") {
    backendHost = "localhost:4500";
  } else {
    backendHost = hostname;
  }

  // Use environment variable for socket URL across all environments
  const SOCKET_URL =
    process.env.REACT_APP_SOCKET_URL ||
    (isProduction ? `https://${backendHost}` : `http://${backendHost}`);

  // Force HTTPS in production for security
  const secureSocketUrl =
    isProduction &&
    !SOCKET_URL.startsWith("https://") &&
    !SOCKET_URL.startsWith("/")
      ? SOCKET_URL.replace("http://", "https://")
      : SOCKET_URL;

  // Final socket endpoint with proper HTTP URL
  const httpUrl = secureSocketUrl.startsWith("/")
    ? window.location.origin + secureSocketUrl
    : secureSocketUrl;

  // Final socket endpoint
  const ENDPOINT = process.env.REACT_APP_SOCKET_URL || httpUrl;

  logger.info("Socket endpoint configuration:", {
    endpoint: ENDPOINT,
    secureEndpoint: secureSocketUrl,
    isProduction,
    hostname: window.location.hostname,
    backendHost,
    env: process.env.NODE_ENV,
    socketUrl: process.env.REACT_APP_SOCKET_URL,
    protocol: window.location.protocol,
  });

  return ENDPOINT;
};
