/**
 * Server-side validation middleware for various API inputs
 */

// Message validation
const validateMessage = (req, res, next) => {
  const { text } = req.body;

  // Check if text exists and is not just whitespace
  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Message text is required" });
  }

  // Limit message length (e.g., 500 characters)
  if (text.length > 500) {
    return res
      .status(400)
      .json({ message: "Message is too long (max 500 characters)" });
  }

  // Continue to the next middleware or controller
  next();
};

// User registration validation
const validateRegistration = (req, res, next) => {
  const { username, password, email } = req.body;
  const errors = [];

  // Username validation
  if (!username || !username.trim()) {
    errors.push("Username is required");
  } else if (username.length < 3 || username.length > 20) {
    errors.push("Username must be between 3 and 20 characters");
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, and underscores");
  }

  // Password validation
  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }

  // Email validation (if provided)
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push("Invalid email format");
  }

  // Return errors or continue
  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(", ") });
  }

  next();
};

// User login validation
const validateLogin = (req, res, next) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username || !username.trim()) {
    errors.push("Username is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(", ") });
  }

  next();
};

// Profile update validation
const validateProfileUpdate = (req, res, next) => {
  const { email, avatar } = req.body;
  const errors = [];

  // Email validation (if provided)
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push("Invalid email format");
  }

  // Avatar URL validation (if provided)
  if (avatar && typeof avatar === "string" && avatar.length > 0) {
    try {
      new URL(avatar); // Will throw error if invalid URL
    } catch (error) {
      errors.push("Invalid avatar URL");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(", ") });
  }

  next();
};

module.exports = {
  validateMessage,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
};
