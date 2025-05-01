import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from './common/AuthContext';

/**
 * A status bar that displays socket connection status
 * and allows reconnection when disconnected
 */
const SocketStatusBar = () => {
  const { isConnected, connectionError: error, socket, dispatch } = useChat();
  const { isAuthenticated, logout } = useAuth();
  const [showReconnectButton, setShowReconnectButton] = useState(false);
  
  // This tracks the current socket connection status

  useEffect(() => {
    // If disconnected for more than 5 seconds, show reconnect button
    let timer;
    if (!isConnected && isAuthenticated) {
      timer = setTimeout(() => {
        setShowReconnectButton(true);
      }, 5000);
    } else {
      setShowReconnectButton(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isConnected, isAuthenticated]);

  // Handle manual reconnection
  const handleReconnect = () => {
    console.log("Manual reconnect attempt initiated");
    
    if (socket) {
      try {
        // Get a fresh token
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token available for reconnection");
          handleLogout();
          return;
        }
        
        // Force disconnect first
        socket.disconnect();
        
        // Clear the socket from state
        dispatch({ type: "SET_SOCKET", payload: null });
        
        // Force page refresh to cleanly establish connections
        console.log("Forcing page refresh to re-establish connection");
        window.location.reload();
      } catch (error) {
        console.error("Error during manual reconnection:", error);
        // If reconnection fails, refresh the page as fallback
        window.location.reload();
      }
    } else {
      // If no socket at all, refresh the page
      window.location.reload();
    }
  };

  // Handle logout due to auth error
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  // Check if error is auth-related
  const isAuthError = error && (
    error.includes("Authentication") ||
    error.includes("auth") || 
    error.includes("token") ||
    error.includes("login")
  );
  
  // Don't render anything if connected
  if (isConnected && !error) return null;
  
  return (
    <div className={`fixed top-0 left-0 right-0 p-2 z-50 ${isAuthError ? 'bg-red-600' : 'bg-yellow-500'} text-white text-center flex items-center justify-center`}>
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
        <span>
          {isAuthError ? 'Authentication error. Please log in again.' : 
            error || 'Disconnected from server'}
        </span>
      </div>
      
      <div className="ml-4 flex space-x-2">
        {isAuthError ? (
          <button
            onClick={handleLogout}
            className="bg-white text-red-600 hover:bg-red-100 px-3 py-1 rounded text-sm font-medium"
          >
            Log in again
          </button>
        ) : showReconnectButton ? (
          <button
            onClick={handleReconnect}
            className="bg-white text-yellow-700 hover:bg-yellow-100 px-3 py-1 rounded text-sm font-medium"
          >
            Reconnect
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SocketStatusBar;
