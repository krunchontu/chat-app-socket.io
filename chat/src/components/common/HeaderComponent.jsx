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
    <header className="bg-primary text-white shadow-md px-4 py-3 transition-colors duration-300">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="text-xl font-bold">Dialoque</div>
          <div className="text-sm md:text-base" aria-live="polite">
            <span>Welcome, {user?.username || 'Guest'}!</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Connection status indicator with proper ARIA support */}
          <div className="hidden md:block">
            <span 
              className={`text-sm px-2 py-1 rounded-full ${
                isConnected 
                  ? "bg-success/20 text-success" 
                  : "bg-danger/20 text-danger"
              }`}
              role="status"
              aria-live="polite"
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          
          {/* Theme toggle switch */}
          <ThemeToggle />
          
          {/* Logout button with ARIA attributes for accessibility */}
          {showLogout && user && (
            <button 
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors duration-150 text-sm"
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
