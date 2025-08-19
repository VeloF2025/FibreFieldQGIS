// Field capture service for managing pole installations
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { 
  FieldPoleInstallation, 
  FieldPhoto, 
  PhotoType,
  QualityCheck 
} from '@/models/field-capture.model';
import { localDB } from '@/lib/database';
import { offlineSyncService } from './offline-sync.service';

class FieldCaptureService {
  private readonly INSTALLATIONS_COLLECTION = 'field-pole-installations';
  private readonly PHOTOS_STORAGE_PATH = 'field-photos';
  
  // Create new installation
  async createInstallation(data: {
    poleNumber: string;
    projectId?: string;
    contractorId: string;
    actualGPS: { lat: number; lng: number; accuracy: number };
    fieldNotes?: string;
    capturedBy: string;
  }): Promise<string> {
    try {
      const installation: Omit<FieldPoleInstallation, 'id'> = {
        poleNumber: data.poleNumber,
        projectId: data.projectId,
        contractorId: data.contractorId,
        actualGPS: {
          latitude: data.actualGPS.lat,
          longitude: data.actualGPS.lng,
          accuracy: data.actualGPS.accuracy,
          capturedAt: Timestamp.now()
        },
        photos: [],
        qualityChecks: {
          poleUpright: false,
          correctDepth: false,
          concreteAdequate: false,
          photosComplete: false,
          safetyCompliant: false
        },
        fieldNotes: data.fieldNotes,
        capturedAt: Timestamp.now(),
        capturedBy: data.capturedBy,
        syncStatus: 'pending',
        isOffline: !navigator.onLine
      };
      
      if (navigator.onLine) {
        // Online: Save to Firestore
        const docRef = await addDoc(
          collection(db, this.INSTALLATIONS_COLLECTION),
          {
            ...installation,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
        );
        return docRef.id;
      } else {
        // Offline: Save locally
        const localId = await localDB.poleInstallations.add({
          ...installation,
          firebaseId: undefined,
          isOffline: true,
          syncAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Queue for sync
        await offlineSyncService.addToQueue(
          'pole-installation',
          'create',
          { ...installation, localId },
          'high'
        );
        
        return `local_${localId}`;
      }
    } catch (error) {
      console.error('Error creating installation:', error);
      throw error;
    }
  }
  
  // Capture and upload photo
  async capturePhoto(
    installationId: string,
    photoType: PhotoType,
    photoData: string | Blob | File
  ): Promise<FieldPhoto> {
    try {
      const isLocal = installationId.startsWith('local_');
      const timestamp = Date.now();
      const fileName = `${installationId}_${photoType}_${timestamp}.jpg`;
      
      let photoBlob: Blob;
      
      // Convert to blob if needed
      if (typeof photoData === 'string') {
        // Base64 string
        const response = await fetch(photoData);
        photoBlob = await response.blob();
      } else {
        photoBlob = photoData;
      }
      
      const photo: FieldPhoto = {
        id: `photo_${timestamp}`,
        type: photoType,
        url: '',
        thumbnailUrl: '',
        capturedAt: Timestamp.now(),
        fileSize: photoBlob.size,
        mimeType: photoBlob.type || 'image/jpeg'
      };
      
      if (navigator.onLine && !isLocal) {
        try {
          // Online: Upload to Firebase Storage
          const storageRef = ref(
            storage,
            `${this.PHOTOS_STORAGE_PATH}/${installationId}/${fileName}`
          );
          
          const snapshot = await uploadBytes(storageRef, photoBlob);
          photo.url = await getDownloadURL(snapshot.ref);
          photo.thumbnailUrl = photo.url; // TODO: Generate actual thumbnail
          
          // Update installation with photo
          await this.addPhotoToInstallation(installationId, photo);
        } catch (error: any) {
          console.warn('Firebase Storage upload failed, storing locally:', error.message);
          
          // If storage upload fails (e.g., permission denied), fall back to local storage
          const base64 = await this.blobToBase64(photoBlob);
          
          await localDB.photos.add({
            ...photo,
            installationId: isLocal ? installationId : `firebase_${installationId}`,
            localData: base64,
            isOffline: true,
            syncAttempts: 0,
            createdAt: new Date(),
            uploadError: error.message // Track the error for debugging
          });
          
          // Queue for sync when permissions are fixed
          await offlineSyncService.addToQueue(
            'photo',
            'upload',
            {
              installationId,
              photoType,
              photoData: base64,
              fileName,
              retryCount: 0
            }
          );
        }
      } else {
        // Offline: Store locally
        const base64 = await this.blobToBase64(photoBlob);
        
        await localDB.photos.add({
          ...photo,
          installationId: isLocal ? installationId : `firebase_${installationId}`,
          localData: base64,
          isOffline: true,
          syncAttempts: 0,
          createdAt: new Date()
        });
        
        // Queue for sync
        await offlineSyncService.addToQueue(
          'photo',
          'upload',
          {
            installationId,
            photo,
            localData: base64
          },
          'medium'
        );
        
        photo.url = base64; // Use base64 as temporary URL
        photo.thumbnailUrl = base64;
      }
      
      return photo;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }
  
  // Submit quality checks
  async submitQualityChecks(
    installationId: string,
    checks: QualityCheck
  ): Promise<void> {
    try {
      const isLocal = installationId.startsWith('local_');
      
      if (navigator.onLine && !isLocal) {
        // Online: Update Firestore
        const docRef = doc(db, this.INSTALLATIONS_COLLECTION, installationId);
        await updateDoc(docRef, {
          qualityChecks: checks,
          'qualityChecks.completedAt': serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Offline: Update local
        const localId = isLocal 
          ? parseInt(installationId.replace('local_', ''))
          : undefined;
          
        if (localId) {
          await localDB.poleInstallations.update(localId, {
            qualityChecks: checks,
            updatedAt: new Date()
          });
        }
        
        // Queue for sync
        await offlineSyncService.addToQueue(
          'quality-check',
          'update',
          {
            installationId,
            checks
          },
          'low'
        );
      }
    } catch (error) {
      console.error('Error submitting quality checks:', error);
      throw error;
    }
  }
  
  // Add field notes
  async addFieldNotes(
    installationId: string,
    notes: string
  ): Promise<void> {
    try {
      const isLocal = installationId.startsWith('local_');
      
      if (navigator.onLine && !isLocal) {
        const docRef = doc(db, this.INSTALLATIONS_COLLECTION, installationId);
        await updateDoc(docRef, {
          fieldNotes: notes,
          updatedAt: serverTimestamp()
        });
      } else {
        const localId = isLocal 
          ? parseInt(installationId.replace('local_', ''))
          : undefined;
          
        if (localId) {
          await localDB.poleInstallations.update(localId, {
            fieldNotes: notes,
            updatedAt: new Date()
          });
        }
        
        await offlineSyncService.addToQueue(
          'field-notes',
          'update',
          {
            installationId,
            notes
          },
          'low'
        );
      }
    } catch (error) {
      console.error('Error adding field notes:', error);
      throw error;
    }
  }
  
  // Get installation by ID
  async getInstallation(installationId: string): Promise<FieldPoleInstallation | null> {
    try {
      const isLocal = installationId.startsWith('local_');
      
      if (isLocal) {
        const localId = parseInt(installationId.replace('local_', ''));
        const local = await localDB.poleInstallations.get(localId);
        
        if (local) {
          return {
            id: installationId,
            ...local
          } as any;
        }
      } else if (navigator.onLine) {
        const docRef = doc(db, this.INSTALLATIONS_COLLECTION, installationId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...docSnap.data()
          } as FieldPoleInstallation;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting installation:', error);
      return null;
    }
  }
  
  // Get installations by project
  async getProjectInstallations(projectId: string): Promise<FieldPoleInstallation[]> {
    try {
      const installations: FieldPoleInstallation[] = [];
      
      // Get from Firestore if online
      if (navigator.onLine) {
        const q = query(
          collection(db, this.INSTALLATIONS_COLLECTION),
          where('projectId', '==', projectId)
        );
        
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          installations.push({
            id: doc.id,
            ...doc.data()
          } as FieldPoleInstallation);
        });
      }
      
      // Get from local DB
      const localInstalls = await localDB.poleInstallations
        .where('projectId')
        .equals(projectId)
        .toArray();
        
      localInstalls.forEach(local => {
        installations.push({
          id: `local_${local.id}`,
          ...local
        } as any);
      });
      
      return installations;
    } catch (error) {
      console.error('Error getting project installations:', error);
      return [];
    }
  }
  
  // Helper: Add photo to installation
  private async addPhotoToInstallation(
    installationId: string,
    photo: FieldPhoto
  ): Promise<void> {
    const docRef = doc(db, this.INSTALLATIONS_COLLECTION, installationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const currentPhotos = docSnap.data().photos || [];
      await updateDoc(docRef, {
        photos: [...currentPhotos, photo],
        updatedAt: serverTimestamp()
      });
    }
  }
  
  // Helper: Convert blob to base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // Sync offline installations
  async syncOfflineInstallations(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    try {
      // Get all offline installations
      const offlineInstalls = await localDB.poleInstallations
        .where('isOffline')
        .equals(true)
        .toArray();
        
      for (const install of offlineInstalls) {
        try {
          // Create in Firestore
          const docRef = await addDoc(
            collection(db, this.INSTALLATIONS_COLLECTION),
            {
              ...install,
              isOffline: false,
              syncStatus: 'synced',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }
          );
          
          // Update local with Firebase ID
          await localDB.poleInstallations.update(install.id!, {
            firebaseId: docRef.id,
            isOffline: false,
            syncStatus: 'synced',
            syncedAt: new Date()
          });
          
          // Sync photos
          const photos = await localDB.photos
            .where('installationId')
            .equals(`local_${install.id}`)
            .toArray();
            
          for (const photo of photos) {
            if (photo.localData) {
              // Upload to storage
              const response = await fetch(photo.localData);
              const blob = await response.blob();
              
              const fileName = `${docRef.id}_${photo.type}_${Date.now()}.jpg`;
              const storageRef = ref(
                storage,
                `${this.PHOTOS_STORAGE_PATH}/${docRef.id}/${fileName}`
              );
              
              const snapshot = await uploadBytes(storageRef, blob);
              const url = await getDownloadURL(snapshot.ref);
              
              // Update photo URL
              await localDB.photos.update(photo.id!, {
                url,
                thumbnailUrl: url,
                isOffline: false,
                syncedAt: new Date()
              });
            }
          }
          
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to sync installation ${install.id}: ${error}`
          );
        }
      }
      
      return results;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }
}

export const fieldCaptureService = new FieldCaptureService();