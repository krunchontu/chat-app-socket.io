import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../common/AuthContext';

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
    return (
      <div className="bg-gray-100 dark:bg-dark-bg-tertiary/30 text-gray-500 dark:text-dark-text-tertiary italic text-center py-1 px-2 rounded-md text-sm">
        This message has been deleted
      </div>
    );
  }

  // Show edit UI when editing
  if (isEditing) {
    return (
      <div className="mt-2 w-full">
        <textarea
          ref={editInputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm 
                     focus:outline-none focus:ring-primary focus:border-primary
                     dark:bg-dark-bg-input dark:text-dark-text-primary text-sm"
          maxLength={500}
          rows={3}
        />
        <div className="flex justify-end space-x-2 mt-2">
          <button 
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active 
                       text-gray-700 dark:text-dark-text-secondary rounded-md text-sm transition-colors"
            onClick={handleCancelEdit}
          >
            Cancel
          </button>
          <button 
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-sm transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSaveEdit}
            disabled={editText.trim() === '' || editText === message.text}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-1 relative" ref={actionsRef}>
      {/* Regular message display with action buttons */}
      <div className="flex space-x-1 opacity-80 hover:opacity-100 transition-opacity">
        {/* Reply button - available to all users */}
        <button
          className="p-1 text-sm text-gray-500 dark:text-dark-text-tertiary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-full"
          onClick={handleReply}
          aria-label="Reply to this message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Add reaction button */}
        <div className="relative">
          <button
            className="p-1 text-sm text-gray-500 dark:text-dark-text-tertiary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-full"
            onClick={() => setShowReactions(!showReactions)}
            aria-label="Add reaction"
            aria-expanded={showReactions}
            aria-haspopup="menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
            </svg>
          </button>
          
          {showReactions && (
            <div className="absolute bottom-8 -left-2 bg-white dark:bg-dark-bg-tertiary shadow-md rounded-lg p-1 grid grid-cols-4 gap-1 z-10" role="menu">
              {availableReactions.map(emoji => (
                <button
                  key={emoji}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded"
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
          <div className="relative">
            <button
              className="p-1 text-sm text-gray-500 dark:text-dark-text-tertiary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-full"
              onClick={() => setShowActions(!showActions)}
              aria-label="More actions"
              aria-expanded={showActions}
              aria-haspopup="menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {showActions && (
              <div className="absolute top-8 right-0 bg-white dark:bg-dark-bg-tertiary shadow-md rounded-lg overflow-hidden z-10 w-24" role="menu">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover"
                  onClick={handleEdit}
                  aria-label="Edit message"
                  role="menuitem"
                >
                  Edit
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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
        <div className="flex flex-wrap gap-1 mt-1.5">
          {getReactionCounts().map(reaction => (
            <button
              key={reaction.emoji}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs
                ${reaction.reacted 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                  : 'bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-secondary'
                } transition-colors`}
              onClick={() => handleReaction(reaction.emoji)}
              aria-label={`${reaction.emoji} reaction: ${reaction.count}`}
              aria-pressed={reaction.reacted}
            >
              <span aria-hidden="true" className="mr-0.5">{reaction.emoji}</span>
              <span className="font-medium">{reaction.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
