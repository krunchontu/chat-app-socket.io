# Migration Guide - v3.0.0

**Release Date**: November 22, 2025
**Previous Version**: 2.0.1
**New Version**: 3.0.0 (Week 1 Security & Stability Release)

---

## Overview

Version 3.0.0 introduces breaking changes focused on security improvements. This guide will help you migrate from v2.x to v3.0.0.

**Migration Time Estimate**: 15-30 minutes
**Downtime Required**: Minimal (< 5 minutes for database migration)

---

## Breaking Changes Summary

| Change | Impact | Action Required |
|--------|--------|-----------------|
| Password validation strengthened | Existing users with weak passwords | User notification + password reset flow |
| CORS policy strict whitelist | API access from new origins | Update `CLIENT_ORIGIN` environment variable |

---

## 1. Password Validation Requirements (BREAKING)

### What Changed?

**Before (v2.x)**:
- Minimum 6 characters
- No complexity requirements

**After (v3.0.0)**:
- **Minimum 8 characters** (increased from 6)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&#)

### Impact

**New Users**: No impact - will use new validation from registration

**Existing Users**:
- Users with 6-7 character passwords can still login
- Users with weak passwords (no uppercase/lowercase/number/special) can still login
- **BUT**: They will be prompted to update their password on next login (recommended)

### Migration Steps

#### Option A: Mandatory Password Reset (Recommended for Production)

1. **Deploy v3.0.0** to production
2. **Create password reset notification**:
   ```javascript
   // Add to frontend after successful login
   if (user.passwordNeedsUpdate) {
     showNotification({
       type: 'warning',
       title: 'Password Update Required',
       message: 'For your security, please update your password to meet new requirements (8+ characters, uppercase, lowercase, number, special character)',
       action: 'Update Password',
       dismissable: false
     });
   }
   ```

3. **Backend check** (add to `userController.js` after login):
   ```javascript
   // Check if password meets new requirements
   const passwordMeetsNewRequirements = (password) => {
     return password.length >= 8 &&
            /(?=.*[a-z])/.test(password) &&
            /(?=.*[A-Z])/.test(password) &&
            /(?=.*\d)/.test(password) &&
            /(?=.*[@$!%*?&#])/.test(password);
   };

   // After successful login
   const needsUpdate = !passwordMeetsNewRequirements(plainTextPassword);
   res.json({
     ...response,
     passwordNeedsUpdate: needsUpdate
   });
   ```

4. **Email notification** (optional):
   ```javascript
   // Send email to users with weak passwords
   const usersWithWeakPasswords = await User.find({
     // Query logic to identify weak passwords
   });

   for (const user of usersWithWeakPasswords) {
     sendEmail({
       to: user.email,
       subject: 'Important: Password Security Update',
       body: `We've enhanced our security requirements. Please update your password to include:
         - At least 8 characters
         - Uppercase and lowercase letters
         - At least one number
         - At least one special character (@$!%*?&#)
       `
     });
   }
   ```

#### Option B: Graceful Migration (Recommended for Development)

1. **Deploy v3.0.0** without forcing password updates
2. **Monitor** users with weak passwords
3. **Gradually enforce** new requirements over 30-60 days
4. **Final enforcement** after grace period

### Validation Error Messages

Users attempting to register/login with weak passwords will see:
```
Password must be at least 8 characters
Password must contain at least one uppercase letter
Password must contain at least one lowercase letter
Password must contain at least one number
Password must contain at least one special character
```

### Testing Password Requirements

**Valid passwords**:
- `SecurePass123!`
- `MyPassword1@`
- `Test1234!@#$`

**Invalid passwords** (will be rejected):
- `weak` (too short, no uppercase, no number, no special)
- `password` (no uppercase, no number, no special)
- `PASSWORD123` (no lowercase, no special)
- `Pass123` (too short, no special)

---

## 2. CORS Policy Strict Whitelist (BREAKING)

### What Changed?

**Before (v2.x)**:
- CORS would automatically add any requesting origin to the allowed list (SECURITY VULNERABILITY!)

**After (v3.0.0)**:
- Strict whitelist-only CORS policy
- Origins must be explicitly configured
- Unauthorized origins are blocked and logged

### Impact

**Development**: No impact if using default `http://localhost:3000`

**Production**: API requests from non-whitelisted origins will be blocked with:
```
Error: Origin https://example.com not allowed by CORS
```

### Migration Steps

#### Step 1: Identify All Frontend Origins

List all domains that need API access:
- Production frontend: `https://your-app.com`
- Staging frontend: `https://staging.your-app.com`
- Mobile app: (if applicable)
- Admin panel: `https://admin.your-app.com`

#### Step 2: Update Environment Variables

**Local Development** (`.env`):
```bash
CLIENT_ORIGIN=http://localhost:3000,http://localhost:3001
```

**Staging** (Render/Heroku/etc.):
```bash
CLIENT_ORIGIN=https://staging-frontend.your-app.com,https://staging-admin.your-app.com
```

**Production** (Render/Heroku/etc.):
```bash
CLIENT_ORIGIN=https://your-app.com,https://admin.your-app.com
```

#### Step 3: Verify CORS Configuration

After deployment, check server logs for:
```
CORS: Allowed request from origin { origin: 'https://your-app.com' }
```

If you see blocked requests:
```
CORS: Blocked request from unauthorized origin { origin: 'https://unauthorized.com' }
```

Add the origin to `CLIENT_ORIGIN` if it's legitimate, or investigate if it's an attack.

#### Step 4: Test All Frontend Applications

1. Open each frontend URL
2. Verify API calls succeed
3. Check browser console for CORS errors
4. Add any missing origins to whitelist

### Wildcard Support (NOT RECOMMENDED)

While possible, using `*` defeats CORS security:
```bash
# DO NOT USE IN PRODUCTION
CLIENT_ORIGIN=*
```

Only use wildcards for development or testing.

---

## 3. Database Schema Updates (No Breaking Changes)

New fields added to `User` model (backward compatible):

```javascript
{
  failedLoginAttempts: { type: Number, default: 0 },  // New
  lockUntil: { type: Date }                           // New
}
```

**Action Required**: None - fields will be created automatically on first login attempt.

---

## 4. Environment Variables

### New Required Variables

None - all new features use existing environment variables.

### Recommended Variables

```bash
# API Documentation (optional - defaults shown)
NODE_ENV=production                    # production | development

# MongoDB (required - no changes)
MONGO_URI=mongodb+srv://...

# JWT (required - no changes)
JWT_SECRET=your-secret-key

# CORS (required in production)
CLIENT_ORIGIN=https://your-frontend.com

# Logging (optional)
LOGDNA_KEY=your-logdna-key

# APM (optional)
NEW_RELIC_LICENSE_KEY=your-key
```

---

## 5. Deployment Checklist

Before deploying v3.0.0 to production:

- [ ] **Backup database** (recommend MongoDB Atlas snapshot)
- [ ] **Update environment variables** (especially `CLIENT_ORIGIN`)
- [ ] **Test in staging** environment first
- [ ] **Notify users** about password requirements (if applicable)
- [ ] **Deploy during low-traffic period** (recommended)
- [ ] **Monitor logs** for CORS blocks after deployment
- [ ] **Test all frontend applications** post-deployment
- [ ] **Verify health endpoints** (`/health`, `/health/readiness`)
- [ ] **Check API documentation** at `/api-docs`
- [ ] **Review security logs** for any anomalies

---

## 6. Rollback Plan

If issues occur after deployment:

### Quick Rollback (< 5 minutes)

1. **Revert to v2.0.1**:
   ```bash
   git checkout v2.0.1
   # Redeploy
   ```

2. **Database**: No rollback needed (new fields are optional)

3. **Environment variables**: Restore previous `CLIENT_ORIGIN` if changed

### Gradual Rollback

1. **Disable password validation** temporarily:
   ```javascript
   // In server/middleware/validation.js
   // Comment out strict validation, revert to 6-char minimum
   ```

2. **Relax CORS policy** temporarily:
   ```javascript
   // Add temporary origin to whitelist
   CLIENT_ORIGIN=https://your-app.com,https://temporary-origin.com
   ```

3. **Monitor and fix** issues

4. **Re-enable** security features when ready

---

## 7. Common Issues & Solutions

### Issue 1: Users Can't Login After Upgrade

**Symptom**: Error "Password must be at least 8 characters"

**Cause**: User has 6-7 character password

**Solution**:
1. Use password reset flow
2. Email user with instructions
3. Or: Temporarily allow old passwords (see Rollback Plan)

### Issue 2: Frontend Can't Access API (CORS Error)

**Symptom**: Browser console shows `Origin not allowed by CORS`

**Cause**: Frontend origin not in whitelist

**Solution**:
```bash
# Add origin to CLIENT_ORIGIN
CLIENT_ORIGIN=https://existing.com,https://new-origin.com
```

### Issue 3: Health Checks Failing

**Symptom**: `/health` returns 503 Service Unavailable

**Cause**: Database connection issue

**Solution**:
1. Check `MONGO_URI` environment variable
2. Verify MongoDB Atlas IP whitelist
3. Check database credentials
4. Review server logs for connection errors

---

## 8. Testing Migration

### Pre-Migration Tests

```bash
# Test existing functionality
npm run test

# Audit for vulnerabilities
npm audit

# Verify environment variables
env | grep -E "MONGO_URI|JWT_SECRET|CLIENT_ORIGIN"
```

### Post-Migration Tests

```bash
# 1. Test authentication
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"OldPass123"}'

# 2. Test new password requirements
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","email":"new@test.com","password":"weak"}'
# Should fail

# 3. Test CORS
curl -X GET http://localhost:5000/api/messages \
  -H "Origin: https://unauthorized.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should fail with CORS error

# 4. Test health endpoint
curl http://localhost:5000/health
# Should return { status: "healthy", ... }

# 5. Test API docs
open http://localhost:5000/api-docs
# Should display Swagger UI
```

---

## 9. Support & Questions

**Documentation**:
- [CHANGELOG.md](../CHANGELOG.md) - Full list of changes
- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) - Security audit results
- [ISSUES_TRACKER.md](./ISSUES_TRACKER.md) - Detailed issue resolutions

**API Documentation**:
- Local: http://localhost:5000/api-docs
- Production: https://your-domain.com/api-docs

**Need Help?**:
- Create an issue on GitHub
- Review migration examples in `/examples` directory
- Check server logs for detailed error messages

---

## 10. Post-Migration Recommendations

After successful migration:

1. **Monitor Security Logs**:
   - Check for failed login attempts
   - Review CORS blocked requests
   - Monitor password reset requests

2. **Update Documentation**:
   - Inform team about new password requirements
   - Update onboarding docs
   - Communicate CORS changes to frontend teams

3. **Performance Monitoring**:
   - Monitor `/health` endpoint
   - Check response times in New Relic
   - Review error rates

4. **User Communication**:
   - Email users about security improvements
   - Publish changelog on website/blog
   - Provide support for password resets

---

**Migration Support**: For assistance with migration, please create an issue on GitHub or contact the development team.

**Last Updated**: November 22, 2025
