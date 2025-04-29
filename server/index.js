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
const {
  createMessage,
  toggleMessageLike,
  editMessage,
  deleteMessage,
  replyToMessage,
  toggleReaction,
} = require("./controllers/messageController");

// Connect to MongoDB
connectDB();

const app = express();
// Use PORT from .env or default to 4500
const port = process.env.PORT || 4500;

// Configure CORS properly
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // Allow cookies for authentication if needed
  optionsSuccessStatus: 204,
};

// Apply CORS middleware with options
app.use(cors(corsOptions));
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
  },
});

// Apply socket authentication middleware
io.use(socketAuth);

// Store connected users: { socketId: { id, username } }
const connectedUsers = {};

io.on("connection", (socket) => {
  // Store authenticated user in connectedUsers
  if (socket.user) {
    connectedUsers[socket.id] = {
      id: socket.user.id,
      username: socket.user.username,
    };
    console.log(
      `Authenticated user ${socket.user.username} (${socket.id}) connected`
    );

    // Broadcast user joined notification
    socket.broadcast.emit("userNotification", {
      type: "join",
      message: `${socket.user.username} has joined the chat`,
      timestamp: new Date(),
    });
  } else {
    console.log(`Unauthenticated connection: ${socket.id}`);
    socket.disconnect(true);
    return;
  }

  // Listen for new messages
  socket.on("message", async (newMessageData) => {
    try {
      // Validate message text
      const text = newMessageData.text;

      // Basic validation
      if (!text || typeof text !== "string" || !text.trim()) {
        socket.emit("error", { message: "Message text is required" });
        return;
      }

      // Check message length
      if (text.length > 500) {
        socket.emit("error", {
          message: "Message is too long (max 500 characters)",
        });
        return;
      }

      // Use authenticated user information from socket
      const userName = socket.user.username;

      // Prepare message data
      const messageData = {
        user: userName, // Use the server-known username
        text: text.trim(), // Sanitize the message text
        timestamp: new Date(), // Add timestamp
        likes: 0, // Initialize likes
      };

      // Save message to database
      const savedMessage = await createMessage(messageData);

      // Broadcast the saved message to all clients
      io.emit("sendMessage", savedMessage);
      console.log("Message sent and saved:", savedMessage);
    } catch (error) {
      console.error("Error handling message:", error);
      // Optionally notify the client of the error
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
  socket.on("disconnect", async () => {
    if (connectedUsers[socket.id]) {
      const { username, id } = connectedUsers[socket.id];
      console.log(`User ${username} (${socket.id}) disconnected.`);

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
        console.error("Error updating user online status:", error);
      }

      // Remove user from connected users
      delete connectedUsers[socket.id];
    } else {
      console.log(`Unknown user disconnected: ${socket.id}`);
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
  console.log(`Server running on port ${port}`);
});
