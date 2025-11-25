/**
 * useMessageState Hook Tests
 *
 * Testing message state management hook
 */

import { renderHook, act } from '@testing-library/react';
import useMessageState from './useMessageState';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('../services/ErrorService', () => ({
  __esModule: true,
  default: {
    handleApiError: jest.fn(() => 'Error occurred'),
    logError: jest.fn(),
  },
}));

describe('useMessageState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => useMessageState());

      expect(result.current.messageState.messages).toEqual([]);
      expect(result.current.messageState.loadingMessages).toBe(false);
      expect(result.current.messageState.messageError).toBeNull();
      expect(result.current.messageState.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalMessages: 0,
        messagesPerPage: 50,
      });
    });

    test('provides dispatch function', () => {
      const { result } = renderHook(() => useMessageState());

      expect(typeof result.current.dispatchMessages).toBe('function');
    });

    test('provides fetch functions', () => {
      const { result } = renderHook(() => useMessageState());

      expect(typeof result.current.fetchInitialMessages).toBe('function');
      expect(typeof result.current.loadMoreMessages).toBe('function');
      expect(typeof result.current.clearMessageError).toBe('function');
    });
  });

  describe('Message Fetching', () => {
    test('fetchInitialMessages sets loading state', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          messages: [],
          pagination: { currentPage: 1, totalPages: 1, total: 0 },
        },
      });

      const { result } = renderHook(() => useMessageState());

      await act(async () => {
        const promise = result.current.fetchInitialMessages();
        expect(result.current.messageState.loadingMessages).toBe(true);
        await promise;
      });

      expect(result.current.messageState.loadingMessages).toBe(false);
    });

    test('fetchInitialMessages loads messages successfully', async () => {
      const mockMessages = [
        { id: '1', text: 'Hello', user: 'user1' },
        { id: '2', text: 'World', user: 'user2' },
      ];

      axios.get.mockResolvedValueOnce({
        data: {
          messages: mockMessages,
          pagination: { currentPage: 1, totalPages: 2, total: 15 },
        },
      });

      const { result } = renderHook(() => useMessageState());

      await act(async () => {
        await result.current.fetchInitialMessages();
      });

      expect(result.current.messageState.messages).toEqual(mockMessages);
      expect(result.current.messageState.pagination.totalPages).toBe(2);
      expect(result.current.messageState.messageError).toBeNull();
    });

    test('fetchInitialMessages handles errors', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMessageState());

      await act(async () => {
        await result.current.fetchInitialMessages();
      });

      expect(result.current.messageState.messages).toEqual([]);
      expect(result.current.messageState.messageError).toBeTruthy();
      expect(result.current.messageState.loadingMessages).toBe(false);
    });
  });

  describe('Load More Messages', () => {
    test('loadMoreMessages appends to existing messages', async () => {
      const initialMessages = [{ id: '1', text: 'First', user: 'user1' }];
      const newMessages = [{ id: '2', text: 'Second', user: 'user2' }];

      axios.get
        .mockResolvedValueOnce({
          data: {
            messages: initialMessages,
            pagination: { currentPage: 1, totalPages: 2, total: 10 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            messages: newMessages,
            pagination: { currentPage: 2, totalPages: 2, total: 10 },
          },
        });

      const { result } = renderHook(() => useMessageState());

      await act(async () => {
        await result.current.fetchInitialMessages();
      });

      expect(result.current.messageState.messages).toHaveLength(1);

      await act(async () => {
        await result.current.loadMoreMessages(2);
      });

      expect(result.current.messageState.messages).toHaveLength(2);
      expect(result.current.messageState.messages[1]).toEqual(newMessages[0]);
    });

    test('loadMoreMessages updates pagination', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          messages: [{ id: '1', text: 'Message', user: 'user1' }],
          pagination: { currentPage: 2, totalPages: 3, total: 15 },
        },
      });

      const { result } = renderHook(() => useMessageState());

      await act(async () => {
        await result.current.loadMoreMessages(2);
      });

      expect(result.current.messageState.pagination.currentPage).toBe(2);
      expect(result.current.messageState.pagination.totalPages).toBe(3);
    });
  });

  describe('Message Dispatch', () => {
    test('dispatchMessages handles ADD_MESSAGE action', () => {
      const { result } = renderHook(() => useMessageState());
      const newMessage = { id: '1', text: 'New message', user: 'user1' };

      act(() => {
        result.current.dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: newMessage,
        });
      });

      expect(result.current.messageState.messages).toHaveLength(1);
      expect(result.current.messageState.messages[0]).toEqual(newMessage);
    });

    test('dispatchMessages handles UPDATE_MESSAGE action', () => {
      const { result } = renderHook(() => useMessageState());
      const originalMessage = { id: '1', text: 'Original', user: 'user1' };

      act(() => {
        result.current.dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: originalMessage,
        });
      });

      act(() => {
        result.current.dispatchMessages({
          type: 'UPDATE_MESSAGE',
          payload: { id: '1', text: 'Updated', user: 'user1', isEdited: true },
        });
      });

      expect(result.current.messageState.messages[0].text).toBe('Updated');
      expect(result.current.messageState.messages[0].isEdited).toBe(true);
    });

    test('dispatchMessages handles DELETE_MESSAGE action', () => {
      const { result } = renderHook(() => useMessageState());

      act(() => {
        result.current.dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: { id: '1', text: 'Message', user: 'user1' },
        });
      });

      expect(result.current.messageState.messages).toHaveLength(1);

      act(() => {
        result.current.dispatchMessages({
          type: 'DELETE_MESSAGE',
          payload: '1',
        });
      });

      expect(result.current.messageState.messages[0].isDeleted).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('clearMessageError clears error state', () => {
      const { result } = renderHook(() => useMessageState());

      act(() => {
        result.current.dispatchMessages({
          type: 'SET_ERROR',
          payload: 'Test error',
        });
      });

      expect(result.current.messageState.messageError).toBe('Test error');

      act(() => {
        result.current.clearMessageError();
      });

      expect(result.current.messageState.messageError).toBeNull();
    });
  });
});
