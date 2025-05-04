/**
 * Minimal server to debug path-to-regexp issues
 */

const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

console.log("=== MINIMAL SERVER START ===");

// Import the message routes directly
// We're avoiding any middleware complexity to isolate the issue
try {
  console.log("Importing userRoutes...");
  const userRoutes = require("./routes/userRoutes");
  console.log("userRoutes imported successfully");

  console.log("Importing messageRoutes...");
  const messageRoutes = require("./routes/messageRoutes");
  console.log("messageRoutes imported successfully");

  // Create an Express app
  const app = express();

  // Add basic middleware
  app.use(cors());
  app.use(express.json());

  console.log("Registering userRoutes...");
  app.use("/api/users", userRoutes);
  console.log("userRoutes registered successfully");

  console.log("Registering messageRoutes...");
  app.use("/api/messages", messageRoutes);
  console.log("messageRoutes registered successfully");

  // Create HTTP server
  const server = http.createServer(app);

  // Start the server
  const PORT = process.env.PORT || 4500;
  server.listen(PORT, () => {
    console.log(`Minimal server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Error in minimal server:", error);
  console.error("Stack trace:", error.stack);
}
