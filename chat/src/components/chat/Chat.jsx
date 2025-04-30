import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../common/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import HeaderComponent from "../common/HeaderComponent";
import MessageList from "./MessageList";
import ReplyingTo from "./ReplyingTo";
import Picker from "emoji-picker-react";
import { 
  requestNotificationPermission, 
  showMessageNotification,
  getNotificationPreference,
  saveNotificationPreference
} from "../../utils/notificationUtils";
import { showErrorToast } from "../../utils/toastUtils";

const ChatApp = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    state, 
    loadMoreMessages, 
    replyToMessage, 
    setReplyingTo,
  } = useChat();
  const { 
    messages, 
    socket, 
    isConnected, 
    loading, 
    error, 
    onlineUsers, 
    notifications,
    pagination,
    hasMoreMessages,
    replyingTo
  } = state;
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatThreadRef = useRef(null); // Ref for scrolling
  const notificationsRef = useRef(null); // Ref for notifications
  const [inputError, setInputError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(getNotificationPreference);

  // Request notification permission on mount
  useEffect(() => {
    if (notificationsEnabled) {
      requestNotificationPermission()
        .then(granted => {
          if (!granted) {
            // If permission was denied, update user preference
            setNotificationsEnabled(false);
            saveNotificationPreference(false);
          }
        });
    }
  }, [notificationsEnabled]);

  // Handle browser notifications for new messages
  useEffect(() => {
    // If we have messages, check the most recent one
    if (messages.length > 0 && notificationsEnabled) {
      const latestMessage = messages[messages.length - 1];
      
      // Only show notification if user didn't send the message
      if (latestMessage && latestMessage.user !== user?.username) {
        showMessageNotification(latestMessage, (message) => {
          // Scroll to the message when notification is clicked
          if (chatThreadRef.current) {
            chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
          }
        });
      }
    }
  }, [messages, user, notificationsEnabled]);
  
  // Only re-scroll to bottom when message count changes or loading state changes
  const messageCount = useMemo(() => messages.length, [messages]);
  const notificationCount = useMemo(() => notifications.length, [notifications]);
  
  useEffect(() => {
    if (chatThreadRef.current && !loadingOlder) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
    }
  }, [messageCount, loadingOlder]);
  
  useEffect(() => {
    if (notificationsRef.current) {
      notificationsRef.current.scrollTop = notificationsRef.current.scrollHeight;
    }
  }, [notificationCount]);
  
  // Handle scrolling for infinite scroll
  const handleScroll = useCallback(() => {
    if (!chatThreadRef.current || loadingOlder || loading || !hasMoreMessages) return;
    
    const { scrollTop, scrollHeight } = chatThreadRef.current;
    
    // If user scrolls near the top (within 100px), load more messages
    if (scrollTop < 100) {
      // Save current scroll position and height before loading more messages
      setScrollPosition(scrollTop);
      setScrollHeight(scrollHeight);
      setLoadingOlder(true);
      
      // Load more messages - get the next page based on current pagination
      const nextPage = pagination.currentPage + 1;
      loadMoreMessages(nextPage).finally(() => {
        setLoadingOlder(false);
      });
    }
  }, [loadMoreMessages, loadingOlder, loading, hasMoreMessages, pagination]);
  
  // Attach scroll listener with proper cleanup
  useEffect(() => {
    const chatThread = chatThreadRef.current;
    if (chatThread) {
      chatThread.addEventListener('scroll', handleScroll);
      
      // Proper cleanup to prevent memory leaks
      return () => {
        if (chatThread) {
          chatThread.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [handleScroll]);
  
  // Maintain scroll position after loading more messages
  useEffect(() => {
    if (loadingOlder === false && chatThreadRef.current && scrollHeight > 0) {
      // Calculate the new position to keep the user at the same relative point
      const newScrollTop = chatThreadRef.current.scrollHeight - scrollHeight + scrollPosition;
      chatThreadRef.current.scrollTop = newScrollTop;
      
      // Reset tracked values
      setScrollHeight(0);
    }
  }, [loadingOlder, scrollHeight, scrollPosition]);
  
  const handleMessageSend = useCallback(() => {
    // Clear any previous errors
    setInputError("");
    
    // Message validation function defined inside the callback
    const validateMessage = (text) => {
      if (!text || !text.trim()) {
        setInputError("Message cannot be empty");
        showErrorToast("Message cannot be empty");
        return false;
      }
      
      if (text.length > 500) {
        const errorMsg = `Message is too long (${text.length}/500 characters)`;
        setInputError(errorMsg);
        showErrorToast(errorMsg);
        return false;
      }
      
      setInputError("");
      return true;
    };
    
    // Validate the message
    if (!validateMessage(inputText)) {
      return;
    }
    
    // Ensure socket is connected
    if (socket && isConnected) {
      const text = inputText.trim();
      
      // Check if replying to a message
      if (replyingTo) {
        // Send reply via context handler
        replyToMessage(replyingTo.id, text);
      } else {
        // Regular message
        const messageData = {
          // No ID or user needed - server will use authenticated user
          text,
        };
        socket.emit("message", messageData);
      }
      
      // Clear input and UI state
      setInputText("");
      setShowEmojiPicker(false);
    } else if (!isConnected) {
      const errorMsg = "Not connected to the server. Please try again later.";
      setInputError(errorMsg);
      showErrorToast(errorMsg);
    }
  }, [inputText, socket, isConnected, replyingTo, replyToMessage, setInputText, setShowEmojiPicker, setInputError]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
      e.preventDefault(); // Prevent default Enter behavior (newline)
      handleMessageSend();
    }
  }, [handleMessageSend]);

  const handleEmojiSelect = useCallback((emoji) => {
    setInputText((prevText) => prevText + emoji.emoji); // Append emoji correctly
  }, []);

  // Memoize format function to prevent unnecessary re-renders
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Toggle notification settings
  const toggleNotifications = useCallback(() => {
    // If turning on notifications, request permission
    if (!notificationsEnabled) {
      requestNotificationPermission().then(granted => {
        setNotificationsEnabled(granted);
        saveNotificationPreference(granted);
      });
    } else {
      // Just disable notifications
      setNotificationsEnabled(false);
      saveNotificationPreference(false);
    }
  }, [notificationsEnabled]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-300">
      <div className="flex flex-col flex-grow max-w-7xl mx-auto w-full bg-white dark:bg-dark-bg-secondary shadow-md rounded-md overflow-hidden">
        {/* Header component with connection status, theme toggle and logout */}
        <HeaderComponent 
          isConnected={isConnected}
          onLogout={() => {
            // Clean up socket connection when logging out
            if (socket) {
              socket.disconnect();
            }
          }}
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
      
        {/* Show loading state */}
        {loading && (
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40 flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-800 dark:text-dark-text-primary font-medium">Loading message history...</p>
          </div>
        )}
        
        {/* Show error if any */}
        {error && (
          <div className="m-3 p-3 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-grow overflow-hidden">
          {/* Message list with messages and controls */}
          {/* Apply memo to prevent unnecessary re-renders */}
          <MessageList
            ref={chatThreadRef}
            messages={messages}
            loadingOlder={loadingOlder}
            hasMoreMessages={hasMoreMessages}
            pagination={pagination}
            loadMoreMessages={useCallback((nextPage) => {
              setLoadingOlder(true);
              loadMoreMessages(nextPage).finally(() => {
                setLoadingOlder(false);
              });
            }, [loadMoreMessages])}
            setReplyingTo={setReplyingTo}
            formatTime={formatTime}
          />
          
          <aside className="w-64 border-l border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-tertiary flex flex-col transition-colors duration-300 hidden md:block">
            {/* Online users panel */}
            <section 
              className="flex-1 p-4 border-b border-gray-200 dark:border-dark-border-primary"
              aria-labelledby="online-users-heading"
            >
              <h3 
                id="online-users-heading" 
                className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary uppercase mb-3 pb-2 border-b border-gray-200 dark:border-dark-border-secondary"
              >
                Online Users ({onlineUsers?.length || 0})
              </h3>
              <ul 
                className="space-y-2 overflow-y-auto max-h-[200px] scrollbar-hide"
                aria-label="List of online users"
              >
                {onlineUsers?.map(user => (
                  <li 
                    key={user.id} 
                    className="flex items-center space-x-2 py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center" aria-hidden="true">
                      <span>{user.username[0].toUpperCase()}</span>
                    </div>
                    <span className="flex-1 text-gray-800 dark:text-dark-text-primary truncate">{user.username}</span>
                    <span 
                      className="w-2 h-2 rounded-full bg-success" 
                      aria-hidden="true" 
                      title="Online"
                    ></span>
                  </li>
                ))}
                {(!onlineUsers || onlineUsers.length === 0) && (
                  <li className="text-center py-4 text-gray-500 dark:text-dark-text-tertiary italic">No users online</li>
                )}
              </ul>
            </section>
            
            {/* Notifications panel */}
            <section 
              className="flex-1 p-4 overflow-hidden flex flex-col"
              aria-labelledby="notifications-heading"
            >
              <h3 
                id="notifications-heading" 
                className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary uppercase mb-3 pb-2 border-b border-gray-200 dark:border-dark-border-secondary"
              >
                Notifications
              </h3>
              <div 
                className="flex-1 overflow-y-auto space-y-2 scrollbar-hide" 
                ref={notificationsRef}
                role="log"
                aria-live="polite"
                aria-label="Chat notifications"
              >
                {notifications?.map((notification, index) => (
                  <div 
                    key={index} 
                    className={`p-2 rounded-md text-sm animate-fadeIn ${
                      notification.type === 'join' 
                        ? 'bg-green-50 dark:bg-green-900/10 border-l-2 border-green-500 text-green-800 dark:text-green-400' 
                        : notification.type === 'leave'
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-500 text-amber-800 dark:text-amber-400'
                        : 'bg-gray-50 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary'
                    }`}
                    role="article"
                  >
                    <div className="flex justify-between items-baseline">
                      <span>{notification.message}</span>
                      <span className="text-xs text-gray-500 dark:text-dark-text-tertiary ml-2" aria-label={`Sent at ${formatTime(notification.timestamp)}`}>
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <div className="text-center py-4 text-gray-500 dark:text-dark-text-tertiary italic">No notifications</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 pb-4">
        <div className="bg-white dark:bg-dark-bg-secondary shadow-md rounded-md overflow-hidden transition-colors duration-300" role="form" aria-label="Message input form">
          {/* Error message with proper ARIA attributes */}
          {inputError && (
            <div 
              className="p-2 bg-red-100 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm" 
              role="alert"
              aria-live="assertive"
            >
              {inputError}
            </div>
          )}
          
          {/* Show ReplyingTo component when replying to a message */}
          {replyingTo && (
            <ReplyingTo 
              message={replyingTo} 
              onCancel={() => setReplyingTo(null)} 
            />
          )}
          
          <div className="flex items-center p-3 space-x-2">
            <label htmlFor="messageInput" className="sr-only">Type a message</label>
            <input
              id="messageInput"
              type="text"
              value={inputText}
              onChange={useCallback((e) => {
                setInputText(e.target.value);
                // Clear error when typing
                if (inputError) setInputError("");
                
                // Show length warning for long messages
                if (e.target.value.length > 450 && e.target.value.length <= 500) {
                  setInputError(`${500 - e.target.value.length} characters remaining`);
                } else if (e.target.value.length > 500) {
                  setInputError(`Message is too long (${e.target.value.length}/500 characters)`);
                }
              }, [inputError])}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={!isConnected}
              maxLength={1000} // Hard limit, but we'll show warnings earlier
              aria-describedby={inputError ? "messageInputError" : undefined}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                        bg-gray-50 dark:bg-dark-bg-input text-gray-900 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-tertiary
                        disabled:bg-gray-100 dark:disabled:bg-dark-bg-hover disabled:cursor-not-allowed"
            />
            
            {/* Emoji picker toggle button */}
            <div className="relative">
              <button
                className="p-2 bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-secondary rounded-md hover:bg-gray-200 dark:hover:bg-dark-bg-active transition-colors"
                onClick={() => isConnected && setShowEmojiPicker(!showEmojiPicker)}
                disabled={!isConnected}
                aria-label="Insert emoji"
                aria-expanded={showEmojiPicker}
                aria-controls="emojiPicker"
              >
                <span aria-hidden="true" className="text-xl">😀</span>
              </button>
              
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div 
                  id="emojiPicker"
                  className="absolute bottom-12 right-0 z-10 shadow-lg rounded-md overflow-hidden"
                  role="dialog"
                  aria-label="Emoji picker"
                >
                  <Picker 
                    theme={theme === "dark" ? "dark" : "light"} 
                    width={300} 
                    onEmojiClick={handleEmojiSelect} 
                  />
                </div>
              )}
            </div>
            
            {/* Send button */}
            <button
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
              onClick={handleMessageSend}
              disabled={!isConnected || !inputText.trim()}
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
