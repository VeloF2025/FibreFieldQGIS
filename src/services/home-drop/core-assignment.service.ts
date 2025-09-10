/**
 * Core Assignment Service
 * Handles basic assignment CRUD operations, validation, and core business logic
 * File: core-assignment.service.ts (Target: 200 lines)
 */

import { db } from '@/lib/database';
import type { HomeDropAssignment, HomeDropCapture } from '@/types/home-drop.types';
import { homeDropCaptureService } from '../home-drop-capture.service';
import { poleCaptureService } from '../pole-capture.service';
import { log } from '@/lib/logger';

export type AssignmentPriority = 'high' | 'medium' | 'low';
export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

export interface AssignmentConfig {
  maxAssignmentsPerTechnician: number;
  assignmentExpiryDays: number;
  highPriorityMaxHours: number;
  mediumPriorityMaxHours: number;
  lowPriorityMaxHours: number;
  autoAcceptanceEnabled: boolean;
  notificationEnabled: boolean;
  geoPackageExportBatchSize: number;
}

export interface AssignmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Core Assignment Service
 */
class CoreAssignmentService {
  private readonly config: AssignmentConfig = {
    maxAssignmentsPerTechnician: 20,
    assignmentExpiryDays: 7,
    highPriorityMaxHours: 24,
    mediumPriorityMaxHours: 72,
    lowPriorityMaxHours: 168,
    autoAcceptanceEnabled: false,
    notificationEnabled: true,
    geoPackageExportBatchSize: 100
  };

  private isInitialized = false;

  /**
   * Ensure database tables are available
   */
  async ensureDatabase(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const tableNames = db.tables.map(t => t.name);
      const requiredTables = ['homeDropAssignments', 'homeDropCaptures'];
      const missingTables = requiredTables.filter(t => !tableNames.includes(t));

      if (missingTables.length > 0) {
        log.warn('Home drop tables not found, upgrading database', { missingTables }, 'CoreAssignmentService');
        await db.close();
        await db.open();
        
        const newTableNames = db.tables.map(t => t.name);
        const stillMissing = requiredTables.filter(t => !newTableNames.includes(t));
        
        if (stillMissing.length > 0) {
          throw new Error(`Database upgrade failed. Missing tables: ${stillMissing.join(', ')}`);
        }
      }

      this.isInitialized = true;
    } catch (error) {
      log.error('Failed to initialize database', {}, 'CoreAssignmentService', error as Error);
      throw error;
    }
  }

  /**
   * Create new assignment
   */
  async createAssignment(
    homeDropId: string,
    assignmentData: Partial<HomeDropAssignment>
  ): Promise<string> {
    await this.ensureDatabase();

    const homeDropCapture = await homeDropCaptureService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }

    const pole = await poleCaptureService.getPoleCapture(homeDropCapture.poleNumber);
    if (!pole) {
      throw new Error(`Pole ${homeDropCapture.poleNumber} not found`);
    }

    const existingAssignment = await this.getAssignmentByHomeDropId(homeDropId);
    if (existingAssignment) {
      throw new Error(`Assignment already exists for home drop ${homeDropId}`);
    }

    const assignmentId = this.generateAssignmentId();

    const assignment: HomeDropAssignment = {
      id: assignmentId,
      homeDropId,
      poleNumber: homeDropCapture.poleNumber,
      customer: assignmentData.customer || homeDropCapture.customer,
      assignedTo: assignmentData.assignedTo || '',
      assignedBy: assignmentData.assignedBy || '',
      assignedAt: new Date(),
      scheduledDate: assignmentData.scheduledDate,
      priority: assignmentData.priority || 'medium',
      installationNotes: assignmentData.installationNotes,
      accessNotes: assignmentData.accessNotes,
      status: 'pending',
      ...assignmentData
    };

    await (db as any).homeDropAssignments.put(assignment);

    await homeDropCaptureService.updateHomeDropCapture(homeDropId, {
      assignmentId,
      assignment,
      status: 'assigned'
    });

    log.info('Assignment created', { assignmentId, homeDropId }, 'CoreAssignmentService');
    return assignmentId;
  }

  /**
   * Get assignment by ID
   */
  async getAssignment(assignmentId: string): Promise<HomeDropAssignment | undefined> {
    await this.ensureDatabase();
    return await (db as any).homeDropAssignments.get(assignmentId);
  }

  /**
   * Get assignment by home drop ID
   */
  async getAssignmentByHomeDropId(homeDropId: string): Promise<HomeDropAssignment | undefined> {
    await this.ensureDatabase();
    return await (db as any).homeDropAssignments
      .where('homeDropId')
      .equals(homeDropId)
      .first();
  }

  /**
   * Get all assignments
   */
  async getAllAssignments(): Promise<HomeDropAssignment[]> {
    await this.ensureDatabase();
    return await (db as any).homeDropAssignments.toArray();
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    assignmentId: string,
    updates: Partial<HomeDropAssignment>
  ): Promise<void> {
    await this.ensureDatabase();
    
    const existing = await this.getAssignment(assignmentId);
    if (!existing) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    await (db as any).homeDropAssignments.update(assignmentId, updates);
    log.info('Assignment updated', { assignmentId }, 'CoreAssignmentService');
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    await this.ensureDatabase();
    
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    await homeDropCaptureService.updateHomeDropCapture(assignment.homeDropId, {
      assignmentId: undefined,
      assignment: undefined,
      status: 'assigned'
    });

    await (db as any).homeDropAssignments.delete(assignmentId);
    log.info('Assignment deleted', { assignmentId }, 'CoreAssignmentService');
  }

  /**
   * Get configuration
   */
  getConfig(): AssignmentConfig {
    return { ...this.config };
  }

  /**
   * Generate unique assignment ID
   */
  private generateAssignmentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ASSIGN-${timestamp}-${random}`;
  }
}

export const coreAssignmentService = new CoreAssignmentService();