import { log } from '@/lib/logger';
import { db } from '@/lib/database';
import type {
  HomeDropCapture,
  HomeDropStatistics,
  HomeDropFilterOptions
} from '@/types/home-drop.types';
import { coreHomeDropService } from './core-home-drop.service';

/**
 * Home Drop Statistics Service
 * 
 * Provides analytics, filtering, reporting, and performance metrics.
 * Generates insights for dashboard displays and management reporting.
 * 
 * Line count target: <200 lines
 */
export class HomeDropStatisticsService {
  /**
   * Get comprehensive statistics for home drops
   */
  async getStatistics(): Promise<HomeDropStatistics> {
    const allHomeDropCaptures = await coreHomeDropService.getAllHomeDropCaptures();
    
    const stats: HomeDropStatistics = {
      total: allHomeDropCaptures.length,
      byStatus: {
        draft: 0,
        in_progress: 0,
        completed: 0,
        synced: 0
      },
      bySyncStatus: {
        pending: 0,
        syncing: 0,
        synced: 0,
        error: 0
      },
      averageCompletionTime: 0,
      averagePhotosPerDrop: 0,
      gpsAccuracyStats: {
        average: 0,
        best: Number.MAX_VALUE,
        worst: 0
      },
      completionRate: 0,
      todayCaptures: 0,
      weekCaptures: 0,
      monthCaptures: 0
    };

    if (allHomeDropCaptures.length === 0) {
      return stats;
    }

    // Calculate date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Statistics calculation
    let totalCompletionTime = 0;
    let completedCaptures = 0;
    let totalPhotos = 0;
    let totalAccuracy = 0;
    let accuracyCount = 0;

    for (const capture of allHomeDropCaptures) {
      // Status counts
      stats.byStatus[capture.status]++;
      stats.bySyncStatus[capture.syncStatus || 'pending']++;

      // Date-based counts
      const capturedAt = new Date(capture.createdAt);
      if (capturedAt >= today) stats.todayCaptures++;
      if (capturedAt >= weekAgo) stats.weekCaptures++;
      if (capturedAt >= monthAgo) stats.monthCaptures++;

      // Completion time calculation
      if (capture.status === 'completed' && capture.createdAt) {
        const completedAt = capture.updatedAt ? new Date(capture.updatedAt) : new Date();
        const createdAt = new Date(capture.createdAt);
        const completionTime = completedAt.getTime() - createdAt.getTime();
        totalCompletionTime += completionTime;
        completedCaptures++;
      }

      // Photo statistics
      const photoCount = capture.photos?.length || 0;
      totalPhotos += photoCount;

      // GPS accuracy statistics
      if (capture.gpsLocation?.accuracy) {
        const accuracy = capture.gpsLocation.accuracy;
        totalAccuracy += accuracy;
        accuracyCount++;
        
        stats.gpsAccuracyStats.best = Math.min(stats.gpsAccuracyStats.best, accuracy);
        stats.gpsAccuracyStats.worst = Math.max(stats.gpsAccuracyStats.worst, accuracy);
      }
    }

    // Calculate averages and rates
    if (completedCaptures > 0) {
      stats.averageCompletionTime = totalCompletionTime / completedCaptures / (1000 * 60 * 60); // in hours
    }
    
    stats.averagePhotosPerDrop = totalPhotos / allHomeDropCaptures.length;
    stats.completionRate = (completedCaptures / allHomeDropCaptures.length) * 100;

    if (accuracyCount > 0) {
      stats.gpsAccuracyStats.average = totalAccuracy / accuracyCount;
    }

    // Handle edge case where no GPS data exists
    if (stats.gpsAccuracyStats.best === Number.MAX_VALUE) {
      stats.gpsAccuracyStats.best = 0;
    }

    return stats;
  }

  /**
   * Filter home drop captures with multiple criteria
   */
  async filterHomeDropCaptures(options: HomeDropFilterOptions): Promise<HomeDropCapture[]> {
    let homeDropCaptures = await coreHomeDropService.getAllHomeDropCaptures();

    // Status filter
    if (options.status && options.status.length > 0) {
      homeDropCaptures = homeDropCaptures.filter(hd => options.status!.includes(hd.status));
    }

    // Sync status filter
    if (options.syncStatus && options.syncStatus.length > 0) {
      homeDropCaptures = homeDropCaptures.filter(hd => 
        hd.syncStatus && options.syncStatus!.includes(hd.syncStatus)
      );
    }

    // Contractor filter
    if (options.contractorId && options.contractorId.length > 0) {
      homeDropCaptures = homeDropCaptures.filter(hd => 
        hd.contractorId && options.contractorId!.includes(hd.contractorId)
      );
    }

    // Project filter
    if (options.projectId && options.projectId.length > 0) {
      homeDropCaptures = homeDropCaptures.filter(hd => 
        hd.projectId && options.projectId!.includes(hd.projectId)
      );
    }

    // Captured by filter
    if (options.capturedBy && options.capturedBy.length > 0) {
      homeDropCaptures = homeDropCaptures.filter(hd => 
        hd.capturedBy && options.capturedBy!.includes(hd.capturedBy)
      );
    }

    // Pole number filter
    if (options.poleNumber && options.poleNumber.length > 0) {
      homeDropCaptures = homeDropCaptures.filter(hd => 
        options.poleNumber!.includes(hd.poleNumber)
      );
    }

    // Date range filter
    if (options.dateRange) {
      const { start, end } = options.dateRange;
      homeDropCaptures = homeDropCaptures.filter(hd => {
        const capturedAt = new Date(hd.createdAt);
        return capturedAt >= new Date(start) && capturedAt <= new Date(end);
      });
    }

    // Has photos filter
    if (options.hasPhotos !== undefined) {
      homeDropCaptures = homeDropCaptures.filter(hd => 
        options.hasPhotos ? (hd.photos && hd.photos.length > 0) : (!hd.photos || hd.photos.length === 0)
      );
    }

    // Needs approval filter
    if (options.needsApproval) {
      homeDropCaptures = homeDropCaptures.filter(hd => hd.approvalStatus === 'pending');
    }

    // Has errors filter
    if (options.hasErrors) {
      homeDropCaptures = homeDropCaptures.filter(hd => 
        hd.syncStatus === 'error' || hd.approvalStatus === 'rejected'
      );
    }

    return homeDropCaptures;
  }

  /**
   * Generate performance metrics report
   */
  async generatePerformanceReport(): Promise<{
    productivity: {
      capturesPerDay: number;
      capturesPerWeek: number;
      completionRate: number;
      averageTimePerCapture: number; // in minutes
    };
    quality: {
      averageGPSAccuracy: number;
      photoCompletionRate: number;
      approvalRate: number;
      reworkRate: number;
    };
    efficiency: {
      syncSuccessRate: number;
      errorRate: number;
      retryRate: number;
    };
  }> {
    const stats = await this.getStatistics();
    const allCaptures = await coreHomeDropService.getAllHomeDropCaptures();
    
    // Productivity metrics
    const daysInPeriod = 30; // Last 30 days
    const productivity = {
      capturesPerDay: stats.monthCaptures / daysInPeriod,
      capturesPerWeek: stats.weekCaptures,
      completionRate: stats.completionRate,
      averageTimePerCapture: stats.averageCompletionTime * 60 // convert hours to minutes
    };

    // Quality metrics
    const approvedCount = allCaptures.filter(c => c.approvalStatus === 'approved').length;
    const rejectedCount = allCaptures.filter(c => c.approvalStatus === 'rejected').length;
    const totalSubmitted = approvedCount + rejectedCount;
    
    const quality = {
      averageGPSAccuracy: stats.gpsAccuracyStats.average,
      photoCompletionRate: (stats.averagePhotosPerDrop / 4) * 100, // 4 required photos
      approvalRate: totalSubmitted > 0 ? (approvedCount / totalSubmitted) * 100 : 0,
      reworkRate: totalSubmitted > 0 ? (rejectedCount / totalSubmitted) * 100 : 0
    };

    // Efficiency metrics
    const syncedCount = stats.bySyncStatus.synced;
    const errorCount = stats.bySyncStatus.error;
    const totalProcessed = syncedCount + errorCount;

    const efficiency = {
      syncSuccessRate: totalProcessed > 0 ? (syncedCount / totalProcessed) * 100 : 0,
      errorRate: totalProcessed > 0 ? (errorCount / totalProcessed) * 100 : 0,
      retryRate: stats.bySyncStatus.syncing / Math.max(1, stats.total) * 100
    };

    return { productivity, quality, efficiency };
  }

  /**
   * Get top performing technicians
   */
  async getTopTechnicians(limit: number = 10): Promise<Array<{
    technicianId: string;
    captureCount: number;
    completionRate: number;
    averageQuality: number;
    lastActivity: string;
  }>> {
    const allCaptures = await coreHomeDropService.getAllHomeDropCaptures();
    const technicianStats = new Map<string, {
      total: number;
      completed: number;
      qualityScores: number[];
      lastActivity: string;
    }>();

    for (const capture of allCaptures) {
      if (!capture.capturedBy) continue;

      const techId = capture.capturedBy;
      const existing = technicianStats.get(techId) || {
        total: 0,
        completed: 0,
        qualityScores: [],
        lastActivity: capture.createdAt
      };

      existing.total++;
      if (capture.status === 'completed') existing.completed++;
      
      // Simple quality score based on GPS accuracy and photo count
      let qualityScore = 70; // Base score
      if (capture.gpsLocation) qualityScore += Math.max(0, 30 - (capture.gpsLocation.accuracy || 30));
      if (capture.photos && capture.photos.length >= 4) qualityScore += 10;
      
      existing.qualityScores.push(qualityScore);
      existing.lastActivity = capture.updatedAt > existing.lastActivity ? capture.updatedAt : existing.lastActivity;

      technicianStats.set(techId, existing);
    }

    // Convert to results array and sort
    const results = Array.from(technicianStats.entries()).map(([technicianId, stats]) => ({
      technicianId,
      captureCount: stats.total,
      completionRate: (stats.completed / stats.total) * 100,
      averageQuality: stats.qualityScores.reduce((sum, score) => sum + score, 0) / stats.qualityScores.length,
      lastActivity: stats.lastActivity
    }));

    return results
      .sort((a, b) => b.captureCount - a.captureCount)
      .slice(0, limit);
  }

  /**
   * Generate daily summary report
   */
  async generateDailySummary(date?: string): Promise<{
    date: string;
    totalCaptures: number;
    completedCaptures: number;
    avgCompletionTime: number;
    qualityScore: number;
    issues: string[];
  }> {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const allCaptures = await coreHomeDropService.getAllHomeDropCaptures();
    const dayCaptures = allCaptures.filter(capture => {
      const captureDate = new Date(capture.createdAt);
      return captureDate >= targetDate && captureDate < nextDay;
    });

    const completed = dayCaptures.filter(c => c.status === 'completed');
    const avgTime = completed.length > 0 
      ? completed.reduce((sum, c) => {
          const duration = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
          return sum + duration;
        }, 0) / completed.length / (1000 * 60 * 60) // hours
      : 0;

    // Calculate quality score
    let totalQuality = 0;
    const issues: string[] = [];
    
    for (const capture of dayCaptures) {
      let quality = 70; // Base score
      
      if (capture.gpsLocation) {
        const accuracy = capture.gpsLocation.accuracy || 50;
        quality += Math.max(0, 30 - accuracy);
        if (accuracy > 50) issues.push(`Poor GPS accuracy: ${accuracy}m`);
      } else {
        issues.push('Missing GPS location');
      }
      
      if (capture.photos && capture.photos.length >= 4) {
        quality += 10;
      } else {
        issues.push('Incomplete photo set');
      }
      
      totalQuality += quality;
    }

    const qualityScore = dayCaptures.length > 0 ? totalQuality / dayCaptures.length : 0;

    return {
      date: targetDate.toISOString().split('T')[0],
      totalCaptures: dayCaptures.length,
      completedCaptures: completed.length,
      avgCompletionTime: avgTime,
      qualityScore,
      issues: [...new Set(issues)] // Remove duplicates
    };
  }
}

export const homeDropStatisticsService = new HomeDropStatisticsService();