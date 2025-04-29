const rateLimit = require("express-rate-limit");

/**
 * Creates a rate limiter middleware with the specified configuration
 * @param {Object} options - Rate limiter configuration options
 * @returns {Function} Express middleware function
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes by default
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many requests from this IP, please try again later.",
  };

  return rateLimit({
    ...defaultOptions,
    ...options,
  });
};

// Auth rate limiter (more strict, applies to login/register)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: "Too many login attempts, please try again later.",
});

// API rate limiter (general API endpoints)
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
});

// Message API rate limiter (specifically for message-related endpoints)
const messageLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 requests per 5 minutes
  message: "Too many message requests, please try again later.",
});

module.exports = {
  authLimiter,
  apiLimiter,
  messageLimiter,
};
