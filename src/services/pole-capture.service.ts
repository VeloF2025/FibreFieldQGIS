// Pole Capture Service for FibreField
import { db, type FibreFieldDB } from '@/lib/database';
import { Dexie } from 'dexie';
import { liveQuery } from 'dexie';

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

class PoleCaptureService {
  private readonly PHOTO_TYPES: PhotoType[] = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'];
  private readonly REQUIRED_PHOTOS: PhotoType[] = ['before', 'front', 'side']; // Minimum required
  private readonly MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly COMPRESSION_QUALITY = 0.8;
  
  constructor() {
    // Initialize service
    this.setupIndexes();
  }
  
  private async setupIndexes() {
    // Indexes are already set up in database.ts
  }
  
  // Create new pole capture session
  async createPoleCapture(data: Partial<PoleCapture>): Promise<string> {
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
    return poleNumber;
  }
  
  // Get pole capture by ID (pole number)
  async getPoleCapture(poleNumber: string): Promise<PoleCapture | undefined> {
    return await db.poleCaptures.get(poleNumber);
  }
  
  // Get all pole captures
  async getAllPoleCaptures(): Promise<PoleCapture[]> {
    return await db.poleCaptures.toArray();
  }
  
  // Get in-progress captures (for resuming work)
  async getInProgressCaptures(): Promise<PoleCapture[]> {
    return await db.poleCaptures
      .where('status')
      .equals('in_progress')
      .toArray();
  }
  
  // Update pole capture
  async updatePoleCapture(poleNumber: string, updates: Partial<PoleCapture>): Promise<void> {
    const existing = await this.getPoleCapture(poleNumber);
    if (!existing) {
      throw new Error(`Pole capture ${poleNumber} not found`);
    }
    
    await db.poleCaptures.update(poleNumber, {
      ...updates,
      updatedAt: new Date()
    });
  }
  
  // Save progress (for resuming later)
  async saveProgress(poleNumber: string, step: number, data?: Partial<PoleCapture>): Promise<void> {
    await this.updatePoleCapture(poleNumber, {
      ...data,
      status: 'in_progress',
      currentStep: step,
      lastSavedStep: step
    });
  }
  
  // Add photo to pole capture
  async addPhoto(poleNumber: string, photo: CapturedPhoto): Promise<void> {
    const poleCapture = await this.getPoleCapture(poleNumber);
    if (!poleCapture) {
      throw new Error(`Pole capture ${poleNumber} not found`);
    }
    
    // Compress photo if needed
    const compressedPhoto = await this.compressPhoto(photo);
    
    // Save photo to separate table
    const polePhoto: PolePhoto = {
      id: `${poleNumber}_${photo.type}_${Date.now()}`,
      poleId: poleNumber,
      type: photo.type,
      data: compressedPhoto.data,
      size: compressedPhoto.size,
      compressed: compressedPhoto.compressed,
      uploadStatus: 'pending',
      capturedAt: new Date()
    };
    
    await db.polePhotos.add(polePhoto);
    
    // Update pole capture
    const photos = [...poleCapture.photos, compressedPhoto];
    const completedPhotos = [...new Set(photos.map(p => p.type))];
    
    await this.updatePoleCapture(poleNumber, {
      photos,
      completedPhotos,
      status: completedPhotos.length >= this.REQUIRED_PHOTOS.length ? 'captured' : 'in_progress'
    });
  }
  
  // Remove photo from pole capture
  async removePhoto(poleNumber: string, photoType: PhotoType): Promise<void> {
    const poleCapture = await this.getPoleCapture(poleNumber);
    if (!poleCapture) {
      throw new Error(`Pole capture ${poleNumber} not found`);
    }
    
    // Remove from photos array
    const photos = poleCapture.photos.filter(p => p.type !== photoType);
    const completedPhotos = [...new Set(photos.map(p => p.type))];
    
    // Remove from photos table
    const photosToDelete = await db.polePhotos
      .where('poleId')
      .equals(poleNumber)
      .and(photo => photo.type === photoType)
      .toArray();
    
    for (const photo of photosToDelete) {
      await db.polePhotos.delete(photo.id);
    }
    
    await this.updatePoleCapture(poleNumber, {
      photos,
      completedPhotos,
      status: completedPhotos.length >= this.REQUIRED_PHOTOS.length ? 'captured' : 'in_progress'
    });
  }
  
  // Get photos for a pole
  async getPolePhotos(poleNumber: string): Promise<PolePhoto[]> {
    return await db.polePhotos
      .where('poleId')
      .equals(poleNumber)
      .toArray();
  }
  
  // Update GPS location
  async updateGPSLocation(
    poleNumber: string, 
    location: PoleCapture['gpsLocation']
  ): Promise<void> {
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
  }
  
  // Find nearest poles based on GPS
  async findNearestPoles(
    latitude: number,
    longitude: number,
    maxDistance: number = 500, // meters
    limit: number = 5
  ): Promise<PoleCapture['nearestPoles']> {
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
    
    return polesWithDistance;
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
  
  // Compress photo if needed
  private async compressPhoto(photo: CapturedPhoto): Promise<CapturedPhoto> {
    if (photo.size <= this.MAX_PHOTO_SIZE || photo.compressed) {
      return photo;
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(photo);
          return;
        }
        
        // Calculate new dimensions (max 2048px on longest side)
        const maxDimension = 2048;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(photo);
              return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve({
                ...photo,
                data: base64,
                size: blob.size,
                compressed: true
              });
            };
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          this.COMPRESSION_QUALITY
        );
      };
      
      img.src = photo.data;
    });
  }
  
  // Generate unique pole number
  private generatePoleNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `POLE-${timestamp}-${random}`;
  }
  
  // Delete pole capture
  async deletePoleCapture(poleNumber: string): Promise<void> {
    // Delete photos first
    const photos = await this.getPolePhotos(poleNumber);
    for (const photo of photos) {
      await db.polePhotos.delete(photo.id);
    }
    
    // Delete pole capture
    await db.poleCaptures.delete(poleNumber);
  }
  
  // Get sync queue
  async getSyncQueue(): Promise<PoleCapture[]> {
    return await db.poleCaptures
      .where('syncStatus')
      .anyOf(['pending', 'error'])
      .toArray();
  }
  
  // Mark as synced
  async markAsSynced(poleNumber: string): Promise<void> {
    await this.updatePoleCapture(poleNumber, {
      status: 'synced',
      syncStatus: 'synced',
      syncError: undefined
    });
  }
  
  // Mark sync error
  async markSyncError(poleNumber: string, error: string): Promise<void> {
    await this.updatePoleCapture(poleNumber, {
      syncStatus: 'error',
      syncError: error
    });
  }
  
  // Get statistics
  async getStatistics() {
    const total = await db.poleCaptures.count();
    const drafted = await db.poleCaptures.where('status').equals('draft').count();
    const inProgress = await db.poleCaptures.where('status').equals('in_progress').count();
    const captured = await db.poleCaptures.where('status').equals('captured').count();
    const synced = await db.poleCaptures.where('status').equals('synced').count();
    const errors = await db.poleCaptures.where('syncStatus').equals('error').count();
    
    return {
      total,
      drafted,
      inProgress,
      captured,
      synced,
      errors,
      pendingSync: captured
    };
  }
  
  // Live query for reactive updates
  watchPoleCaptures() {
    return liveQuery(() => db.poleCaptures.toArray());
  }
  
  watchPoleCapture(poleNumber: string) {
    return liveQuery(() => db.poleCaptures.get(poleNumber));
  }
  
  watchSyncQueue() {
    return liveQuery(() => 
      db.poleCaptures
        .where('syncStatus')
        .anyOf(['pending', 'error'])
        .toArray()
    );
  }
}

export const poleCaptureService = new PoleCaptureService();