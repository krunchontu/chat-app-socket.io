import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageList from './MessageList';
import { AuthProvider } from '../common/AuthContext';

// Mock the MessageActions component 
jest.mock('./MessageActions', () => {
  return function MockMessageActions({ message, onReply }) {
    return (
      <div data-testid={`message-actions-${message.id}`}>
        <button 
          data-testid={`reply-button-${message.id}`}
          onClick={() => onReply(message)}
        >
          Reply
        </button>
      </div>
    );
  };
});

describe('MessageList Component', () => {
  // Mock data
  const mockUser = { username: 'testuser', id: 'user1' };
  const mockMessages = [
    { id: 'msg1', text: 'Hello World', user: 'testuser', timestamp: '2022-01-01T12:00:00Z' },
    { id: 'msg2', text: 'How are you?', user: 'otheruser', timestamp: '2022-01-01T12:01:00Z' },
    { 
      id: 'msg3', 
      text: 'This is a reply', 
      user: 'testuser', 
      parentId: 'msg2',
      timestamp: '2022-01-01T12:02:00Z' 
    }
  ];
  
  const mockPagination = {
    currentPage: 0,
    totalPages: 2,
    totalMessages: 10,
    limit: 20
  };
  
  // Mock functions
  const mockLoadMoreMessages = jest.fn();
  const mockSetReplyingTo = jest.fn();
  const mockFormatTime = jest.fn().mockImplementation(() => '12:00 PM');
  
  // Helper function to render with all required props
  const renderMessageList = (props = {}) => {
    const ref = React.createRef();
    return {
      ref,
      ...render(
        <AuthProvider value={{ user: mockUser }}>
          <MessageList
            ref={ref}
            messages={mockMessages}
            loadingOlder={false}
            hasMoreMessages={true}
            pagination={mockPagination}
            loadMoreMessages={mockLoadMoreMessages}
            setReplyingTo={mockSetReplyingTo}
            formatTime={mockFormatTime}
            {...props}
          />
        </AuthProvider>
      )
    };
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders messages correctly', () => {
    renderMessageList();
    
    // Check message texts are displayed
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
    expect(screen.getByText('This is a reply')).toBeInTheDocument();
    
    // Check usernames are displayed
    expect(screen.getByText('testuser:')).toBeInTheDocument();
    expect(screen.getByText('otheruser:')).toBeInTheDocument();
    
    // Check timestamps are formatted
    expect(mockFormatTime).toHaveBeenCalledTimes(3);
  });
  
  it('shows reply indicator for replies', () => {
    renderMessageList();
    
    // The third message is a reply to the second message
    expect(screen.getByText('Replying to otheruser')).toBeInTheDocument();
  });
  
  it('displays load more button when hasMoreMessages is true', () => {
    renderMessageList({ hasMoreMessages: true });
    
    // Check load more button is displayed
    const loadMoreButton = screen.getByRole('button', { name: /load older messages/i });
    expect(loadMoreButton).toBeInTheDocument();
    
    // Click load more button
    fireEvent.click(loadMoreButton);
    
    // loadMoreMessages should be called with the next page
    expect(mockLoadMoreMessages).toHaveBeenCalledWith(1);
  });
  
  it('does not display load more button when hasMoreMessages is false', () => {
    renderMessageList({ hasMoreMessages: false });
    
    // Load more button should not be displayed
    expect(screen.queryByRole('button', { name: /load older messages/i })).not.toBeInTheDocument();
  });
  
  it('shows loading indicator when loadingOlder is true', () => {
    renderMessageList({ loadingOlder: true });
    
    // Check loading indicator is displayed
    expect(screen.getByText('Loading older messages...')).toBeInTheDocument();
  });
  
  it('applies correct classes to own messages', () => {
    renderMessageList();
    
    // First message is from current user (testuser)
    const messageContainer = screen.getByTestId('message-msg1');
    
    // Check that the correct data attribute is set
    expect(messageContainer).toHaveAttribute('data-is-own', 'true');
    // Check class
    expect(messageContainer).toHaveClass('own-message');
  });
  
  it('applies correct classes to reply messages', () => {
    renderMessageList();
    
    // Third message is a reply
    const replyContainer = screen.getByTestId('message-msg3');
    
    // Check that the correct data attribute is set
    expect(replyContainer).toHaveAttribute('data-is-reply', 'true');
    // Check class
    expect(replyContainer).toHaveClass('is-reply');
  });
  
  it('shows "No messages" when messages array is empty', () => {
    renderMessageList({ messages: [] });
    
    // Check "No messages" text is displayed
    expect(screen.getByText('No messages yet. Be the first to say hello!')).toBeInTheDocument();
  });
  
  it('calls setReplyingTo when reply button is clicked', async () => {
    renderMessageList();
    
    // Click reply button on first message
    const replyButton = screen.getByTestId('reply-button-msg1');
    await userEvent.click(replyButton);
    
    // setReplyingTo should be called with the message
    expect(mockSetReplyingTo).toHaveBeenCalledWith(mockMessages[0]);
  });
});
