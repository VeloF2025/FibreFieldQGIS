// Core Pole Capture Service - CRUD operations and workflow management
import { db, type FibreFieldDB } from '@/lib/database';
import { liveQuery } from 'dexie';
import { log } from '@/lib/logger';

export type PhotoType = 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';

export interface CapturedPhoto {
  id: string;
  type: PhotoType;
  data: string; // Base64 encoded
  timestamp: Date;
  size: number;
  compressed: boolean;
}

export interface PoleCapture {
  id?: string; // Pole number as UID
  projectId: string;
  projectName?: string;
  poleNumber?: string; // Optional, can be auto-generated
  status: 'draft' | 'in_progress' | 'captured' | 'synced' | 'error';
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  
  // GPS Data
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    heading?: number;
    speed?: number;
  };
  capturedAt?: Date;
  
  // Photos
  photos: CapturedPhoto[];
  requiredPhotos: PhotoType[];
  completedPhotos: PhotoType[];
  
  // Metadata
  notes?: string;
  capturedBy?: string;
  capturedByName?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Progress tracking
  currentStep?: number;
  totalSteps?: number;
  lastSavedStep?: number;
  
  // Nearest pole detection
  nearestPoles?: Array<{
    poleNumber: string;
    distance: number; // in meters
    latitude: number;
    longitude: number;
  }>;
}

export interface PolePhoto {
  id: string;
  poleId: string;
  type: PhotoType;
  data: string;
  size: number;
  compressed: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadUrl?: string;
  uploadError?: string;
  capturedAt: Date;
  uploadedAt?: Date;
}

class CorePoleCaptureService {
  private readonly REQUIRED_PHOTOS: PhotoType[] = ['before', 'front', 'side']; // Minimum required
  
  constructor() {
    // Initialize service
    this.setupIndexes();
  }
  
  private async setupIndexes() {
    // Indexes are already set up in database.ts
  }
  
  // Create new pole capture session
  async createPoleCapture(data: Partial<PoleCapture>): Promise<string> {
    try {
      const poleNumber = data.poleNumber || this.generatePoleNumber();
      
      const poleCapture: PoleCapture = {
        ...data,
        id: poleNumber, // Use pole number as UID
        poleNumber,
        status: 'draft',
        syncStatus: 'pending',
        photos: [],
        requiredPhotos: this.REQUIRED_PHOTOS,
        completedPhotos: [],
        currentStep: 1,
        totalSteps: 4,
        lastSavedStep: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.poleCaptures.put(poleCapture);
      log.info('Created new pole capture', { poleNumber }, 'CorePoleCaptureService');
      return poleNumber;
    } catch (error) {
      log.error('Failed to create pole capture', data, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Get pole capture by ID (pole number)
  async getPoleCapture(poleNumber: string): Promise<PoleCapture | undefined> {
    try {
      return await db.poleCaptures.get(poleNumber);
    } catch (error) {
      log.error('Failed to get pole capture', { poleNumber }, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Get all pole captures
  async getAllPoleCaptures(): Promise<PoleCapture[]> {
    try {
      return await db.poleCaptures.toArray();
    } catch (error) {
      log.error('Failed to get all pole captures', {}, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Get in-progress captures (for resuming work)
  async getInProgressCaptures(): Promise<PoleCapture[]> {
    try {
      return await db.poleCaptures
        .where('status')
        .equals('in_progress')
        .toArray();
    } catch (error) {
      log.error('Failed to get in-progress captures', {}, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Update pole capture
  async updatePoleCapture(poleNumber: string, updates: Partial<PoleCapture>): Promise<void> {
    try {
      const existing = await this.getPoleCapture(poleNumber);
      if (!existing) {
        throw new Error(`Pole capture ${poleNumber} not found`);
      }
      
      await db.poleCaptures.update(poleNumber, {
        ...updates,
        updatedAt: new Date()
      });
      
      log.info('Updated pole capture', { poleNumber, updates: Object.keys(updates) }, 'CorePoleCaptureService');
    } catch (error) {
      log.error('Failed to update pole capture', { poleNumber, updates }, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Save progress (for resuming later)
  async saveProgress(poleNumber: string, step: number, data?: Partial<PoleCapture>): Promise<void> {
    try {
      await this.updatePoleCapture(poleNumber, {
        ...data,
        status: 'in_progress',
        currentStep: step,
        lastSavedStep: step
      });
      
      log.info('Saved progress', { poleNumber, step }, 'CorePoleCaptureService');
    } catch (error) {
      log.error('Failed to save progress', { poleNumber, step, data }, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Update GPS location
  async updateGPSLocation(
    poleNumber: string, 
    location: PoleCapture['gpsLocation']
  ): Promise<void> {
    try {
      await this.updatePoleCapture(poleNumber, {
        gpsLocation: location,
        capturedAt: new Date()
      });
      
      // Find nearest poles if location is provided
      if (location) {
        const nearestPoles = await this.findNearestPoles(
          location.latitude,
          location.longitude
        );
        
        await this.updatePoleCapture(poleNumber, {
          nearestPoles
        });
      }
      
      log.info('Updated GPS location', { poleNumber, location }, 'CorePoleCaptureService');
    } catch (error) {
      log.error('Failed to update GPS location', { poleNumber, location }, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Find nearest poles based on GPS
  async findNearestPoles(
    latitude: number,
    longitude: number,
    maxDistance: number = 500, // meters
    limit: number = 5
  ): Promise<PoleCapture['nearestPoles']> {
    try {
      const allPoles = await db.poleCaptures
        .filter(pole => pole.gpsLocation !== undefined && pole.id !== undefined)
        .toArray();
      
      const polesWithDistance = allPoles
        .map(pole => {
          if (!pole.gpsLocation) return null;
          
          const distance = this.calculateDistance(
            latitude,
            longitude,
            pole.gpsLocation.latitude,
            pole.gpsLocation.longitude
          );
          
          return {
            poleNumber: pole.poleNumber || pole.id || '',
            distance,
            latitude: pole.gpsLocation.latitude,
            longitude: pole.gpsLocation.longitude
          };
        })
        .filter((pole): pole is NonNullable<typeof pole> => 
          pole !== null && pole.distance <= maxDistance
        )
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
      
      log.info('Found nearest poles', { latitude, longitude, count: polesWithDistance.length }, 'CorePoleCaptureService');
      return polesWithDistance;
    } catch (error) {
      log.error('Failed to find nearest poles', { latitude, longitude, maxDistance, limit }, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Calculate distance between two GPS points (Haversine formula)
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  // Generate unique pole number
  private generatePoleNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `POLE-${timestamp}-${random}`;
  }
  
  // Delete pole capture
  async deletePoleCapture(poleNumber: string): Promise<void> {
    try {
      // Delete photos first - this will be handled by PolePhotoService
      const photos = await db.polePhotos
        .where('poleId')
        .equals(poleNumber)
        .toArray();
      
      for (const photo of photos) {
        await db.polePhotos.delete(photo.id);
      }
      
      // Delete pole capture
      await db.poleCaptures.delete(poleNumber);
      log.info('Deleted pole capture', { poleNumber }, 'CorePoleCaptureService');
    } catch (error) {
      log.error('Failed to delete pole capture', { poleNumber }, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Get statistics
  async getStatistics() {
    try {
      const total = await db.poleCaptures.count();
      const drafted = await db.poleCaptures.where('status').equals('draft').count();
      const inProgress = await db.poleCaptures.where('status').equals('in_progress').count();
      const captured = await db.poleCaptures.where('status').equals('captured').count();
      const synced = await db.poleCaptures.where('status').equals('synced').count();
      const errors = await db.poleCaptures.where('syncStatus').equals('error').count();
      
      const stats = {
        total,
        drafted,
        inProgress,
        captured,
        synced,
        errors,
        pendingSync: captured
      };
      
      log.info('Generated pole capture statistics', stats, 'CorePoleCaptureService');
      return stats;
    } catch (error) {
      log.error('Failed to get statistics', {}, 'CorePoleCaptureService', error);
      throw error;
    }
  }
  
  // Live query for reactive updates
  watchPoleCaptures() {
    return liveQuery(() => db.poleCaptures.toArray());
  }
  
  watchPoleCapture(poleNumber: string) {
    return liveQuery(() => db.poleCaptures.get(poleNumber));
  }
}

export const corePoleCapture = new CorePoleCaptureService();