// Pole Sync Service - Offline queue and sync management
import { db } from '@/lib/database';
import { liveQuery } from 'dexie';
import { log } from '@/lib/logger';
import { fibreFlowApi } from './fibreflow-api.service';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { PoleCapture, PolePhoto, CapturedPhoto } from './core-pole-capture.service';
import { poleCaptureService } from './pole-capture.service';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ poleId: string; error: string }>;
}

interface SyncStatistics {
  totalQueue: number;
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  nextSync?: Date;
}

class PoleSyncService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 5000; // 5 seconds
  private readonly SYNC_BATCH_SIZE = 5;
  private syncInProgress = false;
  private syncInterval?: NodeJS.Timeout;
  
  constructor() {
    // Initialize sync service and listen for online/offline events
    this.startPeriodicSync();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }
  
  // Handle online event
  private handleOnline = () => {
    log.info('Network online - starting sync', {}, 'PoleSyncService');
    this.startPeriodicSync();
    this.forceSyncNow(); // Immediate sync attempt
  };
  
  // Handle offline event
  private handleOffline = () => {
    log.info('Network offline - stopping sync', {}, 'PoleSyncService');
    this.stopPeriodicSync();
  };
  
  // Get sync queue for poles
  async getSyncQueue(): Promise<PoleCapture[]> {
    try {
      return await db.poleCaptures
        .where('syncStatus')
        .anyOf(['pending', 'error'])
        .toArray();
    } catch (error) {
      log.error('Failed to get sync queue', {}, 'PoleSyncService', error);
      throw error;
    }
  }
  
  // Get sync queue with detailed status
  async getDetailedSyncQueue(): Promise<{
    pending: PoleCapture[];
    syncing: PoleCapture[];
    errors: PoleCapture[];
  }> {
    try {
      const pending = await db.poleCaptures
        .where('syncStatus')
        .equals('pending')
        .toArray();
      
      const syncing = await db.poleCaptures
        .where('syncStatus')
        .equals('syncing')
        .toArray();
      
      const errors = await db.poleCaptures
        .where('syncStatus')
        .equals('error')
        .toArray();
      
      return { pending, syncing, errors };
    } catch (error) {
      log.error('Failed to get detailed sync queue', {}, 'PoleSyncService', error);
      throw error;
    }
  }
  
  // Mark as synced
  async markAsSynced(poleNumber: string): Promise<void> {
    try {
      await db.poleCaptures.update(poleNumber, {
        status: 'synced',
        syncStatus: 'synced',
        syncError: undefined,
        updatedAt: new Date()
      });
      
      log.info('Marked pole as synced', { poleNumber }, 'PoleSyncService');
    } catch (error) {
      log.error('Failed to mark as synced', { poleNumber }, 'PoleSyncService', error);
      throw error;
    }
  }
  
  // Mark sync error
  async markSyncError(poleNumber: string, error: string): Promise<void> {
    try {
      await db.poleCaptures.update(poleNumber, {
        syncStatus: 'error',
        syncError: error,
        updatedAt: new Date()
      });
      
      log.error('Marked pole sync error', { poleNumber, error }, 'PoleSyncService');
    } catch (syncError) {
      log.error('Failed to mark sync error', { poleNumber, error }, 'PoleSyncService', syncError);
      throw syncError;
    }
  }
  
  // Mark sync in progress
  async markSyncInProgress(poleNumber: string): Promise<void> {
    try {
      await db.poleCaptures.update(poleNumber, {
        syncStatus: 'syncing',
        syncError: undefined,
        updatedAt: new Date()
      });
      
      log.info('Marked pole sync in progress', { poleNumber }, 'PoleSyncService');
    } catch (error) {
      log.error('Failed to mark sync in progress', { poleNumber }, 'PoleSyncService', error);
      throw error;
    }
  }
  
  // Process sync queue (batch processing)
  async processSyncQueue(): Promise<SyncResult> {
    if (this.syncInProgress) {
      log.warn('Sync already in progress, skipping', {}, 'PoleSyncService');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }
    
    if (!navigator.onLine) {
      log.info('Cannot sync - offline', {}, 'PoleSyncService');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }
    
    this.syncInProgress = true;
    
    try {
      const syncQueue = await this.getSyncQueue();
      const batch = syncQueue.slice(0, this.SYNC_BATCH_SIZE);
      
      if (batch.length === 0) {
        log.info('No items in sync queue', {}, 'PoleSyncService');
        return { success: false, synced: 0, failed: 0, errors: [] };
      }
      
      log.info('Processing sync queue batch', { batchSize: batch.length }, 'PoleSyncService');
      
      let successful = 0;
      let failed = 0;
      const errors: Array<{ poleId: string; error: string }> = [];
      
      for (const poleCapture of batch) {
        try {
          if (!poleCapture.poleNumber) {
            throw new Error('Pole number is missing');
          }
          
          await this.markSyncInProgress(poleCapture.poleNumber);
          await this.syncPoleCapture(poleCapture);
          await this.markAsSynced(poleCapture.poleNumber);
          successful++;
          
          log.info('Synced pole successfully', { poleNumber: poleCapture.poleNumber }, 'PoleSyncService');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          await this.markSyncError(poleCapture.poleNumber || 'unknown', errorMsg);
          failed++;
          errors.push({
            poleId: poleCapture.poleNumber || 'unknown',
            error: errorMsg
          });
        }
      }
      
      const result = {
        success: failed === 0,
        synced: successful,
        failed,
        errors
      };
      
      log.info('Completed sync queue processing', result, 'PoleSyncService');
      return result;
      
    } catch (error) {
      log.error('Failed to process sync queue', {}, 'PoleSyncService', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  // Sync single pole capture
  async syncPoleCapture(capture: PoleCapture): Promise<void> {
    if (!capture.id) {
      throw new Error('Capture ID is required for sync');
    }
    
    try {
      // Update status to syncing
      await poleCaptureService.updatePoleCapture(capture.id, {
        syncStatus: 'syncing'
      });
      
      // Upload photos first
      const uploadedPhotos = await this.uploadPhotos(capture.id, capture.photos);
      
      // Prepare data for API
      const syncData = {
        poleNumber: capture.poleNumber || capture.id,
        projectId: capture.projectId,
        location: capture.gpsLocation ? {
          latitude: capture.gpsLocation.latitude,
          longitude: capture.gpsLocation.longitude,
          accuracy: capture.gpsLocation.accuracy
        } : undefined,
        photos: uploadedPhotos.map(photo => ({
          type: photo.type,
          url: photo.uploadUrl || photo.data,
          capturedAt: photo.capturedAt
        })),
        notes: capture.notes,
        capturedBy: capture.capturedBy,
        capturedAt: capture.capturedAt || capture.createdAt,
        metadata: {
          app: 'FibreField',
          version: '1.0.0',
          offline: true
        }
      };
      
      // Send to FibreFlow API
      await fibreFlowApi.syncPoleInstallation(syncData as any);
      
      // Mark as synced
      await poleCaptureService.markAsSynced(capture.id);
      
      log.info(`Successfully synced pole ${capture.id}`, {}, "PolesyncService");
    } catch (error) {
      log.error(`Failed to sync pole ${capture.id}:`, {}, "PolesyncService", error);
      
      // Mark sync error
      await poleCaptureService.markSyncError(
        capture.id,
        error instanceof Error ? error.message : 'Sync failed'
      );
      
      throw error;
    }
  }
  
  // Upload photos to Firebase Storage
  private async uploadPhotos(poleId: string, photos: CapturedPhoto[]): Promise<PolePhoto[]> {
    const uploadedPhotos: PolePhoto[] = [];
    
    for (const photo of photos) {
      try {
        // Convert base64 to blob
        const blob = await this.base64ToBlob(photo.data);
        
        // Create storage reference
        const storageRef = ref(
          storage,
          `pole-captures/${poleId}/${photo.type}_${Date.now()}.jpg`
        );
        
        // Upload to Firebase Storage
        const snapshot = await uploadBytes(storageRef, blob, {
          contentType: 'image/jpeg',
          customMetadata: {
            poleId,
            photoType: photo.type,
            capturedAt: photo.timestamp.toISOString()
          }
        });
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Create photo record
        const polePhoto: PolePhoto = {
          id: photo.id,
          poleId,
          type: photo.type,
          data: photo.data, // Keep original for offline access
          size: photo.size,
          compressed: photo.compressed,
          uploadStatus: 'uploaded',
          uploadUrl: downloadURL,
          capturedAt: photo.timestamp,
          uploadedAt: new Date()
        };
        
        // Update photo in database
        await db.polePhotos.update(photo.id, {
          uploadStatus: 'uploaded',
          uploadUrl: downloadURL,
          uploadedAt: new Date()
        });
        
        uploadedPhotos.push(polePhoto);
      } catch (error) {
        log.error(`Failed to upload photo ${photo.id}:`, {}, "PolesyncService", error);
        
        // Mark photo upload as failed
        await db.polePhotos.update(photo.id, {
          uploadStatus: 'error',
          uploadError: error instanceof Error ? error.message : 'Upload failed'
        });
        
        // Continue with other photos
      }
    }
    
    return uploadedPhotos;
  }
  
  // Convert base64 to blob
  private async base64ToBlob(base64: string): Promise<Blob> {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: 'image/jpeg' });
  }
  
  // Retry failed syncs
  async retryFailed(): Promise<SyncResult> {
    const failedCaptures = await db.poleCaptures
      .where('syncStatus')
      .equals('error')
      .toArray();
    
    log.info(`Retrying ${failedCaptures.length} failed syncs`, {}, "PolesyncService");
    
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    
    for (const capture of failedCaptures) {
      try {
        await this.syncPoleCapture(capture);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          poleId: capture.id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return result;
  }
  
  // Clear synced captures (optional cleanup)
  async clearSynced(): Promise<number> {
    const syncedCaptures = await db.poleCaptures
      .where('status')
      .equals('synced')
      .toArray();
    
    let cleared = 0;
    
    for (const capture of syncedCaptures) {
      if (capture.id) {
        await poleCaptureService.deletePoleCapture(capture.id);
        cleared++;
      }
    }
    
    log.info(`Cleared ${cleared} synced captures`, {}, "PolesyncService");
    return cleared;
  }
  
  // Get sync statistics
  async getSyncStatistics(): Promise<SyncStatistics> {
    try {
      const total = await db.poleCaptures.count();
      const pending = await db.poleCaptures.where('syncStatus').equals('pending').count();
      const processing = await db.poleCaptures.where('syncStatus').equals('syncing').count();
      const failed = await db.poleCaptures.where('syncStatus').equals('error').count();
      const completed = await db.poleCaptures.where('syncStatus').equals('synced').count();
      
      const nextSyncItems = await db.poleCaptures
        .where('syncStatus')
        .equals('pending')
        .limit(1)
        .toArray();
      
      const stats: SyncStatistics = {
        totalQueue: total,
        pending,
        processing,
        failed,
        completed,
        nextSync: nextSyncItems.length > 0 ? nextSyncItems[0].updatedAt : undefined
      };
      
      log.info('Generated sync statistics', stats, 'PoleSyncService');
      return stats;
    } catch (error) {
      log.error('Failed to get sync statistics', {}, 'PoleSyncService', error);
      throw error;
    }
  }
  
  // Start periodic sync
  startPeriodicSync(intervalMs: number = 60000): void { // Default 1 minute
    this.stopPeriodicSync(); // Clear any existing interval
    
    this.syncInterval = setInterval(async () => {
      try {
        if (navigator.onLine && !this.syncInProgress) {
          await this.processSyncQueue();
        }
      } catch (error) {
        log.error('Periodic sync failed', {}, 'PoleSyncService', error);
      }
    }, intervalMs);
    
    log.info('Started periodic sync', { intervalMs }, 'PoleSyncService');
  }
  
  // Stop periodic sync
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
      log.info('Stopped periodic sync', {}, 'PoleSyncService');
    }
  }
  
  // Force sync now
  async forceSyncNow(): Promise<SyncResult> {
    try {
      log.info('Force sync initiated', {}, 'PoleSyncService');
      return await this.processSyncQueue();
    } catch (error) {
      log.error('Force sync failed', {}, 'PoleSyncService', error);
      throw error;
    }
  }
  
  // Clear sync errors (retry all failed)
  async clearSyncErrors(): Promise<number> {
    try {
      const erroredPoles = await db.poleCaptures
        .where('syncStatus')
        .equals('error')
        .toArray();
      
      for (const pole of erroredPoles) {
        if (pole.poleNumber) {
          await db.poleCaptures.update(pole.poleNumber, {
            syncStatus: 'pending',
            syncError: undefined,
            updatedAt: new Date()
          });
        }
      }
      
      log.info('Cleared sync errors', { count: erroredPoles.length }, 'PoleSyncService');
      return erroredPoles.length;
    } catch (error) {
      log.error('Failed to clear sync errors', {}, 'PoleSyncService', error);
      throw error;
    }
  }
  
  // Check if sync is currently in progress
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
  
  // Live query for sync queue
  watchSyncQueue() {
    return liveQuery(() => 
      db.poleCaptures
        .where('syncStatus')
        .anyOf(['pending', 'error'])
        .toArray()
    );
  }
  
  // Live query for sync statistics
  watchSyncStatistics() {
    return liveQuery(async () => {
      return await this.getSyncStatistics();
    });
  }
  
  // Get sync status (compatibility with existing code)
  async getSyncStatus() {
    const stats = await this.getSyncStatistics();
    
    return {
      online: navigator.onLine,
      syncing: this.syncInProgress,
      autoSync: this.syncInterval !== undefined,
      pending: stats.pending,
      synced: stats.completed,
      errors: stats.failed,
      total: stats.totalQueue
    };
  }
}

export const poleSyncService = new PoleSyncService();