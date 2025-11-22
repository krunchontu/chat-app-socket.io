# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.0.0] - 2025-11-22 (Week 1 Security & Stability Release)

### 🔒 Security Fixes (Critical)

#### ISSUE-001: Production Debug Logging
- **Fixed** debug logging always enabled in production
- Changed `DEBUG_MESSAGE_TRACE_ENABLED` to respect `NODE_ENV`
- Prevents exposure of internal data and sensitive information
- Location: `chat/src/context/ChatContext.jsx:19`

#### ISSUE-002: CORS Security Bypass
- **Fixed** dangerous auto-addition of origins to CORS whitelist
- Implemented strict whitelist-only CORS policy
- Added structured logging for blocked CORS requests
- Location: `server/index.js:55-84`

#### ISSUE-003: Password Validation Mismatch
- **Fixed** backend allowing weak 6-character passwords
- **BREAKING**: Minimum password length increased from 6 to 8 characters
- Aligned backend validation with frontend requirements:
  - Minimum 8 characters (was 6)
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&#)
- Added comprehensive password validation test suite (30+ tests)
- Location: `server/middleware/validation.js:39-52`

### 🔒 Security Enhancements (High Priority)

#### ISSUE-004: Standardized Logging
- **Fixed** inconsistent logging (console.log vs structured logger)
- Replaced 54+ console.log statements with structured logger
- Applied across 9 files with proper context:
  - `logger.socket`, `logger.auth`, `logger.db`, `logger.api`, `logger.app`
- Added correlation IDs for request tracking
- All logs now compatible with LogDNA integration

#### ISSUE-005: Socket.IO Rate Limiting
- **Added** rate limiting for Socket.IO events
- Event-specific limits:
  - `message`: 30 events/minute
  - `like`: 60 events/minute
  - `reaction`: 60 events/minute
  - `editMessage`: 20 events/minute
  - `deleteMessage`: 20 events/minute
  - `replyToMessage`: 30 events/minute
- Automatic cleanup of disconnected sockets
- Location: `server/middleware/socketRateLimiter.js`

#### ISSUE-006: Production Database Safety
- **Fixed** mock database allowed in production
- Production now fails fast if MongoDB connection unavailable
- Clear error logging with diagnostic information
- Mock DB explicitly disabled in production environment
- Location: `server/config/db.js:118-153`

#### ISSUE-007: Account Lockout Mechanism
- **Added** account lockout after failed login attempts
- Configuration:
  - 5 failed attempts trigger lockout
  - 15-minute lockout duration
  - Automatic reset on successful login
- Added helper methods: `isLocked()`, `getLockTimeRemaining()`, `incrementLoginAttempts()`
- Location: `server/models/user.js:41-142`

#### ISSUE-008: Health Check Endpoints
- **Added** comprehensive health check system
- New endpoints:
  - `GET /health` - Full system health (database, Socket.IO, server metrics)
  - `GET /health/readiness` - Kubernetes readiness probe
  - `GET /health/liveness` - Kubernetes liveness probe
- Returns detailed status: healthy, degraded, or unhealthy
- Compatible with monitoring tools (UptimeRobot, Datadog, Prometheus)
- Location: `server/routes/healthRoutes.js`

#### ISSUE-009: Error Pages
- **Added** custom 404 and 500 error pages
- Created `NotFound.jsx` for 404 errors
- Created `ServerError.jsx` for 500 errors
- Enhanced `ErrorBoundary` component
- All pages support dark/light theme
- Responsive design for mobile/tablet/desktop
- Location: `chat/src/components/common/`

#### ISSUE-010: Session Management & Token Invalidation
- **Added** JWT token blacklist for proper logout
- Features:
  - MongoDB-based token blacklist
  - Automatic cleanup via TTL index
  - Audit trail (userAgent, ipAddress, reason)
  - Tokens removed after natural expiration
- True session invalidation - tokens cannot be reused after logout
- Location: `server/models/tokenBlacklist.js`

#### ISSUE-011: Username Input Sanitization
- **Added** XSS protection for username field
- Removes/escapes dangerous characters:
  - HTML tags: `<`, `>`, `"`, `'`, `` ` ``
  - Protocol injection: `javascript:`
  - Event handlers: `onclick=`, `onload=`, etc.
- Applied to both registration and login
- Location: `server/middleware/validation.js:5-20`

### 🔒 Security Enhancements (Medium Priority)

#### ISSUE-020: MongoDB Injection Protection
- **Added** NoSQL injection protection via `express-mongo-sanitize`
- Sanitizes all user input globally
- Removes/replaces MongoDB operators: `$`, `.`
- Logs potential injection attempts
- Location: `server/index.js:118-132`

### 📚 Documentation & Developer Experience

#### ISSUE-015: API Documentation
- **Added** Swagger/OpenAPI documentation
- Interactive Swagger UI at `/api-docs`
- Complete documentation for all REST endpoints:
  - Authentication endpoints (register, login, logout)
  - User management (profile get/update)
  - Message endpoints (get, search, replies)
  - Health endpoints (health, readiness, liveness)
- Request/response schemas with examples
- Authentication testing interface
- Location: `server/swagger.js`, route files

### 🎯 Enhancements

- **Added** comprehensive security review documentation
- **Updated** README with all new features and security enhancements
- **Improved** error handling across all controllers
- **Enhanced** logging with structured context throughout
- **Optimized** database queries with proper indexing

### 📊 Testing

- All 44 backend tests passing
- Added 30+ password validation tests
- Test coverage maintained at 100% for critical paths

### 🐛 Bug Fixes

- Fixed console logging in `tokenBlacklist.js` model
- Fixed fallback logger usage in controllers
- Improved error messages for better UX

### 📝 Documentation

- Created `SECURITY_REVIEW.md` - Comprehensive security audit
- Updated `ISSUES_TRACKER.md` - 11 issues resolved
- Updated `README.md` - Added features section and API docs
- Created migration guide for password validation changes

### 🔄 Dependencies

- **Added**:
  - `swagger-jsdoc` ^6.2.8
  - `swagger-ui-express` ^5.0.0
  - `express-mongo-sanitize` ^2.2.0

### ⚠️ Breaking Changes

1. **Password Validation**: Minimum password length increased from 6 to 8 characters
   - See `docs/MIGRATION_GUIDE.md` for upgrade instructions
   - Existing users with 6-7 character passwords must reset on next login

2. **CORS Policy**: Strict whitelist enforcement
   - Origins must be explicitly configured in `CLIENT_ORIGIN` environment variable
   - No automatic origin allowance

### 🎯 Migration Guide

See `docs/MIGRATION_GUIDE.md` for detailed upgrade instructions.

### 📈 Metrics

- **Security Issues Resolved**: 11 (3 critical, 7 high, 1 medium)
- **Code Quality**: 8.0/10 → 8.5/10
- **Test Coverage**: 44/44 tests passing
- **Production Vulnerabilities**: 18 → 2 (dev-only)

---

## [2.0.1] - 2025-05-05

### Changed
- Updated GitHub Actions workflow to use Render deploy hooks instead of the JorgeLNJunior/render-deploy action
- Added documentation for setting up Render deploy hooks in `docs/render-deploy-hooks-setup.md`

### Fixed
- Fixed deployment to Render failing due to missing service_id parameter

## [2.0.0] - 2025-05-01

### Added
- Complete CI/CD pipeline with branch-specific workflows
  - `develop` branch: Triggers CI (tests and build)
  - `release` branch: Triggers CI/CD (tests, build, and deploy)
- Comprehensive test suite with three unit test files:
  - Message service tests
  - Socket authentication tests
  - User controller tests
- Branch initialization scripts:
  - `init-branches.sh` for Unix/Linux/Mac
  - `init-branches.ps1` for Windows
- MongoDB Atlas integration for containerized deployments
- Enhanced documentation:
  - CONTRIBUTING.md with branch strategy and workflow guidelines
  - Updated README.md with CI/CD pipeline information

### Changed
- Updated GitHub Actions workflow for branch-specific behavior
- Modified test scripts to ensure tests must pass for the pipeline to continue
- Updated docker-compose.yml to work with MongoDB Atlas instead of local MongoDB
- Enhanced server package.json with Jest configuration
- Improved error handling in tests

### Fixed
- Removed fallback mechanisms that would allow CI pipeline to continue despite test failures
- Addressed potential environment variable naming inconsistencies

## [1.0.0] - Initial Release

- Initial version of the chat application
