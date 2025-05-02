import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';

/**
 * Connection Status Indicator
 * Provides visual feedback to users about their real-time connection status
 * Shows when messages are being synced after reconnection
 */
const ConnectionStatusIndicator = () => {
  const { isConnected, isOnline } = useChat();
  const [syncingMessages, setSyncingMessages] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  
  // Show sync status briefly after reconnection
  useEffect(() => {
    if (isConnected && isOnline) {
      // When connection is established, show syncing indicator
      setSyncingMessages(true);
      
      // After a short delay, show sync complete and then fade out
      const syncTimer = setTimeout(() => {
        setSyncingMessages(false);
        setSyncComplete(true);
        
        // Clear the "sync complete" message after 3 seconds
        const completeTimer = setTimeout(() => {
          setSyncComplete(false);
        }, 3000);
        
        return () => clearTimeout(completeTimer);
      }, 1500);
      
      return () => clearTimeout(syncTimer);
    }
    
    // Reset states when disconnected
    setSyncingMessages(false);
    setSyncComplete(false);
  }, [isConnected, isOnline]);
  
  // Always render the component, but conditionally show the UI
  // This ensures it stays mounted and can properly track state changes
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span>You are offline. Messages will be sent when you reconnect.</span>
        </div>
      )}
      
      {isOnline && !isConnected && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span>Connecting to chat server...</span>
        </div>
      )}
      
      {isConnected && syncingMessages && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span>Syncing messages...</span>
        </div>
      )}
      
      {isConnected && syncComplete && (
        <div className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2 animate-fadeOut">
          <div className="w-3 h-3 bg-white rounded-full"></div>
          <span>Connected and synced!</span>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
