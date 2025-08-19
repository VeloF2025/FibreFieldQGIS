# FibreField API Reference - Quick Guide

## Configuration

### Environment Variables (.env.local)
```bash
# API Keys
NEXT_PUBLIC_FIBREFLOW_API_KEY=fibreflow-api-key-2025-prod-001

# API Endpoints
NEXT_PUBLIC_READ_API_URL=https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI
NEXT_PUBLIC_STAGING_API_URL=https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI

# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDFIS5a5sueGqKRUvbQ8RaZU7twlHmQ4-E
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fibreflow-73daf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fibreflow-73daf
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fibreflow-73daf.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=246237167289
NEXT_PUBLIC_FIREBASE_APP_ID=1:246237167289:web:5ba8e9747b8ac0f7e5c88b
```

## Quick API Examples

### 1. Get Poles Data
```typescript
// services/api/poles.ts
export async function fetchPoles() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_READ_API_URL}/api/v1/poles`,
    {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_FIBREFLOW_API_KEY!
      }
    }
  );
  return response.json();
}
```

### 2. Submit New Pole
```typescript
// services/api/submit.ts
export async function submitPole(poleData: PoleCapture) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_STAGING_API_URL}/api/v1/submit/pole`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_FIBREFLOW_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          poleNumber: poleData.poleNumber,
          projectId: poleData.projectId,
          gps: {
            latitude: poleData.gpsLocation?.latitude,
            longitude: poleData.gpsLocation?.longitude,
            accuracy: poleData.gpsLocation?.accuracy
          },
          photos: poleData.photos.map(p => ({
            type: p.type,
            url: p.uploadUrl || p.data
          })),
          status: 'installed',
          notes: poleData.notes
        },
        metadata: {
          sourceApp: 'FibreField',
          version: '1.0.0',
          capturedBy: poleData.capturedBy
        }
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Submission failed: ${response.status}`);
  }
  
  return response.json();
}
```

### 3. Check Submission Status
```typescript
// services/api/status.ts
export async function checkSubmissionStatus(submissionId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_STAGING_API_URL}/api/v1/status/${submissionId}`,
    {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_FIBREFLOW_API_KEY!
      }
    }
  );
  return response.json();
}
```

## API Workflow

```mermaid
graph LR
    A[FibreField App] -->|1. Capture Data| B[Local Storage]
    B -->|2. When Online| C[Staging API]
    C -->|3. Submit| D[Staging DB]
    D -->|4. Validate| E[Validation Service]
    E -->|5. If Valid| F[Production DB]
    F -->|6. Available in| G[Read API]
    G -->|7. Fetch| A
```

## Data Models

### Pole Submission Format
```typescript
interface PoleSubmission {
  data: {
    poleNumber?: string;        // Auto-generated if not provided
    projectId: string;
    contractorId?: string;
    gps: {
      latitude: number;
      longitude: number;
      accuracy: number;
      capturedAt?: string;       // ISO 8601 format
    };
    photos: Array<{
      type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
      url: string;               // Base64 or URL
      capturedAt?: string;
    }>;
    status: 'planned' | 'installed' | 'verified';
    notes?: string;
  };
  metadata: {
    sourceApp: string;
    version: string;
    submittedBy?: string;
    deviceId?: string;
    offline?: boolean;
  };
}
```

### API Response Format
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}
```

## Common Status Codes

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| `pending_validation` | Submitted, awaiting validation | Wait for processing |
| `validating` | Currently being validated | Wait |
| `approved` | Passed validation, moving to production | None |
| `rejected` | Failed validation | Check errors, resubmit |
| `completed` | Successfully in production | Available in Read API |
| `error` | Processing error | Contact support |

## Rate Limits

- **Requests**: 1000 per hour per API key
- **Payload**: Max 10MB per request
- **Photos**: Max 5MB per photo
- **Batch**: Max 100 items per batch request

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_API_KEY` | API key missing or invalid | Check API key configuration |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement throttling |
| `VALIDATION_ERROR` | Data validation failed | Check data format |
| `DUPLICATE_POLE` | Pole number already exists | Use different pole number |
| `INVALID_GPS` | GPS coordinates invalid | Verify lat/lng values |
| `PHOTO_TOO_LARGE` | Photo exceeds size limit | Compress before upload |

## Testing Endpoints

### Health Check
```bash
# Read API Health
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/health

# Staging API Health
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI/health
```

### Test with Sample Data
```bash
# Get poles (test read)
curl -H "X-API-Key: fibreflow-api-key-2025-prod-001" \
  https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/poles

# Submit test pole
curl -X POST \
  -H "X-API-Key: fibreflow-api-key-2025-prod-001" \
  -H "Content-Type: application/json" \
  -d '{"data":{"poleNumber":"TEST001","gps":{"latitude":-26.123,"longitude":28.456}}}' \
  https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI/api/v1/submit/pole
```

## Integration Checklist

- [ ] Set up environment variables in `.env.local`
- [ ] Configure Firebase in `lib/firebase.ts`
- [ ] Create API service functions in `services/api/`
- [ ] Implement offline queue in `services/offline-sync.service.ts`
- [ ] Add error handling with retry logic
- [ ] Test health endpoints
- [ ] Test data submission flow
- [ ] Verify sync mechanism works
- [ ] Monitor submission status
- [ ] Handle API errors gracefully

## Support

For API issues or additional access:
- Email: support@velocityfibre.com
- Documentation: See `DEVELOPER_PACKAGE.md` for complete details

---
*Quick Reference v1.0 - August 2025*