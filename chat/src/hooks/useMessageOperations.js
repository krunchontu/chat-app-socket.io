import { useCallback } from "react";
import { useAuth } from "../components/common/AuthContext";
import { createOptimisticMessage, queueMessage } from "../utils/offlineQueue";
import { createLogger } from "../utils/logger";

const logger = createLogger("useMessageOperations");

/**
 * Custom hook providing functions to perform chat operations like sending,
 * editing, deleting messages, replying, and reacting. Handles optimistic UI
 * updates and offline queuing.
 *
 * @param {SocketIOClient.Socket | null} socket - The active socket instance.
 * @param {boolean} isConnected - Whether the socket is currently connected.
 * @param {boolean} isOnline - Whether the browser reports being online.
 * @param {function} dispatchMessages - Dispatch function for the messages reducer.
 * @param {function} dispatchUi - Dispatch function for the UI state reducer (e.g., for clearing reply state).
 * @param {Array} messages - The current list of messages (needed for permission checks).
 * @returns {{
 *   sendMessage: (text: string) => Promise<boolean>;
 *   editMessage: (messageId: string, newText: string) => Promise<boolean>;
 *   deleteMessage: (messageId: string) => Promise<boolean>;
 *   replyToMessage: (parentId: string | object, text: string) => Promise<boolean>;
 *   toggleReaction: (messageId: string, emoji: string) => Promise<boolean>;
 *   handleOfflineMessage: (message: object, type: string, options?: object) => void;
 *   addSystemNotification: (message: string) => void; // Function to add system notifications
 * }}
 */
const useMessageOperations = (
  socket,
  isConnected,
  isOnline,
  dispatchMessages,
  dispatchUi, // Added for clearing reply state
  messages // Added for permission checks
) => {
  const { user } = useAuth();

  // Helper to add system notifications (can be passed in or defined here)
  // This assumes the calling component (ChatProvider) will supply this function
  // For now, we'll define a placeholder implementation.
  const addSystemNotification = useCallback((message) => {
    // In a real scenario, this would likely dispatch an action
    // handled by a notifications reducer/hook.
    logger.info("System Notification:", message);
    // Example dispatch (if a notification reducer exists):
    // dispatchNotifications({ type: 'ADD_SYSTEM_NOTIFICATION', payload: message });
  }, []);

  // Helper to handle offline message queuing and UI feedback
  const handleOfflineMessage = useCallback(
    (message, type, options = {}) => {
      queueMessage(message, type, options);
      addSystemNotification(
        `${
          type === "reply" ? "Reply" : "Message"
        } queued. Will send when online.`
      );
      logger.info("Message queued for offline sending", {
        type,
        tempId: message.id,
      });
    },
    [addSystemNotification]
  );

  // Send a new message
  const sendMessage = useCallback(
    async (text) => {
      if (!user) {
        logger.error("Send message failed: User not authenticated.");
        dispatchMessages({
          type: "SET_ERROR",
          payload: "You must be logged in to send messages.",
        });
        return false;
      }
      if (!text || !text.trim()) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Message cannot be empty.",
        });
        return false;
      }

      const optimisticMsg = createOptimisticMessage(text, user.username);
      dispatchMessages({ type: "ADD_MESSAGE", payload: optimisticMsg }); // Optimistic UI update

      if (!isOnline || !isConnected || !socket) {
        handleOfflineMessage(optimisticMsg, "message");
        return true; // Indicate success (queued)
      }

      try {
        socket.emit("message", {
          text,
          tempId: optimisticMsg.id, // Send temp ID for matching server response
        });
        logger.info("Message sent via socket", { tempId: optimisticMsg.id });
        return true;
      } catch (error) {
        logger.error("Error sending message via socket", error);
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Failed to send message.",
        });
        // Optionally: revert optimistic update or mark as failed
        return false;
      }
    },
    [
      socket,
      isConnected,
      isOnline,
      user,
      dispatchMessages,
      handleOfflineMessage,
    ]
  );

  // Edit an existing message
  const editMessage = useCallback(
    async (messageId, newText) => {
      if (!isConnected || !socket) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Not connected to chat server.",
        });
        return false;
      }
      if (!newText || !newText.trim()) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Message text cannot be empty.",
        });
        return false;
      }

      // Permission check (client-side for immediate feedback, server enforces)
      const message = messages.find((msg) => msg.id === messageId);
      if (!message) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Cannot edit: Message not found.",
        });
        return false;
      }
      if (message.user !== user?.username) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Cannot edit: You can only edit your own messages.",
        });
        return false;
      }
      if (message.isDeleted) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Cannot edit a deleted message.",
        });
        return false;
      }

      // TODO: Consider optimistic UI update for edits?
      // dispatchMessages({ type: 'EDIT_MESSAGE', payload: { id: messageId, text: newText, isEdited: true } });

      try {
        socket.emit("editMessage", { id: messageId, text: newText });
        logger.info("Edit message event sent", { messageId });
        return true;
      } catch (error) {
        logger.error("Error sending edit message event", error);
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Failed to edit message.",
        });
        // TODO: Revert optimistic update if implemented
        return false;
      }
    },
    [socket, isConnected, user, messages, dispatchMessages] // Added messages dependency
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId) => {
      if (!isConnected || !socket) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Not connected to chat server.",
        });
        return false;
      }

      // Permission check
      const message = messages.find((msg) => msg.id === messageId);
      if (!message) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Cannot delete: Message not found.",
        });
        return false;
      }
      if (message.user !== user?.username) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Cannot delete: You can only delete your own messages.",
        });
        return false;
      }

      // Optimistic UI update
      dispatchMessages({ type: "DELETE_MESSAGE", payload: { id: messageId } });

      try {
        socket.emit("deleteMessage", { id: messageId });
        logger.info("Delete message event sent", { messageId });
        return true;
      } catch (error) {
        logger.error("Error sending delete message event", error);
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Failed to delete message.",
        });
        // Revert optimistic update
        // Find the original message state before deletion to revert accurately
        // This might require storing the original state temporarily or fetching it again.
        // For simplicity here, we might just re-fetch or ignore revert for now.
        // Example revert (simplified):
        // dispatchMessages({ type: 'ADD_MESSAGE', payload: message }); // This is imperfect
        return false;
      }
    },
    [socket, isConnected, user, messages, dispatchMessages] // Added messages dependency
  );

  // Normalize parent ID helper
  const normalizeParentId = useCallback((parentId) => {
    if (!parentId) throw new Error("Parent message ID is required");
    if (typeof parentId === "object" && parentId.id) return parentId.id;
    if (typeof parentId === "string" || typeof parentId === "number")
      return parentId.toString();
    throw new Error("Invalid parent message format");
  }, []);

  // Reply to a message
  const replyToMessage = useCallback(
    async (parentIdInput, text, customOptimisticMessage = null) => {
      if (!user) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "You must be logged in to reply.",
        });
        return false;
      }
      if (!text || !text.trim()) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Reply text cannot be empty.",
        });
        return false;
      }

      let normalizedParentId;
      try {
        normalizedParentId = normalizeParentId(parentIdInput);
      } catch (error) {
        logger.error("Invalid parent ID for reply", { parentIdInput, error });
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Cannot reply: Invalid parent message.",
        });
        return false;
      }

      // Use the provided optimistic message or create a new one
      const optimisticReply =
        customOptimisticMessage ||
        createOptimisticMessage(text, user.username, normalizedParentId);
      dispatchMessages({ type: "ADD_MESSAGE", payload: optimisticReply }); // Optimistic UI

      // Clear the replying state in the UI
      if (dispatchUi) {
        dispatchUi({ type: "CLEAR_REPLY_TO" });
      }

      if (!isOnline || !isConnected || !socket) {
        handleOfflineMessage(optimisticReply, "reply", {
          parentId: normalizedParentId,
        });
        return true; // Queued successfully
      }

      try {
        socket.emit("replyToMessage", {
          parentId: normalizedParentId,
          text,
          tempId: optimisticReply.id,
        });
        logger.info("Reply event sent", {
          parentId: normalizedParentId,
          tempId: optimisticReply.id,
        });
        return true;
      } catch (error) {
        logger.error("Error sending reply event", error);
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Failed to send reply.",
        });
        // TODO: Revert optimistic update
        return false;
      }
    },
    [
      socket,
      isConnected,
      isOnline,
      user,
      dispatchMessages,
      dispatchUi, // Added dependency
      handleOfflineMessage,
      normalizeParentId,
    ]
  );

  // Toggle a reaction on a message
  const toggleReaction = useCallback(
    async (messageId, emoji) => {
      if (!isConnected || !socket) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Not connected to chat server.",
        });
        return false;
      }
      if (!emoji) {
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Emoji is required for reactions.",
        });
        return false;
      }

      // TODO: Consider optimistic UI update for reactions?
      // This is complex because we need to know if the user *already* reacted.
      // Might be better to wait for server confirmation via 'messageUpdated' event.

      try {
        socket.emit("reaction", { id: messageId, emoji });
        logger.info("Reaction event sent", { messageId, emoji });
        return true;
      } catch (error) {
        logger.error("Error sending reaction event", error);
        dispatchMessages({
          type: "SET_ERROR",
          payload: "Failed to update reaction.",
        });
        return false;
      }
    },
    [socket, isConnected, dispatchMessages]
  );

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    toggleReaction,
    handleOfflineMessage, // Expose if needed externally
    addSystemNotification, // Expose if needed externally
  };
};

export default useMessageOperations;
