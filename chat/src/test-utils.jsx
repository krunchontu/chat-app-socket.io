/**
 * Test Utilities for React Component Testing
 *
 * This file provides custom render functions and utilities that wrap components
 * with necessary providers (Router, Auth, Theme, etc.) for testing.
 *
 * Usage:
 *   import { render, screen } from '../test-utils';
 *
 *   test('renders login form', () => {
 *     render(<Login />);
 *     expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
 *   });
 */

import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './components/common/AuthContext';

/**
 * Custom render function that wraps components with all necessary providers
 *
 * @param {React.ReactElement} ui - The component to render
 * @param {Object} options - Render options
 * @param {string} options.route - Initial route for testing (default: '/')
 * @param {Object} options.authValue - Mock auth context value
 * @param {Object} options.renderOptions - Additional React Testing Library render options
 * @returns {Object} React Testing Library render result with additional utilities
 */
function render(
  ui,
  {
    route = '/',
    authValue,
    ...renderOptions
  } = {}
) {
  // Set initial route
  window.history.pushState({}, 'Test page', route);

  // Create wrapper with all providers
  function Wrapper({ children }) {
    // If custom auth value is provided, use a mock provider
    if (authValue) {
      const MockAuthProvider = ({ children }) => (
        <div data-testid="mock-auth-provider">
          {children}
        </div>
      );

      // Make mock auth values available via React context
      return (
        <BrowserRouter>
          <MockAuthProvider>
            {children}
          </MockAuthProvider>
        </BrowserRouter>
      );
    }

    // Otherwise use real providers
    return (
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Creates a mock AuthContext value for testing
 *
 * @param {Object} overrides - Values to override in the mock context
 * @returns {Object} Mock auth context value
 */
export function createMockAuthContext(overrides = {}) {
  return {
    user: null,
    loading: false,
    login: jest.fn().mockResolvedValue({ success: true }),
    register: jest.fn().mockResolvedValue({ success: true }),
    logout: jest.fn().mockResolvedValue({ success: true }),
    isAuthenticated: false,
    ...overrides,
  };
}

/**
 * Creates a mock user object for testing
 *
 * @param {Object} overrides - Values to override in the mock user
 * @returns {Object} Mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id-123',
    username: 'testuser',
    email: 'test@example.com',
    ...overrides,
  };
}

/**
 * Waits for loading state to complete
 * Useful for async operations in tests
 *
 * @param {number} ms - Milliseconds to wait (default: 0)
 * @returns {Promise} Promise that resolves after timeout
 */
export function waitForLoadingToFinish(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock implementations for common utilities
 */
export const mockToastUtils = {
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
  showInfoToast: jest.fn(),
  showWarningToast: jest.fn(),
};

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

/**
 * Helper to create mock axios responses
 */
export function createMockAxiosResponse(data, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  };
}

/**
 * Helper to create mock axios errors
 */
export function createMockAxiosError(message, status = 400, data = {}) {
  const error = new Error(message);
  error.response = {
    data,
    status,
    statusText: status === 400 ? 'Bad Request' : 'Error',
    headers: {},
  };
  error.config = {};
  return error;
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the default render with our custom render
export { render };
