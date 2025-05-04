# Chat Application Server

This is the backend server for the real-time chat application. The server handles HTTP API requests and real-time WebSocket communication via Socket.IO.

## Architecture

The server follows a modular architecture with clear separation of concerns:

```
server/
├── config/              # Configuration modules
│   ├── serverConfig.js  # Server settings
│   ├── corsConfig.js    # CORS configuration
│   ├── databaseConfig.js # Database connection and settings
│   └── socketConfig.js  # Socket.IO configuration
├── controllers/         # API controllers
├── middleware/          # Middleware functions
├── models/              # Database models
├── routes/              # API routes
├── services/            # Business logic services
├── socket/              # Socket.IO handlers
│   ├── handlers/        # Event handlers by feature
│   │   ├── messageHandlers.js # Message-related event handlers 
│   │   └── userHandlers.js    # User-related event handlers
│   └── socketServer.js  # Socket.IO server setup
├── utils/               # Utility functions
├── httpServer.js        # Express server configuration
└── index.js             # Application entry point
```

## Key Components

### Entry Points

- **index.js**: Main application entry point that initializes all components
- **httpServer.js**: Express server setup with routes and middleware
- **socketServer.js**: Socket.IO server configuration and event registration

### Socket Event Handlers

- **messageHandlers.js**: Handles all message-related socket events (sending, editing, deleting, reacting)
- **userHandlers.js**: Handles user-related events (connection, disconnection)

### Configuration

Configuration is centralized in the `config` directory:

- **serverConfig.js**: Environment and server settings
- **corsConfig.js**: CORS policy configuration
- **databaseConfig.js**: Database connection settings
- **socketConfig.js**: Socket.IO server configuration

## Design Patterns

1. **Modular Architecture**: Each part of the system has a clear responsibility
2. **Dependency Injection**: Components receive their dependencies as parameters
3. **Event-Driven Architecture**: Socket.IO events are handled by dedicated handler functions
4. **Centralized Configuration**: All configuration settings are in one place
5. **Error Handling**: Consistent error handling and logging

## Error Handling

The application uses a structured approach to error handling:

1. **Try-Catch Blocks**: All asynchronous operations are wrapped in try-catch blocks
2. **Error Logging**: Errors are logged with detailed information using the logger utility
3. **Client Notifications**: Appropriate error messages are sent to clients

## Performance Considerations

1. **Connection Pooling**: Database connections are reused
2. **Efficient Broadcasting**: Messages are broadcast only when necessary
3. **Rate Limiting**: API endpoints are protected by rate limiters
4. **Request Validation**: All incoming data is validated before processing

## Security Features

1. **Authentication**: Socket connections require authentication
2. **CORS Protection**: Strict CORS policy is enforced
3. **Input Validation**: All user inputs are validated
4. **Rate Limiting**: Protection against brute-force attacks

## Starting the Server

```bash
# Install dependencies
npm install

# Start in development mode
npm run start:dev

# Start in production mode
npm start
```

## Environment Variables

The server can be configured using the following environment variables:

- `PORT`: Server port (default: 4500)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `CLIENT_ORIGIN`: Comma-separated list of allowed CORS origins
- `HOST`: Hostname for the server in production

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Recent Refactoring Changes

The codebase was recently refactored with the following improvements:

1. **Modular Structure**: Split monolithic server.js into smaller, focused modules
2. **Improved Error Handling**: Added consistent error handling across all handlers
3. **Centralized Configuration**: Moved all configuration to dedicated modules
4. **Enhanced Logging**: Added detailed contextual logging
5. **Separation of Concerns**: Split HTTP and Socket.IO server setup
6. **Better Documentation**: Added comprehensive JSDoc comments
7. **Graceful Shutdown**: Added proper shutdown handling for the server
