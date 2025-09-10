import { log } from '@/lib/logger';
import { db } from '@/lib/database';
import type {
  HomeDropCapture,
  HomeDropStatus,
  HomeDropServiceConfig,
  HomeDropValidationRules
} from '@/types/home-drop.types';
import { poleCaptureService } from '../pole-capture.service';

/**
 * Core Home Drop Service
 * 
 * Handles CRUD operations and workflow management for home drop captures.
 * This service is responsible for the fundamental data operations and 
 * workflow state transitions.
 */
class CoreHomeDropService {
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

  // Validation rules
  private readonly validationRules: HomeDropValidationRules = {
    requiredPhotos: [
      'power-meter-test',
      'fibertime-setup-confirmation',
      'fibertime-device-actions',
      'router-4-lights-status'
    ],
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

  // Database initialization state
  private isInitialized = false;

  constructor() {
    this.setupService();
  }

  /**
   * Initialize service
   */
  private async setupService() {
    log.info('✅ Core Home Drop Service initialized', {}, "CoreHomeDropService");
  }

  /**
   * Ensure database tables are available
   */
  private async ensureDatabase(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const tableNames = db.tables.map(t => t.name);
      const requiredTables = ['homeDropCaptures', 'homeDropPhotos', 'homeDropAssignments', 'homeDropSyncQueue'];
      const missingTables = requiredTables.filter(t => !tableNames.includes(t));

      if (missingTables.length > 0) {
        log.warn('⚠️ Home drop tables not found, upgrading database...', {}, "CoreHomeDropService");
        
        await db.close();
        await db.open();
        
        const newTableNames = db.tables.map(t => t.name);
        const stillMissing = requiredTables.filter(t => !newTableNames.includes(t));
        
        if (stillMissing.length > 0) {
          throw new Error(`Database upgrade failed. Missing tables: ${stillMissing.join(', ')}`);
        }
      }

      this.isInitialized = true;
      log.info('✅ Core Home Drop database initialized', {}, "CoreHomeDropService");
    } catch (error) {
      log.error('❌ Failed to initialize home drop database:', {}, "CoreHomeDropService", error);
      throw error;
    }
  }

  /**
   * Generate unique home drop ID
   */
  generateHomeDropId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HD-${timestamp}-${random}`;
  }

  /**
   * Create new home drop capture
   */
  async createHomeDropCapture(data: Partial<HomeDropCapture>): Promise<string> {
    if (!data.poleNumber) {
      throw new Error('Pole number is required for home drop capture');
    }
    
    const pole = await poleCaptureService.getPoleCapture(data.poleNumber);
    if (!pole) {
      throw new Error(`Pole ${data.poleNumber} not found. Please capture the pole first.`);
    }
    
    const homeDropId = this.generateHomeDropId();
    
    const homeDropCapture: HomeDropCapture = {
      id: homeDropId,
      poleNumber: data.poleNumber,
      projectId: data.projectId || pole.projectId,
      projectName: data.projectName || pole.projectName,
      contractorId: data.contractorId || '',
      
      status: 'assigned',
      syncStatus: 'pending',
      syncAttempts: 0,
      
      customer: data.customer || {
        name: '',
        address: ''
      },
      
      installation: data.installation || {
        equipment: {},
        powerReadings: {},
        serviceConfig: {}
      },
      
      photos: [],
      requiredPhotos: this.validationRules.requiredPhotos,
      completedPhotos: [],
      
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
      
      capturedBy: data.capturedBy || '',
      capturedByName: data.capturedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      ...data
    };
    
    await (db as any).homeDropCaptures.put(homeDropCapture);
    
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
    
    await (db as any).homeDropCaptures.update(homeDropId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Delete home drop capture
   */
  async deleteHomeDropCapture(homeDropId: string): Promise<void> {
    const photos = await (db as any).homeDropPhotos
      .where('homeDropId')
      .equals(homeDropId)
      .toArray();
    
    for (const photo of photos) {
      await (db as any).homeDropPhotos.delete(photo.id);
    }
    
    await (db as any).homeDropSyncQueue
      .where('homeDropId')
      .equals(homeDropId)
      .delete();
    
    await (db as any).homeDropCaptures.delete(homeDropId);
  }

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
    
    const stepNumbers = {
      assignments: 1,
      gps: 2,
      photos: 3,
      review: 4
    };
    
    const stepNumber = stepNumbers[step];
    
    const workflow = { ...homeDropCapture.workflow };
    workflow.currentStep = stepNumber;
    workflow.steps[step] = true;
    
    if (!workflow.stepTimestamps) {
      workflow.stepTimestamps = {};
    }
    workflow.stepTimestamps[`${step}Completed` as keyof typeof workflow.stepTimestamps] = new Date();
    
    let status: HomeDropStatus = homeDropCapture.status;
    if (step === 'assignments') {
      status = 'in_progress';
    } else if (step === 'review' && this.isWorkflowComplete(workflow)) {
      status = 'captured';
    }
    
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
  isWorkflowComplete(workflow: HomeDropCapture['workflow']): boolean {
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

export const coreHomeDropService = new CoreHomeDropService();