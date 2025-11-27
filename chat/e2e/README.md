# E2E Tests - Playwright

**Created:** November 26, 2025 (Day 8)
**Status:** Active
**Coverage:** User journey, authentication, real-time messaging

---

## 📁 Test Structure

```
e2e/
├── README.md                    # This file
├── user-journey.spec.js         # Complete user flow tests
├── utils/
│   └── test-helpers.js          # Shared utilities and helpers
├── fixtures/
│   └── (test data files)
└── screenshots/
    └── (failure screenshots)
```

---

## 🚀 Running E2E Tests

### Prerequisites

**IMPORTANT:** E2E tests require both backend and frontend services to be running.

#### Option 1: Manual Setup (Recommended for Development)

1. **Start the backend server:**
   ```bash
   cd server
   npm start
   # Server should be running on http://localhost:4500
   ```

2. **Start the frontend (in a new terminal):**
   ```bash
   cd chat
   npm start
   # Frontend should be running on http://localhost:3000
   ```

3. **Run E2E tests (in a third terminal):**
   ```bash
   cd chat
   npm run test:e2e          # Run tests in headless mode
   npm run test:e2e:headed   # Run tests with browser visible
   npm run test:e2e:ui       # Run tests with Playwright UI
   npm run test:e2e:debug    # Run tests in debug mode
   ```

#### Option 2: Automated Setup (Playwright Auto-starts Frontend)

Playwright is configured to automatically start the frontend via the `webServer` option in `playwright.config.js`. However, **you still need to manually start the backend:**

1. **Start the backend:**
   ```bash
   cd server
   npm start
   ```

2. **Run E2E tests:**
   ```bash
   cd chat
   npm run test:e2e
   # Playwright will automatically start the frontend if not already running
   ```

---

## 📊 Test Scripts

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests in headless mode |
| `npm run test:e2e:headed` | Run tests with browser visible (good for debugging) |
| `npm run test:e2e:ui` | Run tests with interactive Playwright UI |
| `npm run test:e2e:debug` | Run tests in debug mode with step-by-step execution |
| `npm run test:e2e:report` | View the HTML test report |
| `npm run test:all` | Run unit tests + E2E tests (full suite) |

---

## 🧪 Current Test Coverage

### 1. Complete User Journey (`user-journey.spec.js`)

**Test:** Full user flow from registration to logout
- ✅ Visit homepage
- ✅ Navigate to registration
- ✅ Register new account
- ✅ Login (if redirected)
- ✅ Verify chat interface
- ✅ Send message
- ✅ Verify message appears
- ✅ Logout

**Test:** Login with existing account
- ✅ Register user
- ✅ Logout
- ✅ Login with same credentials
- ✅ Verify successful login

**Test:** Invalid login credentials
- ✅ Attempt login with non-existent user
- ✅ Verify error handling
- ✅ Ensure no navigation to chat

**Test:** Password requirements enforcement
- ✅ Attempt registration with weak password
- ✅ Verify validation error
- ✅ Ensure no account created

### 2. Real-time Messaging (`user-journey.spec.js`)

**Test:** Two users messaging in real-time
- ✅ Register two users
- ✅ Both users login
- ✅ User 1 sends message
- ✅ User 2 receives message in real-time
- ✅ Verify message visibility

---

## 🔧 Test Utilities

### Available Helpers (`utils/test-helpers.js`)

#### User Management
- `registerUser(page, user)` - Register a new user
- `loginUser(page, user)` - Login existing user
- `logoutUser(page)` - Logout current user

#### Messaging
- `sendMessage(page, message)` - Send a chat message
- `waitForMessage(page, messageText, timeout)` - Wait for message to appear
- `getMessageCount(page)` - Count messages in chat

#### Utilities
- `clearStorage(page)` - Clear browser storage and cookies
- `waitForSocketConnection(page, timeout)` - Wait for WebSocket connection
- `takeScreenshot(page, name)` - Take labeled screenshot
- `generateUniqueUsername(prefix)` - Generate unique test username
- `generateUniqueEmail(username)` - Generate unique test email

#### Test Users
```javascript
const { TEST_USERS } = require('./utils/test-helpers');

// Pre-defined test users
TEST_USERS.user1 // { username, email, password }
TEST_USERS.user2 // { username, email, password }
```

---

## 📝 Writing New Tests

### Example Test Structure

```javascript
const { test, expect } = require('@playwright/test');
const { registerUser, sendMessage } = require('./utils/test-helpers');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup code
  });

  test('should do something', async ({ page }) => {
    // Test code
    await page.goto('/');
    // ... assertions
  });
});
```

### Best Practices

1. **Use unique test data:** Generate unique usernames/emails to avoid conflicts
2. **Clean up after tests:** Use `beforeEach` to clear storage
3. **Wait for elements:** Use `waitFor` methods instead of hardcoded timeouts
4. **Take screenshots on failure:** Automatically enabled in config
5. **Test real-time features:** Use multiple browser contexts for multi-user tests

---

## 🐛 Debugging E2E Tests

### Option 1: Headed Mode
```bash
npm run test:e2e:headed
```
Watch tests execute in a real browser window.

### Option 2: Debug Mode
```bash
npm run test:e2e:debug
```
Step through tests line-by-line using Playwright Inspector.

### Option 3: Playwright UI
```bash
npm run test:e2e:ui
```
Interactive UI for running, debugging, and exploring tests.

### Option 4: Screenshots
Screenshots are automatically captured on test failures and saved to `e2e/screenshots/`.

### Option 5: View HTML Report
```bash
npm run test:e2e:report
```
Opens detailed HTML report with screenshots, videos, and traces.

---

## 🎯 CI/CD Integration

E2E tests are designed to run in CI environments. The configuration automatically:
- Runs in headless mode on CI
- Retries failed tests 2 times
- Captures screenshots and videos on failure
- Generates HTML and JSON reports

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    cd server && npm start &
    cd chat && npm run test:e2e
```

---

## 📊 Test Metrics (Day 8)

| Metric | Value |
|--------|-------|
| **Total Test Suites** | 2 |
| **Total Tests** | 5 |
| **Tests Passing** | 5 (100%) |
| **Coverage Areas** | Auth, Messaging, Real-time |
| **Browsers Tested** | Chromium |

---

## 🚧 Known Limitations

1. **Backend must be started manually** - Playwright cannot auto-start the backend server
2. **Database state** - Tests use live database, may need cleanup between runs
3. **Single browser** - Currently only testing on Chromium (can be expanded)
4. **Network-dependent** - Real Socket.IO connections required

---

## 🔮 Future Enhancements

- [ ] Add Firefox and WebKit browser testing
- [ ] Add mobile viewport testing (iOS, Android)
- [ ] Add visual regression testing
- [ ] Add accessibility testing (axe-core)
- [ ] Add performance testing (Core Web Vitals)
- [ ] Add more real-time scenarios (typing indicators, read receipts)
- [ ] Add file upload testing
- [ ] Add offline mode testing

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)

---

**Last Updated:** November 26, 2025 (Day 8)
**Maintained by:** Development Team
