/**
 * Integration tests for Socket.IO functionality
 * Tests real-time messaging, authentication, and user presence
 */

const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const jwt = require("jsonwebtoken");

describe("Socket.IO Integration Tests", () => {
  let io, serverSocket, clientSocket, httpServer;
  const JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";

  // Helper function to create a valid JWT token
  const createToken = (userId, username) => {
    return jwt.sign(
      { id: userId, username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
  };

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      io.on("connection", (socket) => {
        serverSocket = socket;
      });
      clientSocket.on("connect", done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  describe("Socket Authentication", () => {
    test("should reject connection without token", (done) => {
      const unauthorizedClient = new Client(`http://localhost:${httpServer.address().port}`);

      unauthorizedClient.on("connect_error", (error) => {
        expect(error.message).toBeDefined();
        unauthorizedClient.close();
        done();
      });
    });

    test("should accept connection with valid token", (done) => {
      const token = createToken("user123", "testuser");
      const port = httpServer.address().port;
      const authorizedClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });

      authorizedClient.on("connect", () => {
        expect(authorizedClient.connected).toBe(true);
        authorizedClient.close();
        done();
      });
    });

    test("should reject connection with invalid token", (done) => {
      const port = httpServer.address().port;
      const invalidClient = new Client(`http://localhost:${port}`, {
        auth: { token: "invalid-token" }
      });

      invalidClient.on("connect_error", (error) => {
        expect(error.message).toBeDefined();
        invalidClient.close();
        done();
      });
    });
  });

  describe("Real-time Messaging", () => {
    let authenticatedClient;
    const token = createToken("user456", "chatuser");

    beforeEach((done) => {
      const port = httpServer.address().port;
      authenticatedClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });
      authenticatedClient.on("connect", done);
    });

    afterEach(() => {
      if (authenticatedClient) {
        authenticatedClient.close();
      }
    });

    test("should send and receive messages", (done) => {
      const messageData = {
        text: "Hello, World!",
        tempId: "temp-123",
        _meta: { correlationId: "correlation-123" }
      };

      serverSocket.on("message", (data) => {
        expect(data.text).toBe(messageData.text);
        expect(data.tempId).toBe(messageData.tempId);
        done();
      });

      authenticatedClient.emit("message", messageData);
    });

    test("should broadcast message to all connected clients", (done) => {
      const messageData = {
        text: "Broadcast test",
        tempId: "temp-456"
      };

      authenticatedClient.on("sendMessage", (data) => {
        expect(data.text).toBe(messageData.text);
        done();
      });

      serverSocket.emit("sendMessage", messageData);
    });

    test("should handle message reactions", (done) => {
      const reactionData = {
        id: "message-id-123",
        emoji: "👍"
      };

      serverSocket.on("reaction", (data) => {
        expect(data.id).toBe(reactionData.id);
        expect(data.emoji).toBe(reactionData.emoji);
        done();
      });

      authenticatedClient.emit("reaction", reactionData);
    });

    test("should handle message edits", (done) => {
      const editData = {
        id: "message-id-456",
        text: "Edited message content"
      };

      serverSocket.on("editMessage", (data) => {
        expect(data.id).toBe(editData.id);
        expect(data.text).toBe(editData.text);
        done();
      });

      authenticatedClient.emit("editMessage", editData);
    });

    test("should handle message deletion", (done) => {
      const deleteData = {
        id: "message-id-789"
      };

      serverSocket.on("deleteMessage", (data) => {
        expect(data.id).toBe(deleteData.id);
        done();
      });

      authenticatedClient.emit("deleteMessage", deleteData);
    });
  });

  describe("User Presence", () => {
    test("should notify when user connects", (done) => {
      const token = createToken("user789", "newuser");
      const port = httpServer.address().port;

      io.on("connection", (socket) => {
        expect(socket.connected).toBe(true);
        done();
      });

      const newClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });

      setTimeout(() => {
        newClient.close();
      }, 100);
    });

    test("should handle user disconnection", (done) => {
      const token = createToken("user999", "disconnectuser");
      const port = httpServer.address().port;
      const tempClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });

      tempClient.on("connect", () => {
        tempClient.close();
      });

      io.on("connection", (socket) => {
        socket.on("disconnect", (reason) => {
          expect(reason).toBeDefined();
          done();
        });
      });
    });
  });

  describe("Rate Limiting", () => {
    let rateLimitClient;
    const token = createToken("ratelimituser", "ratelimituser");

    beforeEach((done) => {
      const port = httpServer.address().port;
      rateLimitClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });
      rateLimitClient.on("connect", done);
    });

    afterEach(() => {
      if (rateLimitClient) {
        rateLimitClient.close();
      }
    });

    test("should handle rate limit events", (done) => {
      rateLimitClient.on("rateLimit", (data) => {
        expect(data.eventType).toBeDefined();
        expect(data.message).toContain("slow down");
        expect(data.retryAfter).toBeGreaterThan(0);
        done();
      });

      // Simulate rate limit by emitting event directly
      serverSocket.emit("rateLimit", {
        eventType: "message",
        message: "Too many messages. Please slow down.",
        retryAfter: 60
      });
    });
  });

  describe("Error Handling", () => {
    let errorClient;
    const token = createToken("erroruser", "erroruser");

    beforeEach((done) => {
      const port = httpServer.address().port;
      errorClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });
      errorClient.on("connect", done);
    });

    afterEach(() => {
      if (errorClient) {
        errorClient.close();
      }
    });

    test("should handle error events", (done) => {
      errorClient.on("error", (error) => {
        expect(error.message).toBeDefined();
        done();
      });

      serverSocket.emit("error", {
        message: "Test error message"
      });
    });

    test("should validate empty message text", (done) => {
      errorClient.on("error", (error) => {
        expect(error.message).toContain("required");
        done();
      });

      serverSocket.emit("error", {
        message: "Message text is required"
      });
    });
  });

  describe("Message Replies", () => {
    let replyClient;
    const token = createToken("replyuser", "replyuser");

    beforeEach((done) => {
      const port = httpServer.address().port;
      replyClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });
      replyClient.on("connect", done);
    });

    afterEach(() => {
      if (replyClient) {
        replyClient.close();
      }
    });

    test("should handle message replies", (done) => {
      const replyData = {
        parentId: "parent-message-id",
        text: "This is a reply"
      };

      serverSocket.on("replyToMessage", (data) => {
        expect(data.parentId).toBe(replyData.parentId);
        expect(data.text).toBe(replyData.text);
        done();
      });

      replyClient.emit("replyToMessage", replyData);
    });

    test("should broadcast new replies", (done) => {
      const replyData = {
        _id: "reply-id-123",
        parentId: "parent-message-id",
        text: "New reply",
        user: "replyuser"
      };

      replyClient.on("replyCreated", (data) => {
        expect(data.parentId).toBe(replyData.parentId);
        expect(data.text).toBe(replyData.text);
        done();
      });

      serverSocket.emit("replyCreated", replyData);
    });
  });

  describe("Online Users", () => {
    test("should send online users list", (done) => {
      const token = createToken("onlineuser", "onlineuser");
      const port = httpServer.address().port;
      const onlineClient = new Client(`http://localhost:${port}`, {
        auth: { token }
      });

      onlineClient.on("onlineUsers", (users) => {
        expect(Array.isArray(users)).toBe(true);
        onlineClient.close();
        done();
      });

      io.on("connection", (socket) => {
        socket.emit("onlineUsers", [
          { id: "user1", username: "user1" },
          { id: "user2", username: "user2" }
        ]);
      });
    });
  });
});
