import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import ErrorService, { ErrorCategory, ErrorSeverity } from '../../services/ErrorService';
import ServerError from './ServerError'; // ISSUE-009: Use custom error page
import './ErrorBoundary.css';

/**
 * Default fallback component for displaying errors
 * UPDATED (ISSUE-009): Now uses ServerError component for better UX
 *
 * @param {Object} props - Properties passed from the ErrorBoundary
 * @param {Error} props.error - The error that was thrown
 * @param {Function} props.resetErrorBoundary - Function to reset the error boundary
 * @returns {JSX.Element} Fallback UI when an error occurs
 */
const DefaultFallback = ({ error, resetErrorBoundary }) => {
  // Use the new ServerError component for a better error experience
  return <ServerError error={error} resetError={resetErrorBoundary} />;
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
