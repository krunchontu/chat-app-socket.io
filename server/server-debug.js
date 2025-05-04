/**
 * Debug version of server to identify path-to-regexp issues
 */

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

// Import modules
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const connectDB = require("./config/db");

console.log("=== DEBUG MODE START ===");
console.log("Debugging path-to-regexp errors");

// Basic configuration
const config = {
  port: process.env.PORT || 4500,
  corsOrigins: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",")
    : ["http://localhost:3000"],
  isDevelopment: true,
};

// Create Express app
const app = express();

// CORS configuration - simplified
app.use(cors());

// Body parsing middleware
app.use(express.json());

// Add basic routes
app.get("/", (req, res) => {
  res.send("Debug Server is running");
});

// Add status route with more debug info
app.get("/api/status", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString(),
    debug: true,
    nodeVersion: process.version,
    expressVersion: require("express/package.json").version,
    socketioVersion: require("socket.io/package.json").version,
  });
});

// Debug route registration step-by-step
console.log("Route registration debug:");

try {
  console.log("- Adding /api/users routes");
  app.use("/api/users", userRoutes);
  console.log("  ✓ User routes registered successfully");
} catch (error) {
  console.error("✗ Error registering user routes:", error);
}

// Try registering real message routes
try {
  console.log(
    "- Adding real /api/messages routes - this might fail with a path-to-regexp error"
  );
  app.use("/api/messages", messageRoutes);
  console.log("  ✓ Real message routes registered successfully");
} catch (error) {
  console.error("✗ Error registering real message routes:", error);
  console.error("  Error details:", error.stack);
}

/**
 * Main function to start the debug server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("MongoDB connected successfully");

    // Create HTTP server
    const server = http.createServer(app);
    console.log("HTTP server created");

    // Create Socket.IO server
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    console.log("Socket.IO server created");

    // Basic socket connection handler
    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });

    // Start server
    server.listen(config.port, () => {
      console.log(`\n----- DEBUG SERVER STARTED -----`);
      console.log(`Server is running on port: ${config.port}`);
      console.log(
        `Socket.IO is available at: http://localhost:${config.port}/socket.io/`
      );
      console.log(
        `HTTP API is available at: http://localhost:${config.port}/api/`
      );
      console.log(`---------------------------\n`);
    });

    return { app, server, io };
  } catch (error) {
    console.error("Error starting debug server:", error);
    console.log("Error stack:", error.stack);
  }
}

// Start the server
startServer();
