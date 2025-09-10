/**
 * Assignment Operations Service
 * Handles bulk operations, reassignments, validation, and utility functions
 * File: assignment-operations.service.ts (Target: 200 lines)
 */

import type { HomeDropAssignment } from '@/types/home-drop.types';
import { coreAssignmentService, type AssignmentPriority, type AssignmentStatus } from './core-assignment.service';
import { assignmentStatisticsService } from './assignment-statistics.service';
import { assignmentStatusService } from './assignment-status.service';
import { log } from '@/lib/logger';

export interface BulkAssignmentOperation {
  homeDropIds: string[];
  assignedTo: string;
  assignedBy: string;
  priority?: AssignmentPriority;
  scheduledDate?: Date;
  notes?: string;
}

export interface BulkUpdateResult {
  successful: string[];
  failed: { assignmentId: string; error: string }[];
}

export interface AssignmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Assignment Operations Service
 */
class AssignmentOperationsService {
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize service with periodic cleanup
   */
  private initializeService(): void {
    this.setupPeriodicCleanup();
    log.info('Assignment Operations Service initialized', {}, 'AssignmentOperationsService');
  }

  /**
   * Create bulk assignments
   */
  async createBulkAssignments(operation: BulkAssignmentOperation): Promise<string[]> {
    const assignmentIds: string[] = [];
    const errors: string[] = [];

    const config = coreAssignmentService.getConfig();
    const currentWorkload = await assignmentStatisticsService.getTechnicianWorkload(operation.assignedTo);
    const newTotalAssignments = currentWorkload.activeAssignments + operation.homeDropIds.length;
    
    if (newTotalAssignments > config.maxAssignmentsPerTechnician) {
      throw new Error(
        `Bulk assignment would exceed maximum assignments for technician ${operation.assignedTo} ` +
        `(${newTotalAssignments}/${config.maxAssignmentsPerTechnician})`
      );
    }

    for (const homeDropId of operation.homeDropIds) {
      try {
        const assignmentId = await coreAssignmentService.createAssignment(homeDropId, {
          assignedTo: operation.assignedTo,
          assignedBy: operation.assignedBy,
          priority: operation.priority || 'medium',
          scheduledDate: operation.scheduledDate,
          installationNotes: operation.notes
        });
        assignmentIds.push(assignmentId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Home drop ${homeDropId}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      log.warn('Bulk assignment completed with errors', { errorCount: errors.length, errors }, 'AssignmentOperationsService');
    }

    log.info('Bulk assignment created', { count: assignmentIds.length, assignedTo: operation.assignedTo }, 'AssignmentOperationsService');
    return assignmentIds;
  }

  /**
   * Update bulk assignments
   */
  async updateBulkAssignments(
    assignmentIds: string[],
    updates: Partial<HomeDropAssignment>
  ): Promise<BulkUpdateResult> {
    const successful: string[] = [];
    const failed: { assignmentId: string; error: string }[] = [];

    for (const assignmentId of assignmentIds) {
      try {
        await coreAssignmentService.updateAssignment(assignmentId, updates);
        successful.push(assignmentId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ assignmentId, error: errorMessage });
      }
    }

    log.info('Bulk update completed', { successful: successful.length, failed: failed.length }, 'AssignmentOperationsService');
    return { successful, failed };
  }

  /**
   * Reassign assignment to different technician
   */
  async reassignAssignment(
    assignmentId: string,
    newTechnicianId: string,
    reassignedBy: string,
    reason?: string
  ): Promise<void> {
    const assignment = await coreAssignmentService.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status === 'completed') {
      throw new Error('Cannot reassign completed assignment');
    }

    const config = coreAssignmentService.getConfig();
    const workload = await assignmentStatisticsService.getTechnicianWorkload(newTechnicianId);
    
    if (workload.activeAssignments >= config.maxAssignmentsPerTechnician) {
      throw new Error(
        `Technician ${newTechnicianId} has reached maximum assignments (${config.maxAssignmentsPerTechnician})`
      );
    }

    const oldTechnicianId = assignment.assignedTo;
    const reassignmentNote = `REASSIGNED from ${oldTechnicianId} to ${newTechnicianId} by ${reassignedBy}: ${reason || 'No reason provided'}`;
    const updatedNotes = assignment.installationNotes 
      ? `${assignment.installationNotes}\n\n${reassignmentNote}`
      : reassignmentNote;

    await coreAssignmentService.updateAssignment(assignmentId, {
      assignedTo: newTechnicianId,
      status: 'pending',
      acceptedAt: undefined,
      startedAt: undefined,
      installationNotes: updatedNotes
    });

    log.info('Assignment reassigned', { assignmentId, oldTechnicianId, newTechnicianId, reassignedBy }, 'AssignmentOperationsService');
  }

  /**
   * Validate assignment data
   */
  async validateAssignment(assignment: Partial<HomeDropAssignment>): Promise<AssignmentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!assignment.homeDropId) errors.push('Home drop ID is required');
    if (!assignment.poleNumber) errors.push('Pole number is required');
    if (!assignment.assignedTo) errors.push('Assigned technician is required');
    if (!assignment.assignedBy) errors.push('Assignment creator is required');
    if (!assignment.customer?.name) errors.push('Customer name is required');
    if (!assignment.customer?.address) errors.push('Customer address is required');

    if (assignment.assignedTo) {
      const config = coreAssignmentService.getConfig();
      const workload = await assignmentStatisticsService.getTechnicianWorkload(assignment.assignedTo);
      if (workload.activeAssignments >= config.maxAssignmentsPerTechnician) {
        errors.push(`Technician has reached maximum assignments (${config.maxAssignmentsPerTechnician})`);
      }
    }

    if (assignment.scheduledDate) {
      const scheduledDate = new Date(assignment.scheduledDate);
      const now = new Date();
      
      if (scheduledDate < now) {
        warnings.push('Scheduled date is in the past');
      }
      
      const config = coreAssignmentService.getConfig();
      const timeDiff = scheduledDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (assignment.priority === 'high' && hoursDiff > config.highPriorityMaxHours) {
        warnings.push(`High priority assignment scheduled beyond ${config.highPriorityMaxHours} hours`);
      } else if (assignment.priority === 'medium' && hoursDiff > config.mediumPriorityMaxHours) {
        warnings.push(`Medium priority assignment scheduled beyond ${config.mediumPriorityMaxHours} hours`);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Setup periodic cleanup of expired assignments
   */
  private setupPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await coreAssignmentService.ensureDatabase();
        await this.cleanupExpiredAssignments();
        log.info('Periodic cleanup completed', {}, 'AssignmentOperationsService');
      } catch (error) {
        log.warn('Periodic cleanup failed', {}, 'AssignmentOperationsService', error as Error);
      }
    }, 60 * 60 * 1000);

    setTimeout(async () => {
      try {
        await coreAssignmentService.ensureDatabase();
        await this.cleanupExpiredAssignments();
        log.info('Initial cleanup completed', {}, 'AssignmentOperationsService');
      } catch (error) {
        log.warn('Initial cleanup failed', {}, 'AssignmentOperationsService', error as Error);
      }
    }, 5000);
  }

  /**
   * Clean up expired assignments
   */
  private async cleanupExpiredAssignments(): Promise<void> {
    await coreAssignmentService.ensureDatabase();
    
    const config = coreAssignmentService.getConfig();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.assignmentExpiryDays);

    try {
      const assignments = await coreAssignmentService.getAllAssignments();
      const expiredAssignments = assignments.filter(a => 
        a.status === 'pending' && new Date(a.assignedAt) < cutoffDate
      );

      for (const assignment of expiredAssignments) {
        await assignmentStatusService.expireAssignment(assignment.id);
      }

      if (expiredAssignments.length > 0) {
        log.info('Cleaned up expired assignments', { count: expiredAssignments.length }, 'AssignmentOperationsService');
      }
    } catch (error) {
      log.warn('Failed to cleanup expired assignments', {}, 'AssignmentOperationsService', error as Error);
    }
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

export const assignmentOperationsService = new AssignmentOperationsService();