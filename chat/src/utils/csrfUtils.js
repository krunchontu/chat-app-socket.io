/**
 * CSRF protection utilities
 * Provides functions for managing CSRF tokens and protecting against CSRF attacks
 */

import axios from "axios";

// CSRF token storage key
const CSRF_TOKEN_KEY = "x-csrf-token";

/**
 * Get the current CSRF token from storage or fetch a new one if needed
 * @returns {Promise<string>} The CSRF token
 */
export const getCSRFToken = async () => {
  // Try to get existing token from localStorage
  let token = localStorage.getItem(CSRF_TOKEN_KEY);

  // If no token exists or it's expired, fetch a new one
  if (!token) {
    token = await fetchCSRFToken();
  }

  return token;
};

/**
 * Fetch a new CSRF token from the server
 * @returns {Promise<string>} The new CSRF token
 */
export const fetchCSRFToken = async () => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_SOCKET_ENDPOINT}/api/users/csrf-token`
    );

    const token = response.data.csrfToken;

    // Store token in localStorage
    if (token) {
      localStorage.setItem(CSRF_TOKEN_KEY, token);
    }

    return token;
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
    // Generate a fallback token client-side in case the server endpoint fails
    // This allows authentication to continue in degraded security mode
    const fallbackToken =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(CSRF_TOKEN_KEY, `fallback_${fallbackToken}`);
    return `fallback_${fallbackToken}`;
  }
};

/**
 * Clear the stored CSRF token
 */
export const clearCSRFToken = () => {
  localStorage.removeItem(CSRF_TOKEN_KEY);
};

/**
 * Configure axios to include CSRF tokens in all requests
 */
export const setupCSRFProtection = async () => {
  try {
    // Get initial token
    await getCSRFToken();

    // Add request interceptor to include token in all requests
    axios.interceptors.request.use(async (config) => {
      // Skip for GET requests as they don't modify state
      if (config.method.toLowerCase() === "get") {
        return config;
      }

      // Add CSRF token to non-GET requests
      const token = await getCSRFToken();
      if (token) {
        config.headers[CSRF_TOKEN_KEY] = token;
      }

      return config;
    });

    // Add response interceptor to handle token rotation
    axios.interceptors.response.use(
      (response) => {
        // Check if response includes a new CSRF token
        const newToken = response.headers[CSRF_TOKEN_KEY];
        if (newToken) {
          localStorage.setItem(CSRF_TOKEN_KEY, newToken);
        }
        return response;
      },
      (error) => {
        // If we get a 403 with CSRF error, try to get a new token and retry
        if (
          error.response?.status === 403 &&
          error.response?.data?.message?.includes("CSRF")
        ) {
          clearCSRFToken();
        }
        return Promise.reject(error);
      }
    );
  } catch (error) {
    console.warn(
      "CSRF protection setup failed, continuing with degraded security:",
      error
    );
    // Don't block authentication flow if CSRF setup fails
  }
};
