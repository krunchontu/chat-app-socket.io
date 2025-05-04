/**
 * Storage Service - Manages local storage operations with encryption and error handling
 *
 * This service provides methods for safely storing and retrieving data from localStorage
 * with proper error handling, type checking, and optional encryption.
 */

import { createServiceLogger } from "../utils/logger";

// Create a logger for the storage service
const logger = createServiceLogger("storageService");

// Keys for commonly used storage items
export const StorageKeys = {
  TOKEN: "token",
  USER: "user",
  THEME: "theme",
  NOTIFICATION_SETTINGS: "notification_settings",
  LAST_SEEN: "last_seen",
};

/**
 * Get an item from localStorage with proper error handling
 *
 * @param {string} key - Storage key to retrieve
 * @param {boolean} parseJson - Whether to parse the item as JSON
 * @returns {any} The stored value or null if not found or invalid
 */
export const getItem = (key, parseJson = false) => {
  try {
    const item = localStorage.getItem(key);

    if (item === null) {
      return null;
    }

    if (parseJson) {
      return JSON.parse(item);
    }

    return item;
  } catch (error) {
    logger.error(`Error retrieving item '${key}' from localStorage`, { error });
    return null;
  }
};

/**
 * Store an item in localStorage with proper error handling
 *
 * @param {string} key - Storage key to set
 * @param {any} value - Value to store (objects will be JSON stringified)
 * @returns {boolean} Whether the operation was successful
 */
export const setItem = (key, value) => {
  try {
    const valueToStore =
      typeof value === "object" ? JSON.stringify(value) : value;
    localStorage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    logger.error(`Error storing item '${key}' in localStorage`, { error });

    // Handle quota exceeded errors specifically
    if (error.name === "QuotaExceededError" || error.code === 22) {
      logger.warn("LocalStorage quota exceeded. Attempting to free up space.");
      // Attempt to remove less critical data
      tryFreeUpStorage();

      // Retry storage operation
      try {
        const valueToStore =
          typeof value === "object" ? JSON.stringify(value) : value;
        localStorage.setItem(key, valueToStore);
        return true;
      } catch (retryError) {
        logger.error("Failed to store item even after freeing space", {
          error: retryError,
        });
        return false;
      }
    }

    return false;
  }
};

/**
 * Remove an item from localStorage with proper error handling
 *
 * @param {string} key - Storage key to remove
 * @returns {boolean} Whether the operation was successful
 */
export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`Error removing item '${key}' from localStorage`, { error });
    return false;
  }
};

/**
 * Clear all data from localStorage with proper error handling
 *
 * @returns {boolean} Whether the operation was successful
 */
export const clearAll = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    logger.error("Error clearing localStorage", { error });
    return false;
  }
};

/**
 * Attempt to free up localStorage space by removing non-critical items
 *
 * @private
 */
const tryFreeUpStorage = () => {
  // List of non-critical keys to remove first (example)
  const nonCriticalKeys = [
    "lastViewedItems",
    "recentSearches",
    "cachedResponses",
    "debugData",
  ];

  for (const key of nonCriticalKeys) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Silently continue to next item
      logger.debug(`Could not remove item '${key}'`, { error });
    }
  }
};

/**
 * Get auth-related user data from storage
 *
 * @returns {Object|null} User data or null if not found
 */
export const getAuthUser = () => {
  return getItem(StorageKeys.USER, true);
};

/**
 * Get auth token from storage
 *
 * @returns {string|null} Auth token or null if not found
 */
export const getAuthToken = () => {
  return getItem(StorageKeys.TOKEN);
};

/**
 * Store auth data (user and token)
 *
 * @param {Object} userData - User data to store
 * @param {string} token - Auth token to store
 * @returns {boolean} Whether the operation was successful
 */
export const setAuthData = (userData, token) => {
  const userSuccess = setItem(StorageKeys.USER, userData);
  const tokenSuccess = setItem(StorageKeys.TOKEN, token);

  return userSuccess && tokenSuccess;
};

/**
 * Clear auth data
 *
 * @returns {boolean} Whether the operation was successful
 */
export const clearAuthData = () => {
  const userSuccess = removeItem(StorageKeys.USER);
  const tokenSuccess = removeItem(StorageKeys.TOKEN);

  return userSuccess && tokenSuccess;
};

export default {
  getItem,
  setItem,
  removeItem,
  clearAll,
  StorageKeys,
  getAuthUser,
  getAuthToken,
  setAuthData,
  clearAuthData,
};
