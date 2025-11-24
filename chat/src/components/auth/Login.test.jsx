/**
 * Login Component Tests
 *
 * Testing Login component with mock dependencies
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import Login from './Login';
import axios from 'axios';
import * as toastUtils from '../../utils/toastUtils';
import * as loggerUtils from '../../utils/logger';
import * as csrfUtils from '../../utils/csrfUtils';
import ErrorService from '../../services/ErrorService';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/toastUtils');
jest.mock('../../utils/logger');
jest.mock('../../utils/csrfUtils');
jest.mock('../../services/ErrorService');

let mockNavigate;
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  mockNavigate = jest.fn();
  loggerUtils.createLogger.mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });

  // Mock CSRF utilities
  csrfUtils.setupCSRFProtection = jest.fn().mockResolvedValue(undefined);
  csrfUtils.clearCSRFToken = jest.fn();

  // Mock ErrorService methods
  ErrorService.handleApiError = jest.fn().mockReturnValue('An error occurred');
  ErrorService.logError = jest.fn();
  ErrorService.formatError = jest.fn().mockReturnValue({});

  jest.clearAllMocks();
  localStorage.clear();
});

describe('Login Component', () => {
  test('renders login form', () => {
    render(<Login />);
    expect(screen.getByText(/login to dialoque/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    axios.post.mockResolvedValueOnce({
      data: { token: 'fake-token', id: '123', username: 'testuser' },
    });

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Test123!@#' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-token');
    });

    expect(toastUtils.showInfoToast).toHaveBeenCalledWith('Login successful');
  });

  test('displays error on login failure', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Invalid username or password' } },
    });

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'wronguser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    // Check that error toast was called with the error message
    await waitFor(() => {
      expect(toastUtils.showErrorToast).toHaveBeenCalled();
    });

    // Check that localStorage was cleared on error
    expect(localStorage.getItem('token')).toBeNull();
  });
});
