import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';

/**
 * Socket Debug Panel Component
 * Provides real-time debugging information for socket events and messages
 * Only displayed in development or when manually enabled
 */
const SocketDebugPanel = () => {
  const { 
    socket, 
    isConnected, 
    messages,
    emitEvent,
  } = useChat();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    socketId: null,
    lastEvent: null,
    messageCount: 0,
    errors: [],
    socketEvents: []
  });
  const eventListRef = useRef([]);
  
  // Track socket events
  useEffect(() => {
    if (!socket) return;
    
    // Update basic info
    setDebugInfo(prev => ({
      ...prev,
      socketId: socket.id || 'not connected'
    }));
    
    // Create event handlers with timestamp and tracking
    const trackEvent = (name) => (data) => {
      const timestamp = new Date().toISOString();
      const eventInfo = { name, timestamp, data };
      
      // Add to our event tracking list
      eventListRef.current = [
        eventInfo,
        ...eventListRef.current.slice(0, 19) // Keep last 20 events
      ];
      
      // Update the state with latest events
      setDebugInfo(prev => ({
        ...prev,
        lastEvent: { name, timestamp },
        socketEvents: eventListRef.current
      }));
    };
    
    // Set up our debug event listeners
    const trackers = [
      { name: 'connect', handler: trackEvent('connect') },
      { name: 'disconnect', handler: trackEvent('disconnect') },
      { name: 'reconnect', handler: trackEvent('reconnect') },
      { name: 'reconnect_attempt', handler: trackEvent('reconnect_attempt') },
      { name: 'connect_error', handler: trackEvent('connect_error') },
      { name: 'message', handler: trackEvent('message') },
      { name: 'sendMessage', handler: trackEvent('sendMessage') }
    ];
    
    // Register all event listeners
    trackers.forEach(tracker => {
      socket.on(tracker.name, tracker.handler);
    });
    
    // Clean up event listeners on unmount
    return () => {
      trackers.forEach(tracker => {
        socket.off(tracker.name, tracker.handler);
      });
    };
  }, [socket]);
  
  // Track message count updates
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      messageCount: messages.length
    }));
  }, [messages.length]);
  
  // Force refresh socket connection when button is clicked
  const handleForceReconnect = () => {
    if (!socket) return;
    
    // Add to event list
    const timestamp = new Date().toISOString();
    eventListRef.current = [
      { name: 'manual_reconnect', timestamp, data: null },
      ...eventListRef.current.slice(0, 19)
    ];
    
    // Disconnect and reconnect
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
    }, 500);
  };
  
  // Force a test message broadcast
  const handleSendTestMessage = () => {
    if (!emitEvent) return;
    
    emitEvent('message', {
      text: `Debug test message at ${new Date().toLocaleTimeString()}`,
      tempId: `debug-${Date.now()}`,
      isDebugMessage: true
    });
  };
  
  // Skip rendering in production unless specifically enabled
  if (process.env.NODE_ENV === 'production' && !localStorage.getItem('ENABLE_SOCKET_DEBUG')) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-lg border-t border-l border-gray-300 dark:border-gray-700">
      {/* Debug Panel Header */}
      <div 
        className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-900 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-mono text-sm">
          Socket Debug {isConnected ? '🟢' : '🔴'}
        </span>
        <span className="text-xs font-mono">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>
      
      {/* Collapsible Debug Content */}
      {isExpanded && (
        <div className="p-3 font-mono text-xs w-80 max-h-96 overflow-y-auto">
          <div className="mb-2">
            <div className="flex justify-between">
              <span>Socket ID:</span>
              <span className="font-bold">{debugInfo.socketId || 'Not connected'}</span>
            </div>
            <div className="flex justify-between">
              <span>Connected:</span>
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Messages:</span>
              <span>{debugInfo.messageCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Event:</span>
              <span>{debugInfo.lastEvent?.name || 'None'}</span>
            </div>
          </div>
          
          {/* Debug Actions */}
          <div className="flex space-x-2 my-2">
            <button 
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleForceReconnect}
            >
              Force Reconnect
            </button>
            <button 
              className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={handleSendTestMessage}
            >
              Send Test Message
            </button>
          </div>
          
          {/* Recent Events */}
          <div className="mt-3">
            <div className="text-sm font-bold mb-1">Recent Events:</div>
            <div className="max-h-40 overflow-y-auto">
              {debugInfo.socketEvents.map((event, i) => (
                <div key={i} className="text-xs mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">
                  <div className="flex justify-between">
                    <span className="font-bold">{event.name}</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {event.data && (
                    <div className="overflow-hidden text-gray-500 text-xs whitespace-nowrap overflow-ellipsis">
                      {typeof event.data === 'object' 
                        ? JSON.stringify(event.data).substring(0, 50) + '...'
                        : event.data.toString().substring(0, 50) + '...'}
                    </div>
                  )}
                </div>
              ))}
              {!debugInfo.socketEvents.length && (
                <div className="text-gray-500 italic">No events recorded yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocketDebugPanel;
