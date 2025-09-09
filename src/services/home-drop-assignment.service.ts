/**
 * Home Drop Assignment Management Service
 * 
 * This service manages work assignments for field technicians, providing
 * comprehensive assignment lifecycle management, QGIS integration, and
 * offline-first capabilities.
 * 
 * Key Features:
 * 1. Assignment creation and distribution to technicians
 * 2. QGIS GeoPackage integration for offline assignment loading
 * 3. Assignment status tracking (assigned → in_progress → completed)
 * 4. Priority and due date management
 * 5. Technician workload balancing
 * 6. Bulk assignment operations
 * 7. Assignment filtering and search
 * 8. Real-time assignment updates
 */

import { db } from '@/lib/database';
import { liveQuery } from 'dexie';
import type {
  HomeDropAssignment,
  HomeDropCapture,
  HomeDropStatus,
  HomeDropFilterOptions
} from '@/types/home-drop.types';
import { homeDropCaptureService } from './home-drop-capture.service';
import { poleCaptureService } from './pole-capture.service';

/**
 * Assignment Priority Levels
 */
export type AssignmentPriority = 'high' | 'medium' | 'low';

/**
 * Assignment Status Types
 */
export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

/**
 * Assignment Filter Options
 */
export interface AssignmentFilterOptions {
  status?: AssignmentStatus[];
  priority?: AssignmentPriority[];
  assignedTo?: string[];
  assignedBy?: string[];
  poleNumbers?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  scheduledDateRange?: {
    start: Date;
    end: Date;
  };
  overdue?: boolean;
  hasCustomerContact?: boolean;
}

/**
 * Assignment Statistics
 */
export interface AssignmentStatistics {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  expired: number;
  overdue: number;
  
  // Performance metrics
  averageAcceptanceTime?: number; // Time from assignment to acceptance (minutes)
  averageCompletionTime?: number; // Time from assignment to completion (hours)
  completionRate?: number;        // Percentage of assignments completed
  
  // By technician workload
  byTechnician?: Record<string, {
    assigned: number;
    accepted: number;
    inProgress: number;
    completed: number;
    overdue: number;
    averageRating?: number;
  }>;
  
  // By priority distribution
  byPriority?: Record<AssignmentPriority, number>;
  
  // Time-based metrics
  todayAssigned?: number;
  weekAssigned?: number;
  monthAssigned?: number;
}

/**
 * QGIS GeoPackage Assignment Data
 */
export interface GeoPackageAssignment {
  id: string;
  homeDropId: string;
  poleNumber: string;
  customerName: string;
  customerAddress: string;
  customerContact?: string;
  latitude: number;
  longitude: number;
  priority: AssignmentPriority;
  scheduledDate?: string;
  assignedTo: string;
  assignmentNotes?: string;
  accessNotes?: string;
  status: AssignmentStatus;
  assignedAt: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

/**
 * Bulk Assignment Operation
 */
export interface BulkAssignmentOperation {
  homeDropIds: string[];
  assignedTo: string;
  assignedBy: string;
  priority?: AssignmentPriority;
  scheduledDate?: Date;
  notes?: string;
}

/**
 * Assignment Validation Result
 */
export interface AssignmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Home Drop Assignment Management Service
 */
class HomeDropAssignmentService {
  // Service configuration
  private readonly config = {
    maxAssignmentsPerTechnician: 20,    // Max concurrent assignments per technician
    assignmentExpiryDays: 7,            // Days before assignment expires
    highPriorityMaxHours: 24,           // Max hours for high priority assignments
    mediumPriorityMaxHours: 72,         // Max hours for medium priority assignments
    lowPriorityMaxHours: 168,           // Max hours for low priority assignments (1 week)
    autoAcceptanceEnabled: false,       // Auto-accept assignments for technicians
    notificationEnabled: true,          // Send notifications for assignments
    geoPackageExportBatchSize: 100      // Max assignments per GeoPackage export
  };

  // Database initialization state
  private isInitialized = false;

  constructor() {
    this.initializeService();
  }

  /**
   * Ensure database tables are available
   */
  private async ensureDatabase(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if home drop tables exist
      const tableNames = db.tables.map(t => t.name);
      const requiredTables = ['homeDropAssignments', 'homeDropCaptures'];
      const missingTables = requiredTables.filter(t => !tableNames.includes(t));

      if (missingTables.length > 0) {
        console.warn('⚠️ Home drop tables not found, upgrading database...');
        
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
    } catch (error) {
      console.error('❌ Failed to initialize home drop assignment database:', error);
      throw error;
    }
  }

  /**
   * Initialize assignment service
   */
  private async initializeService(): Promise<void> {
    // Set up periodic cleanup of expired assignments
    this.setupPeriodicCleanup();
    console.log('✅ Home Drop Assignment Service initialized');
  }

  // ==================== Assignment CRUD Operations ====================

  /**
   * Create new assignment
   */
  async createAssignment(
    homeDropId: string,
    assignmentData: Partial<HomeDropAssignment>
  ): Promise<string> {
    // Validate home drop exists
    const homeDropCapture = await homeDropCaptureService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }

    // Validate pole exists
    const pole = await poleCaptureService.getPoleCapture(homeDropCapture.poleNumber);
    if (!pole) {
      throw new Error(`Pole ${homeDropCapture.poleNumber} not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.getAssignmentByHomeDropId(homeDropId);
    if (existingAssignment) {
      throw new Error(`Assignment already exists for home drop ${homeDropId}`);
    }

    // Validate technician workload
    if (assignmentData.assignedTo) {
      const workload = await this.getTechnicianWorkload(assignmentData.assignedTo);
      if (workload.activeAssignments >= this.config.maxAssignmentsPerTechnician) {
        throw new Error(
          `Technician ${assignmentData.assignedTo} has reached maximum assignments (${this.config.maxAssignmentsPerTechnician})`
        );
      }
    }

    // Generate assignment ID
    const assignmentId = this.generateAssignmentId();

    // Create assignment object
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

    // Save assignment
    await (db as any).homeDropAssignments.put(assignment);

    // Update home drop with assignment reference
    await homeDropCaptureService.updateHomeDropCapture(homeDropId, {
      assignmentId,
      assignment,
      status: 'assigned'
    });

    // Send notification (if enabled)
    if (this.config.notificationEnabled && assignment.assignedTo) {
      await this.sendAssignmentNotification(assignment);
    }

    // Auto-accept if enabled
    if (this.config.autoAcceptanceEnabled && assignment.assignedTo) {
      await this.acceptAssignment(assignmentId, assignment.assignedTo);
    }

    console.log(`📋 Assignment ${assignmentId} created for home drop ${homeDropId}`);
    return assignmentId;
  }

  /**
   * Get assignment by ID
   */
  async getAssignment(assignmentId: string): Promise<HomeDropAssignment | undefined> {
    return await (db as any).homeDropAssignments.get(assignmentId);
  }

  /**
   * Get assignment by home drop ID
   */
  async getAssignmentByHomeDropId(homeDropId: string): Promise<HomeDropAssignment | undefined> {
    return await (db as any).homeDropAssignments
      .where('homeDropId')
      .equals(homeDropId)
      .first();
  }

  /**
   * Get all assignments
   */
  async getAllAssignments(): Promise<HomeDropAssignment[]> {
    return await (db as any).homeDropAssignments.toArray();
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    assignmentId: string,
    updates: Partial<HomeDropAssignment>
  ): Promise<void> {
    const existing = await this.getAssignment(assignmentId);
    if (!existing) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    // Update assignment
    await (db as any).homeDropAssignments.update(assignmentId, updates);

    // Update related home drop if status changed
    if (updates.status && updates.status !== existing.status) {
      await this.updateHomeDropStatus(assignmentId, updates.status);
    }

    console.log(`📝 Assignment ${assignmentId} updated`);
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    // Update home drop to remove assignment reference
    await homeDropCaptureService.updateHomeDropCapture(assignment.homeDropId, {
      assignmentId: undefined,
      assignment: undefined,
      status: 'assigned' // Reset to assigned status
    });

    // Delete assignment
    await (db as any).homeDropAssignments.delete(assignmentId);

    console.log(`🗑️ Assignment ${assignmentId} deleted`);
  }

  // ==================== Assignment Status Management ====================

  /**
   * Accept assignment (technician accepts the work)
   */
  async acceptAssignment(assignmentId: string, technicianId: string): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.assignedTo !== technicianId) {
      throw new Error(`Assignment ${assignmentId} is not assigned to technician ${technicianId}`);
    }

    if (assignment.status !== 'pending') {
      throw new Error(`Assignment ${assignmentId} is not in pending status (current: ${assignment.status})`);
    }

    await this.updateAssignment(assignmentId, {
      status: 'accepted',
      acceptedAt: new Date()
    });

    console.log(`✅ Assignment ${assignmentId} accepted by ${technicianId}`);
  }

  /**
   * Start assignment work
   */
  async startAssignment(assignmentId: string, technicianId: string): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.assignedTo !== technicianId) {
      throw new Error(`Assignment ${assignmentId} is not assigned to technician ${technicianId}`);
    }

    if (assignment.status !== 'accepted') {
      throw new Error(`Assignment ${assignmentId} must be accepted before starting (current: ${assignment.status})`);
    }

    await this.updateAssignment(assignmentId, {
      status: 'in_progress',
      startedAt: new Date()
    });

    console.log(`🚀 Assignment ${assignmentId} started by ${technicianId}`);
  }

  /**
   * Complete assignment
   */
  async completeAssignment(assignmentId: string, technicianId: string): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.assignedTo !== technicianId) {
      throw new Error(`Assignment ${assignmentId} is not assigned to technician ${technicianId}`);
    }

    if (assignment.status !== 'in_progress') {
      throw new Error(`Assignment ${assignmentId} must be in progress to complete (current: ${assignment.status})`);
    }

    // Validate home drop capture is complete
    const homeDropCapture = await homeDropCaptureService.getHomeDropCapture(assignment.homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${assignment.homeDropId} not found`);
    }

    const validation = await homeDropCaptureService.validateHomeDropCapture(homeDropCapture);
    if (!validation.isValid) {
      throw new Error(`Cannot complete assignment: Home drop validation failed: ${validation.errors.join(', ')}`);
    }

    await this.updateAssignment(assignmentId, {
      status: 'completed',
      completedAt: new Date()
    });

    console.log(`🎉 Assignment ${assignmentId} completed by ${technicianId}`);
  }

  /**
   * Cancel assignment
   */
  async cancelAssignment(
    assignmentId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (['completed', 'cancelled'].includes(assignment.status)) {
      throw new Error(`Cannot cancel assignment with status: ${assignment.status}`);
    }

    await this.updateAssignment(assignmentId, {
      status: 'cancelled',
      completedAt: new Date(),
      // Store cancellation details in notes
      installationNotes: assignment.installationNotes 
        ? `${assignment.installationNotes}\n\nCANCELLED by ${cancelledBy}: ${reason || 'No reason provided'}`
        : `CANCELLED by ${cancelledBy}: ${reason || 'No reason provided'}`
    });

    console.log(`❌ Assignment ${assignmentId} cancelled by ${cancelledBy}: ${reason || 'No reason provided'}`);
  }

  /**
   * Update home drop status based on assignment status
   */
  private async updateHomeDropStatus(assignmentId: string, assignmentStatus: AssignmentStatus): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) return;

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
        homeDropStatus = 'assigned'; // Reset to available for reassignment
        break;
      default:
        return; // No status change needed
    }

    await homeDropCaptureService.updateHomeDropCapture(assignment.homeDropId, {
      status: homeDropStatus
    });
  }

  // ==================== Technician Management ====================

  /**
   * Get assignments for technician
   */
  async getAssignmentsForTechnician(
    technicianId: string,
    status?: AssignmentStatus[]
  ): Promise<HomeDropAssignment[]> {
    await this.ensureDatabase();
    
    let query = (db as any).homeDropAssignments
      .where('assignedTo')
      .equals(technicianId);

    if (status && status.length > 0) {
      const assignments = await query.toArray();
      return assignments.filter((a: HomeDropAssignment) => status.includes(a.status));
    }

    return await query.toArray();
  }

  /**
   * Get technician workload statistics
   */
  async getTechnicianWorkload(technicianId: string): Promise<{
    totalAssignments: number;
    activeAssignments: number; // pending + accepted + in_progress
    completedAssignments: number;
    overdueAssignments: number;
    averageCompletionTime?: number; // in hours
    completionRate: number; // percentage
  }> {
    const assignments = await this.getAssignmentsForTechnician(technicianId);
    const now = new Date();

    const activeStatuses: AssignmentStatus[] = ['pending', 'accepted', 'in_progress'];
    const activeAssignments = assignments.filter(a => activeStatuses.includes(a.status));
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    
    // Calculate overdue assignments
    const overdueAssignments = activeAssignments.filter(a => {
      if (!a.scheduledDate) return false;
      return new Date(a.scheduledDate) < now;
    });

    // Calculate average completion time
    let averageCompletionTime: number | undefined;
    if (completedAssignments.length > 0) {
      const completionTimes = completedAssignments
        .filter(a => a.assignedAt && a.completedAt)
        .map(a => {
          const start = new Date(a.assignedAt).getTime();
          const end = new Date(a.completedAt!).getTime();
          return (end - start) / (1000 * 60 * 60); // Convert to hours
        });
      
      if (completionTimes.length > 0) {
        averageCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
      }
    }

    // Calculate completion rate
    const totalNonCancelled = assignments.filter(a => a.status !== 'cancelled').length;
    const completionRate = totalNonCancelled > 0 
      ? (completedAssignments.length / totalNonCancelled) * 100 
      : 0;

    return {
      totalAssignments: assignments.length,
      activeAssignments: activeAssignments.length,
      completedAssignments: completedAssignments.length,
      overdueAssignments: overdueAssignments.length,
      averageCompletionTime,
      completionRate
    };
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
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status === 'completed') {
      throw new Error('Cannot reassign completed assignment');
    }

    // Validate new technician workload
    const workload = await this.getTechnicianWorkload(newTechnicianId);
    if (workload.activeAssignments >= this.config.maxAssignmentsPerTechnician) {
      throw new Error(
        `Technician ${newTechnicianId} has reached maximum assignments (${this.config.maxAssignmentsPerTechnician})`
      );
    }

    const oldTechnicianId = assignment.assignedTo;

    await this.updateAssignment(assignmentId, {
      assignedTo: newTechnicianId,
      status: 'pending', // Reset to pending
      acceptedAt: undefined,
      startedAt: undefined,
      installationNotes: assignment.installationNotes 
        ? `${assignment.installationNotes}\n\nREASSIGNED from ${oldTechnicianId} to ${newTechnicianId} by ${reassignedBy}: ${reason || 'No reason provided'}`
        : `REASSIGNED from ${oldTechnicianId} to ${newTechnicianId} by ${reassignedBy}: ${reason || 'No reason provided'}`
    });

    // Send notification to new technician
    if (this.config.notificationEnabled) {
      const updatedAssignment = await this.getAssignment(assignmentId);
      if (updatedAssignment) {
        await this.sendAssignmentNotification(updatedAssignment);
      }
    }

    console.log(`🔄 Assignment ${assignmentId} reassigned from ${oldTechnicianId} to ${newTechnicianId} by ${reassignedBy}`);
  }

  // ==================== Bulk Operations ====================

  /**
   * Create bulk assignments
   */
  async createBulkAssignments(operation: BulkAssignmentOperation): Promise<string[]> {
    const assignmentIds: string[] = [];
    const errors: string[] = [];

    // Validate technician workload
    const currentWorkload = await this.getTechnicianWorkload(operation.assignedTo);
    const newTotalAssignments = currentWorkload.activeAssignments + operation.homeDropIds.length;
    
    if (newTotalAssignments > this.config.maxAssignmentsPerTechnician) {
      throw new Error(
        `Bulk assignment would exceed maximum assignments for technician ${operation.assignedTo} ` +
        `(${newTotalAssignments}/${this.config.maxAssignmentsPerTechnician})`
      );
    }

    // Process each home drop
    for (const homeDropId of operation.homeDropIds) {
      try {
        const assignmentId = await this.createAssignment(homeDropId, {
          assignedTo: operation.assignedTo,
          assignedBy: operation.assignedBy,
          priority: operation.priority || 'medium',
          scheduledDate: operation.scheduledDate,
          installationNotes: operation.notes
        });
        assignmentIds.push(assignmentId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Home drop ${homeDropId}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Bulk assignment completed with ${errors.length} errors:`, errors);
    }

    console.log(`📦 Bulk assignment created ${assignmentIds.length} assignments for ${operation.assignedTo}`);
    return assignmentIds;
  }

  /**
   * Update bulk assignments
   */
  async updateBulkAssignments(
    assignmentIds: string[],
    updates: Partial<HomeDropAssignment>
  ): Promise<{
    successful: string[];
    failed: { assignmentId: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { assignmentId: string; error: string }[] = [];

    for (const assignmentId of assignmentIds) {
      try {
        await this.updateAssignment(assignmentId, updates);
        successful.push(assignmentId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ assignmentId, error: errorMessage });
      }
    }

    console.log(`📦 Bulk update: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  // ==================== Filtering and Search ====================

  /**
   * Filter assignments based on criteria
   */
  async filterAssignments(options: AssignmentFilterOptions): Promise<HomeDropAssignment[]> {
    let query = (db as any).homeDropAssignments.toCollection();

    // Apply filters
    if (options.status && options.status.length > 0) {
      query = query.and((assignment: HomeDropAssignment) => 
        options.status!.includes(assignment.status)
      );
    }

    if (options.priority && options.priority.length > 0) {
      query = query.and((assignment: HomeDropAssignment) => 
        options.priority!.includes(assignment.priority)
      );
    }

    if (options.assignedTo && options.assignedTo.length > 0) {
      query = query.and((assignment: HomeDropAssignment) => 
        options.assignedTo!.includes(assignment.assignedTo)
      );
    }

    if (options.assignedBy && options.assignedBy.length > 0) {
      query = query.and((assignment: HomeDropAssignment) => 
        options.assignedBy!.includes(assignment.assignedBy)
      );
    }

    if (options.poleNumbers && options.poleNumbers.length > 0) {
      query = query.and((assignment: HomeDropAssignment) => 
        options.poleNumbers!.includes(assignment.poleNumber)
      );
    }

    if (options.dateRange) {
      query = query.and((assignment: HomeDropAssignment) => {
        const assignedAt = new Date(assignment.assignedAt);
        return assignedAt >= options.dateRange!.start && assignedAt <= options.dateRange!.end;
      });
    }

    if (options.scheduledDateRange) {
      query = query.and((assignment: HomeDropAssignment) => {
        if (!assignment.scheduledDate) return false;
        const scheduledDate = new Date(assignment.scheduledDate);
        return scheduledDate >= options.scheduledDateRange!.start && 
               scheduledDate <= options.scheduledDateRange!.end;
      });
    }

    if (options.overdue) {
      const now = new Date();
      query = query.and((assignment: HomeDropAssignment) => {
        if (!assignment.scheduledDate) return false;
        return new Date(assignment.scheduledDate) < now && 
               !['completed', 'cancelled'].includes(assignment.status);
      });
    }

    if (options.hasCustomerContact !== undefined) {
      query = query.and((assignment: HomeDropAssignment) => {
        const hasContact = !!(assignment.customer.contactNumber || assignment.customer.email);
        return options.hasCustomerContact ? hasContact : !hasContact;
      });
    }

    return await query.toArray();
  }

  /**
   * Search assignments by text
   */
  async searchAssignments(searchTerm: string): Promise<HomeDropAssignment[]> {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    const assignments = await this.getAllAssignments();
    
    return assignments.filter(assignment => 
      assignment.id.toLowerCase().includes(lowerSearchTerm) ||
      assignment.poleNumber.toLowerCase().includes(lowerSearchTerm) ||
      assignment.customer.name.toLowerCase().includes(lowerSearchTerm) ||
      assignment.customer.address.toLowerCase().includes(lowerSearchTerm) ||
      assignment.customer.contactNumber?.toLowerCase().includes(lowerSearchTerm) ||
      assignment.installationNotes?.toLowerCase().includes(lowerSearchTerm) ||
      assignment.accessNotes?.toLowerCase().includes(lowerSearchTerm)
    );
  }

  // ==================== Statistics and Reporting ====================

  /**
   * Get assignment statistics
   */
  async getStatistics(): Promise<AssignmentStatistics> {
    const assignments = await this.getAllAssignments();
    const now = new Date();

    // Basic counts
    const stats: AssignmentStatistics = {
      total: assignments.length,
      pending: assignments.filter(a => a.status === 'pending').length,
      accepted: assignments.filter(a => a.status === 'accepted').length,
      inProgress: assignments.filter(a => a.status === 'in_progress').length,
      completed: assignments.filter(a => a.status === 'completed').length,
      cancelled: assignments.filter(a => a.status === 'cancelled').length,
      expired: assignments.filter(a => a.status === 'expired').length,
      overdue: assignments.filter(a => {
        if (!a.scheduledDate || ['completed', 'cancelled', 'expired'].includes(a.status)) return false;
        return new Date(a.scheduledDate) < now;
      }).length
    };

    // Performance metrics
    const acceptedAssignments = assignments.filter(a => a.acceptedAt);
    if (acceptedAssignments.length > 0) {
      const acceptanceTimes = acceptedAssignments.map(a => {
        const assigned = new Date(a.assignedAt).getTime();
        const accepted = new Date(a.acceptedAt!).getTime();
        return (accepted - assigned) / (1000 * 60); // minutes
      });
      stats.averageAcceptanceTime = acceptanceTimes.reduce((sum, time) => sum + time, 0) / acceptanceTimes.length;
    }

    const completedAssignments = assignments.filter(a => a.completedAt);
    if (completedAssignments.length > 0) {
      const completionTimes = completedAssignments.map(a => {
        const assigned = new Date(a.assignedAt).getTime();
        const completed = new Date(a.completedAt!).getTime();
        return (completed - assigned) / (1000 * 60 * 60); // hours
      });
      stats.averageCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
      
      const totalAssignable = assignments.filter(a => a.status !== 'cancelled').length;
      stats.completionRate = totalAssignable > 0 ? (stats.completed / totalAssignable) * 100 : 0;
    }

    // By technician
    stats.byTechnician = {};
    const technicianGroups = assignments.reduce((groups, assignment) => {
      const techId = assignment.assignedTo;
      if (!groups[techId]) groups[techId] = [];
      groups[techId].push(assignment);
      return groups;
    }, {} as Record<string, HomeDropAssignment[]>);

    for (const [techId, techAssignments] of Object.entries(technicianGroups)) {
      stats.byTechnician[techId] = {
        assigned: techAssignments.length,
        accepted: techAssignments.filter(a => a.status === 'accepted' || a.acceptedAt).length,
        inProgress: techAssignments.filter(a => a.status === 'in_progress').length,
        completed: techAssignments.filter(a => a.status === 'completed').length,
        overdue: techAssignments.filter(a => {
          if (!a.scheduledDate || ['completed', 'cancelled', 'expired'].includes(a.status)) return false;
          return new Date(a.scheduledDate) < now;
        }).length
      };
    }

    // By priority
    stats.byPriority = {
      high: assignments.filter(a => a.priority === 'high').length,
      medium: assignments.filter(a => a.priority === 'medium').length,
      low: assignments.filter(a => a.priority === 'low').length
    };

    // Time-based metrics
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    stats.todayAssigned = assignments.filter(a => new Date(a.assignedAt) >= today).length;
    stats.weekAssigned = assignments.filter(a => new Date(a.assignedAt) >= weekAgo).length;
    stats.monthAssigned = assignments.filter(a => new Date(a.assignedAt) >= monthAgo).length;

    return stats;
  }

  // ==================== QGIS GeoPackage Integration ====================

  /**
   * Load assignments from QGIS GeoPackage
   * This method would typically parse a GeoPackage file exported from QGIS
   */
  async loadAssignmentsFromGeoPackage(
    geoPackageData: GeoPackageAssignment[]
  ): Promise<{ 
    created: number; 
    updated: number; 
    errors: string[] 
  }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const geoAssignment of geoPackageData) {
      try {
        // Check if home drop exists, if not create it
        let homeDropCapture = await homeDropCaptureService.getHomeDropCapture(geoAssignment.homeDropId);
        
        if (!homeDropCapture) {
          // Create home drop from GeoPackage data
          const homeDropId = await homeDropCaptureService.createHomeDropCapture({
            id: geoAssignment.homeDropId,
            poleNumber: geoAssignment.poleNumber,
            projectId: 'imported-from-geopackage', // Default project ID
            contractorId: '', // To be assigned later
            customer: {
              name: geoAssignment.customerName,
              address: geoAssignment.customerAddress,
              contactNumber: geoAssignment.customerContact
            },
            gpsLocation: {
              latitude: geoAssignment.latitude,
              longitude: geoAssignment.longitude,
              accuracy: 10, // Assume good accuracy from QGIS
              capturedAt: new Date()
            }
          });
          
          homeDropCapture = await homeDropCaptureService.getHomeDropCapture(homeDropId);
        }

        if (!homeDropCapture) {
          errors.push(`Failed to create home drop ${geoAssignment.homeDropId}`);
          continue;
        }

        // Check if assignment already exists
        const existingAssignment = await this.getAssignmentByHomeDropId(geoAssignment.homeDropId);
        
        if (existingAssignment) {
          // Update existing assignment
          await this.updateAssignment(existingAssignment.id, {
            priority: geoAssignment.priority,
            scheduledDate: geoAssignment.scheduledDate ? new Date(geoAssignment.scheduledDate) : undefined,
            assignedTo: geoAssignment.assignedTo,
            status: geoAssignment.status,
            installationNotes: geoAssignment.assignmentNotes,
            accessNotes: geoAssignment.accessNotes
          });
          updated++;
        } else {
          // Create new assignment
          await this.createAssignment(geoAssignment.homeDropId, {
            assignedTo: geoAssignment.assignedTo,
            assignedBy: 'system-geopackage-import',
            priority: geoAssignment.priority,
            scheduledDate: geoAssignment.scheduledDate ? new Date(geoAssignment.scheduledDate) : undefined,
            installationNotes: geoAssignment.assignmentNotes,
            accessNotes: geoAssignment.accessNotes,
            customer: {
              name: geoAssignment.customerName,
              address: geoAssignment.customerAddress,
              contactNumber: geoAssignment.customerContact
            }
          });
          created++;
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Assignment ${geoAssignment.id}: ${errorMessage}`);
      }
    }

    console.log(`📦 GeoPackage import: ${created} created, ${updated} updated, ${errors.length} errors`);
    return { created, updated, errors };
  }

  /**
   * Export assignments to GeoPackage format for QGIS/QField
   */
  async exportToGeoPackage(
    assignmentIds?: string[]
  ): Promise<GeoPackageAssignment[]> {
    const assignments = assignmentIds
      ? await Promise.all(assignmentIds.map(id => this.getAssignment(id)))
      : await this.getAllAssignments();

    const validAssignments = assignments.filter((assignment): assignment is HomeDropAssignment => 
      assignment !== undefined
    );

    const geoPackageData: GeoPackageAssignment[] = [];

    for (const assignment of validAssignments) {
      // Get home drop for GPS coordinates
      const homeDropCapture = await homeDropCaptureService.getHomeDropCapture(assignment.homeDropId);
      
      if (!homeDropCapture || !homeDropCapture.gpsLocation) {
        console.warn(`⚠️ Skipping assignment ${assignment.id}: No GPS location available`);
        continue;
      }

      geoPackageData.push({
        id: assignment.id,
        homeDropId: assignment.homeDropId,
        poleNumber: assignment.poleNumber,
        customerName: assignment.customer.name,
        customerAddress: assignment.customer.address,
        customerContact: assignment.customer.contactNumber,
        latitude: homeDropCapture.gpsLocation.latitude,
        longitude: homeDropCapture.gpsLocation.longitude,
        priority: assignment.priority,
        scheduledDate: assignment.scheduledDate?.toISOString(),
        assignedTo: assignment.assignedTo,
        assignmentNotes: assignment.installationNotes,
        accessNotes: assignment.accessNotes,
        status: assignment.status,
        assignedAt: assignment.assignedAt.toISOString(),
        geometry: {
          type: 'Point',
          coordinates: [
            homeDropCapture.gpsLocation.longitude,
            homeDropCapture.gpsLocation.latitude
          ]
        }
      });
    }

    console.log(`📤 Exported ${geoPackageData.length} assignments to GeoPackage format`);
    return geoPackageData;
  }

  // ==================== Live Queries (Reactive) ====================

  /**
   * Watch assignments for technician (reactive)
   */
  watchAssignmentsForTechnician(technicianId: string) {
    return liveQuery(() =>
      (db as any).homeDropAssignments
        .where('assignedTo')
        .equals(technicianId)
        .toArray()
    );
  }

  /**
   * Watch all assignments (reactive)
   */
  watchAllAssignments() {
    return liveQuery(() => (db as any).homeDropAssignments.toArray());
  }

  /**
   * Watch assignments by status (reactive)
   */
  watchAssignmentsByStatus(status: AssignmentStatus) {
    return liveQuery(() =>
      (db as any).homeDropAssignments
        .where('status')
        .equals(status)
        .toArray()
    );
  }

  /**
   * Watch overdue assignments (reactive)
   */
  watchOverdueAssignments() {
    return liveQuery(async () => {
      const assignments = await (db as any).homeDropAssignments.toArray();
      const now = new Date();
      
      return assignments.filter((assignment: HomeDropAssignment) => {
        if (!assignment.scheduledDate || ['completed', 'cancelled', 'expired'].includes(assignment.status)) {
          return false;
        }
        return new Date(assignment.scheduledDate) < now;
      });
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Generate unique assignment ID
   */
  private generateAssignmentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ASSIGN-${timestamp}-${random}`;
  }

  /**
   * Send assignment notification (placeholder for actual implementation)
   */
  private async sendAssignmentNotification(assignment: HomeDropAssignment): Promise<void> {
    // TODO: Implement notification system (push notifications, email, etc.)
    console.log(`📧 Notification sent to ${assignment.assignedTo} for assignment ${assignment.id}`);
  }

  /**
   * Setup periodic cleanup of expired assignments
   */
  private setupPeriodicCleanup(): void {
    // Run cleanup every hour with proper error handling
    const cleanupInterval = setInterval(async () => {
      try {
        await this.ensureDatabase();
        await this.cleanupExpiredAssignments();
        console.log('✅ Periodic cleanup completed successfully');
      } catch (error) {
        console.warn('⚠️ Periodic cleanup failed, will retry next cycle:', error);
        // Don't clear interval - will retry on next cycle
      }
    }, 60 * 60 * 1000); // Run every hour

    // Initial cleanup after 5 seconds to ensure database is ready
    setTimeout(async () => {
      try {
        await this.ensureDatabase();
        await this.cleanupExpiredAssignments();
        console.log('✅ Initial cleanup completed');
      } catch (error) {
        console.warn('⚠️ Initial cleanup failed:', error);
      }
    }, 5000);
  }

  /**
   * Clean up expired assignments
   */
  async cleanupExpiredAssignments(): Promise<void> {
    await this.ensureDatabase();
    
    // Additional safety check to ensure table exists before accessing
    if (!db.tables.some(t => t.name === 'homeDropAssignments')) {
      console.warn('⚠️ homeDropAssignments table not available, skipping cleanup');
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.assignmentExpiryDays);

    try {
      const expiredAssignments = await (db as any).homeDropAssignments
        .where('status')
        .equals('pending')
        .and((assignment: HomeDropAssignment) => new Date(assignment.assignedAt) < cutoffDate)
        .toArray();

      for (const assignment of expiredAssignments) {
        await this.updateAssignment(assignment.id, {
          status: 'expired'
        });
      }

      if (expiredAssignments.length > 0) {
        console.log(`🧹 Cleaned up ${expiredAssignments.length} expired assignments`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup expired assignments:', error);
    }
  }

  /**
   * Validate assignment data
   */
  async validateAssignment(assignment: Partial<HomeDropAssignment>): Promise<AssignmentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!assignment.homeDropId) {
      errors.push('Home drop ID is required');
    }

    if (!assignment.poleNumber) {
      errors.push('Pole number is required');
    }

    if (!assignment.assignedTo) {
      errors.push('Assigned technician is required');
    }

    if (!assignment.assignedBy) {
      errors.push('Assignment creator is required');
    }

    if (!assignment.customer?.name) {
      errors.push('Customer name is required');
    }

    if (!assignment.customer?.address) {
      errors.push('Customer address is required');
    }

    // Business rule validations
    if (assignment.assignedTo) {
      const workload = await this.getTechnicianWorkload(assignment.assignedTo);
      if (workload.activeAssignments >= this.config.maxAssignmentsPerTechnician) {
        errors.push(`Technician has reached maximum assignments (${this.config.maxAssignmentsPerTechnician})`);
      }
    }

    if (assignment.scheduledDate) {
      const scheduledDate = new Date(assignment.scheduledDate);
      const now = new Date();
      
      if (scheduledDate < now) {
        warnings.push('Scheduled date is in the past');
      }
      
      // Check if scheduled date exceeds priority-based limits
      const timeDiff = scheduledDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (assignment.priority === 'high' && hoursDiff > this.config.highPriorityMaxHours) {
        warnings.push(`High priority assignment scheduled beyond ${this.config.highPriorityMaxHours} hours`);
      } else if (assignment.priority === 'medium' && hoursDiff > this.config.mediumPriorityMaxHours) {
        warnings.push(`Medium priority assignment scheduled beyond ${this.config.mediumPriorityMaxHours} hours`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const homeDropAssignmentService = new HomeDropAssignmentService();