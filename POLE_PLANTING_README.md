# 🌴 Pole Planting App

A mobile-first React PWA designed for field workers to capture fiber optic pole installation data efficiently and reliably.

## 🚀 Features

- **📱 Mobile-Optimized**: Designed specifically for field workers using smartphones
- **📍 One-Click GPS**: High-accuracy GPS location capture with error handling
- **📷 Smart Photo Capture**: 6 required photo types with automatic compression
- **💾 Offline-First**: Works offline with automatic sync when connection returns
- **🔄 Resume Functionality**: Continue incomplete pole captures from where you left off
- **⚡ Fast & Lightweight**: React-based, 50% smaller than Angular equivalent

## 📋 Required Data Capture

### Mandatory Fields:
1. **Project Selection** - Choose from available projects
2. **Pole Number** - Manual entry (e.g., LAW.P.B167)
3. **GPS Location** - One-click coordinate capture with accuracy display
4. **6 Required Photos**:
   - Before Installation
   - Front View
   - Side View
   - Installation Depth
   - Concrete Base
   - Ground Compaction

## 🛠️ Technology Stack

- **Frontend**: React 19 + Vite
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth (shared with FibreFlow)
- **Styling**: Mobile-first CSS with CSS Grid/Flexbox
- **PWA**: Service Worker for offline functionality

## 🏗️ Architecture

### Two-Stage Data Flow:
1. **Stage 1 (Field App)**: Simple, fast data capture → `pole-plantings-staging`
2. **Stage 2 (FibreFlow)**: Data validation & approval → `planned-poles`

### Database Structure:
```javascript
pole-plantings-staging: {
  projectId: string,
  poleNumber: string,
  gpsLocation: {
    latitude: number,
    longitude: number,
    accuracy: number,
    timestamp: Date
  },
  photos: {
    before: { blob, dataUrl, size, dimensions },
    front: { blob, dataUrl, size, dimensions },
    side: { blob, dataUrl, size, dimensions },
    depth: { blob, dataUrl, size, dimensions },
    concrete: { blob, dataUrl, size, dimensions },
    compaction: { blob, dataUrl, size, dimensions }
  },
  status: 'incomplete' | 'ready-for-sync',
  createdAt: Timestamp,
  expiresAt: Date // 7 days retention
}
```

## 📱 Usage

### For Field Workers:
1. **Select Project** from dropdown
2. **Enter Pole Number** manually
3. **Capture GPS** location (one tap)
4. **Take 6 Photos** using device camera
5. **Save Data** - automatically stored for sync

### Resuming Work:
- Navigate to "Incomplete Poles" tab
- Select pole to continue
- Complete missing data
- Save to finish

## 🔧 Setup & Development

### Prerequisites:
- Node.js 20+
- Firebase project access

### Installation:
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment:
- Uses same Firebase project as FibreFlow (`fibreflow-73daf`)
- No additional API keys required
- Automatic authentication integration

## 📊 Photo Processing

### Specifications:
- **Max Resolution**: 1920x1080 (maintains aspect ratio)
- **Compression**: 80% JPEG quality
- **Max File Size**: 500KB per photo
- **Total Upload**: ~3MB per pole (6 photos)
- **Processing**: Client-side Canvas API

### Mobile-Optimized:
- Works on budget Android/iOS devices
- Low memory footprint
- Fast processing
- Immediate preview

## 🔄 Sync Architecture

### Offline-First Design:
1. **Capture**: All data stored locally first
2. **Queue**: Automatic upload when online
3. **Retry**: Built-in retry logic for failed uploads
4. **Status**: Real-time sync status indicators

### Data Retention:
- **Incomplete Poles**: 7 days auto-cleanup
- **Completed Poles**: Moved to main database after approval
- **Photos**: Compressed storage in Firebase Storage

## 🚀 Deployment

### Firebase Hosting:
```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Subdomain: `planting.fibreflow.web.app`

## 🔐 Security & Access

- **Authentication**: Firebase Auth (same as FibreFlow)
- **Data Access**: Project-based permissions
- **Storage Rules**: Secure file upload/download
- **Network**: HTTPS only, secure API endpoints

## 🧪 Testing

### Manual Testing:
1. **GPS Accuracy**: Test in various locations
2. **Photo Quality**: Verify compression settings
3. **Offline Mode**: Test without internet connection
4. **Resume Flow**: Test incomplete pole continuation
5. **Cross-Device**: Test on different phone models

### Integration Testing:
- Data sync with FibreFlow approval workflow
- Photo storage and retrieval
- Project selection accuracy

## 📈 Performance

### Metrics:
- **Bundle Size**: ~40-60KB (vs 130-200KB Angular)
- **Load Time**: <2 seconds on 3G
- **Photo Processing**: <3 seconds per image
- **GPS Acquisition**: 5-30 seconds (varies by location)

## 🔧 Troubleshooting

### Common Issues:

**GPS Not Working:**
- Enable location permissions
- Try in open area with clear sky
- Wait up to 30 seconds for signal

**Photos Not Saving:**
- Check storage permissions
- Ensure sufficient device storage
- Try different photo sizes

**Sync Failures:**
- Check internet connection
- Verify Firebase project access
- Review browser console for errors

## 🛣️ Roadmap

### Phase 1 (Current):
- ✅ Basic pole capture
- ✅ Photo processing
- ✅ GPS integration
- ✅ Offline storage

### Phase 2 (Future):
- [ ] Push notifications
- [ ] Advanced photo validation
- [ ] Bulk photo upload
- [ ] Analytics dashboard
- [ ] Multi-user collaboration

## 📞 Support

For technical issues or feature requests, contact the FibreFlow development team or create issues in the main project repository.

---

**Built for VelocityFibre field operations** 🚀