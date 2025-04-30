import React, { forwardRef, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
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
  const messageHeight = 80; // Default height estimate
  
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
          className="flex items-center justify-center p-2 bg-gray-100/70 dark:bg-dark-bg-hover/30 rounded-md my-1"
          aria-live="polite"
          role="status"
        >
          <div className="w-5 h-5 border-2 border-t-primary border-r-transparent border-l-transparent border-b-transparent rounded-full animate-spin mr-2" aria-hidden="true"></div>
          <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Loading older messages...</span>
        </div>
      );
    }
    
    if (!loadingOlder && hasMoreMessages && messages.length > 0) {
      return (
        <button 
          className="mx-auto mb-3 px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-secondary rounded-md text-sm transition-colors duration-150"
          onClick={() => {
            if (!loadingOlder) {
              const nextPage = pagination.currentPage + 1;
              loadMoreMessages(nextPage);
            }
          }}
        >
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
      {/* Show empty state when no messages */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center py-8 px-4 text-gray-500 dark:text-dark-text-tertiary italic">
            No messages yet. Be the first to say hello!
          </div>
        </div>
      ) : (
        <>
          {/* Header content */}
          <div className="p-3">
            {renderHeader()}
          </div>
          
          {/* Virtualized message list */}
          <div style={{ height: 'calc(100% - 50px)' }}>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={setListRef}
                  height={height}
                  width={width}
                  itemCount={messages.length}
                  itemSize={messageHeight}
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
