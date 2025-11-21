import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "../components/common/AuthContext";
import useSocketConnection from "../hooks/useSocketConnection";
import useMessageState from "../hooks/useMessageState";
import useMessageOperations from "../hooks/useMessageOperations";
import useOnlineStatus from "../hooks/useOnlineStatus";
import useChatNotifications from "../hooks/useChatNotifications";
import useChatUiState from "../hooks/useChatUiState";
import useSocketEvents from "../hooks/useSocketEvents";
import { processQueue } from "../utils/offlineQueue";
import { createLogger } from "../utils/logger";
import ErrorService from "../services/ErrorService";
import { v4 as uuidv4 } from "uuid";

const logger = createLogger("ChatProvider");
const ChatContext = createContext();

// For tracing all events during debugging
const DEBUG_MESSAGE_TRACE_ENABLED = process.env.NODE_ENV === 'development';

export const ChatProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const isOnline = useOnlineStatus();
  
  // Track message processing for debugging
  const [debugState, setDebugState] = useState({
    lastEventTime: null,
    processedMessageIds: new Set(),
    missedMessages: []
  });
  
  // Use ref to remember original socket ID and track reconnections
  const socketInfoRef = useRef({
    originalId: null,
    reconnections: 0,
    lastReconnectTime: null,
    eventCounts: {
      message: 0,
      sendMessage: 0
    }
  });

  // --- Core Hooks ---
  const { socket, isConnected, connectionError, clearConnectionError } = useSocketConnection();
  const { messageState, dispatchMessages, fetchInitialMessages, loadMoreMessages, clearMessageError } = useMessageState();
  const { notificationState, dispatchNotifications, addSystemNotification } = useChatNotifications();
  const { uiState, dispatchUi, setReplyingTo, clearReplyingTo } = useChatUiState();
  
  // Initialize the socketEvents hook for more robust event handling
  const { registerEvent, emitEvent } = useSocketEvents(socket, dispatchMessages, user);
  
  // Auto-update debug socket info
  useEffect(() => {
    if (socket && socket.id) {
      // If this is the first connection, store the original ID
      if (!socketInfoRef.current.originalId) {
        socketInfoRef.current.originalId = socket.id;
        console.log("⚡ Initial socket connection established:", socket.id);
      } 
      // If socket ID changed, track as reconnection
      else if (socketInfoRef.current.originalId !== socket.id) {
        socketInfoRef.current.reconnections++;
        socketInfoRef.current.lastReconnectTime = new Date().toISOString();
        console.log("⚡ Socket reconnection detected:", {
          oldId: socketInfoRef.current.originalId,
          newId: socket.id,
          reconnectCount: socketInfoRef.current.reconnections
        });
        socketInfoRef.current.originalId = socket.id;
      }
    }
  }, [socket]);

  // --- Operations Hook (depends on other hooks' state/dispatch) ---
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    toggleReaction,
    //handleOfflineMessage, // Exposing for potential direct use if needed
  } = useMessageOperations(
    socket,
    isConnected,
    isOnline,
    dispatchMessages,
    dispatchUi,
    messageState.messages, // Pass messages for permission checks
    emitEvent // Pass the enhanced emit function for better reconnection handling
  );

  // --- Effects ---

  // Fetch initial messages when authenticated and connected
  useEffect(() => {
    if (isAuthenticated && isConnected) {
      logger.info("Authenticated and connected, fetching initial messages.");
      fetchInitialMessages();
    }
    // Clear messages if user logs out? Maybe handled elsewhere.
  }, [isAuthenticated, isConnected, fetchInitialMessages]);

  /**
   * Enhanced message handler with debugging and deduplication
   * Processes both 'message' and 'sendMessage' event types
   */
  const handleNewMessage = useCallback((data) => {
    const now = new Date();
    const messageId = data?.id || data?._id;
    const tempId = data?.tempId || (data?._meta?.tempId);
    
    // Enhanced debug logging
    if (DEBUG_MESSAGE_TRACE_ENABLED) {
      console.group("📩 MESSAGE RECEIVED TRACE");
      console.log("⏰ Time:", now.toLocaleTimeString());
      console.log("📝 Data:", data);
      console.log("🔌 Connection Status:", isConnected ? "Connected" : "Disconnected");
      console.log("🆔 Socket ID:", socket?.id || "Unknown");
      console.log("👤 Current User:", user?.username || "Unknown");
      
      // Check if this is a duplicate message we've already processed
      const isDuplicate = messageId && debugState.processedMessageIds.has(messageId);
      console.log("🔄 Is Duplicate:", isDuplicate);
      
      // Track message event type counts
      const eventType = data?._meta?.eventType || "unknown";
      if (eventType === "message" || eventType === "sendMessage") {
        socketInfoRef.current.eventCounts[eventType] = 
          (socketInfoRef.current.eventCounts[eventType] || 0) + 1;
      }
      
      // Show counts of each event type received
      console.log("📊 Event Counts:", socketInfoRef.current.eventCounts);
      
      console.groupEnd();
    }
    
    // Generate an event identifier for tracing
    const eventId = uuidv4();
    
    try {
      // Process message data - sometimes the payload structure might vary
      let messageData = data;
    
      // Handle duplicate messages - check if we've already processed this message ID
      if (messageId && debugState.processedMessageIds.has(messageId)) {
        console.log(`⚠️ Duplicate message detected and skipped: ${messageId}`);
        return; // Skip processing
      }
      
      // Add to processed IDs set to prevent duplication
      if (messageId) {
        setDebugState(prev => {
          const updatedProcessedIds = new Set(prev.processedMessageIds);
          updatedProcessedIds.add(messageId);
          return {
            ...prev,
            lastEventTime: now.toISOString(),
            processedMessageIds: updatedProcessedIds
          };
        });
      }
      
      // Handle optimistic UI updates with tempId
      if (tempId) {
        logger.debug("Processing message with tempId:", tempId);
        dispatchMessages({ 
          type: "ADD_MESSAGE", 
          payload: { 
            isServerResponse: true, 
            tempId: tempId, 
            message: messageData,
            _trace: { eventId, receivedAt: now.toISOString() }
          } 
        });
      } else {
        logger.debug("Processing regular message:", messageId);
        dispatchMessages({ 
          type: "ADD_MESSAGE", 
          payload: {
            ...messageData,
            _trace: { eventId, receivedAt: now.toISOString() }
          }
        });
      }
    } catch (error) {
      console.error("⚠️ Error processing incoming message:", error);
      
      // Track failed messages for debugging
      setDebugState(prev => ({
        ...prev,
        missedMessages: [
          ...prev.missedMessages,
          {
            id: messageId || "unknown",
            tempId: tempId || "none",
            error: error.message,
            data: JSON.stringify(data).substring(0, 200) + "...", // Truncate for safety
            timestamp: now.toISOString()
          }
        ]
      }));
    }
  }, [dispatchMessages, isConnected, socket, user, debugState.processedMessageIds]);

  const handleMessageUpdated = useCallback((data) => {
    logger.debug("Received 'messageUpdated' event", { id: data?.id });
    if (data && data.id) dispatchMessages({ type: "UPDATE_MESSAGE", payload: data });
  }, [dispatchMessages]);

  const handleMessageEdited = useCallback((data) => {
    logger.debug("Received 'messageEdited' event", { id: data?.id });
    if (data && data.id) dispatchMessages({ type: "EDIT_MESSAGE", payload: data });
  }, [dispatchMessages]);

  const handleMessageDeleted = useCallback((data) => {
    logger.debug("Received 'messageDeleted' event", { id: data?.id });
    if (data && data.id) dispatchMessages({ type: "DELETE_MESSAGE", payload: data });
  }, [dispatchMessages]);

  const handleReplyCreated = useCallback((data) => {
    logger.debug("Received 'replyCreated' event", { id: data?.id, parentId: data?.parentId });
    // Treat replies like normal messages for adding to the list
    if (data && data.id) dispatchMessages({ type: "ADD_MESSAGE", payload: data });
  }, [dispatchMessages]);

  const handleOnlineUsers = useCallback((users) => {
    logger.debug("Received 'onlineUsers' event");
    dispatchNotifications({ type: "SET_ONLINE_USERS", payload: users });
  }, [dispatchNotifications]);

  const handleUserNotification = useCallback((notification) => {
    logger.debug("Received 'userNotification' event", { type: notification?.type });
    dispatchNotifications({ type: "ADD_USER_NOTIFICATION", payload: notification });
  }, [dispatchNotifications]);

  // Register socket event listeners using the robust useSocketEvents hook
  useEffect(() => {
    if (!socket || !isConnected) {
      logger.debug("Socket not available or not connected, skipping event listener registration.");
      return; // Don't register listeners if socket isn't ready
    }

    logger.info("Registering core socket event listeners");

    // Use the improved registerEvent function from useSocketEvents hook
    // This ensures proper cleanup and re-registration during reconnections
    const cleanupHandlers = [
      // Register for both sendMessage and message events
      // Server might be using different events for broadcasts vs direct messages
      registerEvent("sendMessage", handleNewMessage),
      registerEvent("message", handleNewMessage), // Also listen for regular "message" events
      
      registerEvent("messageUpdated", handleMessageUpdated),
      registerEvent("messageEdited", handleMessageEdited),
      registerEvent("messageDeleted", handleMessageDeleted),
      registerEvent("replyCreated", handleReplyCreated),
      registerEvent("onlineUsers", handleOnlineUsers),
      registerEvent("userNotification", handleUserNotification),
      
      // Add reconnection handler to sync up missed messages
      registerEvent("connect", () => {
        logger.info("Socket reconnected - catching up on missed messages");
        // Fetch latest messages to ensure we didn't miss any during reconnect
        fetchInitialMessages();
      }),
      
      // Handle disconnect event
      registerEvent("disconnect", (reason) => {
        logger.warn(`Socket disconnected: ${reason}`);
        
        // If not a clean disconnect (client initiated), show notification
        if (reason !== "io client disconnect") {
          addSystemNotification(`Connection lost (${reason}). Reconnecting...`);
        }
      })
    ];

    // Return cleanup function
    return () => {
      logger.info("Cleaning up core socket event listeners");
      cleanupHandlers.forEach(cleanup => cleanup());
    };
  }, [
    socket, 
    isConnected, 
    registerEvent, 
    handleNewMessage, 
    handleMessageUpdated,
    handleMessageEdited,
    handleMessageDeleted,
    handleReplyCreated,
    handleOnlineUsers,
    handleUserNotification,
    fetchInitialMessages
  ]);

  // Handle online/offline status changes (notifications and queue processing)
   useEffect(() => {
     if (isOnline) {
       addSystemNotification("You are back online.");
       // Process queue if connected
       if (socket && isConnected) {
         logger.info("Processing offline queue as we are online and connected.");
         processQueue(socket, dispatchMessages).catch(err => {
           logger.error("Error processing offline queue:", err);
           ErrorService.handleError(err, "offline-queue", "error", "Failed to process offline messages.");
         });
       } else {
           logger.info("Online, but socket not connected yet. Queue will process on connect.");
       }
     } else {
       addSystemNotification("You are offline. Messages will be sent when you reconnect.");
       // ErrorService.handleOfflineError(dispatchMessages); // Maybe just show notification
     }
   }, [isOnline, isConnected, socket, dispatchMessages, addSystemNotification]);


  // Combine all state and functions to provide in context
  const contextValue = {
    // Connection state & socket instance
    socket,
    isConnected,
    connectionError,
    clearConnectionError,
    emitEvent, // Add emitEvent for more reliable socket communication

    // Message state & loading/pagination
    messages: messageState.messages,
    pagination: messageState.pagination,
    loadingMessages: messageState.loading,
    loadingMoreMessages: messageState.loadingMore,
    hasMoreMessages: messageState.hasMoreMessages,
    messageError: messageState.error,
    loadMoreMessages,
    fetchInitialMessages, // Add fetchInitialMessages to fix the runtime error
    clearMessageError,
    dispatchMessages, // Expose for direct optimistic updates

    // Notification state
    onlineUsers: notificationState.onlineUsers,
    notifications: notificationState.notifications,
    addSystemNotification, // Provide convenience function

    // UI state
    replyingTo: uiState.replyingTo,
    setReplyingTo,
    clearReplyingTo,

    // Operations
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    toggleReaction,

    // Status
    isOnline,
  };

  return (
    <ChatContext.Provider value={contextValue}>
        {children}
    </ChatContext.Provider>
  );
};

// Custom hook to consume the context easily
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
