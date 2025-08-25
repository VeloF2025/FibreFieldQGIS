# FibreField - Pole Planting Field App

A Progressive Web App (PWA) for field workers to capture fiber optic pole installation data. Built with React and Firebase, optimized for offline use in challenging field conditions.

## 🚀 Live Demo

Visit: https://pole-planting-app.web.app/

## 📱 Features

- **Offline-First Design**: Works without internet connection, syncs when online
- **PWA Capabilities**: Install on any device like a native app
- **Photo Capture**: 6 required photos per pole with compression
- **GPS Tracking**: Automatic location capture with accuracy metrics
- **Queue Management**: Robust upload queue that survives app restarts
- **Simple UI**: Designed for gloved hands and bright sunlight
- **Auto-Save**: Never lose data with automatic draft saving

## 🛠️ Tech Stack

- **Frontend**: React 19.1.1 with Vite
- **Backend**: Firebase (Firestore + Storage)
- **PWA**: Service Worker for offline capabilities
- **Styling**: Pure CSS optimized for performance

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 20.x or higher
- npm 10.x or higher
- A Firebase project (free tier works)
- Git installed

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/VelocityFibre/FibreField.git
cd FibreField
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it (e.g., "fibrefield-yourname")
4. Disable Google Analytics (not needed)
5. Wait for project creation

#### Enable Required Services

In your Firebase Console:

1. **Authentication**
   - Go to Authentication → Get Started
   - Enable "Anonymous" provider (for now)

2. **Firestore Database**
   - Go to Firestore Database → Create Database
   - Start in "test mode" for development
   - Choose your region (closest to your users)

3. **Storage**
   - Go to Storage → Get Started
   - Start in "test mode" for development
   - Choose same region as Firestore

#### Get Firebase Configuration

1. In Firebase Console, click the gear icon → Project Settings
2. Scroll to "Your apps" → Click "</>" (Web)
3. Register app with nickname "FibreField"
4. Copy the configuration object

### 4. Configure the App

Create `src/firebaseConfig.js`:

```javascript
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 5. Update Firebase Security Rules

#### Firestore Rules

Go to Firestore → Rules and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write to pole-plantings-staging for development
    match /pole-plantings-staging/{document=**} {
      allow read, write: if true;
    }
    
    // Production rules (uncomment when ready)
    // match /pole-plantings-staging/{document=**} {
    //   allow read: if request.auth != null;
    //   allow create: if request.auth != null;
    //   allow update: if request.auth != null && request.auth.uid == resource.data.userId;
    // }
  }
}
```

#### Storage Rules

Go to Storage → Rules and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow uploads to pole-plantings folder
    match /pole-plantings/{allPaths=**} {
      allow read: if true;
      allow write: if true;
      
      // Production rules (uncomment when ready)
      // allow read: if request.auth != null;
      // allow write: if request.auth != null
      //   && request.resource.size < 10 * 1024 * 1024; // 10MB limit
    }
  }
}
```

### 6. Environment Variables (Optional)

For production deployments, create `.env.local`:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## 🚀 Development

### Run Development Server

```bash
npm run dev
```

Visit http://localhost:5173

### Build for Production

```bash
npm run build
```

Creates optimized build in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📦 Deployment

### Deploy to Firebase Hosting

#### First Time Setup

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize hosting:
```bash
firebase init hosting
```
- Use existing project or create new
- Public directory: `dist`
- Single-page app: Yes
- Don't overwrite index.html

#### Deploy

```bash
npm run build
firebase deploy --only hosting
```

Your app will be available at:
- `https://your-project.web.app`
- `https://your-project.firebaseapp.com`

### Deploy to Custom Domain

1. In Firebase Console → Hosting → Add custom domain
2. Follow DNS verification steps
3. Update SSL certificates automatically

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Visit the deployed app
2. Click install icon in address bar
3. Or go to Settings → Install App

### Mobile (Android)
1. Visit the deployed app
2. Tap "Add to Home Screen" prompt
3. Or use browser menu → Install App

### iOS
1. Open in Safari (required)
2. Tap Share button
3. Tap "Add to Home Screen"

## 🏗️ Project Structure

```
FibreField/
├── public/              # Static assets
│   ├── manifest.json   # PWA manifest
│   └── icons/          # App icons
├── src/
│   ├── components/     # React components
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   ├── App.jsx         # Main app component
│   ├── App.css         # Global styles
│   ├── firebaseConfig.js # Firebase configuration
│   └── main.jsx        # Entry point
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
├── firebase.json       # Firebase hosting config
└── package.json        # Dependencies
```

## 📊 Data Structure

### Firestore Collection: `pole-plantings-staging`

```javascript
{
  id: "auto-generated",
  projectId: "string",
  poleNumber: "string",
  capturedBy: "string",
  captureDate: "timestamp",
  location: {
    latitude: "number",
    longitude: "number",
    accuracy: "number"
  },
  photos: {
    before: "storage-url",
    front: "storage-url",
    side: "storage-url",
    depth: "storage-url",
    concrete: "storage-url",
    compaction: "storage-url"
  },
  notes: "string",
  status: "pending|approved|rejected",
  syncStatus: "pending|synced|error",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

## 🔧 Configuration Options

### Customize App Settings

Edit `src/config.js`:

```javascript
export const config = {
  // Photo settings
  photoQuality: 0.7,        // JPEG quality (0-1)
  maxPhotoSize: 1024,       // Max dimension in pixels
  
  // Sync settings
  syncInterval: 30000,      // Auto-sync interval (ms)
  maxRetries: 3,           // Upload retry attempts
  
  // UI settings
  autoSaveInterval: 5000,   // Draft save interval (ms)
  gpsTimeout: 10000,       // GPS acquisition timeout (ms)
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Photos not uploading**
   - Check Storage rules in Firebase
   - Verify internet connection
   - Check browser console for errors

2. **GPS not working**
   - Ensure location permission granted
   - Check if HTTPS is enabled (required for GPS)
   - Try on actual device (not localhost)

3. **App not installing**
   - Ensure HTTPS is enabled
   - Check manifest.json is valid
   - Clear browser cache

4. **Firebase permission denied**
   - Check Firestore rules
   - Verify authentication state
   - Check Firebase project configuration

### Debug Mode

Add `?debug=true` to URL for verbose logging:
```
https://your-app.web.app/?debug=true
```

## 🔐 Security Considerations

For production use:

1. **Enable Authentication**
   - Implement proper user authentication
   - Update Firebase rules to require auth

2. **Validate Data**
   - Add server-side validation rules
   - Implement data sanitization

3. **Limit File Uploads**
   - Set file size limits in Storage rules
   - Validate file types

4. **API Keys**
   - Use environment variables
   - Restrict API key usage in Firebase Console

## 🧪 Testing

### Manual Testing Checklist

- [ ] Offline data capture works
- [ ] Photos compress and save
- [ ] GPS coordinates captured
- [ ] Data syncs when online
- [ ] PWA installs correctly
- [ ] Queue survives app restart

### Test on Real Devices

Always test on actual devices:
- Low-end Android phones
- iPhones (various models)
- Different network conditions
- Bright sunlight (for UI visibility)

## 📈 Monitoring

### Firebase Console

Monitor your app:
- **Firestore**: Database usage and queries
- **Storage**: Bandwidth and storage usage
- **Hosting**: Traffic and performance
- **Usage**: Stay within free tier limits

### Free Tier Limits (as of 2024)

- Firestore: 50K reads/day, 20K writes/day
- Storage: 5GB storage, 1GB/day download
- Hosting: 10GB hosting, 360MB/day transfer

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is proprietary to VelocityFibre. All rights reserved.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@velocityfibre.com

## 🎯 Roadmap

- [ ] Offline map integration
- [ ] Barcode scanning for pole IDs
- [ ] Voice notes support
- [ ] Multi-language support
- [ ] Advanced queue management UI
- [ ] Bulk operations support

---

Built with ❤️ by VelocityFibre Team
