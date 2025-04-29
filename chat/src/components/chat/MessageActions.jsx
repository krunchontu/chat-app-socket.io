import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../common/AuthContext';
import './MessageActions.css';

/**
 * MessageActions component provides UI controls for message management
 * Includes buttons for editing, deleting, replying, and adding reactions
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object to act upon
 * @param {Function} props.onReply - Function to call when reply is initiated
 */
const MessageActions = ({ message, onReply }) => {
  const { user } = useAuth();
  const { editMessage, deleteMessage, toggleReaction } = useChat();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showReactions, setShowReactions] = useState(false);
  const actionsRef = useRef(null);
  const editInputRef = useRef(null);

  // Available reactions
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🤔'];
  
  // Format reactions for display
  const getReactionCounts = () => {
    // If reactions is undefined or null, return empty array
    if (!message.reactions) return [];
    
    // Convert the reactions Map to an array of objects with emoji and count
    const counts = [];
    try {
      for (const [emoji, users] of Object.entries(message.reactions)) {
        // Ensure users is an array and has elements before adding
        if (users && Array.isArray(users) && users.length > 0) {
          counts.push({
            emoji,
            count: users.length,
            reacted: user?.id ? users.includes(user.id) : false
          });
        }
      }
    } catch (error) {
      console.error('Error processing reactions:', error, message.reactions);
    }
    
    return counts;
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
        setShowReactions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Put focus on edit input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      // Place cursor at the end of the text
      editInputRef.current.setSelectionRange(
        editText.length, 
        editText.length
      );
    }
  }, [isEditing, editText]);

  // Handle message edit
  const handleEdit = () => {
    if (message.isDeleted) return;
    setIsEditing(true);
    setShowActions(false);
  };

  // Handle message delete with confirmation
  const handleDelete = () => {
    if (message.isDeleted) return;
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      console.log('Deleting message with ID:', message.id);
      // Make sure we're passing the correct message ID
      deleteMessage(message.id);
      setShowActions(false);
    }
  };

  // Handle message reply
  const handleReply = () => {
    if (message.isDeleted) return;
    if (onReply) onReply(message);
    setShowActions(false);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (editText !== message.text) {
      editMessage(message.id, editText);
    }
    setIsEditing(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  // Handle reaction toggle
  const handleReaction = (emoji) => {
    console.log('Reaction clicked:', { 
      messageId: message.id, 
      messageIdType: typeof message.id,
      emoji, 
      message
    });
    
    // Check if message has an id and emoji is provided before calling toggleReaction
    if (!message.id) {
      console.error('Message ID is missing for reaction:', message);
      return;
    }
    
    if (!emoji) {
      console.error('Emoji is missing for reaction');
      return;
    }
    
    // Now safely call toggleReaction with valid parameters
    toggleReaction(message.id, emoji);
    setShowReactions(false);
  };

  // Check if user owns this message
  const isOwnMessage = message.user === user?.username;

  // Show delete message UI for deleted messages
  if (message.isDeleted) {
    return <div className="message-deleted">This message has been deleted</div>;
  }

  // Show edit UI when editing
  if (isEditing) {
    return (
      <div className="message-edit-container">
        <textarea
          ref={editInputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="message-edit-input"
          maxLength={500}
        />
        <div className="message-edit-actions">
          <button 
            className="message-edit-save" 
            onClick={handleSaveEdit}
            disabled={editText.trim() === '' || editText === message.text}
          >
            Save
          </button>
          <button 
            className="message-edit-cancel" 
            onClick={handleCancelEdit}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="message-actions-container" ref={actionsRef}>
      {/* Regular message display with action buttons */}
      <div className="message-actions-buttons">
        {/* Reply button - available to all users */}
        <button
          className="message-action-button"
          onClick={handleReply}
          aria-label="Reply to this message"
        >
          <span aria-hidden="true">↩️</span>
        </button>
        
        {/* Add reaction button */}
        <div className="reaction-button-container">
          <button
            className="message-action-button"
            onClick={() => setShowReactions(!showReactions)}
            aria-label="Add reaction"
            aria-expanded={showReactions}
            aria-haspopup="menu"
          >
            <span aria-hidden="true">😀</span>
          </button>
          
          {showReactions && (
            <div className="reactions-menu" role="menu">
              {availableReactions.map(emoji => (
                <button
                  key={emoji}
                  className="reaction-option"
                  onClick={() => handleReaction(emoji)}
                  aria-label={`React with ${emoji}`}
                  role="menuitem"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* More actions button - only for own messages */}
        {isOwnMessage && (
          <div className="more-actions-container">
            <button
              className="message-action-button"
              onClick={() => setShowActions(!showActions)}
              aria-label="More actions"
              aria-expanded={showActions}
              aria-haspopup="menu"
            >
              <span aria-hidden="true">⋯</span>
            </button>
            
            {showActions && (
              <div className="actions-menu" role="menu">
                <button
                  className="action-option"
                  onClick={handleEdit}
                  aria-label="Edit message"
                  role="menuitem"
                >
                  Edit
                </button>
                <button
                  className="action-option action-delete"
                  onClick={handleDelete}
                  aria-label="Delete message"
                  role="menuitem"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Display reactions */}
      {getReactionCounts().length > 0 && (
        <div className="message-reactions">
          {getReactionCounts().map(reaction => (
            <button
              key={reaction.emoji}
              className={`reaction-badge ${reaction.reacted ? 'reacted' : ''}`}
              onClick={() => handleReaction(reaction.emoji)}
              aria-label={`${reaction.emoji} reaction: ${reaction.count}`}
              aria-pressed={reaction.reacted}
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              <span className="reaction-count">{reaction.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
