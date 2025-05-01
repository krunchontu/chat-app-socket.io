import React, { forwardRef, useState, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useAuth } from '../common/AuthContext';
import MessageItem from './MessageItem';

/**
 * Virtualized MessageList component for rendering chat messages efficiently
 * Uses react-window for optimized rendering of large message lists
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
  const [listRef, setListRef] = useState(null);
  
  // Calculate a dynamic height for each message based on content
  const getMessageHeight = index => {
    const message = messages[index];
    if (!message) return 120; // Default height
    
    // Base height
    let height = 120;
    
    // Add height for each line of text (approximate)
    const textLength = message.text ? message.text.length : 0;
    const linesOfText = Math.ceil(textLength / 40); // Rough estimate
    height += Math.max(0, linesOfText - 1) * 20; // Add 20px per line after the first
    
    // Add height for reactions
    if (message.reactions && Object.keys(message.reactions).length > 0) {
      height += 40;
    }
    
    // Add height for reply
    if (message.parentId) {
      height += 45;
    }
    
    return height;
  };
  
  // Scroll to bottom when new messages arrive (if we're not loading older messages)
  useEffect(() => {
    if (listRef && !loadingOlder && messages.length > 0) {
      listRef.scrollToItem(messages.length - 1);
    }
  }, [listRef, messages.length, loadingOlder]);
  
  // Handle loading more messages when scrolled to top
  const handleItemsRendered = ({ visibleStartIndex }) => {
    // If scrolled near the top and we have more messages, load them
    if (visibleStartIndex <= 2 && hasMoreMessages && !loadingOlder) {
      const nextPage = pagination.currentPage + 1;
      loadMoreMessages(nextPage);
    }
  };

  // Render header content (loading indicator or load more button)
  const renderHeader = () => {
    if (loadingOlder) {
      return (
        <div 
          className="flex items-center justify-center p-4 bg-gray-50/80 dark:bg-dark-bg-hover/30 rounded-lg my-2 shadow-sm"
          aria-live="polite"
          role="status"
        >
          <div className="relative">
            <div className="w-8 h-8 border-2 border-t-primary border-r-primary/30 border-b-primary/10 border-l-primary/30 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
            </div>
          </div>
          <span className="ml-3 text-gray-700 dark:text-dark-text-secondary font-medium">Loading older messages...</span>
        </div>
      );
    }
    
    if (!loadingOlder && hasMoreMessages && messages.length > 0) {
      return (
        <button 
          className="flex items-center justify-center mx-auto mb-3 px-5 py-2.5 
                   bg-white dark:bg-dark-bg-hover text-primary dark:text-primary-300
                   hover:bg-gray-50 dark:hover:bg-dark-bg-active 
                   rounded-full text-sm font-medium transition-all duration-200 
                   shadow-sm hover:shadow-md gap-2 border border-gray-200 dark:border-dark-border-primary"
          onClick={() => {
            if (!loadingOlder) {
              const nextPage = pagination.currentPage + 1;
              loadMoreMessages(nextPage);
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          Load older messages
        </button>
      );
    }
    
    return null;
  };

  return (
    <div 
      className="flex-1 bg-gray-50 dark:bg-dark-bg-secondary transition-colors duration-300"
      ref={ref}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {/* Enhanced empty state when no messages */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center py-10 px-6 max-w-md animate-fadeIn">
            <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-700 dark:text-dark-text-primary mb-3">Start the conversation</h3>
            <p className="text-gray-500 dark:text-dark-text-tertiary mb-4">
              Send a message to begin chatting with other users. Your messages will appear here.
            </p>
            <div className="mt-6 w-16 h-1 bg-primary rounded-full mx-auto opacity-50"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Header content */}
          <div className="p-3 flex justify-center">
            {renderHeader()}
          </div>
          
          {/* Virtualized message list with dynamic sizing */}
          <div className="h-[calc(100%-60px)] px-1">
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={setListRef}
                  height={height}
                  width={width}
                  itemCount={messages.length}
                  itemSize={getMessageHeight}
                  itemKey={(index) => messages[index]?.id || index}
                  onItemsRendered={handleItemsRendered}
                  itemData={{
                    messages,
                    setReplyingTo,
                    currentUser: user?.username,
                    formatTime
                  }}
                >
                  {({ index, style, data }) => (
                    <MessageItem
                      key={messages[index]?.id || index}
                      message={messages[index]}
                      style={style}
                      onReply={setReplyingTo}
                      currentUser={data.currentUser}
                      formatTime={data.formatTime}
                      messages={messages}
                    />
                  )}
                </List>
              )}
            </AutoSizer>
          </div>
        </>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;
