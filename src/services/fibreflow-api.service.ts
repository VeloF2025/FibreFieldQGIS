// FibreFlow API service for integration with main FibreFlow system
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions, getFirebaseErrorMessage } from '@/lib/firebase';
import { getCurrentUser, getCurrentUserId } from '@/lib/auth';
import { localDB } from '@/lib/database';
import { log } from '@/lib/logger';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PoleInstallationSyncData {
  id?: string;
  vfPoleId: string;
  projectId: string;
  plannedPoleId?: string;
  contractorId: string;
  capturedBy: string;
  photos: {
    type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
    url: string;
    localPath?: string;
    metadata?: any;
  }[];
  gpsCoordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  status: 'in-progress' | 'completed' | 'requires-review';
  capturedAt: Date;
  metadata?: any;
}

export interface ProjectSyncData {
  id?: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'pending' | 'on-hold';
  type: 'FTTH' | 'FTTB' | 'FTTC' | 'P2P';
  clientId?: string;
  contractorId?: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  phases?: any[];
}

// FibreFlow API Service Class
export class FibreFlowApiService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private isOnline = navigator.onLine;

  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      log.info('Back online', { isOnline: true }, 'FibreFlowApiService');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      log.info('Offline mode', { isOnline: false }, 'FibreFlowApiService');
    });
  }

  // Cache management
  private setCacheItem(key: string, data: any, ttlMinutes: number = 30) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  private getCacheItem(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  // Authentication helpers
  private async getAuthToken(): Promise<string | null> {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  private async callFunction<T>(
    functionName: string, 
    data?: any, 
    useCache: boolean = false,
    cacheTtl: number = 30
  ): Promise<T> {
    const cacheKey = `${functionName}_${JSON.stringify(data)}`;
    
    // Return cached data if available and requested
    if (useCache) {
      const cached = this.getCacheItem(cacheKey);
      if (cached) {
        log.debug('Using cached data', { functionName }, 'FibreFlowApiService');
        return cached;
      }
    }

    // Check if user is authenticated
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    try {
      // Call Firebase function
      const callable = httpsCallable(functions, functionName);
      const result: HttpsCallableResult<ApiResponse<T>> = await callable(data);
      
      const response = result.data;
      
      if (!response.success) {
        throw new Error(response.error || 'API call failed');
      }

      // Cache successful responses
      if (useCache && response.data) {
        this.setCacheItem(cacheKey, response.data, cacheTtl);
      }

      return response.data as T;
    } catch (error: any) {
      log.error('API call failed', { functionName, error: error.message }, 'FibreFlowApiService', error);
      
      // Try to return cached data on error if available
      if (useCache) {
        const cached = this.getCacheItem(cacheKey);
        if (cached) {
          log.info('Fallback to cached data', { functionName }, 'FibreFlowApiService');
          return cached;
        }
      }
      
      throw new Error(getFirebaseErrorMessage(error));
    }
  }

  // Projects API
  async getProjects(useCache: boolean = true): Promise<ProjectSyncData[]> {
    return await this.callFunction<ProjectSyncData[]>('getProjects', {}, useCache, 15);
  }

  async getProject(projectId: string, useCache: boolean = true): Promise<ProjectSyncData> {
    return await this.callFunction<ProjectSyncData>('getProject', { projectId }, useCache, 30);
  }

  async createProject(project: Omit<ProjectSyncData, 'id'>): Promise<ProjectSyncData> {
    return await this.callFunction<ProjectSyncData>('createProject', project);
  }

  async updateProject(projectId: string, updates: Partial<ProjectSyncData>): Promise<ProjectSyncData> {
    return await this.callFunction<ProjectSyncData>('updateProject', { projectId, updates });
  }

  // Planned Poles API
  async getPlannedPoles(projectId?: string, useCache: boolean = true): Promise<any[]> {
    return await this.callFunction<any[]>('getPlannedPoles', { projectId }, useCache, 20);
  }

  async getPlannedPole(poleId: string, useCache: boolean = true): Promise<any> {
    return await this.callFunction<any>('getPlannedPole', { poleId }, useCache, 30);
  }

  // Pole Installations API
  async syncPoleInstallation(installation: PoleInstallationSyncData): Promise<{ id: string; syncedAt: Date }> {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return await this.callFunction<{ id: string; syncedAt: Date }>('syncPoleInstallation', {
      ...installation,
      capturedBy: userId
    });
  }

  async getPoleInstallations(
    filters?: {
      projectId?: string;
      contractorId?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    useCache: boolean = true
  ): Promise<PoleInstallationSyncData[]> {
    return await this.callFunction<PoleInstallationSyncData[]>('getPoleInstallations', filters, useCache, 10);
  }

  // Contractors API
  async getContractors(useCache: boolean = true): Promise<any[]> {
    return await this.callFunction<any[]>('getContractors', {}, useCache, 60);
  }

  async getContractor(contractorId: string, useCache: boolean = true): Promise<any> {
    return await this.callFunction<any>('getContractor', { contractorId }, useCache, 60);
  }

  // User assignments
  async getUserAssignments(userId?: string, useCache: boolean = true): Promise<any[]> {
    const targetUserId = userId || getCurrentUserId();
    if (!targetUserId) {
      throw new Error('User ID required');
    }

    return await this.callFunction<any[]>('getUserAssignments', { userId: targetUserId }, useCache, 5);
  }

  // File upload
  async uploadFile(file: File, path: string): Promise<{ url: string; path: string }> {
    if (!this.isOnline) {
      throw new Error('File upload requires internet connection');
    }

    // Convert file to base64 for transfer
    const base64 = await this.fileToBase64(file);
    
    return await this.callFunction<{ url: string; path: string }>('uploadFile', {
      filename: file.name,
      contentType: file.type,
      data: base64,
      path
    });
  }

  // Batch operations for offline sync
  async batchSyncPoleInstallations(installations: PoleInstallationSyncData[]): Promise<{
    successful: { localId: number; remoteId: string }[];
    failed: { localId: number; error: string }[];
  }> {
    return await this.callFunction<{
      successful: { localId: number; remoteId: string }[];
      failed: { localId: number; error: string }[];
    }>('batchSyncPoleInstallations', { installations });
  }

  // Health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: string; version?: string }> {
    try {
      return await this.callFunction<{ status: 'ok' | 'error'; timestamp: string; version?: string }>('healthCheck');
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Utility methods
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    log.info('API cache cleared', { cacheSize: this.cache.size }, 'FibreFlowApiService');
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Connection status
  isConnected(): boolean {
    return this.isOnline;
  }

  // Store API call in offline queue when offline
  private async queueOfflineAction(action: string, data: any): Promise<void> {
    await localDB.offlineQueue.add({
      type: 'data-sync',
      action: 'create',
      data: { action, ...data },
      priority: 'medium',
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

// Create and export singleton instance
export const fibreFlowApi = new FibreFlowApiService();

// Export convenience functions
export const syncPoleInstallation = (installation: PoleInstallationSyncData) => 
  fibreFlowApi.syncPoleInstallation(installation);

export const getProjects = (useCache: boolean = true) => 
  fibreFlowApi.getProjects(useCache);

export const getUserAssignments = (userId?: string, useCache: boolean = true) => 
  fibreFlowApi.getUserAssignments(userId, useCache);

export const healthCheck = () => 
  fibreFlowApi.healthCheck();

export default fibreFlowApi;