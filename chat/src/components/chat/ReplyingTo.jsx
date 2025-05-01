import React from 'react';

/**
 * ReplyingTo component displays which message is being replied to
 * with an option to cancel the reply
 * 
 * Enhanced with better visual connection between replies and messages
 * and improved visibility across both light and dark themes
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
  const truncateText = (text, maxLength = 80) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className="py-3 px-4 bg-gradient-to-r from-primary-50 to-primary-50/80 dark:from-primary/15 dark:to-primary/10 
                border-l-4 border-primary dark:border-primary-700 rounded-md
                flex items-start justify-between transition-colors duration-300
                shadow-sm animate-slideIn" 
      role="status" 
      aria-live="polite"
    >
      <div className="flex items-start flex-1 mr-3">
        <div className="text-primary dark:text-primary-300 mr-3 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-1.5 text-primary dark:text-primary-300 font-medium">
            <span>Replying to </span>
            <span className="font-bold ml-1.5 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded-md">{message.user}</span>
          </div>
          <div 
            className="text-gray-700 dark:text-dark-text-secondary text-sm leading-snug 
                      bg-white/80 dark:bg-dark-bg-hover/50 p-2 rounded-md shadow-sm
                      border border-gray-100 dark:border-dark-border-primary"
            aria-label={`Original message: ${message.text}`}
          >
            <div className="relative pl-3 border-l-2 border-gray-300 dark:border-gray-600">
              {truncateText(message.text)}
            </div>
          </div>
        </div>
      </div>
      <button 
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-dark-text-tertiary
                  bg-white dark:bg-dark-bg-hover shadow-sm
                  hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all hover:shadow-md 
                  hover:text-primary dark:hover:text-primary-300
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-dark-bg-secondary"
        onClick={onCancel}
        aria-label="Cancel reply"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default ReplyingTo;
