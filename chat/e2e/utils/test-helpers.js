/**
 * E2E Test Helper Utilities
 *
 * Common functions and utilities for E2E tests
 */

const { expect } = require('@playwright/test');

/**
 * Test user credentials
 */
const TEST_USERS = {
  user1: {
    username: 'e2e_user_1',
    email: 'e2e_user_1@test.com',
    password: 'Test123!@#',
  },
  user2: {
    username: 'e2e_user_2',
    email: 'e2e_user_2@test.com',
    password: 'Test456!@#',
  },
};

/**
 * Register a new user
 * @param {import('@playwright/test').Page} page
 * @param {Object} user - User credentials
 */
async function registerUser(page, user) {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  // Fill registration form
  await page.fill('input[name="username"], input[type="text"]', user.username);
  await page.fill('input[name="email"], input[type="email"]', user.email);
  await page.fill('input[name="password"], input[type="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to login or chat
  await page.waitForURL(/\/(login|chat)/, { timeout: 10000 });
}

/**
 * Login an existing user
 * @param {import('@playwright/test').Page} page
 * @param {Object} user - User credentials
 */
async function loginUser(page, user) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', user.email);
  await page.fill('input[name="password"], input[type="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to chat
  await page.waitForURL('/chat', { timeout: 10000 });
}

/**
 * Logout current user
 * @param {import('@playwright/test').Page} page
 */
async function logoutUser(page) {
  // Look for logout button (might be in a menu or header)
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")').first();

  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/(login|register|)$/, { timeout: 5000 });
  }
}

/**
 * Send a message in the chat
 * @param {import('@playwright/test').Page} page
 * @param {string} message - Message text
 */
async function sendMessage(page, message) {
  const messageInput = page.locator('input[type="text"], textarea').filter({ hasText: '' }).first();
  await messageInput.fill(message);

  // Find and click send button (look for common patterns)
  const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
  await sendButton.click();

  // Wait for message to appear in the chat
  await page.waitForSelector(`text=${message}`, { timeout: 5000 });
}

/**
 * Wait for a message to appear in chat
 * @param {import('@playwright/test').Page} page
 * @param {string} messageText - Text to wait for
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForMessage(page, messageText, timeout = 10000) {
  await page.waitForSelector(`text=${messageText}`, { timeout });
}

/**
 * Get the count of messages in chat
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function getMessageCount(page) {
  // This selector might need adjustment based on actual implementation
  const messages = page.locator('[data-testid="message"], .message, [role="article"]');
  return await messages.count();
}

/**
 * Clear browser storage and cookies
 * @param {import('@playwright/test').Page} page
 */
async function clearStorage(page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Wait for WebSocket connection to be established
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForSocketConnection(page, timeout = 5000) {
  // Wait for socket.io connection indicator or check localStorage/global state
  await page.waitForFunction(
    () => {
      // Check if socket is connected (adjust based on your implementation)
      return window.socketConnected === true ||
             localStorage.getItem('socketConnected') === 'true' ||
             document.querySelector('[data-socket-status="connected"]');
    },
    { timeout }
  ).catch(() => {
    // Socket connection might not have an explicit indicator, that's ok
    console.log('Socket connection indicator not found, proceeding anyway');
  });
}

/**
 * Take a screenshot with a meaningful name
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Screenshot name
 */
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Generate a unique username for testing
 * @param {string} prefix - Username prefix
 * @returns {string}
 */
function generateUniqueUsername(prefix = 'e2e_user') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a unique email for testing
 * @param {string} username - Username to base email on
 * @returns {string}
 */
function generateUniqueEmail(username) {
  return `${username}@e2etest.com`;
}

module.exports = {
  TEST_USERS,
  registerUser,
  loginUser,
  logoutUser,
  sendMessage,
  waitForMessage,
  getMessageCount,
  clearStorage,
  waitForSocketConnection,
  takeScreenshot,
  generateUniqueUsername,
  generateUniqueEmail,
};
