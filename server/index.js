const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize"); // SECURITY: NoSQL injection protection
require("dotenv").config(); // Load environment variables from .env file
const { Server } = require("socket.io"); // Updated import
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

// Import modular socket handlers (ISSUE-012: Refactored from monolithic index.js)
const {
  registerMessageHandlers,
  handleConnection,
  sendOnlineUsers,
  registerDisconnectHandler,
} = require("./sockets");

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

// Socket.IO connection handler - refactored for modularity (ISSUE-012)
io.on("connection", (socket) => {
  // Handle connection and authentication
  const isConnected = handleConnection(socket, io, connectedUsers);
  if (!isConnected) {
    return; // Connection was rejected (not authenticated)
  }

  // Register all message-related event handlers
  registerMessageHandlers(socket, io);

  // Register disconnect handler
  registerDisconnectHandler(socket, io, connectedUsers);

  // Send the list of online users to the newly connected client
  sendOnlineUsers(socket, connectedUsers);
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
