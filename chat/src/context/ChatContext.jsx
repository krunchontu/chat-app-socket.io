import React, { createContext, useContext } from "react";
import { useAuth } from "../components/common/AuthContext";
import useSocketConnection from "../hooks/useSocketConnection";
import useMessageState from "../hooks/useMessageState";
import useMessageOperations from "../hooks/useMessageOperations";
import useOnlineStatus from "../hooks/useOnlineStatus";
import useChatNotifications from "../hooks/useChatNotifications";
import useChatUiState from "../hooks/useChatUiState";
import useSocketEvents from "../hooks/useSocketEvents";
import useSocketEventHandlers from "../hooks/useSocketEventHandlers";
import useChatSocketIntegration from "../hooks/useChatSocketIntegration";
//import useMessageSynchronizer from "../hooks/useMessageSynchronizer";
import useChatContextState from "../hooks/useChatContextState";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  
  // Core socket connection and events
  const { socket, isConnected, connectionError, clearConnectionError } = useSocketConnection();
  const { registerEvent, emitEvent } = useSocketEvents(socket, null, user);
  
  // State management hooks
  const { messageState, dispatchMessages, fetchInitialMessages, loadMoreMessages, clearMessageError } = useMessageState();
  const { notificationState, dispatchNotifications } = useChatNotifications();
  const { uiState, dispatchUi, setReplyingTo, clearReplyingTo } = useChatUiState();
  
  // Message handling and operations
  const eventHandlers = useSocketEventHandlers(
    socket,
    dispatchMessages,
    dispatchNotifications,
    dispatchUi,
    messageState,
    user,
    fetchInitialMessages
  );
  
  // Event integration with socket
  useChatSocketIntegration(socket, isConnected, eventHandlers, registerEvent);
  
  // Message synchronization between client/server and online/offline states
  //const synchronizer = useMessageSynchronizer(
  //  socket,
  //  isConnected,
  //  isOnline,
  //  dispatchMessages,
  // eventHandlers.addSystemNotification,
  //  fetchInitialMessages
  //);
  
  // Message operations that handle sending, editing, etc.
  const operations = useMessageOperations(
    socket,
    isConnected,
    isOnline,
    dispatchMessages,
    dispatchUi,
    messageState.messages,
    emitEvent
  );

  // Create unified context state using our specialized hook
  const { contextValue } = useChatContextState({
    socket: {
      socket,
      isConnected,
      connectionError,
      clearConnectionError,
      emitEvent
    },
    messageState: {
      messages: messageState.messages,
      pagination: messageState.pagination,
      loading: messageState.loading,
      loadingMore: messageState.loadingMore,
      hasMoreMessages: messageState.hasMoreMessages,
      error: messageState.error,
      loadMoreMessages,
      fetchInitialMessages,
      clearMessageError,
      dispatchMessages
    },
    notificationState: {
      onlineUsers: notificationState.onlineUsers,
      notifications: notificationState.notifications,
      addSystemNotification: eventHandlers.addSystemNotification
    },
    uiState: {
      replyingTo: uiState.replyingTo,
      setReplyingTo,
      clearReplyingTo
    },
    operations,
    onlineStatus: { isOnline }
  });

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
