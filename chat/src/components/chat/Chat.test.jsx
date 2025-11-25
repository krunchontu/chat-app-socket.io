/**
 * Chat Component Tests
 *
 * Testing Chat component with Socket.IO mocking and real-time interactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { createMockSocket, createMockMessage, createMockMessages } from '../../test-utils';
import ChatApp from './Chat';
import * as toastUtils from '../../utils/toastUtils';
import * as loggerUtils from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/toastUtils');
jest.mock('../../utils/logger');
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

// Mock child components to simplify testing
jest.mock('./MessageList', () => {
  return function MessageList({ messages }) {
    return (
      <div data-testid="message-list">
        {messages.map(msg => (
          <div key={msg.id} data-testid={`message-${msg.id}`}>
            {msg.text}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('./ChatInput', () => {
  return function ChatInput({ inputText, setInputText, onMessageSend, isConnected }) {
    return (
      <div data-testid="chat-input">
        <input
          data-testid="message-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={!isConnected}
        />
        <button data-testid="send-button" onClick={onMessageSend} disabled={!isConnected}>
          Send
        </button>
      </div>
    );
  };
});

jest.mock('./ChatSidebar', () => {
  return function ChatSidebar({ onlineUsers }) {
    return (
      <div data-testid="chat-sidebar">
        Online: {onlineUsers.length}
      </div>
    );
  };
});

jest.mock('../common/HeaderComponent', () => {
  return function HeaderComponent({ isConnected, onLogout }) {
    return (
      <div data-testid="header">
        <span data-testid="connection-status">{isConnected ? 'Connected' : 'Disconnected'}</span>
        <button data-testid="logout-button" onClick={onLogout}>Logout</button>
      </div>
    );
  };
});

jest.mock('../common/ConnectionStatusIndicator', () => {
  return function ConnectionStatusIndicator() {
    return <div data-testid="connection-indicator" />;
  };
});

jest.mock('../common/SocketDebugPanel', () => {
  return function SocketDebugPanel() {
    return <div data-testid="socket-debug-panel" />;
  };
});

jest.mock('./ReplyingTo', () => {
  return function ReplyingTo({ message, onCancel }) {
    return (
      <div data-testid="replying-to">
        Replying to: {message.text}
        <button data-testid="cancel-reply" onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

// Mock hooks
const mockSetReplyingTo = jest.fn();
const mockSendMessage = jest.fn();
const mockReplyToMessage = jest.fn();
const mockLoadMoreMessages = jest.fn();
const mockFetchInitialMessages = jest.fn();

const mockUseChatReturn = {
  messages: [],
  socket: null,
  isConnected: false,
  loadingMessages: false,
  messageError: null,
  onlineUsers: [],
  notifications: [],
  pagination: { currentPage: 1, totalPages: 1, totalMessages: 0, messagesPerPage: 50 },
  hasMoreMessages: false,
  replyingTo: null,
  loadMoreMessages: mockLoadMoreMessages,
  fetchInitialMessages: mockFetchInitialMessages,
  replyToMessage: mockReplyToMessage,
  sendMessage: mockSendMessage,
  setReplyingTo: mockSetReplyingTo,
};

const mockUseChat = jest.fn(() => mockUseChatReturn);

jest.mock('../../context/ChatContext', () => ({
  useChat: mockUseChat,
}));

jest.mock('../common/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'testuser', id: '123' },
  }),
}));

jest.mock('../../hooks/useChatScroll', () => {
  return jest.fn(() => ({
    chatThreadRef: { current: null },
    loadingOlder: false,
    scrollToBottom: jest.fn(),
    setLoadingOlder: jest.fn(),
  }));
});

jest.mock('../../hooks/useChatNotificationsUI', () => {
  return jest.fn(() => ({
    notificationsEnabled: true,
    toggleNotifications: jest.fn(),
  }));
});

beforeEach(() => {
  loggerUtils.createLogger.mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  });

  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('Chat Component', () => {
  describe('Rendering', () => {
    test('renders main chat interface', () => {
      render(<ChatApp />);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
      expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
    });

    test('displays connection status', () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: true,
      });

      render(<ChatApp />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    test('shows loading state when loading messages', () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        loadingMessages: true,
      });

      render(<ChatApp />);

      expect(screen.getByText(/loading message history/i)).toBeInTheDocument();
    });

    test('displays error message when message error exists', () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        messageError: 'Failed to load messages',
      });

      render(<ChatApp />);

      expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
    });

    test('shows notification toggle button', () => {
      render(<ChatApp />);

      const notificationButton = screen.getByLabelText(/notifications on/i);
      expect(notificationButton).toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    test('handles sending a regular message', async () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: true,
        socket: createMockSocket(),
      });

      render(<ChatApp />);

      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Hello world' } });
      });

      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(mockSendMessage).toHaveBeenCalledWith('Hello world');
      expect(input).toHaveValue('');
    });

    test('prevents sending empty messages', async () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: true,
        socket: createMockSocket(),
      });

      render(<ChatApp />);

      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        fireEvent.change(input, { target: { value: '   ' } });
      });

      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(toastUtils.showErrorToast).toHaveBeenCalledWith('Message cannot be empty');
    });

    test('prevents sending messages over 500 characters', async () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: true,
        socket: createMockSocket(),
      });

      render(<ChatApp />);

      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      const longMessage = 'a'.repeat(501);

      await act(async () => {
        fireEvent.change(input, { target: { value: longMessage } });
      });

      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(toastUtils.showErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Message is too long')
      );
    });

    test('prevents sending when not connected', async () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: false,
        socket: null,
      });

      render(<ChatApp />);

      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Reply Functionality', () => {
    test('handles sending a reply message', async () => {
      const replyMessage = createMockMessage({ id: 'msg-1', text: 'Original message' });

      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: true,
        socket: createMockSocket(),
        replyingTo: replyMessage,
      });

      render(<ChatApp />);

      expect(screen.getByTestId('replying-to')).toBeInTheDocument();
      expect(screen.getByText(/replying to: original message/i)).toBeInTheDocument();

      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'This is a reply' } });
      });

      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(mockReplyToMessage).toHaveBeenCalledWith('msg-1', 'This is a reply');
      expect(input).toHaveValue('');
    });

    test('cancels reply when cancel button clicked', async () => {
      const replyMessage = createMockMessage({ id: 'msg-1', text: 'Original message' });

      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        replyingTo: replyMessage,
      });

      render(<ChatApp />);

      const cancelButton = screen.getByTestId('cancel-reply');

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(mockSetReplyingTo).toHaveBeenCalledWith(null);
    });
  });

  describe('Message Synchronization', () => {
    test('auto-syncs messages when connected', async () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: true,
      });

      render(<ChatApp />);

      // Fast-forward time by 10 seconds to trigger auto-sync
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockFetchInitialMessages).toHaveBeenCalled();
      });
    });

    test('cleans up sync interval on unmount', async () => {
      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        isConnected: true,
      });

      const { unmount } = render(<ChatApp />);

      unmount();

      // Verify no memory leaks by advancing timers after unmount
      await act(async () => {
        jest.advanceTimersByTime(20000);
      });

      // fetchInitialMessages should only be called during initial mount
      expect(mockFetchInitialMessages).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logout', () => {
    test('disconnects socket on logout', async () => {
      const mockSocket = createMockSocket();

      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        socket: mockSocket,
      });

      render(<ChatApp />);

      const logoutButton = screen.getByTestId('logout-button');

      await act(async () => {
        fireEvent.click(logoutButton);
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Message Display', () => {
    test('renders messages from context', () => {
      const messages = createMockMessages(3);

      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        messages,
      });

      render(<ChatApp />);

      messages.forEach(msg => {
        expect(screen.getByTestId(`message-${msg.id}`)).toBeInTheDocument();
      });
    });

    test('displays online users count in sidebar', () => {
      const onlineUsers = ['user1', 'user2', 'user3'];

      mockUseChat.mockReturnValueOnce({
        ...mockUseChatReturn,
        onlineUsers,
      });

      render(<ChatApp />);

      expect(screen.getByText('Online: 3')).toBeInTheDocument();
    });
  });
});
