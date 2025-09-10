# Firebase Authentication Setup Required

## Issue
The application is showing `auth/operation-not-allowed` error because Email/Password authentication is not enabled in the Firebase Console.

## To Fix This Issue:

### 1. Enable Email/Password Authentication
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `fibreflow-73daf`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password** provider
5. **Enable** the Email/Password option
6. Click **Save**

### 2. Create Test Users (Optional)
In the Firebase Console → Authentication → Users:
- Add test user: `test@fibrefield.com` / `password123`
- Add admin user: `admin@fibrefield.com` / `admin123`

### 3. Configure User Roles
After creating users, you'll need to add user documents to Firestore:

```javascript
// Add to Firestore collection 'users'
{
  uid: "user_uid_from_auth",
  email: "test@fibrefield.com",
  displayName: "Test User",
  role: "technician", // or "admin"
  contractorId: "contractor_001",
  permissions: ["capture", "view"],
  isActive: true,
  offlineCapable: true,
  syncPreferences: {
    autoSync: true,
    syncInterval: 5,
    wifiOnly: false
  }
}
```

## Current Status
- Firebase Config: ✅ Configured
- Authentication Provider: ❌ **Not Enabled** (Email/Password)
- Firestore: ✅ Available
- Storage: ✅ Available

## Quick Test Login
Once authentication is enabled, you can test with:
- Email: `test@fibrefield.com`
- Password: `password123`

The application will automatically create the user profile in Firestore on first login.