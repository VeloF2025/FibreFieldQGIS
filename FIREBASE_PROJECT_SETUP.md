# 🚀 Create New Firebase Project for FibreField

## Step 1: Create New Firebase Project

### 1.1 Go to Firebase Console
Visit [Firebase Console](https://console.firebase.google.com)

### 1.2 Create New Project
1. Click **"Create a project"**
2. **Project name**: `fibrefield-pwa` (or your preferred name)
3. **Project ID**: Will be auto-generated (e.g., `fibrefield-pwa-abc123`)
4. **Optional**: Enable Google Analytics
5. Click **"Create project"**

### 1.3 Enable Required Services
After project creation:

**Authentication:**
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Anonymous** (optional for offline testing)

**Firestore Database:**
1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll update rules later)
4. Select closest region

**Storage:**
1. Go to **Storage**
2. Click **"Get started"**
3. Accept default security rules
4. Use same region as Firestore

## Step 2: Get Firebase Configuration

### 2.1 Web App Setup
1. In Project Overview, click **"Add app"** (Web icon)
2. **App nickname**: `FibreField PWA`
3. Check **"Also set up Firebase Hosting"**
4. Register app

### 2.2 Copy Configuration
You'll get something like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fibrefield-pwa-abc123.firebaseapp.com",
  projectId: "fibrefield-pwa-abc123",
  storageBucket: "fibrefield-pwa-abc123.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:...",
  measurementId: "G-..."
};
```

## Step 3: Update Application Configuration

I'll update the Firebase configuration in your app with the new project details.

## Step 4: Firestore Security Rules

```javascript
// Firestore Rules for FibreField
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects collection - admin/manager access
    match /projects/{projectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        ('admin' in resource.data.roles[request.auth.uid] || 
         'manager' in resource.data.roles[request.auth.uid]);
    }
    
    // Pole captures - technicians can CRUD their own
    match /pole_captures/{captureId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.capturedBy == request.auth.uid || 
         hasRole(['admin', 'manager']));
    }
    
    // Home drop captures - technicians can CRUD their own
    match /home_drop_captures/{captureId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.capturedBy == request.auth.uid || 
         hasRole(['admin', 'manager']));
    }
    
    // Assignments - assigned technician can read/update
    match /assignments/{assignmentId} {
      allow read: if request.auth != null && 
        (resource.data.assignedTo == request.auth.uid || 
         hasRole(['admin', 'manager']));
      allow update: if request.auth != null && 
        resource.data.assignedTo == request.auth.uid;
      allow create: if request.auth != null && hasRole(['admin', 'manager']);
    }
    
    // Helper function
    function hasRole(roles) {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }
  }
}
```

## Step 5: Storage Security Rules

```javascript
// Storage Rules for FibreField
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Photo uploads - organized by user and capture type
    match /photos/{captureType}/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 10 * 1024 * 1024 && // 10MB max
        request.resource.contentType.matches('image/.*');
    }
    
    // Documents and exports - admin only
    match /documents/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        hasAdminRole();
    }
  }
}
```

## Step 6: Create Initial Collections

After setup, create these Firestore collections with sample documents:

### Users Collection
```javascript
// Collection: users
// Document ID: user_uid
{
  uid: "user_uid",
  email: "admin@fibrefield.com",
  displayName: "FibreField Admin",
  role: "admin",
  contractorId: "contractor_001",
  permissions: ["*"],
  isActive: true,
  offlineCapable: true,
  createdAt: new Date(),
  syncPreferences: {
    autoSync: true,
    syncInterval: 5,
    wifiOnly: false
  }
}
```

### Projects Collection
```javascript
// Collection: projects
// Document ID: auto-generated
{
  name: "Main Fiber Network",
  description: "Primary fiber optic infrastructure project",
  status: "active",
  contractorIds: ["contractor_001"],
  startDate: new Date(),
  location: {
    region: "North District",
    coordinates: {
      lat: 40.7128,
      lng: -74.0060
    }
  },
  roles: {
    "user_uid": ["admin"]
  },
  createdAt: new Date()
}
```

## Step 7: Test User Accounts

Create test accounts in Authentication:
1. **Admin**: `admin@fibrefield.com` / `admin123`
2. **Technician**: `tech@fibrefield.com` / `tech123`
3. **Manager**: `manager@fibrefield.com` / `manager123`

## Next Steps

After you create the Firebase project and get the configuration:
1. Share the Firebase config object
2. I'll update the app configuration
3. Deploy initial Firestore rules
4. Test the application with new project

Would you like me to proceed with creating the Firebase project configuration files once you have the new project details?