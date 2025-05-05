# Socket Hooks Reference Guide

## Available Hooks

### useSocketConnection
Primary hook for managing socket connection lifecycle.

```javascript
const { socket, isConnected, connectionError, clearConnectionError } = useSocketConnection();
```

#### Returns
- `socket`: Socket.IO instance or null
- `isConnected`: Boolean indicating connection status
- `connectionError`: Error message if any
- `clearConnectionError`: Function to clear error state

#### Usage
```javascript
function ChatComponent() {
  const { socket, isConnected } = useSocketConnection();
  
  useEffect(() => {
    if (isConnected) {
      // Socket is ready for use
    }
  }, [isConnected]);
}
```

### useSocketAuthentication
Manages socket authentication state and process.

```javascript
const { getAuthToken, authenticateSocket, resetAuthState } = useSocketAuthentication(user);
```

#### Parameters
- `user`: Current user object

#### Returns
- `getAuthToken`: Function to retrieve auth token
- `authenticateSocket`: Function to authenticate socket
- `resetAuthState`: Function to reset auth state

#### Usage
```javascript
function AuthenticatedChat() {
  const { authenticateSocket } = useSocketAuthentication(user);
  const { socket } = useSocketConnection();
  
  useEffect(() => {
    if (socket) {
      authenticateSocket(socket);
    }
  }, [socket]);
}
```

### useConnectionBackoff
Implements smart reconnection strategy.

```javascript
const {
  shouldThrottleConnection,
  getBackoffTime,
  trackConnectionAttempt,
  resetBackoff
} = useConnectionBackoff();
```

#### Returns
- `shouldThrottleConnection`: Function to check if connection should be throttled
- `getBackoffTime`: Function to get current backoff delay
- `trackConnectionAttempt`: Function to record connection attempt
- `resetBackoff`: Function to reset backoff state

#### Usage
```javascript
function ConnectionManager() {
  const { shouldThrottleConnection, getBackoffTime } = useConnectionBackoff();
  
  const attemptConnection = () => {
    if (shouldThrottleConnection()) {
      const delay = getBackoffTime();
      setTimeout(attemptConnection, delay);
      return;
    }
    // Proceed with connection
  };
}
```

### useSocketCore
Provides core socket functionality and state tracking.

```javascript
const { getSocketStatus, checkSocketReconnection } = useSocketCore(socket);
```

#### Parameters
- `socket`: Socket.IO instance

#### Returns
- `getSocketStatus`: Function to get current socket state
- `checkSocketReconnection`: Function to verify reconnection status

#### Usage
```javascript
function SocketMonitor() {
  const { socket } = useSocketConnection();
  const { getSocketStatus } = useSocketCore(socket);
  
  useEffect(() => {
    const status = getSocketStatus();
    console.log('Socket Status:', status);
  }, [socket]);
}
```

## Event System

### Core Events

#### Connection Events
```javascript
socket.on('connect', () => {
  // Socket connected
});

socket.on('disconnect', (reason) => {
  // Socket disconnected
});

socket.on('connect_error', (error) => {
  // Connection failed
});
```

#### Authentication Events
```javascript
socket.on('authenticated', (response) => {
  // Authentication complete
});

socket.on('auth_error', (error) => {
  // Authentication failed
});
```

#### Transport Events
```javascript
socket.io.engine.on('upgrade', (transport) => {
  // Transport upgraded
});

socket.io.engine.on('upgradeError', (error) => {
  // Transport upgrade failed
});
```

### Custom Events

#### Message Events
```javascript
// Send message
socket.emit('message', {
  text: 'Hello',
  timestamp: Date.now()
});

// Receive message
socket.on('message', (message) => {
  // Handle new message
});
```

#### Room Events
```javascript
// Join room
socket.emit('subscribe', {
  rooms: ['general']
});

// Room subscription confirmed
socket.on('subscribed', (response) => {
  // Successfully joined room
});
```

## Hook Composition

### Combining Hooks
```javascript
function ChatRoom() {
  const { socket, isConnected } = useSocketConnection();
  const { authenticateSocket } = useSocketAuthentication(user);
  const { getSocketStatus } = useSocketCore(socket);
  
  useEffect(() => {
    if (isConnected && socket) {
      const status = getSocketStatus();
      if (status.connected) {
        authenticateSocket(socket);
      }
    }
  }, [isConnected, socket]);
}
```

### Error Handling
```javascript
function ErrorAwareChat() {
  const { socket, connectionError } = useSocketConnection();
  const { resetAuthState } = useSocketAuthentication(user);
  const { resetBackoff } = useConnectionBackoff();
  
  useEffect(() => {
    if (connectionError) {
      // Reset states
      resetAuthState();
      resetBackoff();
      
      // Attempt recovery
      if (socket) {
        socket.connect();
      }
    }
  }, [connectionError]);
}
```

## Best Practices

### Hook Usage
1. Always destructure only needed values
2. Use appropriate dependency arrays
3. Clean up subscriptions in useEffect
4. Handle null socket states

```javascript
// Good
function GoodExample() {
  const { socket, isConnected } = useSocketConnection();
  
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleMessage = (msg) => {
      // Handle message
    };
    
    socket.on('message', handleMessage);
    return () => socket.off('message', handleMessage);
  }, [socket, isConnected]);
}
```

### Error Handling
1. Always check connection state
2. Handle authentication failures
3. Implement proper cleanup
4. Use appropriate error boundaries

```javascript
function RobustExample() {
  const { socket, connectionError } = useSocketConnection();
  
  useEffect(() => {
    if (!socket) return;
    
    const handleError = (error) => {
      if (error.type === 'auth') {
        // Handle auth error
      } else if (error.type === 'transport') {
        // Handle transport error
      }
    };
    
    socket.on('error', handleError);
    return () => socket.off('error', handleError);
  }, [socket]);
}
```

### Performance
1. Memoize event handlers
2. Avoid unnecessary re-renders
3. Clean up resources
4. Use appropriate dependencies

```javascript
function OptimizedExample() {
  const { socket } = useSocketConnection();
  
  const handleMessage = useCallback((msg) => {
    // Handle message
  }, []); // Empty deps if handler doesn't depend on props/state
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('message', handleMessage);
    return () => socket.off('message', handleMessage);
  }, [socket, handleMessage]);
}
