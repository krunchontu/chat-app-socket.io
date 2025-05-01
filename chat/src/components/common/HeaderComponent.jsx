import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ThemeToggle from './ThemeToggle';

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
    <header className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg px-4 py-4 transition-all duration-300">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-5">
          <div className="text-2xl font-bold tracking-tight">Dialoque</div>
          <div className="text-sm md:text-base font-medium" aria-live="polite">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mr-2">
                <span aria-hidden="true">{user?.username ? user.username[0].toUpperCase() : 'G'}</span>
              </div>
              <span>{user?.username || 'Guest'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection status indicator with proper ARIA support */}
          <div className="hidden md:block">
            <span 
              className={`text-sm px-3 py-1.5 rounded-full ${
                isConnected 
                  ? "bg-success/20 text-white border border-success/30" 
                  : "bg-danger/20 text-white border border-danger/30"
              } flex items-center`}
              role="status"
              aria-live="polite"
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-success" : "bg-danger"} mr-2`}></span>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          
          {/* Theme toggle switch */}
          <ThemeToggle />
          
          {/* Logout button with ARIA attributes for accessibility */}
          {showLogout && user && (
            <button 
              className="flex items-center bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 
                       rounded-md transition-all duration-150 text-sm shadow-sm hover:shadow-md"
              onClick={handleLogout}
              aria-label="Log out from the application"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderComponent;
