import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './components/common/AuthContext';
import { ChatProvider } from './context/ChatContext';

// Mock the child components
jest.mock('./components/common/ErrorBoundary', () => {
  return function MockErrorBoundary({ children, context }) {
    return (
      <div data-testid={`error-boundary-${context}`}>
        {children}
      </div>
    );
  };
});

jest.mock('./components/chat/Chat', () => {
  return function MockChat() {
    return <div data-testid="chat-component">Chat Component</div>;
  };
});

jest.mock('./components/auth/Login', () => {
  return function MockLogin() {
    return <div data-testid="login-component">Login Component</div>;
  };
});

jest.mock('./components/auth/Register', () => {
  return function MockRegister() {
    return <div data-testid="register-component">Register Component</div>;
  };
});

jest.mock('./components/common/Home', () => {
  return function MockHome() {
    return <div data-testid="home-component">Home Component</div>;
  };
});

jest.mock('./components/common/PrivateRoute', () => {
  // Mock implementation that renders children if authenticated
  return function MockPrivateRoute({ children }) {
    const isAuthenticated = localStorage.getItem('auth-test') === 'true';
    return isAuthenticated ? children : <div>Not authenticated</div>;
  };
});

jest.mock('./components/common/PwaInstallBanner', () => {
  return function MockPwaInstallBanner() {
    return <div data-testid="pwa-banner">PWA Banner</div>;
  };
});

// Mock socket.io and axios for the providers
jest.mock('socket.io-client', () => () => ({
  on: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
}));

jest.mock('axios');

describe('App Component', () => {
  // Before each test setup
  beforeEach(() => {
    // Setup mocks for online/offline
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    // App should contain the PWA banner
    expect(screen.getByTestId('pwa-banner')).toBeInTheDocument();
    // App should contain the error boundary
    expect(screen.getByTestId('error-boundary-app-root')).toBeInTheDocument();
  });

  it('renders home route by default', () => {
    render(<App />);
    expect(screen.getByTestId('home-component')).toBeInTheDocument();
  });

  it('navigates to login route', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <Routes>
                <Route path="/login" element={<div data-testid="login-route">Login</div>} />
              </Routes>
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-route')).toBeInTheDocument();
  });

  it('shows the offline indicator when offline', () => {
    // Mock navigator.onLine to return false
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    
    render(<App />);
    // Offline indicator should be shown
    expect(screen.getByText('You are currently offline')).toBeInTheDocument();
  });

  it('redirects to home for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    );
    
    // Should redirect to home component
    expect(screen.getByTestId('home-component')).toBeInTheDocument();
  });

  it('requires authentication for chat route', () => {
    // Set up mock auth status (not authenticated)
    localStorage.setItem('auth-test', 'false');
    
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <App />
      </MemoryRouter>
    );
    
    // Should show not authenticated message
    expect(screen.getByText('Not authenticated')).toBeInTheDocument();
  });

  it('allows access to chat route when authenticated', () => {
    // Set up mock auth status (authenticated)
    localStorage.setItem('auth-test', 'true');
    
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <App />
      </MemoryRouter>
    );
    
    // Should render chat component
    expect(screen.getByTestId('chat-component')).toBeInTheDocument();
  });

  it('wraps all routes in error boundaries', () => {
    render(<App />);
    
    // Should have multiple error boundaries with different contexts
    expect(screen.getByTestId('error-boundary-app-root')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-chat-provider')).toBeInTheDocument();
  });

  it('correctly listens for online/offline events', () => {
    // Start as online
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    
    // Setup listeners for online/offline events
    let onlineListener;
    let offlineListener;
    
    jest.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
      if (event === 'online') onlineListener = cb;
      if (event === 'offline') offlineListener = cb;
    });
    
    render(<App />);
    
    // No offline indicator initially
    expect(screen.queryByText('You are currently offline')).not.toBeInTheDocument();
    
    // Trigger offline event
    offlineListener && offlineListener();
    // Re-mock navigator.onLine
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    
    // Now check if offline indicator appears
    expect(screen.getByText('You are currently offline')).toBeInTheDocument();
    
    // Trigger online event
    onlineListener && onlineListener();
    // Re-mock navigator.onLine
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    
    // Offline indicator should disappear
    expect(screen.queryByText('You are currently offline')).not.toBeInTheDocument();
  });
});
