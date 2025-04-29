import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

// Mock window.matchMedia
beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));
});

// Component to test theme context
const ThemeConsumer = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme-value">{theme}</div>
      <button data-testid="theme-toggle" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('provides default theme value', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Default theme should be dark
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('toggles theme when toggle function is called', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Default is dark
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');

    // Toggle to light
    await user.click(screen.getByTestId('theme-toggle'));
    expect(screen.getByTestId('theme-value').textContent).toBe('light');

    // Toggle back to dark
    await user.click(screen.getByTestId('theme-toggle'));
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('applies theme class to document body', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Check that body has dark-theme class
    expect(document.body.classList.contains('dark-theme')).toBe(true);
  });

  it('saves theme preference to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Toggle to light
    await user.click(screen.getByTestId('theme-toggle'));
    
    // Check localStorage
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('loads theme from localStorage', () => {
    // Set theme in localStorage
    localStorage.setItem('theme', 'light');
    
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    // Should load light theme from localStorage
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('respects system preference if no localStorage value', () => {
    // Mock system preference for dark mode
    window.matchMedia.mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));
    
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    // Should use system preference (dark)
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('updates meta theme-color tag', async () => {
    const user = userEvent.setup();
    
    // Add meta tag to document
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', 'theme-color');
    metaTag.setAttribute('content', '');
    document.head.appendChild(metaTag);
    
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    // Default dark theme should set dark color
    expect(metaTag.getAttribute('content')).toBe('#202225');
    
    // Toggle to light theme
    await user.click(screen.getByTestId('theme-toggle'));
    
    // Should update meta tag
    expect(metaTag.getAttribute('content')).toBe('#ffffff');
    
    // Clean up
    document.head.removeChild(metaTag);
  });
});
