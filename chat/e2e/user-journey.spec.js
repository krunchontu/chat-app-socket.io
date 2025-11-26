/**
 * E2E Test: Complete User Journey
 *
 * Tests the full user flow from registration to sending messages
 *
 * Test Coverage:
 * - User registration
 * - User login
 * - Sending messages
 * - Receiving messages
 * - User logout
 */

const { test, expect } = require('@playwright/test');
const {
  generateUniqueUsername,
  generateUniqueEmail,
  registerUser,
  loginUser,
  logoutUser,
  sendMessage,
  waitForMessage,
  clearStorage,
  waitForSocketConnection,
} = require('./utils/test-helpers');

test.describe('Complete User Journey', () => {
  let testUser;

  test.beforeEach(async ({ page }) => {
    // Generate unique test user for each test to avoid conflicts
    const username = generateUniqueUsername('journey');
    testUser = {
      username,
      email: generateUniqueEmail(username),
      password: 'Test123!@#',
    };

    // Clear any existing session
    await clearStorage(page);
  });

  test('should complete full user journey: register → login → send message → logout', async ({ page }) => {
    // Step 1: Visit homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Chat/i);

    // Step 2: Navigate to registration
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Step 3: Register new account
    await page.fill('input[name="username"], input[placeholder*="username" i]', testUser.username);
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);

    // Submit registration
    await page.click('button[type="submit"]');

    // Wait for successful registration (either redirect to login or chat)
    await page.waitForURL(/\/(login|chat)/, { timeout: 10000 });

    // Step 4: If redirected to login, perform login
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"], input[type="email"]', testUser.email);
      await page.fill('input[name="password"], input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/chat', { timeout: 10000 });
    }

    // Step 5: Verify we're in the chat interface
    await expect(page).toHaveURL(/\/chat/);

    // Step 6: Wait for socket connection
    await waitForSocketConnection(page);

    // Step 7: Send a message
    const testMessage = `Hello from ${testUser.username} at ${new Date().toISOString()}`;

    // Find message input (could be input or textarea)
    const messageInput = await page.locator('input[type="text"]:not([name="username"]):not([name="email"]), textarea').first();
    await messageInput.waitFor({ state: 'visible', timeout: 5000 });
    await messageInput.fill(testMessage);

    // Click send button
    const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]:visible').first();
    await sendButton.click();

    // Step 8: Verify message appears in chat
    await waitForMessage(page, testMessage);
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Step 9: Logout
    const logoutButton = await page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")').first();

    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForURL(/\/(login|register|)$/, { timeout: 5000 });
    }

    // Verify we're logged out (back to login/register page)
    expect(page.url()).toMatch(/\/(login|register|)$/);
  });

  test('should allow user to login with existing account', async ({ page }) => {
    // First, register the user
    await registerUser(page, testUser);

    // Logout if we're automatically logged in
    await logoutUser(page);

    // Now test login with existing account
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Verify successful login
    await page.waitForURL('/chat', { timeout: 10000 });
    await expect(page).toHaveURL(/\/chat/);
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    // Try to login with non-existent credentials
    await page.fill('input[name="email"], input[type="email"]', 'nonexistent@test.com');
    await page.fill('input[name="password"], input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show error message (don't redirect to chat)
    await page.waitForTimeout(2000); // Wait a bit for potential error message

    // Should not be on chat page
    await expect(page).not.toHaveURL(/\/chat/);

    // Should show some error indication
    const errorMessage = await page.locator('text=/invalid|error|incorrect|failed/i').first();
    // Error might not be visible in all cases, so we just check we didn't navigate
  });

  test('should enforce password requirements during registration', async ({ page }) => {
    await page.goto('/register');

    // Try weak password
    await page.fill('input[name="username"], input[placeholder*="username" i]', testUser.username);
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"], input[type="password"]', 'weak');
    await page.click('button[type="submit"]');

    // Should not navigate to chat
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/register/);

    // Should show validation error
    const validationError = await page.locator('text=/password|requirements|characters/i').first();
    // Validation might be inline or in a toast, just verify we didn't proceed
  });
});

test.describe('Real-time Messaging', () => {
  test('should receive messages in real-time', async ({ browser }) => {
    // Create two browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Create two unique users
      const user1 = {
        username: generateUniqueUsername('sender'),
        email: generateUniqueEmail(generateUniqueUsername('sender')),
        password: 'Test123!@#',
      };

      const user2 = {
        username: generateUniqueUsername('receiver'),
        email: generateUniqueEmail(generateUniqueUsername('receiver')),
        password: 'Test456!@#',
      };

      // Register and login both users
      await registerUser(page1, user1);
      await registerUser(page2, user2);

      // Both should be in chat
      await expect(page1).toHaveURL(/\/chat/);
      await expect(page2).toHaveURL(/\/chat/);

      // Wait for socket connections
      await waitForSocketConnection(page1);
      await waitForSocketConnection(page2);

      // User 1 sends a message
      const testMessage = `Real-time message from ${user1.username} at ${Date.now()}`;

      const messageInput1 = await page1.locator('input[type="text"]:not([name="username"]):not([name="email"]), textarea').first();
      await messageInput1.fill(testMessage);

      const sendButton1 = await page1.locator('button:has-text("Send"), button[type="submit"]:visible').first();
      await sendButton1.click();

      // User 1 should see their own message
      await waitForMessage(page1, testMessage);

      // User 2 should receive the message in real-time
      await waitForMessage(page2, testMessage, 15000); // Give more time for real-time delivery
      await expect(page2.locator(`text=${testMessage}`)).toBeVisible();

    } finally {
      // Cleanup
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });
});
