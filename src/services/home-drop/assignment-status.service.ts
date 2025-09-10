/**
 * Assignment Status Service
 * Handles status tracking, workflow management, and status transitions
 * File: assignment-status.service.ts (Target: 200 lines)
 */

import type { HomeDropAssignment, HomeDropStatus } from '@/types/home-drop.types';
import { coreAssignmentService, type AssignmentStatus } from './core-assignment.service';
import { homeDropCaptureService } from '../home-drop-capture.service';
import { log } from '@/lib/logger';

export interface StatusTransition {
  from: AssignmentStatus;
  to: AssignmentStatus;
  allowedBy: ('technician' | 'admin' | 'system')[];
  validationRequired?: boolean;
}

export interface StatusHistory {
  assignmentId: string;
  previousStatus: AssignmentStatus;
  newStatus: AssignmentStatus;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/**
 * Assignment Status Service
 */
class AssignmentStatusService {
  private readonly statusTransitions: StatusTransition[] = [
    { from: 'pending', to: 'accepted', allowedBy: ['technician', 'admin'] },
    { from: 'accepted', to: 'in_progress', allowedBy: ['technician', 'admin'] },
    { from: 'in_progress', to: 'completed', allowedBy: ['technician', 'admin'], validationRequired: true },
    { from: 'pending', to: 'cancelled', allowedBy: ['admin'] },
    { from: 'accepted', to: 'cancelled', allowedBy: ['admin'] },
    { from: 'in_progress', to: 'cancelled', allowedBy: ['admin'] },
    { from: 'pending', to: 'expired', allowedBy: ['system'] }
  ];

  /**
   * Accept assignment
   */
  async acceptAssignment(assignmentId: string, technicianId: string): Promise<void> {
    const assignment = await coreAssignmentService.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.assignedTo !== technicianId) {
      throw new Error(`Assignment ${assignmentId} is not assigned to technician ${technicianId}`);
    }

    this.validateStatusTransition(assignment.status, 'accepted', 'technician');

    await coreAssignmentService.updateAssignment(assignmentId, {
      status: 'accepted',
      acceptedAt: new Date()
    });

    await this.updateHomeDropStatus(assignment.homeDropId, 'accepted');
    log.info('Assignment accepted', { assignmentId, technicianId }, 'AssignmentStatusService');
  }

  /**
   * Start assignment work
   */
  async startAssignment(assignmentId: string, technicianId: string): Promise<void> {
    const assignment = await coreAssignmentService.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.assignedTo !== technicianId) {
      throw new Error(`Assignment ${assignmentId} is not assigned to technician ${technicianId}`);
    }

    this.validateStatusTransition(assignment.status, 'in_progress', 'technician');

    await coreAssignmentService.updateAssignment(assignmentId, {
      status: 'in_progress',
      startedAt: new Date()
    });

    await this.updateHomeDropStatus(assignment.homeDropId, 'in_progress');
    log.info('Assignment started', { assignmentId, technicianId }, 'AssignmentStatusService');
  }

  /**
   * Complete assignment
   */
  async completeAssignment(assignmentId: string, technicianId: string): Promise<void> {
    const assignment = await coreAssignmentService.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.assignedTo !== technicianId) {
      throw new Error(`Assignment ${assignmentId} is not assigned to technician ${technicianId}`);
    }

    this.validateStatusTransition(assignment.status, 'completed', 'technician');

    // Validate home drop capture
    const homeDropCapture = await homeDropCaptureService.getHomeDropCapture(assignment.homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${assignment.homeDropId} not found`);
    }

    const validation = await homeDropCaptureService.validateHomeDropCapture(homeDropCapture);
    if (!validation.isValid) {
      throw new Error(`Cannot complete: ${validation.errors.join(', ')}`);
    }

    await coreAssignmentService.updateAssignment(assignmentId, {
      status: 'completed',
      completedAt: new Date()
    });

    await this.updateHomeDropStatus(assignment.homeDropId, 'completed');
    log.info('Assignment completed', { assignmentId, technicianId }, 'AssignmentStatusService');
  }

  /**
   * Cancel assignment
   */
  async cancelAssignment(
    assignmentId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<void> {
    const assignment = await coreAssignmentService.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    this.validateStatusTransition(assignment.status, 'cancelled', 'admin');

    const cancellationNote = `CANCELLED by ${cancelledBy}: ${reason || 'No reason provided'}`;
    const updatedNotes = assignment.installationNotes 
      ? `${assignment.installationNotes}\n\n${cancellationNote}`
      : cancellationNote;

    await coreAssignmentService.updateAssignment(assignmentId, {
      status: 'cancelled',
      completedAt: new Date(),
      installationNotes: updatedNotes
    });

    await this.updateHomeDropStatus(assignment.homeDropId, 'cancelled');
    log.info('Assignment cancelled', { assignmentId, cancelledBy, reason }, 'AssignmentStatusService');
  }

  /**
   * Mark assignment as expired
   */
  async expireAssignment(assignmentId: string): Promise<void> {
    const assignment = await coreAssignmentService.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    this.validateStatusTransition(assignment.status, 'expired', 'system');

    await coreAssignmentService.updateAssignment(assignmentId, {
      status: 'expired'
    });

    await this.updateHomeDropStatus(assignment.homeDropId, 'expired');
    log.info('Assignment expired', { assignmentId }, 'AssignmentStatusService');
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    from: AssignmentStatus,
    to: AssignmentStatus,
    role: 'technician' | 'admin' | 'system'
  ): void {
    const transition = this.statusTransitions.find(t => t.from === from && t.to === to);
    
    if (!transition) {
      throw new Error(`Invalid status transition from ${from} to ${to}`);
    }

    if (!transition.allowedBy.includes(role)) {
      throw new Error(`Role ${role} is not allowed to transition from ${from} to ${to}`);
    }
  }

  /**
   * Update home drop status based on assignment status
   */
  private async updateHomeDropStatus(homeDropId: string, assignmentStatus: AssignmentStatus): Promise<void> {
    let homeDropStatus: HomeDropStatus;
    
    switch (assignmentStatus) {
      case 'pending':
        homeDropStatus = 'assigned';
        break;
      case 'accepted':
      case 'in_progress':
        homeDropStatus = 'in_progress';
        break;
      case 'completed':
        homeDropStatus = 'captured';
        break;
      case 'cancelled':
      case 'expired':
        homeDropStatus = 'assigned';
        break;
      default:
        return;
    }

    await homeDropCaptureService.updateHomeDropCapture(homeDropId, {
      status: homeDropStatus
    });
  }
}

export const assignmentStatusService = new AssignmentStatusService();