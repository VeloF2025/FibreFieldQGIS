// Type definitions for FibreField
import { Timestamp } from 'firebase/firestore';

// User and authentication types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'technician' | 'client';
  contractorId?: string;
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
}

// Project types - matching FibreFlow
export interface Project {
  id: string;
  title: string;
  client: {
    id: string;
    name: string;
  };
  status: 'active' | 'completed' | 'pending' | 'on-hold';
  priority?: 'high' | 'medium' | 'low';
  location: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  type: 'FTTH' | 'FTTB' | 'FTTC' | 'P2P';
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Planned pole types - matching FibreFlow
export interface PlannedPole {
  id: string;
  projectId: string;
  poleNumber?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  contractorId?: string;
  estimatedDate?: Timestamp;
  actualDate?: Timestamp;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Pole installation capture - for field work
export interface PoleInstallation {
  id: string;
  projectId: string;
  plannedPoleId?: string;
  contractorId: string;
  capturedBy: string;
  
  // Installation details
  poleDetails: {
    poleNumber?: string;
    type: string;
    height: number;
    material: string;
    installationDepth: number;
  };
  
  // Location
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  
  // Photos
  photos: {
    before?: string;
    front?: string;
    side?: string;
    depth?: string;
    concrete?: string;
    compaction?: string;
  };
  
  // Status and timing
  status: 'captured' | 'uploaded' | 'synced' | 'approved' | 'rejected';
  capturedAt: Timestamp;
  syncedAt?: Timestamp;
  
  // Quality assurance
  qualityChecks?: {
    depthVerified: boolean;
    levelVerified: boolean;
    compactionVerified: boolean;
    photosComplete: boolean;
    notes?: string;
  };
  
  // Offline tracking
  isOffline: boolean;
  syncAttempts: number;
  lastSyncAttempt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Contractor types
export interface Contractor {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  services: string[];
  status: 'active' | 'inactive' | 'suspended';
  location?: string;
  rating?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Staff/Technician types
export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  contractorId?: string;
  isActive: boolean;
  permissions: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Offline queue types
export interface OfflineQueueItem {
  id: string;
  type: 'pole-installation' | 'photo-upload' | 'data-sync';
  action: 'create' | 'update' | 'delete';
  data: any;
  photos?: string[];
  
  // Queue management
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  maxAttempts: number;
  nextAttempt?: Timestamp;
  lastError?: string;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Photo types
export interface Photo {
  id: string;
  localPath?: string;
  remotePath?: string;
  url?: string;
  type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
  size: number;
  uploaded: boolean;
  compressed: boolean;
  metadata?: {
    width: number;
    height: number;
    location?: {
      latitude: number;
      longitude: number;
    };
    timestamp: Date;
  };
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form state types
export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

// Network status
export interface NetworkStatus {
  online: boolean;
  type: string;
  speed?: 'slow' | 'fast';
}

// Sync status
export interface SyncStatus {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  lastSync?: Date;
}

// Geolocation types
export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Configuration types
export interface AppConfig {
  env: 'development' | 'production';
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  app: {
    name: string;
    version: string;
    startUrl: string;
    scope: string;
  };
  fibreflow: {
    apiUrl: string;
    webUrl: string;
  };
  offline: {
    cacheVersion: string;
    syncIntervalMinutes: number;
  };
  photo: {
    maxSizeMB: number;
    compressionQuality: number;
    maxDimension: number;
  };
  useEmulator: boolean;
}