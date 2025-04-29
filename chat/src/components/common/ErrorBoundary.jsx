import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import ErrorService, { ErrorCategory, ErrorSeverity } from '../../services/ErrorService';
import './ErrorBoundary.css';

/**
 * Default fallback component for displaying errors
 * 
 * @param {Object} props - Properties passed from the ErrorBoundary
 * @param {Error} props.error - The error that was thrown
 * @param {Function} props.resetErrorBoundary - Function to reset the error boundary
 * @returns {JSX.Element} Fallback UI when an error occurs
 */
const DefaultFallback = ({ error, resetErrorBoundary }) => {
  // Get a user-friendly message for the error
  const errorMessage = ErrorService.getUserFriendlyMessage({
    category: ErrorCategory.UI,
    message: error.message
  });
  
  return (
    <div role="alert" className="error-boundary-fallback">
      <div className="error-icon" aria-hidden="true">⚠️</div>
      <h3>Something went wrong</h3>
      <p className="error-message">{errorMessage}</p>
      <button 
        onClick={resetErrorBoundary} 
        className="error-reset-btn"
        aria-label="Try again"
      >
        Try Again
      </button>
    </div>
  );
};

/**
 * Error boundary component that wraps children and catches errors
 * 
 * @param {Object} props - Component properties
 * @param {ReactNode} props.children - Child components to wrap
 * @param {string} props.context - Context name for error logging
 * @param {Function} props.fallbackRender - Custom fallback renderer (optional)
 * @param {Function} props.onError - Custom error handler (optional)
 * @param {Function} props.onReset - Function to call on reset (optional)
 * @param {Array<any>} props.resetKeys - Array of values that will cause boundary to reset when changed
 * @returns {JSX.Element} The error boundary component
 */
const ErrorBoundaryComponent = ({
  children,
  context = 'component',
  fallbackRender,
  onError,
  onReset,
  resetKeys = [],
  ...props
}) => {
  // Default error handler that logs errors via ErrorService
  const handleError = (error, info) => {
    // Log the error with our service
    ErrorService.logError(
      ErrorService.formatError(
        error,
        ErrorCategory.UI,
        ErrorSeverity.ERROR,
        context
      )
    );
    
    // Call custom onError if provided
    if (onError && typeof onError === 'function') {
      onError(error, info);
    }
  };

  return (
    <ReactErrorBoundary
      fallbackRender={fallbackRender || DefaultFallback}
      onError={handleError}
      onReset={onReset}
      resetKeys={resetKeys}
      {...props}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundaryComponent;
