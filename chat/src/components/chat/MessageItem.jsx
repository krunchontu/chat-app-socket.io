import React, { memo, useMemo } from 'react';
import MessageActions from './MessageActions';
import DOMPurify from 'dompurify';
import PropTypes from 'prop-types';

/**
 * Avatar component for displaying user profile picture or initial
 */
const UserAvatar = memo(({ username }) => (
  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center mr-2">
    <span aria-hidden="true">{username ? username[0].toUpperCase() : 'S'}</span>
  </div>
));

UserAvatar.propTypes = {
  username: PropTypes.string
};

UserAvatar.displayName = 'UserAvatar';

/**
 * Timestamp component for displaying when a message was sent
 */
const MessageTimestamp = memo(({ timestamp, formatTime, isOwn, id }) => (
  <span 
    className={`text-xs ${isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'} flex items-center ml-2`}
    id={`time-${id}`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 opacity-70" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
    {formatTime(timestamp)}
  </span>
));

MessageTimestamp.propTypes = {
  timestamp: PropTypes.string,
  formatTime: PropTypes.func.isRequired,
  isOwn: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired
};

MessageTimestamp.displayName = 'MessageTimestamp';

/**
 * Message header with user info and timestamp
 */
const MessageHeader = memo(({ message, isOwn, formatTime }) => (
  <div className="flex items-center justify-between mb-1.5">
    <div className="flex items-center">
      {!isOwn && (
        <>
          <UserAvatar username={message.user} />
          <span 
            className="font-medium text-primary dark:text-primary-100"
            id={`user-${message.id}`}
          >
            {message.user || 'System'}
          </span>
        </>
      )}
      {isOwn && (
        <span 
          className="font-medium text-primary-100"
          id={`user-${message.id}`}
        >
          You
        </span>
      )}
    </div>

    <MessageTimestamp 
      timestamp={message.timestamp} 
      formatTime={formatTime}
      isOwn={isOwn}
      id={message.id}
    />
  </div>
));

MessageHeader.propTypes = {
  message: PropTypes.object.isRequired,
  isOwn: PropTypes.bool.isRequired,
  formatTime: PropTypes.func.isRequired
};

MessageHeader.displayName = 'MessageHeader';

/**
 * Reply indicator that shows information about the parent message
 */
const ReplyIndicator = memo(({ parentMessage, isOwn }) => (
  <div className={`text-xs mb-2 flex items-center rounded-md px-2 py-1 mb-2 ${
    isOwn ? 'bg-primary-700/20 border-l-2 border-white/70' : 'bg-gray-50/90 dark:bg-dark-bg-hover/70 border-l-2 border-primary dark:border-primary/70'}`}>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
    <span className={`${isOwn ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
      Replying to <span className="font-medium">{parentMessage.user || 'message'}</span>
    </span>
    <span className="ml-auto text-xs opacity-70 truncate max-w-[100px]" title={parentMessage.text}>
      {parentMessage.text.substring(0, 20)}{parentMessage.text.length > 20 ? '...' : ''}
    </span>
  </div>
));

ReplyIndicator.propTypes = {
  parentMessage: PropTypes.object.isRequired,
  isOwn: PropTypes.bool.isRequired
};

ReplyIndicator.displayName = 'ReplyIndicator';

/**
 * Deleted message indicator
 */
const DeletedMessage = memo(({ isOwn, id }) => (
  <div className={`flex items-center italic px-3 py-2 ${
    isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'} bg-black/5 dark:bg-white/5 rounded-md`}
    id={`text-${id}`}>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
    This message has been deleted
  </div>
));

DeletedMessage.propTypes = {
  isOwn: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired
};

DeletedMessage.displayName = 'DeletedMessage';

/**
 * Message content with sanitization
 */
const MessageContent = memo(({ message, isOwn }) => {
  if (message.isDeleted) {
    return <DeletedMessage isOwn={isOwn} id={message.id} />;
  }
  
  return (
    <div 
      className={`break-words ${isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-200'} 
      whitespace-pre-wrap ${message.isEdited ? 'after:content-["(edited)"] after:ml-1.5 after:text-xs after:text-blue-100 dark:after:text-gray-400 after:italic' : ''}`}
      id={`text-${message.id}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.text) }}
    />
  );
});

MessageContent.propTypes = {
  message: PropTypes.object.isRequired,
  isOwn: PropTypes.bool.isRequired
};

MessageContent.displayName = 'MessageContent';

/**
 * MessageBubble component that contains all message content
 */
const MessageBubble = memo(({ message, isOwn, parentMessage, formatTime }) => (
  <div 
    className={`mb-1.5 
      ${isOwn 
        ? 'bg-gradient-to-br from-primary to-primary-hover text-white rounded-[18px] rounded-br-[4px]' 
        : 'bg-gray-100 dark:bg-dark-bg-input dark:text-white border border-gray-200 dark:border-gray-700 rounded-[18px] rounded-bl-[4px]'}
      ${message.parentId ? 'mt-1' : ''}
      shadow-sm overflow-hidden
    `}
    role="article"
    aria-labelledby={`user-${message.id} text-${message.id} time-${message.id}`}
    data-testid={`message-${message.id}`}
    data-is-own={isOwn ? 'true' : 'false'}
    data-is-reply={message.parentId ? 'true' : 'false'}
  >
    <div className="p-3">
      {/* Message header */}
      <MessageHeader message={message} isOwn={isOwn} formatTime={formatTime} />
      
      {/* Reply indicator */}
      {message.parentId && parentMessage && (
        <ReplyIndicator parentMessage={parentMessage} isOwn={isOwn} />
      )}
      
      {/* Message content */}
      <MessageContent message={message} isOwn={isOwn} />
    </div>
  </div>
));

MessageBubble.propTypes = {
  message: PropTypes.object.isRequired,
  isOwn: PropTypes.bool.isRequired,
  parentMessage: PropTypes.object,
  formatTime: PropTypes.func.isRequired
};

MessageBubble.displayName = 'MessageBubble';

/**
 * Main MessageItem component - now composed of smaller, focused components
 * Highly optimized with memo and stable references to prevent unnecessary re-renders
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
  // Memoize computed values to prevent recalculations on re-render
  const isOwn = useMemo(() => message.user === currentUser, [message.user, currentUser]);
  
  // Find parent message if this is a reply - memoized to avoid recalculations
  const parentMessage = useMemo(() => {
    if (!message.parentId) return null;
    return messages.find(m => m.id === message.parentId);
  }, [message.parentId, messages]);
  
  // Use style object directly as a dependency to prevent unnecessary re-renders
  const combinedStyle = useMemo(() => ({
    ...style,
    willChange: 'transform', // Hardware acceleration hint
    contain: 'layout style paint' // Improved containment hint for better performance
  }), [style]);
  
  return (
    <div 
      style={combinedStyle} 
      className={`px-3 py-1.5 ${isOwn ? 'flex justify-end' : ''}`}
      data-testid="message-container"
    >
      {/* Message container with proper stacking context */}
      <div className="relative z-0 max-w-[85%]">
        {/* Message bubble with all content */}
        <MessageBubble 
          message={message}
          isOwn={isOwn}
          parentMessage={parentMessage}
          formatTime={formatTime}
        />
        
        {/* Message actions with improved positioning */}
        <div className={`absolute ${isOwn ? 'top-0 left-0 translate-y-[10px] -translate-x-[110%]' : 'bottom-0 right-0 translate-y-[50%]'} transform pointer-events-auto z-30 ${isOwn ? 'w-auto' : 'w-full'} flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
          <MessageActions 
            message={message} 
            onReply={onReply} 
          />
        </div>
      </div>
    </div>
  );
});

MessageItem.propTypes = {
  message: PropTypes.object.isRequired,
  style: PropTypes.object.isRequired,
  onReply: PropTypes.func.isRequired,
  currentUser: PropTypes.string,
  formatTime: PropTypes.func.isRequired,
  messages: PropTypes.array.isRequired
};

MessageItem.displayName = 'MessageItem';

export default MessageItem;
