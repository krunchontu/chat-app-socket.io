import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../common/AuthContext';

/**
 * MessageActions component provides UI controls for message management
 * Includes buttons for editing, deleting, replying, and adding reactions
 * Optimized with memoization to prevent unnecessary re-renders
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object to act upon
 * @param {Function} props.onReply - Function to call when reply is initiated
 */
const MessageActions = memo(({ message, onReply }) => {
  const { user } = useAuth();
  const { editMessage, deleteMessage, toggleReaction } = useChat();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showReactions, setShowReactions] = useState(false);
  const actionsRef = useRef(null);
  const editInputRef = useRef(null);

  // Available reactions with descriptive labels
  const availableReactions = [
    { emoji: '👍', label: 'Thumbs Up' },
    { emoji: '❤️', label: 'Heart' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '👏', label: 'Clap' },
    { emoji: '🎉', label: 'Celebration' },
    { emoji: '🤔', label: 'Thinking' }
  ];
  
  // Format reactions for display - memoized to prevent recalculations
  const getReactionCounts = useCallback(() => {
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
  }, [message.reactions, user?.id]);

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

  // Handle message edit - memoized to maintain referential equality
  const handleEdit = useCallback(() => {
    if (message.isDeleted) return;
    setIsEditing(true);
    setShowActions(false);
  }, [message.isDeleted]);

  // Handle message delete with confirmation - memoized
  const handleDelete = useCallback(() => {
    if (message.isDeleted) return;
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(message.id);
      setShowActions(false);
    }
  }, [message.isDeleted, message.id, deleteMessage]);

  // Handle message reply - with added ID validation
  const handleReply = useCallback(() => {
    // Don't allow replying to deleted messages
    if (message.isDeleted) return;
    
    // Validate that message has a valid ID before attempting to reply
    if (!message.id) {
      console.error('Cannot reply: Message ID is missing', message);
      // Using window.alert for immediate feedback - in production you'd use a toast/notification system
      window.alert('Unable to reply: Invalid message');
      return;
    }
    
    // Only call onReply if it's provided and message has an ID
    if (onReply) onReply(message);
    setShowActions(false);
  }, [message, onReply]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (editText !== message.text) {
      editMessage(message.id, editText);
    }
    setIsEditing(false);
  }, [editText, message.text, message.id, editMessage]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditText(message.text);
    setIsEditing(false);
  }, [message.text]);

  // Handle reaction toggle
  const handleReaction = useCallback((emoji) => {
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
  }, [message, toggleReaction]);

  // Check if user owns this message - memoized
  const isOwnMessage = useCallback(() => message.user === user?.username, [message.user, user?.username]);

  // Skip rendering actions for deleted messages
  if (message.isDeleted) {
    return null;
  }

  // Show edit UI when editing - we'll return a full component to maintain layout consistency
  if (isEditing) {
    return (
      <div className="w-full relative">
        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 backdrop-blur-[1px] rounded-md z-0"></div>
        <div className="relative z-10">
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
      </div>
    );
  }

  const isUserOwned = isOwnMessage();
  const reactionCounts = getReactionCounts();

  return (
<div className="flex flex-col relative z-20" ref={actionsRef} data-testid="message-actions">
  {/* Message action buttons with improved stacking context and layout */}
  <div className="flex space-x-2 opacity-90 hover:opacity-100 transition-opacity pointer-events-auto bg-transparent" role="toolbar" aria-label="Message actions">
        {/* Reply button with enhanced styling */}
        <button
          className="p-2 text-sm rounded-full bg-white dark:bg-dark-bg-hover 
                   text-primary dark:text-primary-hover hover:bg-gray-50 dark:hover:bg-dark-bg-active 
                   shadow-sm hover:shadow-md transition-all z-10"
          onClick={(e) => {
            e.stopPropagation();
            handleReply();
          }}
          aria-label="Reply to this message"
          title="Reply"
          tabIndex={0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        
        {/* Add reaction button - enhanced styling */}
        <div className="relative">
          <button
            className="p-2.5 text-sm rounded-full bg-white/90 dark:bg-dark-bg-hover/90 
                     text-primary dark:text-primary-hover hover:bg-white dark:hover:bg-dark-bg-active 
                     shadow-sm hover:shadow-md transition-all z-10"
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions(!showReactions);
            }}
            aria-label="Add reaction"
            aria-expanded={showReactions}
            aria-haspopup="menu"
            title="Add reaction"
            tabIndex={0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {showReactions && (
            <>
              {/* Backdrop to catch clicks outside the reactions menu */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowReactions(false)}
              />

              {/* Reaction picker with improved positioning and layout */}
              <div 
                className="absolute bottom-12 left-0 bg-white dark:bg-[#2D3136] shadow-xl rounded-lg p-3 z-50 border border-gray-100 dark:border-gray-700 animate-fadeIn" 
                role="menu"
                style={{ width: '240px' }}
                onClick={(e) => e.stopPropagation()}
                data-testid="reaction-picker"
              >
                <div className="flex flex-wrap gap-3 justify-center">
                  {availableReactions.map(item => (
                    <button
                      key={item.emoji}
                      className="w-11 h-11 flex items-center justify-center text-2xl bg-gray-50 dark:bg-[#1E1E1E]/70 hover:bg-gray-100 dark:hover:bg-[#1E1E1E] rounded-full transition-colors relative group shadow-sm hover:shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(item.emoji);
                      }}
                      aria-label={`React with ${item.label}`}
                      role="menuitem"
                      title={item.label}
                    >
                      <span className="transform group-hover:scale-125">{item.emoji}</span>
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* More actions button - only for own messages - enhanced styling */}
        {isUserOwned && (
          <div className="relative">
            <button
              className="p-2.5 text-sm rounded-full bg-white/90 dark:bg-dark-bg-hover/90 
                       text-primary dark:text-primary-hover hover:bg-white dark:hover:bg-dark-bg-active 
                       shadow-sm hover:shadow-md transition-all z-10"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              aria-label="More actions"
              aria-expanded={showActions}
              aria-haspopup="menu"
              title="More options"
              tabIndex={0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showActions && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute top-10 right-0 bg-white dark:bg-[#2D3136] shadow-lg rounded-lg overflow-hidden z-50 w-32 border border-gray-100 dark:border-gray-700 animate-fadeIn" role="menu">
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-[#128C7E] dark:text-[#00A884] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    aria-label="Edit message"
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    aria-label="Delete message"
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Improved reaction display with better spacing and sizing */}
      {reactionCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {reactionCounts.map(reaction => {
            // Find the label for this emoji
            const reactionInfo = availableReactions.find(r => r.emoji === reaction.emoji) || { label: 'Reaction' };
            
            return (
              <button
                key={reaction.emoji}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm
                  ${reaction.reacted 
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300 border border-primary/30' 
                    : 'bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/80'
                  } transition-colors hover:shadow-md hover:scale-105 transform-gpu`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReaction(reaction.emoji);
                }}
                aria-label={`${reactionInfo.label} reaction: ${reaction.count}`}
                aria-pressed={reaction.reacted}
                title={`${reactionInfo.label} (${reaction.count})`}
              >
                <span aria-hidden="true" className="mr-1.5 text-base leading-none">{reaction.emoji}</span>
                <span className="font-medium text-xs">{reaction.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

MessageActions.displayName = 'MessageActions';

export default MessageActions;
