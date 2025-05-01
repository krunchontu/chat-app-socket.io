import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Sidebar component displaying online users and chat notifications.
 * @param {Array} onlineUsers - List of online user objects ({ id, username }).
 * @param {Array} notifications - List of notification objects ({ type, message, timestamp }).
 * @param {function} formatTime - Function to format timestamps.
 */
const ChatSidebar = ({ onlineUsers = [], notifications = [], formatTime }) => {
  const notificationsRef = useRef(null);

  // Scroll notifications to bottom when new ones arrive
  const notificationCount = useMemo(() => notifications.length, [notifications]);
  useEffect(() => {
    if (notificationsRef.current) {
      notificationsRef.current.scrollTop = notificationsRef.current.scrollHeight;
    }
  }, [notificationCount]);

  // Memoized time formatting function (passed as prop)
  const memoizedFormatTime = useCallback(formatTime, [formatTime]);

  return (
    <aside className="w-64 border-l border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-tertiary flex flex-col transition-colors duration-300 hidden md:block">
      {/* Online users panel */}
      <section
        className="flex-1 p-4 border-b border-gray-200 dark:border-dark-border-primary"
        aria-labelledby="online-users-heading"
      >
        <h3
          id="online-users-heading"
          className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary uppercase mb-3 pb-2 border-b border-gray-200 dark:border-dark-border-secondary"
        >
          Online Users ({onlineUsers?.length || 0})
        </h3>
        <ul
          className="space-y-2 overflow-y-auto max-h-[200px] scrollbar-hide"
          aria-label="List of online users"
        >
          {onlineUsers?.map(user => (
            <li
              key={user.id}
              className="flex items-center space-x-2 py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center" aria-hidden="true">
                <span>{user.username[0].toUpperCase()}</span>
              </div>
              <span className="flex-1 text-gray-800 dark:text-dark-text-primary truncate">{user.username}</span>
              <span
                className="w-2 h-2 rounded-full bg-success"
                aria-hidden="true"
                title="Online"
              ></span>
            </li>
          ))}
          {(!onlineUsers || onlineUsers.length === 0) && (
            <li className="text-center py-4 text-gray-500 dark:text-dark-text-tertiary italic">No users online</li>
          )}
        </ul>
      </section>

      {/* Notifications panel */}
      <section
        className="flex-1 p-4 overflow-hidden flex flex-col"
        aria-labelledby="notifications-heading"
      >
        <h3
          id="notifications-heading"
          className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary uppercase mb-3 pb-2 border-b border-gray-200 dark:border-dark-border-secondary"
        >
          Notifications
        </h3>
        <div
          className="flex-1 overflow-y-auto space-y-2 scrollbar-hide"
          ref={notificationsRef}
          role="log"
          aria-live="polite"
          aria-label="Chat notifications"
        >
          {notifications?.map((notification, index) => (
            <div
              key={index}
              className={`p-2 rounded-md text-sm animate-fadeIn ${
                notification.type === 'join'
                  ? 'bg-green-50 dark:bg-green-900/10 border-l-2 border-green-500 text-green-800 dark:text-green-400'
                  : notification.type === 'leave'
                  ? 'bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-500 text-amber-800 dark:text-amber-400'
                  : 'bg-gray-50 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary'
              }`}
              role="article"
            >
              <div className="flex justify-between items-baseline">
                <span>{notification.message}</span>
                <span className="text-xs text-gray-500 dark:text-dark-text-tertiary ml-2" aria-label={`Sent at ${memoizedFormatTime(notification.timestamp)}`}>
                  {memoizedFormatTime(notification.timestamp)}
                </span>
              </div>
            </div>
          ))}
          {(!notifications || notifications.length === 0) && (
            <div className="text-center py-4 text-gray-500 dark:text-dark-text-tertiary italic">No notifications</div>
          )}
        </div>
      </section>
    </aside>
  );
};

ChatSidebar.propTypes = {
  onlineUsers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
  })),
  notifications: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string,
    message: PropTypes.string.isRequired,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  })),
  formatTime: PropTypes.func.isRequired,
};

export default ChatSidebar;
