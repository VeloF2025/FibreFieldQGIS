// Field capture data models for Firebase-only field operations
import { Timestamp } from 'firebase/firestore';

// Photo types for pole installation
export type PhotoType = 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';

// Field photo metadata
export interface FieldPhoto {
  id: string;
  type: PhotoType;
  url: string;
  thumbnailUrl?: string;
  capturedAt: Timestamp;
  fileSize: number;
  mimeType: string;
  metadata?: {
    width?: number;
    height?: number;
    orientation?: number;
  };
}

// GPS location data with accuracy
export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  capturedAt: Timestamp;
}

// Quality check items
export interface QualityCheck {
  poleUpright: boolean;
  correctDepth: boolean;
  concreteAdequate: boolean;
  photosComplete: boolean;
  safetyCompliant: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
}

// Main field pole installation record
export interface FieldPoleInstallation {
  id: string;
  
  // Basic info (no SOW/OneMap data)
  poleNumber: string;
  projectId?: string;
  contractorId: string;
  
  // Field capture data
  actualGPS: GPSLocation;
  photos: FieldPhoto[];
  qualityChecks: QualityCheck;
  fieldNotes?: string;
  
  // Metadata
  capturedAt: Timestamp;
  capturedBy: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncedAt?: Timestamp;
  isOffline: boolean;
  
  // Optional fields for future use
  weatherConditions?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    conditions?: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  };
  
  // Installation specifics
  installationDetails?: {
    poleHeight?: number;
    installationDepth?: number;
    concreteVolume?: number;
    cableLength?: number;
  };
}

// Offline queue item for sync
export interface OfflineQueueItem {
  id: string;
  type: 'pole-installation' | 'photo' | 'quality-check' | 'field-notes';
  action: 'create' | 'update' | 'delete' | 'upload';
  entityId: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
}

// Session tracking for analytics
export interface FieldSession {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  capturesCount: number;
  photosCount: number;
  syncedCount: number;
  failedCount: number;
  networkType?: 'wifi' | '4g' | '3g' | 'offline';
  deviceInfo?: {
    model?: string;
    os?: string;
    browser?: string;
    version?: string;
  };
}