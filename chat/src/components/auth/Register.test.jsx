/**
 * Register Component Tests
 *
 * Testing Register component with mock dependencies
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import Register from './Register';
import axios from 'axios';
import * as toastUtils from '../../utils/toastUtils';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/toastUtils');

let mockNavigate;
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  mockNavigate = jest.fn();
  jest.clearAllMocks();
  localStorage.clear();
});

describe('Register Component', () => {
  test('renders registration form', () => {
    render(<Register />);
    expect(screen.getByText(/register for dialoque/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  test('shows password strength indicator', async () => {
    render(<Register />);

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Test123!@#' },
    });

    await waitFor(() => {
      expect(screen.getByText(/password strength: strong/i)).toBeInTheDocument();
    });
  });

  test('validates password match', async () => {
    render(<Register />);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Test123!@#' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Different123!@#' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('handles successful registration', async () => {
    axios.post.mockResolvedValueOnce({
      data: { token: 'fake-token', id: '123', username: 'testuser' },
    });

    render(<Register />);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Test123!@#' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Test123!@#' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-token');
    });
  });
});
