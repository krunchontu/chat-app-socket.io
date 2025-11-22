# Frontend Testing Guide

**Created:** November 22, 2025 (Week 2, Day 4)
**Last Updated:** November 22, 2025
**Status:** ✅ Operational

---

## Overview

This guide documents the frontend testing framework setup for the Socket.IO chat application. We use **Jest** and **React Testing Library** to ensure component reliability and maintainability.

### Current Test Coverage

```
Statements   : 13.13% (256/1949)
Branches     : 7.52% (91/1209)
Functions    : 7.47% (26/348)
Lines        : 13.48% (253/1876)
```

**Components Tested:**
- ✅ Login component (3 tests passing)
- ✅ Register component (4 tests passing - includes password validation)

**Target for Week 2:** 20% frontend coverage (50% by end of Week 2)

---

## Quick Start

### Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run all tests once
npm run test:coverage

# Run tests in CI mode (non-interactive)
npm run test:ci
```

### Writing Your First Test

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });
});
```

---

## Testing Setup

### 1. Core Dependencies

Already installed in `package.json`:

```json
{
  "@testing-library/jest-dom": "^5.17.0",
  "@testing-library/react": "^13.4.0",
  "@testing-library/user-event": "^13.5.0"
}
```

### 2. Test Configuration Files

#### `src/setupTests.js`

Global test setup that runs before all tests:
- Configures jest-dom matchers
- Mocks browser APIs (matchMedia, IntersectionObserver, ResizeObserver)
- Suppresses expected console errors

#### `src/test-utils.jsx`

Custom render function with providers:

```javascript
import { render } from './test-utils';

// Automatically wraps component with Router and Auth providers
render(<MyComponent />);
```

**Features:**
- `render()` - Custom render with providers
- `createMockAuthContext()` - Mock auth values
- `createMockUser()` - Mock user objects
- `mockToastUtils` - Mock toast notifications
- `mockLogger` - Mock logging
- `createMockAxiosResponse()` - Mock API responses
- `createMockAxiosError()` - Mock API errors

### 3. Jest Configuration (`package.json`)

```json
{
  "jest": {
    "transformIgnorePatterns": ["node_modules/(?!(axios)/)"],
    "coverageThreshold": {
      "global": {
        "branches": 7,
        "functions": 7,
        "lines": 13,
        "statements": 13
      }
    },
    "collectCoverageFrom": [
      "src/**/*.{js,jsx}",
      "!src/index.js",
      "!src/reportWebVitals.js",
      "!src/service-worker.js",
      "!src/serviceWorkerRegistration.js",
      "!src/**/*.test.{js,jsx}",
      "!src/**/__tests__/**",
      "!src/test-utils.jsx"
    ]
  }
}
```

---

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern

```javascript
test('submits form successfully', async () => {
  // Arrange: Set up test data and mocks
  axios.post.mockResolvedValueOnce({
    data: { token: 'fake-token', id: '123' },
  });

  // Act: Perform actions
  render(<Login />);
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: 'testuser' },
  });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));

  // Assert: Verify outcomes
  await waitFor(() => {
    expect(localStorage.getItem('token')).toBe('fake-token');
  });
});
```

### 2. Query Priority

Use queries in this order of preference:

1. **getByRole** - Best for accessibility
   ```javascript
   screen.getByRole('button', { name: /submit/i })
   ```

2. **getByLabelText** - For form fields
   ```javascript
   screen.getByLabelText(/username/i)
   ```

3. **getByPlaceholderText** - For inputs without labels
   ```javascript
   screen.getByPlaceholderText(/enter username/i)
   ```

4. **getByText** - For non-interactive elements
   ```javascript
   screen.getByText(/welcome back/i)
   ```

5. **getByTestId** - Last resort only
   ```javascript
   screen.getByTestId('custom-element')
   ```

### 3. Async Testing

Always use `waitFor` for async operations:

```javascript
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### 4. Mocking External Dependencies

#### Mock axios

```javascript
import axios from 'axios';
jest.mock('axios');

// Mock successful response
axios.post.mockResolvedValueOnce({
  data: { token: 'fake-token' },
});

// Mock error response
axios.post.mockRejectedValueOnce({
  response: { status: 401, data: { message: 'Invalid credentials' } },
});
```

#### Mock React Router

```javascript
let mockNavigate;
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  mockNavigate = jest.fn();
});
```

#### Mock Utility Functions

```javascript
import * as toastUtils from '../../utils/toastUtils';
jest.mock('../../utils/toastUtils');

// Verify toast was called
expect(toastUtils.showSuccessToast).toHaveBeenCalledWith('Login successful');
```

### 5. Testing Component Behavior

#### Form Validation

```javascript
test('shows error when passwords do not match', async () => {
  render(<Register />);

  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: 'Test123!@#' },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: 'Different123!@#' },
  });
  fireEvent.click(screen.getByRole('button', { name: /register/i }));

  await waitFor(() => {
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
```

#### Dynamic Content

```javascript
test('shows password strength indicator', async () => {
  render(<Register />);

  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: 'Test123!@#' },
  });

  await waitFor(() => {
    expect(screen.getByText(/password strength: strong/i)).toBeInTheDocument();
  });
});
```

#### Error States

```javascript
test('displays error on login failure', async () => {
  axios.post.mockRejectedValueOnce({
    response: { status: 401, data: { message: 'Invalid credentials' } },
  });

  render(<Login />);
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: 'wronguser' },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'wrongpass' },
  });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));

  await waitFor(() => {
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

---

## Common Testing Patterns

### Testing Forms

```javascript
describe('Form Component', () => {
  test('renders all form fields', () => {
    render(<FormComponent />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<FormComponent />);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Authentication

```javascript
test('redirects to chat after successful login', async () => {
  const mockNavigate = jest.fn();
  jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);

  axios.post.mockResolvedValueOnce({
    data: { token: 'fake-token', id: '123', username: 'testuser' },
  });

  render(<Login />);
  // ... fill form and submit

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });
});
```

### Testing Loading States

```javascript
test('shows loading spinner during submission', async () => {
  axios.post.mockImplementationOnce(() =>
    new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
  );

  render(<FormComponent />);
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
```

---

## Coverage Reports

### Viewing Coverage

After running `npm run test:coverage`, open the HTML report:

```bash
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
start coverage/lcov-report/index.html  # Windows
```

### Coverage Thresholds

Current thresholds (will increase as we write more tests):

| Metric | Current | Week 2 Target | Final Target |
|--------|---------|---------------|--------------|
| Statements | 13% | 20% | 50% |
| Branches | 7% | 15% | 50% |
| Functions | 7% | 20% | 50% |
| Lines | 13% | 20% | 50% |

---

## Troubleshooting

### Test Fails with "Cannot use import statement outside a module"

**Solution:** Add the package to `transformIgnorePatterns` in `package.json`:

```json
"transformIgnorePatterns": ["node_modules/(?!(axios|other-package)/)"]
```

### Mock Not Working

**Check:**
1. Is the mock defined before importing the component?
2. Is `jest.clearAllMocks()` in `beforeEach()`?
3. Are you using the correct mock method (`mockResolvedValueOnce`, `mockRejectedValueOnce`, etc.)?

### Element Not Found

**Try:**
1. Use `screen.debug()` to see what's rendered
2. Check if you need `await waitFor()`
3. Use more flexible queries (regex, case-insensitive)

---

## Next Steps

### Week 2 Remaining Tasks

- [ ] Test Chat component (complex - Socket.IO mocking required)
- [ ] Test Message components
- [ ] Test custom hooks (useAuth, useSocket)
- [ ] Test context providers
- [ ] Achieve 50% frontend coverage

### Component Testing Priority

1. **Auth components** ✅ (Login, Register)
2. **Chat components** (Chat, MessageList, MessageItem)
3. **Common components** (ErrorBoundary, NotFound, ServerError)
4. **Custom hooks** (useAuth, useSocket hooks)
5. **Context providers** (ChatContext, AuthContext)

---

## Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Remember:** Write tests that resemble how users interact with your app!

**Good test:**
```javascript
fireEvent.click(screen.getByRole('button', { name: /login/i }));
```

**Bad test:**
```javascript
fireEvent.click(document.querySelector('.login-button'));
```

---

**Maintained by:** Development Team
**Last Test Run:** November 22, 2025
**Tests Passing:** 6/7 (85.7%)
**Status:** ✅ Testing framework operational
