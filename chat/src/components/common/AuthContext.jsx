import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import ErrorService, { ErrorCategory } from "../../services/ErrorService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize auth state from localStorage on app load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);
  
  // Configure axios to use the token
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
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
      const response = await axios.post(
        `${process.env.REACT_APP_SOCKET_ENDPOINT}/api/users/login`,
        { username, password }
      );
      
      const { token, id, username: userName } = response.data;
      
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
      
      return { success: true };
    } catch (error) {
      // Use error service to handle authentication errors
      const errorMessage = ErrorService.handleApiError(error, "auth-login");
      
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
      const response = await axios.post(
        `${process.env.REACT_APP_SOCKET_ENDPOINT}/api/users/register`,
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
        await axios.post(`${process.env.REACT_APP_SOCKET_ENDPOINT}/api/users/logout`);
        
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
      
      // Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Update state
      setUser(null);
      
      return { success: true };
    } catch (error) {
      // Log the error but continue with logout
      ErrorService.handleApiError(error, "auth-logout");
      
      // Even if the server call fails, we still want to clear local state
      localStorage.removeItem("token");
      localStorage.removeItem("user");
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
