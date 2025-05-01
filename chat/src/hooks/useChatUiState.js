import { useReducer, useCallback } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useChatUiState");

// Initial state for UI-related chat state
const initialState = {
  replyingTo: null, // Holds the message object being replied to, or null
};

// Reducer specifically for UI state management
const uiReducer = (state, action) => {
  switch (action.type) {
    case "SET_REPLY_TO":
      logger.debug("Setting reply context", { messageId: action.payload?.id });
      return { ...state, replyingTo: action.payload };
    case "CLEAR_REPLY_TO":
      logger.debug("Clearing reply context");
      return { ...state, replyingTo: null };
    default:
      return state;
  }
};

/**
 * Custom hook to manage UI-specific chat state, such as the reply context.
 *
 * @returns {{
 *   uiState: { replyingTo: object | null };
 *   dispatchUi: function; // Raw dispatch function for the UI reducer
 *   setReplyingTo: (message: object | null) => void; // Convenience function
 *   clearReplyingTo: () => void; // Convenience function
 * }}
 */
const useChatUiState = () => {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // Convenience function to set the message being replied to
  const setReplyingTo = useCallback(
    (message) => {
      dispatch({ type: "SET_REPLY_TO", payload: message });
    },
    [dispatch]
  );

  // Convenience function to clear the reply context
  const clearReplyingTo = useCallback(() => {
    dispatch({ type: "CLEAR_REPLY_TO" });
  }, [dispatch]);

  return {
    uiState: state,
    dispatchUi: dispatch, // Expose dispatch if needed for more complex actions
    setReplyingTo,
    clearReplyingTo,
  };
};

export default useChatUiState;
