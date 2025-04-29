const mongoose = require("mongoose");

/**
 * Message schema with support for editing, deletion, threading, and reactions
 */
const messageSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
      trim: true,
    },
    // Add reference to User model
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },

    // Message editing support
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [
      {
        text: String,
        editedAt: Date,
      },
    ],

    // Message deletion support (soft delete)
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Message threading/reply support
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Enhanced reactions system (backward compatible with likes)
    likes: {
      type: Number,
      default: 0,
    },
    // Keep for backward compatibility
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // New reaction system using Map for multiple reaction types
    // Format: {"emoji": [userId1, userId2], "emoji2": [userId3]}
    reactions: {
      type: Map,
      of: [mongoose.Schema.Types.ObjectId],
      default: () => new Map(),
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Create a virtual 'id' field that uses _id for Socket.IO compatibility
messageSchema.virtual("id").get(function () {
  return this._id.toString();
});

// Configure the schema to include virtuals when converting to JSON
messageSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Create text index on message text for searching
messageSchema.index({ text: "text" });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
