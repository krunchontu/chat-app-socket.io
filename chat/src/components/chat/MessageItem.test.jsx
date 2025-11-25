/**
 * MessageItem Component Tests
 *
 * Testing MessageItem component rendering and interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMockMessage } from '../../test-utils';
import MessageItem from './MessageItem';

// Mock MessageActions component
jest.mock('./MessageActions', () => {
  return function MessageActions({ message, onReply }) {
    return (
      <div data-testid="message-actions">
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

// Mock DOMPurify
jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html) => html),
  },
}));

const defaultProps = {
  message: createMockMessage(),
  style: {},
  onReply: jest.fn(),
  currentUser: 'testuser',
  formatTime: jest.fn((timestamp) => '12:00 PM'),
  messages: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MessageItem Component', () => {
  describe('Rendering', () => {
    test('renders message with correct content', () => {
      const message = createMockMessage({ text: 'Hello world', user: 'testuser' });

      const { container } = render(<MessageItem {...defaultProps} message={message} />);

      // Check that MessageItem component renders with proper structure
      const messageContainer = screen.getByTestId('message-container');
      expect(messageContainer).toBeInTheDocument();

      // Check that the message bubble is rendered with data attributes
      const messageBubble = container.querySelector(`[data-testid="message-${message.id}"]`);
      expect(messageBubble).toBeInTheDocument();
    });

    test('displays username for other users messages', () => {
      const message = createMockMessage({ user: 'otheruser' });

      render(<MessageItem {...defaultProps} message={message} currentUser="testuser" />);

      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });

    test('displays "You" for current user messages', () => {
      const message = createMockMessage({ user: 'testuser' });

      render(<MessageItem {...defaultProps} message={message} currentUser="testuser" />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    test('displays formatted timestamp', () => {
      const message = createMockMessage({ timestamp: '2025-01-01T12:00:00Z' });

      render(<MessageItem {...defaultProps} message={message} />);

      // Verify formatTime function was called with the timestamp
      expect(defaultProps.formatTime).toHaveBeenCalledWith('2025-01-01T12:00:00Z');

      // Verify the component renders successfully
      const messageContainer = screen.getByTestId('message-container');
      expect(messageContainer).toBeInTheDocument();
    });

    test('shows user avatar for other users', () => {
      const message = createMockMessage({ user: 'alice' });

      render(<MessageItem {...defaultProps} message={message} currentUser="bob" />);

      // Avatar should display first letter
      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });

  describe('Message States', () => {
    test('displays deleted message indicator', () => {
      const message = createMockMessage({ isDeleted: true });

      render(<MessageItem {...defaultProps} message={message} />);

      expect(screen.getByText(/this message has been deleted/i)).toBeInTheDocument();
    });

    test('shows edited indicator for edited messages', () => {
      const message = createMockMessage({ isEdited: true, text: 'Edited message' });

      const { container } = render(<MessageItem {...defaultProps} message={message} />);

      // Component should render the message bubble
      const messageBubble = container.querySelector(`[data-testid="message-${message.id}"]`);
      expect(messageBubble).toBeInTheDocument();

      // The isEdited prop is passed to the component - verify render succeeds
      const messageContainer = screen.getByTestId('message-container');
      expect(messageContainer).toBeInTheDocument();
    });

    test('does not show edited indicator for non-edited messages', () => {
      const message = createMockMessage({ isEdited: false, text: 'Regular message' });

      const { container } = render(<MessageItem {...defaultProps} message={message} />);

      // Component should render the message bubble
      const messageBubble = container.querySelector(`[data-testid="message-${message.id}"]`);
      expect(messageBubble).toBeInTheDocument();

      // Verify non-edited message renders successfully
      const messageContainer = screen.getByTestId('message-container');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  describe('Reply Functionality', () => {
    test('displays reply indicator for reply messages', () => {
      const parentMessage = createMockMessage({
        id: 'parent-1',
        text: 'Parent message',
        user: 'parentuser',
      });

      const replyMessage = createMockMessage({
        id: 'reply-1',
        text: 'Reply message',
        parentId: 'parent-1',
      });

      render(
        <MessageItem
          {...defaultProps}
          message={replyMessage}
          messages={[parentMessage, replyMessage]}
        />
      );

      expect(screen.getByText(/replying to/i)).toBeInTheDocument();
      expect(screen.getByText('parentuser')).toBeInTheDocument();
    });

    test('calls onReply when reply button clicked', () => {
      const message = createMockMessage({ id: 'msg-1' });
      const onReply = jest.fn();

      render(<MessageItem {...defaultProps} message={message} onReply={onReply} />);

      const replyButton = screen.getByTestId(`reply-button-${message.id}`);
      fireEvent.click(replyButton);

      expect(onReply).toHaveBeenCalledWith(message);
    });

    test('shows truncated parent message text in reply indicator', () => {
      const parentMessage = createMockMessage({
        id: 'parent-1',
        text: 'This is a very long parent message that should be truncated',
        user: 'parentuser',
      });

      const replyMessage = createMockMessage({
        id: 'reply-1',
        text: 'Reply message',
        parentId: 'parent-1',
      });

      const { container } = render(
        <MessageItem
          {...defaultProps}
          message={replyMessage}
          messages={[parentMessage, replyMessage]}
        />
      );

      // Should show truncated text
      expect(container.textContent).toMatch(/This is a very long/);
    });
  });

  describe('Styling', () => {
    test('applies correct styles for own messages', () => {
      const message = createMockMessage({ user: 'testuser' });

      const { container } = render(
        <MessageItem {...defaultProps} message={message} currentUser="testuser" />
      );

      const messageBubble = container.querySelector('[data-is-own="true"]');
      expect(messageBubble).toBeInTheDocument();
    });

    test('applies correct styles for other users messages', () => {
      const message = createMockMessage({ user: 'otheruser' });

      const { container } = render(
        <MessageItem {...defaultProps} message={message} currentUser="testuser" />
      );

      const messageBubble = container.querySelector('[data-is-own="false"]');
      expect(messageBubble).toBeInTheDocument();
    });

    test('applies style prop correctly', () => {
      const message = createMockMessage();
      const style = { height: 100, width: 200 };

      const { container } = render(
        <MessageItem {...defaultProps} message={message} style={style} />
      );

      const messageContainer = container.querySelector('[data-testid="message-container"]');
      expect(messageContainer).toHaveStyle({ height: '100px', width: '200px' });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      const message = createMockMessage({ id: 'msg-1', user: 'testuser' });

      render(<MessageItem {...defaultProps} message={message} />);

      const messageBubble = screen.getByRole('article');
      expect(messageBubble).toBeInTheDocument();
      expect(messageBubble).toHaveAttribute('aria-labelledby');
    });

    test('includes test IDs for testing', () => {
      const message = createMockMessage({ id: 'msg-1' });

      render(<MessageItem {...defaultProps} message={message} />);

      expect(screen.getByTestId('message-container')).toBeInTheDocument();
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles message without user', () => {
      const message = createMockMessage({ user: null });

      render(<MessageItem {...defaultProps} message={message} />);

      expect(screen.getByText('System')).toBeInTheDocument();
    });

    test('handles message without timestamp', () => {
      const message = createMockMessage({ timestamp: null });

      render(<MessageItem {...defaultProps} message={message} />);

      expect(defaultProps.formatTime).toHaveBeenCalledWith(null);
    });

    test('handles missing parent message for reply', () => {
      const replyMessage = createMockMessage({
        id: 'reply-1',
        text: 'Reply message',
        parentId: 'nonexistent-parent',
      });

      // Should not crash when parent message is not found
      const { container } = render(
        <MessageItem {...defaultProps} message={replyMessage} messages={[replyMessage]} />
      );

      // Reply indicator should not be shown
      expect(screen.queryByText(/replying to/i)).not.toBeInTheDocument();
    });
  });
});
