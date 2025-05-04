import { useMemo, useCallback } from "react";
//import { createLogger } from "../utils/logger";

/**
 * Custom hook to create a unified state object for the chat context
 * Combines various state slices and operations into a cohesive API
 *
 * @param {Object} options - Configuration options and state slices
 * @param {Object} options.socket - Socket instance and socket state
 * @param {Object} options.messageState - Message state from useMessageState
 * @param {Object} options.notificationState - Notification state
 * @param {Object} options.uiState - UI state
 * @param {Object} options.operations - Message operations functions
 * @param {Object} options.onlineStatus - Online status state
 * @returns {Object} Combined chat context state
 */
const useChatContextState = ({
  socket = {},
  messageState = {},
  notificationState = {},
  uiState = {},
  operations = {},
  onlineStatus = {},
}) => {
  // Extract socket-related data
  const {
    socket: socketInstance,
    isConnected,
    connectionError,
    clearConnectionError,
    emitEvent,
  } = socket;

  // Extract message state
  const {
    messages,
    pagination,
    loading: loadingMessages,
    loadingMore: loadingMoreMessages,
    hasMoreMessages,
    error: messageError,
    loadMoreMessages,
    fetchInitialMessages,
    clearMessageError,
    dispatchMessages,
  } = messageState;

  // Extract notification state
  const { onlineUsers, notifications, addSystemNotification } =
    notificationState;

  // Extract UI state
  const { replyingTo, setReplyingTo, clearReplyingTo } = uiState;

  // Extract message operations
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    toggleReaction,
  } = operations;

  // Extract online status
  const { isOnline } = onlineStatus || { isOnline: true };

  /**
   * Combine all operations into a single context value
   */
  const contextValue = useMemo(
    () => ({
      // Connection state & socket instance
      socket: socketInstance,
      isConnected,
      connectionError,
      clearConnectionError,
      emitEvent,

      // Message state & loading/pagination
      messages,
      pagination,
      loadingMessages,
      loadingMoreMessages,
      hasMoreMessages,
      messageError,
      loadMoreMessages,
      fetchInitialMessages,
      clearMessageError,
      dispatchMessages,

      // Notification state
      onlineUsers,
      notifications,
      addSystemNotification,

      // UI state
      replyingTo,
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
    }),
    [
      // Socket dependencies
      socketInstance,
      isConnected,
      connectionError,
      clearConnectionError,
      emitEvent,

      // Message state dependencies
      messages,
      pagination,
      loadingMessages,
      loadingMoreMessages,
      hasMoreMessages,
      messageError,
      loadMoreMessages,
      fetchInitialMessages,
      clearMessageError,
      dispatchMessages,

      // Notification dependencies
      onlineUsers,
      notifications,
      addSystemNotification,

      // UI state dependencies
      replyingTo,
      setReplyingTo,
      clearReplyingTo,

      // Operation dependencies
      sendMessage,
      editMessage,
      deleteMessage,
      replyToMessage,
      toggleReaction,

      // Status dependencies
      isOnline,
    ]
  );

  /**
   * Merged helpers for special cases that require multiple operations
   */

  // Helper to handle disconnect
  const handleDisconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
    }
  }, [socketInstance]);

  // Helper to refresh all data
  const refreshAllData = useCallback(() => {
    if (fetchInitialMessages) {
      fetchInitialMessages();
    }
  }, [fetchInitialMessages]);

  /**
   * Extended API for testing and debugging
   */
  const debug = {
    handleDisconnect,
    refreshAllData,
    socketId: socketInstance?.id,
    messageCount: messages?.length || 0,
    notificationCount: notifications?.length || 0,
  };

  return {
    contextValue,
    debug,
  };
};

export default useChatContextState;
