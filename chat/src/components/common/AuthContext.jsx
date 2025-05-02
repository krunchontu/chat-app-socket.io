import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import ErrorService, { ErrorCategory } from "../../services/ErrorService";
import { setupCSRFProtection, clearCSRFToken } from "../../utils/csrfUtils";
import { createLogger } from "../../utils/logger";

const AuthContext = createContext();

/**
 * Decodes a JWT token to get its payload
 * @param {string} token - The JWT token
 * @returns {Object|null} The decoded token payload or null if invalid
 */
const decodeToken = (token) => {
  if (!token) return null;
  
  try {
    // Split the token and get the payload part
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    // Convert from base64url to regular base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode and parse to JSON
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

/**
 * Check if a token is expired or about to expire
 * @param {Object} decoded - Decoded token
 * @param {number} thresholdMinutes - Minutes threshold before expiration
 * @returns {boolean} True if token is expired or close to expiration
 */
const isTokenExpiring = (decoded, thresholdMinutes = 5) => {
  if (!decoded || !decoded.exp) return true;
  
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;
  const thresholdMs = thresholdMinutes * 60 * 1000;
  
  return timeUntilExpiration < thresholdMs;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // State used internally to track token validity
  const [, setTokenValid] = useState(true);
  const logger = createLogger("AuthContext");
  
  /**
   * Validates the current token
   * @returns {boolean} Whether the token is valid
   */
  const validateToken = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTokenValid(false);
      return false;
    }
    
    const decoded = decodeToken(token);
    if (!decoded) {
      logger.warn("Invalid token format detected");
      setTokenValid(false);
      return false;
    }
    
    if (isTokenExpiring(decoded)) {
      logger.warn("Token is expired or about to expire", { 
        exp: decoded.exp, 
        userId: decoded.id 
      });
      setTokenValid(false);
      return false;
    }
    
    setTokenValid(true);
    return true;
  }, [logger]);
  
  // Initialize auth state from localStorage on app load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (storedUser && token) {
      // Validate token before setting user
      const decoded = decodeToken(token);
      if (decoded && !isTokenExpiring(decoded)) {
        setUser(JSON.parse(storedUser));
        setTokenValid(true);
      } else {
        // Token is invalid or expired, clear auth state
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setTokenValid(false);
      }
    } else {
      setTokenValid(false);
    }
    
    setLoading(false);
  }, []);
  
  // Periodically check token validity
  useEffect(() => {
    if (!user) return;
    
    const checkInterval = setInterval(() => {
      if (!validateToken()) {
        // Token is invalid, notify user and redirect to login
        ErrorService.handleError(
          new Error("Your session has expired"),
          ErrorCategory.AUTHENTICATION,
          ErrorService.ErrorSeverity.WARNING,
          "auth-token-expired",
          { showToast: true }
        );
        
        // Clear auth state
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        
        // Redirect to login after a short delay
        setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }, 1000);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [user, validateToken]);
  
  // Configure axios to use the token and CSRF protection
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Set up CSRF protection for authenticated users
      setupCSRFProtection().catch(err => {
        console.error("Failed to set up CSRF protection:", err);
      });
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [user]);
  
  /**
   * Authenticates a user and stores their session
   *
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Object} Result with success status and error message if applicable
   */
  const login = async (username, password) => {
    try {
      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === "production";
      
      // Use environment variable for API URL across all environments
      const API_URL = process.env.REACT_APP_API_URL || 
        (isProduction ? "" : "http://localhost:4500");
      
      // Log the API URL being used
      console.log("Auth API URL:", { 
        url: `${API_URL}/api/users/login`, 
        isProduction, 
        hostname: window.location.hostname,
        env: process.env.NODE_ENV
      });
      
      const response = await axios.post(
        `${API_URL}/api/users/login`,
        { username, password }
      );
      
      const { token, id, username: userName } = response.data;
      
      if (!token) {
        throw new Error("Authentication failed: No token received from server");
      }
      
      // Save token and user in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ id, username: userName }));
      
      // Update state
      setUser({ id, username: userName });
      
      // Log successful login
      ErrorService.logError(
        ErrorService.formatError(
          `User ${userName} logged in successfully`,
          ErrorCategory.AUTHENTICATION,
          ErrorService.ErrorSeverity.INFO,
          "auth-login"
        )
      );
      
      try {
        // Set up CSRF protection with improved error handling
        await setupCSRFProtection();
      } catch (csrfError) {
        // Log but don't fail login if CSRF setup fails
        console.warn("CSRF protection setup failed:", csrfError);
        ErrorService.logError(
          ErrorService.formatError(
            "CSRF protection setup failed, continuing with degraded security",
            ErrorCategory.SECURITY,
            ErrorService.ErrorSeverity.WARNING,
            "auth-csrf-setup"
          )
        );
      }
      
      return { success: true };
    } catch (error) {
      // Use error service to handle authentication errors
      const errorMessage = ErrorService.handleApiError(error, "auth-login");
      
      // Clear any partial login data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      return {
        success: false,
        message: error.response?.data?.message || errorMessage
      };
    }
  };
  
  /**
   * Registers a new user and logs them in
   *
   * @param {Object} userData - User registration data
   * @param {string} userData.username - User's chosen username
   * @param {string} userData.password - User's chosen password
   * @param {string} [userData.email] - User's email (optional)
   * @returns {Object} Result with success status and error message if applicable
   */
  const register = async (userData) => {
    try {
      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === "production";
      
      // Use environment variable for API URL across all environments
      const API_URL = process.env.REACT_APP_API_URL || 
        (isProduction ? "" : "http://localhost:4500");
      
      // Log the API URL being used
      console.log("Auth API URL:", { 
        url: `${API_URL}/api/users/register`, 
        isProduction, 
        hostname: window.location.hostname,
        env: process.env.NODE_ENV
      });
      
      const response = await axios.post(
        `${API_URL}/api/users/register`,
        userData
      );
      
      const { token, id, username } = response.data;
      
      // Save token and user in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ id, username }));
      
      // Update state
      setUser({ id, username });
      
      // Log successful registration
      ErrorService.logError(
        ErrorService.formatError(
          `User ${username} registered successfully`,
          ErrorCategory.AUTHENTICATION,
          ErrorService.ErrorSeverity.INFO,
          "auth-register"
        )
      );
      
      return { success: true };
    } catch (error) {
      // Use error service to handle registration errors
      const errorMessage = ErrorService.handleApiError(error, "auth-register");
      
      return {
        success: false,
        message: error.response?.data?.message || errorMessage
      };
    }
  };
  
  /**
   * Logs out the current user, clearing their session
   * 
   * @returns {Object} Result with success status
   */
  const logout = async () => {
    try {
      // Call logout endpoint if needed
      if (user) {
        // Check if we're in production environment
        const isProduction = process.env.NODE_ENV === "production";
        
        // Use environment variable for API URL across all environments
        const API_URL = process.env.REACT_APP_API_URL || 
          (isProduction ? "" : "http://localhost:4500");
          
        await axios.post(`${API_URL}/api/users/logout`);
        
        // Log successful logout
        ErrorService.logError(
          ErrorService.formatError(
            `User ${user.username} logged out successfully`,
            ErrorCategory.AUTHENTICATION,
            ErrorService.ErrorSeverity.INFO,
            "auth-logout"
          )
        );
      }
      
      // Clear localStorage and CSRF token
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      clearCSRFToken();
      
      // Update state
      setUser(null);
      
      return { success: true };
    } catch (error) {
      // Log the error but continue with logout
      ErrorService.handleApiError(error, "auth-logout");
      
      // Even if the server call fails, we still want to clear local state
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      clearCSRFToken();
      setUser(null);
      
      return { success: true };
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};
