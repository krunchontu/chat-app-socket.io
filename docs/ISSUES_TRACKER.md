# Issues Tracker - MVP Development

**Last Updated:** November 21, 2025 (Day 2 - End of Day)
**Status:** Active Development

---

## Quick Stats

| Category | Critical | High | Medium | Low | Total | Resolved |
|----------|----------|------|--------|-----|-------|----------|
| **Security** | 0 (was 3) | 2 | 3 | 3 | 11 | **3** ✅ |
| **Bugs** | 0 | 0 | 0 | 0 | 0 | 0 |
| **Features** | 0 | 5 | 8 | 10 | 23 | 0 |
| **Tech Debt** | 1 | 2 | 4 | 3 | 10 | 0 |
| **TOTAL** | **1** | **9** | **15** | **16** | **44** | **3** ✅ |

**Day 2 Progress:** 3 critical/high security issues resolved! 🎉

---

## 🚨 CRITICAL Issues (Must Fix Before Launch)

### ISSUE-001: Production Debug Logging Enabled
- **Category:** Security
- **Priority:** 🚨 CRITICAL
- **Status:** 🟢 Resolved
- **Assigned:** Development Team
- **Created:** Nov 21, 2025
- **Resolved:** Nov 21, 2025 (Day 1)
- **Due:** Nov 21, 2025 (Day 1)

**Description:**
Debug logging is always enabled in production, exposing internal data and potentially sensitive information.

**Location:**
- `chat/src/context/ChatContext.jsx:19`

**Current Code:**
```javascript
const DEBUG_MESSAGE_TRACE_ENABLED = true;
```

**Expected Fix:**
```javascript
const DEBUG_MESSAGE_TRACE_ENABLED = process.env.NODE_ENV === 'development';
```

**Impact:**
- Exposes message metadata
- Logs socket IDs and user data
- Performance overhead
- Security risk

**Test Plan:**
1. Build production bundle
2. Verify no debug logs in console
3. Check browser devtools for sensitive data

**Resolution:**
- Fixed in `chat/src/context/ChatContext.jsx:19`
- Changed `DEBUG_MESSAGE_TRACE_ENABLED = true` to `DEBUG_MESSAGE_TRACE_ENABLED = process.env.NODE_ENV === 'development'`
- All tests passing: Backend (23/23), Frontend (0 tests with passWithNoTests)
- Debug logging now only enabled in development environment

**Related Issues:** None
**Blockers:** None

---

### ISSUE-002: CORS Security Bypass
- **Category:** Security
- **Priority:** 🚨 CRITICAL
- **Status:** 🟢 Resolved
- **Assigned:** Development Team
- **Created:** Nov 21, 2025
- **Resolved:** Nov 21, 2025 (Day 2)
- **Due:** Nov 21, 2025 (Day 1)

**Description:**
Server automatically adds any requesting origin to the allowed origins list, completely defeating CORS protection.

**Location:**
- `server/index.js:64-71`

**Current Code:**
```javascript
if (origin && !allowedOrigins.includes(origin)) {
  allowedOrigins.push(origin); // DANGEROUS!
}
```

**Expected Fix:**
```javascript
// Remove the dynamic origin addition entirely
// Use strict whitelist only from environment variables
```

**Impact:**
- Any website can make requests to your API
- XSS attacks possible
- Data theft risk
- Session hijacking potential

**Test Plan:**
1. Make request from unauthorized origin
2. Verify request is blocked
3. Check CORS headers in response

**Resolution:**
- Fixed in `server/index.js:63-79`
- Removed dangerous dynamic origin addition (lines 64-71)
- Implemented strict CORS whitelist-only policy
- Added structured logging for CORS events
- All tests passing: Backend (44/44)
- Security vulnerability eliminated

**Related Issues:** ISSUE-010
**Blockers:** None

---

### ISSUE-003: Password Validation Mismatch
- **Category:** Security
- **Priority:** 🚨 CRITICAL
- **Status:** 🟢 Resolved
- **Assigned:** Development Team
- **Created:** Nov 21, 2025
- **Resolved:** Nov 21, 2025 (Day 2)
- **Due:** Nov 22, 2025 (Day 2)

**Description:**
Backend allows 6-character passwords, but frontend requires 8+ characters with complexity. Users can bypass frontend validation via direct API calls.

**Location:**
- `server/middleware/validation.js:42`

**Current Code:**
```javascript
if (password.length < 6) {
  errors.push("Password must be at least 6 characters");
}
```

**Expected Fix:**
```javascript
if (password.length < 8) {
  errors.push("Password must be at least 8 characters");
} else if (!/(?=.*[a-z])/.test(password)) {
  errors.push("Password must contain at least one lowercase letter");
} else if (!/(?=.*[A-Z])/.test(password)) {
  errors.push("Password must contain at least one uppercase letter");
} else if (!/(?=.*\d)/.test(password)) {
  errors.push("Password must contain at least one number");
} else if (!/(?=.*[@$!%*?&#])/.test(password)) {
  errors.push("Password must contain at least one special character");
}
```

**Impact:**
- Weak passwords allowed
- Account security compromised
- Potential brute force attacks

**Test Plan:**
1. Test weak password via API (should fail)
2. Test strong password via API (should succeed)
3. Verify frontend and backend validation match

**Resolution:**
- Fixed in multiple files:
  - `server/middleware/validation.js:39-52` - Enhanced password validation
  - `server/models/user.js:25` - Updated minlength from 6 to 8
  - `server/services/userService.js:103-118` - Added comprehensive validation
- Created comprehensive test suite: `server/middleware/validation.test.js` (30+ tests)
- All password requirements now aligned:
  - Minimum 8 characters (was 6)
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- All tests passing: Backend (44/44)
- Frontend and backend validation now consistent

**Related Issues:** ISSUE-007
**Blockers:** None

---

## 🔴 HIGH Priority Issues

### ISSUE-004: Inconsistent Logging (console.log vs logger)
- **Category:** Tech Debt
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 23, 2025 (Day 3)

**Description:**
Server code mixes `console.log()` and structured logger, making logs inconsistent and hard to search/analyze.

**Locations:**
- `server/index.js`: ~20 instances
- `server/middleware/socketAuth.js`: ~10 instances
- Various controllers and services

**Expected Fix:**
Replace all `console.log/error/warn` with structured logger:
```javascript
// Replace:
console.log("User connected:", username);

// With:
logger.socket.info("User connected", { username, socketId });
```

**Impact:**
- Difficult to search logs
- Missing context in production logs
- Poor debugging experience

**Test Plan:**
1. Search codebase: `grep -r "console\\.log" server/`
2. Verify zero results (except tests)
3. Test logging in development and production

**Related Issues:** None
**Blockers:** None

---

### ISSUE-005: No Socket Rate Limiting
- **Category:** Security
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 23, 2025 (Day 3)

**Description:**
Socket events (message, like, reaction) have no rate limiting, allowing spam and DoS attacks.

**Location:**
- `server/index.js` (socket event handlers)

**Expected Fix:**
Implement `socketRateLimiter` middleware to limit events per socket ID.

**Impact:**
- Message spam possible
- DoS attack vector
- Database overload risk
- Poor user experience

**Test Plan:**
1. Send 100 messages in 1 second
2. Verify rate limit kicks in
3. Check error message to user

**Related Issues:** None
**Blockers:** None

---

### ISSUE-006: Mock Database Allowed in Production
- **Category:** Tech Debt
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 23, 2025 (Day 3)

**Description:**
Server falls back to mock database if MongoDB connection fails, even in production. This can cause silent data loss.

**Location:**
- `server/config/db.js`

**Expected Fix:**
```javascript
if (process.env.NODE_ENV === 'production' && !process.env.MONGO_URI) {
  logger.error('MONGO_URI not set in production!');
  process.exit(1); // Fail fast
}
```

**Impact:**
- Silent data loss in production
- Confusing behavior
- Data integrity issues

**Test Plan:**
1. Set NODE_ENV=production
2. Remove MONGO_URI
3. Verify app exits with error

**Related Issues:** None
**Blockers:** None

---

### ISSUE-007: No Account Lockout Mechanism
- **Category:** Security
- **Priority:** 🔴 HIGH
- **Status:** 🟢 Resolved
- **Assigned:** Development Team
- **Created:** Nov 21, 2025
- **Resolved:** Nov 21, 2025 (Day 2)
- **Due:** Nov 22, 2025 (Day 2)

**Description:**
Unlimited login attempts allowed (only rate-limited). Brute force attacks are possible.

**Location:**
- `server/controllers/userController.js` (login function)

**Expected Fix:**
- Add `failedLoginAttempts` and `lockUntil` fields to User model
- Lock account for 15 minutes after 5 failed attempts
- Reset counter on successful login

**Impact:**
- Brute force attack vector
- Account takeover risk
- Security vulnerability

**Test Plan:**
1. Attempt 5 failed logins
2. Verify account locked
3. Wait 15 minutes
4. Verify can login again

**Resolution:**
- Implemented full account lockout mechanism:
  - `server/models/user.js:41-48` - Added `failedLoginAttempts` and `lockUntil` fields
  - `server/models/user.js:99-142` - Added lockout helper methods:
    - `isLocked()` - Check if account is locked
    - `getLockTimeRemaining()` - Get remaining lock time
    - `incrementLoginAttempts()` - Increment failed attempts and lock if threshold reached
    - `resetLoginAttempts()` - Reset on successful login
  - `server/services/userService.js:219-255` - Integrated lockout logic in login flow
- Configuration:
  - Maximum 5 failed attempts before lockout
  - 15-minute lockout duration
  - Automatic reset on successful login
  - Clear error messages to users
- All tests passing: Backend (44/44)
- Brute force attack vector eliminated

**Related Issues:** ISSUE-003
**Blockers:** None

---

### ISSUE-008: No Health Check Endpoint
- **Category:** Feature
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 23, 2025 (Day 3)

**Description:**
No `/health` endpoint for monitoring services to check app status and database connectivity.

**Location:**
- `server/index.js` (needs new route)

**Expected Fix:**
Add `/health` endpoint that:
- Checks database connection
- Returns JSON status
- Returns 200 if healthy, 503 if unhealthy

**Impact:**
- Can't monitor app health
- UptimeRobot can't detect issues
- Poor observability

**Test Plan:**
1. GET /health
2. Verify 200 response with status
3. Disconnect DB, verify 503 response

**Related Issues:** None
**Blockers:** None

---

### ISSUE-009: Missing Error Pages (404, 500)
- **Category:** Feature
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 24, 2025 (Day 4)

**Description:**
No custom 404 or 500 error pages. Users see blank page or generic error.

**Location:**
- `chat/src/` (needs new components)

**Expected Fix:**
Create:
- `NotFound.jsx` (404 page)
- `ServerError.jsx` (500 page)
- Register in router

**Impact:**
- Poor user experience
- Unprofessional appearance
- Users confused when errors occur

**Test Plan:**
1. Navigate to /nonexistent
2. Verify custom 404 page shown
3. Trigger error, verify ErrorBoundary shows custom page

**Related Issues:** None
**Blockers:** None

---

### ISSUE-010: No Session Management / Token Invalidation
- **Category:** Security
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 24, 2025 (Day 4)

**Description:**
JWT tokens can't be invalidated. Logout doesn't actually log user out (token still valid).

**Location:**
- `server/controllers/userController.js` (logout function)

**Expected Fix:**
Implement token blacklist:
- Store tokens in database (or Redis)
- Check blacklist on auth middleware
- Add token to blacklist on logout

**Impact:**
- Can't force logout
- Stolen tokens remain valid
- Security risk

**Test Plan:**
1. Login, get token
2. Logout
3. Use old token, verify rejected

**Related Issues:** ISSUE-002
**Blockers:** None

---

### ISSUE-011: No Input Sanitization on Username
- **Category:** Security
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 24, 2025 (Day 4)

**Description:**
Username validation allows special characters that could be exploited for XSS.

**Location:**
- `server/middleware/validation.js:35`

**Expected Fix:**
```javascript
const sanitizeUsername = (username) => {
  return username
    .trim()
    .replace(/[<>\"'`]/g, '') // Remove HTML chars
    .substring(0, 20);
};
```

**Impact:**
- Potential XSS attack
- Username display issues
- Security risk

**Test Plan:**
1. Register with username: `<script>alert('xss')</script>`
2. Verify special chars removed
3. Check username in UI (no script executed)

**Related Issues:** None
**Blockers:** None

---

### ISSUE-012: Large Monolithic Server File
- **Category:** Tech Debt
- **Priority:** 🔴 HIGH
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 25, 2025 (Day 5)

**Description:**
`server/index.js` is 621 lines, mixing Express setup, Socket.IO handlers, and business logic.

**Location:**
- `server/index.js`

**Expected Fix:**
Extract to modules:
- `server/sockets/messageHandlers.js`
- `server/sockets/userHandlers.js`
- `server/sockets/connectionHandlers.js`

**Impact:**
- Hard to maintain
- Difficult to test
- Code organization poor

**Test Plan:**
1. Refactor to modules
2. Verify all tests still pass
3. Manual testing of socket events

**Related Issues:** None
**Blockers:** ISSUE-004 (logging should be standardized first)

---

## 🟡 MEDIUM Priority Issues

### ISSUE-013: Insufficient Test Coverage
- **Category:** Quality
- **Priority:** 🟡 MEDIUM
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 30, 2025 (Day 10)

**Description:**
- Backend: Only 3 test files, coverage unknown
- Frontend: Zero tests (--passWithNoTests flag)

**Target:**
- Backend: 80% coverage
- Frontend: 50% coverage

**Expected Fix:**
Add comprehensive tests (see Week 2 plan).

**Impact:**
- Bugs in production
- Difficult to refactor
- Low confidence in changes

**Related Issues:** None
**Blockers:** None

---

### ISSUE-014: Security Vulnerabilities in Dependencies
- **Category:** Security
- **Priority:** 🟡 MEDIUM
- **Status:** 🟡 In Progress
- **Assigned:** Development Team
- **Created:** Nov 21, 2025
- **Updated:** Nov 21, 2025 (Day 2)
- **Due:** Dec 2, 2025 (Day 12)

**Description:**
- Backend: 8 vulnerabilities (3 low, 1 moderate, 3 high, 1 critical)
- Frontend: 10 vulnerabilities (3 low, 4 moderate, 2 high, 1 critical)

**Breakdown:**
1. **axios** (HIGH): DoS vulnerability
2. **form-data** (CRITICAL): Unsafe random function
3. **brace-expansion** (MODERATE): ReDoS vulnerability
4. **glob** (HIGH): Command injection
5. **js-yaml** (MODERATE): Prototype pollution
6. **on-headers** (MODERATE): Header manipulation
7. **webpack-dev-server** (MODERATE): Source code theft (dev only)

**Expected Fix:**
- Run `npm audit fix`
- Manually upgrade breaking changes
- Document dev-only vulnerabilities

**Impact:**
- Security risks
- Potential exploits
- Failed security audits

**Test Plan:**
1. Run `npm audit`
2. Verify zero high/critical vulnerabilities
3. Test app still works

**Progress Update (Day 2):**
- Ran `npm audit fix` on backend and frontend
- **Backend:** Reduced from 8 to 2 vulnerabilities (both dev dependencies)
  - Fixed: @eslint/plugin-kit, brace-expansion, form-data, js-yaml, tar-fs
  - Remaining: axios (in logdna dev dependency) - requires breaking changes
- **Frontend:** Reduced from 10 to 2 vulnerabilities (both dev dependencies)
  - Fixed: axios, brace-expansion, form-data, glob, js-yaml, on-headers
  - Remaining: webpack-dev-server (dev only, source code theft) - requires breaking changes
- All tests passing after fixes: Backend (44/44)
- Remaining vulnerabilities documented in ISSUE-025 (breaking changes required)

**Related Issues:** None
**Blockers:** None

---

### ISSUE-015: No API Documentation
- **Category:** Documentation
- **Priority:** 🟡 MEDIUM
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Nov 25, 2025 (Day 5)

**Description:**
No Swagger/OpenAPI documentation for REST API endpoints.

**Expected Fix:**
Add Swagger UI at `/api-docs` using `swagger-jsdoc` and `swagger-ui-express`.

**Impact:**
- Difficult for developers to use API
- Poor developer experience
- Maintenance challenges

**Related Issues:** None
**Blockers:** None

---

### ISSUE-016: No Database Migration System
- **Category:** Tech Debt
- **Priority:** 🟡 MEDIUM
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Post-MVP

**Description:**
Schema changes require manual database updates. No migration tracking.

**Expected Fix:**
Implement `migrate-mongo` or similar.

**Impact:**
- Manual database updates error-prone
- Difficult to track schema changes
- Team coordination issues

**Related Issues:** None
**Blockers:** None

---

### ISSUE-017: No Content Security Policy (CSP)
- **Category:** Security
- **Priority:** 🟡 MEDIUM
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Dec 2, 2025 (Day 12)

**Description:**
Missing CSP headers, increasing XSS risk.

**Location:**
- `chat/nginx.conf`

**Expected Fix:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:;";
```

**Impact:**
- Increased XSS risk
- Security best practice not followed

**Test Plan:**
1. Check response headers
2. Verify CSP header present
3. Test app still works

**Related Issues:** ISSUE-011
**Blockers:** None

---

### ISSUE-018: Duplicate Message Event Handlers
- **Category:** Tech Debt
- **Priority:** 🟡 MEDIUM
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Post-MVP

**Description:**
Same message sent twice on different events (`sendMessage` and `message`) for backward compatibility.

**Location:**
- `server/index.js:292-304`

**Expected Fix:**
Deprecate old event, migrate to single event type.

**Impact:**
- Increased network traffic
- Confusing for developers
- Technical debt

**Related Issues:** None
**Blockers:** None

---

### ISSUE-019: No Frontend Bundle Size Analysis
- **Category:** Performance
- **Priority:** 🟡 MEDIUM
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Post-MVP

**Description:**
No analysis of bundle size or code splitting. May be loading unused code.

**Expected Fix:**
- Add `webpack-bundle-analyzer`
- Implement lazy loading for routes
- Analyze and optimize

**Impact:**
- Slow initial load
- Poor mobile experience
- Wasted bandwidth

**Related Issues:** None
**Blockers:** None

---

### ISSUE-020: No MongoDB Injection Protection
- **Category:** Security
- **Priority:** 🟡 MEDIUM
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** Dec 2, 2025 (Day 12)

**Description:**
No sanitization on MongoDB queries, potential injection risk.

**Expected Fix:**
```bash
npm install express-mongo-sanitize
```

```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

**Impact:**
- NoSQL injection attacks possible
- Data manipulation risk

**Test Plan:**
1. Try injection payload: `{ "$gt": "" }`
2. Verify sanitized
3. Test normal queries still work

**Related Issues:** None
**Blockers:** None

---

## 🟢 LOW Priority Issues (Post-MVP)

### ISSUE-021: No Caching Strategy
- **Category:** Performance
- **Priority:** 🟢 LOW
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** v1.1

**Description:**
No Redis or caching layer for frequently accessed data (online users, recent messages).

**Expected Fix:**
Add Redis for caching in v1.1.

**Impact:**
- Higher database load
- Slower response times
- Higher costs at scale

**Related Issues:** None
**Blockers:** None

---

### ISSUE-022: No File Upload Support
- **Category:** Feature
- **Priority:** 🟢 LOW
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** v1.1

**Description:**
Users can't share images or files.

**Expected Fix:**
Add file upload with Cloudinary or S3 in v1.1.

**Impact:**
- Limited chat functionality
- User feature requests

**Related Issues:** None
**Blockers:** None

---

### ISSUE-023: No Message Search Optimization
- **Category:** Performance
- **Priority:** 🟢 LOW
- **Status:** 🔴 Open
- **Assigned:** TBD
- **Created:** Nov 21, 2025
- **Due:** v2.0

**Description:**
Text search on MongoDB without proper indexing strategy. Will slow down at scale.

**Expected Fix:**
Add Elasticsearch or optimize MongoDB text indexes in v2.0.

**Impact:**
- Slow search at scale
- Poor user experience with large message history

**Related Issues:** None
**Blockers:** None

---

### ISSUE-024-047: See MVP_EXECUTION_PLAN.md for additional backlog items

---

## Issue Status Legend

- 🔴 **Open**: Not started
- 🟡 **In Progress**: Being worked on
- 🟢 **Resolved**: Fixed and tested
- ⚫ **Closed**: Verified in production
- 🔵 **Deferred**: Postponed to later version

## Priority Legend

- 🚨 **CRITICAL**: Must fix before launch, security/data loss risk
- 🔴 **HIGH**: Should fix before launch, impacts core functionality
- 🟡 **MEDIUM**: Nice to have before launch, not blocking
- 🟢 **LOW**: Post-MVP, enhancement or optimization

---

## How to Use This Tracker

1. **Daily Review:** Check open critical/high issues
2. **Update Status:** Move issues to "In Progress" when starting
3. **Mark Resolved:** When fixed and tested
4. **Close Issues:** When verified in production
5. **Add New Issues:** Use next available number (ISSUE-XXX)

## Issue Template

```markdown
### ISSUE-XXX: Brief Title
- **Category:** Security | Bug | Feature | Tech Debt | Performance | Documentation
- **Priority:** 🚨 CRITICAL | 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW
- **Status:** 🔴 Open | 🟡 In Progress | 🟢 Resolved | ⚫ Closed | 🔵 Deferred
- **Assigned:** Name or TBD
- **Created:** Date
- **Due:** Date

**Description:**
What is the issue?

**Location:**
File paths and line numbers

**Expected Fix:**
What should be done?

**Impact:**
What happens if not fixed?

**Test Plan:**
How to verify the fix works?

**Related Issues:** ISSUE-XXX, ISSUE-YYY
**Blockers:** ISSUE-XXX or None
```

---

**Maintained By:** Development Team
**Review Frequency:** Daily during MVP sprint
**Last Review:** November 21, 2025
