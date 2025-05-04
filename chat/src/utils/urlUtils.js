/**
 * URL utility functions for constructing API and socket URLs
 * Provides consistent URL generation across the application
 */

/**
 * Constructs a backend API URL based on environment and host
 *
 * @param {boolean} forceSecure - Whether to force HTTPS in production
 * @returns {string} The complete API URL with protocol
 */
export const getApiUrl = (forceSecure = true) => {
  // Check if we're in production environment
  const isProduction = process.env.NODE_ENV === "production";

  // Get hostname and prepare for backend URL construction
  const hostname = window.location.hostname;

  // Determine the backend host with improved logic
  let backendHost;
  if (hostname.includes("chat-app-frontend")) {
    // For Render deployments: convert frontend URL to backend URL
    backendHost = hostname.replace("frontend", "backend");
  } else if (hostname === "localhost" || hostname === "127.0.0.1") {
    // For local development
    backendHost = "localhost:4500";
  } else {
    // For other deployments, assume backend is at same host
    backendHost = hostname;
  }

  // Use environment variable for API URL across all environments
  // With improved fallback logic for production environments
  const apiUrl =
    process.env.REACT_APP_API_URL ||
    (isProduction ? `https://${backendHost}` : `http://${backendHost}`);

  // Force HTTPS in production for security (unless explicitly set otherwise or is a relative URL)
  if (
    forceSecure &&
    isProduction &&
    !apiUrl.startsWith("https://") &&
    !apiUrl.startsWith("/")
  ) {
    return apiUrl.replace("http://", "https://");
  }

  return apiUrl;
};

/**
 * Constructs a socket server URL based on environment and host
 *
 * @param {boolean} forceSecure - Whether to force secure WebSocket in production
 * @returns {string} The complete socket URL with protocol
 */
export const getSocketUrl = (forceSecure = true) => {
  // First try to get from environment variable
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }

  // Otherwise construct based on API URL
  const apiUrl = getApiUrl(forceSecure);

  // Convert HTTP/HTTPS to WS/WSS
  if (apiUrl.startsWith("https://")) {
    return apiUrl.replace("https://", "wss://");
  } else if (apiUrl.startsWith("http://")) {
    return apiUrl.replace("http://", "ws://");
  }

  // If it's a relative URL, assume same protocol as current page
  return window.location.protocol === "https:"
    ? `wss://${window.location.host}${apiUrl}`
    : `ws://${window.location.host}${apiUrl}`;
};

/**
 * Gets the full URL for a specific API endpoint
 *
 * @param {string} endpoint - The API endpoint (e.g., "/api/users/login")
 * @param {boolean} forceSecure - Whether to force HTTPS in production
 * @returns {string} The complete endpoint URL
 */
export const getApiEndpointUrl = (endpoint, forceSecure = true) => {
  const baseUrl = getApiUrl(forceSecure);

  // Ensure there's no double slash between base URL and endpoint
  if (baseUrl.endsWith("/") && endpoint.startsWith("/")) {
    return `${baseUrl}${endpoint.substring(1)}`;
  } else if (!baseUrl.endsWith("/") && !endpoint.startsWith("/")) {
    return `${baseUrl}/${endpoint}`;
  }

  return `${baseUrl}${endpoint}`;
};

/**
 * Log detailed API URL configuration for debugging
 *
 * @param {string} operationName - Name of the operation being performed (e.g., "login")
 * @param {string} endpoint - API endpoint for the operation
 * @returns {Object} URL configuration details
 */
export const logApiUrlConfiguration = (operationName, endpoint) => {
  const apiUrl = getApiUrl();
  const fullUrl = getApiEndpointUrl(endpoint);

  // Extract environment variables
  const envVars = {};
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("REACT_APP_")) {
      envVars[key] = process.env[key];
    }
  });

  const config = {
    operation: operationName,
    raw_env_api_url: process.env.REACT_APP_API_URL,
    computed_api_url: apiUrl,
    endpoint,
    full_url: fullUrl,
    isProduction: process.env.NODE_ENV === "production",
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    env: process.env.NODE_ENV,
  };

  // Log to console
  console.group(`${operationName} API Request Configuration`);
  console.log("API URL Configuration:", config);
  console.groupEnd();

  return config;
};

export default {
  getApiUrl,
  getSocketUrl,
  getApiEndpointUrl,
  logApiUrlConfiguration,
};
