import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// A wrapper for <Route> that redirects to the login screen
// if user isn't authenticated
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading spinner or placeholder while checking auth status
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
