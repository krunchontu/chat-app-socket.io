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

// Basic configuration
const config = {
  port: process.env.PORT || 5700,
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

  // CORS configuration - keeping it simple
  app.use(
    cors({
      origin: "*", // Allow all origins for testing
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );

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

  // Add placeholder API routes with no path parameters
  app.get("/api/messages", function messagesRoute(req, res) {
    res.json({ messages: [] });
  });

  app.get("/api/users", function usersRoute(req, res) {
    res.json({ users: [] });
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
      origin: "*", // Allow all origins for testing
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Store connected users
  const connectedUsers = {};

  // Connection handler
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Store connected user
    connectedUsers[socket.id] = {
      id: socket.id,
      connectedAt: new Date(),
    };

    // Handle messages
    socket.on("message", (data) => {
      console.log("Message received:", data);

      // Add server data
      const enhancedMessage = {
        ...data,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all clients
      io.emit("message", enhancedMessage);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Remove from connected users
      delete connectedUsers[socket.id];
    });
  });

  return io;
}

/**
 * Main function to start the server
 */
function startServer() {
  try {
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
