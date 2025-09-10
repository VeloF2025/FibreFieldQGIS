/**
 * Assignment Filter Service
 * Handles advanced filtering, search, and query operations for assignments
 * File: assignment-filter.service.ts (Target: 180 lines)
 */

import { db } from '@/lib/database';
import type { HomeDropAssignment } from '@/types/home-drop.types';
import { coreAssignmentService, type AssignmentStatus, type AssignmentPriority } from './core-assignment.service';
import { log } from '@/lib/logger';

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

export interface SearchCriteria {
  searchTerm: string;
  fields?: ('id' | 'poleNumber' | 'customer' | 'notes')[];
  exactMatch?: boolean;
}

/**
 * Assignment Filter Service
 */
class AssignmentFilterService {
  /**
   * Filter assignments based on criteria
   */
  async filterAssignments(options: AssignmentFilterOptions): Promise<HomeDropAssignment[]> {
    await coreAssignmentService.ensureDatabase();
    
    let query = (db as any).homeDropAssignments.toCollection();

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

    const results = await query.toArray();
    log.info('Filtered assignments', { count: results.length, filters: Object.keys(options) }, 'AssignmentFilterService');
    return results;
  }

  /**
   * Search assignments by text
   */
  async searchAssignments(criteria: SearchCriteria): Promise<HomeDropAssignment[]> {
    const assignments = await coreAssignmentService.getAllAssignments();
    const searchTerm = criteria.exactMatch ? criteria.searchTerm : criteria.searchTerm.toLowerCase();
    
    const searchFields = criteria.fields || ['id', 'poleNumber', 'customer', 'notes'];
    
    const results = assignments.filter(assignment => {
      for (const field of searchFields) {
        switch (field) {
          case 'id':
            if (this.matchText(assignment.id, searchTerm, criteria.exactMatch)) return true;
            break;
          case 'poleNumber':
            if (this.matchText(assignment.poleNumber, searchTerm, criteria.exactMatch)) return true;
            break;
          case 'customer':
            if (this.matchText(assignment.customer.name, searchTerm, criteria.exactMatch) ||
                this.matchText(assignment.customer.address, searchTerm, criteria.exactMatch) ||
                this.matchText(assignment.customer.contactNumber, searchTerm, criteria.exactMatch)) {
              return true;
            }
            break;
          case 'notes':
            if (this.matchText(assignment.installationNotes, searchTerm, criteria.exactMatch) ||
                this.matchText(assignment.accessNotes, searchTerm, criteria.exactMatch)) {
              return true;
            }
            break;
        }
      }
      return false;
    });

    log.info('Search completed', { term: criteria.searchTerm, results: results.length }, 'AssignmentFilterService');
    return results;
  }

  /**
   * Get overdue assignments
   */
  async getOverdueAssignments(): Promise<HomeDropAssignment[]> {
    return this.filterAssignments({ overdue: true });
  }

  /**
   * Get assignments by date range
   */
  async getAssignmentsByDateRange(start: Date, end: Date): Promise<HomeDropAssignment[]> {
    return this.filterAssignments({ dateRange: { start, end } });
  }

  /**
   * Helper method for text matching
   */
  private matchText(text: string | undefined, searchTerm: string, exactMatch?: boolean): boolean {
    if (!text) return false;
    if (exactMatch) {
      return text === searchTerm;
    }
    return text.toLowerCase().includes(searchTerm);
  }
}

export const assignmentFilterService = new AssignmentFilterService();