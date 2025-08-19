# Product Requirements Prompt (PRP) - FibreField Implementation

## Meta Information
- **PRD Source**: `PRD_FibreField.md`
- **Implementation Phase**: MVP (Phase 1)
- **Timeline**: 3 months
- **Technology Stack**: React/Next.js + Firebase
- **Integration**: FibreFlow API v1

---

## Goal
Implement FibreField as a Progressive Web App (PWA) for fiber optic field technicians, providing offline-first data collection with seamless FibreFlow integration.

## Why
- **Business Value**: Reduce data entry errors by 95%, accelerate field operations by 40%
- **User Impact**: Field technicians can work efficiently offline, sync automatically
- **Strategic Alignment**: Extends FibreFlow's reach to field operations without separate native apps

## What
A mobile-first PWA that enables field technicians to:
- Capture pole installations with photos and GPS verification
- Document splice closures and drop cables
- Work completely offline with automatic sync
- Access FibreFlow project and contractor data
- Submit field data back to FibreFlow in real-time

### Success Criteria
- [ ] PWA achieves Lighthouse score > 90
- [ ] Offline functionality for 100% of core features
- [ ] Photo capture and compression working on mobile browsers
- [ ] Bi-directional sync with FibreFlow operational
- [ ] Field data persists through app closure/restart
- [ ] Queue management handles 1000+ offline operations
- [ ] Initial load time < 3 seconds on 3G
- [ ] 95% data accuracy in field submissions

## PRD Reference
- **Source Sections**: 3.1-3.5 (Core Features), 4.2 (Tech Stack), 6.1-6.3 (API Integration)
- **Requirements**: 
  - REQ-001: Master data sync from FibreFlow
  - REQ-002: Offline-first architecture
  - REQ-003: Pole installation management
  - REQ-004: Photo capture with compression
  - REQ-005: Queue-based synchronization
- **Dependencies**: FibreFlow API endpoints, Firebase project setup

## All Needed Context

### Documentation & References
```yaml
- url: https://nextjs.org/docs/app
  why: Next.js 14 App Router documentation for PWA setup
  
- url: https://firebase.google.com/docs/firestore/manage-data/enable-offline
  why: Firestore offline persistence configuration
  
- file: REACT_IMPLEMENTATION_GUIDE.md
  why: Complete React/Next.js setup and code examples
  
- file: ../src/app/features/pole-tracker/services/offline-queue.service.ts
  why: Reference implementation from FibreFlow
  
- doc: PRD_FibreField.md#section-6
  why: API specifications and data models
```

### Current Implementation State
```bash
FibreField/
├── PRD_FibreField.md              # Product requirements
├── TECH_STACK_RECOMMENDATION.md   # Technology decisions
├── REACT_IMPLEMENTATION_GUIDE.md  # Implementation patterns
└── PRP_FibreField_Implementation.md # This file
```

### Technical Specifications (from PRD)
```typescript
// Core Data Models
interface PoleInstallation {
  id: string;
  projectId: string;           // Links to FibreFlow
  plannedPoleId: string;       // From FibreFlow
  contractorId: string;        // From FibreFlow
  location: GeoPoint;
  photos: Photo[];
  installationDate: Date;
  technicianId: string;        // FibreFlow staff ID
  status: InstallationStatus;
  metadata: Record<string, any>;
}

interface Photo {
  type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
  url?: string;
  localPath: string;
  timestamp: Date;
  compressed: boolean;
  uploaded: boolean;
}

// API Endpoints Required
GET  /api/v1/projects          // Fetch active projects
GET  /api/v1/contractors       // Fetch contractors
GET  /api/v1/poles/planned     // Get planned poles
POST /api/v1/poles/installations  // Submit installations
POST /api/v1/sync/batch        // Batch sync operations
```

## Implementation Blueprint

### Pre-Implementation Checklist
- [ ] Node.js 20+ installed
- [ ] Firebase project created (fibrefield)
- [ ] Firebase authentication configured
- [ ] Firestore database initialized
- [ ] Firebase Storage bucket ready
- [ ] Environment variables configured
- [ ] Git repository initialized

### Phase 1: Project Setup (Week 1)

#### Task 1.1: Initialize Next.js PWA
```bash
# Create and configure project
npx create-next-app@latest fibrefield --typescript --tailwind --app --src-dir
cd fibrefield

# Install core dependencies
npm install firebase react-query @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
npm install next-pwa workbox-window
npm install dexie compressor.js
npm install @capacitor/core @capacitor/camera @capacitor/geolocation

# VALIDATION: npm run dev should start without errors
```

#### Task 1.2: Firebase Configuration
```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Configuration from Firebase Console
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch(console.error);
}

// VALIDATION: Firebase should initialize without errors
```

#### Task 1.3: PWA Setup
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com']
  }
});

// VALIDATION: Lighthouse PWA audit should pass
```

### Phase 2: Core Infrastructure (Week 2-3)

#### Task 2.1: Offline Database Layer
```typescript
// src/lib/db.ts
import Dexie from 'dexie';

class FibreFieldDB extends Dexie {
  queue!: Table<QueueItem>;
  photos!: Table<CachedPhoto>;
  projects!: Table<Project>;
  contractors!: Table<Contractor>;
  
  constructor() {
    super('FibreFieldDB');
    this.version(1).stores({
      queue: '++id, type, synced, timestamp',
      photos: '++id, entityId, uploaded',
      projects: 'id, code, syncedAt',
      contractors: 'id, name, syncedAt'
    });
  }
}

export const localDB = new FibreFieldDB();

// VALIDATION: IndexedDB should show database in DevTools
```

#### Task 2.2: State Management
```typescript
// src/store/app.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  queueCount: number;
  currentProject: Project | null;
  user: User | null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // State implementation
    }),
    { name: 'fibrefield-storage' }
  )
);

// VALIDATION: State should persist across page refreshes
```

#### Task 2.3: Authentication Service
```typescript
// src/services/auth.service.ts
class AuthService {
  async loginWithFibreFlow(email: string, password: string) {
    // Authenticate with FibreFlow API
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    // Set Firebase custom token
    const { customToken } = await response.json();
    await signInWithCustomToken(auth, customToken);
    
    // Store user in state
    useAppStore.setState({ user });
  }
}

// VALIDATION: User should authenticate and persist session
```

### Phase 3: Master Data Sync (Week 4)

#### Task 3.1: FibreFlow Data Service
```typescript
// src/services/fibreflow.service.ts
class FibreFlowService {
  async syncMasterData() {
    // Fetch projects
    const projects = await this.fetchProjects();
    await localDB.projects.bulkPut(projects);
    
    // Fetch contractors
    const contractors = await this.fetchContractors();
    await localDB.contractors.bulkPut(contractors);
    
    // Update sync timestamp
    localStorage.setItem('lastSync', new Date().toISOString());
  }
  
  private async fetchProjects() {
    const response = await fetch('/api/v1/projects', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.json();
  }
}

// VALIDATION: Master data should be available offline
```

#### Task 3.2: Sync Scheduler
```typescript
// src/hooks/useSync.ts
export function useSync() {
  useEffect(() => {
    // Initial sync
    syncService.syncMasterData();
    
    // Schedule periodic sync
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncService.syncMasterData();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, []);
}

// VALIDATION: Data should update when online
```

### Phase 4: Pole Capture Feature (Week 5-6)

#### Task 4.1: Photo Capture Component
```tsx
// src/components/PhotoCapture.tsx
export function PhotoCapture({ type, onCapture }) {
  const capturePhoto = async () => {
    const image = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.DataUrl
    });
    
    // Compress image
    const compressed = await compressImage(image.dataUrl);
    
    // Store locally
    const photoId = await localDB.photos.add({
      localPath: compressed,
      type,
      uploaded: false
    });
    
    onCapture(photoId);
  };
  
  return (
    <Button onClick={capturePhoto}>
      Capture {type} Photo
    </Button>
  );
}

// VALIDATION: Photos should capture and compress
```

#### Task 4.2: Pole Installation Form
```tsx
// src/app/(app)/poles/capture/page.tsx
export default function PoleCapturePage() {
  const form = useForm<PoleInstallation>();
  
  const onSubmit = async (data: PoleInstallation) => {
    // Add to queue
    await offlineService.addToQueue({
      type: 'pole',
      action: 'create',
      data,
      photos: capturedPhotos
    });
    
    // Navigate to success
    router.push('/poles/success');
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}

// VALIDATION: Form should save offline and queue for sync
```

### Phase 5: Offline Queue Management (Week 7-8)

#### Task 5.1: Queue Service
```typescript
// src/services/offline.service.ts
class OfflineService {
  async processQueue() {
    const items = await localDB.queue
      .where('synced').equals(0)
      .toArray();
    
    for (const item of items) {
      try {
        // Upload photos first
        const photoUrls = await this.uploadPhotos(item.photos);
        
        // Sync to FibreFlow
        await this.syncToFibreFlow({
          ...item.data,
          photos: photoUrls
        });
        
        // Mark as synced
        await localDB.queue.update(item.id, { synced: true });
      } catch (error) {
        // Retry logic
        await this.handleSyncError(item, error);
      }
    }
  }
}

// VALIDATION: Queue should process when online
```

#### Task 5.2: Background Sync
```javascript
// public/sw.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      processOfflineQueue()
    );
  }
});

// VALIDATION: Background sync should trigger
```

### Phase 6: UI/UX Implementation (Week 9-10)

#### Task 6.1: App Shell
```tsx
// src/app/(app)/layout.tsx
export default function AppLayout({ children }) {
  const { isOnline, syncStatus, queueCount } = useAppStore();
  
  return (
    <div className="min-h-screen">
      <StatusBar 
        isOnline={isOnline}
        syncStatus={syncStatus}
        queueCount={queueCount}
      />
      <Navigation />
      <main>{children}</main>
    </div>
  );
}

// VALIDATION: UI should be responsive and touch-friendly
```

#### Task 6.2: Dashboard
```tsx
// src/app/(app)/dashboard/page.tsx
export default function Dashboard() {
  const stats = useStats();
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <StatCard title="Poles Today" value={stats.polesToday} />
      <StatCard title="Pending Sync" value={stats.pendingSync} />
      <QuickActions />
      <RecentActivity />
    </div>
  );
}

// VALIDATION: Dashboard should load quickly
```

### Phase 7: Testing & Optimization (Week 11)

#### Task 7.1: Unit Testing
```typescript
// __tests__/offline.test.ts
describe('Offline Queue', () => {
  it('should queue items when offline', async () => {
    // Set offline
    window.dispatchEvent(new Event('offline'));
    
    // Add item
    await offlineService.addToQueue(mockItem);
    
    // Check queue
    const items = await localDB.queue.toArray();
    expect(items).toHaveLength(1);
  });
});

// VALIDATION: All tests should pass
```

#### Task 7.2: Performance Optimization
```typescript
// Implement lazy loading
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />
});

// Image optimization
<Image 
  src={photo} 
  alt="Pole"
  width={800}
  height={600}
  loading="lazy"
/>

// VALIDATION: Lighthouse score > 90
```

### Phase 8: Deployment (Week 12)

#### Task 8.1: Firebase Deployment
```bash
# Build production
npm run build

# Deploy to Firebase
firebase init hosting
firebase deploy --only hosting

# VALIDATION: App accessible at https://fibrefield.web.app
```

#### Task 8.2: Monitoring Setup
```typescript
// Firebase Performance Monitoring
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);

// Error tracking
window.addEventListener('error', (event) => {
  logError(event.error);
});

// VALIDATION: Metrics visible in Firebase Console
```

## Validation Loop

### Level 1: Code Quality
```bash
npm run lint        # ESLint + Prettier
npm run type-check  # TypeScript validation

# Expected: No errors or warnings
```

### Level 2: Unit Tests
```bash
npm run test        # Vitest unit tests
npm run test:coverage  # Coverage > 80%

# Expected: All tests passing
```

### Level 3: Integration Tests
```bash
npm run test:e2e    # Playwright tests

# Expected: Critical paths working
```

### Level 4: PWA Validation
```bash
# Lighthouse audit
npx lighthouse https://localhost:3000 --view

# Expected: PWA score > 90
```

### Level 5: Field Testing
- [ ] Test on real Android device
- [ ] Test on real iOS device
- [ ] Test offline/online transitions
- [ ] Test with poor connectivity
- [ ] Test photo capture in sunlight

## Integration Points

### FibreFlow API
```yaml
Authentication:
  - endpoint: POST /api/v1/auth/login
  - method: Custom token exchange
  
Master Data:
  - projects: GET /api/v1/projects
  - contractors: GET /api/v1/contractors
  - staff: GET /api/v1/staff
  
Field Data:
  - poles: POST /api/v1/poles/installations
  - sync: POST /api/v1/sync/batch
```

### Firebase Services
```yaml
Firestore:
  - collections: queue, photos, cache
  - offline: enableIndexedDbPersistence
  
Storage:
  - photos: /installations/{projectId}/{poleId}/
  - compression: client-side before upload
  
Authentication:
  - method: Custom tokens from FibreFlow
  - claims: role, permissions, contractorId
```

## Monitoring & Alerts

### Key Metrics
```yaml
Performance:
  - Initial Load Time: < 3s
  - Time to Interactive: < 3.5s
  - Offline Queue Size: < 1000 items
  
Reliability:
  - Sync Success Rate: > 99%
  - Photo Upload Success: > 95%
  - Auth Success Rate: > 99.9%
  
Usage:
  - Daily Active Users
  - Poles Captured per Day
  - Average Session Duration
```

### Alert Thresholds
```yaml
Critical:
  - Sync failures > 10 in 5 minutes
  - Queue size > 5000 items
  - Auth failures > 5%
  
Warning:
  - Load time > 5 seconds
  - Photo upload failures > 10%
  - Offline duration > 24 hours
```

## Production Checklist

### Pre-Launch
- [ ] Security audit completed
- [ ] POPIA compliance verified
- [ ] SSL certificate configured
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] API keys secured

### Launch Day
- [ ] Deploy to production
- [ ] Enable monitoring
- [ ] Test critical paths
- [ ] Verify sync working
- [ ] Check error tracking

### Post-Launch
- [ ] Monitor metrics for 24 hours
- [ ] Gather user feedback
- [ ] Fix critical issues
- [ ] Plan Phase 2 features

## Risk Mitigation

### Technical Risks
```yaml
Offline Storage Limits:
  risk: Browser storage quota exceeded
  mitigation: Implement cleanup of old data
  
Photo Upload Failures:
  risk: Large photos fail to upload
  mitigation: Aggressive compression, chunked uploads
  
Sync Conflicts:
  risk: Multiple users edit same data
  mitigation: Timestamp-based resolution
```

### Operational Risks
```yaml
Poor Connectivity:
  risk: Frequent offline/online transitions
  mitigation: Debounced sync, resilient queue
  
Device Compatibility:
  risk: Older devices can't run PWA
  mitigation: Progressive enhancement, fallbacks
```

## Success Metrics

### Phase 1 Goals (3 months)
- [ ] 100 field technicians using daily
- [ ] 1000+ poles captured
- [ ] < 1% data loss rate
- [ ] 95% user satisfaction
- [ ] < 5 critical bugs

### Long-term Goals (12 months)
- [ ] 1000+ active users
- [ ] 50,000+ poles captured
- [ ] Integration with QGIS/1Map
- [ ] Native app deployment
- [ ] 99.9% uptime

## Next Steps

1. **Immediate Actions**:
   - Create Firebase project
   - Set up development environment
   - Initialize Next.js project
   - Configure Firebase services

2. **Week 1 Deliverables**:
   - Basic PWA running
   - Authentication working
   - Offline persistence configured
   - CI/CD pipeline setup

3. **Communication**:
   - Daily progress updates
   - Weekly demos to stakeholders
   - Bi-weekly user testing sessions

## Appendix

### Commands Reference
```bash
# Development
npm run dev         # Start development server
npm run build       # Build production
npm run test        # Run tests
npm run lint        # Check code quality

# Deployment
firebase deploy     # Deploy to Firebase
npm run analyze     # Bundle analysis
```

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

NEXT_PUBLIC_FIBREFLOW_API_URL=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

### Resource Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Query Documentation](https://tanstack.com/query)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Capacitor Documentation](https://capacitorjs.com/docs)

---

## Document Metadata
- **Created**: 2024-01-30
- **Version**: 1.0.0
- **Author**: FibreField Development Team
- **Status**: Ready for Implementation
- **Review**: Pending stakeholder approval

---

*This PRP is a living document. Update as implementation progresses and requirements evolve.*