/**
 * Test Server Setup
 * Creates an isolated test server and database for integration testing
 */

const express = require("express");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");

// Import routes and middleware
const messageRoutes = require("../../routes/messageRoutes");
const userRoutes = require("../../routes/userRoutes");
const socketAuth = require("../../middleware/socketAuth");
const { apiLimiter } = require("../../middleware/rateLimiter");
const { socketRateLimiterMiddleware } = require("../../middleware/socketRateLimiter");

// Import socket handlers
const {
  registerMessageHandlers,
  handleConnection,
  sendOnlineUsers,
  registerDisconnectHandler,
} = require("../../sockets");

let mongoServer;
let testServer;
let io;
let httpServer;

/**
 * Setup test server with in-memory MongoDB
 */
const setupTestServer = async () => {
  try {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create Express app
    const app = express();

    // Configure CORS for testing
    app.use(cors({
      origin: true,
      credentials: true,
    }));

    // Parse JSON bodies
    app.use(express.json());

    // MongoDB injection protection
    app.use(mongoSanitize({ replaceWith: '_' }));

    // Basic home route
    app.get("/", (req, res) => {
      res.send("Test Chat Server is running");
    });

    // Simple health check endpoint for tests (no external dependencies)
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      });
    });

    // API routes with rate limiting
    app.use("/api/messages", apiLimiter, messageRoutes);
    app.use("/api/users", apiLimiter, userRoutes);

    // Create HTTP server
    httpServer = http.createServer(app);

    // Setup Socket.IO
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Apply socket authentication middleware
    io.use(socketAuth);

    // Apply socket rate limiting middleware
    io.use(socketRateLimiterMiddleware);

    // Setup socket connection handlers
    io.on("connection", async (socket) => {
      await handleConnection(socket, io);
      registerMessageHandlers(socket, io);
      registerDisconnectHandler(socket, io);
      sendOnlineUsers(io);
    });

    // Start server on random available port
    return new Promise((resolve) => {
      httpServer.listen(0, () => {
        const port = httpServer.address().port;
        testServer = {
          app,
          httpServer,
          io,
          port,
          baseUrl: `http://localhost:${port}`,
        };
        resolve(testServer);
      });
    });
  } catch (error) {
    console.error("Failed to setup test server:", error);
    throw error;
  }
};

/**
 * Teardown test server and database
 */
const teardownTestServer = async () => {
  try {
    // Close Socket.IO connections
    if (io) {
      io.close();
    }

    // Close HTTP server
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
    }

    // Disconnect from MongoDB and clean up
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    // Stop in-memory MongoDB
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error("Failed to teardown test server:", error);
    throw error;
  }
};

/**
 * Clear all database collections
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Get test server instance
 */
const getTestServer = () => {
  return testServer;
};

module.exports = {
  setupTestServer,
  teardownTestServer,
  clearDatabase,
  getTestServer,
};
