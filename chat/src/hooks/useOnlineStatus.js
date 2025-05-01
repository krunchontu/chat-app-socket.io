import { useState, useEffect } from "react";
import { createLogger } from "../utils/logger";

const logger = createLogger("useOnlineStatus");

// Helper function to get the initial online status
const getInitialOnlineStatus = () => {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean"
  ) {
    return navigator.onLine;
  }
  // Default to true if navigator.onLine is not available (e.g., in some test environments)
  return true;
};

/**
 * Custom hook to track the browser's online/offline status.
 *
 * @returns {boolean} Current online status.
 */
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus());

  useEffect(() => {
    const handleOnline = () => {
      logger.info("Browser reported online status.");
      setIsOnline(true);
    };

    const handleOffline = () => {
      logger.info("Browser reported offline status.");
      setIsOnline(false);
    };

    // Check if window is defined (for environments like SSR)
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Cleanup listeners on unmount
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    } else {
      logger.warn(
        "Window object not found, cannot attach online/offline listeners."
      );
      // Return a no-op cleanup function if window is not available
      return () => {};
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return isOnline;
};

export default useOnlineStatus;
