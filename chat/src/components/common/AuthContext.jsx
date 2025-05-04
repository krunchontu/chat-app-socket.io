/**
 * AuthContext - Authentication context provider for the application
 * 
 * Provides authentication state and methods for login, registration, and logout.
 * Uses centralized auth, storage, and API services for better separation of concerns.
 */
import React, { createContext, useContext, useEffect, useReducer } from "react";
import ErrorService, { ErrorCategory } from "../../services/ErrorService";
import authService from "../../services/authService";
import { createComponentLogger } from "../../utils/logger";

// Create a logger for this component
const logger = createComponentLogger("AuthContext");

/**
 * Auth Context - Provides authentication state and methods to all components
 */
const AuthContext = createContext();

// Auth state reducer actions
const AUTH_ACTIONS = {
  SET_USER: "SET_USER",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  LOGOUT: "LOGOUT",
};

// Initial auth state
const initialState = {
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
};

/**
 * Auth reducer for managing authentication state
 */
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        error: null,
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        error: null,
      };
    default:
      return state;
  }
};

/**
 * Auth Provider Component - Manages authentication state and provides auth methods
 */
export const AuthProvider = ({ children }) => {
  // Use reducer for more organized state management
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Log initialization
  useEffect(() => {
    logger.info("AuthProvider initialized", {
      environment: process.env.NODE_ENV,
      apiUrl: process.env.REACT_APP_API_URL,
      socketUrl: process.env.REACT_APP_SOCKET_URL,
    });
  }, []);
  
  // Initialize auth state from storage on app load
  useEffect(() => {
    const initAuth = () => {
      try {
        // Initialize auth state from storage
        const userData = authService.initializeAuth();
        
        // Update state based on initialization result
        if (userData) {
          dispatch({ type: AUTH_ACTIONS.SET_USER, payload: userData });
        }
      } catch (error) {
        logger.error("Error initializing auth", { error: error.message });
        ErrorService.handleError(
          error,
          ErrorCategory.AUTHENTICATION,
          ErrorService.ErrorSeverity.ERROR,
          "auth-init"
        );
      } finally {
        // Set loading to false regardless of outcome
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };
    
    initAuth();
  }, []);
  
  // Periodically check token validity
  useEffect(() => {
    if (!state.user) return;
    
    const checkInterval = setInterval(() => {
      const validation = authService.validateAuthentication();
      
      if (!validation.isValid) {
        // Token is invalid, notify user and redirect to login
        ErrorService.handleError(
          new Error("Your session has expired"),
          ErrorCategory.AUTHENTICATION,
          ErrorService.ErrorSeverity.WARNING,
          "auth-token-expired",
          { showToast: true }
        );
        
        // Clear auth state
        authService.clearAuth();
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }, 1000);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [state.user]);
  
  /**
   * Authenticates a user
   *
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Object} Result with success status and error message if applicable
   */
  const login = async (username, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      
      const result = await authService.login(username, password);
      
      if (result.success) {
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: result.user });
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.message });
      }
      
      return result;
    } catch (error) {
      logger.error("Login error", { error: error.message });
      
      const errorMessage = ErrorService.handleApiError(error, "auth-login");
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      
      return { success: false, message: errorMessage };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };
  
  /**
   * Registers a new user
   *
   * @param {Object} userData - User registration data
   * @returns {Object} Result with success status and error message if applicable
   */
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      
      const result = await authService.register(userData);
      
      if (result.success) {
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: result.user });
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.message });
      }
      
      return result;
    } catch (error) {
      logger.error("Registration error", { error: error.message });
      
      const errorMessage = ErrorService.handleApiError(error, "auth-register");
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      
      return { success: false, message: errorMessage };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };
  
  /**
   * Logs out the current user
   * 
   * @returns {Object} Result with success status
   */
  const logout = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      await authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      return { success: true };
    } catch (error) {
      logger.error("Logout error", { error: error.message });
      
      // Even if the server call fails, we want to clear local state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      return { success: true };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };
  
  // Prepare the context value with all authentication state and methods
  const contextValue = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook for accessing the auth context
 * 
 * @returns {Object} Auth context value
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};
