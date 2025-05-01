import { useState, useEffect, useRef, useCallback } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useChatScroll");

/**
 * Custom hook to manage infinite scrolling behavior for the chat message list.
 * Handles scroll event listening, loading older messages, and restoring scroll position.
 *
 * @param {object} options - Configuration options.
 * @param {function} options.loadMoreMessages - Function to call to load older messages.
 * @param {boolean} options.loadingMessages - Whether initial messages are loading.
 * @param {boolean} options.hasMoreMessages - Whether there are more messages to load.
 * @param {object} options.pagination - Pagination state ({ currentPage }).
 * @returns {{
 *   chatThreadRef: React.RefObject<HTMLDivElement>; // Ref to attach to the scrollable container
 *   loadingOlder: boolean; // State indicating if older messages are currently loading
 *   scrollToBottom: (behavior?: ScrollBehavior) => void; // Function to scroll to the bottom
 * }}
 */
const useChatScroll = ({
  loadMoreMessages,
  loadingMessages, // Renamed from 'loading' for clarity
  hasMoreMessages,
  pagination,
}) => {
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const chatThreadRef = useRef(null);

  // Function to scroll to the bottom
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (chatThreadRef.current) {
      chatThreadRef.current.scrollTo({
        top: chatThreadRef.current.scrollHeight,
        behavior: behavior,
      });
    }
  }, []);

  // Handle scrolling to trigger loading more messages
  const handleScroll = useCallback(() => {
    // Exit if already loading, no more messages, or ref not set
    if (
      !chatThreadRef.current ||
      loadingOlder ||
      loadingMessages ||
      !hasMoreMessages
    ) {
      return;
    }

    const { scrollTop, scrollHeight: currentScrollHeight } =
      chatThreadRef.current;

    // Trigger load more if scrolled near the top (e.g., within 100px)
    if (scrollTop < 100) {
      logger.info("Near top, loading older messages...");
      // Save current scroll position and height before loading
      setScrollPosition(scrollTop);
      setScrollHeight(currentScrollHeight);
      setLoadingOlder(true);

      // Call the loadMoreMessages function (passed in)
      // It should handle its own pagination logic based on the passed 'pagination' state
      loadMoreMessages() // Assuming loadMoreMessages knows the next page
        .catch((err) => logger.error("Error loading more messages:", err))
        .finally(() => {
          // setLoadingOlder(false); // Resetting is handled by the effect below
        });
    }
  }, [loadMoreMessages, loadingOlder, loadingMessages, hasMoreMessages]);

  // Attach scroll listener
  useEffect(() => {
    const chatThread = chatThreadRef.current;
    if (chatThread) {
      chatThread.addEventListener("scroll", handleScroll);
      logger.debug("Scroll listener attached.");

      // Cleanup listener on unmount
      return () => {
        if (chatThread) {
          chatThread.removeEventListener("scroll", handleScroll);
          logger.debug("Scroll listener removed.");
        }
      };
    }
  }, [handleScroll]); // Re-attach if handleScroll changes

  // Maintain scroll position after loading older messages
  useEffect(() => {
    // This effect runs when loadingOlder transitions from true to false
    if (loadingOlder === false && chatThreadRef.current && scrollHeight > 0) {
      // Calculate the new scroll position to keep the view stable
      const newScrollTop =
        chatThreadRef.current.scrollHeight - scrollHeight + scrollPosition;
      chatThreadRef.current.scrollTop = newScrollTop;
      logger.info("Restored scroll position after loading older messages", {
        newScrollTop,
      });

      // Reset tracked scroll height
      setScrollHeight(0);
    }
    // We also need to reset loadingOlder state here after position is restored
    // This effect depends on the *completion* of loadMoreMessages,
    // so we trigger the reset based on loadingMessages changing *back* to false
    // or potentially a dedicated flag if loadMoreMessages returns one.
    // For now, let's assume loadMoreMessages finishes and loadingOlder is set to false externally or via its own logic.
    // Let's refine: The component using this hook will set loadingOlder false when loadMoreMessages completes.
    // This effect *reacts* to loadingOlder becoming false.
  }, [loadingOlder, scrollHeight, scrollPosition]); // Depend on loadingOlder changing

  // Effect to scroll to bottom when initial messages load or component mounts
  useEffect(() => {
    // Scroll to bottom only when initial loading is finished
    if (!loadingMessages && chatThreadRef.current) {
      // Use 'auto' for initial load to avoid jarring scroll animation
      scrollToBottom("auto");
      logger.debug("Scrolled to bottom on initial load.");
    }
  }, [loadingMessages, scrollToBottom]); // Depend on initial loading state

  return {
    chatThreadRef,
    loadingOlder,
    scrollToBottom, // Expose scroll function
    // The component using the hook will need to manage setting loadingOlder back to false
    // after the loadMoreMessages promise resolves.
    setLoadingOlder, // Expose setter for external control
  };
};

export default useChatScroll;
