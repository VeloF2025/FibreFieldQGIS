// Utility functions for offline data management
import { localDB } from '@/lib/database';
import { offlineSyncService } from '@/services/offline-sync.service';

// Data persistence utilities
export class OfflineDataUtils {
  
  // Check if device is online
  static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // Check if data should be synced
  static shouldSync(lastSyncAt: Date | null, intervalMinutes: number = 5): boolean {
    if (!lastSyncAt) return true;
    
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncAt.getTime()) / (1000 * 60);
    return diffMinutes >= intervalMinutes;
  }

  // Generate unique offline ID
  static generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Convert file to base64 for offline storage
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Convert base64 back to blob
  static base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Compress image for offline storage
  static async compressImage(file: File, quality: number = 0.8, maxWidth: number = 1920): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob || new Blob([''], { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Save file to IndexedDB with compression
  static async saveFileOffline(file: File, compress: boolean = true): Promise<string> {
    try {
      let finalFile: File | Blob = file;
      
      if (compress && file.type.startsWith('image/')) {
        finalFile = await OfflineDataUtils.compressImage(file);
      }
      
      const base64 = await OfflineDataUtils.fileToBase64(finalFile as File);
      const offlineId = OfflineDataUtils.generateOfflineId();
      
      // Store in IndexedDB
      await localDB.appSettings.put({
        key: `offline_file_${offlineId}`,
        value: {
          base64,
          originalName: file.name,
          mimeType: file.type,
          size: finalFile.size,
          compressed: compress,
          createdAt: new Date()
        },
        updatedAt: new Date()
      });
      
      return offlineId;
    } catch (error) {
      console.error('Failed to save file offline:', error);
      throw error;
    }
  }

  // Retrieve file from IndexedDB
  static async getOfflineFile(offlineId: string): Promise<File | null> {
    try {
      const setting = await localDB.appSettings.where('key').equals(`offline_file_${offlineId}`).first();
      
      if (!setting) return null;
      
      const fileData = setting.value;
      const blob = OfflineDataUtils.base64ToBlob(fileData.base64, fileData.mimeType);
      
      return new File([blob], fileData.originalName, { type: fileData.mimeType });
    } catch (error) {
      console.error('Failed to retrieve offline file:', error);
      return null;
    }
  }

  // Clean up old offline files
  static async cleanupOfflineFiles(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const oldFiles = await localDB.appSettings
        .where('key')
        .startsWith('offline_file_')
        .and(setting => {
          const fileData = setting.value;
          return new Date(fileData.createdAt) < cutoffDate;
        })
        .toArray();
      
      const keysToDelete = oldFiles.map(file => file.key);
      await localDB.appSettings.bulkDelete(keysToDelete);
      
      console.log(`🧹 Cleaned up ${keysToDelete.length} old offline files`);
      return keysToDelete.length;
    } catch (error) {
      console.error('Failed to cleanup offline files:', error);
      return 0;
    }
  }

  // Auto-sync when coming online
  static setupAutoSync(intervalMinutes: number = 5): () => void {
    let syncInterval: NodeJS.Timeout;
    
    const startAutoSync = () => {
      if (syncInterval) clearInterval(syncInterval);
      
      syncInterval = setInterval(async () => {
        if (OfflineDataUtils.isOnline()) {
          try {
            const lastSync = await localDB.getLastSyncTime('general');
            if (OfflineDataUtils.shouldSync(lastSync, intervalMinutes)) {
              console.log('🔄 Auto-syncing...');
              await offlineSyncService.syncAll();
            }
          } catch (error) {
            console.error('Auto-sync failed:', error);
          }
        }
      }, intervalMinutes * 60 * 1000);
    };
    
    const handleOnline = () => {
      console.log('📶 Device came online, starting auto-sync');
      startAutoSync();
      
      // Immediate sync when coming online
      setTimeout(async () => {
        try {
          await offlineSyncService.syncAll();
        } catch (error) {
          console.error('Initial online sync failed:', error);
        }
      }, 2000);
    };
    
    const handleOffline = () => {
      console.log('📵 Device went offline, stopping auto-sync');
      if (syncInterval) clearInterval(syncInterval);
    };
    
    // Set up listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Start auto-sync if online
      if (OfflineDataUtils.isOnline()) {
        startAutoSync();
      }
    }
    
    // Return cleanup function
    return () => {
      if (syncInterval) clearInterval(syncInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }

  // Validate data before saving offline
  static validateOfflineData(data: any, requiredFields: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get storage usage information
  static async getStorageInfo(): Promise<{
    used: number;
    quota: number;
    percentage: number;
    readable: { used: string; quota: string };
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;
      
      return {
        used,
        quota,
        percentage,
        readable: {
          used: OfflineDataUtils.formatBytes(used),
          quota: OfflineDataUtils.formatBytes(quota)
        }
      };
    }
    
    return {
      used: 0,
      quota: 0,
      percentage: 0,
      readable: { used: '0 B', quota: '0 B' }
    };
  }

  // Format bytes to human readable
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Export data for backup
  static async exportData(): Promise<{
    poleInstallations: any[];
    photos: any[];
    queueItems: any[];
    settings: any[];
    metadata: any;
  }> {
    const [poleInstallations, photos, queueItems, settings, stats] = await Promise.all([
      localDB.poleInstallations.toArray(),
      localDB.photos.toArray(),
      localDB.offlineQueue.toArray(),
      localDB.appSettings.toArray(),
      localDB.getStats()
    ]);
    
    return {
      poleInstallations,
      photos,
      queueItems,
      settings,
      metadata: {
        exportedAt: new Date(),
        dbVersion: stats.version,
        totalRecords: stats.total
      }
    };
  }

  // Import data from backup
  static async importData(data: {
    poleInstallations?: any[];
    photos?: any[];
    queueItems?: any[];
    settings?: any[];
  }): Promise<void> {
    try {
      await localDB.transaction('rw', localDB.tables, async () => {
        if (data.poleInstallations) {
          await localDB.poleInstallations.bulkAdd(data.poleInstallations);
        }
        if (data.photos) {
          await localDB.photos.bulkAdd(data.photos);
        }
        if (data.queueItems) {
          await localDB.offlineQueue.bulkAdd(data.queueItems);
        }
        if (data.settings) {
          await localDB.appSettings.bulkAdd(data.settings);
        }
      });
      
      console.log('✅ Data import completed successfully');
    } catch (error) {
      console.error('❌ Data import failed:', error);
      throw error;
    }
  }

  // Reset all offline data
  static async resetOfflineData(): Promise<void> {
    try {
      await localDB.clearAllData();
      console.log('🗑️ All offline data cleared');
    } catch (error) {
      console.error('Failed to reset offline data:', error);
      throw error;
    }
  }
}

// Export utilities
export const {
  isOnline,
  shouldSync,
  generateOfflineId,
  fileToBase64,
  base64ToBlob,
  compressImage,
  saveFileOffline,
  getOfflineFile,
  cleanupOfflineFiles,
  setupAutoSync,
  validateOfflineData,
  getStorageInfo,
  formatBytes,
  exportData,
  importData,
  resetOfflineData
} = OfflineDataUtils;