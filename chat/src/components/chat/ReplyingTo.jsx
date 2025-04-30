import React from 'react';

/**
 * ReplyingTo component displays which message is being replied to
 * with an option to cancel the reply
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - The message being replied to
 * @param {Function} props.onCancel - Function to call when canceling reply
 */
const ReplyingTo = ({ message, onCancel }) => {
  if (!message) return null;

  // Don't allow replies to deleted messages
  if (message.isDeleted) {
    onCancel();
    return null;
  }

  // Truncate message for display if it's too long
  const truncateText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className="py-2 px-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-200 dark:border-blue-900/30 flex items-center justify-between transition-colors duration-300" 
      role="status" 
      aria-live="polite"
    >
      <div className="flex-1 mr-2">
        <div className="flex items-center mb-0.5 text-blue-700 dark:text-blue-400 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Replying to <span className="font-medium ml-1">{message.user}</span>
        </div>
        <div 
          className="text-gray-700 dark:text-dark-text-secondary text-sm truncate"
          aria-label={`Original message: ${message.text}`}
        >
          {truncateText(message.text)}
        </div>
      </div>
      <button 
        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 dark:text-dark-text-tertiary hover:bg-blue-100 dark:hover:bg-blue-800/20 transition-colors"
        onClick={onCancel}
        aria-label="Cancel reply"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default ReplyingTo;
