// Dexie database setup for offline storage
import Dexie, { Table } from 'dexie';
import { 
  PoleInstallation, 
  PlannedPole, 
  Project, 
  Contractor, 
  Staff, 
  OfflineQueueItem, 
  Photo 
} from '@/types';
import { UserProfile } from '@/lib/auth';

// Local database interface extending the main types with local-specific fields
export interface LocalPoleInstallation extends Omit<PoleInstallation, 'id'> {
  id?: number; // Local auto-increment ID
  remoteId?: string; // Firebase document ID when synced
  isOffline: boolean;
  syncAttempts: number;
  lastSyncAttempt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalPlannedPole extends Omit<PlannedPole, 'id'> {
  id?: number;
  remoteId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalProject extends Omit<Project, 'id'> {
  id?: number;
  remoteId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalContractor extends Omit<Contractor, 'id'> {
  id?: number;
  remoteId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalStaff extends Omit<Staff, 'id'> {
  id?: number;
  remoteId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalPhoto extends Omit<Photo, 'id'> {
  id?: number;
  remoteId?: string;
  localPath: string;
  remotePath?: string;
  url?: string;
  uploaded: boolean;
  compressed: boolean;
  poleInstallationId?: number; // Local reference
  createdAt: Date;
}

export interface LocalUserProfile extends UserProfile {
  id?: string; // uid is used as ID
  cachedAt: Date;
  lastAccessAt?: Date;
}

export interface LocalOfflineQueueItem extends Omit<OfflineQueueItem, 'id'> {
  id?: number;
  type: 'pole-installation' | 'photo-upload' | 'data-sync' | 'project-sync';
  action: 'create' | 'update' | 'delete';
  data: any;
  photos?: number[]; // Local photo IDs
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  maxAttempts: number;
  nextAttempt?: Date;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Sync metadata for tracking last sync times
export interface SyncMetadata {
  id?: number;
  collection: string;
  lastSyncAt: Date;
  syncDirection: 'up' | 'down' | 'both';
  recordCount: number;
  errors?: string[];
}

// App settings stored locally
export interface AppSettings {
  id?: number;
  key: string;
  value: any;
  updatedAt: Date;
}

// Pole capture interfaces (simplified for database)
export interface PoleCapture {
  id?: string; // Pole number as UID
  projectId: string;
  projectName?: string;
  poleNumber?: string;
  status: 'draft' | 'in_progress' | 'captured' | 'synced' | 'error';
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    heading?: number;
    speed?: number;
  };
  capturedAt?: Date;
  photos: any[]; // Simplified for storage
  requiredPhotos: string[];
  completedPhotos: string[];
  notes?: string;
  capturedBy?: string;
  capturedByName?: string;
  createdAt: Date;
  updatedAt: Date;
  currentStep?: number;
  totalSteps?: number;
  lastSavedStep?: number;
  nearestPoles?: Array<{
    poleNumber: string;
    distance: number;
    latitude: number;
    longitude: number;
  }>;
}

export interface PolePhoto {
  id: string;
  poleId: string;
  type: string;
  data: string;
  size: number;
  compressed: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadUrl?: string;
  uploadError?: string;
  capturedAt: Date;
  uploadedAt?: Date;
}

// FibreField local database class
export class FibreFieldDB extends Dexie {
  // Local data tables
  poleInstallations!: Table<LocalPoleInstallation, number>;
  plannedPoles!: Table<LocalPlannedPole, number>;
  projects!: Table<LocalProject, number>;
  contractors!: Table<LocalContractor, number>;
  staff!: Table<LocalStaff, number>;
  photos!: Table<LocalPhoto, number>;
  userProfiles!: Table<LocalUserProfile, string>;
  
  // Pole capture tables
  poleCaptures!: Table<PoleCapture, string>;
  polePhotos!: Table<PolePhoto, string>;
  
  // Queue and sync management
  offlineQueue!: Table<LocalOfflineQueueItem, number>;
  syncMetadata!: Table<SyncMetadata, number>;
  appSettings!: Table<AppSettings, number>;

  constructor() {
    super('FibreFieldDB');
    
    // Define schemas with indexes for efficient querying
    this.version(1).stores({
      // Core data tables
      poleInstallations: '++id, remoteId, projectId, plannedPoleId, contractorId, capturedBy, status, isOffline, capturedAt, syncedAt',
      plannedPoles: '++id, remoteId, projectId, poleNumber, status, assignedTo, contractorId, lastSyncedAt',
      projects: '++id, remoteId, title, status, type, clientId, startDate, lastSyncedAt',
      contractors: '++id, remoteId, name, email, company, status, lastSyncedAt',
      staff: '++id, remoteId, name, email, contractorId, isActive, lastSyncedAt',
      photos: '++id, remoteId, type, poleInstallationId, localPath, uploaded, compressed, createdAt',
      userProfiles: '&uid, email, role, contractorId, isActive, cachedAt',
      
      // Pole capture tables
      poleCaptures: '&id, projectId, poleNumber, status, syncStatus, capturedBy, capturedAt, createdAt, updatedAt',
      polePhotos: '&id, poleId, type, uploadStatus, capturedAt, uploadedAt',
      
      // Queue and sync management
      offlineQueue: '++id, type, action, status, priority, attempts, nextAttempt, createdAt',
      syncMetadata: '++id, collection, lastSyncAt, syncDirection',
      appSettings: '++id, &key, updatedAt'
    });

    // Add hooks for automatic timestamps
    this.poleInstallations.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || new Date();
      obj.updatedAt = new Date();
    });

    this.poleInstallations.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.photos.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || new Date();
    });

    this.offlineQueue.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || new Date();
      obj.updatedAt = new Date();
    });

    this.offlineQueue.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    // Add hooks for all other tables
    const addTimestampHooks = (table: Table<any, any>) => {
      table.hook('creating', (primKey, obj, trans) => {
        obj.createdAt = obj.createdAt || new Date();
        obj.updatedAt = new Date();
      });
      
      table.hook('updating', (modifications, primKey, obj, trans) => {
        modifications.updatedAt = new Date();
      });
    };

    addTimestampHooks(this.plannedPoles);
    addTimestampHooks(this.projects);
    addTimestampHooks(this.contractors);
    addTimestampHooks(this.staff);
    addTimestampHooks(this.appSettings);
  }

  // Utility methods for common operations
  
  // Clear all data (for testing/reset)
  async clearAllData() {
    await this.transaction('rw', this.tables, async () => {
      for (const table of this.tables) {
        await table.clear();
      }
    });
  }

  // Get database size and statistics
  async getStats() {
    const stats = {
      poleInstallations: await this.poleInstallations.count(),
      plannedPoles: await this.plannedPoles.count(),
      projects: await this.projects.count(),
      contractors: await this.contractors.count(),
      staff: await this.staff.count(),
      photos: await this.photos.count(),
      userProfiles: await this.userProfiles.count(),
      offlineQueue: await this.offlineQueue.count(),
      syncMetadata: await this.syncMetadata.count(),
      appSettings: await this.appSettings.count()
    };

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    return {
      ...stats,
      total,
      version: this.verno,
      dbName: this.name
    };
  }

  // Get pending sync items count
  async getPendingSyncCount() {
    return await this.offlineQueue
      .where('status')
      .equals('pending')
      .count();
  }

  // Get last sync time for a collection
  async getLastSyncTime(collection: string) {
    const metadata = await this.syncMetadata
      .where('collection')
      .equals(collection)
      .first();
    
    return metadata?.lastSyncAt || null;
  }

  // Update last sync time for a collection
  async updateLastSyncTime(collection: string, direction: 'up' | 'down' | 'both' = 'both', recordCount: number = 0) {
    await this.syncMetadata.put({
      collection,
      lastSyncAt: new Date(),
      syncDirection: direction,
      recordCount
    });
  }

  // App settings helpers
  async getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const setting = await this.appSettings.where('key').equals(key).first();
    return setting ? setting.value : defaultValue;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.appSettings.put({
      key,
      value,
      updatedAt: new Date()
    });
  }
}

// Create and export database instance
export const localDB = new FibreFieldDB();
export const db = localDB; // Alias for compatibility

// Initialize database and handle version upgrades
export const initializeDatabase = async () => {
  try {
    await localDB.open();
    console.log('✅ FibreField local database initialized');
    
    // Set default settings if they don't exist
    const hasSettings = await localDB.appSettings.count();
    if (hasSettings === 0) {
      await localDB.appSettings.bulkAdd([
        { key: 'theme', value: 'light', updatedAt: new Date() },
        { key: 'autoSync', value: true, updatedAt: new Date() },
        { key: 'syncInterval', value: 5, updatedAt: new Date() }, // minutes
        { key: 'photoQuality', value: 0.8, updatedAt: new Date() },
        { key: 'maxPhotoSize', value: 10, updatedAt: new Date() }, // MB
        { key: 'offlineMode', value: false, updatedAt: new Date() }
      ]);
      console.log('✅ Default app settings created');
    }
    
    const stats = await localDB.getStats();
    console.log('📊 Database stats:', stats);
    
    return localDB;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Export types for use in other modules
export type {
  LocalPoleInstallation,
  LocalPlannedPole,
  LocalProject,
  LocalContractor,
  LocalStaff,
  LocalPhoto,
  LocalUserProfile,
  LocalOfflineQueueItem,
  SyncMetadata,
  AppSettings
};