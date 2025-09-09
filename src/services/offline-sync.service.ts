// Offline synchronization service for FibreField
import { 
  localDB, 
  LocalPoleInstallation, 
  LocalPhoto, 
  LocalOfflineQueueItem,
  LocalPlannedPole,
  LocalProject,
  LocalContractor,
  LocalStaff
} from '@/lib/database';
import { 
  poleInstallationsService, 
  plannedPolesService, 
  projectsService, 
  contractorsService, 
  staffService 
} from '@/lib/firestore';
import { uploadPolePhoto, uploadBase64Image } from '@/lib/storage';
import { config } from '@/lib/config';

export class OfflineSyncService {
  private syncInProgress = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  // Main sync function - syncs all data bidirectionally
  async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting full sync...');

    try {
      // Step 1: Download master data from FibreFlow
      await this.downloadMasterData();
      
      // Step 2: Upload local changes to FibreFlow
      await this.uploadLocalChanges();
      
      // Step 3: Process offline queue
      await this.processOfflineQueue();
      
      console.log('✅ Full sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Download master data (projects, planned poles, contractors, staff)
  async downloadMasterData(): Promise<void> {
    console.log('📥 Downloading master data...');
    
    try {
      // Download projects
      const projects = await projectsService.getAll();
      await this.syncProjects(projects);
      
      // Download contractors
      const contractors = await contractorsService.getAll();
      await this.syncContractors(contractors);
      
      // Download staff
      const staff = await staffService.getAll();
      await this.syncStaff(staff);
      
      // Download planned poles
      const plannedPoles = await plannedPolesService.getAll();
      await this.syncPlannedPoles(plannedPoles);
      
      console.log('✅ Master data download completed');
    } catch (error) {
      console.error('❌ Master data download failed:', error);
      throw error;
    }
  }

  // Upload local changes to FibreFlow
  async uploadLocalChanges(): Promise<void> {
    console.log('📤 Uploading local changes...');
    
    try {
      // Upload new pole installations
      await this.uploadPoleInstallations();
      
      // Upload photos
      await this.uploadPhotos();
      
      console.log('✅ Local changes upload completed');
    } catch (error) {
      console.error('❌ Local changes upload failed:', error);
      throw error;
    }
  }

  // Process offline queue items
  async processOfflineQueue(): Promise<void> {
    console.log('📋 Processing offline queue...');
    
    const pendingItems = await localDB.offlineQueue
      .where('status')
      .equals('pending')
      .and(item => item.nextAttempt ? item.nextAttempt <= new Date() : true)
      .toArray();

    for (const item of pendingItems) {
      try {
        await this.processQueueItem(item);
      } catch (error) {
        console.error(`Failed to process queue item ${item.id}:`, error);
        await this.handleQueueItemError(item, error as Error);
      }
    }
    
    console.log('✅ Offline queue processing completed');
  }

  // Sync projects from remote to local
  private async syncProjects(remoteProjects: any[]): Promise<void> {
    for (const remoteProject of remoteProjects) {
      const localProject = await localDB.projects
        .where('remoteId')
        .equals(remoteProject.id)
        .first();

      if (!localProject) {
        // Create new local project
        await localDB.projects.add({
          remoteId: remoteProject.id,
          title: remoteProject.title,
          client: remoteProject.client,
          status: remoteProject.status,
          priority: remoteProject.priority,
          location: remoteProject.location,
          startDate: remoteProject.startDate?.toDate() || new Date(),
          endDate: remoteProject.endDate?.toDate(),
          type: remoteProject.type,
          description: remoteProject.description,
          lastSyncedAt: new Date(),
          createdAt: remoteProject.createdAt?.toDate() || new Date(),
          updatedAt: remoteProject.updatedAt?.toDate() || new Date()
        });
      } else {
        // Update existing local project
        await localDB.projects.update(localProject.id!, {
          title: remoteProject.title,
          client: remoteProject.client,
          status: remoteProject.status,
          priority: remoteProject.priority,
          location: remoteProject.location,
          startDate: remoteProject.startDate?.toDate() || localProject.startDate,
          endDate: remoteProject.endDate?.toDate(),
          type: remoteProject.type,
          description: remoteProject.description,
          lastSyncedAt: new Date(),
          updatedAt: remoteProject.updatedAt?.toDate() || new Date()
        });
      }
    }

    await localDB.updateLastSyncTime('projects', 'down', remoteProjects.length);
  }

  // Sync contractors from remote to local
  private async syncContractors(remoteContractors: any[]): Promise<void> {
    for (const remoteContractor of remoteContractors) {
      const localContractor = await localDB.contractors
        .where('remoteId')
        .equals(remoteContractor.id)
        .first();

      if (!localContractor) {
        await localDB.contractors.add({
          remoteId: remoteContractor.id,
          name: remoteContractor.name,
          email: remoteContractor.email,
          phone: remoteContractor.phone,
          company: remoteContractor.company,
          services: remoteContractor.services || [],
          status: remoteContractor.status,
          location: remoteContractor.location,
          rating: remoteContractor.rating,
          lastSyncedAt: new Date(),
          createdAt: remoteContractor.createdAt?.toDate() || new Date(),
          updatedAt: remoteContractor.updatedAt?.toDate() || new Date()
        });
      } else {
        await localDB.contractors.update(localContractor.id!, {
          name: remoteContractor.name,
          email: remoteContractor.email,
          phone: remoteContractor.phone,
          company: remoteContractor.company,
          services: remoteContractor.services || [],
          status: remoteContractor.status,
          location: remoteContractor.location,
          rating: remoteContractor.rating,
          lastSyncedAt: new Date(),
          updatedAt: remoteContractor.updatedAt?.toDate() || new Date()
        });
      }
    }

    await localDB.updateLastSyncTime('contractors', 'down', remoteContractors.length);
  }

  // Sync staff from remote to local
  private async syncStaff(remoteStaff: any[]): Promise<void> {
    for (const remoteStaffMember of remoteStaff) {
      const localStaffMember = await localDB.staff
        .where('remoteId')
        .equals(remoteStaffMember.id)
        .first();

      if (!localStaffMember) {
        await localDB.staff.add({
          remoteId: remoteStaffMember.id,
          name: remoteStaffMember.name,
          email: remoteStaffMember.email,
          phone: remoteStaffMember.phone,
          role: remoteStaffMember.role,
          contractorId: remoteStaffMember.contractorId,
          isActive: remoteStaffMember.isActive,
          permissions: remoteStaffMember.permissions || [],
          lastSyncedAt: new Date(),
          createdAt: remoteStaffMember.createdAt?.toDate() || new Date(),
          updatedAt: remoteStaffMember.updatedAt?.toDate() || new Date()
        });
      } else {
        await localDB.staff.update(localStaffMember.id!, {
          name: remoteStaffMember.name,
          email: remoteStaffMember.email,
          phone: remoteStaffMember.phone,
          role: remoteStaffMember.role,
          contractorId: remoteStaffMember.contractorId,
          isActive: remoteStaffMember.isActive,
          permissions: remoteStaffMember.permissions || [],
          lastSyncedAt: new Date(),
          updatedAt: remoteStaffMember.updatedAt?.toDate() || new Date()
        });
      }
    }

    await localDB.updateLastSyncTime('staff', 'down', remoteStaff.length);
  }

  // Sync planned poles from remote to local
  private async syncPlannedPoles(remotePlannedPoles: any[]): Promise<void> {
    for (const remotePole of remotePlannedPoles) {
      const localPole = await localDB.plannedPoles
        .where('remoteId')
        .equals(remotePole.id)
        .first();

      if (!localPole) {
        await localDB.plannedPoles.add({
          remoteId: remotePole.id,
          projectId: remotePole.projectId,
          poleNumber: remotePole.poleNumber,
          location: remotePole.location,
          status: remotePole.status,
          assignedTo: remotePole.assignedTo,
          contractorId: remotePole.contractorId,
          estimatedDate: remotePole.estimatedDate?.toDate(),
          actualDate: remotePole.actualDate?.toDate(),
          notes: remotePole.notes,
          lastSyncedAt: new Date(),
          createdAt: remotePole.createdAt?.toDate() || new Date(),
          updatedAt: remotePole.updatedAt?.toDate() || new Date()
        });
      } else {
        await localDB.plannedPoles.update(localPole.id!, {
          projectId: remotePole.projectId,
          poleNumber: remotePole.poleNumber,
          location: remotePole.location,
          status: remotePole.status,
          assignedTo: remotePole.assignedTo,
          contractorId: remotePole.contractorId,
          estimatedDate: remotePole.estimatedDate?.toDate(),
          actualDate: remotePole.actualDate?.toDate(),
          notes: remotePole.notes,
          lastSyncedAt: new Date(),
          updatedAt: remotePole.updatedAt?.toDate() || new Date()
        });
      }
    }

    await localDB.updateLastSyncTime('plannedPoles', 'down', remotePlannedPoles.length);
  }

  // Upload pole installations to remote
  private async uploadPoleInstallations(): Promise<void> {
    const unsyncedInstallations = await localDB.poleInstallations
      .where('isOffline')
      .equals(true)
      .and(installation => !installation.remoteId)
      .toArray();

    for (const installation of unsyncedInstallations) {
      try {
        // Convert to remote format
        const remoteInstallation = {
          projectId: installation.projectId,
          plannedPoleId: installation.plannedPoleId,
          contractorId: installation.contractorId,
          capturedBy: installation.capturedBy,
          poleDetails: installation.poleDetails,
          location: installation.location,
          photos: installation.photos,
          status: installation.status,
          capturedAt: installation.capturedAt,
          qualityChecks: installation.qualityChecks,
          isOffline: false,
          syncAttempts: 0
        };

        // Upload to FibreFlow
        const remoteId = await poleInstallationsService.create(remoteInstallation);

        // Update local record
        await localDB.poleInstallations.update(installation.id!, {
          remoteId,
          isOffline: false,
          syncedAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✅ Uploaded pole installation ${installation.id} -> ${remoteId}`);
      } catch (error) {
        console.error(`❌ Failed to upload pole installation ${installation.id}:`, error);
        
        // Add to queue for retry
        await localDB.offlineQueue.add({
          type: 'pole-installation',
          action: 'create',
          data: installation,
          priority: 'high',
          attempts: 0,
          maxAttempts: this.maxRetries,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }

  // Upload photos to remote storage
  private async uploadPhotos(): Promise<void> {
    const unuploadedPhotos = await localDB.photos
      .where('uploaded')
      .equals(false)
      .toArray();

    for (const photo of unuploadedPhotos) {
      try {
        if (!photo.localPath) continue;

        // Read photo file from local path
        const response = await fetch(photo.localPath);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const result = await uploadPolePhoto(
          blob,
          photo.poleInstallationId?.toString() || 'unknown',
          photo.type as any
        );

        // Update local photo record
        await localDB.photos.update(photo.id!, {
          remotePath: result.path,
          url: result.url,
          uploaded: true,
          remoteId: result.name
        });

        console.log(`✅ Uploaded photo ${photo.id} -> ${result.url}`);
      } catch (error) {
        console.error(`❌ Failed to upload photo ${photo.id}:`, error);
        
        // Add to queue for retry
        await localDB.offlineQueue.add({
          type: 'photo-upload',
          action: 'create',
          data: photo,
          priority: 'medium',
          attempts: 0,
          maxAttempts: this.maxRetries,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }

  // Process individual queue item
  private async processQueueItem(item: LocalOfflineQueueItem): Promise<void> {
    console.log(`Processing queue item ${item.id}: ${item.type}/${item.action}`);

    // Mark as processing
    await localDB.offlineQueue.update(item.id!, {
      status: 'processing',
      updatedAt: new Date()
    });

    try {
      switch (item.type) {
        case 'pole-installation':
          await this.processQueuePoleInstallation(item);
          break;
        case 'photo-upload':
          await this.processQueuePhotoUpload(item);
          break;
        case 'data-sync':
          await this.processQueueDataSync(item);
          break;
        default:
          throw new Error(`Unknown queue item type: ${item.type}`);
      }

      // Mark as completed
      await localDB.offlineQueue.update(item.id!, {
        status: 'completed',
        updatedAt: new Date()
      });

      console.log(`✅ Completed queue item ${item.id}`);
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  // Process pole installation queue item
  private async processQueuePoleInstallation(item: LocalOfflineQueueItem): Promise<void> {
    const installation = item.data as LocalPoleInstallation;
    
    if (item.action === 'create') {
      const remoteId = await poleInstallationsService.create({
        projectId: installation.projectId,
        plannedPoleId: installation.plannedPoleId,
        contractorId: installation.contractorId,
        capturedBy: installation.capturedBy,
        poleDetails: installation.poleDetails,
        location: installation.location,
        photos: installation.photos,
        status: installation.status,
        capturedAt: installation.capturedAt,
        qualityChecks: installation.qualityChecks,
        isOffline: false,
        syncAttempts: 0
      });

      // Update local record
      if (installation.id) {
        await localDB.poleInstallations.update(installation.id, {
          remoteId,
          isOffline: false,
          syncedAt: new Date()
        });
      }
    }
  }

  // Process photo upload queue item
  private async processQueuePhotoUpload(item: LocalOfflineQueueItem): Promise<void> {
    const photo = item.data as LocalPhoto;
    
    if (!photo.localPath) {
      throw new Error('Photo has no local path');
    }

    const response = await fetch(photo.localPath);
    const blob = await response.blob();

    const result = await uploadPolePhoto(
      blob,
      photo.poleInstallationId?.toString() || 'unknown',
      photo.type as any
    );

    if (photo.id) {
      await localDB.photos.update(photo.id, {
        remotePath: result.path,
        url: result.url,
        uploaded: true,
        remoteId: result.name
      });
    }
  }

  // Process data sync queue item
  private async processQueueDataSync(item: LocalOfflineQueueItem): Promise<void> {
    // Trigger specific sync based on data
    switch (item.data?.syncType) {
      case 'master-data':
        await this.downloadMasterData();
        break;
      case 'local-changes':
        await this.uploadLocalChanges();
        break;
      default:
        await this.syncAll();
    }
  }

  // Handle queue item errors
  private async handleQueueItemError(item: LocalOfflineQueueItem, error: Error): Promise<void> {
    const newAttempts = item.attempts + 1;
    
    if (newAttempts >= item.maxAttempts) {
      // Max retries reached, mark as failed
      await localDB.offlineQueue.update(item.id!, {
        status: 'failed',
        lastError: error.message,
        updatedAt: new Date()
      });
      console.error(`❌ Queue item ${item.id} failed permanently:`, error);
    } else {
      // Schedule retry with exponential backoff
      const nextAttempt = new Date(Date.now() + (this.retryDelay * Math.pow(2, newAttempts)));
      
      await localDB.offlineQueue.update(item.id!, {
        status: 'pending',
        attempts: newAttempts,
        nextAttempt,
        lastError: error.message,
        updatedAt: new Date()
      });
      
      console.log(`⏰ Queue item ${item.id} scheduled for retry ${newAttempts}/${item.maxAttempts} at ${nextAttempt}`);
    }
  }

  // Public method to add item to sync queue
  async addToQueue(
    type: LocalOfflineQueueItem['type'],
    action: LocalOfflineQueueItem['action'],
    data: any,
    priority: LocalOfflineQueueItem['priority'] = 'medium'
  ): Promise<number> {
    return await localDB.offlineQueue.add({
      type,
      action,
      data,
      priority,
      attempts: 0,
      maxAttempts: this.maxRetries,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Get sync status
  async getSyncStatus() {
    const [pendingCount, lastSync] = await Promise.all([
      localDB.getPendingSyncCount(),
      localDB.getLastSyncTime('general')
    ]);

    return {
      pendingCount,
      lastSync,
      inProgress: this.syncInProgress
    };
  }

  // Force sync now
  async forcSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.syncAll();
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();