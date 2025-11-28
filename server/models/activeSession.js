/**
 * Active Session Model
 * Tracks active user sessions for enhanced security and session management
 * Allows features like: logout from all devices, view active sessions, etc.
 */

const mongoose = require("mongoose");

const activeSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Session metadata for security tracking
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    deviceInfo: {
      browser: String,
      os: String,
      device: String,
    },
    // Location tracking (optional, for security monitoring)
    location: {
      city: String,
      country: String,
      timezone: String,
    },
    // Session timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    // Session status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: false, // We manage timestamps manually
  }
);

// Compound index for efficient queries
activeSessionSchema.index({ userId: 1, isActive: 1 });
activeSessionSchema.index({ token: 1, isActive: 1 });

// TTL index to automatically delete expired sessions
activeSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Create a new session
 */
activeSessionSchema.statics.createSession = async function (
  userId,
  token,
  metadata = {}
) {
  const { ipAddress, userAgent, deviceInfo, location } = metadata;

  // Calculate expiration (7 days from now, matching JWT expiration)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = new this({
    userId,
    token,
    ipAddress,
    userAgent,
    deviceInfo,
    location,
    expiresAt,
  });

  await session.save();
  return session;
};

/**
 * Update session activity timestamp
 */
activeSessionSchema.statics.updateActivity = async function (token) {
  return this.findOneAndUpdate(
    { token, isActive: true },
    { lastActivity: new Date() },
    { new: true }
  );
};

/**
 * Get all active sessions for a user
 */
activeSessionSchema.statics.getUserSessions = async function (userId) {
  return this.find({ userId, isActive: true }).sort({ lastActivity: -1 });
};

/**
 * Revoke a specific session
 */
activeSessionSchema.statics.revokeSession = async function (token) {
  return this.findOneAndUpdate(
    { token },
    { isActive: false },
    { new: true }
  );
};

/**
 * Revoke all sessions for a user (logout from all devices)
 */
activeSessionSchema.statics.revokeAllUserSessions = async function (userId) {
  return this.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};

/**
 * Check if a session is active and valid
 */
activeSessionSchema.statics.isSessionActive = async function (token) {
  const session = await this.findOne({ token, isActive: true });

  if (!session) {
    return false;
  }

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    // Mark as inactive
    session.isActive = false;
    await session.save();
    return false;
  }

  return true;
};

/**
 * Clean up inactive sessions (maintenance task)
 */
activeSessionSchema.statics.cleanupInactiveSessions = async function () {
  const result = await this.deleteMany({
    $or: [
      { isActive: false },
      { expiresAt: { $lt: new Date() } },
    ],
  });
  return result.deletedCount;
};

module.exports = mongoose.model("ActiveSession", activeSessionSchema);
