import { createContext, useContext, useReducer, useEffect, useCallback, useState } from "react";
import socketIo from "socket.io-client";
import axios from "axios";
import { useAuth } from "../components/common/AuthContext";
import { 
  createOptimisticMessage, 
  queueMessage, 
  processQueue, 
  replaceOptimisticMessage,
  isOnline as checkOnline
} from "../utils/offlineQueue";

// Use environment variable for the endpoint, with a fallback for safety
const ENDPOINT = process.env.REACT_APP_SOCKET_ENDPOINT || "http://localhost:4500/";
const API_BASE_URL = ENDPOINT.endsWith("/") ? ENDPOINT + "api" : ENDPOINT + "/api";

/**
 * ChatContext provides real-time messaging features and state management
 * for the chat application, including socket connection handling and 
 * message operations (sending, editing, deleting, reacting).
 */
const ChatContext = createContext();

/**
 * Reducer function for managing chat state
 * Handles messages, connections, and all chat-related operations
 * @param {Object} state - Current chat state
 * @param {Object} action - Dispatched action with type and payload
 * @returns {Object} Updated state
 */
/**
 * Improved reducer with offline support and optimistic UI updates
 */
const chatReducer = (state, action) => {
  switch (action.type) {
    case "SET_CONNECTION_STATUS":
      return { ...state, isConnected: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "SET_MESSAGES":
      return { 
        ...state, 
        messages: action.payload.messages || [], 
        pagination: action.payload.pagination || state.pagination,
        loading: false 
      };
    case "PREPEND_MESSAGES":
      // Add older messages to the beginning of the array
      // Avoid duplicates by checking message IDs
      const uniqueMessages = action.payload.messages.filter(
        newMsg => !state.messages.some(existingMsg => existingMsg.id === newMsg.id)
      );
      return {
        ...state,
        messages: [...uniqueMessages, ...state.messages],
        pagination: action.payload.pagination || state.pagination,
        loading: false,
        hasMoreMessages: action.payload.pagination?.currentPage < action.payload.pagination?.totalPages - 1
      };
    case "ADD_MESSAGE":
      // If this is a server message that matches a temporary optimistic message, replace it
      if (action.payload.isServerResponse && action.payload.tempId) {
        return {
          ...state,
          messages: replaceOptimisticMessage(
            state.messages, 
            action.payload.tempId, 
            action.payload.message
          )
        };
      }
      // Avoid duplicate messages
      if (state.messages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload] };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? 
          { 
            ...msg, 
            likes: action.payload.likes,
            likedBy: action.payload.likedBy,
            reactions: action.payload.reactions
          } : msg
        )
      };
    case "EDIT_MESSAGE":
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? 
          { 
            ...msg,
            text: action.payload.text,
            isEdited: action.payload.isEdited,
            editHistory: action.payload.editHistory
          } : msg
        )
      };
    case "DELETE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, isDeleted: true } : msg
        )
      };
    case "ADD_REPLY":
      // If parent message is in our current list, we might want to update it
      // to show it has replies, but for now just add the reply as a normal message
      if (state.messages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_SOCKET":
      return { ...state, socket: action.payload };
    case "SET_ONLINE_USERS":
      return { ...state, onlineUsers: action.payload };
    case "ADD_USER_NOTIFICATION":
      return { 
        ...state, 
        notifications: [...state.notifications, action.payload]
      };
    // For managing reply UI state
    case "SET_REPLY_TO":
      return { ...state, replyingTo: action.payload };
    case "CLEAR_REPLY_TO":
      return { ...state, replyingTo: null };
    default:
      return state;
  }
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isConnected: false,
    loading: false,
    error: null,
    socket: null,
    onlineUsers: [],
    notifications: [],
    pagination: {
      currentPage: 0,
      totalPages: 1,
      totalMessages: 0,
      limit: 20
    },
    hasMoreMessages: true,
    loadingMore: false,
    isOfflineMode: !checkOnline() // Initialize offline status
  });

  // Track online status for the whole app
  const [isOnline, setIsOnline] = useState(checkOnline);
  
  /**
   * Load more (older) messages with pagination
   * @param {number} page - Page number to load
   * @returns {Promise<boolean>} Success status
   */
  const loadMoreMessages = useCallback(async (page) => {
    if (!isAuthenticated || state.loadingMore) return false;
    
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Authentication token not found");
      }
      
      // Make authenticated request with pagination
      const response = await axios.get(`${API_BASE_URL}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page,
          limit: state.pagination.limit
        }
      });
      
      // Add older messages to the beginning
      dispatch({ type: "PREPEND_MESSAGES", payload: response.data });
      return true;
    } catch (error) {
      console.error("Failed to fetch more messages:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Failed to load more messages. Please try again." 
      });
      return false;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [isAuthenticated, state.loadingMore, state.pagination.limit]);

  /**
   * Handle API error and return appropriate error message
   * @param {Error} error - Error object from API call
   * @returns {string} User-friendly error message
   */
  const getApiErrorMessage = (error) => {
    if (error.response?.status === 401) {
      return "Authentication error. Please login again.";
    } else if (error.response?.status === 429) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    } else {
      return "Failed to load message history. Please refresh the page.";
    }
  };

  /**
   * Fetch initial messages from the server
   */
  const fetchInitialMessages = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Authentication token not found");
      }
      
      const response = await axios.get(`${API_BASE_URL}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      dispatch({ type: "SET_MESSAGES", payload: response.data });
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: getApiErrorMessage(error)
      });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      dispatch({ 
        type: "ADD_USER_NOTIFICATION", 
        payload: {
          type: "system",
          message: "You are back online",
          timestamp: new Date().toISOString()
        }
      });
      
      // Process any queued messages when coming back online
      if (state.socket && state.socket.connected) {
        processQueue(state.socket, dispatch).catch(err => {
          console.error("Error processing offline queue:", err);
        });
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      dispatch({ 
        type: "ADD_USER_NOTIFICATION", 
        payload: {
          type: "system",
          message: "You are offline. Messages will be sent when you reconnect.",
          timestamp: new Date().toISOString()
        }
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.socket]);

  // Fetch initial messages when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchInitialMessages();
  }, [isAuthenticated, fetchInitialMessages]);

  /**
   * Setup socket event handlers
   * @param {Object} socket - Socket.io instance
   */
  const setupSocketEventHandlers = useCallback((socket) => {
    // Connection events
    socket.on("connect", () => {
      console.log("Socket connected with auth");
      dispatch({ type: "SET_CONNECTION_STATUS", payload: true });
      
      // Clear connection error on successful connect
      if (state.error && state.error.includes("Failed to connect")) {
        dispatch({ type: "SET_ERROR", payload: null });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Failed to connect: " + (error.message || "Authentication failed")
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      dispatch({ type: "SET_CONNECTION_STATUS", payload: false });
      
      // Handle specific disconnect reasons
      if (reason === "io server disconnect") {
        // Server disconnected the client, need to manually reconnect
        socket.connect();
        dispatch({ 
          type: "SET_ERROR", 
          payload: "Disconnected by server. Attempting to reconnect..." 
        });
      } else if (reason === "transport close") {
        dispatch({ 
          type: "SET_ERROR", 
          payload: "Lost connection to server. Reconnecting..." 
        });
      }
    });

    // Reconnection events
    socket.on("reconnect", (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      dispatch({ type: "SET_ERROR", payload: null });
    });

    socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: `Reconnection failed: ${error.message}. Retrying...`
      });
    });
    
    socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to reconnect to the server. Please refresh the page."
      });
    });

    // Message events
    socket.on("sendMessage", (data) => {
      dispatch({ type: "ADD_MESSAGE", payload: data });
    });

    // Message update events
    socket.on("messageUpdated", (data) => {
      if (data && data.id) {
        dispatch({ 
          type: "UPDATE_MESSAGE", 
          payload: { 
            id: data.id, 
            likes: data.likes,
            likedBy: data.likedBy,
            reactions: data.reactions 
          } 
        });
      } else {
        console.warn("Received invalid messageUpdated data:", data);
      }
    });
    
    socket.on("messageEdited", (data) => {
      if (data && data.id) {
        dispatch({ type: "EDIT_MESSAGE", payload: data });
      } else {
        console.warn("Received invalid messageEdited data:", data);
      }
    });
    
    socket.on("messageDeleted", (data) => {
      if (data && data.id) {
        dispatch({ type: "DELETE_MESSAGE", payload: data });
      } else {
        console.warn("Received invalid messageDeleted data:", data);
      }
    });
    
    socket.on("replyCreated", (data) => {
      if (data && data.id) {
        dispatch({ type: "ADD_REPLY", payload: data });
      } else {
        console.warn("Received invalid replyCreated data:", data);
      }
    });

    // User-related events
    socket.on("onlineUsers", (users) => {
      dispatch({ type: "SET_ONLINE_USERS", payload: users });
    });

    socket.on("userNotification", (notification) => {
      dispatch({ type: "ADD_USER_NOTIFICATION", payload: notification });
    });

    // Error events
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
    });
  }, [state.error]);

  // Set up socket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Get token from localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Authentication token not found. Please login again." 
      });
      return;
    }
    
    // Socket connection options
    const socketOptions = { 
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    };
    
    // Connect with auth token and reconnection options
    const socket = socketIo(ENDPOINT, socketOptions);
    
    // Setup all event handlers
    setupSocketEventHandlers(socket);
    
    // Set socket in state
    dispatch({ type: "SET_SOCKET", payload: socket });

    // Process any queued messages once socket is connected
    if (isOnline && socket && socket.connected) {
      processQueue(socket, dispatch).catch(err => {
        console.error("Error processing offline queue:", err);
      });
    }
    
    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, setupSocketEventHandlers, isOnline]);

  /**
   * Edit a message
   * 
   * @param {string} messageId - ID of the message to edit
   * @param {string} newText - New content for the message
   * @returns {Promise<boolean>} Success status
   */
  /**
   * Send a message with offline support and optimistic UI
   * 
   * @param {string} text - Message content
   * @param {string} [parentId] - Parent message ID for replies
   * @returns {Promise<boolean>} Success status
   */
  const sendMessage = useCallback(async (text) => {
    try {
      // Create optimistic message
      const optimisticMsg = createOptimisticMessage(text, user.username);
      
      // Add to UI immediately
      dispatch({ type: "ADD_MESSAGE", payload: optimisticMsg });
      
      // Handle offline case
      if (!isOnline || !state.isConnected) {
        // Queue for later delivery
        queueMessage(optimisticMsg, "message");
        
        // Notify user
        dispatch({ 
          type: "ADD_USER_NOTIFICATION", 
          payload: {
            type: "system",
            message: "Message queued for sending when back online",
            timestamp: new Date().toISOString()
          }
        });
        return true;
      }
      
      // Send message through socket
      state.socket.emit("message", { 
        text,
        tempId: optimisticMsg.id // Send temp ID to match response to optimistic message
      });
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Failed to send message" 
      });
      return false;
    }
  }, [state.socket, state.isConnected, isOnline, user]);

  const editMessage = useCallback(async (messageId, newText) => {
    if (!state.socket || !state.isConnected) {
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Not connected to chat server" 
      });
      return false;
    }
    
    try {
      // Validate parameters
      if (!messageId) throw new Error("Message ID is required");
      if (!newText || !newText.trim()) throw new Error("Message text cannot be empty");
      
      // Check if user can edit this message (owns it)
      const message = state.messages.find(msg => msg.id === messageId);
      
      if (!message) throw new Error("Message not found");
      if (message.user !== user?.username) throw new Error("You can only edit your own messages");
      
      // Emit the edit event via socket
      state.socket.emit("editMessage", { id: messageId, text: newText });
      return true;
    } catch (error) {
      console.error("Failed to edit message:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: error.message || "Failed to edit message" 
      });
      return false;
    }
  }, [state.socket, state.isConnected, state.messages, user?.username]);
  
  /**
   * Delete a message
   * 
   * @param {string} messageId - ID of the message to delete
   * @returns {Promise<boolean>} Success status
   */
  const deleteMessage = useCallback(async (messageId) => {
    if (!state.socket || !state.isConnected) {
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Not connected to chat server" 
      });
      return false;
    }
    
    try {
      // Validate parameters
      if (!messageId) throw new Error("Message ID is required for deletion");
      
      // Check if user can delete this message (owns it)
      const message = state.messages.find(msg => msg.id === messageId);
      
      if (!message) throw new Error("Message not found");
      
      if (message.user !== user?.username) {
        throw new Error("You can only delete your own messages");
      }
      
      // Emit the delete event via socket
      state.socket.emit("deleteMessage", { id: messageId });
      return true;
    } catch (error) {
      console.error("Failed to delete message:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: error.message || "Failed to delete message" 
      });
      return false;
    }
  }, [state.socket, state.isConnected, state.messages, user?.username]);
  
  /**
   * Reply to a message
   * 
   * @param {string} parentId - ID of the message being replied to
   * @param {string} text - Content of the reply
   * @returns {Promise<boolean>} Success status
   */
  /**
   * Reply to a message with offline support
   * 
   * @param {string} parentId - ID of the message being replied to
   * @param {string} text - Content of the reply
   * @returns {Promise<boolean>} Success status
   */
  const replyToMessage = useCallback(async (parentId, text) => {
    if (!state.socket || !state.isConnected) {
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Not connected to chat server" 
      });
      return false;
    }
    
    try {
      // Validate parameters
      if (!parentId) throw new Error("Parent message ID is required");
      if (!text || !text.trim()) throw new Error("Reply text cannot be empty");
      
      // Create optimistic reply
      const optimisticReply = createOptimisticMessage(text, user.username, parentId);
      
      // Add to UI immediately
      dispatch({ type: "ADD_MESSAGE", payload: optimisticReply });
      
      // Handle offline case
      if (!isOnline || !state.isConnected) {
        // Queue for later delivery
        queueMessage(optimisticReply, "reply", { parentId });
        
        dispatch({ 
          type: "ADD_USER_NOTIFICATION", 
          payload: {
            type: "system",
            message: "Reply queued for sending when back online",
            timestamp: new Date().toISOString()
          }
        });
        
        // Clear reply UI state
        dispatch({ type: "CLEAR_REPLY_TO" });
        return true;
      }
      
      // Emit the reply event via socket
      state.socket.emit("replyToMessage", { 
        parentId, 
        text,
        tempId: optimisticReply.id
      });
      
      // Clear reply UI state
      dispatch({ type: "CLEAR_REPLY_TO" });
      
      return true;
    } catch (error) {
      console.error("Failed to reply to message:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: error.message || "Failed to send reply" 
      });
      return false;
    }
  }, [state.socket, state.isConnected, isOnline, user]);
  
  /**
   * Toggle a reaction on a message
   * 
   * @param {string} messageId - ID of the message to react to
   * @param {string} emoji - Emoji to use as reaction
   * @returns {Promise<boolean>} Success status
   */
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!state.socket || !state.isConnected) {
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Not connected to chat server" 
      });
      return false;
    }
    
    try {
      // Validate parameters
      if (!messageId) throw new Error("Message ID is required for reactions");
      if (!emoji) throw new Error("Emoji is required for reactions");
      
      // Check if message exists in our state
      const messageExists = state.messages.some(msg => msg.id === messageId);
      if (!messageExists) {
        console.warn(`Attempted to react to message ${messageId} which is not in the current state`);
      }
      
      // Emit the reaction event via socket
      state.socket.emit("reaction", { id: messageId, emoji });
      return true;
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: error.message || "Failed to update reaction" 
      });
      return false;
    }
  }, [state.socket, state.isConnected, state.messages]);
  
  /**
   * Clear current error message
   */
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);
  
  /**
   * Set reply context when replying to a message
   * @param {Object} message - Message being replied to
   */
  const setReplyingTo = useCallback((message) => {
    dispatch({ type: "SET_REPLY_TO", payload: message });
  }, []);

  return (
    <ChatContext.Provider 
      value={{ 
        state, 
        dispatch, 
        loadMoreMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        replyToMessage,
        toggleReaction,
        clearError,
        setReplyingTo,
        isOnline
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
