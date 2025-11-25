/**
 * Socket.IO Mock Utilities for Testing
 *
 * Provides mock implementations of Socket.IO client for testing components
 * that depend on real-time socket connections.
 */

/**
 * Creates a mock Socket.IO client instance
 *
 * @param {Object} overrides - Custom overrides for socket methods
 * @returns {Object} Mock socket instance
 */
export function createMockSocket(overrides = {}) {
  const eventHandlers = new Map();

  const mockSocket = {
    id: 'mock-socket-id-123',
    connected: true,
    disconnected: false,

    // Event handling methods
    on: jest.fn((event, handler) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event).push(handler);
      return mockSocket;
    }),

    off: jest.fn((event, handler) => {
      if (eventHandlers.has(event)) {
        const handlers = eventHandlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
      return mockSocket;
    }),

    once: jest.fn((event, handler) => {
      const wrappedHandler = (...args) => {
        handler(...args);
        mockSocket.off(event, wrappedHandler);
      };
      mockSocket.on(event, wrappedHandler);
      return mockSocket;
    }),

    emit: jest.fn((event, ...args) => {
      // Optionally call registered handlers for this event
      if (eventHandlers.has(event)) {
        eventHandlers.get(event).forEach(handler => {
          handler(...args);
        });
      }
      return mockSocket;
    }),

    // Connection methods
    connect: jest.fn(() => {
      mockSocket.connected = true;
      mockSocket.disconnected = false;
      // Trigger connect event
      if (eventHandlers.has('connect')) {
        eventHandlers.get('connect').forEach(handler => handler());
      }
      return mockSocket;
    }),

    disconnect: jest.fn(() => {
      mockSocket.connected = false;
      mockSocket.disconnected = true;
      // Trigger disconnect event
      if (eventHandlers.has('disconnect')) {
        eventHandlers.get('disconnect').forEach(handler => handler());
      }
      return mockSocket;
    }),

    // Helper methods for testing
    _trigger: (event, ...args) => {
      if (eventHandlers.has(event)) {
        eventHandlers.get(event).forEach(handler => {
          handler(...args);
        });
      }
    },

    _getHandlers: (event) => {
      return eventHandlers.get(event) || [];
    },

    _clearHandlers: () => {
      eventHandlers.clear();
    },

    _eventHandlers: eventHandlers,

    // Apply custom overrides
    ...overrides,
  };

  return mockSocket;
}

/**
 * Creates a mock ChatContext value with socket included
 *
 * @param {Object} overrides - Values to override in the mock context
 * @returns {Object} Mock ChatContext value
 */
export function createMockChatContext(overrides = {}) {
  const mockSocket = overrides.socket || createMockSocket();

  return {
    socket: mockSocket,
    isConnected: true,
    messages: [],
    loadingMessages: false,
    messageError: null,
    onlineUsers: [],
    notifications: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalMessages: 0,
      messagesPerPage: 50,
    },
    hasMoreMessages: false,
    replyingTo: null,
    loadMoreMessages: jest.fn().mockResolvedValue(),
    fetchInitialMessages: jest.fn().mockResolvedValue(),
    sendMessage: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    replyToMessage: jest.fn(),
    toggleReaction: jest.fn(),
    setReplyingTo: jest.fn(),
    clearMessageError: jest.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock message object for testing
 *
 * @param {Object} overrides - Values to override in the mock message
 * @returns {Object} Mock message object
 */
export function createMockMessage(overrides = {}) {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    text: 'Test message',
    user: 'testuser',
    timestamp: new Date().toISOString(),
    isEdited: false,
    isDeleted: false,
    reactions: {},
    parentId: null,
    ...overrides,
  };
}

/**
 * Creates multiple mock messages for testing
 *
 * @param {number} count - Number of messages to create
 * @param {Object} baseOverrides - Base overrides for all messages
 * @returns {Array} Array of mock message objects
 */
export function createMockMessages(count = 5, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) =>
    createMockMessage({
      id: `msg-${index + 1}`,
      text: `Test message ${index + 1}`,
      timestamp: new Date(Date.now() - (count - index) * 60000).toISOString(),
      ...baseOverrides,
    })
  );
}

/**
 * Simulates a socket event emission and response
 *
 * @param {Object} socket - Mock socket instance
 * @param {string} event - Event name
 * @param {*} data - Data to emit
 * @param {string} responseEvent - Response event name (optional)
 * @param {*} responseData - Response data (optional)
 */
export function simulateSocketEvent(socket, event, data, responseEvent = null, responseData = null) {
  socket.emit(event, data);

  if (responseEvent && socket._eventHandlers.has(responseEvent)) {
    // Simulate async response
    setTimeout(() => {
      socket._trigger(responseEvent, responseData);
    }, 0);
  }
}

/**
 * Waits for a socket event to be emitted
 *
 * @param {Object} socket - Mock socket instance
 * @param {string} event - Event name to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that resolves when event is emitted
 */
export function waitForSocketEvent(socket, event, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for socket event: ${event}`));
    }, timeout);

    socket.on(event, (...args) => {
      clearTimeout(timeoutId);
      resolve(args);
    });
  });
}

/**
 * Mock Socket.IO module for jest.mock()
 *
 * Usage:
 *   jest.mock('socket.io-client', () => require('./test-utils/socketMock').mockSocketIoClient);
 */
export const mockSocketIoClient = {
  io: jest.fn(() => createMockSocket()),
  Socket: jest.fn(),
  Manager: jest.fn(),
};
