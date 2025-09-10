import { log } from '@/lib/logger';
import { db } from '@/lib/database';
import type {
  HomeDropCapture,
  HomeDropValidationRules,
  HomeDropPhotoStorage
} from '@/types/home-drop.types';
import { coreHomeDropService } from './core-home-drop.service';
import { homeDropSyncService } from './sync-queue.service';

/**
 * Home Drop Approval Workflow Service
 * 
 * Manages admin approval workflow, validation, and status transitions.
 * Handles submission, approval, rejection, and quality validation.
 * 
 * Line count target: <200 lines
 */
export class HomeDropApprovalService {
  private get validationRules(): HomeDropValidationRules {
    return coreHomeDropService.validationRules;
  }

  /**
   * Submit home drop for approval
   */
  async submitForApproval(homeDropId: string): Promise<void> {
    const homeDropCapture = await coreHomeDropService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }

    // Validate completeness before submission
    const validation = await this.validateHomeDropCapture(homeDropCapture);
    if (!validation.isValid) {
      throw new Error(`Cannot submit incomplete home drop: ${validation.errors.join(', ')}`);
    }

    // Update status to pending approval
    await coreHomeDropService.updateHomeDropCapture(homeDropId, {
      status: 'completed',
      approvalStatus: 'pending',
      submittedForApprovalAt: new Date().toISOString()
    });

    // Add to sync queue
    await homeDropSyncService.addToSyncQueue(homeDropId, 'update', {
      status: 'pending_approval',
      submittedAt: new Date().toISOString()
    });

    log.info('✅ Home drop submitted for approval', { homeDropId }, "HomeDropApprovalService");
  }

  /**
   * Approve home drop capture
   */
  async approveHomeDropCapture(
    homeDropId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<void> {
    await coreHomeDropService.updateHomeDropCapture(homeDropId, {
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString(),
      approvalNotes: approvalNotes || ''
    });

    // Add to sync queue
    await homeDropSyncService.addToSyncQueue(homeDropId, 'update', {
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString()
    });

    log.info('✅ Home drop approved', { homeDropId, approvedBy }, "HomeDropApprovalService");
  }

  /**
   * Reject home drop capture
   */
  async rejectHomeDropCapture(
    homeDropId: string,
    rejectedBy: string,
    rejectionReason: string,
    requiredActions?: string[]
  ): Promise<void> {
    await coreHomeDropService.updateHomeDropCapture(homeDropId, {
      approvalStatus: 'rejected',
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason,
      requiredActions: requiredActions || [],
      status: 'in_progress' // Allow re-editing
    });

    // Add to sync queue
    await homeDropSyncService.addToSyncQueue(homeDropId, 'update', {
      status: 'rejected',
      rejectedBy,
      rejectionReason
    });

    log.info('✅ Home drop rejected', { homeDropId, rejectedBy, rejectionReason }, "HomeDropApprovalService");
  }

  /**
   * Update approval status
   */
  async updateApprovalStatus(
    homeDropId: string,
    status: 'pending' | 'approved' | 'rejected' | 'requires_changes'
  ): Promise<void> {
    const updates: Partial<HomeDropCapture> = { approvalStatus: status };

    if (status === 'approved') {
      updates.clientDeliveryReady = true;
      updates.deliveryPreparedAt = new Date().toISOString();
    }

    await coreHomeDropService.updateHomeDropCapture(homeDropId, updates);
    log.info('✅ Approval status updated', { homeDropId, status }, "HomeDropApprovalService");
  }

  /**
   * Validate home drop capture for approval submission
   */
  async validateHomeDropCapture(homeDropCapture: HomeDropCapture): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!homeDropCapture.poleNumber) {
      errors.push('Pole number is required');
    }

    if (!homeDropCapture.customer?.name) {
      errors.push('Customer name is required');
    }

    if (!homeDropCapture.customer?.address) {
      errors.push('Customer address is required');
    }

    if (!homeDropCapture.gpsLocation) {
      errors.push('GPS location is required');
    }

    // Photo validation
    const photos = await (db as any).homeDropPhotos
      .where('homeDropId')
      .equals(homeDropCapture.id)
      .toArray();

    const photoTypes = photos.map((p: HomeDropPhotoStorage) => p.type);
    const missingPhotos = this.validationRules.requiredPhotos.filter(
      type => !photoTypes.includes(type)
    );

    if (missingPhotos.length > 0) {
      errors.push(`Missing required photos: ${missingPhotos.join(', ')}`);
    }

    // Power reading validation
    const power = homeDropCapture.installation?.powerReadings?.opticalPower;
    if (power === undefined) {
      warnings.push('Optical power reading not recorded');
    } else if (power < this.validationRules.minOpticalPower || power > this.validationRules.maxOpticalPower) {
      warnings.push(`Optical power (${power} dBm) outside normal range (${this.validationRules.minOpticalPower} to ${this.validationRules.maxOpticalPower} dBm)`);
    }

    // Distance validation
    if (homeDropCapture.distanceFromPole && 
        homeDropCapture.distanceFromPole > this.validationRules.maxDistanceFromPole) {
      errors.push(`Distance from pole (${homeDropCapture.distanceFromPole}m) exceeds maximum (${this.validationRules.maxDistanceFromPole}m)`);
    }

    // Installation validation
    if (!homeDropCapture.installation?.serviceConfig?.activationStatus) {
      warnings.push('Service activation status not recorded');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get all home drops pending approval
   */
  async getPendingApprovals(): Promise<HomeDropCapture[]> {
    const allHomeDrops = await coreHomeDropService.getAllHomeDropCaptures();
    return allHomeDrops.filter(drop => drop.approvalStatus === 'pending');
  }

  /**
   * Get approval statistics
   */
  async getApprovalStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    requiresChanges: number;
    averageApprovalTime: number; // in hours
  }> {
    const allHomeDrops = await coreHomeDropService.getAllHomeDropCaptures();
    
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      requiresChanges: 0,
      averageApprovalTime: 0
    };

    let totalApprovalTime = 0;
    let approvedCount = 0;

    for (const drop of allHomeDrops) {
      switch (drop.approvalStatus) {
        case 'pending':
          stats.pending++;
          break;
        case 'approved':
          stats.approved++;
          if (drop.submittedForApprovalAt && drop.approvedAt) {
            const approvalTime = new Date(drop.approvedAt).getTime() - new Date(drop.submittedForApprovalAt).getTime();
            totalApprovalTime += approvalTime;
            approvedCount++;
          }
          break;
        case 'rejected':
          stats.rejected++;
          break;
        case 'requires_changes':
          stats.requiresChanges++;
          break;
      }
    }

    // Calculate average approval time in hours
    if (approvedCount > 0) {
      stats.averageApprovalTime = totalApprovalTime / approvedCount / (1000 * 60 * 60);
    }

    return stats;
  }

  /**
   * Generate approval quality report
   */
  async generateApprovalQualityReport(homeDropId: string): Promise<{
    overallScore: number; // 0-100
    photoQuality: number;
    dataCompleteness: number;
    gpsAccuracy: number;
    complianceScore: number;
    recommendations: string[];
  }> {
    const homeDropCapture = await coreHomeDropService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }

    const validation = await this.validateHomeDropCapture(homeDropCapture);
    
    // Photo quality score (0-100)
    const photos = await (db as any).homeDropPhotos
      .where('homeDropId')
      .equals(homeDropId)
      .toArray();
    
    const photoQuality = photos.length >= this.validationRules.requiredPhotos.length ? 100 : 
                        (photos.length / this.validationRules.requiredPhotos.length) * 100;

    // Data completeness score (0-100)
    const requiredFields = this.validationRules.requiredFields.length;
    const completedFields = this.validationRules.requiredFields.filter(field => {
      const value = this.getNestedProperty(homeDropCapture, field);
      return value !== undefined && value !== null && value !== '';
    }).length;
    const dataCompleteness = (completedFields / requiredFields) * 100;

    // GPS accuracy score (0-100)
    const gpsAccuracy = homeDropCapture.gpsLocation ? 
      Math.max(0, 100 - (homeDropCapture.gpsLocation.accuracy || 0)) : 0;

    // Compliance score based on validation errors
    const complianceScore = validation.errors.length === 0 ? 100 : 
                           Math.max(0, 100 - (validation.errors.length * 20));

    // Overall score (weighted average)
    const overallScore = Math.round(
      (photoQuality * 0.3) + 
      (dataCompleteness * 0.3) + 
      (gpsAccuracy * 0.2) + 
      (complianceScore * 0.2)
    );

    const recommendations: string[] = [];
    if (photoQuality < 100) recommendations.push('Capture all required photos');
    if (dataCompleteness < 100) recommendations.push('Complete all required fields');
    if (gpsAccuracy < 80) recommendations.push('Improve GPS accuracy');
    if (validation.errors.length > 0) recommendations.push('Fix validation errors');

    return {
      overallScore,
      photoQuality: Math.round(photoQuality),
      dataCompleteness: Math.round(dataCompleteness),
      gpsAccuracy: Math.round(gpsAccuracy),
      complianceScore: Math.round(complianceScore),
      recommendations
    };
  }

  /**
   * Utility: Get nested property value from object
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export const homeDropApprovalService = new HomeDropApprovalService();