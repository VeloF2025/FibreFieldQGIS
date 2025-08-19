// Pole Sync Service for FibreField
import { poleCaptureService, type PoleCapture, type PolePhoto } from './pole-capture.service';
import { fibreFlowApiService } from './fibreflow-api.service';
import { db } from '@/lib/database';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ poleId: string; error: string }>;
}

class PoleSyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }
  
  // Handle online event
  private handleOnline = () => {
    console.log('Network online - starting sync');
    this.startAutoSync();
    this.syncAll(); // Immediate sync attempt
  };
  
  // Handle offline event
  private handleOffline = () => {
    console.log('Network offline - stopping sync');
    this.stopAutoSync();
  };
  
  // Start automatic sync (every 5 minutes when online)
  startAutoSync(intervalMs: number = 5 * 60 * 1000) {
    this.stopAutoSync(); // Clear any existing interval
    
    if (!navigator.onLine) {
      console.log('Not starting auto-sync - offline');
      return;
    }
    
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncAll();
      }
    }, intervalMs);
    
    console.log(`Auto-sync started (every ${intervalMs / 1000}s)`);
  }
  
  // Stop automatic sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }
  
  // Sync all pending captures
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }
    
    if (!navigator.onLine) {
      console.log('Cannot sync - offline');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }
    
    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    
    try {
      // Get all captures pending sync
      const pendingCaptures = await poleCaptureService.getSyncQueue();
      console.log(`Found ${pendingCaptures.length} captures to sync`);
      
      for (const capture of pendingCaptures) {
        try {
          await this.syncPoleCapture(capture);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            poleId: capture.id || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.success = false;
        }
      }
      
      console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`);
    } catch (error) {
      console.error('Sync error:', error);
      result.success = false;
    } finally {
      this.isSyncing = false;
    }
    
    return result;
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
      await fibreFlowApiService.syncPoleInstallation(syncData as any);
      
      // Mark as synced
      await poleCaptureService.markAsSynced(capture.id);
      
      console.log(`Successfully synced pole ${capture.id}`);
    } catch (error) {
      console.error(`Failed to sync pole ${capture.id}:`, error);
      
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
        console.error(`Failed to upload photo ${photo.id}:`, error);
        
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
    
    console.log(`Retrying ${failedCaptures.length} failed syncs`);
    
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
    
    console.log(`Cleared ${cleared} synced captures`);
    return cleared;
  }
  
  // Get sync status
  async getSyncStatus() {
    const stats = await poleCaptureService.getStatistics();
    
    return {
      online: navigator.onLine,
      syncing: this.isSyncing,
      autoSync: this.syncInterval !== null,
      pending: stats.captured,
      synced: stats.synced,
      errors: stats.errors,
      total: stats.total
    };
  }
}

export const poleSyncService = new PoleSyncService();