/**
 * Simple test server to debug path-to-regexp issues
 */

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// Create Express app
const app = express();

// CORS configuration - simplified
app.use(cors());

// Body parsing middleware
app.use(express.json());

// Add basic routes
app.get("/", (req, res) => {
  res.send("Chat Server Test is running");
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString(),
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server with minimal config
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Basic socket connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 4500;
server.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Connect to http://localhost:${PORT} to test`);
});
