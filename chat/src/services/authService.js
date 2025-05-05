/**
 * Auth Service - Centralized authentication service
 *
 * This service provides methods for user authentication operations
 * with proper error handling, token management, and storage.
 */

import apiService from "./apiService";
import storageService from "./storageService";
import { setupCSRFProtection, clearCSRFToken } from "../utils/csrfUtils";
import { validateToken } from "../utils/jwtUtils";
import { logApiUrlConfiguration } from "../utils/urlUtils";
import ErrorService, { ErrorCategory } from "./ErrorService";
import { createServiceLogger } from "../utils/logger";

// Create a logger for the auth service
const logger = createServiceLogger("authService");

// Authentication endpoints
const ENDPOINTS = {
  LOGIN: "/api/users/login",
  REGISTER: "/api/users/register",
  LOGOUT: "/api/users/logout",
  REFRESH_TOKEN: "/api/users/refresh-token",
  USER_PROFILE: "/api/users/profile",
};

/**
 * Sets up authentication from storage (for app initialization)
 *
 * @returns {Object|null} User data if authenticated, null otherwise
 */
export const initializeAuth = () => {
  const token = storageService.getAuthToken();
  const userData = storageService.getAuthUser();

  if (token && userData) {
    // Validate the token
    const validation = validateToken(token);
    if (validation.isValid) {
      // Set up axios auth header
      apiService.setupAxiosAuth(token);

      // Set up CSRF protection
      setupCSRFProtection().catch((err) => {
        logger.warn("Failed to set up CSRF protection during initialization", {
          error: err.message,
        });
      });

      return userData;
    } else {
      // Token is invalid, clear auth data
      logger.warn("Invalid token found during initialization", {
        reason: validation.reason,
      });
      clearAuth();
    }
  }

  return null;
};

/**
 * Logs in a user with username and password
 *
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<Object>} Result with success status and user data
 */
export const login = async (username, password) => {
  try {
    // Log API URL configuration for debugging
    logApiUrlConfiguration("login", ENDPOINTS.LOGIN);

    // Make the login request
    const response = await apiService.post(
      ENDPOINTS.LOGIN,
      { username, password },
      {
        context: "auth-login",
        logApiConfig: true,
      }
    );

    const { token, id, username: userName } = response;

    if (!token) {
      throw new Error("Authentication failed: No token received from server");
    }

    // Save auth data
    storageService.setAuthData({ id, username: userName }, token);

    // Set up axios auth header
    apiService.setupAxiosAuth(token);

    // Log successful login
    ErrorService.logError(
      ErrorService.formatError(
        `User ${userName} logged in successfully`,
        ErrorCategory.AUTHENTICATION,
        ErrorService.ErrorSeverity.INFO,
        "auth-login"
      )
    );

    // Set up CSRF protection
    try {
      await setupCSRFProtection();
    } catch (csrfError) {
      // Log but don't fail login if CSRF setup fails
      logger.warn("CSRF protection setup failed during login", {
        error: csrfError.message,
      });
      ErrorService.logError(
        ErrorService.formatError(
          "CSRF protection setup failed, continuing with degraded security",
          ErrorCategory.SECURITY,
          ErrorService.ErrorSeverity.WARNING,
          "auth-csrf-setup"
        )
      );
    }

    return { success: true, user: { id, username: userName } };
  } catch (error) {
    // Log detailed error
    logger.error("Login failed", {
      error: error.message,
      username,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Use error service to handle authentication errors
    const errorMessage = ErrorService.handleApiError(error, "auth-login");

    // Clear any partial login data
    clearAuth();

    return {
      success: false,
      message: error.response?.data?.message || errorMessage,
    };
  }
};

/**
 * Registers a new user
 *
 * @param {Object} userData - User registration data
 * @param {string} userData.username - User's chosen username
 * @param {string} userData.password - User's chosen password
 * @param {string} [userData.email] - Optional user email
 * @returns {Promise<Object>} Result with success status and user data
 */
export const register = async (userData) => {
  try {
    // Log API URL configuration for debugging
    logApiUrlConfiguration("register", ENDPOINTS.REGISTER);

    // Make the registration request
    const response = await apiService.post(ENDPOINTS.REGISTER, userData, {
      context: "auth-register",
      logApiConfig: true,
    });

    const { token, id, username } = response;

    if (!token) {
      throw new Error("Registration failed: No token received from server");
    }

    // Save auth data
    storageService.setAuthData({ id, username }, token);

    // Set up axios auth header
    apiService.setupAxiosAuth(token);

    // Log successful registration
    ErrorService.logError(
      ErrorService.formatError(
        `User ${username} registered successfully`,
        ErrorCategory.AUTHENTICATION,
        ErrorService.ErrorSeverity.INFO,
        "auth-register"
      )
    );

    // Set up CSRF protection
    try {
      await setupCSRFProtection();
    } catch (csrfError) {
      // Log but don't fail registration if CSRF setup fails
      logger.warn("CSRF protection setup failed during registration", {
        error: csrfError.message,
      });
    }

    return { success: true, user: { id, username } };
  } catch (error) {
    // Log detailed error
    logger.error("Registration failed", {
      error: error.message,
      userData: { username: userData.username },
      response: error.response?.data,
      status: error.response?.status,
    });

    // Use error service to handle registration errors
    const errorMessage = ErrorService.handleApiError(error, "auth-register");

    return {
      success: false,
      message: error.response?.data?.message || errorMessage,
    };
  }
};

/**
 * Logs out the current user
 *
 * @returns {Promise<Object>} Result with success status
 */
export const logout = async () => {
  try {
    const userData = storageService.getAuthUser();

    // Call logout endpoint if user exists
    if (userData) {
      // Log API URL configuration for debugging
      logApiUrlConfiguration("logout", ENDPOINTS.LOGOUT);

      // Make the logout request
      await apiService.post(
        ENDPOINTS.LOGOUT,
        {},
        {
          context: "auth-logout",
          logApiConfig: true,
        }
      );

      // Log successful logout
      ErrorService.logError(
        ErrorService.formatError(
          `User ${userData.username} logged out successfully`,
          ErrorCategory.AUTHENTICATION,
          ErrorService.ErrorSeverity.INFO,
          "auth-logout"
        )
      );
    }

    // Always clear auth data, even if the server request fails
    clearAuth();

    return { success: true };
  } catch (error) {
    // Log error
    logger.error("Logout error", {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Log the error but continue with logout
    ErrorService.handleApiError(error, "auth-logout");

    // Even if the server call fails, we still want to clear local state
    clearAuth();

    return { success: true };
  }
};

/**
 * Validates the current authentication token
 *
 * @param {number} thresholdMinutes - Minutes threshold before expiration
 * @returns {Object} Validation result with isValid flag
 */
export const validateAuthentication = (thresholdMinutes = 5) => {
  const token = storageService.getAuthToken();
  return validateToken(token, thresholdMinutes);
};

/**
 * Clears all authentication data
 */
export const clearAuth = () => {
  // Clear storage
  storageService.clearAuthData();

  // Clear CSRF token
  clearCSRFToken();

  // Clear axios auth header
  apiService.setupAxiosAuth(null);
};

const authService = {
  initializeAuth,
  login,
  register,
  logout,
  validateAuthentication,
  clearAuth,
};

export default authService;
