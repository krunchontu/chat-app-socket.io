const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize"); // SECURITY: NoSQL injection protection
require("dotenv").config(); // Load environment variables from .env file
const { Server } = require("socket.io"); // Updated import
const { v4: uuidv4 } = require("uuid"); // Import uuid
const swaggerUi = require("swagger-ui-express"); // Swagger UI
const swaggerSpec = require("./swagger"); // Swagger configuration
const connectDB = require("./config/db"); // Import database connection
const messageRoutes = require("./routes/messageRoutes"); // Import message routes
const userRoutes = require("./routes/userRoutes"); // Import user routes
const healthRoutes = require("./routes/healthRoutes"); // Import health routes
const socketAuth = require("./middleware/socketAuth"); // Import socket authentication middleware
const { apiLimiter } = require("./middleware/rateLimiter"); // Import rate limiter
const { socketRateLimiterMiddleware } = require("./middleware/socketRateLimiter"); // Import socket rate limiter
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
          "Server running with mock database! This is a fallback mode.", {
            warning: "USING MOCK DATABASE - Some features will be limited"
          }
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
logger.api.info("CORS configuration loaded", {
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

// SECURITY FIX (ISSUE-020): MongoDB injection protection
// Sanitize user input to prevent NoSQL injection attacks
app.use(mongoSanitize({
  replaceWith: '_', // Replace prohibited characters with underscore
  onSanitize: ({ req, key }) => {
    logger.api.warn("Potential NoSQL injection attempt detected and sanitized", {
      path: req.path,
      method: req.method,
      sanitizedKey: key,
      ip: req.ip
    });
  }
}));

// Basic home route
app.get("/", (req, res) => {
  res.send("Chat Server is running");
});

// Health check routes (no rate limiting for monitoring)
app.use("/", healthRoutes);

// Swagger API Documentation (no rate limiting for docs)
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Chat App API Documentation",
    customfavIcon: "/favicon.ico"
  })
);

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
logger.app.info("Server port configured", {
  port,
  envPort: process.env.PORT || "not set",
});

// Apply socket authentication middleware
io.use(socketAuth);

// Apply socket rate limiting middleware
io.use(socketRateLimiterMiddleware);

// Attach io instance to app for health checks
app.set("io", io);

// Log socket.io configuration
logger.socket.info("Socket.IO configuration loaded", {
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
      // Check rate limit
      if (socket.checkRateLimit("message")) {
        socket.emit("rateLimit", {
          eventType: "message",
          message: "Too many messages. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

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
      // Check rate limit
      if (socket.checkRateLimit("like")) {
        socket.emit("rateLimit", {
          eventType: "like",
          message: "Too many like requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      // Basic validation: Ensure message id is provided
      if (id && socket.user && socket.user.id) {
        // Toggle like status in the database
        const updatedMessage = await toggleMessageLike(id, socket.user.id);

        if (updatedMessage) {
          logger.socket.info("Like toggled", {
            messageId: id,
            userId: socket.user.id,
            username: socket.user.username,
            newLikeCount: updatedMessage.likes,
          });

          // Broadcast the update to all clients
          io.emit("messageUpdated", {
            id,
            likes: updatedMessage.likes,
            likedBy: updatedMessage.likedBy,
            reactions: updatedMessage.reactions,
          });
        } else {
          logger.socket.warn("Message not found for like", {
            messageId: id,
            userId: socket.user?.id,
          });
          socket.emit("error", { message: "Message not found" });
        }
      } else {
        logger.socket.warn("Invalid like event or user not authenticated", {
          hasId: !!id,
          hasUser: !!socket.user,
          hasUserId: !!socket.user?.id,
        });
        socket.emit("error", {
          message: "Invalid like data or not authenticated",
        });
      }
    } catch (error) {
      logger.socket.error("Error updating likes", {
        messageId: id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", { message: "Failed to update likes" });
    }
  });

  // Listen for reaction updates (new system for all emoji reactions)
  socket.on("reaction", async ({ id, emoji }) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("reaction")) {
        socket.emit("rateLimit", {
          eventType: "reaction",
          message: "Too many reaction requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

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
        logger.socket.info("Reaction toggled", {
          messageId: id,
          userId: socket.user.id,
          username: socket.user.username,
          emoji,
        });

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
      logger.socket.error("Error handling reaction", {
        messageId: id,
        userId: socket.user?.id,
        emoji,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", { message: "Failed to update reaction" });
    }
  });

  // Listen for message edit requests
  socket.on("editMessage", async ({ id, text }) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("editMessage")) {
        socket.emit("rateLimit", {
          eventType: "editMessage",
          message: "Too many edit requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

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
        logger.socket.info("Message edited", {
          messageId: id,
          userId: socket.user.id,
          username: socket.user.username,
        });

        // Broadcast the updated message to all clients
        io.emit("messageEdited", updatedMessage);
      } else {
        socket.emit("error", { message: "Failed to edit message" });
      }
    } catch (error) {
      logger.socket.error("Error editing message", {
        messageId: id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", {
        message: error.message || "Failed to edit message",
      });
    }
  });

  // Listen for message delete requests
  socket.on("deleteMessage", async (data) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("deleteMessage")) {
        socket.emit("rateLimit", {
          eventType: "deleteMessage",
          message: "Too many delete requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

      logger.socket.info("Delete message request received", {
        data,
        userId: socket.user?.id,
        username: socket.user?.username,
      });

      // Extract message ID from payload
      const { id } = data;

      // Basic validation
      if (!id) {
        socket.emit("error", { message: "Message ID is required" });
        return;
      }

      // Delete message in database (soft delete)
      const deletedMessage = await deleteMessage(id, socket.user.id);

      if (deletedMessage) {
        logger.socket.info("Message deleted", {
          messageId: id,
          userId: socket.user.id,
          username: socket.user.username,
        });

        // Broadcast the deletion to all clients
        io.emit("messageDeleted", { id });
      } else {
        socket.emit("error", { message: "Failed to delete message" });
      }
    } catch (error) {
      logger.socket.error("Error deleting message", {
        messageId: id,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
      socket.emit("error", {
        message: error.message || "Failed to delete message",
      });
    }
  });

  // Listen for message replies
  socket.on("replyToMessage", async ({ parentId, text }) => {
    try {
      // Check rate limit
      if (socket.checkRateLimit("replyToMessage")) {
        socket.emit("rateLimit", {
          eventType: "replyToMessage",
          message: "Too many reply requests. Please slow down.",
          retryAfter: 60,
        });
        return;
      }

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
        logger.socket.info("Reply created", {
          parentId,
          replyId: savedReply._id,
          userId: socket.user.id,
          username: userName,
        });

        // Broadcast the new reply to all clients
        io.emit("replyCreated", savedReply);
      } else {
        socket.emit("error", { message: "Failed to create reply" });
      }
    } catch (error) {
      logger.socket.error("Error creating reply", {
        parentId,
        userId: socket.user?.id,
        error: error.message,
        stack: error.stack,
      });
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
  // Use environment-specific hostname
  const isProduction = process.env.NODE_ENV === "production";
  const hostname = isProduction
    ? process.env.HOST || "chat-app-backend-hgqg.onrender.com"
    : "localhost";

  const wsProtocol = isProduction ? "wss" : "ws";
  const httpProtocol = isProduction ? "https" : "http";

  const socketIOUrl = `${wsProtocol}://${hostname}${
    isProduction ? "" : `:${port}`
  }/socket.io/`;
  const httpApiUrl = `${httpProtocol}://${hostname}${
    isProduction ? "" : `:${port}`
  }/api/`;

  logger.app.info("Server started successfully", {
    port,
    environment: process.env.NODE_ENV || "development",
    hostname,
    socketIOUrl,
    httpApiUrl,
    time: new Date().toISOString(),
  });
});
