# Dialoque

A secure, accessible real-time chat application built with React, Socket.IO, Express, and MongoDB. This application provides user authentication, real-time messaging, message reactions, and user presence tracking with a focus on security, accessibility, and error handling.

[![WCAG 2.1 AA Compliant](https://img.shields.io/badge/WCAG%202.1-AA%20Compliant-green)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Keyboard Accessible](https://img.shields.io/badge/Keyboard-Accessible-blue)](https://www.w3.org/TR/WCAG21/#keyboard-accessible)
[![MIT License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## Architecture

The application follows a client-server architecture:

- **Client**: React-based frontend with Socket.IO for real-time communication
- **Server**: Express.js server with Socket.IO and MongoDB integration
- **Authentication**: JWT-based authentication flow
- **Database**: MongoDB for storing users and messages

```
┌────────────────┐      ┌─────────────────────┐      ┌───────────────┐
│                │      │                     │      │               │
│  React Client  │<────>│  Express/Socket.IO  │<────>│   MongoDB     │
│                │      │  Server             │      │   Database    │
└────────────────┘      └─────────────────────┘      └───────────────┘
```

## Features

- **User Authentication**: Secure login/register system with JWT
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **Message Reactions**: Like/unlike messages in real-time
- **User Presence**: Track online users and notify when users join/leave
- **Emoji Support**: Built-in emoji picker for expressing emotions
- **Message History**: Load previous messages on connection
- **Responsive Design**: Works on desktop and mobile devices
- **Security**: Input validation, rate limiting, and secure authentication
- **Modern UI**: Sleek interface built with Tailwind CSS
- **Toast Notifications**: Intuitive feedback system using React Hot Toast
- **Dark/Light Mode**: Theme system with persistent preferences

## Technologies

- **Frontend**: React, React Router, Socket.IO Client
- **Backend**: Node.js, Express.js, Socket.IO Server
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **UI Framework**: Tailwind CSS for responsive and consistent design
- **Notifications**: React Hot Toast for toast notifications
- **Security**: bcrypt for password hashing, express-rate-limit for rate limiting

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB instance (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone [repository URL]
   cd chat-app-socket.io
   ```

2. Install dependencies for both client and server:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../chat
   npm install
   ```

3. Set up environment variables:
   - Create `.env` files in both `server/` and `chat/` directories based on the provided `.env.example` templates
   - Update the MongoDB connection string in `server/.env`
   - Set a strong JWT secret in `server/.env`
   - Ensure the Socket.IO endpoints match in both config files

4. Start the development servers:
   ```bash
   # Start server (from server directory)
   npm start

   # Start client (from chat directory)
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000` to use the application

## UI Framework

The application uses Tailwind CSS for styling, offering several advantages:

1. **Consistent Design Language**: Uniform styling across components
2. **Responsive by Default**: Mobile-first approach with easy breakpoint handling
3. **Dark Mode Support**: Integrated with a theme system for light/dark preferences
4. **Performance**: Only includes the CSS you actually use
5. **Developer Experience**: Fast styling workflow directly in markup

We implement a theme system that respects user preferences and persists their choice:

```javascript
// Example of the theme toggling functionality
const toggleTheme = () => {
  setTheme(prevTheme => (prevTheme === "dark" ? "light" : "dark"));
};
```

## Toast Notification System

The application uses React Hot Toast for notifications, providing a streamlined way to show:

- Success messages
- Error alerts
- Connection status updates
- New message notifications

The toast system is integrated with both the UI theme and accessibility standards:

```javascript
// Example of custom toast notification
showSuccessToast("Account created successfully!");
showErrorToast("Unable to connect to server.");
```

## Security Best Practices

1. **Environment Variables**: Never commit sensitive information like database credentials or JWT secrets. Use .env files (included in .gitignore).
2. **Input Validation**: All user inputs are validated both on client and server.
3. **Rate Limiting**: API endpoints are protected against brute force attacks.
4. **Authentication**: JWT tokens with proper expiration and server-side validation.
5. **Password Storage**: Passwords are hashed using bcrypt before storage.
6. **CORS Protection**: Configured to accept connections only from trusted origins.

## Accessibility Features

The chat application follows WCAG 2.1 AA guidelines for accessibility:

1. **Keyboard Navigation**: The entire application is usable with keyboard alone.
2. **Screen Reader Support**:
   - Proper ARIA attributes for dynamic content
   - Semantic HTML structure
   - Accessible form labels and error messages
3. **Focus Management**: Visual focus indicators and proper focus control
4. **Color Contrast**: Meets WCAG AA requirements for text contrast
5. **Responsive Design**: Accessible on various screen sizes and devices
6. **Error Handling**: Clear error messages with instructions for recovery
7. **Alternative Text**: Non-text content contains accessible alternatives

## Error Handling and Reliability

The application implements a robust error handling system:

1. **Centralized Error Service**:
   - Consistent error handling across components
   - Categorized errors (network, validation, authentication, etc.)
   - Severity levels for appropriate handling
2. **React Error Boundaries**:
   - Component isolation prevents cascading failures
   - Context-specific error recovery strategies
   - User-friendly error messages
3. **Connection Resilience**:
   - Socket reconnection strategies
   - Visual connection status indicators
   - Graceful degradation during connection issues
4. **Structured Logging**:
   - Comprehensive error tracking
   - Context-aware error reporting
   - Privacy-conscious data logging

See the [CHANGELOG.md](CHANGELOG.md) for detailed information about recent improvements.

## Deployment

### Server Deployment
1. Set up a Node.js hosting environment (Heroku, AWS, Digital Ocean, etc.)
2. Configure environment variables for production
3. Set up a MongoDB Atlas cluster or other MongoDB hosting solution
4. Deploy the server code, ensuring the PORT variable is properly set

### Client Deployment
1. Build the production version of the React app: `npm run build`
2. Deploy the static files to a static hosting service (Netlify, Vercel, etc.)
3. Ensure the REACT_APP_SOCKET_ENDPOINT points to your deployed server

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Socket.IO team for their excellent real-time communication library
- MongoDB team for their reliable database solution
- React team for their powerful frontend framework
- Tailwind Labs for their utility-first CSS framework
- React Hot Toast for the intuitive notification system
