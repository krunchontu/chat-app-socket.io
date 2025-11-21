import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * 500 Server Error Page
 * Displayed when a critical error occurs in the application
 * SECURITY FIX (ISSUE-009): Added custom error pages for better UX
 *
 * @param {Object} props - Component props
 * @param {Error} props.error - The error object (optional)
 * @param {Function} props.resetError - Function to reset error state (optional)
 */
const ServerError = ({ error, resetError }) => {
  const navigate = useNavigate();

  const handleReset = () => {
    if (resetError) {
      resetError();
    }
    navigate('/', { replace: true });
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary px-4 transition-colors duration-300">
      <div className="text-center max-w-2xl">
        {/* Large 500 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-red-500 dark:text-red-400">
            500
          </h1>
        </div>

        {/* Error Message */}
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-dark-text-primary mb-4">
          Something Went Wrong
        </h2>

        <p className="text-gray-600 dark:text-dark-text-secondary mb-8 text-lg">
          We're sorry, but something unexpected happened. Our team has been notified and is working on it.
        </p>

        {/* Error Details (only show in development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-8 text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
              Error Details (Development Only):
            </h3>
            <pre className="text-xs text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap break-words">
              {error.toString()}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={handleReload}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
          >
            Reload Page
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-3 border-2 border-primary text-primary dark:text-dark-primary rounded-lg hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors duration-200 font-medium"
          >
            Go Home
          </button>
        </div>

        {/* Helpful Information */}
        <div className="mt-12 text-left bg-white dark:bg-dark-bg-secondary rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">
            What can you do?
          </h3>
          <ul className="space-y-3 text-gray-600 dark:text-dark-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-dark-primary mt-1">•</span>
              <span>Try reloading the page - sometimes this resolves temporary issues</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-dark-primary mt-1">•</span>
              <span>Check your internet connection and try again</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-dark-primary mt-1">•</span>
              <span>Clear your browser cache and cookies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary dark:text-dark-primary mt-1">•</span>
              <span>If the problem persists, contact support with error details</span>
            </li>
          </ul>
        </div>

        {/* Additional Links */}
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="hover:text-primary dark:hover:text-dark-primary transition-colors">
            Return to Homepage
          </Link>
          {' • '}
          <Link to="/login" className="hover:text-primary dark:hover:text-dark-primary transition-colors">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
