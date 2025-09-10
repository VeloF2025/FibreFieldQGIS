/**
 * Home Drop Database Schema Extensions
 * 
 * This module extends the FibreField database with home drop specific tables
 * following the same patterns as the pole capture implementation.
 * 
 * Design Principles:
 * 1. Offline-first with Dexie.js IndexedDB
 * 2. Efficient indexing for queries
 * 3. Automatic timestamp management
 * 4. Live query support for reactive updates
 * 5. Batch operations for performance
 */

import { Dexie } from 'dexie';
import { db, FibreFieldDB } from './database';
import type {
  HomeDropCapture,
  HomeDropPhotoStorage,
  HomeDropAssignment,
  HomeDropSyncQueueItem
} from '@/types/home-drop.types';

/**
 * Extend the existing FibreFieldDB class with home drop tables
 * This approach maintains compatibility with existing database
 */
export interface HomeDropDatabase {
  // Home drop tables
  homeDropCaptures: Dexie.Table<HomeDropCapture, string>;
  homeDropPhotos: Dexie.Table<HomeDropPhotoStorage, string>;
  homeDropAssignments: Dexie.Table<HomeDropAssignment, string>;
  homeDropSyncQueue: Dexie.Table<HomeDropSyncQueueItem, string>;
}

/**
 * Database migration to add home drop tables
 * This will be version 2 of the database
 */
export async function addHomeDropTables(database: FibreFieldDB): Promise<void> {
  // Check current version
  const currentVersion = database.verno;
  
  // Version 2: Add home drop tables
  database.version(currentVersion + 1).stores({
    // Preserve existing stores (copy from database.ts)
    // ... existing stores remain unchanged ...
    
    // New home drop tables with comprehensive indexes
    homeDropCaptures: [
      '&id',                        // Primary key (unique)
      'poleNumber',                 // CRITICAL: Index for pole relationship
      'projectId',                  // Project filtering
      'contractorId',               // Contractor filtering
      'assignmentId',               // Assignment reference
      'status',                     // Status filtering
      'syncStatus',                 // Sync queue filtering
      'capturedBy',                 // Technician filtering
      'capturedAt',                 // Date range queries
      'createdAt',                  // Chronological ordering
      'updatedAt',                  // Recent changes
      '[projectId+status]',         // Compound: project + status
      '[poleNumber+status]',        // Compound: pole + status
      '[contractorId+status]',      // Compound: contractor + status
      '[status+syncStatus]',        // Compound: workflow + sync
      'customer.address',           // Customer address search
      'customer.accountNumber',     // Customer account lookup
      'approval.status',            // Approval workflow
      'offlinePriority'            // Offline sync priority
    ].join(', '),
    
    homeDropPhotos: [
      '&id',                        // Primary key
      'homeDropId',                 // Foreign key to home drop
      'type',                       // Photo type filtering
      'uploadStatus',               // Upload queue management
      'capturedAt',                 // Chronological ordering
      'uploadedAt',                 // Upload tracking
      '[homeDropId+type]',          // Compound: unique photo per type
      '[uploadStatus+capturedAt]'   // Compound: upload queue ordering
    ].join(', '),
    
    homeDropAssignments: [
      '&id',                        // Primary key
      'homeDropId',                 // Foreign key to home drop
      'poleNumber',                 // Pole relationship
      'assignedTo',                 // Technician assignments
      'assignedBy',                 // Manager tracking
      'status',                     // Assignment status
      'priority',                   // Priority filtering
      'scheduledDate',              // Schedule queries
      'assignedAt',                 // Assignment ordering
      '[assignedTo+status]',        // Compound: technician workload
      '[status+priority]',          // Compound: priority queue
      '[poleNumber+status]',        // Compound: pole assignments
      'customer.name',              // Customer name search
      'customer.address'            // Customer address search
    ].join(', '),
    
    homeDropSyncQueue: [
      '&id',                        // Primary key
      'homeDropId',                 // Foreign key to home drop
      'action',                     // Sync action type
      'status',                     // Queue status
      'priority',                   // Sync priority
      'attempts',                   // Retry tracking
      'nextAttempt',                // Retry scheduling
      'createdAt',                  // Queue ordering
      '[status+priority]',          // Compound: priority queue
      '[status+nextAttempt]',       // Compound: retry scheduling
      '[homeDropId+action]'         // Compound: dedupe checks
    ].join(', ')
  });
  
  // Add hooks for automatic timestamps and data integrity
  addHomeDropHooks(database);
}

/**
 * Add database hooks for home drop tables
 */
function addHomeDropHooks(database: any): void {
  // Home Drop Captures hooks
  if (database.homeDropCaptures) {
    // Creating hook - set initial values
    database.homeDropCaptures.hook('creating', (primKey: any, obj: any) => {
      const now = new Date();
      obj.createdAt = obj.createdAt || now;
      obj.updatedAt = now;
      obj.syncAttempts = obj.syncAttempts || 0;
      obj.syncStatus = obj.syncStatus || 'pending';
      obj.version = 1;
      obj.localVersion = 1;
      
      // Initialize workflow tracking
      if (!obj.workflow) {
        obj.workflow = {
          currentStep: 1,
          totalSteps: 4,
          lastSavedStep: 1,
          steps: {
            assignments: false,
            gps: false,
            photos: false,
            review: false
          }
        };
      }
      
      // Initialize required photos if not set
      if (!obj.requiredPhotos) {
        obj.requiredPhotos = [
          'power-meter-test',
          'fibertime-setup-confirmation',
          'fibertime-device-actions',
          'router-4-lights-status'
        ];
      }
      
      // Initialize empty arrays
      obj.photos = obj.photos || [];
      obj.completedPhotos = obj.completedPhotos || [];
    });
    
    // Updating hook - maintain data consistency
    database.homeDropCaptures.hook('updating', (modifications: any, primKey: any, obj: any) => {
      modifications.updatedAt = new Date();
      
      // Increment local version for conflict detection
      if (obj.localVersion !== undefined) {
        modifications.localVersion = (obj.localVersion || 0) + 1;
      }
      
      // Update sync status if data changed
      if (modifications.status || modifications.installation || modifications.photos) {
        if (!modifications.syncStatus || modifications.syncStatus === 'synced') {
          modifications.syncStatus = 'pending';
        }
      }
      
      // Update workflow steps based on data
      if (modifications.gpsLocation && obj.workflow) {
        if (!modifications.workflow) modifications.workflow = { ...obj.workflow };
        modifications.workflow.steps = {
          ...obj.workflow.steps,
          gps: true
        };
      }
      
      // Check if all required photos are present
      if (modifications.completedPhotos && obj.requiredPhotos) {
        const allPhotosComplete = obj.requiredPhotos.every((photo: string) => 
          modifications.completedPhotos.includes(photo)
        );
        if (allPhotosComplete && obj.workflow) {
          if (!modifications.workflow) modifications.workflow = { ...obj.workflow };
          modifications.workflow.steps = {
            ...obj.workflow.steps,
            photos: true
          };
        }
      }
    });
    
    // Deleting hook - cleanup related data
    database.homeDropCaptures.hook('deleting', async (primKey: any, obj: any) => {
      // Delete associated photos
      if (database.homeDropPhotos) {
        await database.homeDropPhotos
          .where('homeDropId')
          .equals(primKey)
          .delete();
      }
      
      // Delete sync queue items
      if (database.homeDropSyncQueue) {
        await database.homeDropSyncQueue
          .where('homeDropId')
          .equals(primKey)
          .delete();
      }
    });
  }
  
  // Home Drop Photos hooks
  if (database.homeDropPhotos) {
    database.homeDropPhotos.hook('creating', (primKey: any, obj: any) => {
      obj.capturedAt = obj.capturedAt || new Date();
      obj.uploadStatus = obj.uploadStatus || 'pending';
      obj.compressed = obj.compressed || false;
    });
    
    database.homeDropPhotos.hook('updating', (modifications: any) => {
      // Track upload completion
      if (modifications.uploadStatus === 'uploaded' && !modifications.uploadedAt) {
        modifications.uploadedAt = new Date();
      }
    });
  }
  
  // Home Drop Assignments hooks
  if (database.homeDropAssignments) {
    database.homeDropAssignments.hook('creating', (primKey: any, obj: any) => {
      obj.assignedAt = obj.assignedAt || new Date();
      obj.status = obj.status || 'pending';
      obj.priority = obj.priority || 'medium';
    });
    
    database.homeDropAssignments.hook('updating', (modifications: any, primKey: any, obj: any) => {
      // Track status changes
      if (modifications.status) {
        const now = new Date();
        switch (modifications.status) {
          case 'accepted':
            modifications.acceptedAt = modifications.acceptedAt || now;
            break;
          case 'in_progress':
            modifications.startedAt = modifications.startedAt || now;
            break;
          case 'completed':
            modifications.completedAt = modifications.completedAt || now;
            break;
        }
      }
    });
  }
  
  // Home Drop Sync Queue hooks
  if (database.homeDropSyncQueue) {
    database.homeDropSyncQueue.hook('creating', (primKey: any, obj: any) => {
      const now = new Date();
      obj.createdAt = obj.createdAt || now;
      obj.updatedAt = now;
      obj.status = obj.status || 'pending';
      obj.attempts = obj.attempts || 0;
      obj.maxAttempts = obj.maxAttempts || 3;
      obj.priority = obj.priority || 'medium';
      
      // Set next attempt time based on priority
      if (!obj.nextAttempt) {
        const delayMinutes = obj.priority === 'high' ? 1 : 
                           obj.priority === 'medium' ? 5 : 15;
        obj.nextAttempt = new Date(now.getTime() + delayMinutes * 60000);
      }
    });
    
    database.homeDropSyncQueue.hook('updating', (modifications: any, primKey: any, obj: any) => {
      modifications.updatedAt = new Date();
      
      // Handle retry logic
      if (modifications.status === 'failed' && obj.attempts < obj.maxAttempts) {
        modifications.attempts = (obj.attempts || 0) + 1;
        modifications.status = 'pending';
        
        // Exponential backoff for retries
        const backoffMinutes = Math.pow(2, modifications.attempts) * 5;
        modifications.nextAttempt = new Date(Date.now() + backoffMinutes * 60000);
      }
    });
  }
}

/**
 * Initialize home drop database tables
 * Call this during app initialization
 */
export async function initializeHomeDropDatabase(): Promise<void> {
  try {
    // Add home drop tables to existing database
    await addHomeDropTables(db as FibreFieldDB);
    
    // Open database with new schema
    await db.open();
    
    // Verify tables exist
    const tables = db.tables.map(t => t.name);
    const requiredTables = [
      'homeDropCaptures',
      'homeDropPhotos', 
      'homeDropAssignments',
      'homeDropSyncQueue'
    ];
    
    const missingTables = requiredTables.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      log.warn('⚠️ Missing home drop tables:', missingTables, {}, "Homedropdatabase");
      // Tables will be created on next database open
    } else {
      log.info('✅ Home drop database tables initialized successfully', {}, "Homedropdatabase");
    }
    
    // Create indexes for optimal query performance
    await createHomeDropIndexes();
    
  } catch (error) {
    log.error('❌ Failed to initialize home drop database:', {}, "Homedropdatabase", error);
    throw error;
  }
}

/**
 * Create additional indexes for performance optimization
 */
async function createHomeDropIndexes(): Promise<void> {
  // Indexes are created via the schema definition
  // This function is for any runtime index optimization if needed
  log.info('📊 Home drop database indexes configured', {}, "Homedropdatabase");
}

/**
 * Utility functions for home drop database operations
 */
export const homeDropDatabaseUtils = {
  /**
   * Get database statistics for home drops
   */
  async getStats() {
    const stats = {
      homeDropCaptures: await (db as any).homeDropCaptures?.count() || 0,
      homeDropPhotos: await (db as any).homeDropPhotos?.count() || 0,
      homeDropAssignments: await (db as any).homeDropAssignments?.count() || 0,
      homeDropSyncQueue: await (db as any).homeDropSyncQueue?.count() || 0
    };
    
    return {
      ...stats,
      pendingSync: await (db as any).homeDropSyncQueue
        ?.where('status')
        .equals('pending')
        .count() || 0,
      failedSync: await (db as any).homeDropSyncQueue
        ?.where('status')
        .equals('failed')
        .count() || 0
    };
  },
  
  /**
   * Clear all home drop data (for testing/reset)
   */
  async clearAllHomeDropData() {
    await db.transaction('rw', 
      (db as any).homeDropCaptures,
      (db as any).homeDropPhotos,
      (db as any).homeDropAssignments,
      (db as any).homeDropSyncQueue,
      async () => {
        await (db as any).homeDropCaptures?.clear();
        await (db as any).homeDropPhotos?.clear();
        await (db as any).homeDropAssignments?.clear();
        await (db as any).homeDropSyncQueue?.clear();
      }
    );
  },
  
  /**
   * Export home drops for QGIS/QField
   */
  async exportToGeoPackage(projectId?: string) {
    const query = projectId 
      ? (db as any).homeDropCaptures?.where('projectId').equals(projectId)
      : (db as any).homeDropCaptures?.toArray();
    
    const homeDrops = await query;
    
    return homeDrops?.map((hd: HomeDropCapture) => ({
      id: hd.id,
      poleNumber: hd.poleNumber,
      customerName: hd.customer.name,
      customerAddress: hd.customer.address,
      latitude: hd.gpsLocation?.latitude || 0,
      longitude: hd.gpsLocation?.longitude || 0,
      installationDate: hd.capturedAt?.toISOString() || '',
      status: hd.status,
      opticalPower: hd.installation.powerReadings.opticalPower,
      serviceActive: hd.installation.serviceConfig.activationStatus || false,
      technicianName: hd.capturedByName,
      geometry: {
        type: 'Point' as const,
        coordinates: [
          hd.gpsLocation?.longitude || 0,
          hd.gpsLocation?.latitude || 0
        ]
      }
    }));
  }
};

// Export extended database type
export type HomeDropDB = FibreFieldDB & HomeDropDatabase;