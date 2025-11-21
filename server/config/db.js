const mongoose = require("mongoose");
const logger = require("../utils/logger").db || console;

// In-memory fallback data for development/testing when DB connection fails
const mockData = {
  users: [
    {
      _id: "user1",
      id: "user1",
      username: "testuser",
      email: "test@example.com",
      password: "$2a$10$some.hashed.password.here", // Never use real passwords in fallbacks
      isOnline: true,
      role: "user",
    },
  ],
  messages: [
    {
      _id: "msg1",
      id: "msg1",
      user: "testuser",
      text: "Welcome to the chat app! This is a fallback message.",
      timestamp: new Date(),
      likes: 0,
    },
  ],
};

// Mock DB connection state
let isUsingMockDB = false;

// Setup mock methods for Mongoose in case of connection failure
const setupMockModels = () => {
  logger.warn("Setting up mock database models as fallback");

  // Create mock implementation functions that return promises
  const mockFind = () => ({
    exec: () => Promise.resolve(mockData.users),
  });

  const mockFindOne = () => ({
    exec: () => Promise.resolve(mockData.users[0]),
  });

  // Store original model function
  const originalModel = mongoose.model;

  // Override the mongoose model function with our mock
  mongoose.model = function (modelName) {
    // Check if this is a real model that exists
    try {
      return originalModel.call(mongoose, modelName);
    } catch (e) {
      // If model doesn't exist, return our mock implementation
      if (modelName === "User") {
        return {
          find: mockFind,
          findOne: mockFindOne,
          findById: () => Promise.resolve(mockData.users[0]),
          // Add more mock methods as needed
          create: (data) =>
            Promise.resolve({ ...data, _id: "mock_" + Date.now() }),
          findByIdAndUpdate: (id, data) =>
            Promise.resolve({ ...mockData.users[0], ...data }),
        };
      }
      if (modelName === "Message") {
        return {
          find: () => Promise.resolve(mockData.messages),
          findById: () => Promise.resolve(mockData.messages[0]),
          create: (data) =>
            Promise.resolve({ ...data, _id: "msg_" + Date.now() }),
          findByIdAndUpdate: (id, data) =>
            Promise.resolve({ ...mockData.messages[0], ...data }),
        };
      }
      return {};
    }
  };

  isUsingMockDB = true;

  return { mockData, isUsingMockDB };
};

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    // Verify MongoDB URI is set
    if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
      logger.error("MONGO_URI environment variable is not set");
      throw new Error("Database connection string is missing");
    }

    // Use MONGO_URI (preferred) or fall back to MONGODB_URI
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI;

    // Add connection options for better reliability
    const conn = await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      retryWrites: true,
    });

    // Set additional mongoose options
    mongoose.set("strictQuery", true);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    isUsingMockDB = false;
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`, {
      stack: error.stack,
      code: error.code,
      name: error.name,
    });

    // PRODUCTION: Fail fast - do NOT allow mock database fallback
    if (process.env.NODE_ENV === "production") {
      logger.error(
        "CRITICAL: MongoDB connection failed in production environment. Server cannot start without database.",
        {
          error: error.message,
          mongoUri: process.env.MONGO_URI ? "set" : "not set",
          mongodbUri: process.env.MONGODB_URI ? "set" : "not set",
        }
      );
      // Exit with error code to trigger container restart/alert
      process.exit(1);
    }

    // DEVELOPMENT/TEST: Use mock database fallback
    logger.warn(
      "MongoDB connection failed in development/test environment. Using mock database fallback.",
      {
        environment: process.env.NODE_ENV || "development",
      }
    );

    try {
      // Setup mock database as fallback
      const mockDB = setupMockModels();
      return {
        connection: {
          host: "mock-db",
          isMockDB: true,
        },
        ...mockDB,
      };
    } catch (mockError) {
      logger.error("Failed to set up mock database:", mockError);
      process.exit(1);
    }
  }
};

// Export the main connect function and helper for mock DB status
module.exports = connectDB;
module.exports.isMockDBActive = () => isUsingMockDB;
