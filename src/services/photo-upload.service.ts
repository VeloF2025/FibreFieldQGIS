// Photo Upload Service with Firebase Storage
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { getCurrentUserId } from '@/lib/auth';
import { localDB } from '@/lib/database';

export interface PhotoUploadOptions {
  projectId: string;
  captureId: string;
  photoType: 'power_meter' | 'fibertime_setup' | 'device_actions' | 'router_lights' | 'pole_photo';
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  size?: number;
  metadata?: {
    contentType: string;
    customMetadata: Record<string, string>;
  };
  error?: string;
}

class PhotoUploadService {
  private activeUploads = new Map<string, any>();
  
  /**
   * Upload a photo to Firebase Storage
   */
  async uploadPhoto(
    file: File | Blob,
    options: PhotoUploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<PhotoUploadResult> {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Compress image if requested
      const processedFile = options.compress 
        ? await this.compressImage(file, {
            maxWidth: options.maxWidth || 1920,
            maxHeight: options.maxHeight || 1080,
            quality: options.quality || 0.8
          })
        : file;

      // Create storage path
      const timestamp = Date.now();
      const fileName = `${options.photoType}_${timestamp}.jpg`;
      const storagePath = `projects/${options.projectId}/captures/${options.captureId}/${fileName}`;
      
      // Create storage reference
      const storageRef = ref(storage, storagePath);
      
      // Set metadata
      const metadata = {
        contentType: processedFile.type || 'image/jpeg',
        customMetadata: {
          userId,
          projectId: options.projectId,
          captureId: options.captureId,
          photoType: options.photoType,
          uploadedAt: new Date().toISOString(),
          originalName: file instanceof File ? file.name : 'photo.jpg',
          compressed: options.compress ? 'true' : 'false'
        }
      };

      // Start upload
      const uploadTask = uploadBytesResumable(storageRef, processedFile, metadata);
      
      // Store upload task for potential cancellation
      const uploadId = `${options.captureId}_${options.photoType}`;
      this.activeUploads.set(uploadId, uploadTask);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress tracking
            const progress: UploadProgress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
              state: snapshot.state as any
            };
            
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            // Error handling
            console.error('Upload error:', error);
            this.activeUploads.delete(uploadId);
            
            // Cache for retry
            this.cacheFailedUpload(file, options);
            
            reject({
              success: false,
              error: this.getUploadErrorMessage(error)
            });
          },
          async () => {
            // Success handling
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              this.activeUploads.delete(uploadId);
              
              // Cache successful upload info
              await this.cacheUploadInfo({
                captureId: options.captureId,
                photoType: options.photoType,
                url: downloadURL,
                path: storagePath,
                size: uploadTask.snapshot.totalBytes,
                uploadedAt: new Date()
              });
              
              resolve({
                success: true,
                url: downloadURL,
                path: storagePath,
                size: uploadTask.snapshot.totalBytes,
                metadata
              });
            } catch (error) {
              reject({
                success: false,
                error: 'Failed to get download URL'
              });
            }
          }
        );
      });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Upload multiple photos in batch
   */
  async uploadBatch(
    files: Array<{ file: File | Blob; options: PhotoUploadOptions }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<PhotoUploadResult[]> {
    const results: PhotoUploadResult[] = [];
    let completed = 0;
    
    for (const { file, options } of files) {
      try {
        const result = await this.uploadPhoto(file, options);
        results.push(result);
        completed++;
        
        if (onProgress) {
          onProgress(completed, files.length);
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
        completed++;
        
        if (onProgress) {
          onProgress(completed, files.length);
        }
      }
    }
    
    return results;
  }

  /**
   * Delete a photo from Firebase Storage
   */
  async deletePhoto(storagePath: string): Promise<boolean> {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      
      // Remove from cache
      await this.removeCachedUploadInfo(storagePath);
      
      return true;
    } catch (error) {
      console.error('Delete photo error:', error);
      return false;
    }
  }

  /**
   * Get all photos for a capture
   */
  async getCapturePhotos(projectId: string, captureId: string): Promise<string[]> {
    try {
      const folderRef = ref(storage, `projects/${projectId}/captures/${captureId}`);
      const result = await listAll(folderRef);
      
      const urls: string[] = [];
      for (const itemRef of result.items) {
        const url = await getDownloadURL(itemRef);
        urls.push(url);
      }
      
      return urls;
    } catch (error) {
      console.error('Get capture photos error:', error);
      return [];
    }
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(captureId: string, photoType: string): boolean {
    const uploadId = `${captureId}_${photoType}`;
    const uploadTask = this.activeUploads.get(uploadId);
    
    if (uploadTask) {
      uploadTask.cancel();
      this.activeUploads.delete(uploadId);
      return true;
    }
    
    return false;
  }

  /**
   * Compress image before upload
   */
  private async compressImage(
    file: File | Blob,
    options: { maxWidth: number; maxHeight: number; quality: number }
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > options.maxWidth || height > options.maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = options.maxWidth;
            height = width / aspectRatio;
          } else {
            height = options.maxHeight;
            width = height * aspectRatio;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          options.quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      // Load image
      if (file instanceof File) {
        img.src = URL.createObjectURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  /**
   * Cache failed upload for retry
   */
  private async cacheFailedUpload(file: File | Blob, options: PhotoUploadOptions) {
    try {
      // Convert file to base64 for storage
      const base64 = await this.fileToBase64(file);
      
      await localDB.failedUploads.put({
        id: `${options.captureId}_${options.photoType}_${Date.now()}`,
        captureId: options.captureId,
        photoType: options.photoType,
        projectId: options.projectId,
        fileData: base64,
        fileName: file instanceof File ? file.name : 'photo.jpg',
        fileType: file.type || 'image/jpeg',
        options,
        failedAt: new Date(),
        retryCount: 0
      });
    } catch (error) {
      console.error('Failed to cache upload for retry:', error);
    }
  }

  /**
   * Cache successful upload info
   */
  private async cacheUploadInfo(info: any) {
    try {
      await localDB.uploadedPhotos.put({
        id: `${info.captureId}_${info.photoType}`,
        ...info
      });
    } catch (error) {
      console.error('Failed to cache upload info:', error);
    }
  }

  /**
   * Remove cached upload info
   */
  private async removeCachedUploadInfo(storagePath: string) {
    try {
      const allUploads = await localDB.uploadedPhotos.toArray();
      const toDelete = allUploads.find(u => u.path === storagePath);
      if (toDelete) {
        await localDB.uploadedPhotos.delete(toDelete.id);
      }
    } catch (error) {
      console.error('Failed to remove cached upload info:', error);
    }
  }

  /**
   * Retry failed uploads
   */
  async retryFailedUploads(): Promise<number> {
    try {
      const failed = await localDB.failedUploads.toArray();
      let successCount = 0;
      
      for (const item of failed) {
        try {
          // Convert base64 back to blob
          const blob = await this.base64ToBlob(item.fileData, item.fileType);
          
          // Retry upload
          const result = await this.uploadPhoto(blob, item.options);
          
          if (result.success) {
            // Remove from failed uploads
            await localDB.failedUploads.delete(item.id);
            successCount++;
          } else {
            // Increment retry count
            await localDB.failedUploads.update(item.id, {
              retryCount: item.retryCount + 1,
              lastRetryAt: new Date()
            });
          }
        } catch (error) {
          console.error('Retry upload error:', error);
        }
      }
      
      return successCount;
    } catch (error) {
      console.error('Retry failed uploads error:', error);
      return 0;
    }
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert base64 to blob
   */
  private async base64ToBlob(base64: string, type: string): Promise<Blob> {
    const response = await fetch(base64);
    return await response.blob();
  }

  /**
   * Get upload error message
   */
  private getUploadErrorMessage(error: any): string {
    if (error.code === 'storage/unauthorized') {
      return 'You do not have permission to upload photos';
    } else if (error.code === 'storage/canceled') {
      return 'Upload was canceled';
    } else if (error.code === 'storage/quota-exceeded') {
      return 'Storage quota exceeded';
    } else if (error.code === 'storage/retry-limit-exceeded') {
      return 'Upload failed after multiple retries';
    } else {
      return error.message || 'Upload failed';
    }
  }

  /**
   * Get upload statistics
   */
  async getUploadStats(): Promise<{
    totalUploaded: number;
    totalFailed: number;
    totalSize: number;
  }> {
    try {
      const uploaded = await localDB.uploadedPhotos.count();
      const failed = await localDB.failedUploads.count();
      const allUploaded = await localDB.uploadedPhotos.toArray();
      const totalSize = allUploaded.reduce((sum, item) => sum + (item.size || 0), 0);
      
      return {
        totalUploaded: uploaded,
        totalFailed: failed,
        totalSize
      };
    } catch (error) {
      console.error('Get upload stats error:', error);
      return {
        totalUploaded: 0,
        totalFailed: 0,
        totalSize: 0
      };
    }
  }
}

export const photoUploadService = new PhotoUploadService();