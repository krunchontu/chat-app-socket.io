# Chat Application

A real-time chat application built with React, Socket.IO, and Node.js.

## Features

- Real-time messaging with Socket.IO
- User authentication and authorization
- Message editing and deletion
- Message reactions and replies
- Dark/light theme support
- Offline status detection
- Progressive Web App (PWA) support
- Browser notifications
- Error boundary protection

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install client dependencies
cd chat
npm install

# Install server dependencies
cd ../server
npm install
```

3. Create `.env` files by copying from examples:

```bash
# Client environment variables
cd chat
cp .env.example .env

# Server environment variables
cd ../server
cp .env.example .env
```

4. Start the development servers:

```bash
# Start client
cd chat
npm start

# Start server (in a different terminal)
cd server
npm start
```

## Testing

The application includes comprehensive unit tests for critical components. Run the tests with:

```bash
cd chat
npm test
```

Major tested components include:
- ChatContext: Socket connection, message operations
- ThemeContext: Theme switching functionality
- App: Routing and error boundaries
- Chat component: UI rendering and message handling
- MessageActions: Message operations (edit, delete, reaction)

## Continuous Integration

This project uses GitHub Actions for CI. The workflow:
- Runs on every push and pull request to main/master branches
- Installs dependencies
- Runs linter checks
- Executes unit tests
- Generates and uploads a coverage report

## Project Structure

```
chat/
├── public/             # Static files
├── src/
│   ├── components/     # React components
│   │   ├── auth/       # Authentication components
│   │   ├── chat/       # Chat-related components
│   │   └── common/     # Shared components
│   ├── context/        # React context providers
│   ├── services/       # Service modules
│   └── utils/          # Utility functions
└── server/
    ├── config/         # Server configuration
    ├── controllers/    # Request handlers
    ├── middleware/     # Express middleware
    ├── models/         # Database models
    └── routes/         # API routes
```

## Code Architecture

### Client Architecture

The client is built using React with context-based state management:

- **Context Providers**:
  - `AuthContext`: Manages user authentication state
  - `ChatContext`: Handles messaging with socket connections
  - `ThemeContext`: Controls theme preferences

- **Key Components**:
  - `App`: Main component with routing and error boundaries
  - `Chat`: Main chat interface, message display
  - `MessageList`: Renders chat messages (extracted from Chat for better code organization)
  - `MessageActions`: UI for message operations (edit, delete, react)
  - `HeaderComponent`: Navigation and app controls
  - `ErrorBoundary`: Catches and handles runtime errors

### Server Architecture

The server uses Express.js with Socket.IO for real-time communication:

- **API Routes**: RESTful endpoints for authentication and data retrieval
- **Socket Events**: Real-time messaging and notifications
- **Database Models**: User and message schemas
- **Middleware**: Authentication, validation, and rate limiting

## Future Improvements

### UX Enhancements
- Implement loading skeletons instead of spinners for better perceived performance
- Add keyboard shortcuts for common actions
- Improve mobile responsiveness for message actions
- Add read receipts functionality
- Implement message threading for better conversation flow

### Technical Improvements
- Add end-to-end testing with Cypress
- Implement WebRTC for audio/video chat
- Add file upload capabilities
- Implement message search functionality
- Add support for markdown in messages

## Contributors

- [Your Name](https://github.com/yourusername)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
