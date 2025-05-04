/**
 * Chat Application Server - Final Refactored Version
 * Incorporates modular architecture while avoiding path parameter issues
 */

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

// Import custom modules
const logger = require("./utils/logger");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const connectDB = require("./config/db");

// Basic configuration
const config = {
  port: process.env.PORT || 4500,
  corsOrigins: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",")
    : ["http://localhost:3000"],
  isDevelopment: process.env.NODE_ENV !== "production",
};

/**
 * Creates and configures the Express application
 */
function createExpressApp() {
  // Create Express app
  const app = express();

  // CORS configuration - updated to work with credentials and WebSocket
  app.use(
    cors({
      origin: config.corsOrigins, // Use specific allowed origins
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      preflightContinue: false,
      optionsSuccessStatus: 204,
      maxAge: 3600, // Cache preflight responses for 1 hour
    })
  );

  // Handle preflight OPTIONS requests
  app.options("*", cors());

  // Body parsing middleware
  app.use(express.json());

  // Add basic routes
  app.get("/", function homeRoute(req, res) {
    res.send("Chat Server is running");
  });

  app.get("/api/status", function statusRoute(req, res) {
    res.json({
      status: "OK",
      time: new Date().toISOString(),
    });
  });

  // Register actual route modules
  app.use("/api/users", userRoutes);
  app.use("/api/messages", messageRoutes);

  // Remove placeholder as we now use the proper route module

  // Create global object to track socket stats that can be shared
  global.socketStats = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    lastConnection: null,
    transportUsed: {},
    connectedSockets: {},
  };

  // Add health-check route for debugging purposes including socket stats
  app.get("/api/socket-health", function socketHealthRoute(req, res) {
    try {
      // Clean up the socketStats by removing any socket IDs for privacy
      const sanitizedStats = {
        ...global.socketStats,
        connectedSockets: Object.keys(global.socketStats.connectedSockets || {})
          .length,
      };

      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        server: {
          nodejs: process.version,
          environment: process.env.NODE_ENV || "development",
          uptime: process.uptime(),
        },
        socketStats: sanitizedStats,
      });
    } catch (error) {
      console.error("Error in socket-health route:", error);
      res.status(500).json({
        status: "ERROR",
        message: "Error retrieving socket health information",
        error: error.message,
      });
    }
  });

  return app;
}

/**
 * Creates and configures the Socket.IO server
 */
function createSocketServer(httpServer) {
  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins, // Use specific allowed origins
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
    transports: ["websocket", "polling"], // Match client configuration (websocket first)
    allowEIO3: true, // Allow compatibility with older clients
    pingTimeout: 60000, // Increased timeout to allow for slower networks
    pingInterval: 25000, // Less frequent pings to reduce overhead
    connectTimeout: 45000, // Increased to allow more time for initial connection
    maxHttpBufferSize: 1e6, // 1 MB (default)
    allowUpgrades: true, // Explicitly allow transport upgrades
    upgradeTimeout: 10000, // Time to wait for upgrade
  });

  // Apply socket authentication middleware in all environments
  // but with more tolerant settings in development
  try {
    const socketAuth = require("./middleware/socketAuth");

    // In development, use a wrapper that logs but doesn't reject
    if (config.isDevelopment) {
      io.use((socket, next) => {
        console.log("Development mode: Socket authentication logging only");

        // If token is present, validate it but don't enforce
        if (socket.handshake.auth && socket.handshake.auth.token) {
          socketAuth(socket, (err) => {
            if (err) {
              console.warn("Auth would fail in production:", err.message);
              // But allow connection in development
              socket.authWarning = err.message;
            }
            next();
          });
        } else {
          console.warn("No auth token provided, would fail in production");
          next();
        }
      });

      console.log(
        "Socket authentication middleware in DEV MODE with warnings only"
      );
    } else {
      // In production, apply real authentication
      io.use(socketAuth);
      console.log(
        "Socket authentication middleware ENFORCED in production mode"
      );
    }
  } catch (error) {
    console.error("Failed to apply socket authentication middleware:", error);
  }

  // Store connected users with more metadata
  const connectedUsers = {};

  // Add middleware to handle WebSocket-specific issues
  io.engine.on("connection", (rawSocket) => {
    console.log("New transport connection attempt:", {
      transport: rawSocket.transport?.name || "unknown",
      headers: {
        upgrade: rawSocket.request?.headers?.upgrade,
        connection: rawSocket.request?.headers?.connection,
      },
      remoteAddress: rawSocket.request?.connection?.remoteAddress,
      timestamp: new Date().toISOString(),
    });
  });

  // Update global socket stats for tracking
  // (Note: using global.socketStats here so it's accessible from the health route)

  // Connection handler with improved logging
  io.on("connection", (socket) => {
    // Record connection stats
    const transport = socket.conn.transport.name || "unknown";
    global.socketStats.totalConnections++;
    global.socketStats.activeConnections++;
    global.socketStats.lastConnection = new Date().toISOString();
    global.socketStats.transportUsed[transport] =
      (global.socketStats.transportUsed[transport] || 0) + 1;
    global.socketStats.connectedSockets[socket.id] = {
      connectedAt: new Date().toISOString(),
      transport,
    };

    console.log("User connected:", socket.id, {
      transport,
      remoteAddress: socket.handshake.address,
      userAgent: socket.handshake.headers["user-agent"],
      query: socket.handshake.query,
      stats: {
        total: global.socketStats.totalConnections,
        active: global.socketStats.activeConnections,
      },
    });

    // Log handshake details for debugging
    console.log("Socket handshake details:", {
      auth: socket.handshake.auth,
      headers: Object.keys(socket.handshake.headers),
      timestamp: new Date().toISOString(),
    });

    // Extract user info from auth token if available
    let userId = null;
    let username = null;

    // Handle user authentication
    socket.on("authenticate", (userData) => {
      // Log the incoming authentication data
      console.log("Authentication attempt:", {
        socketId: socket.id,
        userData: userData
          ? {
              userId: userData.userId,
              username: userData.username,
              timestamp: userData.timestamp,
            }
          : "No user data provided",
      });

      if (userData && userData.userId && userData.username) {
        userId = userData.userId;
        username = userData.username;

        // Store enhanced user info
        connectedUsers[socket.id] = {
          id: socket.id,
          userId: userData.userId,
          username: userData.username,
          connectedAt: new Date(),
          authMethod: "event", // Track that this was authenticated via event
          ipAddress: socket.handshake.address,
        };

        // Acknowledge successful authentication
        socket.emit("authenticated", {
          success: true,
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });

        console.log(`User authenticated: ${username} (${userId})`);

        // Broadcast updated online users to all clients
        broadcastOnlineUsers();
      } else {
        console.warn("Invalid authentication data received:", userData);
        socket.emit("authenticated", {
          success: false,
          error: "Invalid authentication data",
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Store basic connected user initially
    connectedUsers[socket.id] = {
      id: socket.id,
      connectedAt: new Date(),
    };

    // Handle subscribe events (for joining rooms after authentication)
    socket.on("subscribe", (subscriptionData) => {
      if (!subscriptionData || !subscriptionData.rooms) {
        console.warn("Invalid subscription data received:", subscriptionData);
        return;
      }

      console.log(
        `User ${socket.id} subscribing to rooms:`,
        subscriptionData.rooms
      );

      // Join each requested room
      subscriptionData.rooms.forEach((room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      });

      // Acknowledge subscription
      socket.emit("subscribed", {
        success: true,
        rooms: subscriptionData.rooms,
        timestamp: new Date().toISOString(),
      });
    });

    // Broadcast online users on new connection
    broadcastOnlineUsers();

    // Handle messages
    socket.on("message", (data) => {
      console.log("Message received:", data);

      // Get the user info for this socket
      const userInfo = connectedUsers[socket.id];
      const senderName =
        userInfo && userInfo.username ? userInfo.username : "Unknown User";
      const senderId = userInfo && userInfo.userId ? userInfo.userId : null;

      // Add server data with enhanced user info
      const enhancedMessage = {
        ...data,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: senderName, // Add username explicitly
        userId: senderId, // Add userId explicitly
      };

      // Log the enhanced message for debugging
      console.log("Broadcasting message with user info:", {
        messageId: enhancedMessage.id,
        user: enhancedMessage.user,
        userId: enhancedMessage.userId,
        text:
          enhancedMessage.text?.substring(0, 30) +
          (enhancedMessage.text?.length > 30 ? "..." : ""),
      });

      // Broadcast to all clients
      io.emit("message", enhancedMessage);
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, {
        reason,
        transport: socket.conn?.transport?.name || "unknown",
        stats: {
          totalBefore: global.socketStats.activeConnections,
        },
      });

      // Update connection stats
      global.socketStats.activeConnections = Math.max(
        0,
        global.socketStats.activeConnections - 1
      );
      delete global.socketStats.connectedSockets[socket.id];

      // Remove from connected users
      delete connectedUsers[socket.id];

      // Broadcast updated online users to all clients
      broadcastOnlineUsers();
    });

    // Helper function to broadcast online users
    function broadcastOnlineUsers() {
      // Format user list to include only necessary information
      const userList = Object.values(connectedUsers)
        .filter((user) => user.username) // Only include authenticated users
        .map((user) => ({
          userId: user.userId,
          username: user.username,
          socketId: user.id,
          connectedAt: user.connectedAt,
        }));

      console.log(`Broadcasting online users: ${userList.length} users`);
      io.emit("onlineUsers", userList);
    }
  });

  return io;
}

/**
 * Main function to start the server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    const dbConnection = await connectDB();
    console.log("MongoDB connected successfully");

    // Create Express app
    const app = createExpressApp();
    console.log("Express app created");

    // Create HTTP server
    const server = http.createServer(app);
    console.log("HTTP server created");

    // Create Socket.IO server
    const io = createSocketServer(server);
    console.log("Socket.IO server created");

    // Start server
    server.listen(config.port, () => {
      console.log(`\n----- SERVER STARTED -----`);
      console.log(`Server is running on port: ${config.port}`);
      console.log(
        `Socket.IO is available at: http://localhost:${config.port}/socket.io/`
      );
      console.log(
        `HTTP API is available at: http://localhost:${config.port}/api/`
      );
      console.log(`---------------------------\n`);
    });

    // Setup graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");

      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });

    return { app, server, io };
  } catch (error) {
    console.error("Error starting server:", error);

    if (config.isDevelopment) {
      process.exit(1);
    }
  }
}

// Start the server when this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
