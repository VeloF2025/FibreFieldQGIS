import { log } from '@/lib/logger';
import { db } from '@/lib/database';
import type {
  HomeDropCapture,
  HomeDropPhoto,
  HomeDropPhotoType,
  HomeDropPhotoStorage,
  HomeDropValidationRules,
  HomeDropServiceConfig
} from '@/types/home-drop.types';

/**
 * Home Drop Photo Management Service
 * 
 * Handles photo capture, compression, validation, and storage management
 * for home drop captures. Manages all 4 required photo types with quality
 * validation and compression.
 */
class HomeDropPhotoService {
  // Service configuration
  private readonly config: HomeDropServiceConfig = {
    photoCompressionQuality: 0.8,
    maxPhotoSize: 10 * 1024 * 1024, // 10MB
    syncBatchSize: 5,
    syncRetryDelay: 30000, // 30 seconds
    maxSyncRetries: 3,
    offlineCacheDuration: 30, // 30 days
    gpsAccuracyThreshold: 20, // 20 meters
    autoSaveInterval: 30 // 30 seconds
  };

  // Validation rules for photos
  private readonly validationRules: HomeDropValidationRules = {
    requiredPhotos: [
      'power-meter-test',
      'fibertime-setup-confirmation',
      'fibertime-device-actions',
      'router-4-lights-status'
    ] as HomeDropPhotoType[],
    minOpticalPower: -30,
    maxOpticalPower: -8,
    maxDistanceFromPole: 500,
    photoQualityMinScore: 70,
    requiredFields: [
      'poleNumber',
      'customer.name',
      'customer.address',
      'gpsLocation'
    ]
  };

  constructor() {
    this.setupService();
  }

  /**
   * Initialize service
   */
  private async setupService() {
    log.info('✅ Home Drop Photo Service initialized', {}, "HomeDropPhotoService");
  }

  /**
   * Add photo to home drop
   */
  async addPhoto(
    homeDropId: string, 
    photo: HomeDropPhoto
  ): Promise<void> {
    const homeDropCapture = await (db as any).homeDropCaptures.get(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    if (!this.validationRules.requiredPhotos.includes(photo.type)) {
      throw new Error(`Invalid photo type: ${photo.type}`);
    }
    
    const compressedPhoto = await this.compressPhoto(photo);
    
    const photoStorage: HomeDropPhotoStorage = {
      id: `${homeDropId}_${photo.type}_${Date.now()}`,
      homeDropId,
      type: photo.type,
      data: compressedPhoto.data,
      size: compressedPhoto.size,
      compressed: compressedPhoto.compressed,
      uploadStatus: 'pending',
      capturedAt: new Date(),
      metadata: {
        width: photo.resolution?.width || 0,
        height: photo.resolution?.height || 0,
        mimeType: 'image/jpeg',
        location: photo.location
      }
    };
    
    await (db as any).homeDropPhotos.add(photoStorage);
    
    const photos = [...homeDropCapture.photos, compressedPhoto];
    const completedPhotos = [...new Set(photos.map(p => p.type))];
    
    const allPhotosComplete = this.validationRules.requiredPhotos.every(
      type => completedPhotos.includes(type)
    );
    
    await (db as any).homeDropCaptures.update(homeDropId, {
      photos,
      completedPhotos,
      status: allPhotosComplete ? 'captured' : 'in_progress',
      updatedAt: new Date()
    });
  }

  /**
   * Remove photo from home drop
   */
  async removePhoto(
    homeDropId: string, 
    photoType: HomeDropPhotoType
  ): Promise<void> {
    const homeDropCapture = await (db as any).homeDropCaptures.get(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    const photos = homeDropCapture.photos.filter(p => p.type !== photoType);
    const completedPhotos = [...new Set(photos.map(p => p.type))];
    
    const photosToDelete = await (db as any).homeDropPhotos
      .where('homeDropId')
      .equals(homeDropId)
      .and((photo: HomeDropPhotoStorage) => photo.type === photoType)
      .toArray();
    
    for (const photo of photosToDelete) {
      await (db as any).homeDropPhotos.delete(photo.id);
    }
    
    await (db as any).homeDropCaptures.update(homeDropId, {
      photos,
      completedPhotos,
      status: completedPhotos.length >= this.validationRules.requiredPhotos.length 
        ? 'captured' 
        : 'in_progress',
      updatedAt: new Date()
    });
  }

  /**
   * Get photos for home drop
   */
  async getHomeDropPhotos(homeDropId: string): Promise<HomeDropPhotoStorage[]> {
    return await (db as any).homeDropPhotos
      .where('homeDropId')
      .equals(homeDropId)
      .toArray();
  }

  /**
   * Get specific photo by type
   */
  async getPhotoByType(
    homeDropId: string, 
    photoType: HomeDropPhotoType
  ): Promise<HomeDropPhotoStorage | undefined> {
    return await (db as any).homeDropPhotos
      .where('homeDropId')
      .equals(homeDropId)
      .and((photo: HomeDropPhotoStorage) => photo.type === photoType)
      .first();
  }

  /**
   * Check if all required photos are captured
   */
  async hasAllRequiredPhotos(homeDropId: string): Promise<boolean> {
    const photos = await this.getHomeDropPhotos(homeDropId);
    const photoTypes = photos.map(p => p.type);
    
    return this.validationRules.requiredPhotos.every(
      requiredType => photoTypes.includes(requiredType)
    );
  }

  /**
   * Get missing photo types
   */
  async getMissingPhotoTypes(homeDropId: string): Promise<HomeDropPhotoType[]> {
    const photos = await this.getHomeDropPhotos(homeDropId);
    const photoTypes = photos.map(p => p.type);
    
    return this.validationRules.requiredPhotos.filter(
      requiredType => !photoTypes.includes(requiredType)
    );
  }

  /**
   * Compress photo if needed
   */
  private async compressPhoto(photo: HomeDropPhoto): Promise<HomeDropPhoto> {
    if (photo.size <= this.config.maxPhotoSize || photo.compressed) {
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
                compressed: true,
                resolution: { width, height }
              });
            };
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          this.config.photoCompressionQuality
        );
      };
      
      img.src = photo.data;
    });
  }

  /**
   * Validate photo quality
   */
  async validatePhotoQuality(photo: HomeDropPhoto): Promise<{
    isValid: boolean;
    score: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let score = 100;

    // Check file size
    if (photo.size > this.config.maxPhotoSize) {
      issues.push(`Photo size (${(photo.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum`);
      score -= 20;
    }

    // Check resolution
    if (photo.resolution) {
      const { width, height } = photo.resolution;
      const minDimension = 800;
      
      if (width < minDimension || height < minDimension) {
        issues.push(`Resolution (${width}x${height}) below minimum (${minDimension}x${minDimension})`);
        score -= 15;
      }
      
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      if (aspectRatio > 3) {
        issues.push('Aspect ratio too extreme');
        score -= 10;
      }
    }

    // Check if photo data is valid
    if (!photo.data || !photo.data.startsWith('data:image/')) {
      issues.push('Invalid photo data format');
      score -= 30;
    }

    return {
      isValid: score >= this.validationRules.photoQualityMinScore,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Update photo upload status
   */
  async updatePhotoUploadStatus(
    photoId: string,
    status: 'pending' | 'uploading' | 'uploaded' | 'failed',
    uploadUrl?: string,
    uploadError?: string
  ): Promise<void> {
    const updateData: any = {
      uploadStatus: status,
      updatedAt: new Date()
    };

    if (uploadUrl) {
      updateData.uploadUrl = uploadUrl;
    }

    if (uploadError) {
      updateData.uploadError = uploadError;
    }

    await (db as any).homeDropPhotos.update(photoId, updateData);
  }

  /**
   * Get photos pending upload
   */
  async getPhotosForUpload(): Promise<HomeDropPhotoStorage[]> {
    return await (db as any).homeDropPhotos
      .where('uploadStatus')
      .equals('pending')
      .toArray();
  }

  /**
   * Delete all photos for home drop
   */
  async deleteAllPhotos(homeDropId: string): Promise<void> {
    const photos = await this.getHomeDropPhotos(homeDropId);
    
    for (const photo of photos) {
      await (db as any).homeDropPhotos.delete(photo.id);
    }
    
    await (db as any).homeDropCaptures.update(homeDropId, {
      photos: [],
      completedPhotos: [],
      updatedAt: new Date()
    });
  }

  /**
   * Get photo statistics for home drop
   */
  async getPhotoStatistics(homeDropId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    uploaded: number;
    failed: number;
    totalSize: number;
  }> {
    const photos = await this.getHomeDropPhotos(homeDropId);
    
    return {
      total: photos.length,
      completed: photos.filter(p => p.uploadStatus === 'uploaded').length,
      pending: photos.filter(p => p.uploadStatus === 'pending').length,
      uploaded: photos.filter(p => p.uploadStatus === 'uploaded').length,
      failed: photos.filter(p => p.uploadStatus === 'failed').length,
      totalSize: photos.reduce((sum, p) => sum + p.size, 0)
    };
  }

  /**
   * Get validation rules
   */
  getValidationRules(): HomeDropValidationRules {
    return this.validationRules;
  }

  /**
   * Get service configuration
   */
  getConfig(): HomeDropServiceConfig {
    return this.config;
  }
}

export const homeDropPhotoService = new HomeDropPhotoService();