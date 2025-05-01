const User = require("../models/user");
const Message = require("../models/message");

/**
 * Finds a user by their username.
 * Throws an error if the user is not found.
 * @param {string} username - The username to search for.
 * @returns {Promise<User>} The found user document.
 */
const findUserByUsername = async (username) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error(`User not found: ${username}`);
  }
  return user;
};

/**
 * Finds a message by its ID.
 * Throws an error if the message is not found.
 * @param {string} messageId - The ID of the message to find.
 * @returns {Promise<Message>} The found message document.
 */
const findMessageById = async (messageId) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error(`Message not found: ${messageId}`);
  }
  return message;
};

module.exports = {
  findUserByUsername,
  findMessageById,
};
