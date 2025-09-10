// Pole Photo Service - 6-photo capture workflow and compression
import { db } from '@/lib/database';
import { log } from '@/lib/logger';
import type { PhotoType, CapturedPhoto, PolePhoto, PoleCapture } from './core-pole-capture.service';

class PolePhotoService {
  private readonly PHOTO_TYPES: PhotoType[] = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'];
  private readonly REQUIRED_PHOTOS: PhotoType[] = ['before', 'front', 'side']; // Minimum required
  private readonly MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly COMPRESSION_QUALITY = 0.8;
  
  constructor() {
    // Initialize photo service
  }
  
  // Add photo to pole capture
  async addPhoto(poleNumber: string, photo: CapturedPhoto): Promise<void> {
    try {
      const poleCapture = await db.poleCaptures.get(poleNumber);
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
      
      await db.poleCaptures.update(poleNumber, {
        photos,
        completedPhotos,
        status: completedPhotos.length >= this.REQUIRED_PHOTOS.length ? 'captured' : 'in_progress',
        updatedAt: new Date()
      });
      
      log.info('Added photo to pole capture', { 
        poleNumber, 
        photoType: photo.type, 
        originalSize: photo.size, 
        compressedSize: compressedPhoto.size 
      }, 'PolePhotoService');
    } catch (error) {
      log.error('Failed to add photo', { poleNumber, photoType: photo.type }, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Remove photo from pole capture
  async removePhoto(poleNumber: string, photoType: PhotoType): Promise<void> {
    try {
      const poleCapture = await db.poleCaptures.get(poleNumber);
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
      
      await db.poleCaptures.update(poleNumber, {
        photos,
        completedPhotos,
        status: completedPhotos.length >= this.REQUIRED_PHOTOS.length ? 'captured' : 'in_progress',
        updatedAt: new Date()
      });
      
      log.info('Removed photo from pole capture', { poleNumber, photoType }, 'PolePhotoService');
    } catch (error) {
      log.error('Failed to remove photo', { poleNumber, photoType }, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Get photos for a pole
  async getPolePhotos(poleNumber: string): Promise<PolePhoto[]> {
    try {
      return await db.polePhotos
        .where('poleId')
        .equals(poleNumber)
        .toArray();
    } catch (error) {
      log.error('Failed to get pole photos', { poleNumber }, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Get photo by type for a pole
  async getPolePhotoByType(poleNumber: string, photoType: PhotoType): Promise<PolePhoto | undefined> {
    try {
      return await db.polePhotos
        .where('poleId')
        .equals(poleNumber)
        .and(photo => photo.type === photoType)
        .first();
    } catch (error) {
      log.error('Failed to get pole photo by type', { poleNumber, photoType }, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Update photo upload status
  async updatePhotoUploadStatus(
    photoId: string, 
    status: PolePhoto['uploadStatus'], 
    url?: string, 
    error?: string
  ): Promise<void> {
    try {
      const updates: Partial<PolePhoto> = { uploadStatus: status };
      
      if (url) {
        updates.uploadUrl = url;
        updates.uploadedAt = new Date();
      }
      
      if (error) {
        updates.uploadError = error;
      }
      
      await db.polePhotos.update(photoId, updates);
      
      log.info('Updated photo upload status', { photoId, status }, 'PolePhotoService');
    } catch (error) {
      log.error('Failed to update photo upload status', { photoId, status }, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Get photos by upload status
  async getPhotosByUploadStatus(status: PolePhoto['uploadStatus']): Promise<PolePhoto[]> {
    try {
      return await db.polePhotos
        .where('uploadStatus')
        .equals(status)
        .toArray();
    } catch (error) {
      log.error('Failed to get photos by upload status', { status }, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Validate photo requirements for pole
  async validatePhotoRequirements(poleNumber: string): Promise<{
    isComplete: boolean;
    completedCount: number;
    requiredCount: number;
    missingPhotos: PhotoType[];
    completedPhotos: PhotoType[];
  }> {
    try {
      const poleCapture = await db.poleCaptures.get(poleNumber);
      if (!poleCapture) {
        throw new Error(`Pole capture ${poleNumber} not found`);
      }
      
      const completedPhotos = poleCapture.completedPhotos || [];
      const missingPhotos = this.REQUIRED_PHOTOS.filter(
        requiredType => !completedPhotos.includes(requiredType)
      );
      
      const validation = {
        isComplete: missingPhotos.length === 0,
        completedCount: completedPhotos.length,
        requiredCount: this.REQUIRED_PHOTOS.length,
        missingPhotos,
        completedPhotos
      };
      
      log.info('Validated photo requirements', { poleNumber, validation }, 'PolePhotoService');
      return validation;
    } catch (error) {
      log.error('Failed to validate photo requirements', { poleNumber }, 'PolePhotoService', error);
      throw error;
    }
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
          log.warn('Canvas context not available, returning original photo', { photoId: photo.id }, 'PolePhotoService');
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
              log.warn('Blob creation failed, returning original photo', { photoId: photo.id }, 'PolePhotoService');
              resolve(photo);
              return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              const compressedPhoto = {
                ...photo,
                data: base64,
                size: blob.size,
                compressed: true
              };
              
              log.info('Photo compressed successfully', { 
                photoId: photo.id, 
                originalSize: photo.size, 
                compressedSize: blob.size,
                compressionRatio: (blob.size / photo.size).toFixed(2)
              }, 'PolePhotoService');
              
              resolve(compressedPhoto);
            };
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          this.COMPRESSION_QUALITY
        );
      };
      
      img.onerror = () => {
        log.error('Image loading failed, returning original photo', { photoId: photo.id }, 'PolePhotoService');
        resolve(photo);
      };
      
      img.src = photo.data;
    });
  }
  
  // Get photo statistics
  async getPhotoStatistics(): Promise<{
    totalPhotos: number;
    pendingUploads: number;
    uploadedPhotos: number;
    failedUploads: number;
    totalSize: number;
    compressionRatio: number;
  }> {
    try {
      const allPhotos = await db.polePhotos.toArray();
      
      const stats = {
        totalPhotos: allPhotos.length,
        pendingUploads: allPhotos.filter(p => p.uploadStatus === 'pending').length,
        uploadedPhotos: allPhotos.filter(p => p.uploadStatus === 'uploaded').length,
        failedUploads: allPhotos.filter(p => p.uploadStatus === 'error').length,
        totalSize: allPhotos.reduce((sum, photo) => sum + photo.size, 0),
        compressionRatio: allPhotos.filter(p => p.compressed).length / Math.max(allPhotos.length, 1)
      };
      
      log.info('Generated photo statistics', stats, 'PolePhotoService');
      return stats;
    } catch (error) {
      log.error('Failed to get photo statistics', {}, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Clean up photos for deleted pole
  async cleanupPolePhotos(poleNumber: string): Promise<void> {
    try {
      const photos = await this.getPolePhotos(poleNumber);
      
      for (const photo of photos) {
        await db.polePhotos.delete(photo.id);
      }
      
      log.info('Cleaned up pole photos', { poleNumber, photoCount: photos.length }, 'PolePhotoService');
    } catch (error) {
      log.error('Failed to cleanup pole photos', { poleNumber }, 'PolePhotoService', error);
      throw error;
    }
  }
  
  // Get available photo types
  getAvailablePhotoTypes(): PhotoType[] {
    return [...this.PHOTO_TYPES];
  }
  
  // Get required photo types
  getRequiredPhotoTypes(): PhotoType[] {
    return [...this.REQUIRED_PHOTOS];
  }
  
  // Check if photo type is required
  isPhotoTypeRequired(photoType: PhotoType): boolean {
    return this.REQUIRED_PHOTOS.includes(photoType);
  }
}

export const polePhotoService = new PolePhotoService();