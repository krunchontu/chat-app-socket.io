const http = require("http");
const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Load environment variables from .env file
const { Server } = require("socket.io"); // Updated import
const { v4: uuidv4 } = require("uuid"); // Import uuid
const connectDB = require("./config/db"); // Import database connection
const messageRoutes = require("./routes/messageRoutes"); // Import message routes
const userRoutes = require("./routes/userRoutes"); // Import user routes
const socketAuth = require("./middleware/socketAuth"); // Import socket authentication middleware
const { apiLimiter } = require("./middleware/rateLimiter"); // Import rate limiter
const logger = require("./utils/logger"); // Import enhanced logging utilities
const {
  createMessage,
  toggleMessageLike,
  editMessage,
  deleteMessage,
  replyToMessage,
  toggleReaction,
} = require("./controllers/messageController");

// Connect to MongoDB with proper error handling
let dbConnection;
try {
  dbConnection = connectDB();

  // Check if we're using mock database fallback
  dbConnection
    .then((conn) => {
      if (conn && conn.connection && conn.connection.isMockDB) {
        logger.db.warn(
          "Server running with mock database! This is a fallback mode."
        );
        console.log(
          "\n⚠️ USING MOCK DATABASE - Some features will be limited ⚠️\n"
        );
      }
    })
    .catch((err) => {
      logger.db.error("Failed to establish database connection:", err);
    });
} catch (error) {
  logger.db.error("Fatal database connection error:", error);
}

const app = express();
// Use PORT from .env or default to 4500
const port = process.env.PORT || 4500;

// Configure CORS properly
const corsOptions = {
  origin: function (origin, callback) {
    // Get allowed origins from environment or default to localhost and render URL
    const allowedOrigins = process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(",")
      : [
          "http://localhost:3000",
          "https://chat-app-frontend-hgqg.onrender.com",
          // Include both with and without protocol for better compatibility
          "chat-app-frontend-hgqg.onrender.com",
        ];

    // Strict CORS: Only allow explicitly whitelisted origins
    // SECURITY: DO NOT dynamically add origins - this defeats CORS protection
    // ISSUE-002: Removed dangerous auto-addition of origins

    // Allow requests with no origin (like mobile apps, curl, Postman, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      logger.api.info("CORS: Allowed request from origin", { origin });
      callback(null, true);
    } else {
      logger.api.warn("CORS: Blocked request from unauthorized origin", {
        origin,
        allowedOrigins: allowedOrigins.join(", ")
      });
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // Allow cookies for authentication if needed
  optionsSuccessStatus: 204,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // Cache preflight request results for 24 hours (in seconds)
};

// Pre-flight OPTIONS requests handling for CORS
app.options("*", cors(corsOptions));

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Log CORS configuration
console.log("CORS configuration:", {
  allowedOrigins: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",")
    : [
        "http://localhost:3000",
        "https://chat-app-frontend-hgqg.onrender.com",
        "chat-app-frontend-hgqg.onrender.com",
      ],
  methods: corsOptions.methods,
  credentials: corsOptions.credentials,
});
app.use(express.json()); // Parse JSON bodies

// Basic home route
app.get("/", (req, res) => {
  res.send("Chat Server is running");
});

// API routes with rate limiting
app.use("/api", apiLimiter); // Apply rate limiting to all API routes
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

const server = http.createServer(app);

// Initialize Socket.IO Server with CORS configuration matching Express settings
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: corsOptions.methods,
    credentials: corsOptions.credentials,
    allowedHeaders: corsOptions.allowedHeaders,
    exposedHeaders: corsOptions.exposedHeaders,
    maxAge: corsOptions.maxAge,
  },
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  pingTimeout: 60000, // Increase ping timeout for better connection stability
  pingInterval: 25000, // Ping interval for keeping connections alive
  connectTimeout: 30000, // Connection timeout
});

// Log the configured port
console.log(
  `Server configured to use port: ${port} (from .env: ${
    process.env.PORT || "not set"
  })`
);

// Apply socket authentication middleware
io.use(socketAuth);

// Log socket.io configuration
console.log("Socket.IO configuration:", {
  cors: {
    allowedOrigins: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(",")
      : [
          "http://localhost:3000",
          "https://chat-app-frontend-hgqg.onrender.com",
          "chat-app-frontend-hgqg.onrender.com",
        ],
    methods: corsOptions.methods,
    credentials: corsOptions.credentials,
  },
  path: "/socket.io/",
  transports: ["websocket", "polling"],
});

// Store connected users: { socketId: { id, username } }
const connectedUsers = {};

io.on("connection", (socket) => {
  // Store authenticated user in connectedUsers
  if (socket.user) {
    connectedUsers[socket.id] = {
      id: socket.user.id,
      username: socket.user.username,
    };

    logger.socket.info("User connected", {
      socketId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
    });

    // Broadcast user joined notification
    socket.broadcast.emit("userNotification", {
      type: "join",
      message: `${socket.user.username} has joined the chat`,
      timestamp: new Date(),
    });
  } else {
    logger.socket.warn("Unauthenticated connection rejected", {
      socketId: socket.id,
    });
    socket.disconnect(true);
    return;
  }

  // Listen for new messages
  socket.on("message", async (newMessageData) => {
    try {
      const correlationId = newMessageData._meta?.correlationId || uuidv4();
      logger.socket.info("Message received from client", {
        socketId: socket.id,
        userId: socket.user.id,
        username: socket.user.username,
        tempId: newMessageData.tempId,
        correlationId,
      });

      // Validate message text
      const text = newMessageData.text;

      // Basic validation
      if (!text || typeof text !== "string" || !text.trim()) {
        logger.socket.warn("Message rejected: empty text", {
          socketId: socket.id,
          userId: socket.user.id,
          correlationId,
        });
        socket.emit("error", { message: "Message text is required" });
        return;
      }

      // Check message length
      if (text.length > 500) {
        logger.socket.warn("Message rejected: too long", {
          socketId: socket.id,
          userId: socket.user.id,
          textLength: text.length,
          correlationId,
        });
        socket.emit("error", {
          message: "Message is too long (max 500 characters)",
        });
        return;
      }

      // Use authenticated user information from socket
      const userName = socket.user.username;

      // Prepare message data with correlation ID for tracing
      const messageData = {
        user: userName, // Use the server-known username
        text: text.trim(), // Sanitize the message text
        timestamp: new Date(), // Add timestamp
        likes: 0, // Initialize likes
        _meta: { correlationId, tempId: newMessageData.tempId },
      };

      // Save message to database
      const savedMessage = await createMessage(messageData);

      // Add correlation ID to the response for client-side tracking
      const messageResponse = {
        ...savedMessage.toObject(),
        tempId: newMessageData.tempId, // Return temp ID for optimistic UI update replacement
      };

      // Enhance the messageResponse with debug metadata
      const enhancedResponse = {
        ...messageResponse,
        _meta: {
          ...(messageResponse._meta || {}),
          eventType: "sendMessage", // Mark the event type
          correlationId,
          serverTimestamp: new Date().toISOString(),
          broadcastTime: Date.now(),
          fromSocketId: socket.id,
          fromUserId: socket.user.id,
          fromUsername: socket.user.username,
        },
      };

      // Log connected clients before broadcast
      const connectedClientIds = Object.keys(io.sockets.sockets);
      logger.socket.info(
        `Broadcasting message to ${connectedClientIds.length} connected clients`,
        {
          clientIds: connectedClientIds,
        }
      );

      // Broadcast using sendMessage event type
      io.emit("sendMessage", enhancedResponse);

      // Also create a variant with the "message" event type
      const messageTypeResponse = {
        ...enhancedResponse,
        _meta: {
          ...enhancedResponse._meta,
          eventType: "message", // Override event type for the message event
        },
      };

      // Also broadcast as plain "message" event for broader client compatibility
      io.emit("message", messageTypeResponse);

      // Log detailed broadcast information
      logger.socket.info("Message broadcast complete", {
        messageId: savedMessage._id,
        userId: socket.user.id,
        username: socket.user.username,
        tempId: newMessageData.tempId,
        correlationId,
        events: ["sendMessage", "message"],
        timestamp: new Date().toISOString(),
        clientCount: connectedClientIds.length,
      });

      // Debug: Verify each client socket received the message
      connectedClientIds.forEach((clientId) => {
        const clientSocket = io.sockets.sockets[clientId];
        logger.socket.debug(`Verifying message sent to client: ${clientId}`, {
          clientInfo: {
            id: clientId,
            connected: clientSocket?.connected || false,
            username: connectedUsers[clientId]?.username || "unknown",
          },
        });
      });
    } catch (error) {
      logger.socket.error("Error processing message", {
        socketId: socket.id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });

      // Notify the client of the error
      socket.emit("error", { message: "Failed to process message" });
    }
  });

  // Listen for like updates (backward compatibility for legacy clients)
  socket.on("like", async ({ id }) => {
    try {
      // Basic validation: Ensure message id is provided
      if (id && socket.user && socket.user.id) {
        // Toggle like status in the database
        const updatedMessage = await toggleMessageLike(id, socket.user.id);

        if (updatedMessage) {
          console.log(
            `Like toggled for message ${id} by user ${socket.user.username}, new count: ${updatedMessage.likes}`
          );

          // Broadcast the update to all clients
          io.emit("messageUpdated", {
            id,
            likes: updatedMessage.likes,
            likedBy: updatedMessage.likedBy,
            reactions: updatedMessage.reactions,
          });
        } else {
          console.warn(`Message not found: ${id}`);
          socket.emit("error", { message: "Message not found" });
        }
      } else {
        console.warn(`Invalid 'like' event received or user not authenticated`);
        socket.emit("error", {
          message: "Invalid like data or not authenticated",
        });
      }
    } catch (error) {
      console.error("Error updating likes:", error);
      socket.emit("error", { message: "Failed to update likes" });
    }
  });

  // Listen for reaction updates (new system for all emoji reactions)
  socket.on("reaction", async ({ id, emoji }) => {
    try {
      // Basic validation
      if (!id || !emoji || !socket.user || !socket.user.id) {
        socket.emit("error", {
          message: "Invalid reaction data or not authenticated",
        });
        return;
      }

      // Toggle reaction in the database
      const updatedMessage = await toggleReaction(id, socket.user.id, emoji);

      if (updatedMessage) {
        console.log(
          `${emoji} reaction toggled for message ${id} by user ${socket.user.username}`
        );

        // Broadcast the update to all clients
        io.emit("messageUpdated", {
          id,
          likes: updatedMessage.likes, // Include for backward compatibility
          likedBy: updatedMessage.likedBy, // Include for backward compatibility
          reactions: updatedMessage.reactions,
        });
      } else {
        socket.emit("error", { message: "Message not found" });
      }
    } catch (error) {
      console.error(`Error handling reaction: ${error.message}`);
      socket.emit("error", { message: "Failed to update reaction" });
    }
  });

  // Listen for message edit requests
  socket.on("editMessage", async ({ id, text }) => {
    try {
      // Basic validation
      if (!id || !text || typeof text !== "string" || !text.trim()) {
        socket.emit("error", { message: "Message ID and text are required" });
        return;
      }

      // Check message length
      if (text.length > 500) {
        socket.emit("error", {
          message: "Message is too long (max 500 characters)",
        });
        return;
      }

      // Edit message in database
      const updatedMessage = await editMessage(id, socket.user.id, text.trim());

      if (updatedMessage) {
        console.log(`Message ${id} edited by user ${socket.user.username}`);

        // Broadcast the updated message to all clients
        io.emit("messageEdited", updatedMessage);
      } else {
        socket.emit("error", { message: "Failed to edit message" });
      }
    } catch (error) {
      console.error(`Error editing message: ${error.message}`);
      socket.emit("error", {
        message: error.message || "Failed to edit message",
      });
    }
  });

  // Listen for message delete requests
  socket.on("deleteMessage", async (data) => {
    try {
      console.log("Received deleteMessage request:", data);

      // Extract message ID from payload
      const { id } = data;

      // Basic validation
      if (!id) {
        socket.emit("error", { message: "Message ID is required" });
        return;
      }

      // Log authenticated user information
      console.log("User attempting delete:", {
        id: socket.user.id,
        username: socket.user.username,
      });

      // Delete message in database (soft delete)
      const deletedMessage = await deleteMessage(id, socket.user.id);

      if (deletedMessage) {
        console.log(`Message ${id} deleted by user ${socket.user.username}`);

        // Broadcast the deletion to all clients
        io.emit("messageDeleted", { id });
      } else {
        socket.emit("error", { message: "Failed to delete message" });
      }
    } catch (error) {
      console.error(`Error deleting message: ${error.message}`);
      socket.emit("error", {
        message: error.message || "Failed to delete message",
      });
    }
  });

  // Listen for message replies
  socket.on("replyToMessage", async ({ parentId, text }) => {
    try {
      // Validate required fields
      if (!parentId || !text || typeof text !== "string" || !text.trim()) {
        socket.emit("error", {
          message: "Parent message ID and reply text are required",
        });
        return;
      }

      // Check message length
      if (text.length > 500) {
        socket.emit("error", {
          message: "Reply is too long (max 500 characters)",
        });
        return;
      }

      // Use authenticated user information from socket
      const userName = socket.user.username;

      // Prepare message data
      const messageData = {
        user: userName,
        text: text.trim(),
        timestamp: new Date(),
        likes: 0,
      };

      // Save reply to database
      const savedReply = await replyToMessage(messageData, parentId);

      if (savedReply) {
        console.log(`Reply to message ${parentId} sent by ${userName}`);

        // Broadcast the new reply to all clients
        io.emit("replyCreated", savedReply);
      } else {
        socket.emit("error", { message: "Failed to create reply" });
      }
    } catch (error) {
      console.error(`Error creating reply: ${error.message}`);
      socket.emit("error", {
        message: error.message || "Failed to create reply",
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", async (reason) => {
    if (connectedUsers[socket.id]) {
      const { username, id } = connectedUsers[socket.id];

      logger.socket.info("User disconnected", {
        socketId: socket.id,
        userId: id,
        username,
        reason,
        onlineUsersCount: Object.keys(connectedUsers).length - 1,
      });

      // Broadcast user left notification
      socket.broadcast.emit("userNotification", {
        type: "leave",
        message: `${username} has left the chat`,
        timestamp: new Date(),
      });

      // Set user offline in database
      try {
        const User = require("./models/user");
        await User.findByIdAndUpdate(id, { isOnline: false });
      } catch (error) {
        logger.socket.error("Failed to update user online status", {
          userId: id,
          username,
          errorMessage: error.message,
          stack: error.stack,
        });
      }

      // Remove user from connected users
      delete connectedUsers[socket.id];
    } else {
      logger.socket.warn("Unknown user disconnected", {
        socketId: socket.id,
      });
    }
  });

  // Send the list of online users to the newly connected client
  socket.emit(
    "onlineUsers",
    Object.values(connectedUsers).map((user) => ({
      id: user.id,
      username: user.username,
    }))
  );
});

server.listen(port, () => {
  console.log(`\n----- SERVER STARTED -----`);
  console.log(`Server is running on port: ${port}`);

  // Use environment-specific hostname
  const isProduction = process.env.NODE_ENV === "production";
  const hostname = isProduction
    ? process.env.HOST || "chat-app-backend-hgqg.onrender.com"
    : "localhost";

  const wsProtocol = isProduction ? "wss" : "ws";
  const httpProtocol = isProduction ? "https" : "http";

  console.log(
    `Socket.IO is available at: ${wsProtocol}://${hostname}${
      isProduction ? "" : `:${port}`
    }/socket.io/`
  );
  console.log(
    `HTTP API is available at: ${httpProtocol}://${hostname}${
      isProduction ? "" : `:${port}`
    }/api/`
  );
  console.log(`---------------------------\n`);

  logger.app.info(`Server started successfully`, {
    port,
    environment: process.env.NODE_ENV || "development",
    hostname,
    time: new Date().toISOString(),
  });
});
