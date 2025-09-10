/**
 * Home Drop Assignment Management Service (Refactored)
 * 
 * This is the main facade service that orchestrates all assignment-related operations
 * by delegating to specialized services. It maintains backward compatibility with
 * the original API while providing a clean, modular architecture.
 * 
 * Refactored from 1,239 lines into 6 focused services:
 * - CoreAssignmentService: Basic CRUD operations (200 lines)
 * - AssignmentFilterService: Filtering and search (180 lines)
 * - AssignmentStatusService: Status management (200 lines)
 * - AssignmentStatisticsService: Statistics and reporting (180 lines)
 * - AssignmentSyncService: Synchronization (150 lines)
 * - AssignmentIntegrationService: External integrations (150 lines)
 * - AssignmentOperationsService: Bulk operations (200 lines)
 */

import { coreAssignmentService } from './home-drop/core-assignment.service';
import { assignmentFilterService } from './home-drop/assignment-filter.service';
import { assignmentStatusService } from './home-drop/assignment-status.service';
import { assignmentStatisticsService } from './home-drop/assignment-statistics.service';
import { assignmentSyncService } from './home-drop/assignment-sync.service';
import { assignmentIntegrationService } from './home-drop/assignment-integration.service';
import { assignmentOperationsService } from './home-drop/assignment-operations.service';
import { log } from '@/lib/logger';

// Re-export types for backward compatibility
export type { 
  AssignmentPriority, 
  AssignmentStatus, 
  AssignmentConfig,
  AssignmentValidationResult 
} from './home-drop/core-assignment.service';

export type { 
  AssignmentFilterOptions,
  SearchCriteria 
} from './home-drop/assignment-filter.service';

export type { 
  StatusTransition,
  StatusHistory 
} from './home-drop/assignment-status.service';

export type { 
  AssignmentStatistics,
  TechnicianStats,
  TechnicianWorkload 
} from './home-drop/assignment-statistics.service';

export type { 
  SyncResult,
  ConflictResolution,
  SyncStatus 
} from './home-drop/assignment-sync.service';

export type { 
  GeoPackageAssignment,
  BulkAssignmentOperation 
} from './home-drop/assignment-integration.service';

export type {
  BulkUpdateResult
} from './home-drop/assignment-operations.service';

import type { HomeDropAssignment } from '@/types/home-drop.types';

/**
 * Home Drop Assignment Management Service (Facade)
 * Orchestrates all assignment operations through specialized services
 */
class HomeDropAssignmentService {
  constructor() {
    log.info('Home Drop Assignment Service initialized (refactored)', {}, 'HomeDropAssignmentService');
  }

  // ==================== Core Assignment Operations ====================
  
  async ensureDatabase(): Promise<void> {
    return coreAssignmentService.ensureDatabase();
  }

  async createAssignment(
    homeDropId: string,
    assignmentData: Partial<HomeDropAssignment>
  ): Promise<string> {
    return coreAssignmentService.createAssignment(homeDropId, assignmentData);
  }

  async getAssignment(assignmentId: string): Promise<HomeDropAssignment | undefined> {
    return coreAssignmentService.getAssignment(assignmentId);
  }

  async getAssignmentByHomeDropId(homeDropId: string): Promise<HomeDropAssignment | undefined> {
    return coreAssignmentService.getAssignmentByHomeDropId(homeDropId);
  }

  async getAllAssignments(): Promise<HomeDropAssignment[]> {
    return coreAssignmentService.getAllAssignments();
  }

  async updateAssignment(
    assignmentId: string,
    updates: Partial<HomeDropAssignment>
  ): Promise<void> {
    return coreAssignmentService.updateAssignment(assignmentId, updates);
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    return coreAssignmentService.deleteAssignment(assignmentId);
  }

  // ==================== Status Management ====================

  async acceptAssignment(assignmentId: string, technicianId: string): Promise<void> {
    return assignmentStatusService.acceptAssignment(assignmentId, technicianId);
  }

  async startAssignment(assignmentId: string, technicianId: string): Promise<void> {
    return assignmentStatusService.startAssignment(assignmentId, technicianId);
  }

  async completeAssignment(assignmentId: string, technicianId: string): Promise<void> {
    return assignmentStatusService.completeAssignment(assignmentId, technicianId);
  }

  async cancelAssignment(
    assignmentId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<void> {
    return assignmentStatusService.cancelAssignment(assignmentId, cancelledBy, reason);
  }

  // ==================== Filtering and Search ====================

  async filterAssignments(options: import('./home-drop/assignment-filter.service').AssignmentFilterOptions) {
    return assignmentFilterService.filterAssignments(options);
  }

  async searchAssignments(searchTerm: string): Promise<HomeDropAssignment[]> {
    return assignmentFilterService.searchAssignments({ searchTerm });
  }

  async getOverdueAssignments(): Promise<HomeDropAssignment[]> {
    return assignmentFilterService.getOverdueAssignments();
  }

  // ==================== Statistics and Reporting ====================

  async getStatistics() {
    return assignmentStatisticsService.getStatistics();
  }

  async getTechnicianWorkload(technicianId: string) {
    return assignmentStatisticsService.getTechnicianWorkload(technicianId);
  }

  async getAssignmentsForTechnician(
    technicianId: string,
    status?: import('./home-drop/core-assignment.service').AssignmentStatus[]
  ): Promise<HomeDropAssignment[]> {
    await coreAssignmentService.ensureDatabase();
    
    const allAssignments = await (db as any).homeDropAssignments
      .where('assignedTo')
      .equals(technicianId)
      .toArray();

    if (status && status.length > 0) {
      return allAssignments.filter((a: HomeDropAssignment) => status.includes(a.status));
    }

    return allAssignments;
  }

  // ==================== Bulk Operations ====================

  async createBulkAssignments(operation: import('./home-drop/assignment-integration.service').BulkAssignmentOperation) {
    return assignmentOperationsService.createBulkAssignments(operation);
  }

  async updateBulkAssignments(
    assignmentIds: string[],
    updates: Partial<HomeDropAssignment>
  ) {
    return assignmentOperationsService.updateBulkAssignments(assignmentIds, updates);
  }

  async reassignAssignment(
    assignmentId: string,
    newTechnicianId: string,
    reassignedBy: string,
    reason?: string
  ): Promise<void> {
    return assignmentOperationsService.reassignAssignment(
      assignmentId,
      newTechnicianId,
      reassignedBy,
      reason
    );
  }

  async validateAssignment(assignment: Partial<HomeDropAssignment>) {
    return assignmentOperationsService.validateAssignment(assignment);
  }

  // ==================== QGIS Integration ====================

  async loadAssignmentsFromGeoPackage(
    geoPackageData: import('./home-drop/assignment-integration.service').GeoPackageAssignment[]
  ) {
    return assignmentIntegrationService.loadFromGeoPackage(geoPackageData);
  }

  async exportToGeoPackage(assignmentIds?: string[]) {
    return assignmentIntegrationService.exportToGeoPackage(assignmentIds);
  }

  // ==================== Synchronization ====================

  async syncAssignments(assignmentIds?: string[]) {
    return assignmentSyncService.syncAssignments(assignmentIds);
  }

  async queueForSync(assignmentId: string): Promise<void> {
    return assignmentSyncService.queueForSync(assignmentId);
  }

  async processSyncQueue() {
    return assignmentSyncService.processSyncQueue();
  }

  async resolveConflict(
    localAssignment: HomeDropAssignment,
    remoteAssignment: HomeDropAssignment,
    resolution: import('./home-drop/assignment-sync.service').ConflictResolution
  ) {
    return assignmentSyncService.resolveConflict(localAssignment, remoteAssignment, resolution);
  }

  getSyncStatus() {
    return assignmentSyncService.getSyncStatus();
  }

  clearSyncQueue(): void {
    return assignmentSyncService.clearSyncQueue();
  }

  // ==================== Live Queries (Reactive) ====================

  watchAssignmentsForTechnician(technicianId: string) {
    return assignmentIntegrationService.watchAssignmentsForTechnician(technicianId);
  }

  watchAllAssignments() {
    return assignmentIntegrationService.watchAllAssignments();
  }

  watchAssignmentsByStatus(status: import('./home-drop/core-assignment.service').AssignmentStatus) {
    return assignmentIntegrationService.watchAssignmentsByStatus(status);
  }

  watchOverdueAssignments() {
    return assignmentFilterService.getOverdueAssignments();
  }
}

// Import db for compatibility
import { db } from '@/lib/database';

// Export singleton instance for backward compatibility
export const homeDropAssignmentService = new HomeDropAssignmentService();