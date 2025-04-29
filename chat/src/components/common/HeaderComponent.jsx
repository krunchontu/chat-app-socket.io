import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ThemeToggle from './ThemeToggle';
import './HeaderComponent.css';

/**
 * Header component with user information, connection status, and logout functionality
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Connection status to display
 * @param {function} props.onLogout - Optional callback function to execute after logout
 * @param {boolean} props.showLogout - Whether to show the logout button (default: true)
 */
const HeaderComponent = ({ isConnected, onLogout, showLogout = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle logout action with confirmation and navigation
   */
  const handleLogout = async () => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to log out?')) {
      // Call the logout function from AuthContext
      const result = await logout();
      
      // Handle custom onLogout callback if provided
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      }
      
      // If logout was successful, navigate to login page
      if (result.success) {
        navigate('/login');
      }
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="app-logo">Chat App</div>
          <div className="user-welcome" aria-live="polite">
            <span>Welcome, {user?.username || 'Guest'}!</span>
          </div>
        </div>
        
        <div className="header-controls">
          {/* Connection status indicator with proper ARIA support */}
          <div className="connection-status">
            <span 
              className={isConnected ? "status-connected" : "status-disconnected"}
              role="status"
              aria-live="polite"
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          
          {/* Theme toggle switch */}
          <ThemeToggle className="header-theme-toggle" />
          
          {/* Logout button with ARIA attributes for accessibility */}
          {showLogout && user && (
            <button 
              className="logout-btn"
              onClick={handleLogout}
              aria-label="Log out from the application"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderComponent;
