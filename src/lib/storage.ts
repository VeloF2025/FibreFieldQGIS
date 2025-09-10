// Firebase Storage utilities for FibreField
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  UploadTask
} from 'firebase/storage';
import { storage } from './firebase';

// Storage paths - matching FibreFlow conventions
export const STORAGE_PATHS = {
  POLE_PHOTOS: 'pole-photos',
  PROFILE_PHOTOS: 'profile-photos',
  DOCUMENTS: 'documents',
  TEMP: 'temp'
} as const;

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
}

// Upload file with progress tracking
export const uploadFile = async (
  file: File | Blob,
  path: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    const storageRef = ref(storage, `${path}/${fileName}`);
    
    return new Promise((resolve, reject) => {
      const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          const progress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          };
          
          onProgress?.(progress);
        },
        (error) => {
          log.error('Upload error:', {}, "Storage", error);
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            resolve({
              url: downloadURL,
              path: `${path}/${fileName}`,
              name: fileName,
              size: uploadTask.snapshot.totalBytes
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    log.error('Upload initialization error:', {}, "Storage", error);
    throw error;
  }
};

// Upload pole photo with automatic naming
export const uploadPolePhoto = async (
  photo: File | Blob,
  poleId: string,
  photoType: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${poleId}_${photoType}_${timestamp}.jpg`;
  
  return uploadFile(photo, STORAGE_PATHS.POLE_PHOTOS, fileName, onProgress);
};

// Upload base64 image (from camera)
export const uploadBase64Image = async (
  base64Data: string,
  path: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Convert base64 to blob
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();
    
    return uploadFile(blob, path, fileName, onProgress);
  } catch (error) {
    log.error('Base64 upload error:', {}, "Storage", error);
    throw error;
  }
};

// Get file download URL
export const getFileUrl = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    log.error('Get file URL error:', {}, "Storage", error);
    throw error;
  }
};

// Delete file
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    log.error('Delete file error:', {}, "Storage", error);
    throw error;
  }
};

// List files in directory
export const listFiles = async (path: string): Promise<string[]> => {
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    
    return result.items.map(item => item.fullPath);
  } catch (error) {
    log.error('List files error:', {}, "Storage", error);
    throw error;
  }
};

// Generate unique filename
export const generateFileName = (
  prefix: string,
  extension: string = 'jpg'
): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
};

// Compress image before upload (utility function)
export const compressImage = async (
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(new Blob([''], { type: 'image/jpeg' }));
        }
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};