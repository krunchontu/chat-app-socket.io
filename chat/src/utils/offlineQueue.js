/**
 * Utilities for handling offline message queueing and optimistic UI updates
 */

import { v4 as uuidv4 } from "uuid";

// Constants
const QUEUE_STORAGE_KEY = "dialoque_message_queue";

/**
 * Generate a temporary ID for optimistic UI updates
 * @returns {string} Unique temporary ID
 */
export const generateTempId = () => `temp-${uuidv4()}`;

/**
 * Create a message object for optimistic UI updates
 *
 * @param {string} text - Message content
 * @param {string} username - User's username
 * @param {string} [parentId] - ID of parent message if this is a reply
 * @returns {Object} Optimistic message object
 */
export const createOptimisticMessage = (text, username, parentId = null) => {
  return {
    id: generateTempId(),
    user: username,
    text,
    timestamp: new Date().toISOString(),
    isOptimistic: true,
    parentId,
    reactions: {},
    likes: 0,
    likedBy: [],
  };
};

/**
 * Queue a message for later sending when offline
 *
 * @param {Object} message - Message to queue
 * @param {string} type - Message type ('message', 'reply', 'edit', etc.)
 * @param {Object} [metadata] - Additional metadata needed to process the message
 * @returns {Array} Updated queue
 */
export const queueMessage = (message, type, metadata = {}) => {
  const queue = getQueue();

  const queuedMessage = {
    id: message.id,
    text: message.text,
    type,
    metadata,
    createdAt: new Date().toISOString(),
  };

  const updatedQueue = [...queue, queuedMessage];
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));

  return updatedQueue;
};

/**
 * Get the current message queue from storage
 *
 * @returns {Array} Queued messages
 */
export const getQueue = () => {
  try {
    const queue = localStorage.getItem(QUEUE_STORAGE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error("Failed to parse message queue", error);
    return [];
  }
};

/**
 * Remove a message from the queue
 *
 * @param {string} id - ID of the message to remove
 * @returns {Array} Updated queue
 */
export const removeFromQueue = (id) => {
  const queue = getQueue();
  const updatedQueue = queue.filter((message) => message.id !== id);
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));

  return updatedQueue;
};

/**
 * Clear the entire message queue
 */
export const clearQueue = () => {
  localStorage.removeItem(QUEUE_STORAGE_KEY);
};

/**
 * Process queued messages when coming back online
 *
 * @param {Object} socket - Socket.io connection
 * @param {Function} dispatch - Dispatch function from chat context
 * @returns {Promise<number>} Number of processed messages
 */
export const processQueue = async (socket, dispatch) => {
  if (!socket || !socket.connected) {
    return 0;
  }

  const queue = getQueue();
  if (queue.length === 0) {
    return 0;
  }

  let processed = 0;

  // Process each queued message in order
  for (const queuedMessage of queue) {
    try {
      switch (queuedMessage.type) {
        case "message":
          socket.emit("message", { text: queuedMessage.text });
          break;

        case "reply":
          socket.emit("replyToMessage", {
            parentId: queuedMessage.metadata.parentId,
            text: queuedMessage.text,
          });
          break;

        case "edit":
          socket.emit("editMessage", {
            id: queuedMessage.metadata.originalId,
            text: queuedMessage.text,
          });
          break;

        case "reaction":
          socket.emit("reaction", {
            id: queuedMessage.metadata.messageId,
            emoji: queuedMessage.metadata.emoji,
          });
          break;

        default:
          console.warn(`Unknown queued message type: ${queuedMessage.type}`);
      }

      // Remove processed message from queue
      removeFromQueue(queuedMessage.id);
      processed++;
    } catch (error) {
      console.error(`Failed to process queued message:`, error, queuedMessage);
    }
  }

  // Notify the user about processed messages
  if (processed > 0) {
    dispatch({
      type: "ADD_USER_NOTIFICATION",
      payload: {
        type: "system",
        message: `Sent ${processed} message${
          processed === 1 ? "" : "s"
        } from offline queue`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return processed;
};

/**
 * Check if the browser is online
 *
 * @returns {boolean} Online status
 */
export const isOnline = () => navigator.onLine;

/**
 * Replace a temporary optimistic message with the real server message
 *
 * @param {Array} messages - Current messages array
 * @param {string} tempId - Temporary message ID to replace
 * @param {Object} serverMessage - Server message to replace with
 * @returns {Array} Updated messages array
 */
export const replaceOptimisticMessage = (messages, tempId, serverMessage) => {
  // Check for invalid inputs
  if (!messages || !Array.isArray(messages)) {
    console.warn(
      "Invalid messages array in replaceOptimisticMessage",
      messages
    );
    return [];
  }

  if (!tempId) {
    console.warn("Missing tempId in replaceOptimisticMessage");
    return messages;
  }

  if (!serverMessage) {
    console.warn("Missing serverMessage in replaceOptimisticMessage");
    return messages;
  }

  // Ensure the server message has a consistent ID format
  const enhancedServerMessage = {
    ...serverMessage,
    // Preserve tempId for reference
    tempId: serverMessage.tempId || tempId,
    // Ensure 'id' property exists and is consistent
    id: serverMessage.id || serverMessage._id || tempId,
  };

  // Log for debugging
  console.log("Replacing optimistic message", {
    tempId,
    newId: enhancedServerMessage.id,
    serverMessageHasId: !!serverMessage.id,
  });

  // Replace the message
  return messages.map((msg) => {
    // Match on either tempId or message.id
    if (msg.id === tempId || msg.tempId === tempId) {
      return enhancedServerMessage;
    }
    return msg;
  });
};
