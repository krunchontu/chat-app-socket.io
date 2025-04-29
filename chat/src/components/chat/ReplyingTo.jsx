import React from 'react';
import './ReplyingTo.css';

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
    <div className="replying-to-container" role="status" aria-live="polite">
      <div className="replying-to-content">
        <div className="replying-to-label">
          <span aria-hidden="true">↩️</span> Replying to <span className="replying-username">{message.user}</span>
        </div>
        <div className="replying-message-text" aria-label={`Original message: ${message.text}`}>
          {truncateText(message.text)}
        </div>
      </div>
      <button 
        className="cancel-reply-button" 
        onClick={onCancel}
        aria-label="Cancel reply"
      >
        ✕
      </button>
    </div>
  );
};

export default ReplyingTo;
