# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Architecture documentation with system overview and roadmap
- Domain-specific reducers in ChatContext for better state management
- Improved offline message queueing with optimistic UI updates
- Input validation with better error handling
- Parent message preview in replies
- Comprehensive error handling utilities
- Normalized parent ID handling for consistent replies

### Changed
- Refactored messageController.js with utility functions for common operations:
  - Added validation functions for ObjectIds and parameters
  - Extracted entity retrieval functions for messages and users
  - Created consistent error handling functions
  - Implemented pagination metadata builder
- Improved ChatContext.jsx with modular reducers:
  - Split into connection, messages, users, notifications, and UI reducers
  - Extracted socket event handlers into specific domains
  - Added better error handling for socket operations
  - Enhanced offline support with queuing
- Refactored ChatInput.jsx into smaller, focused components:
  - InputError component for error display
  - MessageInputField component with character counter
  - EmojiPickerControl component with backdrop
  - SendButton component for submitting messages
- Refactored MessageItem.jsx following atomic design principles:
  - UserAvatar component for user initials
  - MessageTimestamp for formatted time display
  - MessageHeader for user information
  - ReplyIndicator for parent message reference
  - MessageContent for sanitized content display
  - MessageBubble component for overall message container
- Enhanced error handling with consistent patterns and better user feedback
- Improved project documentation (README.md and ARCHITECTURE.md)

### Fixed
- Socket connection handling with better reconnection strategy
- Improved error reporting for API and socket operations
- Enhanced message validation before sending
- Fixed emoji picker positioning and focus handling
- Optimized virtualized message list rendering

## [1.0.0] - 2024-12-15

### Added
- Initial release with core chat functionality
- Real-time messaging with Socket.IO
- User authentication and authorization
- Message editing and deletion
- Message reactions and replies
- Dark/light theme support
- Offline status detection
- Progressive Web App (PWA) support
- Browser notifications
- Error boundary protection
