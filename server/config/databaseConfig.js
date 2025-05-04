/**
 * Database Configuration
 * Centralizes database connection and settings
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Connect to MongoDB with proper error handling
 * @returns {Promise} Mongoose connection promise
 */
/**
 * Creates a mock database connection for development/testing
 * @returns {Object} Mock database connection
 */
const createMockDBConnection = () => {
  logger.db.warn("Creating mock database connection for development/testing");
  console.log("\n⚠️ USING MOCK DATABASE - Some features will be limited ⚠️\n");

  // Create a minimal mongoose connection object with the mock flag
  const mockConnection = {
    connection: {
      isMockDB: true,
      host: "mock-db-host",
      name: "mock-db",
      port: 0,
      // Add mock connection event handlers
      on: (event, handler) => {
        logger.db.debug(`Mock DB would handle ${event} event`);
        return mockConnection.connection;
      },
      close: async () => {
        logger.db.info("Mock database connection closed");
        return true;
      },
    },
    model: (name, schema) => {
      // Return a basic model constructor that returns objects with the methods used in the app
      const MockModel = function (data) {
        return {
          ...data,
          _id: data._id || Math.random().toString(36).substring(7),
          toObject: function () {
            return { ...this };
          },
          toJSON: function () {
            return { ...this };
          },
          save: async function () {
            return this;
          },
        };
      };

      // Add static methods used by the app
      MockModel.find = async () => [];
      MockModel.findById = async () => null;
      MockModel.findOne = async () => null;
      MockModel.findByIdAndUpdate = async (id, data) => ({ ...data, _id: id });
      MockModel.create = async (data) => new MockModel(data);

      return MockModel;
    },
  };

  return Promise.resolve(mockConnection);
};

const connectDatabase = async () => {
  try {
    // Get MongoDB URI from environment or use default
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/chatapp";

    // Connection options for Mongoose
    const options = {
      // Removed deprecated options: useNewUrlParser, useUnifiedTopology
      autoIndex: true,
    };

    // Attempt to connect to MongoDB
    try {
      const conn = await mongoose.connect(mongoURI, options);

      logger.db.info("MongoDB connection established successfully", {
        host: conn.connection.host,
        name: conn.connection.name,
        port: conn.connection.port,
      });

      // Setup event listeners for database connection
      mongoose.connection.on("error", (err) => {
        logger.db.error("MongoDB connection error:", err);
      });

      mongoose.connection.on("disconnected", () => {
        logger.db.warn("MongoDB disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        logger.db.info("MongoDB reconnected");
      });

      // Return the connection
      return conn;
    } catch (dbError) {
      // If we're in development/test mode, fall back to mock database
      if (process.env.NODE_ENV !== "production") {
        logger.db.warn(
          "Database connection failed, using mock database fallback",
          { error: dbError.message }
        );
        return createMockDBConnection();
      }

      // In production, re-throw the error
      throw dbError;
    }
  } catch (error) {
    logger.db.error("Fatal database connection error:", error);

    // For development environment, exit the process
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Database connection failed and mock fallback is disabled! Exiting..."
      );
      process.exit(1);
    }

    // For production, throw the error for handling by the caller
    throw error;
  }
};

module.exports = {
  connectDatabase,
};
