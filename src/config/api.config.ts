// API Configuration for FibreField
// Central configuration for all API endpoints and keys

export const API_CONFIG = {
  // API Key for authentication
  API_KEY: process.env.NEXT_PUBLIC_FIBREFLOW_API_KEY || 'fibreflow-api-key-2025-prod-001',
  
  // API Endpoints
  READ_API_URL: process.env.NEXT_PUBLIC_READ_API_URL || 
    'https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI',
  
  STAGING_API_URL: process.env.NEXT_PUBLIC_STAGING_API_URL || 
    'https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI',
  
  // API Endpoints
  endpoints: {
    // Read API endpoints
    read: {
      health: '/health',
      poles: '/api/v1/poles',
      pole: (poleNumber: string) => `/api/v1/poles/${poleNumber}`,
      analytics: '/api/v1/analytics/summary',
      projects: '/api/v1/projects',
      contractors: '/api/v1/contractors'
    },
    
    // Staging API endpoints
    staging: {
      health: '/health',
      submitPole: '/api/v1/submit/pole',
      submitPhotos: '/api/v1/submit/photos',
      status: (submissionId: string) => `/api/v1/status/${submissionId}`,
      cancel: (submissionId: string) => `/api/v1/cancel/${submissionId}`
    }
  },
  
  // Request configuration
  request: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    maxPhotoSize: 5 * 1024 * 1024 // 5MB
  },
  
  // Rate limiting
  rateLimit: {
    maxRequestsPerHour: 1000,
    maxConcurrentRequests: 10,
    batchSize: 100
  },
  
  // App metadata
  metadata: {
    sourceApp: 'FibreField',
    version: '1.0.0',
    platform: 'PWA'
  }
} as const;

// Type definitions for API responses
export interface APIResponse<T = any> {
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
    requestId?: string;
  };
}

// Submission status types
export type SubmissionStatus = 
  | 'pending_validation'
  | 'validating'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'error';

// Helper function to build full URLs
export function buildApiUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl}${endpoint}`;
}

// Helper function to get headers with API key
export function getApiHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  return {
    'X-API-Key': API_CONFIG.API_KEY,
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
}

// Error codes enum
export enum APIErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_POLE = 'DUPLICATE_POLE',
  INVALID_GPS = 'INVALID_GPS',
  PHOTO_TOO_LARGE = 'PHOTO_TOO_LARGE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// Export for use in services
export default API_CONFIG;