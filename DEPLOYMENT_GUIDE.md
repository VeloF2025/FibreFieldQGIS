# FibreField Production Deployment Guide

## Prerequisites

### 1. Firebase Setup
- **CRITICAL**: Access to Firebase project `fibreflow-73daf` is required
- Firebase CLI authenticated with correct account
- Firestore indexes deployed (see `firestore.indexes.json`)
- Firebase Auth enabled with email/password provider
- Firebase Storage configured with appropriate security rules

### 2. Vercel Account Setup
- Vercel account with deployment permissions
- Domain configuration (if using custom domain)
- Environment variables configured

## Deployment Steps

### Step 1: Environment Variables Setup

Copy `.env.production.example` to `.env.production` and update values:

```bash
cp .env.production.example .env.production
```

**Required Variables:**
- `NEXT_PUBLIC_FIREBASE_*`: Firebase client configuration
- `FIREBASE_PROJECT_ID`: Server-side Firebase project ID
- `FIREBASE_CLIENT_EMAIL`: Service account email
- `FIREBASE_PRIVATE_KEY`: Service account private key
- `NEXTAUTH_SECRET`: Secure random string for NextAuth

### Step 2: Firebase Indexes Deployment

**CRITICAL**: This step is currently blocked due to Firebase CLI access issues.

```bash
# When access is resolved:
firebase use fibreflow-73daf
firebase deploy --only firestore:indexes
```

### Step 3: Build Verification

Test the production build locally:

```bash
npm run build
npm run start
```

Verify:
- [ ] Build completes without errors
- [ ] All pages load correctly
- [ ] Authentication flow works
- [ ] API endpoints respond
- [ ] PWA functionality active

### Step 4: Vercel Deployment

#### Option A: Vercel CLI (Recommended)
```bash
npm install -g vercel
vercel login
vercel --prod
```

#### Option B: Git Integration
1. Connect Vercel to your Git repository
2. Configure environment variables in Vercel dashboard
3. Deploy via Git push

### Step 5: Environment Variables in Vercel

Add these environment variables in Vercel dashboard:

**Firebase Configuration:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Server Configuration:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXTAUTH_SECRET`

**Application Configuration:**
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXTAUTH_URL=https://your-domain.com`

### Step 6: Domain and SSL Setup

1. Configure custom domain in Vercel (optional)
2. Verify SSL certificate is active
3. Update Firebase Auth authorized domains
4. Update CORS settings if needed

### Step 7: Post-Deployment Verification

After deployment, verify:

**Authentication System:**
- [ ] Login page loads
- [ ] Registration works
- [ ] Password reset functions
- [ ] Protected routes redirect correctly
- [ ] RBAC permissions enforced

**Core Functionality:**
- [ ] Pole capture workflow
- [ ] Home drop capture workflow  
- [ ] Photo upload and validation
- [ ] GPS location services
- [ ] Offline functionality

**API Endpoints:**
- [ ] `/api/health` returns 200
- [ ] Authentication APIs respond
- [ ] Data capture APIs functional
- [ ] File upload APIs working

**PWA Features:**
- [ ] Service worker registered
- [ ] Manifest.json accessible
- [ ] Offline caching active
- [ ] Install prompt available

**Performance:**
- [ ] Page load times < 1.5s
- [ ] API response times < 200ms
- [ ] Lighthouse PWA score > 90
- [ ] Core Web Vitals passing

## Security Configuration

### Firebase Security Rules

Ensure Firestore security rules are configured:
- User authentication required for all operations
- Role-based access control (RBAC) enforced
- Data isolation by project/contractor

### HTTP Headers

The following security headers are configured in `vercel.json`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`  
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=*, microphone=*, geolocation=*`

## Monitoring and Maintenance

### Error Tracking
Set up error monitoring (recommended: Sentry):
```bash
npm install @sentry/nextjs
```

### Analytics
- Google Analytics configured via Firebase
- Performance monitoring enabled
- User behavior tracking

### Health Checks
Regular monitoring endpoints:
- `/api/health` - Application health
- `/api/auth/session` - Authentication status
- `/api/db/status` - Database connectivity

## Rollback Procedure

If deployment fails:
1. Revert to previous Vercel deployment
2. Check error logs in Vercel dashboard
3. Verify environment variables
4. Test Firebase connectivity
5. Re-run build process locally

## Common Issues and Solutions

### 1. Firebase Access Denied
- **Issue**: Cannot connect to Firebase project
- **Solution**: Verify project ID and service account permissions

### 2. Environment Variables Missing
- **Issue**: Configuration errors in production
- **Solution**: Double-check all required env vars in Vercel

### 3. Build Failures
- **Issue**: TypeScript or dependency errors
- **Solution**: Run `npm run type-check` and fix all errors

### 4. PWA Issues
- **Issue**: Service worker not registering
- **Solution**: Verify manifest.json and service worker paths

## Support

- Check deployment logs in Vercel dashboard
- Monitor Firebase console for errors
- Review browser console for client-side issues
- Test API endpoints with Postman/curl

---

**Last Updated**: 2025-09-09
**Status**: Ready for deployment (pending Firebase access resolution)