import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 404 Not Found Page
 * Displayed when user navigates to a route that doesn't exist
 * SECURITY FIX (ISSUE-009): Added custom error pages for better UX
 */
const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary px-4 transition-colors duration-300">
      <div className="text-center max-w-md">
        {/* Large 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary dark:text-dark-primary">
            404
          </h1>
        </div>

        {/* Error Message */}
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-dark-text-primary mb-4">
          Page Not Found
        </h2>

        <p className="text-gray-600 dark:text-dark-text-secondary mb-8 text-lg">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
          >
            Go Home
          </Link>

          <Link
            to="/chat"
            className="px-6 py-3 border-2 border-primary text-primary dark:text-dark-primary rounded-lg hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors duration-200 font-medium"
          >
            Go to Chat
          </Link>
        </div>

        {/* Helpful Suggestions */}
        <div className="mt-12 text-left bg-white dark:bg-dark-bg-secondary rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">
            Try these instead:
          </h3>
          <ul className="space-y-2 text-gray-600 dark:text-dark-text-secondary">
            <li>
              <Link to="/login" className="hover:text-primary dark:hover:text-dark-primary transition-colors">
                → Login to your account
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-primary dark:hover:text-dark-primary transition-colors">
                → Create a new account
              </Link>
            </li>
            <li>
              <Link to="/" className="hover:text-primary dark:hover:text-dark-primary transition-colors">
                → Return to homepage
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
