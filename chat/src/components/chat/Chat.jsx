import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../common/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import HeaderComponent from "../common/HeaderComponent";
import MessageList from "./MessageList";
import ReplyingTo from "./ReplyingTo";
import ChatInput from "./ChatInput";
import ChatSidebar from "./ChatSidebar";
import useChatScroll from "../../hooks/useChatScroll";
import useChatNotificationsUI from "../../hooks/useChatNotificationsUI";
import { showErrorToast } from "../../utils/toastUtils";
import { createLogger } from "../../utils/logger";

const logger = createLogger("ChatApp");

/**
 * Main Chat application component.
 * Responsible for rendering the chat interface and orchestrating the various
 * sub-components and hooks that handle specific functionality.
 */
const ChatApp = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    messages, 
    socket, 
    isConnected, 
    loadingMessages, 
    messageError, 
    onlineUsers, 
    notifications,
    pagination,
    hasMoreMessages,
    replyingTo,
    loadMoreMessages, 
    replyToMessage, 
    setReplyingTo
  } = useChat();
  
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Integrate chat notifications hook
  const { notificationsEnabled, toggleNotifications } = useChatNotificationsUI(messages, user);

  // Get message count for dependency tracking
  const messageCount = useMemo(() => messages.length, [messages]);
  
  // Integrate chat scroll hook - this manages scroll position, 
  // infinite scrolling, and loading more messages
  const { 
    chatThreadRef, 
    loadingOlder, 
    scrollToBottom,
    setLoadingOlder
  } = useChatScroll({
    loadMoreMessages,
    loadingMessages,
    hasMoreMessages,
    pagination,
  });
  
  // Auto-scroll to bottom when new messages arrive (but not when loading older ones)
  useEffect(() => {
    if (!loadingOlder && messageCount > 0) {
      logger.debug("Auto-scrolling to bottom for new messages");
      scrollToBottom("smooth");
    }
  }, [messageCount, loadingOlder, scrollToBottom]);

  /**
   * Handle sending a new message.
   * Performs validation, determines message type, and emits appropriate event.
   */
  const handleMessageSend = useCallback(() => {
    const trimmedText = inputText.trim();
    
    // Basic validation
    if (!trimmedText) {
      showErrorToast("Message cannot be empty");
      return;
    }
    
    if (trimmedText.length > 500) {
      showErrorToast(`Message is too long (${trimmedText.length}/500 characters)`);
      return;
    }
    
    // Ensure socket is connected
    if (!socket || !isConnected) {
      showErrorToast("Not connected to the server. Please try again later.");
      return;
    }
    
    // Check if replying to a message
    if (replyingTo) {
      // Send reply via context handler
      replyToMessage(replyingTo.id, trimmedText);
      logger.debug("Sending reply message", { replyToId: replyingTo.id });
    } else {
      // Regular message
      logger.debug("Sending regular message");
      socket.emit("message", { text: trimmedText });
    }
    
    // Clear input and UI state
    setInputText("");
    setShowEmojiPicker(false);
  }, [inputText, socket, isConnected, replyingTo, replyToMessage]);


  /**
   * Format a timestamp for display in the UI.
   * Memoized to prevent unnecessary re-renders.
   */
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  /**
   * Handle user logout with proper cleanup
   */
  const handleLogout = useCallback(() => {
    logger.info("User logging out, disconnecting socket");
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);

  // Memoize the loadMoreMessages function to avoid recreating it on every render
  const handleLoadMoreMessages = useCallback(async () => {
    try {
      logger.debug("Loading more messages via ChatContext");
      await loadMoreMessages();
    } catch (error) {
      logger.error("Failed to load more messages:", error);
      showErrorToast("Failed to load older messages");
    } finally {
      setLoadingOlder(false);
    }
  }, [loadMoreMessages, setLoadingOlder]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-300">
      <div className="flex flex-col flex-grow max-w-7xl mx-auto w-full bg-white dark:bg-dark-bg-secondary shadow-md rounded-md overflow-hidden">
        {/* Header with connection status, theme toggle and logout */}
        <HeaderComponent 
          isConnected={isConnected}
          onLogout={handleLogout}
        />
        
        {/* Notification settings toggle */}
        <div className="py-2 px-4 bg-gray-50 dark:bg-dark-bg-tertiary flex justify-end border-b border-gray-200 dark:border-dark-border-primary transition-colors duration-300">
          <button 
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
              notificationsEnabled 
                ? 'bg-success/10 text-success border border-success/30' 
                : 'bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border-secondary'
            }`}
            onClick={toggleNotifications}
            aria-label={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
          >
            {notificationsEnabled ? (
              <span role="img" aria-hidden="true" className="text-lg">🔔</span>
            ) : (
              <span role="img" aria-hidden="true" className="text-lg">🔕</span>
            )}
            <span className="text-sm">
              {notificationsEnabled ? "Notifications on" : "Notifications off"}
            </span>
          </button>
        </div>
      
        {/* Loading overlay */}
        {loadingMessages && (
          <div 
            className="absolute inset-0 bg-black/20 dark:bg-black/40 flex flex-col items-center justify-center z-10"
            aria-live="polite"
            aria-busy="true"
          >
            <div 
              className="w-12 h-12 border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent rounded-full animate-spin mb-3"
              role="progressbar"
              aria-label="Loading messages"
            ></div>
            <p className="text-gray-800 dark:text-dark-text-primary font-medium">Loading message history...</p>
          </div>
        )}
        
        {/* Error display */}
        {messageError && (
          <div 
            className="m-3 p-3 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400"
            role="alert"
            aria-live="assertive"
          >
            {messageError}
          </div>
        )}

        {/* Main content area with messages and sidebar */}
        <div className="flex flex-grow overflow-hidden">
          <MessageList
            ref={chatThreadRef}
            messages={messages}
            loadingOlder={loadingOlder}
            hasMoreMessages={hasMoreMessages}
            pagination={pagination}
            loadMoreMessages={handleLoadMoreMessages}
            setReplyingTo={setReplyingTo}
            formatTime={formatTime}
          />

          <ChatSidebar
            onlineUsers={onlineUsers}
            notifications={notifications}
            formatTime={formatTime}
          />
        </div>
      </div>

      {/* Message input area */}
      <div className="max-w-7xl mx-auto w-full px-4 pb-4">
        {replyingTo && (
          <div className="mb-2">
            <ReplyingTo 
              message={replyingTo} 
              onCancel={() => setReplyingTo(null)} 
            />
          </div>
        )}
        
        <ChatInput 
          inputText={inputText}
          setInputText={setInputText}
          isConnected={isConnected}
          onMessageSend={handleMessageSend}
          theme={theme}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
};

export default ChatApp;
