# Real-time Chat Application

A modern, scalable chat application built with React, Socket.IO, and Node.js.

## Features

- **Real-time Communication**: Instant messaging using Socket.IO
- **User Management**: Authentication, authorization, and online status
- **Message Features**: 
  - Editing and deletion with history tracking
  - Reactions with emoji support
  - Threaded replies
  - Offline message queueing
- **UI/UX**: 
  - Responsive design for all devices
  - Dark/light theme support
  - Accessibility features (ARIA attributes)
  - Progressive Web App (PWA) capabilities
- **Security & Reliability**:
  - JWT authentication
  - Input sanitization
  - Error boundary protection
  - Comprehensive error handling

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MongoDB (local or Atlas)

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

4. Configure your environment variables:
   - `REACT_APP_SOCKET_ENDPOINT`: Socket.IO server endpoint
   - `MONGO_URI`: MongoDB connection string
   - `JWT_SECRET`: Secret for JWT token signing

5. Start the development servers:

```bash
# Start client
cd chat
npm start

# Start server (in a different terminal)
cd server
npm start
```

## Testing

The application includes comprehensive unit tests for critical components:

```bash
cd chat
npm test
```

### Test Coverage

- **Context Tests**: Authentication, chat operations, theme functionality
- **Component Tests**: UI rendering and interaction
- **Utils Tests**: Offline queue, notifications, error handling

Run with coverage report:

```bash
npm test -- --coverage
```

## Continuous Integration

This project uses GitHub Actions for CI/CD:

- **Pipeline Stages**:
  - Linting and code quality checks
  - Unit and integration tests
  - Build verification
  - Coverage reporting

## Project Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

### Directory Structure

```
chat/                   # Frontend application
├── public/             # Static files
├── src/
│   ├── components/     # React components
│   │   ├── auth/       # Authentication components
│   │   ├── chat/       # Chat-related components
│   │   └── common/     # Shared components
│   ├── context/        # React contexts (modular with domain reducers)
│   ├── services/       # Service classes
│   └── utils/          # Helper functions
└── server/             # Backend application
    ├── config/         # Configuration files
    ├── controllers/    # Request handlers (with utility extraction)
    ├── middleware/     # Express middleware
    ├── models/         # Mongoose models
    └── routes/         # API routes
```

## Key Design Patterns

### Frontend
- **Component Composition**: Smaller, focused components
- **Context API with Domain Reducers**: Modular state management
- **Optimistic Updates**: Immediate UI feedback with server validation
- **Memoization**: Performance optimization with React.memo and useMemo
- **Higher-Order Components**: For shared functionality

### Backend
- **Controller-Service Pattern**: Separation of concerns
- **Middleware Chain**: For authentication and validation
- **Repository Pattern**: Database access abstraction
- **Observer Pattern**: For real-time events
- **Error Handler Pattern**: Consistent error management

## Recent Improvements

### Refactored Backend Controllers
- Extracted utility functions for common operations
- Improved error handling with consistent patterns
- Enhanced parameter validation

### Enhanced Frontend Components
- Split large components into smaller, focused ones
- Improved accessibility with proper ARIA attributes
- Added memoization for better performance
- Enhanced error handling

### State Management Improvements
- Modularized reducers by domain
- Enhanced offline support with optimistic updates
- Improved socket connection handling

## Development Roadmap

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the detailed roadmap with priorities.

### Upcoming Features
- Enhanced error handling system
- Improved offline support and conflict resolution
- Performance optimizations for large message lists
- Enhanced security features
- Accessibility improvements (WCAG compliance)
- UI component library and design system
- User profile and settings management
- Advanced messaging features (attachments, formatting)
- Comprehensive test coverage

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [ARCHITECTURE.md](./ARCHITECTURE.md) for coding standards and guidelines.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
