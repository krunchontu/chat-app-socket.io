import { useReducer, useCallback } from "react";
import axios from "axios";
import { replaceOptimisticMessage } from "../utils/offlineQueue";
import ErrorService from "../services/ErrorService";
import { createLogger } from "../utils/logger";

const API_BASE_URL =
  (process.env.REACT_APP_SOCKET_ENDPOINT || "http://localhost:4501/").replace(
    /\/$/,
    ""
  ) + "/api";
const logger = createLogger("useMessageState");

// Initial state for the message-related part of the context
const initialState = {
  messages: [],
  pagination: {
    currentPage: 0,
    totalPages: 1,
    totalMessages: 0,
    limit: 20, // Default limit
  },
  loading: false,
  loadingMore: false,
  hasMoreMessages: true, // Assume there are more messages initially
  error: null,
};

// Reducer specifically for message state management
const messagesReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_LOADING_MORE":
      return { ...state, loadingMore: action.payload };
    case "SET_ERROR":
      // Clear previous error before setting a new one
      return {
        ...state,
        error: action.payload,
        loading: false,
        loadingMore: false,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "SET_MESSAGES":
      // Initial load - messages come newest first from API
      const initialMessages = (action.payload.messages || []).slice().reverse(); // Reverse to display oldest first
      const initialPagination = action.payload.pagination || state.pagination;
      return {
        ...state,
        messages: initialMessages,
        pagination: initialPagination,
        loading: false,
        hasMoreMessages:
          initialPagination.currentPage < initialPagination.totalPages - 1,
      };
    case "PREPEND_MESSAGES":
      // Loading older messages - they come newest first for that page
      const olderMessages = (action.payload.messages || []).slice().reverse(); // Reverse page to be oldest first
      const uniqueMessages = olderMessages.filter(
        (newMsg) =>
          !state.messages.some((existingMsg) => existingMsg.id === newMsg.id)
      );
      const newPagination = action.payload.pagination || state.pagination;
      return {
        ...state,
        messages: [...uniqueMessages, ...state.messages], // Prepend unique older messages
        pagination: newPagination,
        loadingMore: false,
        hasMoreMessages:
          newPagination.currentPage < newPagination.totalPages - 1,
      };
    case "ADD_MESSAGE":
      // If it's a server response matching an optimistic message, replace it
      if (action.payload.isServerResponse && action.payload.tempId) {
        return {
          ...state,
          messages: replaceOptimisticMessage(
            state.messages,
            action.payload.tempId,
            action.payload.message
          ),
        };
      }

      // Deduplication for regular messages or new optimistic messages
      const isDuplicate = state.messages.some(
        (msg) =>
          msg.id === action.payload.id ||
          (action.payload.tempId && msg.id === action.payload.tempId)
      );

      if (isDuplicate) {
        logger.warn("Prevented duplicate message add", {
          id: action.payload.id || action.payload.tempId,
        });
        return state; // Don't add duplicates
      }

      return { ...state, messages: [...state.messages, action.payload] };
    case "UPDATE_MESSAGE": // Handles likes and reactions
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? {
                ...msg,
                likes: action.payload.likes,
                likedBy: action.payload.likedBy,
                reactions: action.payload.reactions,
              }
            : msg
        ),
      };
    case "EDIT_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? {
                ...msg,
                text: action.payload.text,
                isEdited: action.payload.isEdited,
                editHistory: action.payload.editHistory,
              }
            : msg
        ),
      };
    case "DELETE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id ? { ...msg, isDeleted: true } : msg
        ),
      };
    // Note: ADD_REPLY might not be needed if replies are just added via ADD_MESSAGE
    // case "ADD_REPLY":
    //   // If parent message is in our current list, just add the reply as a normal message
    //   if (state.messages.some(msg => msg.id === action.payload.parentId)) {
    //      // Potentially update parent message state if needed (e.g., reply count)
    //   }
    //   // Add the reply itself if not duplicate
    //   const isReplyDuplicate = state.messages.some(msg => msg.id === action.payload.id);
    //   return { ...state, messages: isReplyDuplicate ? state.messages : [...state.messages, action.payload] };
    default:
      return state;
  }
};

/**
 * Custom hook to manage message state, including fetching and pagination.
 *
 * @returns {{
 *   messageState: object; // Contains messages, pagination, loading, hasMoreMessages, error
 *   dispatchMessages: function; // Raw dispatch function for the message reducer
 *   fetchInitialMessages: () => Promise<void>;
 *   loadMoreMessages: () => Promise<boolean>;
 *   clearMessageError: () => void;
 * }}
 */
const useMessageState = () => {
  const [state, dispatch] = useReducer(messagesReducer, initialState);

  const clearMessageError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // Fetch initial messages (page 0)
  const fetchInitialMessages = useCallback(async () => {
    logger.info("Fetching initial messages");
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "CLEAR_ERROR" }); // Clear previous errors
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const response = await axios.get(`${API_BASE_URL}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 0, limit: state.pagination.limit },
      });
      logger.info("Initial messages received", {
        count: response.data?.messages?.length,
      });
      dispatch({ type: "SET_MESSAGES", payload: response.data });
    } catch (error) {
      logger.error("Failed to fetch initial messages", error);
      const errorMsg = ErrorService.handleApiError(
        error,
        "fetchInitialMessages"
      );
      dispatch({ type: "SET_ERROR", payload: errorMsg });
    }
  }, [state.pagination.limit]); // Dependency on limit

  // Load more messages (older ones)
  const loadMoreMessages = useCallback(async () => {
    if (state.loadingMore || !state.hasMoreMessages) {
      logger.info("Load more messages skipped", {
        loadingMore: state.loadingMore,
        hasMore: state.hasMoreMessages,
      });
      return false; // Don't fetch if already loading or no more messages
    }

    const nextPage = state.pagination.currentPage + 1;
    logger.info("Loading more messages", { nextPage });
    dispatch({ type: "SET_LOADING_MORE", payload: true });
    dispatch({ type: "CLEAR_ERROR" }); // Clear previous errors

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const response = await axios.get(`${API_BASE_URL}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: nextPage, limit: state.pagination.limit },
      });

      logger.info("More messages received", {
        count: response.data?.messages?.length,
        page: nextPage,
      });
      dispatch({ type: "PREPEND_MESSAGES", payload: response.data });
      return true;
    } catch (error) {
      logger.error("Failed to load more messages", error);
      const errorMsg = ErrorService.handleApiError(error, "loadMoreMessages");
      dispatch({ type: "SET_ERROR", payload: errorMsg });
      dispatch({ type: "SET_LOADING_MORE", payload: false }); // Ensure loading state is reset on error
      return false;
    }
  }, [
    state.loadingMore,
    state.hasMoreMessages,
    state.pagination.currentPage,
    state.pagination.limit,
  ]);

  return {
    messageState: state, // Expose the whole message state slice
    dispatchMessages: dispatch, // Expose dispatch for direct actions if needed
    fetchInitialMessages,
    loadMoreMessages,
    clearMessageError,
  };
};

export default useMessageState;
