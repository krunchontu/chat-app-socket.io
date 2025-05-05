# Socket Connection Troubleshooting Guide

## Common Issues and Solutions

### 1. WebSocket Connection Failures

#### Symptoms
- Console error: "WebSocket connection failed"
- Immediate fallback to polling
- Connection attempts being throttled

#### Solutions
1. Check Network Environment
   ```javascript
   // Enable debug logging
   localStorage.setItem('ENABLE_SOCKET_DEBUG', 'true');
   // Check transport in debug panel
   ```

2. Verify Server Configuration
   - Ensure WebSocket port is open
   - Check proxy/firewall settings
   - Verify CORS configuration

3. Client Configuration
   ```javascript
   // Allow transport fallback
   const socket = io({
     transports: ['websocket', 'polling'],
     upgrade: true
   });
   ```

### 2. Authentication Issues

#### Symptoms
- "Cannot register events - socket not available or connected"
- Authentication timeout errors
- Repeated reconnection attempts

#### Solutions
1. Token Validation
   ```javascript
   // Check token in localStorage
   const token = localStorage.getItem('token');
   if (!token) {
     // Redirect to login
     window.location.href = '/login';
   }
   ```

2. Connection Timing
   ```javascript
   // Wait for stable connection before auth
   socket.on('connect', async () => {
     await new Promise(resolve => setTimeout(resolve, 100));
     if (socket.connected) {
       authenticateSocket(socket);
     }
   });
   ```

3. Reset Authentication State
   ```javascript
   // Clear auth state and reconnect
   resetAuthState();
   socket.disconnect();
   socket.connect();
   ```

### 3. Reconnection Problems

#### Symptoms
- Frequent disconnects
- Failed reconnection attempts
- Connection throttling

#### Solutions
1. Check Backoff Configuration
   ```javascript
   // Optimal backoff settings
   const backoffConfig = {
     initialDelay: 300,
     maxDelay: 2000,
     maxAttempts: 20
   };
   ```

2. Monitor Connection Attempts
   ```javascript
   // Log connection attempts
   socket.on('reconnect_attempt', (attempt) => {
     console.log(`Reconnection attempt ${attempt}`);
     // Check if hitting rate limits
     if (attempt > 3) {
       // Consider manual intervention
     }
   });
   ```

3. Reset Connection
   ```javascript
   // Force clean reconnection
   socket.disconnect();
   setTimeout(() => {
     socket.connect();
   }, 1000);
   ```

### 4. Transport Issues

#### Symptoms
- "Transport close" errors
- Failed transport upgrades
- Polling fallback not working

#### Solutions
1. Transport Configuration
   ```javascript
   // Server configuration
   const io = new Server({
     transports: ['polling', 'websocket'],
     allowUpgrades: true,
     upgradeTimeout: 10000,
   });
   ```

2. Monitor Transport State
   ```javascript
   socket.on('connect', () => {
     const transport = socket.io.engine.transport.name;
     console.log(`Connected with transport: ${transport}`);
   });
   ```

3. Handle Transport Errors
   ```javascript
   socket.io.engine.on('upgrade_error', (err) => {
     console.error('Transport upgrade failed:', err);
     // Continue with existing transport
   });
   ```

### 5. Performance Issues

#### Symptoms
- High latency
- Message delays
- Connection instability

#### Solutions
1. Optimize Ping Configuration
   ```javascript
   // Server settings
   const io = new Server({
     pingTimeout: 30000,
     pingInterval: 10000
   });
   ```

2. Monitor Event Timing
   ```javascript
   // Track event latency
   const start = Date.now();
   socket.emit('event', data, () => {
     const latency = Date.now() - start;
     console.log(`Event round-trip: ${latency}ms`);
   });
   ```

3. Check Resource Usage
   ```javascript
   // Monitor event queue
   setInterval(() => {
     const queueSize = socket.sendBuffer.length;
     if (queueSize > 10) {
       console.warn(`Large event queue: ${queueSize}`);
     }
   }, 5000);
   ```

## Debugging Tools

### 1. Socket Debug Panel
- Enable in development: Automatically available
- Enable in production: `localStorage.setItem('ENABLE_SOCKET_DEBUG', 'true')`
- Features:
  * Connection status
  * Transport type
  * Event history
  * Manual reconnect
  * Test messages

### 2. Browser DevTools
1. Network Tab
   - Filter by "WS" for WebSocket frames
   - Check for failed upgrades
   - Monitor connection lifecycle

2. Console Filters
   ```javascript
   // Filter socket logs
   console.log('[Socket]', message);
   // Create console filter: ^\\[Socket\\]
   ```

3. Performance Monitoring
   ```javascript
   // Track connection metrics
   const metrics = {
     connectTime: 0,
     authTime: 0,
     reconnects: 0
   };
   ```

## Prevention Strategies

### 1. Connection Health Checks
```javascript
// Implement periodic health checks
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping', Date.now(), (serverTime) => {
      const latency = Date.now() - serverTime;
      // Alert if latency is too high
      if (latency > 1000) {
        console.warn(`High latency: ${latency}ms`);
      }
    });
  }
}, 30000);
```

### 2. Proactive Monitoring
```javascript
// Monitor connection quality
socket.on('connect', () => {
  const transport = socket.io.engine.transport.name;
  const protocol = socket.io.engine.protocol;
  
  // Log connection details
  console.log({
    transport,
    protocol,
    timestamp: new Date().toISOString()
  });
});
```

### 3. Error Tracking
```javascript
// Implement error tracking
socket.on('error', (error) => {
  // Log error details
  console.error({
    type: error.type,
    message: error.message,
    timestamp: new Date().toISOString(),
    socketId: socket.id,
    transport: socket.io?.engine?.transport?.name
  });
});
```

## Quick Reference

### Connection States
| State | Check | Action |
|-------|--------|--------|
| Disconnected | `!socket.connected` | Check network/retry |
| Connecting | `socket.connecting` | Wait for timeout |
| Connected | `socket.connected` | Proceed with auth |
| Error | `socket.disconnected` | Check error type |

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 1006 | Abnormal closure | Check network |
| 1015 | TLS handshake | Check certificates |
| 1001 | Going away | Normal closure |
| 1002 | Protocol error | Check version compatibility |

### Debug Commands
```javascript
// Enable debug mode
localStorage.setItem('ENABLE_SOCKET_DEBUG', 'true');

// Force reconnect
socket.disconnect();
socket.connect();

// Clear connection state
resetAuthState();
resetBackoff();

// Test connection
socket.emit('ping');
