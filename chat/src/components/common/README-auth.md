# Authentication System Documentation

This document describes the architecture and usage of the authentication system for the chat application.

## Architecture Overview

The authentication system follows a layered architecture with clear separation of concerns:

```
┌─────────────────────┐
│    AuthContext.jsx  │  <- React Context / UI Layer
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    authService.js   │  <- Business Logic Layer
└─────────┬───────────┘
          │
     ┌────┴─────┐
     ▼          ▼
┌─────────┐ ┌─────────┐
│apiService│ │storageService│ <- Data Access Layer
└─────────┘ └─────────┘
     │          │
     └────┬─────┘
          │
          ▼
┌─────────────────────┐
│ Utility Functions   │  <- Utility Layer
│ (jwt, url, etc.)    │
└─────────────────────┘
```

### Key Components

1. **React Context (AuthContext.jsx)**
   - Provides authentication state to the application
   - Exposes authentication methods (login, register, logout)
   - Manages loading and error states

2. **Auth Service (authService.js)**
   - Centralizes authentication logic
   - Handles token validation and refresh
   - Coordinates between API and storage services

3. **API Service (apiService.js)**
   - Handles HTTP requests to the authentication endpoints
   - Provides request retry logic and error handling
   - Abstracts away the details of API communication

4. **Storage Service (storageService.js)**
   - Manages persistent storage of auth tokens and user data
   - Provides error handling for storage operations
   - Abstracts localStorage access

5. **Utility Functions**
   - JWT utilities for token handling
   - URL utilities for API endpoint construction
   - CSRF utilities for security

## Key Improvements

### 1. State Management

- Switched from multiple `useState` hooks to a single `useReducer` for more predictable state transitions
- Added explicit action types for all state changes
- Improved error state handling and exposure to consumers

### 2. Code Organization

- Extracted token handling logic to dedicated utility functions
- Moved API communication to a dedicated service
- Centralized localStorage access in a storage service
- Removed duplicated URL construction code

### 3. Error Handling

- Consistent error logging across all layers
- Better user feedback for authentication errors
- Improved handling of network issues and token expiration

### 4. Security Enhancements

- More robust token validation
- Centralized CSRF protection
- Automatic token refresh mechanism (planned)
- Proper clearing of authentication data on logout

### 5. Performance Improvements

- Reduced redundant token validations
- More efficient state updates
- Proper cleanup of timers and resources

## Usage Examples

### Authentication Status

```jsx
import { useAuth } from './components/common/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  return isAuthenticated 
    ? <p>Welcome, {user.username}!</p>
    : <p>Please log in to continue.</p>;
}
```

### Login

```jsx
import { useAuth } from './components/common/AuthContext';

function LoginForm() {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    
    if (result.success) {
      // Redirect or show success message
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input 
        type="text" 
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
```

### Registration

```jsx
import { useAuth } from './components/common/AuthContext';

function RegisterForm() {
  const { register, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(formData);
    
    if (result.success) {
      // Redirect or show success message
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input 
        name="username"
        type="text" 
        value={formData.username}
        onChange={handleChange}
        placeholder="Username"
      />
      <input 
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Password"
      />
      <input 
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email (optional)"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Register'}
      </button>
    </form>
  );
}
```

### Logout

```jsx
import { useAuth } from './components/common/AuthContext';

function LogoutButton() {
  const { logout, loading } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    // Redirect to login page or home
  };
  
  return (
    <button onClick={handleLogout} disabled={loading}>
      {loading ? 'Logging out...' : 'Log Out'}
    </button>
  );
}
```

## Future Enhancements

1. **Token Refresh Flow**: Implement automatic refresh of tokens before they expire
2. **Remember Me Functionality**: Add option to persist authentication across browser sessions
3. **Multi-factor Authentication**: Add support for 2FA or other additional authentication steps
4. **OAuth Integration**: Support for third-party authentication providers
5. **Permission-based Authorization**: Extend the auth context to handle user roles and permissions

## Testing

The new architecture makes testing much easier:

- Services can be tested in isolation with mocked dependencies
- AuthContext can be tested with mocked services
- Components using AuthContext can be tested with a mocked AuthContext

See the test files for examples of unit tests for each component.
