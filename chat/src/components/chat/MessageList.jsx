import React, { forwardRef } from 'react';
import MessageActions from './MessageActions';
import { useAuth } from '../common/AuthContext';
import './Chat.css';

/**
 * MessageList component for rendering the list of chat messages
 * Extracts message rendering logic from Chat component for better maintainability
 *
 * @param {Object} props - Component props
 * @param {Array} props.messages - Array of message objects to display
 * @param {boolean} props.loadingOlder - Whether older messages are being loaded
 * @param {boolean} props.hasMoreMessages - Whether there are more messages to load
 * @param {Object} props.pagination - Pagination information
 * @param {Function} props.loadMoreMessages - Function to load more messages
 * @param {Function} props.setReplyingTo - Function to set message being replied to
 * @param {Function} props.formatTime - Function to format timestamp
 */
const MessageList = forwardRef(({
  messages,
  loadingOlder,
  hasMoreMessages,
  pagination,
  loadMoreMessages,
  setReplyingTo,
  formatTime
}, ref) => {
  const { user } = useAuth();

  return (
    <div 
      className="chat-thread" 
      ref={ref}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {/* Loading indicator for older messages with ARIA attributes */}
      {loadingOlder && (
        <div 
          className="loading-older-messages"
          aria-live="polite"
          role="status"
        >
          <div className="loading-spinner-small" aria-hidden="true"></div>
          <span>Loading older messages...</span>
        </div>
      )}
      
      {/* Load more messages button when at the top and more messages are available */}
      {!loadingOlder && hasMoreMessages && messages.length > 0 && (
        <button 
          className="load-more-messages"
          onClick={() => {
            if (!loadingOlder) {
              const nextPage = pagination.currentPage + 1;
              loadMoreMessages(nextPage);
            }
          }}
        >
          Load older messages
        </button>
      )}
      
      {/* Display messages with accessibility attributes */}
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`chat-message 
            ${message.user === user?.username ? 'own-message' : ''}
            ${message.parentId ? 'is-reply' : ''}
            slide-in
          `}
          role="article"
          aria-labelledby={`user-${message.id} text-${message.id} time-${message.id}`}
          data-testid={`message-${message.id}`}
          data-is-own={message.user === user?.username ? 'true' : 'false'}
          data-is-reply={message.parentId ? 'true' : 'false'}
        > 
          <div className="chat-circle" aria-hidden="true">
            <span className="chat-circle-letter">{message.user ? message.user[0].toUpperCase() : '?'}</span>
          </div>
          <div className="message-content">
            <span 
              className="message-user" 
              id={`user-${message.id}`}
            >
              {message.user || 'System'}:
            </span>
            {/* Message text with edit indicator if edited */}
            <span 
              className={`message-text ${message.isEdited ? 'message-text-edited' : ''} ${message.isDeleted ? 'message-text-deleted' : ''}`}
              id={`text-${message.id}`}
            >
              {/* Show reply indicator if this is a reply */}
              {message.parentId && (
                <div className="message-reply-indicator">
                  Replying to {messages.find(m => m.id === message.parentId)?.user || 'message'}
                </div>
              )}
              {message.isDeleted ? (
                <em>This message has been deleted</em>
              ) : (
                message.text
              )}
            </span>
            <span 
              className="message-timestamp"
              id={`time-${message.id}`}
            >
              {formatTime(message.timestamp)}
            </span>
          </div>
          {/* Message actions (like, reply, edit, delete, react) */}
          <MessageActions 
            message={message} 
            onReply={(msg) => setReplyingTo(msg)} 
          />
        </div>
      ))}
      
      {/* Show when no messages are available */}
      {messages.length === 0 && (
        <div className="no-messages">
          No messages yet. Be the first to say hello!
        </div>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;
