/**
 * Assignment Statistics Service
 * Handles statistics calculation, reporting, and performance metrics
 * File: assignment-statistics.service.ts (Target: 180 lines)
 */

import type { HomeDropAssignment } from '@/types/home-drop.types';
import { coreAssignmentService, type AssignmentStatus, type AssignmentPriority } from './core-assignment.service';
import { log } from '@/lib/logger';

export interface AssignmentStatistics {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  expired: number;
  overdue: number;
  
  averageAcceptanceTime?: number;
  averageCompletionTime?: number;
  completionRate?: number;
  
  byTechnician?: Record<string, TechnicianStats>;
  byPriority?: Record<AssignmentPriority, number>;
  
  todayAssigned?: number;
  weekAssigned?: number;
  monthAssigned?: number;
}

export interface TechnicianStats {
  assigned: number;
  accepted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  averageRating?: number;
}

export interface TechnicianWorkload {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  averageCompletionTime?: number;
  completionRate: number;
}

/**
 * Assignment Statistics Service
 */
class AssignmentStatisticsService {
  /**
   * Get comprehensive assignment statistics
   */
  async getStatistics(): Promise<AssignmentStatistics> {
    const assignments = await coreAssignmentService.getAllAssignments();
    const now = new Date();

    const stats: AssignmentStatistics = {
      total: assignments.length,
      pending: this.countByStatus(assignments, 'pending'),
      accepted: this.countByStatus(assignments, 'accepted'),
      inProgress: this.countByStatus(assignments, 'in_progress'),
      completed: this.countByStatus(assignments, 'completed'),
      cancelled: this.countByStatus(assignments, 'cancelled'),
      expired: this.countByStatus(assignments, 'expired'),
      overdue: this.countOverdue(assignments, now)
    };

    this.calculatePerformanceMetrics(stats, assignments);
    this.calculateTechnicianStats(stats, assignments, now);
    this.calculatePriorityDistribution(stats, assignments);
    this.calculateTimeBasedMetrics(stats, assignments, now);

    log.info('Statistics calculated', { total: stats.total }, 'AssignmentStatisticsService');
    return stats;
  }

  /**
   * Get technician workload statistics
   */
  async getTechnicianWorkload(technicianId: string): Promise<TechnicianWorkload> {
    await coreAssignmentService.ensureDatabase();
    
    const assignments = await (db as any).homeDropAssignments
      .where('assignedTo')
      .equals(technicianId)
      .toArray();

    const now = new Date();
    const activeStatuses: AssignmentStatus[] = ['pending', 'accepted', 'in_progress'];
    
    const activeAssignments = assignments.filter((a: HomeDropAssignment) => 
      activeStatuses.includes(a.status)
    );
    
    const completedAssignments = assignments.filter((a: HomeDropAssignment) => 
      a.status === 'completed'
    );
    
    const overdueAssignments = activeAssignments.filter((a: HomeDropAssignment) => {
      if (!a.scheduledDate) return false;
      return new Date(a.scheduledDate) < now;
    });

    let averageCompletionTime: number | undefined;
    if (completedAssignments.length > 0) {
      const times = this.calculateCompletionTimes(completedAssignments);
      if (times.length > 0) {
        averageCompletionTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      }
    }

    const totalNonCancelled = assignments.filter((a: HomeDropAssignment) => 
      a.status !== 'cancelled'
    ).length;
    
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

  private countByStatus(assignments: HomeDropAssignment[], status: AssignmentStatus): number {
    return assignments.filter(a => a.status === status).length;
  }

  private countOverdue(assignments: HomeDropAssignment[], now: Date): number {
    return assignments.filter(a => {
      if (!a.scheduledDate || ['completed', 'cancelled', 'expired'].includes(a.status)) {
        return false;
      }
      return new Date(a.scheduledDate) < now;
    }).length;
  }

  private calculatePerformanceMetrics(stats: AssignmentStatistics, assignments: HomeDropAssignment[]): void {
    const acceptedAssignments = assignments.filter(a => a.acceptedAt);
    if (acceptedAssignments.length > 0) {
      const acceptanceTimes = acceptedAssignments.map(a => {
        const assigned = new Date(a.assignedAt).getTime();
        const accepted = new Date(a.acceptedAt!).getTime();
        return (accepted - assigned) / (1000 * 60);
      });
      stats.averageAcceptanceTime = acceptanceTimes.reduce((sum, time) => sum + time, 0) / acceptanceTimes.length;
    }

    const completedAssignments = assignments.filter(a => a.completedAt);
    if (completedAssignments.length > 0) {
      const completionTimes = this.calculateCompletionTimes(completedAssignments);
      stats.averageCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
      
      const totalAssignable = assignments.filter(a => a.status !== 'cancelled').length;
      stats.completionRate = totalAssignable > 0 ? (stats.completed / totalAssignable) * 100 : 0;
    }
  }

  private calculateTechnicianStats(stats: AssignmentStatistics, assignments: HomeDropAssignment[], now: Date): void {
    stats.byTechnician = {};
    const technicianGroups = this.groupByTechnician(assignments);

    for (const [techId, techAssignments] of Object.entries(technicianGroups)) {
      stats.byTechnician[techId] = {
        assigned: techAssignments.length,
        accepted: techAssignments.filter(a => a.status === 'accepted' || a.acceptedAt).length,
        inProgress: techAssignments.filter(a => a.status === 'in_progress').length,
        completed: techAssignments.filter(a => a.status === 'completed').length,
        overdue: techAssignments.filter(a => {
          if (!a.scheduledDate || ['completed', 'cancelled', 'expired'].includes(a.status)) {
            return false;
          }
          return new Date(a.scheduledDate) < now;
        }).length
      };
    }
  }

  private calculatePriorityDistribution(stats: AssignmentStatistics, assignments: HomeDropAssignment[]): void {
    stats.byPriority = {
      high: assignments.filter(a => a.priority === 'high').length,
      medium: assignments.filter(a => a.priority === 'medium').length,
      low: assignments.filter(a => a.priority === 'low').length
    };
  }

  private calculateTimeBasedMetrics(stats: AssignmentStatistics, assignments: HomeDropAssignment[], now: Date): void {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    stats.todayAssigned = assignments.filter(a => new Date(a.assignedAt) >= today).length;
    stats.weekAssigned = assignments.filter(a => new Date(a.assignedAt) >= weekAgo).length;
    stats.monthAssigned = assignments.filter(a => new Date(a.assignedAt) >= monthAgo).length;
  }

  private calculateCompletionTimes(assignments: HomeDropAssignment[]): number[] {
    return assignments
      .filter(a => a.assignedAt && a.completedAt)
      .map(a => {
        const start = new Date(a.assignedAt).getTime();
        const end = new Date(a.completedAt!).getTime();
        return (end - start) / (1000 * 60 * 60);
      });
  }

  private groupByTechnician(assignments: HomeDropAssignment[]): Record<string, HomeDropAssignment[]> {
    return assignments.reduce((groups, assignment) => {
      const techId = assignment.assignedTo;
      if (!groups[techId]) groups[techId] = [];
      groups[techId].push(assignment);
      return groups;
    }, {} as Record<string, HomeDropAssignment[]>);
  }
}

export const assignmentStatisticsService = new AssignmentStatisticsService();