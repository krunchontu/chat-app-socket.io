const UserService = require("../services/userService");
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

// Helper function to handle API errors consistently for this controller
const handleUserApiError = (res, error, operation) => {
  // Enhanced status code determination
  let statusCode = 500; // Default to Internal Server Error

  const errorMsg = error.message || "";

  // Authentication issues
  if (
    errorMsg.includes("Invalid credentials") ||
    errorMsg.includes("not found") ||
    errorMsg.includes("Authentication error")
  ) {
    statusCode = 401; // Unauthorized
  }
  // Validation issues
  else if (
    errorMsg.includes("already taken") ||
    errorMsg.includes("already registered") ||
    errorMsg.includes("required") ||
    errorMsg.includes("must be") ||
    errorMsg.includes("Validation failed")
  ) {
    statusCode = 400; // Bad Request
  }
  // Database connection issues
  else if (
    errorMsg.includes("Database connection error") ||
    errorMsg.includes("MongoDB") ||
    errorMsg.includes("connection") ||
    errorMsg.includes("timeout")
  ) {
    statusCode = 503; // Service Unavailable
  }

  // Enhanced logging - safely handle error properties
  userLogger.error(`API error during user ${operation}`, {
    operation,
    errorMessage: errorMsg,
    statusCode,
    stack: error?.stack || "No stack trace available",
    name: error?.name || "UnknownError",
    code: error?.code || "UNKNOWN",
  });

  // User-friendly error message
  const clientMessage =
    statusCode === 503
      ? "There was an issue accessing your data. Please try refreshing the page."
      : errorMsg || `Server error during user ${operation}`;

  res.status(statusCode).json({ message: clientMessage });
};

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    userLogger.info("Controller: Request to register user", {
      username,
      email,
    });

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required",
      });
    }

    // Delegate logic to UserService
    const { user, token } = await UserService.registerUser({
      username,
      email,
      password,
    });

    // Send successful response
    res.status(201).json({
      ...user, // Send back user details returned by the service
      token,
    });
  } catch (error) {
    handleUserApiError(res, error, "registration");
  }
};

// Login a user
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    userLogger.info("Controller: Request to login user", { username });

    // Input validation
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Delegate logic to UserService
    const { user, token } = await UserService.loginUser(username, password);

    // Send successful response
    res.json({
      ...user, // Send back user details returned by the service
      token,
    });
  } catch (error) {
    handleUserApiError(res, error, "login");
  }
};

// Get current user's profile (assuming auth middleware adds user object to req)
const getUserProfile = async (req, res) => {
  try {
    // The auth middleware should attach the user ID or the user object itself
    if (!req.user || !req.user.id) {
      userLogger.warn(
        "Controller: getUserProfile called without authenticated user"
      );
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    userLogger.info("Controller: Request to get user profile", { userId });

    // Delegate logic to UserService
    // Pass only the ID, let the service fetch the required data
    const userProfile = await UserService.getUserProfile(userId);

    res.json(userProfile);
  } catch (error) {
    handleUserApiError(res, error, "profile retrieval");
  }
};

// Update current user's profile
const updateUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      userLogger.warn(
        "Controller: updateUserProfile called without authenticated user"
      );
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const updateData = req.body; // Pass the whole body to the service
    userLogger.info("Controller: Request to update user profile", {
      userId,
      data: Object.keys(updateData),
    });

    // Delegate logic to UserService
    const updatedUserProfile = await UserService.updateUserProfile(
      userId,
      updateData
    );

    res.json(updatedUserProfile);
  } catch (error) {
    handleUserApiError(res, error, "profile update");
  }
};

// Log out user
const logoutUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      // If no user attached, maybe token was invalid or expired, still return success
      userLogger.warn(
        "Controller: logoutUser called without authenticated user, proceeding"
      );
      return res.json({ message: "Logged out successfully" });
    }
    const userId = req.user.id;
    userLogger.info("Controller: Request to logout user", { userId });

    // Delegate logic to UserService (fire and forget, don't wait)
    UserService.logoutUser(userId).catch((err) => {
      // Log error but don't let it fail the response
      userLogger.error("Controller: Background logout task failed", {
        userId,
        error: err.message,
      });
    });

    // Respond immediately regardless of background task result
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    // Catch synchronous errors, though unlikely here
    handleUserApiError(res, error, "logout");
  }
};

// Generate and return a CSRF token
const getCsrfToken = async (req, res) => {
  try {
    userLogger.info("Controller: Request to get CSRF token");
    // Delegate logic to UserService
    const csrfToken = await UserService.getCsrfToken();
    res.json({ csrfToken });
  } catch (error) {
    handleUserApiError(res, error, "CSRF token generation");
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  getCsrfToken,
};
