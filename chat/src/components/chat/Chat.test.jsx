import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from './Chat';
import { ChatProvider } from '../../context/ChatContext';
import { AuthProvider } from '../common/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import * as notificationUtils from '../../utils/notificationUtils';

// Mock socket.io
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  };
  return jest.fn(() => mockSocket);
});

// Mock axios
jest.mock('axios');

// Mock emoji-picker-react
jest.mock('emoji-picker-react', () => {
  return function DummyEmojiPicker({ onEmojiClick }) {
    return (
      <div data-testid="emoji-picker">
        <button 
          data-testid="emoji-option" 
          onClick={() => onEmojiClick({ emoji: '😀' })}
        >
          😀
        </button>
      </div>
    );
  };
});

// Mock notification utilities
jest.mock('../../utils/notificationUtils', () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
  showMessageNotification: jest.fn(),
  getNotificationPreference: jest.fn().mockReturnValue(true),
  saveNotificationPreference: jest.fn()
}));

// Mock HeaderComponent to avoid rendering implementation details
jest.mock('../common/HeaderComponent', () => {
  return function MockHeader({ isConnected, onLogout }) {
    return (
      <div data-testid="header-component">
        <div>Connected: {isConnected.toString()}</div>
        <button data-testid="logout-button" onClick={onLogout}>Logout</button>
      </div>
    );
  };
});

// Mock ReplyingTo component
jest.mock('./ReplyingTo', () => {
  return function MockReplyingTo({ message, onCancel }) {
    return (
      <div data-testid="replying-to">
        <span>Replying to: {message.text}</span>
        <button data-testid="cancel-reply" onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

describe('Chat Component', () => {
  // Helper function for standard render with providers
  const renderChatWithProviders = () => {
    const mockUser = { username: 'testuser', id: 'user1' };
    const mockSocketState = {
      messages: [
        { id: 'msg1', text: 'Hello World', user: 'testuser', timestamp: new Date().toISOString() },
        { id: 'msg2', text: 'How are you?', user: 'otheruser', timestamp: new Date().toISOString() }
      ],
      socket: { emit: jest.fn() },
      isConnected: true,
      loading: false,
      error: null,
      onlineUsers: [
        { id: 'user1', username: 'testuser' },
        { id: 'user2', username: 'otheruser' }
      ],
      notifications: [
        { type: 'join', message: 'User joined', timestamp: new Date().toISOString() }
      ],
      pagination: {
        currentPage: 0,
        totalPages: 2,
        totalMessages: 10,
        limit: 20
      },
      hasMoreMessages: true,
      replyingTo: null
    };
    
    // Mock implementation of useChat hook inside ChatProvider
    const mockChatContext = {
      state: mockSocketState,
      dispatch: jest.fn(),
      loadMoreMessages: jest.fn(),
      editMessage: jest.fn(),
      deleteMessage: jest.fn(),
      replyToMessage: jest.fn(),
      toggleReaction: jest.fn(),
      clearError: jest.fn(),
      setReplyingTo: jest.fn()
    };
    
    return {
      user: userEvent.setup(),
      mockUser,
      mockChatContext,
      ...render(
        <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
          <ThemeProvider>
            <ChatProvider value={mockChatContext}>
              <Chat />
            </ChatProvider>
          </ThemeProvider>
        </AuthProvider>
      )
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Element.scrollTo
    Element.prototype.scrollTo = jest.fn();
    // Mock scrollHeight and clientHeight
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 1000
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 500
    });
  });

  it('renders chat interface with messages', async () => {
    renderChatWithProviders();
    
    // Chat container should be rendered
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
  });

  it('renders online users', async () => {
    renderChatWithProviders();
    
    // Online users section should show users
    expect(screen.getByText('Online Users (2)')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('otheruser')).toBeInTheDocument();
  });

  it('renders notifications', async () => {
    renderChatWithProviders();
    
    // Notification section should show notifications
    expect(screen.getByText('User joined')).toBeInTheDocument();
  });

  it('allows message input and sending', async () => {
    const { user, mockChatContext } = renderChatWithProviders();
    
    // Type a message and send it
    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'This is a test message');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);
    
    // Should emit message event
    expect(mockChatContext.state.socket.emit).toHaveBeenCalledWith(
      'message', 
      expect.objectContaining({ 
        text: 'This is a test message' 
      })
    );
  });

  it('sends message when pressing Enter', async () => {
    const { user, mockChatContext } = renderChatWithProviders();
    
    // Type a message and press Enter
    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'This is a test message{Enter}');
    
    // Should emit message event
    expect(mockChatContext.state.socket.emit).toHaveBeenCalledWith(
      'message', 
      expect.objectContaining({ 
        text: 'This is a test message' 
      })
    );
  });

  it('toggles emoji picker', async () => {
    const { user } = renderChatWithProviders();
    
    // Open emoji picker
    const emojiButton = screen.getByRole('button', { name: /insert emoji/i });
    await user.click(emojiButton);
    
    // Emoji picker should be visible
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    
    // Select an emoji
    const emojiOption = screen.getByTestId('emoji-option');
    await user.click(emojiOption);
    
    // Emoji should be added to input
    const input = screen.getByPlaceholderText('Type a message...');
    expect(input.value).toBe('😀');
  });

  it('handles notification toggle', async () => {
    const { user } = renderChatWithProviders();
    
    // Notifications are enabled by default in our mock
    const notificationToggle = screen.getByRole('button', { 
      name: /disable notifications/i 
    });
    expect(notificationToggle).toBeInTheDocument();
    
    // Toggle notifications off
    await user.click(notificationToggle);
    
    // Should call saveNotificationPreference
    expect(notificationUtils.saveNotificationPreference).toHaveBeenCalledWith(false);
  });

  it('shows error message when present', async () => {
    const mockSocketState = {
      messages: [],
      socket: { emit: jest.fn() },
      isConnected: true,
      loading: false,
      error: 'Connection failed',
      onlineUsers: [],
      notifications: [],
      pagination: {
        currentPage: 0,
        totalPages: 1
      },
      hasMoreMessages: false,
      replyingTo: null
    };
    
    const mockChatContext = {
      state: mockSocketState,
      dispatch: jest.fn(),
      loadMoreMessages: jest.fn(),
      clearError: jest.fn()
    };
    
    render(
      <AuthProvider value={{ user: { username: 'testuser' }, isAuthenticated: true }}>
        <ThemeProvider>
          <ChatProvider value={mockChatContext}>
            <Chat />
          </ChatProvider>
        </ThemeProvider>
      </AuthProvider>
    );
    
    // Error message should be displayed
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    const mockSocketState = {
      messages: [],
      socket: { emit: jest.fn() },
      isConnected: true,
      loading: true,
      error: null,
      onlineUsers: [],
      notifications: [],
      pagination: {
        currentPage: 0,
        totalPages: 1
      },
      hasMoreMessages: false,
      replyingTo: null
    };
    
    const mockChatContext = {
      state: mockSocketState,
      dispatch: jest.fn(),
      loadMoreMessages: jest.fn()
    };
    
    render(
      <AuthProvider value={{ user: { username: 'testuser' }, isAuthenticated: true }}>
        <ThemeProvider>
          <ChatProvider value={mockChatContext}>
            <Chat />
          </ChatProvider>
        </ThemeProvider>
      </AuthProvider>
    );
    
    // Loading message should be displayed
    expect(screen.getByText('Loading message history...')).toBeInTheDocument();
  });
});
