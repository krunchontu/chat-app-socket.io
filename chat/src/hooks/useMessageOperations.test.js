/**
 * useMessageOperations Hook Tests
 *
 * Testing message operations hook (send, edit, delete, react, reply)
 */

import { renderHook, act } from '@testing-library/react';
import useMessageOperations from './useMessageOperations';
import { createMockSocket } from '../test-utils';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('../utils/toastUtils', () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
  showInfoToast: jest.fn(),
}));

jest.mock('../utils/offlineQueue', () => ({
  addToQueue: jest.fn(),
  processQueue: jest.fn(),
  queueMessage: jest.fn(),
  createOptimisticMessage: jest.fn((text, username) => ({
    id: 'temp-' + Date.now(),
    tempId: 'temp-' + Date.now(),
    text,
    user: username,
    timestamp: Date.now(),
    isPending: true,
  })),
  replaceOptimisticMessage: jest.fn(),
}));

jest.mock('../components/common/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'testuser', id: '123' },
  }),
}));

describe('useMessageOperations', () => {
  let mockSocket;
  let mockDispatchMessages;
  let mockDispatchUi;
  let mockEmitEvent;

  beforeEach(() => {
    mockSocket = createMockSocket();
    mockDispatchMessages = jest.fn();
    mockDispatchUi = jest.fn();
    mockEmitEvent = jest.fn();
    jest.clearAllMocks();
  });

  const defaultProps = {
    socket: mockSocket,
    isConnected: true,
    isOnline: true,
    dispatchMessages: mockDispatchMessages,
    dispatchUi: mockDispatchUi,
    messages: [],
    emitEvent: mockEmitEvent,
  };

  describe('Send Message', () => {
    test('sendMessage emits socket event when connected', () => {
      const { result } = renderHook(() =>
        useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        )
      );

      act(() => {
        result.current.sendMessage('Hello world');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sendMessage',
        expect.objectContaining({
          text: 'Hello world',
        })
      );
    });

    test('sendMessage creates optimistic message', () => {
      const { result } = renderHook(() => useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        ));

      act(() => {
        result.current.sendMessage('Test message');
      });

      expect(mockDispatchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_MESSAGE',
          payload: expect.objectContaining({
            text: 'Test message',
            pending: true,
          }),
        })
      );
    });

    test('sendMessage queues message when offline', () => {
      const { result } = renderHook(() =>
        useMessageOperations(
          mockSocket,
          true, // isConnected
          false, // isOnline - OFFLINE
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        )
      );

      const { addToQueue } = require('../utils/offlineQueue');

      act(() => {
        result.current.sendMessage('Offline message');
      });

      expect(addToQueue).toHaveBeenCalled();
    });

    test('sendMessage does not emit when not connected', () => {
      const { result } = renderHook(() =>
        useMessageOperations(
          mockSocket,
          false, // isConnected - DISCONNECTED
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        )
      );

      act(() => {
        result.current.sendMessage('Test');
      });

      // Should not emit via socket
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Edit Message', () => {
    test('editMessage emits socket event', () => {
      const { result } = renderHook(() => useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        ));

      act(() => {
        result.current.editMessage('msg-1', 'Edited text');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'editMessage',
        expect.objectContaining({
          messageId: 'msg-1',
          newText: 'Edited text',
        })
      );
    });

    test('editMessage updates local state optimistically', () => {
      const { result } = renderHook(() => useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        ));

      act(() => {
        result.current.editMessage('msg-1', 'Edited text');
      });

      expect(mockDispatchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_MESSAGE',
          payload: expect.objectContaining({
            id: 'msg-1',
            text: 'Edited text',
            isEdited: true,
          }),
        })
      );
    });
  });

  describe('Delete Message', () => {
    test('deleteMessage emits socket event', () => {
      const { result } = renderHook(() => useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        ));

      act(() => {
        result.current.deleteMessage('msg-1');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('deleteMessage', 'msg-1');
    });

    test('deleteMessage updates local state optimistically', () => {
      const { result } = renderHook(() => useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        ));

      act(() => {
        result.current.deleteMessage('msg-1');
      });

      expect(mockDispatchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELETE_MESSAGE',
          payload: 'msg-1',
        })
      );
    });
  });

  describe('Reply to Message', () => {
    test('replyToMessage sends message with parentId', () => {
      const { result } = renderHook(() => useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        ));

      act(() => {
        result.current.replyToMessage('parent-1', 'Reply text');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sendMessage',
        expect.objectContaining({
          text: 'Reply text',
          parentId: 'parent-1',
        })
      );
    });

    test('replyToMessage clears replying state', () => {
      const { result } = renderHook(() => useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        ));

      act(() => {
        result.current.replyToMessage('parent-1', 'Reply');
      });

      expect(mockDispatchUi).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CLEAR_REPLYING_TO',
        })
      );
    });
  });

  describe('Toggle Reaction', () => {
    test('toggleReaction adds reaction to message', () => {
      const messagesWithMessage = [
        { id: 'msg-1', text: 'Test', reactions: {} },
      ];

      const { result } = renderHook(() =>
        useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          messagesWithMessage, // pass messages with message
          mockEmitEvent
        )
      );

      act(() => {
        result.current.toggleReaction('msg-1', '👍');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'toggleReaction',
        expect.objectContaining({
          messageId: 'msg-1',
          reaction: '👍',
        })
      );
    });

    test('toggleReaction updates local state', () => {
      const messagesWithMessage = [
        { id: 'msg-1', text: 'Test', reactions: {} },
      ];

      const { result } = renderHook(() =>
        useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          messagesWithMessage, // pass messages with message
          mockEmitEvent
        )
      );

      act(() => {
        result.current.toggleReaction('msg-1', '❤️');
      });

      expect(mockDispatchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_MESSAGE',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('handles null socket gracefully', () => {
      const { result } = renderHook(() =>
        useMessageOperations(
          null, // socket - NULL
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        )
      );

      expect(() => {
        act(() => {
          result.current.sendMessage('Test');
        });
      }).not.toThrow();
    });

    test('handles empty message text', () => {
      const { result } = renderHook(() =>
        useMessageOperations(
          mockSocket,
          true, // isConnected
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        )
      );

      act(() => {
        result.current.sendMessage('');
      });

      // Should not emit empty messages
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('handles message operations when disconnected', () => {
      const { result } = renderHook(() =>
        useMessageOperations(
          mockSocket,
          false, // isConnected - DISCONNECTED
          true, // isOnline
          mockDispatchMessages,
          mockDispatchUi,
          [],
          mockEmitEvent
        )
      );

      expect(() => {
        act(() => {
          result.current.editMessage('msg-1', 'Edit');
          result.current.deleteMessage('msg-1');
          result.current.toggleReaction('msg-1', '👍');
        });
      }).not.toThrow();
    });
  });
});
