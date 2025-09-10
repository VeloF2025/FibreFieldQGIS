import { log } from '@/lib/logger';
/**
 * Home Drop Capture Service
 * 
 * Service layer for managing home drop captures following the same patterns
 * as the pole capture service but optimized for the 4-step workflow.
 * 
 * Key Features:
 * 1. 4-step workflow management (Assignments → GPS → Photos → Review)
 * 2. Offline-first with automatic sync queue
 * 3. Photo compression and management
 * 4. GPS validation and distance calculation from pole
 * 5. Admin approval workflow
 * 6. QGIS/QField export support
 */

import { db } from '@/lib/database';
import { liveQuery } from 'dexie';
import type {
  HomeDropCapture,
  HomeDropPhoto,
  HomeDropPhotoType,
  HomeDropStatus,
  HomeDropSyncStatus,
  HomeDropAssignment,
  HomeDropPhotoStorage,
  HomeDropSyncQueueItem,
  HomeDropStatistics,
  HomeDropFilterOptions,
  HomeDropGeoPackageExport,
  HomeDropValidationRules,
  HomeDropServiceConfig
} from '@/types/home-drop.types';
import { poleCaptureService } from './pole-capture.service';

/**
 * Home Drop Capture Service Class
 */
class HomeDropCaptureService {
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

  // Database initialization state
  private isInitialized = false;

  /**
   * Ensure database tables are available
   */
  private async ensureDatabase(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if home drop tables exist
      const tableNames = db.tables.map(t => t.name);
      const requiredTables = ['homeDropCaptures', 'homeDropPhotos', 'homeDropAssignments', 'homeDropSyncQueue'];
      const missingTables = requiredTables.filter(t => !tableNames.includes(t));

      if (missingTables.length > 0) {
        log.warn('⚠️ Home drop tables not found, upgrading database...', {}, "HomeDropCaptureService");
        
        // Force database to close and reopen to trigger upgrade
        await db.close();
        await db.open();
        
        // Verify tables were created
        const newTableNames = db.tables.map(t => t.name);
        const stillMissing = requiredTables.filter(t => !newTableNames.includes(t));
        
        if (stillMissing.length > 0) {
          throw new Error(`Database upgrade failed. Missing tables: ${stillMissing.join(', ')}`);
        }
      }

      this.isInitialized = true;
      log.info('✅ Home Drop Capture Service initialized', {}, "HomeDropCaptureService");
    } catch (error) {
      log.error('❌ Failed to initialize home drop database:', {}, "HomeDropCaptureService", error);
      throw error;
    }
  }
  
  // Validation rules
  private readonly validationRules: HomeDropValidationRules = {
    requiredPhotos: [
      'power-meter-test',
      'fibertime-setup-confirmation',
      'fibertime-device-actions',
      'router-4-lights-status'
    ] as HomeDropPhotoType[],
    minOpticalPower: -30, // dBm
    maxOpticalPower: -8,  // dBm
    maxDistanceFromPole: 500, // meters
    photoQualityMinScore: 70, // 0-100
    requiredFields: [
      'poleNumber',
      'customer.name',
      'customer.address',
      'gpsLocation'
    ]
  };
  
  // Auto-save timer
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    this.setupService();
  }
  
  /**
   * Initialize service
   */
  private async setupService() {
    // Service is ready to use
    log.info('✅ Home Drop Capture Service initialized', {}, "HomeDropCaptureService");
  }
  
  // ==================== CRUD Operations ====================
  
  /**
   * Create new home drop capture
   */
  async createHomeDropCapture(data: Partial<HomeDropCapture>): Promise<string> {
    // Validate required pole number
    if (!data.poleNumber) {
      throw new Error('Pole number is required for home drop capture');
    }
    
    // Verify pole exists
    const pole = await poleCaptureService.getPoleCapture(data.poleNumber);
    if (!pole) {
      throw new Error(`Pole ${data.poleNumber} not found. Please capture the pole first.`);
    }
    
    // Generate unique ID
    const homeDropId = this.generateHomeDropId();
    
    // Create home drop capture object
    const homeDropCapture: HomeDropCapture = {
      id: homeDropId,
      poleNumber: data.poleNumber,
      projectId: data.projectId || pole.projectId,
      projectName: data.projectName || pole.projectName,
      contractorId: data.contractorId || '',
      
      // Initialize status
      status: 'assigned',
      syncStatus: 'pending',
      syncAttempts: 0,
      
      // Customer details
      customer: data.customer || {
        name: '',
        address: ''
      },
      
      // Installation details
      installation: data.installation || {
        equipment: {},
        powerReadings: {},
        serviceConfig: {}
      },
      
      // Photos
      photos: [],
      requiredPhotos: this.validationRules.requiredPhotos,
      completedPhotos: [],
      
      // Workflow tracking
      workflow: {
        currentStep: 1,
        totalSteps: 4,
        lastSavedStep: 1,
        steps: {
          assignments: false,
          gps: false,
          photos: false,
          review: false
        }
      },
      
      // Metadata
      capturedBy: data.capturedBy || '',
      capturedByName: data.capturedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Override with provided data
      ...data
    };
    
    // Save to database
    await (db as any).homeDropCaptures.put(homeDropCapture);
    
    // Start auto-save timer
    this.startAutoSave(homeDropId);
    
    // Add to sync queue
    await this.addToSyncQueue(homeDropId, 'create', homeDropCapture);
    
    return homeDropId;
  }
  
  /**
   * Get home drop capture by ID
   */
  async getHomeDropCapture(homeDropId: string): Promise<HomeDropCapture | undefined> {
    return await (db as any).homeDropCaptures.get(homeDropId);
  }
  
  /**
   * Get all home drop captures
   */
  async getAllHomeDropCaptures(): Promise<HomeDropCapture[]> {
    await this.ensureDatabase();
    return await (db as any).homeDropCaptures.toArray();
  }
  
  /**
   * Get home drops by pole number
   */
  async getHomeDropsByPole(poleNumber: string): Promise<HomeDropCapture[]> {
    return await (db as any).homeDropCaptures
      .where('poleNumber')
      .equals(poleNumber)
      .toArray();
  }
  
  /**
   * Update home drop capture
   */
  async updateHomeDropCapture(
    homeDropId: string, 
    updates: Partial<HomeDropCapture>
  ): Promise<void> {
    const existing = await this.getHomeDropCapture(homeDropId);
    if (!existing) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    // Update in database
    await (db as any).homeDropCaptures.update(homeDropId, {
      ...updates,
      updatedAt: new Date()
    });
    
    // Add to sync queue if not already syncing
    if (existing.syncStatus !== 'syncing') {
      await this.addToSyncQueue(homeDropId, 'update', updates);
    }
  }
  
  /**
   * Delete home drop capture
   */
  async deleteHomeDropCapture(homeDropId: string): Promise<void> {
    // Stop auto-save timer
    this.stopAutoSave(homeDropId);
    
    // Delete photos first
    const photos = await this.getHomeDropPhotos(homeDropId);
    for (const photo of photos) {
      await (db as any).homeDropPhotos.delete(photo.id);
    }
    
    // Delete from sync queue
    await (db as any).homeDropSyncQueue
      .where('homeDropId')
      .equals(homeDropId)
      .delete();
    
    // Delete home drop capture
    await (db as any).homeDropCaptures.delete(homeDropId);
  }
  
  // ==================== Workflow Management ====================
  
  /**
   * Progress through workflow steps
   */
  async progressWorkflow(
    homeDropId: string,
    step: 'assignments' | 'gps' | 'photos' | 'review',
    data?: Partial<HomeDropCapture>
  ): Promise<void> {
    const homeDropCapture = await this.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    // Map step to step number
    const stepNumbers = {
      assignments: 1,
      gps: 2,
      photos: 3,
      review: 4
    };
    
    const stepNumber = stepNumbers[step];
    
    // Update workflow tracking
    const workflow = { ...homeDropCapture.workflow };
    workflow.currentStep = stepNumber;
    workflow.steps[step] = true;
    
    // Track step timestamps
    if (!workflow.stepTimestamps) {
      workflow.stepTimestamps = {};
    }
    workflow.stepTimestamps[`${step}Completed` as keyof typeof workflow.stepTimestamps] = new Date();
    
    // Update status based on step
    let status: HomeDropStatus = homeDropCapture.status;
    if (step === 'assignments') {
      status = 'in_progress';
    } else if (step === 'review' && this.isWorkflowComplete(workflow)) {
      status = 'captured';
    }
    
    // Update home drop capture
    await this.updateHomeDropCapture(homeDropId, {
      ...data,
      workflow,
      status,
      lastSavedStep: stepNumber
    });
  }
  
  /**
   * Check if workflow is complete
   */
  private isWorkflowComplete(workflow: HomeDropCapture['workflow']): boolean {
    return workflow.steps.assignments &&
           workflow.steps.gps &&
           workflow.steps.photos &&
           workflow.steps.review;
  }
  
  /**
   * Save progress (for resuming later)
   */
  async saveProgress(
    homeDropId: string, 
    step: number, 
    data?: Partial<HomeDropCapture>
  ): Promise<void> {
    await this.updateHomeDropCapture(homeDropId, {
      ...data,
      status: 'in_progress',
      workflow: {
        ...data?.workflow,
        currentStep: step,
        lastSavedStep: step
      } as HomeDropCapture['workflow']
    });
  }
  
  // ==================== Assignment Management ====================
  
  /**
   * Create assignment for home drop
   */
  async createAssignment(
    homeDropId: string,
    assignment: Partial<HomeDropAssignment>
  ): Promise<string> {
    const homeDropCapture = await this.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    const assignmentId = `ASSIGN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const fullAssignment: HomeDropAssignment = {
      id: assignmentId,
      homeDropId,
      poleNumber: homeDropCapture.poleNumber,
      customer: assignment.customer || homeDropCapture.customer,
      assignedTo: assignment.assignedTo || '',
      assignedBy: assignment.assignedBy || '',
      assignedAt: new Date(),
      priority: assignment.priority || 'medium',
      status: 'pending',
      ...assignment
    };
    
    // Save assignment
    await (db as any).homeDropAssignments.put(fullAssignment);
    
    // Update home drop with assignment reference
    await this.updateHomeDropCapture(homeDropId, {
      assignmentId,
      assignment: fullAssignment
    });
    
    // Progress workflow
    await this.progressWorkflow(homeDropId, 'assignments');
    
    return assignmentId;
  }
  
  /**
   * Get assignments for technician
   */
  async getAssignmentsForTechnician(technicianId: string): Promise<HomeDropAssignment[]> {
    return await (db as any).homeDropAssignments
      .where('assignedTo')
      .equals(technicianId)
      .toArray();
  }
  
  // ==================== Photo Management ====================
  
  /**
   * Add photo to home drop
   */
  async addPhoto(
    homeDropId: string, 
    photo: HomeDropPhoto
  ): Promise<void> {
    const homeDropCapture = await this.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    // Validate photo type
    if (!this.validationRules.requiredPhotos.includes(photo.type)) {
      throw new Error(`Invalid photo type: ${photo.type}`);
    }
    
    // Compress photo if needed
    const compressedPhoto = await this.compressPhoto(photo);
    
    // Save photo to storage
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
    
    // Update home drop capture
    const photos = [...homeDropCapture.photos, compressedPhoto];
    const completedPhotos = [...new Set(photos.map(p => p.type))];
    
    // Check if all required photos are captured
    const allPhotosComplete = this.validationRules.requiredPhotos.every(
      type => completedPhotos.includes(type)
    );
    
    await this.updateHomeDropCapture(homeDropId, {
      photos,
      completedPhotos,
      status: allPhotosComplete ? 'captured' : 'in_progress'
    });
    
    // Progress workflow if all photos complete
    if (allPhotosComplete) {
      await this.progressWorkflow(homeDropId, 'photos');
    }
    
    // Add photo to sync queue
    await this.addToSyncQueue(homeDropId, 'photo-upload', { photoId: photoStorage.id });
  }
  
  /**
   * Remove photo from home drop
   */
  async removePhoto(
    homeDropId: string, 
    photoType: HomeDropPhotoType
  ): Promise<void> {
    const homeDropCapture = await this.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    // Remove from photos array
    const photos = homeDropCapture.photos.filter(p => p.type !== photoType);
    const completedPhotos = [...new Set(photos.map(p => p.type))];
    
    // Remove from storage
    const photosToDelete = await (db as any).homeDropPhotos
      .where('homeDropId')
      .equals(homeDropId)
      .and((photo: HomeDropPhotoStorage) => photo.type === photoType)
      .toArray();
    
    for (const photo of photosToDelete) {
      await (db as any).homeDropPhotos.delete(photo.id);
    }
    
    // Update home drop capture
    await this.updateHomeDropCapture(homeDropId, {
      photos,
      completedPhotos,
      status: completedPhotos.length >= this.validationRules.requiredPhotos.length 
        ? 'captured' 
        : 'in_progress'
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
   * Compress photo
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
  
  // ==================== GPS Management ====================
  
  /**
   * Update GPS location for home drop
   */
  async updateGPSLocation(
    homeDropId: string,
    location: HomeDropCapture['gpsLocation']
  ): Promise<void> {
    if (!location) {
      throw new Error('GPS location is required');
    }
    
    const homeDropCapture = await this.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    // Validate GPS accuracy
    if (location.accuracy > this.config.gpsAccuracyThreshold) {
      throw new Error(`GPS accuracy (${location.accuracy}m) exceeds threshold (${this.config.gpsAccuracyThreshold}m)`);
    }
    
    // Calculate distance from pole
    const pole = await poleCaptureService.getPoleCapture(homeDropCapture.poleNumber);
    let distanceFromPole: number | undefined;
    
    if (pole?.gpsLocation) {
      distanceFromPole = this.calculateDistance(
        location.latitude,
        location.longitude,
        pole.gpsLocation.latitude,
        pole.gpsLocation.longitude
      );
      
      // Validate distance from pole
      if (distanceFromPole > this.validationRules.maxDistanceFromPole) {
        throw new Error(
          `Distance from pole (${distanceFromPole.toFixed(0)}m) exceeds maximum (${this.validationRules.maxDistanceFromPole}m)`
        );
      }
    }
    
    // Update home drop with GPS location
    await this.updateHomeDropCapture(homeDropId, {
      gpsLocation: {
        ...location,
        capturedAt: new Date()
      },
      distanceFromPole,
      customer: {
        ...homeDropCapture.customer,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          capturedAt: new Date()
        }
      }
    });
    
    // Progress workflow
    await this.progressWorkflow(homeDropId, 'gps');
  }
  
  /**
   * Calculate distance between two GPS points (Haversine formula)
   */
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
  
  // ==================== Installation Details ====================
  
  /**
   * Update installation details
   */
  async updateInstallationDetails(
    homeDropId: string,
    installation: Partial<HomeDropCapture['installation']>
  ): Promise<void> {
    const homeDropCapture = await this.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    // Validate optical power if provided
    if (installation.powerReadings?.opticalPower !== undefined) {
      const power = installation.powerReadings.opticalPower;
      if (power < this.validationRules.minOpticalPower || 
          power > this.validationRules.maxOpticalPower) {
        throw new Error(
          `Optical power (${power}dBm) outside acceptable range (${this.validationRules.minOpticalPower} to ${this.validationRules.maxOpticalPower}dBm)`
        );
      }
    }
    
    // Merge installation details
    const updatedInstallation = {
      equipment: {
        ...homeDropCapture.installation.equipment,
        ...installation.equipment
      },
      powerReadings: {
        ...homeDropCapture.installation.powerReadings,
        ...installation.powerReadings,
        testTimestamp: installation.powerReadings ? new Date() : undefined
      },
      serviceConfig: {
        ...homeDropCapture.installation.serviceConfig,
        ...installation.serviceConfig
      }
    };
    
    await this.updateHomeDropCapture(homeDropId, {
      installation: updatedInstallation
    });
  }
  
  // ==================== Quality & Approval ====================
  
  /**
   * Submit for approval
   */
  async submitForApproval(homeDropId: string): Promise<void> {
    const homeDropCapture = await this.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }
    
    // Validate all required data is present
    const validation = await this.validateHomeDropCapture(homeDropCapture);
    if (!validation.isValid) {
      throw new Error(`Cannot submit for approval: ${validation.errors.join(', ')}`);
    }
    
    // Update status
    await this.updateHomeDropCapture(homeDropId, {
      status: 'pending_approval',
      approvalStatus: 'pending',
      capturedAt: new Date(),
      approval: {
        status: 'pending'
      }
    });
    
    // Progress workflow
    await this.progressWorkflow(homeDropId, 'review');
  }
  
  /**
   * Approve home drop
   */
  async approveHomeDropCapture(
    homeDropId: string,
    approvedBy: string
  ): Promise<void> {
    await this.updateHomeDropCapture(homeDropId, {
      status: 'approved',
      approvalStatus: 'approved',
      approval: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      }
    });
  }
  
  /**
   * Reject home drop
   */
  async rejectHomeDropCapture(
    homeDropId: string,
    rejectedBy: string,
    reason: string,
    notes?: string
  ): Promise<void> {
    await this.updateHomeDropCapture(homeDropId, {
      status: 'rejected',
      approvalStatus: 'rejected',
      approval: {
        status: 'rejected',
        approvedBy: rejectedBy,
        approvedAt: new Date(),
        rejectionReason: reason,
        rejectionNotes: notes,
        requiresRework: true
      }
    });
  }
  
  /**
   * Update approval status (UI compatibility method)
   */
  async updateApprovalStatus(
    homeDropId: string,
    status: 'approved' | 'rejected',
    approvedBy: string,
    reason?: string,
    notes?: string
  ): Promise<void> {
    if (status === 'approved') {
      await this.approveHomeDropCapture(homeDropId, approvedBy);
    } else {
      await this.rejectHomeDropCapture(homeDropId, approvedBy, reason || 'Rejected', notes);
    }
  }
  
  /**
   * Validate home drop capture
   */
  async validateHomeDropCapture(homeDropCapture: HomeDropCapture): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!homeDropCapture.poleNumber) {
      errors.push('Pole number is required');
    }
    
    if (!homeDropCapture.customer?.name) {
      errors.push('Customer name is required');
    }
    
    if (!homeDropCapture.customer?.address) {
      errors.push('Customer address is required');
    }
    
    if (!homeDropCapture.gpsLocation) {
      errors.push('GPS location is required');
    }
    
    // Check required photos
    const missingPhotos = this.validationRules.requiredPhotos.filter(
      type => !homeDropCapture.completedPhotos.includes(type)
    );
    if (missingPhotos.length > 0) {
      errors.push(`Missing required photos: ${missingPhotos.join(', ')}`);
    }
    
    // Check optical power
    const power = homeDropCapture.installation?.powerReadings?.opticalPower;
    if (power === undefined) {
      warnings.push('Optical power reading not recorded');
    } else if (power < this.validationRules.minOpticalPower || 
               power > this.validationRules.maxOpticalPower) {
      errors.push(`Optical power (${power}dBm) outside acceptable range`);
    }
    
    // Check distance from pole
    if (homeDropCapture.distanceFromPole && 
        homeDropCapture.distanceFromPole > this.validationRules.maxDistanceFromPole) {
      warnings.push(`Distance from pole (${homeDropCapture.distanceFromPole.toFixed(0)}m) exceeds recommended maximum`);
    }
    
    // Check service activation
    if (!homeDropCapture.installation?.serviceConfig?.activationStatus) {
      warnings.push('Service not marked as activated');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // ==================== Sync Queue Management ====================
  
  /**
   * Add to sync queue
   */
  private async addToSyncQueue(
    homeDropId: string,
    action: HomeDropSyncQueueItem['action'],
    data: any
  ): Promise<void> {
    const queueItem: HomeDropSyncQueueItem = {
      id: `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      homeDropId,
      action,
      data,
      priority: action === 'photo-upload' ? 'low' : 'medium',
      attempts: 0,
      maxAttempts: this.config.maxSyncRetries,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await (db as any).homeDropSyncQueue.add(queueItem);
  }
  
  /**
   * Get sync queue
   */
  async getSyncQueue(): Promise<HomeDropSyncQueueItem[]> {
    return await (db as any).homeDropSyncQueue
      .where('status')
      .anyOf(['pending', 'processing'])
      .toArray();
  }
  
  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<void> {
    const queue = await this.getSyncQueue();
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < queue.length; i += this.config.syncBatchSize) {
      batches.push(queue.slice(i, i + this.config.syncBatchSize));
    }
    
    for (const batch of batches) {
      await Promise.all(batch.map(item => this.processSyncItem(item)));
    }
  }
  
  /**
   * Process single sync item
   */
  private async processSyncItem(item: HomeDropSyncQueueItem): Promise<void> {
    try {
      // Update status to processing
      await (db as any).homeDropSyncQueue.update(item.id, {
        status: 'processing',
        updatedAt: new Date()
      });
      
      // Process based on action type
      switch (item.action) {
        case 'create':
        case 'update':
          // TODO: Implement Firebase sync
          log.info(`Syncing home drop ${item.homeDropId}`, {}, "HomeDropCaptureService");
          break;
          
        case 'photo-upload':
          // TODO: Implement photo upload to Firebase Storage
          log.info(`Uploading photo for ${item.homeDropId}`, {}, "HomeDropCaptureService");
          break;
          
        case 'delete':
          // TODO: Implement Firebase deletion
          log.info(`Deleting home drop ${item.homeDropId}`, {}, "HomeDropCaptureService");
          break;
      }
      
      // Mark as completed
      await (db as any).homeDropSyncQueue.update(item.id, {
        status: 'completed',
        updatedAt: new Date()
      });
      
      // Update home drop sync status
      await this.updateHomeDropCapture(item.homeDropId, {
        syncStatus: 'synced',
        syncedAt: new Date()
      });
      
    } catch (error) {
      // Handle sync error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await (db as any).homeDropSyncQueue.update(item.id, {
        status: 'failed',
        lastError: errorMessage,
        attempts: item.attempts + 1,
        updatedAt: new Date()
      });
      
      // Update home drop with error
      await this.updateHomeDropCapture(item.homeDropId, {
        syncStatus: 'error',
        syncError: errorMessage
      });
    }
  }
  
  // ==================== Statistics & Filtering ====================
  
  /**
   * Get statistics
   */
  async getStatistics(): Promise<HomeDropStatistics> {
    const homeDropCaptures = await this.getAllHomeDropCaptures();
    
    const stats: HomeDropStatistics = {
      total: homeDropCaptures.length,
      assigned: homeDropCaptures.filter(h => h.status === 'assigned').length,
      inProgress: homeDropCaptures.filter(h => h.status === 'in_progress').length,
      captured: homeDropCaptures.filter(h => h.status === 'captured').length,
      synced: homeDropCaptures.filter(h => h.status === 'synced').length,
      approved: homeDropCaptures.filter(h => h.status === 'approved').length,
      rejected: homeDropCaptures.filter(h => h.status === 'rejected').length,
      errors: homeDropCaptures.filter(h => h.status === 'error').length
    };
    
    // Calculate performance metrics
    const completedCaptures = homeDropCaptures.filter(h => h.capturedAt);
    if (completedCaptures.length > 0) {
      const captureTimes = completedCaptures.map(h => {
        const start = new Date(h.createdAt).getTime();
        const end = h.capturedAt ? new Date(h.capturedAt).getTime() : Date.now();
        return end - start;
      });
      
      stats.averageCaptureTime = captureTimes.reduce((a, b) => a + b, 0) / captureTimes.length;
      stats.averagePhotosPerCapture = completedCaptures.reduce((sum, h) => sum + h.photos.length, 0) / completedCaptures.length;
      
      const syncedCount = homeDropCaptures.filter(h => h.syncStatus === 'synced').length;
      stats.syncSuccessRate = (syncedCount / homeDropCaptures.length) * 100;
      
      const approvedCount = homeDropCaptures.filter(h => h.approval?.status === 'approved').length;
      const reviewedCount = homeDropCaptures.filter(h => h.approval?.status).length;
      stats.approvalRate = reviewedCount > 0 ? (approvedCount / reviewedCount) * 100 : 0;
    }
    
    // By date counts
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    stats.todayCount = homeDropCaptures.filter(h => new Date(h.createdAt) >= today).length;
    stats.weekCount = homeDropCaptures.filter(h => new Date(h.createdAt) >= weekAgo).length;
    stats.monthCount = homeDropCaptures.filter(h => new Date(h.createdAt) >= monthAgo).length;
    
    return stats;
  }
  
  /**
   * Filter home drops
   */
  async filterHomeDropCaptures(options: HomeDropFilterOptions): Promise<HomeDropCapture[]> {
    let query = (db as any).homeDropCaptures.toCollection();
    
    // Apply filters
    if (options.status && options.status.length > 0) {
      query = query.and((hd: HomeDropCapture) => options.status!.includes(hd.status));
    }
    
    if (options.syncStatus && options.syncStatus.length > 0) {
      query = query.and((hd: HomeDropCapture) => options.syncStatus!.includes(hd.syncStatus));
    }
    
    if (options.contractorId && options.contractorId.length > 0) {
      query = query.and((hd: HomeDropCapture) => options.contractorId!.includes(hd.contractorId));
    }
    
    if (options.projectId && options.projectId.length > 0) {
      query = query.and((hd: HomeDropCapture) => options.projectId!.includes(hd.projectId));
    }
    
    if (options.capturedBy && options.capturedBy.length > 0) {
      query = query.and((hd: HomeDropCapture) => options.capturedBy!.includes(hd.capturedBy));
    }
    
    if (options.poleNumber && options.poleNumber.length > 0) {
      query = query.and((hd: HomeDropCapture) => options.poleNumber!.includes(hd.poleNumber));
    }
    
    if (options.dateRange) {
      query = query.and((hd: HomeDropCapture) => {
        const createdAt = new Date(hd.createdAt);
        return createdAt >= options.dateRange!.start && createdAt <= options.dateRange!.end;
      });
    }
    
    if (options.hasPhotos !== undefined) {
      query = query.and((hd: HomeDropCapture) => 
        options.hasPhotos ? hd.photos.length > 0 : hd.photos.length === 0
      );
    }
    
    if (options.needsApproval) {
      query = query.and((hd: HomeDropCapture) => hd.status === 'pending_approval');
    }
    
    if (options.hasErrors) {
      query = query.and((hd: HomeDropCapture) => 
        hd.status === 'error' || hd.syncStatus === 'error'
      );
    }
    
    return await query.toArray();
  }
  
  // ==================== Export & Integration ====================
  
  /**
   * Export to GeoPackage format for QGIS/QField
   */
  async exportToGeoPackage(
    homeDropIds?: string[]
  ): Promise<HomeDropGeoPackageExport[]> {
    const homeDropCaptures = homeDropIds
      ? await Promise.all(homeDropIds.map(id => this.getHomeDropCapture(id)))
      : await this.getAllHomeDropCaptures();
    
    return homeDropCaptures
      .filter((hd): hd is HomeDropCapture => hd !== undefined)
      .map(hd => ({
        id: hd.id,
        poleNumber: hd.poleNumber,
        customerName: hd.customer.name,
        customerAddress: hd.customer.address,
        latitude: hd.gpsLocation?.latitude || 0,
        longitude: hd.gpsLocation?.longitude || 0,
        installationDate: hd.capturedAt?.toISOString() || '',
        status: hd.status,
        opticalPower: hd.installation.powerReadings.opticalPower,
        serviceActive: hd.installation.serviceConfig.activationStatus || false,
        technicianName: hd.capturedByName,
        photos: hd.photos.map(p => ({
          type: p.type,
          url: p.uploadUrl || ''
        })),
        geometry: {
          type: 'Point' as const,
          coordinates: [
            hd.gpsLocation?.longitude || 0,
            hd.gpsLocation?.latitude || 0
          ]
        }
      }));
  }
  
  // ==================== Live Queries (Reactive) ====================
  
  /**
   * Watch all home drops (reactive)
   */
  watchHomeDropCaptures() {
    return liveQuery(() => (db as any).homeDropCaptures.toArray());
  }
  
  /**
   * Watch specific home drop (reactive)
   */
  watchHomeDropCapture(homeDropId: string) {
    return liveQuery(() => (db as any).homeDropCaptures.get(homeDropId));
  }
  
  /**
   * Watch sync queue (reactive)
   */
  watchSyncQueue() {
    return liveQuery(() => 
      (db as any).homeDropSyncQueue
        .where('status')
        .anyOf(['pending', 'processing'])
        .toArray()
    );
  }
  
  /**
   * Watch assignments for technician (reactive)
   */
  watchAssignments(technicianId: string) {
    return liveQuery(() =>
      (db as any).homeDropAssignments
        .where('assignedTo')
        .equals(technicianId)
        .toArray()
    );
  }
  
  // ==================== Utility Methods ====================
  
  /**
   * Generate unique home drop ID
   */
  private generateHomeDropId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HD-${timestamp}-${random}`;
  }
  
  /**
   * Start auto-save timer
   */
  private startAutoSave(homeDropId: string): void {
    // Clear existing timer if any
    this.stopAutoSave(homeDropId);
    
    // Set new timer
    const timer = setInterval(async () => {
      const homeDropCapture = await this.getHomeDropCapture(homeDropId);
      if (homeDropCapture && homeDropCapture.status === 'in_progress') {
        await this.saveProgress(
          homeDropId,
          homeDropCapture.workflow.currentStep
        );
      } else {
        this.stopAutoSave(homeDropId);
      }
    }, this.config.autoSaveInterval * 1000);
    
    this.autoSaveTimers.set(homeDropId, timer);
  }
  
  /**
   * Stop auto-save timer
   */
  private stopAutoSave(homeDropId: string): void {
    const timer = this.autoSaveTimers.get(homeDropId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(homeDropId);
    }
  }
  
  /**
   * Clean up old offline data
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.offlineCacheDuration);
    
    // Delete old synced home drops
    const oldHomeDrops = await (db as any).homeDropCaptures
      .where('syncStatus')
      .equals('synced')
      .and((hd: HomeDropCapture) => new Date(hd.syncedAt!) < cutoffDate)
      .toArray();
    
    for (const homeDropCapture of oldHomeDrops) {
      await this.deleteHomeDropCapture(homeDropCapture.id);
    }
    
    log.info(`🧹 Cleaned up ${oldHomeDrops.length} old home drop captures`, {}, "HomeDropCaptureService");
  }
}

// Export singleton instance
export const homeDropCaptureService = new HomeDropCaptureService();