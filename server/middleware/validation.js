/**
 * Server-side validation middleware for various API inputs
 */

/**
 * Sanitize username to prevent XSS attacks
 * Removes HTML tags, script tags, and dangerous characters
 * Note: Does NOT truncate length - validation will handle that
 */
const sanitizeUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return username;
  }

  return username
    .trim()
    .replace(/[<>\"'`]/g, '') // Remove HTML/script injection chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers (onclick=, onload=, etc)
};

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
  let { username, password, email } = req.body;
  const errors = [];

  // Username validation - sanitize and validate
  if (!username || !username.trim()) {
    errors.push("Username is required");
  } else {
    // SECURITY FIX (ISSUE-011): Sanitize username to prevent XSS
    username = sanitizeUsername(username);
    req.body.username = username; // Update request body with sanitized value

    if (username.length < 3 || username.length > 20) {
      errors.push("Username must be between 3 and 20 characters");
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push("Username can only contain letters, numbers, and underscores");
    }
  }

  // Password validation - ISSUE-003: Aligned with frontend requirements
  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  } else if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter");
  } else if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter");
  } else if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one number");
  } else if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must include at least one special character");
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
  let { username, password } = req.body;
  const errors = [];

  if (!username || !username.trim()) {
    errors.push("Username is required");
  } else {
    // SECURITY FIX (ISSUE-011): Sanitize username on login too
    username = sanitizeUsername(username);
    req.body.username = username;
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
