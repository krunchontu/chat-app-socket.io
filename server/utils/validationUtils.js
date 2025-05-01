const mongoose = require("mongoose");

/**
 * Validates if a given ID is a valid MongoDB ObjectId.
 * Throws an error if the ID is invalid.
 * @param {string} id - The ID to validate.
 */
const validateObjectId = (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ID format: ${id}`);
  }
};

module.exports = {
  validateObjectId,
};
