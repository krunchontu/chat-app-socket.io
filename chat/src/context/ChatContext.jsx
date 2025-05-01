import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useAuth } from "../components/common/AuthContext";
import useSocketConnection from "../hooks/useSocketConnection";
import useMessageState from "../hooks/useMessageState";
import useMessageOperations from "../hooks/useMessageOperations";
import useOnlineStatus from "../hooks/useOnlineStatus";
import useChatNotifications from "../hooks/useChatNotifications";
import useChatUiState from "../hooks/useChatUiState";
import { processQueue } from "../utils/offlineQueue";
import { createLogger } from "../utils/logger";
import ErrorService from "../services/ErrorService"; // Keep for potential top-level error display

const logger = createLogger("ChatProvider");
const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const isOnline = useOnlineStatus();

  // --- Core Hooks ---
  const { socket, isConnected, connectionError, clearConnectionError } = useSocketConnection();
  const { messageState, dispatchMessages, fetchInitialMessages, loadMoreMessages, clearMessageError } = useMessageState();
  const { notificationState, dispatchNotifications, addSystemNotification } = useChatNotifications();
  const { uiState, dispatchUi, setReplyingTo, clearReplyingTo } = useChatUiState();

  // --- Operations Hook (depends on other hooks' state/dispatch) ---
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    toggleReaction,
    handleOfflineMessage, // Exposing for potential direct use if needed
  } = useMessageOperations(
    socket,
    isConnected,
    isOnline,
    dispatchMessages,
    dispatchUi,
    messageState.messages // Pass messages for permission checks
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

  // Register socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) {
      logger.debug("Socket not available or not connected, skipping event listener registration.");
      return; // Don't register listeners if socket isn't ready
    }

    logger.info("Registering core socket event listeners");

    // Message Events -> Dispatch to useMessageState
    const handleNewMessage = (data) => {
      logger.debug("Received 'sendMessage' event", { id: data?.id, tempId: data?.tempId });
      if (data?.tempId) {
        dispatchMessages({ type: "ADD_MESSAGE", payload: { isServerResponse: true, tempId: data.tempId, message: data } });
      } else {
        dispatchMessages({ type: "ADD_MESSAGE", payload: data });
      }
    };
    const handleMessageUpdated = (data) => {
       logger.debug("Received 'messageUpdated' event", { id: data?.id });
       if (data && data.id) dispatchMessages({ type: "UPDATE_MESSAGE", payload: data });
    };
    const handleMessageEdited = (data) => {
        logger.debug("Received 'messageEdited' event", { id: data?.id });
        if (data && data.id) dispatchMessages({ type: "EDIT_MESSAGE", payload: data });
    };
    const handleMessageDeleted = (data) => {
        logger.debug("Received 'messageDeleted' event", { id: data?.id });
        if (data && data.id) dispatchMessages({ type: "DELETE_MESSAGE", payload: data });
    };
    const handleReplyCreated = (data) => {
        logger.debug("Received 'replyCreated' event", { id: data?.id, parentId: data?.parentId });
        // Treat replies like normal messages for adding to the list
        if (data && data.id) dispatchMessages({ type: "ADD_MESSAGE", payload: data });
    };

    // Notification/User Events -> Dispatch to useChatNotifications
    const handleOnlineUsers = (users) => {
        logger.debug("Received 'onlineUsers' event");
        dispatchNotifications({ type: "SET_ONLINE_USERS", payload: users });
    };
    const handleUserNotification = (notification) => {
        logger.debug("Received 'userNotification' event", { type: notification?.type });
        dispatchNotifications({ type: "ADD_USER_NOTIFICATION", payload: notification });
    };

    // Register listeners
    socket.on("sendMessage", handleNewMessage);
    socket.on("messageUpdated", handleMessageUpdated); // For likes/reactions
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("replyCreated", handleReplyCreated);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("userNotification", handleUserNotification);

    // Cleanup listeners on disconnect or unmount
    return () => {
      logger.info("Cleaning up core socket event listeners");
      socket.off("sendMessage", handleNewMessage);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("replyCreated", handleReplyCreated);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("userNotification", handleUserNotification);
    };
  }, [socket, isConnected, dispatchMessages, dispatchNotifications]); // Rerun if socket instance changes or connection status changes

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

    // Message state & loading/pagination
    messages: messageState.messages,
    pagination: messageState.pagination,
    loadingMessages: messageState.loading,
    loadingMoreMessages: messageState.loadingMore,
    hasMoreMessages: messageState.hasMoreMessages,
    messageError: messageState.error,
    loadMoreMessages,
    clearMessageError,

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
