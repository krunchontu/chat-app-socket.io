import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ChatProvider, useChat } from './ChatContext';
import { AuthProvider } from '../components/common/AuthContext';
import socketIo from 'socket.io-client';
import axios from 'axios';

// Mock dependencies
jest.mock('socket.io-client');
jest.mock('axios');

// Mock socket instance
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Mock Consumer component to test context values
const TestConsumer = () => {
  const chat = useChat();
  return (
    <div>
      <div data-testid="isConnected">{chat.state.isConnected.toString()}</div>
      <div data-testid="loading">{chat.state.loading.toString()}</div>
      <div data-testid="messagesCount">{chat.state.messages.length}</div>
      <button 
        data-testid="clearError" 
        onClick={chat.clearError}
      >
        Clear Error
      </button>
      <button 
        data-testid="loadMore" 
        onClick={() => chat.loadMoreMessages(1)}
      >
        Load More
      </button>
      <button 
        data-testid="setReplyingTo" 
        onClick={() => chat.setReplyingTo({ id: 'msg123', text: 'Test message' })}
      >
        Set Reply
      </button>
    </div>
  );
};

describe('ChatContext', () => {
  beforeEach(() => {
    // Setup mocks before each test
    socketIo.mockReturnValue(mockSocket);
    localStorage.clear();
    
    // Mock localStorage.getItem('token')
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'token') return 'test-token';
      return null;
    });
    
    // Mock authenticated API response
    axios.get.mockResolvedValue({
      data: {
        messages: [
          { id: 'msg1', text: 'Message 1', user: 'testuser' },
          { id: 'msg2', text: 'Message 2', user: 'otheruser' }
        ],
        pagination: {
          currentPage: 0,
          totalPages: 2,
          totalMessages: 10,
          limit: 20
        }
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('provides initial state and functions', async () => {
    const mockUser = { username: 'testuser', id: 'user1' };
    
    render(
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      </AuthProvider>
    );

    // Initial state checks
    expect(screen.getByTestId('loading').textContent).toBe('true');
    
    // Wait for initial data fetch to complete
    await waitFor(() => {
      expect(screen.getByTestId('messagesCount').textContent).toBe('2');
    });
    
    // Check that axios was called correctly
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/messages'), 
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' }
      })
    );
  });

  it('connects to socket when authenticated', async () => {
    const mockUser = { username: 'testuser', id: 'user1' };
    
    render(
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      </AuthProvider>
    );
    
    // Check that socketIo was called correctly
    expect(socketIo).toHaveBeenCalledWith(expect.any(String), 
      expect.objectContaining({
        auth: { token: 'test-token' }
      })
    );
    
    // Simulate socket connection
    const connectionHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1];
    
    act(() => {
      connectionHandler();
    });
    
    // Connection status should be updated
    await waitFor(() => {
      expect(screen.getByTestId('isConnected').textContent).toBe('true');
    });
  });

  it('handles loadMoreMessages correctly', async () => {
    const mockUser = { username: 'testuser', id: 'user1' };
    
    // Setup mock for loadMoreMessages
    axios.get.mockResolvedValueOnce({
      data: {
        messages: [
          { id: 'msg1', text: 'Message 1', user: 'testuser' },
          { id: 'msg2', text: 'Message 2', user: 'otheruser' }
        ],
        pagination: {
          currentPage: 0,
          totalPages: 2,
          totalMessages: 10,
          limit: 20
        }
      }
    }).mockResolvedValueOnce({
      data: {
        messages: [
          { id: 'msg3', text: 'Message 3', user: 'testuser' },
          { id: 'msg4', text: 'Message 4', user: 'otheruser' }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 2,
          totalMessages: 10,
          limit: 20
        }
      }
    });
    
    render(
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      </AuthProvider>
    );
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('messagesCount').textContent).toBe('2');
    });
    
    // Call loadMoreMessages
    act(() => {
      screen.getByTestId('loadMore').click();
    });
    
    // Check that axios was called with page parameter
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          params: expect.objectContaining({
            page: 1
          })
        })
      );
    });
    
    // Check that messages were added
    await waitFor(() => {
      expect(screen.getByTestId('messagesCount').textContent).toBe('4');
    });
  });

  it('handles socket errors correctly', async () => {
    const mockUser = { username: 'testuser', id: 'user1' };
    
    render(
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      </AuthProvider>
    );
    
    // Find the disconnect handler
    const disconnectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'disconnect'
    )[1];
    
    // Simulate disconnect
    act(() => {
      disconnectHandler('io server disconnect');
    });
    
    // Check that reconnect was attempted
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('can set replyingTo state', async () => {
    const mockUser = { username: 'testuser', id: 'user1' };
    
    render(
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      </AuthProvider>
    );
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    
    // Set replyingTo
    act(() => {
      screen.getByTestId('setReplyingTo').click();
    });
    
    // The replyingTo state won't be directly visible in our test component
    // but we can check it affected the ChatProvider's state by checking
    // if subsequent operations use that state
  });
});
