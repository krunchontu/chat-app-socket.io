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

/**
 * Sanitize email to prevent injection attacks
 * Trims whitespace and converts to lowercase
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return email;
  }
  return email.trim().toLowerCase();
};

/**
 * Validate MongoDB ObjectId format
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize text content to prevent XSS
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }
  return text
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
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

  // Email validation and sanitization (if provided)
  if (email) {
    email = sanitizeEmail(email);
    req.body.email = email;

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      errors.push("Invalid email format");
    } else if (email.length > 254) {
      errors.push("Email is too long (max 254 characters)");
    }
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
  let { email, avatar, bio, status } = req.body;
  const errors = [];

  // Email validation and sanitization (if provided)
  if (email) {
    email = sanitizeEmail(email);
    req.body.email = email;

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      errors.push("Invalid email format");
    } else if (email.length > 254) {
      errors.push("Email is too long (max 254 characters)");
    }
  }

  // Avatar URL validation (if provided)
  if (avatar && typeof avatar === "string" && avatar.length > 0) {
    try {
      const url = new URL(avatar);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push("Avatar URL must use HTTP or HTTPS protocol");
      }
      // Validate URL length
      if (avatar.length > 2048) {
        errors.push("Avatar URL is too long (max 2048 characters)");
      }
    } catch (error) {
      errors.push("Invalid avatar URL");
    }
  }

  // Bio validation (if provided)
  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      errors.push("Bio must be a string");
    } else {
      bio = sanitizeText(bio);
      req.body.bio = bio;

      if (bio.length > 500) {
        errors.push("Bio is too long (max 500 characters)");
      }
    }
  }

  // Status validation (if provided)
  if (status !== undefined) {
    const validStatuses = ['active', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(", ") });
  }

  next();
};

// Message ID validation
const validateMessageId = (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid message ID format" });
  }

  next();
};

// Search query validation
const validateSearchQuery = (req, res, next) => {
  let { query, limit, page } = req.query;
  const errors = [];

  // Search query validation
  if (!query || typeof query !== 'string') {
    errors.push("Search query is required");
  } else {
    query = sanitizeText(query);
    req.query.query = query;

    if (query.length < 2) {
      errors.push("Search query must be at least 2 characters");
    } else if (query.length > 100) {
      errors.push("Search query is too long (max 100 characters)");
    }
  }

  // Limit validation (optional, default: 20)
  if (limit !== undefined) {
    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push("Limit must be a number between 1 and 100");
    }
  }

  // Page validation (optional, default: 1)
  if (page !== undefined) {
    page = parseInt(page, 10);
    if (isNaN(page) || page < 1) {
      errors.push("Page must be a positive number");
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
  validateMessageId,
  validateSearchQuery,
  sanitizeUsername,
  sanitizeEmail,
  sanitizeText,
  isValidObjectId,
};
