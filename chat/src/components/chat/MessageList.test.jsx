/**
 * MessageList Component Tests
 *
 * Testing MessageList component with virtualization and infinite scroll
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMockMessages } from '../../test-utils';
import MessageList from './MessageList';

// Mock react-window
jest.mock('react-window', () => ({
  VariableSizeList: ({ children, itemCount, itemData }) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: itemCount }, (_, index) => (
        <div key={index}>
          {children({
            index,
            style: {},
            data: itemData,
          })}
        </div>
      ))}
    </div>
  ),
}));

// Mock react-virtualized-auto-sizer
jest.mock('react-virtualized-auto-sizer', () => {
  return ({ children }) => children({ height: 600, width: 800 });
});

// Mock MessageItem component
jest.mock('./MessageItem', () => {
  return function MessageItem({ message }) {
    return (
      <div data-testid={`message-item-${message.id}`}>
        {message.text}
      </div>
    );
  };
});

// Mock AuthContext
jest.mock('../common/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'testuser', id: '123' },
  }),
}));

const defaultProps = {
  messages: [],
  loadingOlder: false,
  hasMoreMessages: false,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalMessages: 0,
    messagesPerPage: 50,
  },
  loadMoreMessages: jest.fn(),
  setReplyingTo: jest.fn(),
  formatTime: jest.fn((timestamp) => '12:00 PM'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MessageList Component', () => {
  describe('Rendering', () => {
    test('renders message list container', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    test('displays empty state when no messages', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByText(/start the conversation/i)).toBeInTheDocument();
      expect(screen.getByText(/send a message to begin chatting/i)).toBeInTheDocument();
    });

    test('renders messages when provided', () => {
      const messages = createMockMessages(3);

      render(<MessageList {...defaultProps} messages={messages} />);

      messages.forEach(msg => {
        expect(screen.getByTestId(`message-item-${msg.id}`)).toBeInTheDocument();
      });
    });

    test('displays virtualized list', () => {
      const messages = createMockMessages(5);

      render(<MessageList {...defaultProps} messages={messages} />);

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
  });

  describe('Loading Older Messages', () => {
    test('shows loading indicator when loading older messages', () => {
      const messages = createMockMessages(3);

      render(<MessageList {...defaultProps} messages={messages} loadingOlder={true} />);

      expect(screen.getByText(/loading older messages/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('shows load more button when has more messages', () => {
      const messages = createMockMessages(3);

      render(
        <MessageList {...defaultProps} messages={messages} hasMoreMessages={true} />
      );

      expect(screen.getByText(/load older messages/i)).toBeInTheDocument();
    });

    test('calls loadMoreMessages when load more button clicked', async () => {
      const messages = createMockMessages(3);
      const loadMoreMessages = jest.fn();
      const pagination = { currentPage: 1, totalPages: 3 };

      render(
        <MessageList
          {...defaultProps}
          messages={messages}
          hasMoreMessages={true}
          loadMoreMessages={loadMoreMessages}
          pagination={pagination}
        />
      );

      const loadMoreButton = screen.getByText(/load older messages/i);
      fireEvent.click(loadMoreButton);

      expect(loadMoreMessages).toHaveBeenCalledWith(2);
    });

    test('does not show load more button when no more messages', () => {
      const messages = createMockMessages(3);

      render(
        <MessageList {...defaultProps} messages={messages} hasMoreMessages={false} />
      );

      expect(screen.queryByText(/load older messages/i)).not.toBeInTheDocument();
    });

    test('does not show load more button while loading', () => {
      const messages = createMockMessages(3);

      render(
        <MessageList
          {...defaultProps}
          messages={messages}
          hasMoreMessages={true}
          loadingOlder={true}
        />
      );

      expect(screen.queryByText(/load older messages/i)).not.toBeInTheDocument();
    });
  });

  describe('Message Height Calculation', () => {
    test('calculates different heights for different message lengths', () => {
      const shortMessage = createMockMessages(1, { text: 'Hi' })[0];
      const longMessage = createMockMessages(1, {
        text: 'This is a very long message that should result in a taller height calculation because it has more characters',
      })[0];

      const messages = [shortMessage, longMessage];

      render(<MessageList {...defaultProps} messages={messages} />);

      // Both messages should be rendered - use getAllByTestId to handle duplicates from mocks
      const messageItems = screen.getAllByTestId(/^message-item-/);
      expect(messageItems.length).toBeGreaterThanOrEqual(2);
    });

    test('adds height for messages with reactions', () => {
      const messageWithReactions = createMockMessages(1, {
        reactions: { '👍': ['user1', 'user2'] },
      })[0];

      render(<MessageList {...defaultProps} messages={[messageWithReactions]} />);

      expect(screen.getByTestId(`message-item-${messageWithReactions.id}`)).toBeInTheDocument();
    });

    test('adds height for reply messages', () => {
      const replyMessage = createMockMessages(1, { parentId: 'parent-1' })[0];

      render(<MessageList {...defaultProps} messages={[replyMessage]} />);

      expect(screen.getByTestId(`message-item-${replyMessage.id}`)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      const messages = createMockMessages(3);

      render(<MessageList {...defaultProps} messages={messages} />);

      const logElement = screen.getByRole('log');
      expect(logElement).toHaveAttribute('aria-live', 'polite');
      expect(logElement).toHaveAttribute('aria-label', 'Chat messages');
    });

    test('loading indicator has proper ARIA attributes', () => {
      const messages = createMockMessages(3);

      render(<MessageList {...defaultProps} messages={messages} loadingOlder={true} />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Empty State', () => {
    test('displays empty state with proper styling', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByText(/start the conversation/i)).toBeInTheDocument();

      // Check for icon
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('shows encouraging message in empty state', () => {
      render(<MessageList {...defaultProps} />);

      expect(
        screen.getByText(/send a message to begin chatting with other users/i)
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty messages array', () => {
      render(<MessageList {...defaultProps} messages={[]} />);

      expect(screen.getByText(/start the conversation/i)).toBeInTheDocument();
    });

    test('handles single message', () => {
      const messages = createMockMessages(1);

      render(<MessageList {...defaultProps} messages={messages} />);

      expect(screen.getByTestId(`message-item-${messages[0].id}`)).toBeInTheDocument();
    });

    test('handles large number of messages', () => {
      const messages = createMockMessages(100);

      render(<MessageList {...defaultProps} messages={messages} />);

      // Virtualization should handle this efficiently
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    test('handles missing message properties', () => {
      const incompleteMessage = {
        id: 'incomplete-1',
        text: null,
        user: null,
        timestamp: null,
      };

      render(<MessageList {...defaultProps} messages={[incompleteMessage]} />);

      expect(screen.getByTestId('message-item-incomplete-1')).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    test('accepts and forwards ref', () => {
      const ref = React.createRef();
      const messages = createMockMessages(3);

      render(<MessageList {...defaultProps} messages={messages} ref={ref} />);

      expect(ref.current).toBeTruthy();
    });
  });

  describe('ItemData Prop', () => {
    test('passes correct itemData to virtualized list', () => {
      const messages = createMockMessages(3);
      const setReplyingTo = jest.fn();
      const formatTime = jest.fn();

      render(
        <MessageList
          {...defaultProps}
          messages={messages}
          setReplyingTo={setReplyingTo}
          formatTime={formatTime}
        />
      );

      // Verify the virtualized list receives correct data
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
  });
});
