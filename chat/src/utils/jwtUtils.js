/**
 * JWT utility functions for token management
 * Provides functions for decoding and validating JWT tokens
 */

import { createUtilLogger } from "./logger";

// Create a logger for this utility
const logger = createUtilLogger("jwtUtils");

/**
 * Decodes a JWT token to get its payload
 *
 * @param {string} token - The JWT token
 * @returns {Object|null} The decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  if (!token) return null;

  try {
    // Split the token and get the payload part
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    // Convert from base64url to regular base64
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // Decode and parse to JSON
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error("Error decoding token:", { error: error.message });
    return null;
  }
};

/**
 * Check if a token is expired or about to expire
 *
 * @param {Object|string} tokenOrDecoded - The JWT token or decoded token payload
 * @param {number} thresholdMinutes - Minutes threshold before expiration
 * @returns {boolean} True if token is expired or close to expiration
 */
export const isTokenExpiring = (tokenOrDecoded, thresholdMinutes = 5) => {
  // Handle both token string and decoded token object
  const decoded =
    typeof tokenOrDecoded === "string"
      ? decodeToken(tokenOrDecoded)
      : tokenOrDecoded;

  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;
  const thresholdMs = thresholdMinutes * 60 * 1000;

  return timeUntilExpiration < thresholdMs;
};

/**
 * Validate a JWT token
 *
 * @param {string} token - The JWT token to validate
 * @param {number} thresholdMinutes - Minutes threshold before expiration
 * @returns {Object} Validation result with isValid flag and decoded payload
 */
export const validateToken = (token, thresholdMinutes = 5) => {
  if (!token) {
    return { isValid: false, decoded: null, reason: "Token missing" };
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    logger.warn("Invalid token format detected");
    return { isValid: false, decoded: null, reason: "Invalid format" };
  }

  if (isTokenExpiring(decoded, thresholdMinutes)) {
    logger.warn("Token is expired or about to expire", {
      exp: decoded.exp,
      userId: decoded.id,
    });
    return {
      isValid: false,
      decoded,
      reason: "Expired or expiring soon",
      expiresAt: new Date(decoded.exp * 1000),
    };
  }

  return { isValid: true, decoded };
};

/**
 * Calculate time remaining until token expiration
 *
 * @param {Object|string} tokenOrDecoded - The JWT token or decoded token payload
 * @returns {Object} Time remaining in various units
 */
export const getTokenTimeRemaining = (tokenOrDecoded) => {
  // Handle both token string and decoded token object
  const decoded =
    typeof tokenOrDecoded === "string"
      ? decodeToken(tokenOrDecoded)
      : tokenOrDecoded;

  if (!decoded || !decoded.exp) {
    return { valid: false, expired: true };
  }

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeRemaining = expirationTime - currentTime;

  // Already expired
  if (timeRemaining <= 0) {
    return {
      valid: false,
      expired: true,
      expiredAgo: {
        ms: Math.abs(timeRemaining),
        seconds: Math.floor(Math.abs(timeRemaining) / 1000),
        minutes: Math.floor(Math.abs(timeRemaining) / (1000 * 60)),
      },
    };
  }

  // Calculate remaining time in different units
  return {
    valid: true,
    expired: false,
    expiresAt: new Date(expirationTime),
    remaining: {
      ms: timeRemaining,
      seconds: Math.floor(timeRemaining / 1000),
      minutes: Math.floor(timeRemaining / (1000 * 60)),
      hours: Math.floor(timeRemaining / (1000 * 60 * 60)),
    },
  };
};

export default {
  decodeToken,
  isTokenExpiring,
  validateToken,
  getTokenTimeRemaining,
};
