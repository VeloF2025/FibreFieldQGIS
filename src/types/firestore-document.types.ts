/**
 * Firestore Document Type Definitions
 * 
 * This module defines TypeScript interfaces for Firebase Firestore documents
 * to ensure proper type safety when querying the database.
 * 
 * All document interfaces include the core properties that exist in Firebase documents.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Base Firestore Document - Common fields for all documents
 */
export interface FirestoreDocument {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * GPS Location interface for Firestore documents
 */
export interface FirestoreGPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  provider?: string;
  capturedAt?: Timestamp;
}

/**
 * Photo interface for Firestore documents
 */
export interface FirestorePhoto {
  id: string;
  type: string;
  url?: string;
  data?: string; // Base64 encoded
  timestamp: Timestamp;
  size: number;
  compressed: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadUrl?: string;
  uploadError?: string;
  uploadedAt?: Timestamp;
  location?: FirestoreGPSLocation;
  resolution?: {
    width: number;
    height: number;
  };
  isValid?: boolean;
  validationNotes?: string;
}

/**
 * Customer information interface
 */
export interface FirestoreCustomerInfo {
  name: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  accountNumber?: string;
}

/**
 * Rejection information interface
 */
export interface FirestoreRejection {
  reason: string;
  notes?: string;
  issues?: string[];
  rejectedBy?: string;
  rejectedAt?: Timestamp;
}

/**
 * Home Drop Capture Document - Firestore structure
 */
export interface HomeDropCaptureDocument extends FirestoreDocument {
  // Required fields
  projectId: string;
  contractorId: string;
  poleId?: string; // Reference to pole document
  poleNumber?: string; // Pole number for relationship
  
  // Status fields
  status: 'assigned' | 'in_progress' | 'captured' | 'synced' | 'error';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
  
  // Location data
  gpsLocation?: FirestoreGPSLocation;
  serviceArea?: string;
  
  // Customer information
  customerInfo?: FirestoreCustomerInfo;
  serviceAddress?: string;
  
  // Installation details
  assignmentId?: string;
  dropNumber?: string;
  
  // Photos and media
  photos?: Record<string, FirestorePhoto> | FirestorePhoto[];
  
  // Quality and validation
  qualityScore?: number;
  qualityChecks?: {
    powerLevelAcceptable?: boolean;
    allPhotosPresent?: boolean;
    customerVerified?: boolean;
    installationComplete?: boolean;
    serviceActive?: boolean;
    overallScore?: number;
    photoQualityScore?: number;
    installationScore?: number;
    notes?: string;
    checkedBy?: string;
    checkedAt?: Timestamp;
  };
  
  // Approval workflow
  approval?: {
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: Timestamp;
    rejectionReason?: string;
    rejectionNotes?: string;
    requiresRework?: boolean;
  };
  
  // Rejection details (legacy field)
  rejection?: FirestoreRejection;
  
  // Timing fields
  capturedAt?: Timestamp;
  approvedAt?: Timestamp;
  syncedAt?: Timestamp;
  
  // Metadata
  capturedBy?: string;
  capturedByName?: string;
  notes?: string;
  technicalNotes?: string;
  customerFeedback?: string;
  
  // Relationship data
  distanceFromPole?: number;
  
  // Export tracking
  exportedToQGIS?: boolean;
  exportedAt?: Timestamp;
  geoPackageId?: string;
  
  // Offline tracking
  offlinePriority?: 'high' | 'medium' | 'low';
  syncAttempts?: number;
  lastSyncAttempt?: Timestamp;
  syncError?: string;
  
  // Version control
  version?: number;
  localVersion?: number;
}

/**
 * Pole Capture Document - Firestore structure
 */
export interface PoleCaptureDocument extends FirestoreDocument {
  // Required fields
  projectId: string;
  contractorId: string;
  poleNumber: string;
  
  // Status fields
  status: 'draft' | 'in_progress' | 'captured' | 'synced' | 'error';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
  
  // Location data
  gpsLocation?: FirestoreGPSLocation;
  serviceArea?: string;
  
  // Photos and media
  photos?: Record<string, FirestorePhoto> | FirestorePhoto[];
  
  // Quality and validation
  qualityScore?: number;
  qualityChecks?: {
    poleUpright?: boolean;
    correctDepth?: boolean;
    concreteAdequate?: boolean;
    photosComplete?: boolean;
    safetyCompliant?: boolean;
    completedAt?: Timestamp;
    completedBy?: string;
  };
  
  // Timing fields
  capturedAt?: Timestamp;
  approvedAt?: Timestamp;
  syncedAt?: Timestamp;
  
  // Metadata
  capturedBy?: string;
  capturedByName?: string;
  notes?: string;
  
  // Installation details
  installationDetails?: {
    poleHeight?: number;
    installationDepth?: number;
    concreteVolume?: number;
    cableLength?: number;
  };
  
  // Weather conditions
  weatherConditions?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    conditions?: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  };
  
  // Offline tracking
  offlinePriority?: 'high' | 'medium' | 'low';
  syncAttempts?: number;
  lastSyncAttempt?: Timestamp;
  syncError?: string;
  isOffline?: boolean;
}

/**
 * Pole-Drop Relationship Document - Firestore structure
 */
export interface PoleDropRelationshipDocument extends FirestoreDocument {
  // Relationship data
  poleId: string;
  homeDropId: string;
  
  // Distance and quality
  distance?: number;
  relationshipQuality?: number;
  linkType?: string;
  
  // Metadata
  metadata?: {
    serviceArea?: string;
    projectId?: string;
    establishedBy?: string;
    establishedAt?: Timestamp;
    verified?: boolean;
    verifiedBy?: string;
    verifiedAt?: Timestamp;
  };
  
  // Timing
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Assignment Document - Firestore structure
 */
export interface AssignmentDocument extends FirestoreDocument {
  // Assignment details
  projectId: string;
  assignedTo: string;
  assignedBy: string;
  homeDropId?: string;
  poleId?: string;
  
  // Status and priority
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  
  // Timing
  assignedAt: Timestamp;
  scheduledDate?: Timestamp;
  acceptedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  dueDate?: Timestamp;
  
  // Details
  estimatedDuration?: number;
  requirements?: string[];
  installationNotes?: string;
  accessNotes?: string;
  
  // Customer information
  customer?: FirestoreCustomerInfo;
}

/**
 * Type guards for document validation
 */
export function isHomeDropCaptureDocument(doc: any): doc is HomeDropCaptureDocument {
  return doc && typeof doc.projectId === 'string' && typeof doc.contractorId === 'string';
}

export function isPoleCaptureDocument(doc: any): doc is PoleCaptureDocument {
  return doc && typeof doc.projectId === 'string' && typeof doc.contractorId === 'string' && typeof doc.poleNumber === 'string';
}

export function isPoleDropRelationshipDocument(doc: any): doc is PoleDropRelationshipDocument {
  return doc && typeof doc.poleId === 'string' && typeof doc.homeDropId === 'string';
}

export function isAssignmentDocument(doc: any): doc is AssignmentDocument {
  return doc && typeof doc.projectId === 'string' && typeof doc.assignedTo === 'string';
}

/**
 * Helper function to convert Firestore timestamps to Date objects
 */
export function convertTimestampFields<T extends Record<string, any>>(
  data: T,
  timestampFields: (keyof T)[]
): T {
  const converted = { ...data };
  
  timestampFields.forEach(field => {
    if (converted[field] && typeof converted[field] === 'object' && 'toDate' in converted[field]) {
      try {
        converted[field] = (converted[field] as Timestamp).toDate() as T[keyof T];
      } catch (error) {
        console.warn(`Failed to convert timestamp field ${String(field)}:`, error);
        converted[field] = null as T[keyof T];
      }
    }
  });
  
  return converted;
}

/**
 * Helper function to safely access nested object properties
 */
export function safeGet<T>(obj: any, path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Type-safe document mapper function
 */
export function mapFirestoreDocument<T extends FirestoreDocument>(
  doc: any,
  timestampFields: string[] = ['createdAt', 'updatedAt', 'capturedAt', 'approvedAt', 'syncedAt']
): T {
  if (!doc?.id) {
    throw new Error('Document must have an id field');
  }
  
  const data = doc.data ? doc.data() : doc;
  if (!data) {
    throw new Error('Document data is empty');
  }
  
  const mapped = {
    id: doc.id,
    ...data
  } as T;
  
  return convertTimestampFields(mapped, timestampFields as (keyof T)[]);
}