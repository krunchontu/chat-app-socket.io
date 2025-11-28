/**
 * Socket.IO Integration Tests with Real Server
 * Tests real-time messaging with actual server and database
 */

const Client = require("socket.io-client");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { setupTestServer, teardownTestServer, clearDatabase } = require("../setup/testServer");
const Message = require("../../models/message");
const User = require("../../models/user");

describe("Socket.IO Real Server Integration Tests", () => {
  let server;
  let baseUrl;
  let authToken;
  let userId;
  let testUser;

  beforeAll(async () => {
    server = await setupTestServer();
    baseUrl = server.baseUrl;
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Register a test user
    const registerResponse = await request(baseUrl)
      .post("/api/users/register")
      .send({
        username: "socketuser",
        email: "socket@example.com",
        password: "SecurePass123!",
      })
      .expect(201);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
    testUser = registerResponse.body.user;
  });

  describe("Socket Connection and Authentication", () => {
    test("should successfully connect with valid auth token", (done) => {
      const clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      });

      clientSocket.on("connect_error", (error) => {
        clientSocket.disconnect();
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    test("should reject connection without auth token", (done) => {
      const clientSocket = new Client(baseUrl, {
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clientSocket.disconnect();
        done(new Error("Should not connect without auth token"));
      });

      clientSocket.on("connect_error", (error) => {
        expect(error).toBeDefined();
        clientSocket.disconnect();
        done();
      });
    });

    test("should reject connection with invalid auth token", (done) => {
      const clientSocket = new Client(baseUrl, {
        auth: { token: "invalid.token.here" },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clientSocket.disconnect();
        done(new Error("Should not connect with invalid token"));
      });

      clientSocket.on("connect_error", (error) => {
        expect(error).toBeDefined();
        clientSocket.disconnect();
        done();
      });
    });

    test("should disconnect cleanly", (done) => {
      const clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clientSocket.disconnect();
      });

      clientSocket.on("disconnect", (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });
  });

  describe("Real-time Messaging", () => {
    let clientSocket;

    beforeEach((done) => {
      clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        done();
      });
    });

    afterEach(() => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test("should send and receive messages", (done) => {
      const messageData = {
        text: "Test message from integration test",
        tempId: `temp-${Date.now()}`,
      };

      clientSocket.on("sendMessage", (receivedMessage) => {
        expect(receivedMessage).toHaveProperty("text", messageData.text);
        expect(receivedMessage).toHaveProperty("username", testUser.username);
        expect(receivedMessage).toHaveProperty("_id");
        expect(receivedMessage).toHaveProperty("timestamp");
        done();
      });

      clientSocket.emit("message", messageData);
    });

    test("should save message to database", (done) => {
      const messageData = {
        text: "Message to be saved in DB",
        tempId: `temp-${Date.now()}`,
      };

      clientSocket.on("sendMessage", async (receivedMessage) => {
        try {
          // Query database to verify message was saved
          const savedMessage = await Message.findById(receivedMessage._id);

          expect(savedMessage).toBeDefined();
          expect(savedMessage.text).toBe(messageData.text);
          expect(savedMessage.username).toBe(testUser.username);
          done();
        } catch (error) {
          done(error);
        }
      });

      clientSocket.emit("message", messageData);
    });

    test("should broadcast message to all connected clients", (done) => {
      // Create a second client
      const secondClient = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      let messagesReceived = 0;
      const messageData = {
        text: "Broadcast test message",
        tempId: `temp-${Date.now()}`,
      };

      const checkCompletion = () => {
        messagesReceived++;
        if (messagesReceived === 2) {
          secondClient.disconnect();
          done();
        }
      };

      secondClient.on("connect", () => {
        // First client listens for message
        clientSocket.on("sendMessage", (receivedMessage) => {
          expect(receivedMessage.text).toBe(messageData.text);
          checkCompletion();
        });

        // Second client listens for message
        secondClient.on("sendMessage", (receivedMessage) => {
          expect(receivedMessage.text).toBe(messageData.text);
          checkCompletion();
        });

        // Send message from first client
        clientSocket.emit("message", messageData);
      });
    });
  });

  describe("Message Editing", () => {
    let clientSocket;
    let messageId;

    beforeEach(async (done) => {
      // Create a test message in the database
      const userDoc = await User.findById(userId);
      const message = await Message.create({
        text: "Original message",
        user: userDoc._id,
        username: userDoc.username,
        timestamp: new Date(),
      });
      messageId = message._id.toString();

      clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        done();
      });
    });

    afterEach(() => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test("should edit message successfully", (done) => {
      const newText = "Edited message content";

      clientSocket.on("messageUpdated", (updatedMessage) => {
        expect(updatedMessage._id).toBe(messageId);
        expect(updatedMessage.text).toBe(newText);
        expect(updatedMessage).toHaveProperty("edited", true);
        done();
      });

      clientSocket.emit("editMessage", {
        id: messageId,
        text: newText,
      });
    });

    test("should update message in database", (done) => {
      const newText = "Updated message in DB";

      clientSocket.on("messageUpdated", async (updatedMessage) => {
        try {
          const dbMessage = await Message.findById(messageId);
          expect(dbMessage.text).toBe(newText);
          expect(dbMessage.edited).toBe(true);
          done();
        } catch (error) {
          done(error);
        }
      });

      clientSocket.emit("editMessage", {
        id: messageId,
        text: newText,
      });
    });
  });

  describe("Message Deletion", () => {
    let clientSocket;
    let messageId;

    beforeEach(async (done) => {
      // Create a test message in the database
      const userDoc = await User.findById(userId);
      const message = await Message.create({
        text: "Message to be deleted",
        user: userDoc._id,
        username: userDoc.username,
        timestamp: new Date(),
      });
      messageId = message._id.toString();

      clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        done();
      });
    });

    afterEach(() => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test("should delete message successfully", (done) => {
      clientSocket.on("messageDeleted", (data) => {
        expect(data).toHaveProperty("id", messageId);
        done();
      });

      clientSocket.emit("deleteMessage", { id: messageId });
    });

    test("should mark message as deleted in database", (done) => {
      clientSocket.on("messageDeleted", async (data) => {
        try {
          const dbMessage = await Message.findById(messageId);
          expect(dbMessage.deleted).toBe(true);
          done();
        } catch (error) {
          done(error);
        }
      });

      clientSocket.emit("deleteMessage", { id: messageId });
    });
  });

  describe("Message Reactions", () => {
    let clientSocket;
    let messageId;

    beforeEach(async (done) => {
      // Create a test message in the database
      const userDoc = await User.findById(userId);
      const message = await Message.create({
        text: "Message to react to",
        user: userDoc._id,
        username: userDoc.username,
        timestamp: new Date(),
      });
      messageId = message._id.toString();

      clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        done();
      });
    });

    afterEach(() => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test("should add reaction to message", (done) => {
      const emoji = "👍";

      clientSocket.on("messageUpdated", (updatedMessage) => {
        expect(updatedMessage._id).toBe(messageId);
        expect(updatedMessage).toHaveProperty("reactions");
        expect(Array.isArray(updatedMessage.reactions)).toBe(true);

        const reaction = updatedMessage.reactions.find((r) => r.emoji === emoji);
        expect(reaction).toBeDefined();
        expect(reaction.users).toContain(userId);
        done();
      });

      clientSocket.emit("reaction", {
        id: messageId,
        emoji: emoji,
      });
    });

    test("should toggle reaction (remove if already exists)", (done) => {
      const emoji = "❤️";
      let reactionAdded = false;

      clientSocket.on("messageUpdated", (updatedMessage) => {
        if (!reactionAdded) {
          // First update: reaction added
          reactionAdded = true;
          const reaction = updatedMessage.reactions.find((r) => r.emoji === emoji);
          expect(reaction).toBeDefined();

          // Send same reaction again to remove it
          clientSocket.emit("reaction", {
            id: messageId,
            emoji: emoji,
          });
        } else {
          // Second update: reaction removed
          const reaction = updatedMessage.reactions.find((r) => r.emoji === emoji);
          if (reaction) {
            expect(reaction.users).not.toContain(userId);
          }
          done();
        }
      });

      // Send first reaction
      clientSocket.emit("reaction", {
        id: messageId,
        emoji: emoji,
      });
    });
  });

  describe("Message Replies", () => {
    let clientSocket;
    let parentMessageId;

    beforeEach(async (done) => {
      // Create a parent message in the database
      const userDoc = await User.findById(userId);
      const parentMessage = await Message.create({
        text: "Parent message for replies",
        user: userDoc._id,
        username: userDoc.username,
        timestamp: new Date(),
      });
      parentMessageId = parentMessage._id.toString();

      clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        done();
      });
    });

    afterEach(() => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test("should create reply to message", (done) => {
      const replyData = {
        parentId: parentMessageId,
        text: "This is a reply",
      };

      clientSocket.on("replyCreated", (reply) => {
        expect(reply).toHaveProperty("text", replyData.text);
        expect(reply).toHaveProperty("parentId", parentMessageId);
        expect(reply).toHaveProperty("_id");
        expect(reply).toHaveProperty("username", testUser.username);
        done();
      });

      clientSocket.emit("replyToMessage", replyData);
    });

    test("should save reply to database with parent reference", (done) => {
      const replyData = {
        parentId: parentMessageId,
        text: "Reply saved in DB",
      };

      clientSocket.on("replyCreated", async (reply) => {
        try {
          const dbReply = await Message.findById(reply._id);
          expect(dbReply).toBeDefined();
          expect(dbReply.text).toBe(replyData.text);
          expect(dbReply.parentId.toString()).toBe(parentMessageId);
          done();
        } catch (error) {
          done(error);
        }
      });

      clientSocket.emit("replyToMessage", replyData);
    });
  });

  describe("User Presence", () => {
    test("should broadcast online users when user connects", (done) => {
      const clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("onlineUsers", (users) => {
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBeGreaterThan(0);

        // Find our test user in the list
        const ourUser = users.find((u) => u.username === testUser.username);
        expect(ourUser).toBeDefined();
        expect(ourUser).toHaveProperty("isOnline", true);

        clientSocket.disconnect();
        done();
      });

      clientSocket.on("connect", () => {
        // onlineUsers event should be sent automatically after connection
      });
    });

    test("should update online status when user disconnects", (done) => {
      const firstClient = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      const secondClient = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      let connectedCount = 0;

      const checkConnection = () => {
        connectedCount++;
        if (connectedCount === 2) {
          // Both clients connected, now disconnect first client
          firstClient.disconnect();
        }
      };

      firstClient.on("connect", checkConnection);
      secondClient.on("connect", checkConnection);

      secondClient.on("onlineUsers", (users) => {
        // After first client disconnects, check if user is still in online list
        // (might still be there if second client is connected)
        expect(Array.isArray(users)).toBe(true);
      });

      firstClient.on("disconnect", () => {
        // Small delay to allow server to process disconnect
        setTimeout(() => {
          secondClient.disconnect();
          done();
        }, 100);
      });
    });
  });

  describe("Error Handling", () => {
    let clientSocket;

    beforeEach((done) => {
      clientSocket = new Client(baseUrl, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        done();
      });
    });

    afterEach(() => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    test("should handle empty message text", (done) => {
      clientSocket.on("error", (error) => {
        expect(error).toHaveProperty("message");
        expect(error.message).toContain("required");
        done();
      });

      clientSocket.emit("message", { text: "", tempId: "temp-123" });
    });

    test("should handle invalid message ID for edit", (done) => {
      clientSocket.on("error", (error) => {
        expect(error).toHaveProperty("message");
        done();
      });

      clientSocket.emit("editMessage", {
        id: "invalid-id",
        text: "New text",
      });
    });

    test("should handle invalid message ID for delete", (done) => {
      clientSocket.on("error", (error) => {
        expect(error).toHaveProperty("message");
        done();
      });

      clientSocket.emit("deleteMessage", { id: "invalid-id" });
    });
  });
});
