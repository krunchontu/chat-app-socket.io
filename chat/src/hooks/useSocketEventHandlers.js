import { useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../utils/logger";
//import { analyzeMessageFlow } from "../utils/socketDebugger";

const logger = createLogger("useSocketEventHandlers");

// For tracing all events during debugging, can be moved to config
const DEBUG_MESSAGE_TRACE_ENABLED = true;

/**
 * Custom hook to manage socket event handlers specifically for chat operations
 * Extracts handler logic from ChatContext for better separation of concerns
 *
 * @param {Object} socket - Socket.io instance
 * @param {Function} dispatchMessages - Message state dispatch function
 * @param {Function} dispatchNotifications - Notifications state dispatch function
 * @param {Function} dispatchUi - UI state dispatch function
 * @param {Object} messageState - Current message state
 * @param {Object} user - Current user information
 * @param {Function} fetchInitialMessages - Function to fetch initial messages
 * @returns {Object} Event handlers for socket events
 */
const useSocketEventHandlers = (
  socket,
  dispatchMessages,
  dispatchNotifications,
  dispatchUi,
  messageState = {},
  user = {},
  fetchInitialMessages
) => {
  // Track message processing for debugging
  const debugStateRef = useRef({
    lastEventTime: null,
    processedMessageIds: new Set(),
    missedMessages: [],
  });

  // Keep track of event statistics for monitoring
  const eventStatsRef = useRef({
    reconnections: 0,
    lastReconnectTime: null,
    eventCounts: {
      message: 0,
      sendMessage: 0,
      messageUpdated: 0,
      messageDeleted: 0,
    },
  });

  /**
   * Add a system notification
   *
   * @param {string} message - Notification message
   */
  const addSystemNotification = useCallback(
    (message) => {
      dispatchNotifications({
        type: "ADD_USER_NOTIFICATION",
        payload: {
          type: "system",
          message,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [dispatchNotifications]
  );

  /**
   * Handle new messages from both 'message' and 'sendMessage' events
   * Processes incoming messages with deduplication and optimistic updates
   *
   * @param {Object} data - Message data from socket event
   */
  const handleNewMessage = useCallback(
    (data) => {
      const now = new Date();

      // Handle null or invalid data
      if (!data) {
        logger.error("Received null or undefined message data");
        return;
      }

      // Normalize ID fields - ensure we're consistent with identifying messages
      const messageId = data?.id || data?._id || null;
      const tempId = data?.tempId || data?._meta?.tempId || null;

      // Enhanced debug logging
      if (DEBUG_MESSAGE_TRACE_ENABLED) {
        console.group("📩 MESSAGE RECEIVED TRACE");
        console.log("⏰ Time:", now.toLocaleTimeString());
        console.log("📝 Data:", data);
        console.log(
          "🔌 Connection Status:",
          socket?.connected ? "Connected" : "Disconnected"
        );
        console.log("🆔 Socket ID:", socket?.id || "Unknown");
        console.log("👤 Current User:", user?.username || "Unknown");

        // Check if this is a duplicate message we've already processed
        const isDuplicate =
          messageId && debugStateRef.current.processedMessageIds.has(messageId);
        console.log("🔄 Is Duplicate:", isDuplicate);

        // Track message event type counts
        const eventType = data?._meta?.eventType || "unknown";
        if (eventType === "message" || eventType === "sendMessage") {
          eventStatsRef.current.eventCounts[eventType] =
            (eventStatsRef.current.eventCounts[eventType] || 0) + 1;
        }

        // Show counts of each event type received
        console.log("📊 Event Counts:", eventStatsRef.current.eventCounts);

        console.groupEnd();
      }

      // Generate an event identifier for tracing
      const eventId = uuidv4();

      try {
        // Process message data - sometimes the payload structure might vary
        let messageData = data;

        // Ensure ID consistency for processed messages - this is key to fixing the issue
        // Make sure the message has an id field for tracking
        if (messageId) {
          // Ensure messageData has an id field, even if it came from _id
          messageData = {
            ...messageData,
            id: messageId,
          };
        }

        // Handle duplicate messages - check if we've already processed this message ID
        if (
          messageId &&
          debugStateRef.current.processedMessageIds.has(messageId) &&
          !tempId
        ) {
          logger.debug(`Duplicate message detected and skipped: ${messageId}`);
          return; // Skip processing but continue for tempId matches (optimistic updates)
        }

        // Add to processed IDs set to prevent duplication
        if (messageId) {
          debugStateRef.current.processedMessageIds.add(messageId);
          debugStateRef.current.lastEventTime = now.toISOString();
        }

        // Handle optimistic UI updates with tempId
        if (tempId) {
          logger.debug("Processing message with tempId:", tempId);
          dispatchMessages({
            type: "ADD_MESSAGE",
            payload: {
              isServerResponse: true,
              tempId: tempId,
              message: messageData,
              _trace: { eventId, receivedAt: now.toISOString() },
            },
          });
        } else {
          // Make sure we're not adding any null/empty messages
          if (!messageData.text && messageData.text !== "") {
            logger.warn(
              "Received message without text content, adding placeholder:",
              messageId
            );
            messageData.text = messageData.text || "[No content]";
          }

          logger.debug("Processing regular message:", messageId, messageData);

          // Add all required fields to ensure consistent message objects
          const enhancedMessage = {
            ...messageData,
            id: messageId || `generated-${Date.now()}`,
            timestamp: messageData.timestamp || new Date().toISOString(),
            _trace: {
              eventId,
              receivedAt: now.toISOString(),
              source: "socket",
            },
          };

          dispatchMessages({
            type: "ADD_MESSAGE",
            payload: enhancedMessage,
          });
        }
      } catch (error) {
        logger.error("Error processing incoming message:", error);

        // Track failed messages for debugging
        debugStateRef.current.missedMessages.push({
          id: messageId || "unknown",
          tempId: tempId || "none",
          error: error.message,
          data: JSON.stringify(data).substring(0, 200) + "...", // Truncate for safety
          timestamp: now.toISOString(),
        });
      }
    },
    [dispatchMessages, socket, user]
  );

  /**
   * Handle message updated events
   *
   * @param {Object} data - Updated message data
   */
  const handleMessageUpdated = useCallback(
    (data) => {
      logger.debug("Received 'messageUpdated' event", { id: data?.id });
      if (data && data.id) {
        dispatchMessages({ type: "UPDATE_MESSAGE", payload: data });
        eventStatsRef.current.eventCounts.messageUpdated =
          (eventStatsRef.current.eventCounts.messageUpdated || 0) + 1;
      }
    },
    [dispatchMessages]
  );

  /**
   * Handle message edited events
   *
   * @param {Object} data - Edited message data
   */
  const handleMessageEdited = useCallback(
    (data) => {
      logger.debug("Received 'messageEdited' event", { id: data?.id });
      if (data && data.id)
        dispatchMessages({ type: "EDIT_MESSAGE", payload: data });
    },
    [dispatchMessages]
  );

  /**
   * Handle message deleted events
   *
   * @param {Object} data - Deleted message data
   */
  const handleMessageDeleted = useCallback(
    (data) => {
      logger.debug("Received 'messageDeleted' event", { id: data?.id });
      if (data && data.id) {
        dispatchMessages({ type: "DELETE_MESSAGE", payload: data });
        eventStatsRef.current.eventCounts.messageDeleted =
          (eventStatsRef.current.eventCounts.messageDeleted || 0) + 1;
      }
    },
    [dispatchMessages]
  );

  /**
   * Handle reply created events
   *
   * @param {Object} data - Reply message data
   */
  const handleReplyCreated = useCallback(
    (data) => {
      logger.debug("Received 'replyCreated' event", {
        id: data?.id,
        parentId: data?.parentId,
      });
      // Treat replies like normal messages for adding to the list
      if (data && data.id)
        dispatchMessages({ type: "ADD_MESSAGE", payload: data });
    },
    [dispatchMessages]
  );

  /**
   * Handle online users updates
   *
   * @param {Array} users - List of online users
   */
  const handleOnlineUsers = useCallback(
    (users) => {
      // Ensure users is an array
      if (!Array.isArray(users)) {
        logger.warn("Received invalid onlineUsers format:", users);
        return;
      }

      logger.debug("Received 'onlineUsers' event", { userCount: users.length });

      // Get current state for comparison
      const currentOnlineUsers = messageState.onlineUsers || [];

      // Normalize user objects to ensure consistent structure
      const normalizedUsers = users
        .filter((user) => user && (user.username || user.userId || user.id))
        .map((user) => ({
          id:
            user.userId ||
            user.id ||
            `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          username: user.username || "Anonymous",
          socketId: user.socketId || null,
          connectedAt: user.connectedAt || new Date().toISOString(),
        }));

      // Update online users list
      dispatchNotifications({
        type: "SET_ONLINE_USERS",
        payload: normalizedUsers,
      });

      // Don't generate notifications for initial user list
      if (currentOnlineUsers.length === 0) {
        return;
      }

      // Generate notifications for newly online users
      const newUsers = normalizedUsers.filter(
        (newUser) =>
          !currentOnlineUsers.some(
            (existingUser) =>
              existingUser.id === newUser.id ||
              existingUser.username === newUser.username
          )
      );

      // Add notifications for new users (but not for the current user)
      newUsers.forEach((newUser) => {
        if (newUser.username && newUser.username !== user?.username) {
          dispatchNotifications({
            type: "ADD_USER_NOTIFICATION",
            payload: {
              type: "join",
              message: `${newUser.username} has joined the chat`,
              timestamp: new Date().toISOString(),
              userId: newUser.id,
            },
          });
        }
      });

      // Check for users who went offline
      const offlineUsers = currentOnlineUsers.filter(
        (existingUser) =>
          !normalizedUsers.some(
            (newUser) =>
              newUser.id === existingUser.id ||
              newUser.username === existingUser.username
          )
      );

      // Add notifications for users who went offline
      offlineUsers.forEach((offlineUser) => {
        if (offlineUser.username && offlineUser.username !== user?.username) {
          dispatchNotifications({
            type: "ADD_USER_NOTIFICATION",
            payload: {
              type: "leave",
              message: `${offlineUser.username} has left the chat`,
              timestamp: new Date().toISOString(),
              userId: offlineUser.id,
            },
          });
        }
      });
    },
    [dispatchNotifications, messageState.onlineUsers, user?.username]
  );

  /**
   * Handle user notification events
   *
   * @param {Object} notification - Notification data
   */
  const handleUserNotification = useCallback(
    (notification) => {
      logger.debug("Received 'userNotification' event", {
        type: notification?.type,
      });
      dispatchNotifications({
        type: "ADD_USER_NOTIFICATION",
        payload: notification,
      });
    },
    [dispatchNotifications]
  );

  /**
   * Handle socket reconnection events
   */
  const handleReconnect = useCallback(() => {
    logger.info("Socket reconnected - catching up on missed messages");
    // Track reconnection statistics
    eventStatsRef.current.reconnections++;
    eventStatsRef.current.lastReconnectTime = new Date().toISOString();

    // Add user notification
    addSystemNotification("Connection restored. Syncing messages...");

    // Fetch latest messages to ensure we didn't miss any during reconnect
    if (fetchInitialMessages) {
      fetchInitialMessages();
    }
  }, [fetchInitialMessages, addSystemNotification]);

  /**
   * Handle socket disconnection events
   *
   * @param {string} reason - Reason for disconnection
   */
  const handleDisconnect = useCallback(
    (reason) => {
      logger.warn(`Socket disconnected: ${reason}`);

      // If not a clean disconnect, show notification
      if (reason !== "io client disconnect") {
        addSystemNotification(`Connection lost (${reason}). Reconnecting...`);
      }
    },
    [addSystemNotification]
  );

  /**
   * Get debugging and statistics information
   *
   * @returns {Object} Debug information
   */
  const getDebugInfo = useCallback(() => {
    return {
      processedMessageCount: debugStateRef.current.processedMessageIds.size,
      missedMessageCount: debugStateRef.current.missedMessages.length,
      eventCounts: eventStatsRef.current.eventCounts,
      reconnections: eventStatsRef.current.reconnections,
      lastEventTime: debugStateRef.current.lastEventTime,
      lastReconnectTime: eventStatsRef.current.lastReconnectTime,
    };
  }, []);

  // Return all the handlers grouped by functionality
  return {
    // Message handlers
    handleNewMessage,
    handleMessageUpdated,
    handleMessageEdited,
    handleMessageDeleted,
    handleReplyCreated,

    // User/presence handlers
    handleOnlineUsers,
    handleUserNotification,

    // Connection handlers
    handleReconnect,
    handleDisconnect,

    // Utilities
    addSystemNotification,
    getDebugInfo,
  };
};

export default useSocketEventHandlers;
