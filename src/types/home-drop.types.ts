/**
 * Home Drop Capture Type Definitions
 * 
 * This module defines all TypeScript interfaces for the Home Drop Capture feature.
 * It extends the existing pole capture patterns with home drop specific requirements.
 * 
 * Key Design Principles:
 * 1. Every home drop MUST be connected to a pole number (critical relationship)
 * 2. 4-step workflow: Assignments → GPS → Photos → Review
 * 3. Offline-first with sync queue management
 * 4. Admin approval workflow integration
 * 5. QGIS/QField GeoPackage compatibility
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Home Drop Photo Types - Required for each installation
 */
export type HomeDropPhotoType = 
  | 'power-meter-test'           // Power meter reading showing optical power levels
  | 'fibertime-setup-confirmation' // Fibertime device setup confirmation screen
  | 'fibertime-device-actions'    // Fibertime device configuration actions
  | 'router-4-lights-status';     // Router status showing all 4 lights active

/**
 * Home Drop Status Types - Workflow states
 */
export type HomeDropStatus = 
  | 'assigned'      // Initial state when assigned to technician
  | 'in_progress'   // Technician has started the capture
  | 'captured'      // All required data captured, pending sync
  | 'syncing'       // Currently syncing to server
  | 'synced'        // Successfully synced to server
  | 'pending_approval' // Awaiting admin approval
  | 'approved'      // Admin approved the installation
  | 'rejected'      // Admin rejected, needs rework
  | 'error';        // Error during capture or sync

/**
 * Home Drop Sync Status - For offline sync management
 */
export type HomeDropSyncStatus = 
  | 'pending'       // Waiting to sync
  | 'syncing'       // Currently syncing
  | 'synced'        // Successfully synced
  | 'conflict'      // Sync conflict detected
  | 'error';        // Sync error occurred

/**
 * Captured Photo Interface - For home drop photos
 */
export interface HomeDropPhoto {
  id: string;                    // Unique photo ID
  type: HomeDropPhotoType;       // Photo type from required list
  data: string;                   // Base64 encoded image data
  timestamp: Date;                // When photo was taken
  size: number;                   // File size in bytes
  compressed: boolean;            // Whether photo has been compressed
  
  // Location metadata (from device EXIF if available)
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  
  // Upload tracking
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadUrl?: string;             // Firebase Storage URL after upload
  uploadError?: string;           // Error message if upload failed
  uploadedAt?: Date;              // When successfully uploaded
  
  // Quality metadata
  resolution?: {
    width: number;
    height: number;
  };
  
  // Validation flags
  isValid?: boolean;              // Photo meets quality requirements
  validationNotes?: string;       // Notes from validation
}

/**
 * Home Drop Assignment - Initial assignment data
 */
export interface HomeDropAssignment {
  id: string;                     // Assignment ID
  homeDropId: string;             // Home drop ID
  poleNumber: string;             // Connected pole number (REQUIRED)
  
  // Customer information
  customer: {
    name: string;
    address: string;
    contactNumber?: string;
    email?: string;
    accountNumber?: string;       // Customer account reference
  };
  
  // Assignment details
  assignedTo: string;             // Technician user ID
  assignedBy: string;             // Manager/admin who assigned
  assignedAt: Date;               // When assigned
  scheduledDate?: Date;           // Planned installation date
  
  // Priority and notes
  priority: 'high' | 'medium' | 'low';
  installationNotes?: string;     // Special instructions
  accessNotes?: string;           // Access information
  
  // Status tracking
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  acceptedAt?: Date;              // When technician accepted
  startedAt?: Date;               // When work started
  completedAt?: Date;             // When work completed
}

/**
 * Main Home Drop Capture Interface
 */
export interface HomeDropCapture {
  // Identifiers
  id: string;                     // Unique home drop ID (format: HD-{timestamp}-{random})
  poleNumber: string;             // REQUIRED: Connected pole number
  projectId: string;              // Project this belongs to
  projectName?: string;           // Cached project name
  contractorId: string;           // Contractor performing installation
  
  // Assignment reference
  assignmentId?: string;          // Reference to assignment
  assignment?: HomeDropAssignment; // Embedded assignment data
  
  // Status tracking
  status: HomeDropStatus;         // Current workflow status
  syncStatus: HomeDropSyncStatus; // Sync queue status
  syncError?: string;             // Last sync error message
  syncAttempts: number;           // Number of sync attempts
  lastSyncAttempt?: Date;         // Last sync attempt time
  
  // Direct approval status for UI compatibility
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'under_review'; // Top-level approval status
  
  // Installation identifiers
  dropNumber?: string;            // Drop number identifier
  serviceAddress?: string;        // Service installation address
  
  // Customer details (duplicated for offline access)
  customer: {
    name: string;
    address: string;
    contactNumber?: string;
    phone?: string;               // Alternative to contactNumber for UI compatibility
    email?: string;
    accountNumber?: string;
    serviceType?: string;         // Type of service being installed
    
    // GPS coordinates of customer location
    location?: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude?: number;
      capturedAt: Date;
    };
  };
  
  // Alternative customer info reference for UI compatibility
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    serviceType?: string;
  };
  
  // Installation details
  installation: {
    // Equipment installed
    equipment: {
      ontSerialNumber?: string;   // Optical Network Terminal serial
      routerSerialNumber?: string; // Router serial number
      fiberLength?: number;       // Fiber cable length in meters
      connectorType?: string;     // Type of connector used
    };
    
    // Power readings
    powerReadings: {
      opticalPower?: number;      // dBm reading
      signalStrength?: number;    // Signal strength percentage
      linkQuality?: number;       // Link quality score
      testTimestamp?: Date;      // When test was performed
    };
    
    // Service configuration
    serviceConfig: {
      serviceType?: string;       // Internet package type
      bandwidth?: string;         // Configured bandwidth
      vlanId?: string;           // VLAN configuration
      ipAddress?: string;        // Assigned IP address
      activationStatus?: boolean; // Service activated
    };
  };
  
  // Photos (4 required types)
  photos: HomeDropPhoto[];        // Array of captured photos
  requiredPhotos: HomeDropPhotoType[]; // List of required photo types
  completedPhotos: HomeDropPhotoType[]; // Photos that have been captured
  
  // GPS Data (customer location)
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;             // GPS accuracy in meters
    altitude?: number;
    heading?: number;
    speed?: number;
    provider?: string;            // GPS provider (gps, network, etc.)
    capturedAt: Date;
  };
  
  // Workflow tracking
  workflow: {
    currentStep: number;          // Current step (1-4)
    totalSteps: number;           // Total steps (always 4)
    lastSavedStep: number;        // Last successfully saved step
    
    // Step completion tracking
    steps: {
      assignments: boolean;       // Step 1 completed
      gps: boolean;              // Step 2 completed
      photos: boolean;           // Step 3 completed
      review: boolean;           // Step 4 completed
    };
    
    // Time tracking per step
    stepTimestamps?: {
      assignmentsStarted?: Date;
      assignmentsCompleted?: Date;
      gpsStarted?: Date;
      gpsCompleted?: Date;
      photosStarted?: Date;
      photosCompleted?: Date;
      reviewStarted?: Date;
      reviewCompleted?: Date;
    };
  };
  
  // Quality checks
  qualityChecks?: {
    powerLevelAcceptable: boolean; // Power level within range
    allPhotosPresent: boolean;    // All required photos captured
    customerVerified: boolean;    // Customer details verified
    installationComplete: boolean; // Installation fully complete
    serviceActive: boolean;       // Service is active and working
    
    // Quality scores
    overallScore?: number;        // 0-100 quality score
    photoQualityScore?: number;   // Photo quality score
    installationScore?: number;   // Installation quality score
    
    notes?: string;               // Quality check notes
    checkedBy?: string;           // Who performed quality check
    checkedAt?: Date;             // When quality check was done
  };
  
  // Top-level quality score for UI compatibility
  qualityScore?: number;          // 0-100 overall quality score
  
  // Approval workflow
  approval?: {
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;          // Admin who approved
    approvedAt?: Date;            // When approved
    rejectionReason?: string;     // If rejected, why
    rejectionNotes?: string;      // Additional rejection details
    requiresRework?: boolean;     // Needs technician to redo
  };
  
  // Notes and comments
  notes?: string;                 // General installation notes
  technicalNotes?: string;        // Technical details
  customerFeedback?: string;      // Customer feedback/comments
  
  // Metadata
  capturedBy: string;             // Technician user ID
  capturedByName?: string;        // Cached technician name
  createdAt: Date;                // When record created
  updatedAt: Date;                // Last update time
  capturedAt?: Date;              // When capture completed
  syncedAt?: Date;                // When successfully synced
  
  // Distance tracking
  distanceFromPole?: number;      // Distance in meters from connected pole
  
  // Offline queue priority
  offlinePriority?: 'high' | 'medium' | 'low';
  
  // Version tracking for conflict resolution
  version?: number;               // Version number for optimistic locking
  localVersion?: number;          // Local version for offline changes
  
  // Integration flags
  exportedToQGIS?: boolean;       // Exported to QGIS/QField
  exportedAt?: Date;              // When exported
  geoPackageId?: string;          // Reference in GeoPackage
}

/**
 * Home Drop Photo Storage - Separate table for photos
 */
export interface HomeDropPhotoStorage {
  id: string;                     // Unique ID: {homeDropId}_{photoType}_{timestamp}
  homeDropId: string;             // Reference to home drop
  type: HomeDropPhotoType;        // Photo type
  data: string;                   // Base64 image data
  size: number;                   // Size in bytes
  compressed: boolean;            // Compression status
  
  // Upload tracking
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadUrl?: string;
  uploadError?: string;
  uploadProgress?: number;        // Upload progress 0-100
  
  // Timestamps
  capturedAt: Date;
  uploadedAt?: Date;
  
  // Metadata
  metadata?: {
    width: number;
    height: number;
    mimeType: string;
    orientation?: number;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

/**
 * Home Drop Sync Queue Item
 */
export interface HomeDropSyncQueueItem {
  id: string;
  homeDropId: string;
  action: 'create' | 'update' | 'delete' | 'photo-upload';
  data: Partial<HomeDropCapture>;
  photos?: string[];              // Photo IDs to sync
  
  // Queue management
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  maxAttempts: number;
  nextAttempt?: Date;
  lastError?: string;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Home Drop Statistics
 */
export interface HomeDropStatistics {
  total: number;
  assigned: number;
  inProgress: number;
  captured: number;
  synced: number;
  approved: number;
  rejected: number;
  errors: number;
  
  // Performance metrics
  averageCaptureTime?: number;    // Average time to complete capture
  averagePhotosPerCapture?: number;
  syncSuccessRate?: number;       // Percentage of successful syncs
  approvalRate?: number;          // Percentage approved vs rejected
  
  // By contractor
  byContractor?: Record<string, {
    total: number;
    completed: number;
    pending: number;
    averageQualityScore?: number;
  }>;
  
  // By date
  todayCount?: number;
  weekCount?: number;
  monthCount?: number;
}

/**
 * Home Drop Filter Options
 */
export interface HomeDropFilterOptions {
  status?: HomeDropStatus[];
  syncStatus?: HomeDropSyncStatus[];
  contractorId?: string[];
  projectId?: string[];
  capturedBy?: string[];
  poleNumber?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasPhotos?: boolean;
  needsApproval?: boolean;
  hasErrors?: boolean;
}

/**
 * Home Drop Export Format (for QGIS/QField)
 */
export interface HomeDropGeoPackageExport {
  id: string;
  poleNumber: string;
  customerName: string;
  customerAddress: string;
  latitude: number;
  longitude: number;
  installationDate: string;
  status: string;
  opticalPower?: number;
  serviceActive: boolean;
  technicianName?: string;
  photos: Array<{
    type: string;
    url: string;
  }>;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

/**
 * Home Drop Validation Rules
 */
export interface HomeDropValidationRules {
  requiredPhotos: HomeDropPhotoType[];
  minOpticalPower: number;        // Minimum acceptable dBm
  maxOpticalPower: number;        // Maximum acceptable dBm
  maxDistanceFromPole: number;    // Maximum meters from pole
  photoQualityMinScore: number;   // Minimum photo quality score
  requiredFields: string[];       // List of required fields
}

/**
 * Home Drop Service Configuration
 */
export interface HomeDropServiceConfig {
  photoCompressionQuality: number; // 0-1 compression quality
  maxPhotoSize: number;           // Max size in bytes
  syncBatchSize: number;          // Number of items to sync at once
  syncRetryDelay: number;         // Delay between retries in ms
  maxSyncRetries: number;         // Maximum retry attempts
  offlineCacheDuration: number;   // How long to keep offline data (days)
  gpsAccuracyThreshold: number;   // Required GPS accuracy in meters
  autoSaveInterval: number;       // Auto-save interval in seconds
}