# FibreField Developer Package - Complete Integration Guide

## Table of Contents
1. [FibreFlow API Access](#fibreflow-api-access)
2. [Database Structure](#database-structure)
3. [Authentication & Security](#authentication--security)
4. [Local Development Setup](#local-development-setup)
5. [Integration Examples](#integration-examples)
6. [Deployment Guide](#deployment-guide)

---

## FibreFlow API Access

### 1. Read-Only API (Get Data from Neon)

#### Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI
```

#### Available Endpoints
- `GET /health` - Health check
- `GET /api/v1/poles` - Get all poles data
- `GET /api/v1/poles/:poleNumber` - Get specific pole
- `GET /api/v1/analytics/summary` - Get analytics summary
- `GET /api/v1/projects` - Get projects list
- `GET /api/v1/contractors` - Get contractors list

#### Example - Read Poles
```javascript
// services/fibreflow-api.service.ts
const API_KEY = 'fibreflow-api-key-2025-prod-001';
const READ_API = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI';

async function getPoles() {
  const response = await fetch(`${READ_API}/api/v1/poles`, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data; // Returns poles array
}
```

### 2. Staging API (Submit New Data)

#### Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI
```

#### Available Endpoints
- `GET /health` - Health check
- `POST /api/v1/submit/pole` - Submit new pole installation
- `POST /api/v1/submit/photos` - Upload pole photos
- `GET /api/v1/status/:submissionId` - Check submission status
- `DELETE /api/v1/cancel/:submissionId` - Cancel pending submission

#### Example - Submit Pole Installation
```javascript
async function submitPoleInstallation(poleData) {
  const submission = {
    data: {
      poleNumber: poleData.poleNumber || `AUTO-${Date.now()}`,
      projectId: poleData.projectId,
      contractorId: poleData.contractorId,
      capturedBy: poleData.capturedBy,
      gps: {
        latitude: poleData.gpsLocation.latitude,
        longitude: poleData.gpsLocation.longitude,
        accuracy: poleData.gpsLocation.accuracy,
        capturedAt: new Date().toISOString()
      },
      photos: poleData.photos.map(photo => ({
        type: photo.type,
        url: photo.uploadUrl || photo.data,
        capturedAt: photo.timestamp
      })),
      status: 'installed',
      notes: poleData.notes,
      metadata: {
        sourceApp: 'FibreField',
        version: '1.0.0',
        offline: true,
        deviceId: navigator.userAgent
      }
    }
  };

  const response = await fetch(`${STAGING_API}/api/v1/submit/pole`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(submission)
  });

  const result = await response.json();
  return result.data.submissionId; // Save for status checking
}
```

### 3. Photo Upload Process

```javascript
async function uploadPhoto(photoData) {
  // Convert base64 to blob
  const base64Data = photoData.data.replace(/^data:image\/\w+;base64,/, '');
  const blob = Blob.fromBase64(base64Data);
  
  // Create FormData
  const formData = new FormData();
  formData.append('photo', blob, `${photoData.type}.jpg`);
  formData.append('poleId', photoData.poleId);
  formData.append('type', photoData.type);
  
  // Upload to Firebase Storage via API
  const response = await fetch(`${STAGING_API}/api/v1/submit/photos`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY
    },
    body: formData
  });
  
  const result = await response.json();
  return result.data.photoUrl; // Firebase Storage URL
}
```

---

## Database Structure

### Local Database (Dexie/IndexedDB)

```typescript
// lib/database.ts
interface PoleCapture {
  id: string;              // Pole number as UID
  projectId: string;
  poleNumber?: string;     // Optional, auto-generated if not provided
  status: 'draft' | 'in_progress' | 'captured' | 'synced' | 'error';
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  photos: CapturedPhoto[];
  capturedBy?: string;
  capturedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CapturedPhoto {
  id: string;
  type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
  data: string;           // Base64 encoded
  timestamp: Date;
  size: number;
  compressed: boolean;
  uploadUrl?: string;     // Firebase Storage URL after upload
}
```

### Remote Database (Neon PostgreSQL)

```sql
-- Poles table structure
CREATE TABLE poles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pole_number VARCHAR(50) UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id),
  contractor_id UUID REFERENCES contractors(id),
  status VARCHAR(50),
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy DECIMAL(6, 2),
  captured_by VARCHAR(255),
  captured_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Staging table for submissions
CREATE TABLE staging_submissions (
  submission_id VARCHAR(100) PRIMARY KEY,
  data JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending_validation',
  validation_errors JSONB,
  submitted_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by VARCHAR(255)
);
```

---

## Authentication & Security

### API Authentication
```javascript
// config/api.config.ts
export const API_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_FIBREFLOW_API_KEY || 'fibreflow-api-key-2025-prod-001',
  READ_API_URL: 'https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI',
  STAGING_API_URL: 'https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI'
};
```

### Firebase Authentication
```javascript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDFIS5a5sueGqKRUvbQ8RaZU7twlHmQ4-E",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "246237167289",
  appId: "1:246237167289:web:5ba8e9747b8ac0f7e5c88b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

---

## Local Development Setup

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_FIBREFLOW_API_KEY=fibreflow-api-key-2025-prod-001
NEXT_PUBLIC_READ_API_URL=https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI
NEXT_PUBLIC_STAGING_API_URL=https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDFIS5a5sueGqKRUvbQ8RaZU7twlHmQ4-E
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fibreflow-73daf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fibreflow-73daf
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fibreflow-73daf.appspot.com
```

### Running the Development Server
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run on specific port
npm run dev -- --port 3020

# Build for production
npm run build

# Start production server
npm start
```

---

## Integration Examples

### Complete Pole Capture Flow
```typescript
// services/pole-capture-integration.ts
import { poleCaptureService } from '@/services/pole-capture.service';
import { gpsService } from '@/services/gps.service';
import { API_CONFIG } from '@/config/api.config';

class PoleIntegrationService {
  // 1. Create new pole capture session
  async startCapture(projectId: string) {
    const poleId = await poleCaptureService.createPoleCapture({
      projectId,
      capturedBy: auth.currentUser?.uid
    });
    return poleId;
  }

  // 2. Capture GPS location
  async captureLocation(poleId: string) {
    const position = await gpsService.getCurrentPosition({
      requiredAccuracy: 10,
      maxAttempts: 5
    });
    
    await poleCaptureService.updateGPSLocation(poleId, {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy
    });
    
    return position;
  }

  // 3. Add photos
  async addPhoto(poleId: string, photo: File, type: PhotoType) {
    const base64 = await this.fileToBase64(photo);
    const capturedPhoto = {
      id: `${type}_${Date.now()}`,
      type,
      data: base64,
      timestamp: new Date(),
      size: photo.size,
      compressed: false
    };
    
    await poleCaptureService.addPhoto(poleId, capturedPhoto);
    return capturedPhoto;
  }

  // 4. Submit to FibreFlow
  async submitToFibreFlow(poleId: string) {
    const poleData = await poleCaptureService.getPoleCapture(poleId);
    if (!poleData) throw new Error('Pole not found');

    // Upload photos first
    const uploadedPhotos = await this.uploadPhotos(poleData.photos);

    // Submit to staging API
    const response = await fetch(`${API_CONFIG.STAGING_API_URL}/api/v1/submit/pole`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          poleNumber: poleData.poleNumber,
          projectId: poleData.projectId,
          gps: poleData.gpsLocation,
          photos: uploadedPhotos,
          status: 'installed',
          notes: poleData.notes
        },
        metadata: {
          sourceApp: 'FibreField',
          version: '1.0.0'
        }
      })
    });

    const result = await response.json();
    
    // Mark as synced
    await poleCaptureService.markAsSynced(poleId);
    
    return result.data.submissionId;
  }

  // 5. Check submission status
  async checkStatus(submissionId: string) {
    const response = await fetch(
      `${API_CONFIG.STAGING_API_URL}/api/v1/status/${submissionId}`,
      {
        headers: { 'X-API-Key': API_CONFIG.API_KEY }
      }
    );
    return response.json();
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async uploadPhotos(photos: CapturedPhoto[]) {
    // Upload to Firebase Storage or API endpoint
    const uploaded = [];
    for (const photo of photos) {
      // Implementation for photo upload
      uploaded.push({
        type: photo.type,
        url: photo.uploadUrl || photo.data,
        capturedAt: photo.timestamp
      });
    }
    return uploaded;
  }
}

export const poleIntegration = new PoleIntegrationService();
```

### Offline Sync Strategy
```typescript
// services/offline-sync.ts
class OfflineSyncService {
  private syncInterval: NodeJS.Timeout | null = null;

  startAutoSync() {
    // Check every 5 minutes
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingData();
      }
    }, 5 * 60 * 1000);

    // Listen for online event
    window.addEventListener('online', () => {
      this.syncPendingData();
    });
  }

  async syncPendingData() {
    const pendingCaptures = await poleCaptureService.getSyncQueue();
    
    for (const capture of pendingCaptures) {
      try {
        await poleIntegration.submitToFibreFlow(capture.id);
      } catch (error) {
        console.error('Sync failed for', capture.id, error);
        await poleCaptureService.markSyncError(
          capture.id, 
          error.message
        );
      }
    }
  }
}
```

---

## Deployment Guide

### Build for Production
```bash
# Build the application
npm run build

# Test production build locally
npm start

# Deploy to Vercel
vercel deploy --prod

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Environment Configuration
```javascript
// next.config.js
module.exports = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production'
      ? 'https://api.fibreflow.com'
      : 'http://localhost:3000'
  }
};
```

---

## API Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    "poles": [...],
    "total": 100,
    "page": 1,
    "limit": 20
  },
  "meta": {
    "timestamp": "2025-08-16T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid pole number format",
    "details": {
      "field": "poleNumber",
      "expected": "Format: XXX.P.XXX"
    }
  }
}
```

### Submission Status Response
```json
{
  "success": true,
  "data": {
    "submissionId": "stg_pole_1692345678_abc123",
    "status": "approved",
    "approvedAt": "2025-08-16T12:30:00Z",
    "poleNumber": "LAW.P.B999",
    "validationResults": {
      "passed": true,
      "checks": {
        "poleNumberFormat": true,
        "gpsAccuracy": true,
        "photosComplete": true
      }
    }
  }
}
```

---

## Rate Limits & Quotas

- **API Rate Limits**: 1000 requests per hour per API key
- **Payload Size**: Maximum 10MB per request
- **Photo Upload**: Maximum 5MB per photo
- **Batch Operations**: Maximum 100 items per batch
- **Concurrent Connections**: Maximum 10 simultaneous requests

---

## Error Handling

```typescript
// utils/api-error-handler.ts
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function handleAPIResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'Request failed' }
    }));
    
    throw new APIError(
      error.error?.code || 'API_ERROR',
      error.error?.message || `HTTP ${response.status}`,
      response.status
    );
  }
  
  const data = await response.json();
  if (!data.success) {
    throw new APIError(
      data.error?.code || 'API_ERROR',
      data.error?.message || 'Request failed'
    );
  }
  
  return data.data;
}
```

---

## Support & Resources

- **API Documentation**: https://fibreflow.com/api/docs
- **Status Page**: https://status.fibreflow.com
- **Support Email**: support@fibreflow.com
- **GitHub**: https://github.com/VelocityFibre/FibreFlow_Firebase

---

*Last Updated: August 16, 2025*
*Version: 1.0.0*