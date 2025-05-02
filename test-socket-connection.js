/**
 * WebSocket Connection Tester for Render Deployments
 *
 * This script tests the WebSocket connection to your backend
 * service deployed on Render.
 *
 * Usage:
 *   node test-socket-connection.js [socket-url]
 *
 * Example:
 *   node test-socket-connection.js wss://chat-app-backend.onrender.com
 */

const socketUrl = process.argv[2] || "http://localhost:4500";
const testDuration = 10000; // 10 seconds

// If using browser WebSocket
let WebSocket;
try {
  WebSocket = require("ws");
} catch (err) {
  console.log("WebSocket module not found. Using browser WebSocket API.");
  // Use native WebSocket if ws package not available
  WebSocket = global.WebSocket || require("websocket").w3cwebsocket;
}

// Print colored output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

console.log(
  `${colors.bold}${colors.blue}SOCKET.IO CONNECTION TEST${colors.reset}`
);
console.log(`Connecting to: ${socketUrl}`);
console.log(`Test duration: ${testDuration / 1000} seconds\n`);

// Create socket instance
let socket;
try {
  // Handle different libraries/APIs
  if (typeof WebSocket === "function") {
    // ws package
    socket = new WebSocket(socketUrl);
  } else if (WebSocket && WebSocket.client) {
    // websocket package
    socket = new WebSocket.client();
    socket.connect(socketUrl);
  } else {
    throw new Error("No WebSocket implementation available");
  }
} catch (err) {
  console.error(
    `${colors.red}Failed to create WebSocket instance: ${err.message}${colors.reset}`
  );
  process.exit(1);
}

// Track connection state
let isConnected = false;
let messageCount = 0;
let errorCount = 0;

// Connection handlers
function setupSocketHandlers() {
  // Handle connection open
  socket.on("open", () => {
    isConnected = true;
    console.log(`${colors.green}✓ Connected successfully${colors.reset}`);

    // Send a test message
    try {
      socket.send(
        JSON.stringify({
          type: "test",
          message: "Test message from socket tester",
          timestamp: new Date().toISOString(),
        })
      );
      console.log(`${colors.blue}→ Test message sent${colors.reset}`);
    } catch (err) {
      console.error(
        `${colors.red}Failed to send message: ${err.message}${colors.reset}`
      );
      errorCount++;
    }
  });

  // Handle incoming messages
  socket.on("message", (data) => {
    messageCount++;
    try {
      // Try to parse if it's JSON
      const parsed = JSON.parse(
        typeof data === "string" ? data : data.toString()
      );
      console.log(
        `${colors.green}← Message received (${messageCount}):${colors.reset}`,
        parsed
      );
    } catch (err) {
      // If not JSON, show as raw
      console.log(
        `${colors.green}← Raw message received (${messageCount}):${colors.reset}`,
        typeof data === "string" ? data : data.toString()
      );
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    errorCount++;
    console.error(
      `${colors.red}Error: ${error.message || "Unknown error"}${colors.reset}`
    );
  });

  // Handle connection close
  socket.on("close", (code, reason) => {
    isConnected = false;
    console.log(`${colors.yellow}Connection closed${colors.reset}`);
    console.log(`Code: ${code}`);
    if (reason) {
      console.log(`Reason: ${reason}`);
    }
  });
}

// Set up event handlers based on WebSocket implementation
if (socket.on) {
  setupSocketHandlers();
} else if (socket.onopen) {
  // Browser WebSocket API
  socket.onopen = () => {
    isConnected = true;
    console.log(`${colors.green}✓ Connected successfully${colors.reset}`);

    // Send a test message
    try {
      socket.send(
        JSON.stringify({
          type: "test",
          message: "Test message from socket tester",
          timestamp: new Date().toISOString(),
        })
      );
      console.log(`${colors.blue}→ Test message sent${colors.reset}`);
    } catch (err) {
      console.error(
        `${colors.red}Failed to send message: ${err.message}${colors.reset}`
      );
      errorCount++;
    }
  };

  socket.onmessage = (event) => {
    messageCount++;
    try {
      // Try to parse if it's JSON
      const parsed = JSON.parse(event.data);
      console.log(
        `${colors.green}← Message received (${messageCount}):${colors.reset}`,
        parsed
      );
    } catch (err) {
      // If not JSON, show as raw
      console.log(
        `${colors.green}← Raw message received (${messageCount}):${colors.reset}`,
        event.data
      );
    }
  };

  socket.onerror = (error) => {
    errorCount++;
    console.error(
      `${colors.red}Error: ${error.message || "Unknown error"}${colors.reset}`
    );
  };

  socket.onclose = (event) => {
    isConnected = false;
    console.log(`${colors.yellow}Connection closed${colors.reset}`);
    console.log(`Code: ${event.code}`);
    if (event.reason) {
      console.log(`Reason: ${event.reason}`);
    }
  };
}

// End test after duration
setTimeout(() => {
  console.log("\n--- Test Summary ---");
  console.log(
    `Connection status: ${
      isConnected
        ? colors.green + "Connected" + colors.reset
        : colors.red + "Disconnected" + colors.reset
    }`
  );
  console.log(`Messages received: ${messageCount}`);
  console.log(`Errors encountered: ${errorCount}`);

  if (isConnected) {
    console.log(
      `\n${colors.green}✓ Socket connection test passed!${colors.reset}`
    );
  } else {
    console.log(
      `\n${colors.red}✗ Socket connection test failed!${colors.reset}`
    );
  }

  // Close connection if open
  if (isConnected && socket.close) {
    socket.close();
  }

  // Exit process
  setTimeout(() => process.exit(isConnected ? 0 : 1), 500);
}, testDuration);

console.log(`${colors.cyan}Test running...${colors.reset}`);
