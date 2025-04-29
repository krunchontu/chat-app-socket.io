const Message = require("../models/message");
const User = require("../models/user");
const mongoose = require("mongoose");

/**
 * Controller for message operations with enhanced features
 * Supports CRUD operations, reactions, threading, and search
 */

// Get messages with pagination support
const getMessages = async (req, res) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 0; // Default to first page
    const limit = parseInt(req.query.limit) || 20; // Default to 20 messages per page

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments();

    // Get messages with pagination, sorted by timestamp (oldest first)
    const messages = await Message.find()
      .sort({ timestamp: 1 })
      .skip(page * limit)
      .limit(limit)
      .lean();

    // Return messages with pagination metadata
    res.status(200).json({
      messages,
      pagination: {
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new message - primarily used by Socket.IO
const createMessage = async (messageData) => {
  try {
    // Find the user by username to get userId
    const user = await User.findOne({ username: messageData.user });

    if (!user) {
      throw new Error(`User not found: ${messageData.user}`);
    }

    // Create message with userId
    const message = new Message({
      ...messageData,
      userId: user._id,
      likedBy: [],
    });

    const savedMessage = await message.save();
    return savedMessage;
  } catch (error) {
    console.error("Error creating message:", error);
    throw error;
  }
};

// Toggle like on a message (legacy method for backwards compatibility)
const toggleMessageLike = async (messageId, userId) => {
  try {
    // Find the message
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // Check if user has already liked this message
    const userIndex = message.likedBy.indexOf(userId);
    let updatedLikes = message.likes;

    if (userIndex === -1) {
      // User hasn't liked yet - add like
      message.likedBy.push(userId);
      updatedLikes = message.likes + 1;

      // Also add to new reaction system
      const thumbsUp = message.reactions.get("👍") || [];
      if (!thumbsUp.includes(userId)) {
        message.reactions.set("👍", [...thumbsUp, userId]);
      }
    } else {
      // User already liked - remove like
      message.likedBy.splice(userIndex, 1);
      updatedLikes = message.likes - 1;

      // Also remove from new reaction system
      const thumbsUp = message.reactions.get("👍") || [];
      message.reactions.set(
        "👍",
        thumbsUp.filter((id) => !id.equals(userId))
      );
    }

    // Update message with new likes count and likedBy array
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        likes: updatedLikes,
        likedBy: message.likedBy,
        reactions: message.reactions,
      },
      { new: true }
    );

    return updatedMessage;
  } catch (error) {
    console.error("Error toggling message like:", error);
    throw error;
  }
};

/**
 * Edit a message
 * @param {string} messageId - ID of message to edit
 * @param {string} userId - ID of user making the edit
 * @param {string} newText - New content for the message
 * @returns {Object} Updated message
 */
const editMessage = async (messageId, userId, newText) => {
  try {
    // Find message and verify ownership
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // Check if user owns this message
    if (!message.userId.equals(userId)) {
      throw new Error("Not authorized to edit this message");
    }

    // Check if message is deleted
    if (message.isDeleted) {
      throw new Error("Cannot edit a deleted message");
    }

    // Save current text in edit history
    const editHistoryItem = {
      text: message.text,
      editedAt: new Date(),
    };

    // Update the message
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        text: newText,
        isEdited: true,
        $push: { editHistory: editHistoryItem },
      },
      { new: true }
    );

    return updatedMessage;
  } catch (error) {
    console.error("Error editing message:", error);
    throw error;
  }
};

/**
 * Delete a message (soft delete)
 * @param {string} messageId - ID of message to delete
 * @param {string} userId - ID of user requesting deletion
 * @returns {Object} Updated message with isDeleted flag
 */
const deleteMessage = async (messageId, userId) => {
  try {
    console.log(
      `Attempting to delete message ID: ${messageId} by user ID: ${userId}`
    );

    // Basic validation
    if (!messageId) {
      throw new Error("Message ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Find message
    const message = await Message.findById(messageId);
    console.log(
      "Found message:",
      message
        ? {
            id: message.id,
            user: message.user,
            userId: message.userId.toString(),
            requestingUserId: userId,
            isMatch: message.userId.equals(userId),
          }
        : "Message not found"
    );

    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // Check if user owns this message - ensure we're comparing ObjectIds properly
    if (!message.userId.equals(userId)) {
      console.error(
        `Authentication failure: Message user ID ${message.userId} does not match requesting user ${userId}`
      );
      throw new Error("Not authorized to delete this message");
    }

    // Soft delete the message
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { isDeleted: true },
      { new: true }
    );

    console.log(`Message ${messageId} deleted successfully`);
    return updatedMessage;
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

/**
 * Create a reply to a message
 * @param {Object} messageData - Message data (text, user)
 * @param {string} parentId - ID of the parent message
 * @returns {Object} Created reply message
 */
const replyToMessage = async (messageData, parentId) => {
  try {
    // Check if parent message exists
    const parentMessage = await Message.findById(parentId);

    if (!parentMessage) {
      throw new Error(`Parent message not found: ${parentId}`);
    }

    // Find the user by username to get userId
    const user = await User.findOne({ username: messageData.user });

    if (!user) {
      throw new Error(`User not found: ${messageData.user}`);
    }

    // Create message with parentId reference
    const message = new Message({
      ...messageData,
      userId: user._id,
      parentId: parentId,
      likedBy: [],
    });

    const savedMessage = await message.save();
    return savedMessage;
  } catch (error) {
    console.error("Error creating reply:", error);
    throw error;
  }
};

/**
 * Get replies to a specific message
 * @param {string} parentId - ID of the parent message
 * @returns {Array} Array of reply messages
 */
const getMessageReplies = async (req, res) => {
  try {
    const { parentId } = req.params;

    // Validate parentId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: "Invalid message ID format" });
    }

    // Find all messages that reference this parent
    const replies = await Message.find({ parentId })
      .sort({ timestamp: 1 })
      .lean();

    res.status(200).json(replies);
  } catch (error) {
    console.error("Error fetching message replies:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Toggle a reaction on a message
 * @param {string} messageId - ID of message to react to
 * @param {string} userId - ID of user adding the reaction
 * @param {string} emoji - The emoji reaction to toggle
 * @returns {Object} Updated message
 */
const toggleReaction = async (messageId, userId, emoji) => {
  try {
    // Validate emoji is provided
    if (!emoji) {
      throw new Error("Emoji reaction required");
    }

    // Find the message
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // Get current reactions for this emoji
    const currentReactions = message.reactions.get(emoji) || [];

    // Check if user has already reacted with this emoji
    const userIndex = currentReactions.findIndex((id) => id.equals(userId));

    if (userIndex === -1) {
      // User hasn't reacted yet - add reaction
      message.reactions.set(emoji, [...currentReactions, userId]);
    } else {
      // User already reacted - remove reaction
      message.reactions.set(
        emoji,
        currentReactions.filter((id) => !id.equals(userId))
      );
    }

    // Update message with new reactions
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { reactions: message.reactions },
      { new: true }
    );

    return updatedMessage;
  } catch (error) {
    console.error(`Error toggling ${emoji} reaction:`, error);
    throw error;
  }
};

/**
 * Search messages by content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchMessages = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Create text index search query
    const searchQuery = {
      $text: { $search: query },
      isDeleted: { $ne: true }, // Exclude deleted messages
    };

    // Get total count for pagination
    const totalMessages = await Message.countDocuments(searchQuery);

    // Execute search with pagination
    const messages = await Message.find(searchQuery)
      .sort({ score: { $meta: "textScore" }, timestamp: -1 })
      .skip(page * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      messages,
      pagination: {
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error searching messages:", error);
    res.status(500).json({ message: "Server error during search" });
  }
};

module.exports = {
  getMessages,
  createMessage,
  toggleMessageLike,
  editMessage,
  deleteMessage,
  replyToMessage,
  getMessageReplies,
  toggleReaction,
  searchMessages,
};
