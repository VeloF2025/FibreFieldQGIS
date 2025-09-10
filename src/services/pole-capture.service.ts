// Pole Capture Service - Main service combining all pole capture functionality
// This service maintains backward compatibility by re-exporting all functionality from split services

// Import the split services
import { corePoleCapture } from './core-pole-capture.service';
import { polePhotoService } from './pole-photo.service';
import { poleSyncService } from './pole-sync.service';

// Re-export types for compatibility
export type {
  PhotoType,
  CapturedPhoto,
  PoleCapture,
  PolePhoto
} from './core-pole-capture.service';

export type { SyncResult } from './pole-sync.service';

// Main service class that delegates to split services
class PoleCaptureService {
  constructor() {
    // Service is now composed of multiple specialized services
  }
  
  // =========================
  // CORE POLE CAPTURE METHODS (delegate to CorePoleCaptureService)
  // =========================
  
  async createPoleCapture(data: Partial<PoleCapture>): Promise<string> {
    return await corePoleCapture.createPoleCapture(data);
  }
  
  async getPoleCapture(poleNumber: string): Promise<PoleCapture | undefined> {
    return await corePoleCapture.getPoleCapture(poleNumber);
  }
  
  async getAllPoleCaptures(): Promise<PoleCapture[]> {
    return await corePoleCapture.getAllPoleCaptures();
  }
  
  async getInProgressCaptures(): Promise<PoleCapture[]> {
    return await corePoleCapture.getInProgressCaptures();
  }
  
  async updatePoleCapture(poleNumber: string, updates: Partial<PoleCapture>): Promise<void> {
    return await corePoleCapture.updatePoleCapture(poleNumber, updates);
  }
  
  async saveProgress(poleNumber: string, step: number, data?: Partial<PoleCapture>): Promise<void> {
    return await corePoleCapture.saveProgress(poleNumber, step, data);
  }
  
  async updateGPSLocation(poleNumber: string, location: PoleCapture['gpsLocation']): Promise<void> {
    return await corePoleCapture.updateGPSLocation(poleNumber, location);
  }
  
  async findNearestPoles(latitude: number, longitude: number, maxDistance?: number, limit?: number): Promise<PoleCapture['nearestPoles']> {
    return await corePoleCapture.findNearestPoles(latitude, longitude, maxDistance, limit);
  }
  
  async deletePoleCapture(poleNumber: string): Promise<void> {
    return await corePoleCapture.deletePoleCapture(poleNumber);
  }
  
  async getStatistics() {
    return await corePoleCapture.getStatistics();
  }
  
  // =========================
  // PHOTO METHODS (delegate to PolePhotoService)
  // =========================
  
  async addPhoto(poleNumber: string, photo: CapturedPhoto): Promise<void> {
    return await polePhotoService.addPhoto(poleNumber, photo);
  }
  
  async removePhoto(poleNumber: string, photoType: PhotoType): Promise<void> {
    return await polePhotoService.removePhoto(poleNumber, photoType);
  }
  
  async getPolePhotos(poleNumber: string): Promise<PolePhoto[]> {
    return await polePhotoService.getPolePhotos(poleNumber);
  }
  
  // =========================
  // SYNC METHODS (delegate to PoleSyncService)
  // =========================
  
  async getSyncQueue(): Promise<PoleCapture[]> {
    return await poleSyncService.getSyncQueue();
  }
  
  async markAsSynced(poleNumber: string): Promise<void> {
    return await poleSyncService.markAsSynced(poleNumber);
  }
  
  async markSyncError(poleNumber: string, error: string): Promise<void> {
    return await poleSyncService.markSyncError(poleNumber, error);
  }
  
  // =========================
  // LIVE QUERY METHODS
  // =========================
  
  watchPoleCaptures() {
    return corePoleCapture.watchPoleCaptures();
  }
  
  watchPoleCapture(poleNumber: string) {
    return corePoleCapture.watchPoleCapture(poleNumber);
  }
  
  watchSyncQueue() {
    return poleSyncService.watchSyncQueue();
  }
}

export const poleCaptureService = new PoleCaptureService();