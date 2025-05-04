/**
 * API Service - Centralized API call handling with error management and retries
 *
 * This service provides methods for making API calls with consistent error handling,
 * automatic retries for transient errors, and proper logging.
 */

import axios from "axios";
import { getApiEndpointUrl, logApiUrlConfiguration } from "../utils/urlUtils";
import ErrorService, { ErrorCategory } from "./ErrorService";
import { createServiceLogger } from "../utils/logger";

// Create a logger for the API service
const logger = createServiceLogger("apiService");

// Default config for API requests
const defaultConfig = {
  timeout: 10000, // 10 second timeout by default
  retries: 1, // Retry once by default
  retryDelay: 1000, // 1 second delay between retries
  withCredentials: true, // Send cookies with requests by default
};

/**
 * Sets up the axios instance with authentication token
 *
 * @param {string} token - The JWT token
 */
export const setupAxiosAuth = (token) => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

/**
 * Makes a GET request to the API
 *
 * @param {string} endpoint - API endpoint to call
 * @param {Object} config - Additional axios config
 * @returns {Promise<Object>} API response data
 */
export const get = async (endpoint, config = {}) => {
  return makeRequest({
    method: "GET",
    endpoint,
    ...config,
  });
};

/**
 * Makes a POST request to the API
 *
 * @param {string} endpoint - API endpoint to call
 * @param {Object} data - Data to send in the request body
 * @param {Object} config - Additional axios config
 * @returns {Promise<Object>} API response data
 */
export const post = async (endpoint, data = {}, config = {}) => {
  return makeRequest({
    method: "POST",
    endpoint,
    data,
    ...config,
  });
};

/**
 * Makes a PUT request to the API
 *
 * @param {string} endpoint - API endpoint to call
 * @param {Object} data - Data to send in the request body
 * @param {Object} config - Additional axios config
 * @returns {Promise<Object>} API response data
 */
export const put = async (endpoint, data = {}, config = {}) => {
  return makeRequest({
    method: "PUT",
    endpoint,
    data,
    ...config,
  });
};

/**
 * Makes a DELETE request to the API
 *
 * @param {string} endpoint - API endpoint to call
 * @param {Object} config - Additional axios config
 * @returns {Promise<Object>} API response data
 */
export const del = async (endpoint, config = {}) => {
  return makeRequest({
    method: "DELETE",
    endpoint,
    ...config,
  });
};

/**
 * Makes a PATCH request to the API
 *
 * @param {string} endpoint - API endpoint to call
 * @param {Object} data - Data to send in the request body
 * @param {Object} config - Additional axios config
 * @returns {Promise<Object>} API response data
 */
export const patch = async (endpoint, data = {}, config = {}) => {
  return makeRequest({
    method: "PATCH",
    endpoint,
    data,
    ...config,
  });
};

/**
 * Makes a request to the API with retry logic
 *
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {string} options.endpoint - API endpoint
 * @param {Object} options.data - Request data
 * @param {number} options.retries - Number of retries
 * @param {number} options.retryDelay - Delay between retries in ms
 * @param {string} options.context - Operation context for error handling
 * @param {boolean} options.showErrorToast - Whether to show error toast
 * @returns {Promise<Object>} API response data
 */
export const makeRequest = async (options) => {
  const {
    method = "GET",
    endpoint,
    data = {},
    retries = defaultConfig.retries,
    retryDelay = defaultConfig.retryDelay,
    context = "api-request",
    showErrorToast = true,
    logApiConfig = false,
    ...axiosConfig
  } = options;

  // Log API URL configuration if enabled
  if (logApiConfig) {
    logApiUrlConfiguration(context, endpoint);
  }

  // Get the full URL for the endpoint
  const url = getApiEndpointUrl(endpoint);

  // Merge with default config
  const config = {
    ...defaultConfig,
    ...axiosConfig,
    method,
    url,
  };

  // Add data to config if provided and not GET method
  if (data && method !== "GET") {
    config.data = data;
  }

  // For GET requests, convert data to params
  if (data && method === "GET") {
    config.params = data;
  }

  let attempt = 0;
  const maxAttempts = retries + 1;

  while (attempt < maxAttempts) {
    try {
      attempt++;

      // If this is a retry, log it
      if (attempt > 1) {
        logger.info(`Retry attempt ${attempt - 1} of ${retries}`, {
          endpoint,
          method,
        });
      }

      // Make the request
      const response = await axios(config);

      // Log successful request (debug level)
      logger.debug(`API call successful: ${method} ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
      });

      // Return just the data portion of the response
      return response.data;
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;

      // Log the error
      logger.error(`API call failed: ${method} ${endpoint}`, {
        attempt,
        maxAttempts,
        isLastAttempt,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // If this is the last attempt, handle and throw the error
      if (isLastAttempt) {
        // Handle API error using ErrorService
        if (showErrorToast) {
          ErrorService.handleApiError(error, context, { showToast: true });
        }

        // Special case for offline/network errors
        if (!navigator.onLine || !error.response) {
          throw new Error(
            "Network error: Please check your internet connection"
          );
        }

        // For other errors, throw with a clean message
        throw error;
      }

      // Not the last attempt, wait before retrying
      // Only retry for certain status codes or network errors
      const status = error.response?.status;

      // Only retry for 5xx errors, timeouts, and network errors
      if (
        !error.response || // Network error
        error.code === "ECONNABORTED" || // Timeout
        (status >= 500 && status < 600) // Server error
      ) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        // Continue to next attempt
      } else {
        // Don't retry for 4xx errors
        if (showErrorToast) {
          ErrorService.handleApiError(error, context, { showToast: true });
        }
        throw error;
      }
    }
  }
};

export default {
  get,
  post,
  put,
  patch,
  del,
  setupAxiosAuth,
  makeRequest,
};
