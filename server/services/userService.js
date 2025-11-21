const User = require("../models/user");
const mongoose = require("mongoose");
// Import logger with fallback to console
const logger = require("../utils/logger");
const userLogger =
  logger && logger.user
    ? logger.user
    : {
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
      };

/**
 * Service layer for handling user-related business logic.
 */
class UserService {
  /**
   * Handles errors consistently within the service.
   * @param {string} operation - The operation being performed.
   * @param {Error} error - The error object.
   * @param {string} [userContext] - Optional user identifier for logging.
   */
  _handleError(operation, error, userContext = "N/A") {
    userLogger.error(`Error during user ${operation}`, {
      operation,
      userContext,
      errorMessage: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });

    // Enhanced error handling
    if (error.name === "MongoServerError" || error.name === "MongoError") {
      if (error.code === 11000) {
        // Duplicate key error
        if (error.message.includes("username")) {
          return new Error("Username already taken");
        }
        if (error.message.includes("email")) {
          return new Error("Email already registered");
        }
        return new Error("Duplicate record exists");
      }

      // MongoDB connection issues
      if (
        [11600, 11601, 11602, 11603, 13435, 13436, 13334].includes(error.code)
      ) {
        userLogger.error(`MongoDB connection issue detected: ${error.code}`, {
          error,
        });
        return new Error("Database connection error. Please try again later.");
      }
    }

    // Validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return new Error(`Validation failed: ${messages.join(", ")}`);
    }

    // Handle JWT related errors
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return new Error("Authentication error. Please log in again.");
    }

    // Add more specific error handling if needed
    return new Error(
      `Server error during user ${operation}. Please try again later.`
    );
  }

  /**
   * Registers a new user.
   * Handles username/email checks, password hashing (via model), and token generation.
   * @param {Object} userData - Contains username, email, password.
   * @returns {Promise<{user: User, token: string}>} The saved user document and auth token.
   */
  async registerUser(userData) {
    const { username, email, password } = userData;
    try {
      userLogger.info("Service: Attempting to register user", {
        username,
        email,
      });

      // Input validation (basic - more robust validation might be in middleware)
      if (!username || !email || !password) {
        throw new Error("Username, email, and password are required");
      }

      // Enhanced validation
      if (username.length < 3 || username.length > 20) {
        throw new Error("Username must be between 3 and 20 characters");
      }

      // ISSUE-003: Enhanced password validation aligned with frontend
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      if (!/[A-Z]/.test(password)) {
        throw new Error("Password must include at least one uppercase letter");
      }
      if (!/[a-z]/.test(password)) {
        throw new Error("Password must include at least one lowercase letter");
      }
      if (!/[0-9]/.test(password)) {
        throw new Error("Password must include at least one number");
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        throw new Error("Password must include at least one special character");
      }

      // Check MongoDB connection before continuing
      if (mongoose.connection.readyState !== 1) {
        userLogger.error("MongoDB not connected, attempting to reconnect");
        try {
          await mongoose.connect(process.env.MONGODB_URI);
        } catch (dbError) {
          userLogger.error("Failed to reconnect to MongoDB", {
            error: dbError,
          });
          throw new Error("Database connection error. Please try again later.");
        }
      }

      // Check if username or email already exists (more efficient than controller check)
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      }).maxTimeMS(5000); // Set timeout for this operation

      if (existingUser) {
        if (existingUser.username === username) {
          userLogger.warn("Service: Registration failed - username taken", {
            username,
          });
          throw new Error("Username already taken");
        } else {
          userLogger.warn("Service: Registration failed - email taken", {
            email,
          });
          throw new Error("Email already registered");
        }
      }

      // Create a new user instance (hashing handled by pre-save hook in model)
      const user = new User({
        username,
        email,
        password,
        isOnline: false, // Default offline on registration
      });

      // Save user to database with timeout
      const savedUser = await user.save({ maxTimeMS: 5000 });
      userLogger.info("Service: User registered successfully", {
        userId: savedUser.id,
        username,
      });

      // Generate authentication token
      const token = savedUser.generateAuthToken(); // Assumes method exists on User model

      // Return only necessary info (avoid sending password hash back)
      const userResponse = {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        // Add other fields as needed (e.g., createdAt)
      };

      return { user: userResponse, token };
    } catch (error) {
      throw this._handleError("registration", error, username);
    }
  }

  /**
   * Logs in a user.
   * Handles user lookup, password comparison, online status update, and token generation.
   * @param {string} username - User's username.
   * @param {string} password - User's password.
   * @returns {Promise<{user: object, token: string}>} User details and auth token.
   */
  async loginUser(username, password) {
    try {
      userLogger.info("Service: Attempting login", { username });

      if (!username || !password) {
        throw new Error("Username and password are required");
      }

      // Check MongoDB connection before continuing
      if (mongoose.connection.readyState !== 1) {
        userLogger.error("MongoDB not connected, attempting to reconnect");
        try {
          await mongoose.connect(process.env.MONGODB_URI);
        } catch (dbError) {
          userLogger.error("Failed to reconnect to MongoDB", {
            error: dbError,
          });
          throw new Error("Database connection error. Please try again later.");
        }
      }

      // Find user by username with timeout
      const user = await User.findOne({ username }).maxTimeMS(5000);
      if (!user) {
        userLogger.warn("Service: Login failed - user not found", { username });
        throw new Error("Invalid credentials"); // Generic message for security
      }

      // ISSUE-007: Check if account is locked
      if (user.isLocked()) {
        const minutesRemaining = user.getLockTimeRemaining();
        userLogger.warn("Service: Login failed - account locked", {
          username,
          minutesRemaining,
        });
        throw new Error(
          `Account is locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`
        );
      }

      // Check if password is correct (method assumed on User model)
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        // Increment failed login attempts
        await user.incrementLoginAttempts();

        userLogger.warn("Service: Login failed - password mismatch", {
          username,
          failedAttempts: user.failedLoginAttempts + 1,
        });

        // Check if account is now locked after this failed attempt
        const updatedUser = await User.findOne({ username });
        if (updatedUser && updatedUser.isLocked()) {
          const minutesRemaining = updatedUser.getLockTimeRemaining();
          throw new Error(
            `Too many failed login attempts. Account locked for ${minutesRemaining} minute(s).`
          );
        }

        throw new Error("Invalid credentials"); // Generic message
      }

      // ISSUE-007: Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Mark user as online with timeout
      user.isOnline = true;
      await user.save({ maxTimeMS: 5000 });
      userLogger.info("Service: User logged in successfully", {
        userId: user.id,
        username,
      });

      // Generate authentication token
      const token = user.generateAuthToken();

      // Return necessary user info
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || "",
        role: user.role || "user",
      };

      return { user: userResponse, token };
    } catch (error) {
      // Avoid logging the password in errors
      throw this._handleError("login", error, username);
    }
  }

  /**
   * Retrieves a user's profile information.
   * @param {string} userId - The ID of the user whose profile is requested.
   * @returns {Promise<object>} User profile data.
   */
  async getUserProfile(userId) {
    try {
      userLogger.info("Service: Getting user profile", { userId });
      // In a real app, might fetch fresh data, but here we assume the user object
      // from auth middleware is sufficient if passed directly.
      // If only userId is available, fetch the user:
      const user = await User.findById(userId).select("-password"); // Exclude password
      if (!user) {
        throw new Error("User not found");
      }

      // Return selected profile fields
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isOnline: user.isOnline,
        createdAt: user.createdAt,
      };
    } catch (error) {
      return this._handleError("profile retrieval", error, userId);
    }
  }

  /**
   * Updates a user's profile information.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - Data to update (e.g., { email, avatar }).
   * @returns {Promise<object>} Updated user profile data.
   */
  async updateUserProfile(userId, updateData) {
    const { email, avatar } = updateData;
    try {
      userLogger.info("Service: Updating user profile", {
        userId,
        updateData: Object.keys(updateData),
      });

      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Update fields if provided
      if (email) user.email = email;
      if (avatar) user.avatar = avatar;
      // Add other updatable fields here

      const updatedUser = await user.save();
      userLogger.info("Service: User profile updated successfully", { userId });

      // Return updated profile info (excluding sensitive fields)
      return {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      };
    } catch (error) {
      return this._handleError("profile update", error, userId);
    }
  }

  /**
   * Logs out a user by marking them as offline.
   * @param {string} userId - The ID of the user logging out.
   * @returns {Promise<void>}
   */
  async logoutUser(userId) {
    try {
      userLogger.info("Service: Logging out user", { userId });
      const user = await User.findById(userId);
      if (user) {
        user.isOnline = false;
        await user.save();
        userLogger.info("Service: User marked as offline", { userId });
      } else {
        userLogger.warn("Service: User not found during logout attempt", {
          userId,
        });
        // Don't throw error, just log, as user might already be gone
      }
    } catch (error) {
      // Log error but don't necessarily throw, logout should ideally still succeed client-side
      return this._handleError("logout", error, userId);
    }
  }

  /**
   * Generates a CSRF token.
   * Note: CSRF token generation and validation strategy depends heavily on the application architecture.
   * This is a basic example; stateful storage (session/DB) is often required.
   * @returns {Promise<string>} A CSRF token.
   */
  async getCsrfToken() {
    try {
      userLogger.debug("Service: Generating CSRF token");
      const crypto = require("crypto");
      const csrfToken = crypto.randomBytes(32).toString("hex");
      // In a real implementation, associate this token with the user's session/identity
      // and store it securely (e.g., encrypted in session, DB with expiry).
      // The validation middleware would compare the token from the request
      // with the stored token associated with the user's session.
      return csrfToken;
    } catch (error) {
      return this._handleError("CSRF token generation", error);
    }
  }
}

// Export an instance of the service
module.exports = new UserService();
