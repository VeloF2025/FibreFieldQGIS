# FibreField Development Mode Authentication

## Current Status: ✅ ENABLED

Authentication is currently **BYPASSED** for development testing. You will be automatically logged in as a dev user with full admin rights.

## How It Works

When dev mode is enabled:
- **No login required** - Automatic sign-in as dev user
- **Full admin access** - All permissions granted
- **Mock user profile** - Pre-configured test user
- **No Firebase Auth needed** - Works offline

## Dev User Details

- **Email**: dev@fibrefield.test
- **Display Name**: Dev User
- **Role**: Admin (full rights)
- **UID**: dev-user-001
- **Permissions**: All

## Toggle Dev Mode

To enable/disable dev mode authentication:

1. **Open**: `src/lib/auth-dev.ts`
2. **Find**: `export const DEV_MODE_ENABLED = true`
3. **Change to**:
   - `true` = Dev mode ON (no login required)
   - `false` = Dev mode OFF (real authentication)
4. **Restart** the dev server

## Current Settings

```typescript
// src/lib/auth-dev.ts
export const DEV_MODE_ENABLED = true;  // ← Change this
```

## When to Use Dev Mode

✅ **Use Dev Mode When:**
- Testing offline functionality
- Developing UI without auth setup
- Quick prototyping
- No Firebase account available
- Testing with mock data

❌ **Disable Dev Mode When:**
- Testing real authentication flow
- Verifying permissions/roles
- Testing with real user data
- Preparing for production
- Security testing

## Production Safety

Dev mode **ONLY** works when:
- `NODE_ENV === 'development'`
- `DEV_MODE_ENABLED === true`

It will **NEVER** activate in production builds.

## Quick Commands

```bash
# Check current mode
grep "DEV_MODE_ENABLED" src/lib/auth-dev.ts

# Enable dev mode
sed -i 's/DEV_MODE_ENABLED = false/DEV_MODE_ENABLED = true/' src/lib/auth-dev.ts

# Disable dev mode  
sed -i 's/DEV_MODE_ENABLED = true/DEV_MODE_ENABLED = false/' src/lib/auth-dev.ts
```

## Console Messages

When dev mode is active, you'll see:
```
🔧 Dev Mode: Auto-login enabled
🔧 Dev Mode: Mock sign in
🔧 Dev Mode: Mock sign out
```

## Troubleshooting

If dev mode isn't working:
1. Check `DEV_MODE_ENABLED` is `true`
2. Ensure you're in development mode
3. Clear browser cache/storage
4. Restart the dev server
5. Check console for dev mode messages

---

**Remember**: Always disable dev mode before deploying to production!