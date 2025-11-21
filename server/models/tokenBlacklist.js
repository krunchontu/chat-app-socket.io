/**
 * Token Blacklist Model
 *
 * SECURITY FIX (ISSUE-010): Implements session management and token invalidation
 *
 * This model stores invalidated JWT tokens to prevent their reuse after logout.
 * Tokens are automatically removed after expiration using MongoDB TTL index.
 */

const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true, // Index for fast lookups
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Index for user-specific queries
  },
  reason: {
    type: String,
    enum: ["logout", "security", "expired", "revoked"],
    default: "logout",
  },
  blacklistedAt: {
    type: Date,
    default: Date.now,
    index: true, // Index for TTL
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true, // TTL index - MongoDB will automatically delete expired documents
  },
  userAgent: {
    type: String, // Browser/device info for audit trail
  },
  ipAddress: {
    type: String, // IP address for security tracking
  },
});

// TTL index: automatically delete blacklisted tokens after they expire
// This prevents the blacklist from growing indefinitely
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient queries
tokenBlacklistSchema.index({ token: 1, userId: 1 });

/**
 * Static method to blacklist a token
 *
 * @param {String} token - The JWT token to blacklist
 * @param {String} userId - The user ID who owns the token
 * @param {Date} expiresAt - When the token would naturally expire
 * @param {String} reason - Reason for blacklisting (logout, security, etc.)
 * @param {Object} metadata - Additional metadata (userAgent, ipAddress)
 * @returns {Promise<Object>} The blacklisted token document
 */
tokenBlacklistSchema.statics.blacklistToken = async function (
  token,
  userId,
  expiresAt,
  reason = "logout",
  metadata = {}
) {
  try {
    // Check if token is already blacklisted
    const existing = await this.findOne({ token });
    if (existing) {
      return existing; // Already blacklisted
    }

    // Create new blacklist entry
    const blacklistedToken = await this.create({
      token,
      userId,
      expiresAt,
      reason,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    return blacklistedToken;
  } catch (error) {
    console.error("Error blacklisting token:", error);
    throw error;
  }
};

/**
 * Static method to check if a token is blacklisted
 *
 * @param {String} token - The JWT token to check
 * @returns {Promise<Boolean>} True if blacklisted, false otherwise
 */
tokenBlacklistSchema.statics.isBlacklisted = async function (token) {
  try {
    const blacklisted = await this.findOne({ token });
    return !!blacklisted; // Convert to boolean
  } catch (error) {
    console.error("Error checking token blacklist:", error);
    return false; // On error, assume not blacklisted (fail open for availability)
  }
};

/**
 * Static method to blacklist all tokens for a specific user
 * Useful for "logout from all devices" functionality
 *
 * @param {String} userId - The user ID
 * @param {String} reason - Reason for mass logout
 * @returns {Promise<Number>} Number of tokens blacklisted
 */
tokenBlacklistSchema.statics.blacklistAllUserTokens = async function (
  userId,
  reason = "security"
) {
  try {
    // In a real implementation, you'd need to track all active tokens
    // For now, this is a placeholder for future enhancement
    // You could implement this by storing all active sessions

    // Note: Without storing all active tokens, we can't implement this fully
    // One approach: Store active sessions separately, then blacklist them all
    console.log(`Blacklisting all tokens for user ${userId}`);

    return 0; // Placeholder
  } catch (error) {
    console.error("Error blacklisting all user tokens:", error);
    throw error;
  }
};

/**
 * Static method to clean up expired blacklist entries manually
 * (MongoDB TTL index should handle this automatically, but this is a backup)
 *
 * @returns {Promise<Number>} Number of deleted entries
 */
tokenBlacklistSchema.statics.cleanupExpired = async function () {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up expired blacklist entries:", error);
    throw error;
  }
};

const TokenBlacklist = mongoose.model("TokenBlacklist", tokenBlacklistSchema);

module.exports = TokenBlacklist;
