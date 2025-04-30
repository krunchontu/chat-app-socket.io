import React, { memo } from 'react';
import MessageActions from './MessageActions';
import DOMPurify from 'dompurify';

/**
 * MessageItem component for rendering individual messages
 * Optimized with memo to prevent unnecessary re-renders
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object to display
 * @param {Object} props.style - Style object from react-window (position, size)
 * @param {Function} props.onReply - Function to call when reply button is clicked
 * @param {string} props.currentUser - Current user's username
 * @param {Function} props.formatTime - Function to format timestamp
 * @param {Array} props.messages - All messages (for finding parent message)
 */
const MessageItem = memo(({
  message,
  style,
  onReply,
  currentUser,
  formatTime,
  messages
}) => {
  // Determine if this message belongs to the current user
  const isOwn = message.user === currentUser;
  
  // Find parent message if this is a reply
  const parentMessage = message.parentId 
    ? messages.find(m => m.id === message.parentId) 
    : null;
  
  return (
    <div 
      style={style} 
      className="px-3"
    >
      <div 
        className={`mb-3 p-3 rounded-lg shadow-sm flex items-start transition-all duration-200 hover:translate-x-0.5
          ${isOwn 
            ? 'bg-blue-50 dark:bg-dark-bg-messageOwn border-l-4 border-primary' 
            : 'bg-white dark:bg-dark-bg-message'}
          ${message.parentId ? 'border-l-4 border-indigo-400 dark:border-indigo-600 pl-3 ml-3' : ''}
          animate-slideIn
        `}
        role="article"
        aria-labelledby={`user-${message.id} text-${message.id} time-${message.id}`}
        data-testid={`message-${message.id}`}
        data-is-own={isOwn ? 'true' : 'false'}
        data-is-reply={message.parentId ? 'true' : 'false'}
      > 
        <div className="w-9 h-9 rounded-full bg-primary text-white flex-shrink-0 flex items-center justify-center mr-3" aria-hidden="true">
          <span>{message.user ? message.user[0].toUpperCase() : '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline">
            <span 
              className="font-medium text-primary dark:text-blue-400" 
              id={`user-${message.id}`}
            >
              {message.user || 'System'}
            </span>
            <span 
              className="text-xs text-gray-500 dark:text-dark-text-tertiary ml-auto pl-2"
              id={`time-${message.id}`}
            >
              {formatTime(message.timestamp)}
            </span>
          </div>
          {/* Message text with edit indicator if edited */}
          <div 
            className={`mt-1 break-words text-gray-800 dark:text-dark-text-primary
              ${message.isEdited ? 'after:content-["(edited)"] after:ml-1.5 after:text-xs after:text-gray-500 after:dark:text-dark-text-tertiary after:italic' : ''} 
              ${message.isDeleted ? 'italic text-gray-500 dark:text-dark-text-tertiary bg-gray-100 dark:bg-dark-bg-tertiary/30 px-2 py-1 rounded' : ''}`}
            id={`text-${message.id}`}
          >
            {/* Show reply indicator if this is a reply */}
            {message.parentId && parentMessage && (
              <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Replying to {parentMessage.user || 'message'}
              </div>
            )}
            {message.isDeleted ? (
              <em>This message has been deleted</em>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.text) }} />
            )}
          </div>
        </div>
        {/* Message actions (like, reply, edit, delete, react) */}
        <MessageActions 
          message={message} 
          onReply={onReply} 
        />
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
