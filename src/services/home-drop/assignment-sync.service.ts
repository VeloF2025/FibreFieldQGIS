/**
 * Assignment Sync Service
 * Handles data synchronization, conflict resolution, and background sync operations
 * File: assignment-sync.service.ts (Target: 150 lines)
 */

import type { HomeDropAssignment } from '@/types/home-drop.types';
import { coreAssignmentService } from './core-assignment.service';
import { assignmentStatusService } from './assignment-status.service';
import { log } from '@/lib/logger';

export interface SyncResult {
  successful: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  mergeFields?: string[];
}

export interface SyncStatus {
  lastSyncAt?: Date;
  pendingChanges: number;
  syncInProgress: boolean;
  lastError?: string;
}

/**
 * Assignment Sync Service
 */
class AssignmentSyncService {
  private syncInProgress = false;
  private lastSyncAt?: Date;
  private syncQueue: string[] = [];

  /**
   * Sync assignments with remote server
   */
  async syncAssignments(assignmentIds?: string[]): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      successful: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      const assignments = assignmentIds 
        ? await this.getAssignmentsByIds(assignmentIds)
        : await coreAssignmentService.getAllAssignments();

      for (const assignment of assignments) {
        try {
          await this.syncSingleAssignment(assignment);
          result.successful++;
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Assignment ${assignment.id}: ${errorMessage}`);
        }
      }

      this.lastSyncAt = new Date();
      log.info('Sync completed', result, 'AssignmentSyncService');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Queue assignment for background sync
   */
  async queueForSync(assignmentId: string): Promise<void> {
    if (!this.syncQueue.includes(assignmentId)) {
      this.syncQueue.push(assignmentId);
      log.info('Assignment queued for sync', { assignmentId, queueSize: this.syncQueue.length }, 'AssignmentSyncService');
    }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<SyncResult> {
    if (this.syncQueue.length === 0) {
      return { successful: 0, failed: 0, conflicts: 0, errors: [] };
    }

    const assignmentIds = [...this.syncQueue];
    this.syncQueue = [];
    
    return this.syncAssignments(assignmentIds);
  }

  /**
   * Handle sync conflict
   */
  async resolveConflict(
    localAssignment: HomeDropAssignment,
    remoteAssignment: HomeDropAssignment,
    resolution: ConflictResolution
  ): Promise<HomeDropAssignment> {
    switch (resolution.strategy) {
      case 'local':
        return localAssignment;
      
      case 'remote':
        await coreAssignmentService.updateAssignment(localAssignment.id, remoteAssignment);
        return remoteAssignment;
      
      case 'merge':
        const merged = this.mergeAssignments(localAssignment, remoteAssignment, resolution.mergeFields);
        await coreAssignmentService.updateAssignment(localAssignment.id, merged);
        return merged;
      
      case 'manual':
        throw new Error('Manual conflict resolution required');
      
      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSyncAt: this.lastSyncAt,
      pendingChanges: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
      lastError: undefined
    };
  }

  /**
   * Clear sync queue
   */
  clearSyncQueue(): void {
    this.syncQueue = [];
    log.info('Sync queue cleared', {}, 'AssignmentSyncService');
  }

  private async getAssignmentsByIds(ids: string[]): Promise<HomeDropAssignment[]> {
    const assignments: HomeDropAssignment[] = [];
    for (const id of ids) {
      const assignment = await coreAssignmentService.getAssignment(id);
      if (assignment) {
        assignments.push(assignment);
      }
    }
    return assignments;
  }

  private async syncSingleAssignment(assignment: HomeDropAssignment): Promise<void> {
    // Placeholder for actual sync implementation
    // This would typically involve API calls to remote server
    log.info('Syncing assignment', { assignmentId: assignment.id }, 'AssignmentSyncService');
  }

  private mergeAssignments(
    local: HomeDropAssignment,
    remote: HomeDropAssignment,
    mergeFields?: string[]
  ): Partial<HomeDropAssignment> {
    const fields = mergeFields || Object.keys(remote);
    const merged: any = { ...local };
    
    for (const field of fields) {
      if (field in remote) {
        merged[field] = (remote as any)[field];
      }
    }
    
    return merged;
  }
}

export const assignmentSyncService = new AssignmentSyncService();