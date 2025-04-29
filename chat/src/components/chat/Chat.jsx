import React, { useState, useEffect, useRef, useCallback } from "react";
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
import "./Chat.css";
import "./ReplyingTo.css";
import "../common/HeaderComponent.css";

const ChatApp = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    state, 
    loadMoreMessages, 
    // eslint-disable-next-line no-unused-vars
    editMessage, 
    // eslint-disable-next-line no-unused-vars
    deleteMessage, 
    replyToMessage, 
    // eslint-disable-next-line no-unused-vars
    toggleReaction,
    setReplyingTo,
    // eslint-disable-next-line no-unused-vars
    clearError
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
  
  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    if (chatThreadRef.current && !loadingOlder) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
    }
    
    if (notificationsRef.current) {
      notificationsRef.current.scrollTop = notificationsRef.current.scrollHeight;
    }
  }, [messages, notifications, loadingOlder]);
  
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
  
  // Attach scroll listener
  useEffect(() => {
    const chatThread = chatThreadRef.current;
    if (chatThread) {
      chatThread.addEventListener('scroll', handleScroll);
      return () => {
        chatThread.removeEventListener('scroll', handleScroll);
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
  
  // Message validation
  const validateMessage = (text) => {
    if (!text || !text.trim()) {
      setInputError("Message cannot be empty");
      return false;
    }
    
    if (text.length > 500) {
      setInputError(`Message is too long (${text.length}/500 characters)`);
      return false;
    }
    
    setInputError("");
    return true;
  };
  
  const handleMessageSend = () => {
    // Clear any previous errors
    setInputError("");
    
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
      setInputError("Not connected to the server. Please try again later.");
    }
  };

  // Handle Enter key press in input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
      e.preventDefault(); // Prevent default Enter behavior (newline)
      handleMessageSend();
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleLike = (id) => {
    // Only allow if socket is connected
    if (socket && isConnected) {
      // Send only the message ID - server handles the rest
      socket.emit("like", { id });
    }
  };
  
  // eslint-disable-next-line no-unused-vars
  const hasUserLiked = (message) => {
    return user && message.likedBy && message.likedBy.includes(user.id);
  };

  const handleEmojiSelect = (emoji) => {
    setInputText((prevText) => prevText + emoji.emoji); // Append emoji correctly
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render main chat interface
  // Toggle notification settings
  const toggleNotifications = () => {
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
  };

  return (
    <div className="chat-app">
      <div className="chat-container">
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
        <div className="notifications-toggle">
          <button 
            className={`notifications-toggle-btn ${notificationsEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleNotifications}
            aria-label={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
          >
            {notificationsEnabled ? (
              <span role="img" aria-hidden="true">🔔</span>
            ) : (
              <span role="img" aria-hidden="true">🔕</span>
            )}
            <span className="notifications-label">
              {notificationsEnabled ? "Notifications on" : "Notifications off"}
            </span>
          </button>
        </div>
      
        {/* Show loading state */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading message history...</p>
          </div>
        )}
        
        {/* Show error if any */}
        {error && <div className="error-message">{error}</div>}

      <div className="chat-main">
          {/* Message list with messages and controls */}
          <MessageList
            ref={chatThreadRef}
            messages={messages}
            loadingOlder={loadingOlder}
            hasMoreMessages={hasMoreMessages}
            pagination={pagination}
            loadMoreMessages={(nextPage) => {
              setLoadingOlder(true);
              loadMoreMessages(nextPage).finally(() => {
                setLoadingOlder(false);
              });
            }}
            setReplyingTo={setReplyingTo}
            formatTime={formatTime}
          />
          
          <aside className="chat-sidebar">
            {/* Online users panel with ARIA labels */}
            <section 
              className="online-users-panel"
              aria-labelledby="online-users-heading"
            >
              <h3 id="online-users-heading">Online Users ({onlineUsers?.length || 0})</h3>
              <ul 
                className="online-users-list"
                aria-label="List of online users"
              >
                {onlineUsers?.map(user => (
                  <li 
                    key={user.id} 
                    className="online-user"
                  >
                    <div className="user-circle" aria-hidden="true">
                      <span>{user.username[0].toUpperCase()}</span>
                    </div>
                    <span className="user-name">{user.username}</span>
                    <span 
                      className="online-indicator" 
                      aria-hidden="true" 
                      title="Online"
                    ></span>
                  </li>
                ))}
                {(!onlineUsers || onlineUsers.length === 0) && (
                  <li className="no-users">No users online</li>
                )}
              </ul>
            </section>
            
            {/* Notifications panel with ARIA labels */}
            <section 
              className="notifications-panel"
              aria-labelledby="notifications-heading"
            >
              <h3 id="notifications-heading">Notifications</h3>
              <div 
                className="notifications-list" 
                ref={notificationsRef}
                role="log"
                aria-live="polite"
                aria-label="Chat notifications"
              >
                {notifications?.map((notification, index) => (
                  <div 
                    key={index} 
                    className={`notification ${notification.type}`}
                    role="article"
                  >
                    <span className="notification-message">{notification.message}</span>
                    <span className="notification-time" aria-label={`Sent at ${formatTime(notification.timestamp)}`}>
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <div className="no-notifications">No notifications</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div className="chat-input-container" role="form" aria-label="Message input form">
        {/* Error message with proper ARIA attributes */}
        {inputError && (
          <div 
            className="input-error" 
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
        
        <div className="chat-input">
          <label htmlFor="messageInput" className="sr-only">Type a message</label>
          <input
            id="messageInput"
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // Clear error when typing
              if (inputError) setInputError("");
              
              // Show length warning for long messages
              if (e.target.value.length > 450 && e.target.value.length <= 500) {
                setInputError(`${500 - e.target.value.length} characters remaining`);
              } else if (e.target.value.length > 500) {
                setInputError(`Message is too long (${e.target.value.length}/500 characters)`);
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            maxLength={1000} // Hard limit, but we'll show warnings earlier
            aria-describedby={inputError ? "messageInputError" : undefined}
          />
          
          {/* Emoji picker toggle button with ARIA attributes */}
          <button
            className="emoji-toggle"
            onClick={() => isConnected && setShowEmojiPicker(!showEmojiPicker)}
            disabled={!isConnected}
            aria-label="Insert emoji"
            aria-expanded={showEmojiPicker}
            aria-controls="emojiPicker"
          >
            <span aria-hidden="true" className="emoji">😀</span>
          </button>
          
          {/* Emoji picker with proper ARIA attributes */}
          {showEmojiPicker && (
            <div 
              id="emojiPicker"
              className="emoji-picker-react"
              role="dialog"
              aria-label="Emoji picker"
            >
              <Picker 
                theme={theme === "dark" ? "dark" : "light"} 
                width={345} 
                onEmojiClick={handleEmojiSelect} 
              />
            </div>
          )}
          
          {/* Send button with ARIA attributes */}
          <button
            className="send-btn"
            onClick={handleMessageSend}
            disabled={!isConnected || !inputText.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
