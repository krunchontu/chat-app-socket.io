# Changelog

## [Unreleased]

### Fixed
- Fixed message persistence issue after logout/login:
  - Modified server-side message sorting to return newest messages first
  - Updated client-side handling to properly display messages in chronological order
- Fixed blue message bubble unnecessary wrapping for short messages:
  - Improved message container layout with inline-block display
  - Enhanced text layout with proper whitespace handling
  - Added CSS properties for better text wrapping behavior
  - Fixed flexbox layout issues in message containers
  - Added width: fit-content to allow content to determine bubble width
  - Changed display properties to prevent stretching and unwanted line breaks
- Fixed text input flickering and missing letters issue:
  - Removed debounce mechanism for input text updates
  - Direct state updates for better keystroke responsiveness
  - Maintained debounce only for error handling which doesn't affect typing
- Fixed ESLint warning in Chat.jsx by removing unnecessary dependency from useCallback hook
- Optimized chat input handling to prevent UI flickering during typing
- Resolved duplicate notification issues by implementing deduplication logic
- Enhanced virtualized message list for better performance with large conversations
- Added debounce functionality to character count and error updates in the input field

## [Unreleased]
### Fixed
- Fixed "Parent message ID is required" error when replying to messages:
  - Added enhanced validation for parent message IDs in reply functionality
  - Improved error handling with clear user feedback
  - Added support for handling both ID strings and message objects in the reply function
  - Fixed edge cases where invalid parent message objects were causing errors

- Fixed UI alignment issues with message actions and emoji reactions:
  - Restructured message container CSS to create proper stacking contexts
  - Fixed z-index conflicts that caused emojis to appear disconnected from messages
  - Improved positioning of reaction panels to ensure they stay attached to parent messages
  - Enhanced message action buttons with proper containment and fixed positioning
  - Added data-testid attributes to improve testability and debugging

- UI rendering issues with overlapping chat elements:
  - Fixed overlapping reaction emoticons and reply buttons by moving message actions outside the message bubble container
  - Improved message spacing to prevent elements from colliding
  - Implemented proper margins and padding for reaction buttons
  - Removed negative margins that were causing layout issues
  - Changed fixed message height to dynamic sizing based on content length, reactions, and replies
  - Enhanced the reactions display for better visual separation

## [1.0.0] - 2025-04-01
### Added
- Initial release of the chat application
- Real-time messaging with Socket.io
- User authentication system
- Message reactions feature
- Reply to messages functionality
- Dark/light theme toggle
- Message editing and deletion
- Notification system
