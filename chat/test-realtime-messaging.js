/**
 * Socket.IO Chat Application Real-Time Messaging Test Script
 *
 * This script tests real-time message delivery between multiple clients.
 * It can be used to verify that the real-time messaging bug has been fixed.
 *
 * To use:
 * 1. Start the server: cd server && npm start
 * 2. Start the client: cd chat && npm start
 * 3. Run this test: node test-realtime-messaging.js
 */

const io = require("socket.io-client");
const readline = require("readline");
const colors = require("colors/safe");

// Configuration
const SERVER_URL = process.env.SERVER_URL || "http://localhost:4500";
const TEST_USERS = [
  { username: "test1", token: "test-token-1" }, // Replace with actual test tokens if needed
  { username: "test2", token: "test-token-2" }, // Or use login API to get real tokens
];
const TEST_DURATION_MS = 30000; // 30 seconds

// Create console interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(colors.bold.cyan("=== REAL-TIME MESSAGING TEST ==="));
console.log(`Server URL: ${SERVER_URL}`);
console.log(`Test users: ${TEST_USERS.map((u) => u.username).join(", ")}`);
console.log("This test will verify message delivery between clients\n");

// Track messages for verification
const sentMessages = [];
const receivedMessages = {};
TEST_USERS.forEach((user) => {
  receivedMessages[user.username] = [];
});

// Connect socket clients
const clients = TEST_USERS.map((user) => {
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    auth: { token: user.token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return { user, socket, connected: false };
});

// Set up event handlers
clients.forEach((client, index) => {
  const { user, socket } = client;
  const otherClients = clients.filter((_, i) => i !== index);

  // Connection events
  socket.on("connect", () => {
    client.connected = true;
    console.log(colors.green(`✓ ${user.username} connected (${socket.id})`));

    // Check if all clients are connected
    if (clients.every((c) => c.connected)) {
      console.log(
        colors.green.bold("All clients connected! Starting test...\n")
      );
      runTest();
    }
  });

  socket.on("connect_error", (err) => {
    console.log(
      colors.red(`✗ ${user.username} connection error: ${err.message}`)
    );
  });

  socket.on("disconnect", (reason) => {
    client.connected = false;
    console.log(colors.yellow(`! ${user.username} disconnected: ${reason}`));
  });

  // Message events - listen for both event types we're testing
  ["message", "sendMessage"].forEach((eventName) => {
    socket.on(eventName, (data) => {
      // Only process each message once even if received on both channels
      const msgId = data.id || data._id || data.tempId;
      const isDuplicate = receivedMessages[user.username].some(
        (msg) => msg.id === msgId || msg.tempId === msgId
      );

      if (!isDuplicate) {
        receivedMessages[user.username].push(data);
        console.log(
          colors.cyan(
            `← ${user.username} received: "${data.text}" (via ${eventName})`
          )
        );

        // Check if this was sent by another client in our test
        const fromOtherTest = sentMessages.some(
          (msg) => msg.tempId === data.tempId || msg.text === data.text
        );

        if (fromOtherTest) {
          console.log(
            colors.green(
              `  ✓ Message from another test client received correctly`
            )
          );
        }
      }
    });
  });
});

// Run the actual test
function runTest() {
  let testCount = 0;
  let messageInterval;

  // Send test messages at random intervals
  const startMessageTest = () => {
    messageInterval = setInterval(() => {
      // Pick a random client to send message
      const senderIndex = Math.floor(Math.random() * clients.length);
      const sender = clients[senderIndex];

      if (sender.connected) {
        const testMessage = {
          text: `Test message ${++testCount} from ${
            sender.user.username
          } at ${new Date().toISOString()}`,
          tempId: `test-${Date.now()}-${senderIndex}`,
        };

        sentMessages.push(testMessage);
        sender.socket.emit("message", testMessage);
        console.log(
          colors.yellow(`→ ${sender.user.username} sent: "${testMessage.text}"`)
        );
      }
    }, 2000 + Math.random() * 2000); // Random interval between 2-4 seconds
  };

  // Execute connection drop test after a delay
  const runConnectionDropTest = () => {
    const clientToDrop = clients[0]; // Drop first client

    setTimeout(() => {
      console.log(
        colors.blue.bold("\n=== Testing Connection Drop/Recovery ===")
      );
      console.log(
        colors.blue(`Disconnecting ${clientToDrop.user.username}...`)
      );
      clientToDrop.socket.disconnect();

      // Let other clients send messages while this one is disconnected
      setTimeout(() => {
        console.log(
          colors.blue(`Reconnecting ${clientToDrop.user.username}...`)
        );
        clientToDrop.socket.connect();

        // Let it receive messages after reconnection
        setTimeout(endTest, 5000);
      }, 5000);
    }, 10000);
  };

  // End test and show results
  const endTest = () => {
    clearInterval(messageInterval);

    console.log(colors.bold.cyan("\n=== TEST RESULTS ==="));
    console.log(`Total messages sent: ${sentMessages.length}`);

    Object.entries(receivedMessages).forEach(([username, messages]) => {
      console.log(`${username} received ${messages.length} messages`);
    });

    // Check if all clients received all messages from other clients
    let allPassed = true;

    clients.forEach((client) => {
      const username = client.user.username;

      // Each client should have received all messages sent by other clients
      const messagesFromOthers = sentMessages.filter(
        (msg) => !msg.text.includes(`from ${username}`)
      );

      const received = receivedMessages[username];

      const allReceived = messagesFromOthers.every((sent) =>
        received.some((r) => r.text === sent.text || r.tempId === sent.tempId)
      );

      if (allReceived) {
        console.log(
          colors.green(`✓ ${username} received all messages correctly`)
        );
      } else {
        console.log(colors.red(`✗ ${username} missed some messages`));
        allPassed = false;
      }
    });

    console.log("\nOverall result:");
    if (allPassed) {
      console.log(
        colors.bold.green(
          "✓ TEST PASSED - All messages were received correctly!"
        )
      );
    } else {
      console.log(
        colors.bold.red("✗ TEST FAILED - Some messages were not delivered")
      );
    }

    // Disconnect all clients and exit
    clients.forEach((client) => client.socket.disconnect());
    rl.close();
    process.exit(allPassed ? 0 : 1);
  };

  // Start the test sequence
  startMessageTest();
  runConnectionDropTest();

  // End the test after the specified duration if it hasn't ended already
  setTimeout(() => {
    if (messageInterval) {
      console.log(colors.yellow("Test duration reached, wrapping up..."));
      endTest();
    }
  }, TEST_DURATION_MS);
}

// Handle manual termination
rl.on("close", () => {
  console.log("Test terminated by user");
  clients.forEach((client) => client.socket.disconnect());
  process.exit(0);
});
