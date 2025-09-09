# FibreField - React/Next.js Implementation Guide

## Quick Start

### 1. Project Setup
```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest fibrefield --typescript --tailwind --app --src-dir

cd fibrefield

# Install core dependencies
npm install firebase react-query @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install mapbox-gl @types/mapbox-gl
npm install dexie workbox-window compressor.js
npm install @capacitor/core @capacitor/camera @capacitor/geolocation

# Install dev dependencies
npm install -D @types/react next-pwa
npm install -D @tanstack/react-query-devtools
```

### 2. Project Structure
```
fibrefield/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (app)/                # Protected app routes
│   │   │   ├── layout.tsx        # App shell with navigation
│   │   │   ├── dashboard/
│   │   │   ├── poles/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   └── capture/
│   │   │   ├── splices/
│   │   │   ├── drops/
│   │   │   └── surveys/
│   │   ├── api/                  # API routes
│   │   │   ├── sync/
│   │   │   └── export/
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Landing page
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui components
│   │   ├── forms/
│   │   ├── maps/
│   │   └── shared/
│   ├── hooks/
│   │   ├── useOffline.ts
│   │   ├── useSync.ts
│   │   ├── useCamera.ts
│   │   └── useGeolocation.ts
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── db.ts                 # Dexie setup
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── sync.service.ts
│   │   ├── offline.service.ts
│   │   └── photo.service.ts
│   ├── store/
│   │   ├── auth.store.ts         # Zustand stores
│   │   ├── app.store.ts
│   │   └── sync.store.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── manifest.json
│   └── icons/
├── next.config.js
└── package.json
```

## Core Implementation

### 1. Firebase Configuration
```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.log('Persistence not available');
    }
  });
}
```

### 2. Offline Database (Dexie)
```typescript
// lib/db.ts
import Dexie, { Table } from 'dexie';

export interface QueueItem {
  id?: number;
  type: 'pole' | 'splice' | 'drop' | 'survey';
  action: 'create' | 'update' | 'delete';
  data: any;
  photos: string[];
  timestamp: Date;
  synced: boolean;
  retries: number;
}

export interface CachedPhoto {
  id?: number;
  localPath: string;
  remoteUrl?: string;
  type: string;
  entityId: string;
  compressed: boolean;
  uploaded: boolean;
}

class FibreFieldDB extends Dexie {
  queue!: Table<QueueItem>;
  photos!: Table<CachedPhoto>;
  
  constructor() {
    super('FibreFieldDB');
    this.version(1).stores({
      queue: '++id, type, synced, timestamp',
      photos: '++id, entityId, uploaded'
    });
  }
}

export const localDB = new FibreFieldDB();
```

### 3. State Management (Zustand)
```typescript
// store/app.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  queueCount: number;
  currentProject: Project | null;
  setOnline: (status: boolean) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
  setQueueCount: (count: number) => void;
  setCurrentProject: (project: Project | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isOnline: true,
      syncStatus: 'idle',
      queueCount: 0,
      currentProject: null,
      setOnline: (status) => set({ isOnline: status }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setQueueCount: (count) => set({ queueCount: count }),
      setCurrentProject: (project) => set({ currentProject: project })
    }),
    {
      name: 'fibrefield-storage'
    }
  )
);
```

### 4. Offline Hook
```typescript
// hooks/useOffline.ts
import { useEffect } from 'react';
import { useAppStore } from '@/store/app.store';
import { syncService } from '@/services/sync.service';

export function useOffline() {
  const { setOnline, isOnline } = useAppStore();
  
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Trigger sync when coming online
      syncService.processQueue();
    };
    
    const handleOffline = () => {
      setOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial status
    setOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);
  
  return { isOnline };
}
```

### 5. Photo Capture Component
```tsx
// components/PhotoCapture.tsx
'use client';

import { useState } from 'react';
import { Camera } from '@capacitor/camera';
import { CameraResultType } from '@capacitor/camera';
import Compressor from 'compressorjs';
import { Button } from '@/components/ui/button';
import { Camera as CameraIcon } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (photo: string) => void;
  type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
}

export function PhotoCapture({ onCapture, type }: PhotoCaptureProps) {
  const [loading, setLoading] = useState(false);
  
  const capturePhoto = async () => {
    setLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });
      
      // Compress the image
      const base64 = image.dataUrl!.split(',')[1];
      const blob = base64ToBlob(base64, 'image/jpeg');
      
      new Compressor(blob, {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        success(result) {
          const reader = new FileReader();
          reader.readAsDataURL(result);
          reader.onloadend = () => {
            onCapture(reader.result as string);
          };
        },
        error(err) {
          console.error('Compression failed:', err);
        }
      });
    } catch (error) {
      console.error('Camera error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={capturePhoto} 
      disabled={loading}
      className="w-full"
    >
      <CameraIcon className="mr-2 h-4 w-4" />
      Capture {type} Photo
    </Button>
  );
}
```

### 6. Offline Queue Service
```typescript
// services/offline.service.ts
import { localDB } from '@/lib/db';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

class OfflineService {
  async addToQueue(item: Omit<QueueItem, 'id' | 'synced' | 'retries'>) {
    await localDB.queue.add({
      ...item,
      synced: false,
      retries: 0,
      timestamp: new Date()
    });
  }
  
  async processQueue() {
    const items = await localDB.queue
      .where('synced').equals(0)
      .toArray();
    
    for (const item of items) {
      try {
        await this.syncItem(item);
        await localDB.queue.update(item.id!, { synced: true });
      } catch (error) {
        await localDB.queue.update(item.id!, { 
          retries: item.retries + 1 
        });
      }
    }
  }
  
  private async syncItem(item: QueueItem) {
    // Upload photos first
    const photoUrls = await this.uploadPhotos(item.photos);
    
    // Sync data to Firestore
    const data = {
      ...item.data,
      photos: photoUrls,
      syncedAt: new Date()
    };
    
    switch (item.action) {
      case 'create':
        await addDoc(collection(db, item.type), data);
        break;
      case 'update':
        await updateDoc(doc(db, item.type, item.data.id), data);
        break;
    }
  }
  
  private async uploadPhotos(localPaths: string[]): Promise<string[]> {
    const urls: string[] = [];
    
    for (const path of localPaths) {
      const blob = await fetch(path).then(r => r.blob());
      const filename = `photos/${Date.now()}_${Math.random()}.jpg`;
      const storageRef = ref(storage, filename);
      
      const snapshot = await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    }
    
    return urls;
  }
}

export const offlineService = new OfflineService();
```

### 7. PWA Configuration
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-storage',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    }
  ]
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com']
  }
});
```

### 8. Main App Layout
```tsx
// app/(app)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 60, // 1 hour
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isOnline } = useOffline();
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {!isOnline && (
          <div className="bg-yellow-500 text-white text-center py-2">
            You are offline. Data will sync when connection is restored.
          </div>
        )}
        {children}
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Deployment

### Firebase Hosting Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
firebase init hosting

# Configure firebase.json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}

# Build and deploy
npm run build
firebase deploy --only hosting
```

## Performance Optimizations

### 1. Image Optimization
```tsx
import Image from 'next/image';

// Next.js automatically optimizes images
<Image 
  src={photoUrl} 
  alt="Pole installation"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

### 2. Code Splitting
```tsx
// Dynamic imports for heavy components
const MapView = dynamic(() => import('@/components/MapView'), {
  loading: () => <MapSkeleton />,
  ssr: false
});
```

### 3. React Query Optimization
```tsx
// Prefetch data on hover
const prefetchPole = async (poleId: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['pole', poleId],
    queryFn: () => fetchPole(poleId)
  });
};
```

## Testing

### Unit Tests
```typescript
// __tests__/offline.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useOffline } from '@/hooks/useOffline';

describe('useOffline', () => {
  it('should detect offline status', async () => {
    const { result } = renderHook(() => useOffline());
    
    // Simulate going offline
    window.dispatchEvent(new Event('offline'));
    
    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });
  });
});
```

## Conclusion

This React/Next.js implementation provides:
- ✅ Optimal mobile performance
- ✅ Excellent offline capabilities
- ✅ Small bundle size
- ✅ Great developer experience
- ✅ Easy path to native app if needed

The stack is production-ready and optimized for field technicians using mobile devices in areas with poor connectivity.