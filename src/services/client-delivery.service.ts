/**
 * Client Delivery Service
 * 
 * Manages client photo package creation, delivery, and tracking.
 * Handles secure download links, email notifications, and access control.
 * 
 * Key Features:
 * 1. Client package creation with multiple templates
 * 2. Secure download links with expiration
 * 3. Access tracking and analytics
 * 4. Email notification system
 * 5. Bulk package operations for administrators
 * 6. Download analytics and reporting
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { photoManagementService, type PhotoMetadata, type ClientPhotoPackage } from './photo-management.service';
import { homeDropCaptureService } from './home-drop-capture.service';
import { log } from '@/lib/logger';

/**
 * Package Template Interface
 */
export interface PackageTemplate {
  id: string;
  name: string;
  description: string;
  photoTypes: string[]; // Which photo types to include
  includeMetadata: boolean;
  includeGPS: boolean;
  maxResolution: 'original' | 'large' | 'medium';
  emailTemplate: string;
  isDefault: boolean;
}

/**
 * Delivery Tracking Interface
 */
export interface DeliveryTracking {
  packageId: string;
  accessLog: Array<{
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    action: 'viewed' | 'downloaded' | 'accessed';
    metadata?: Record<string, unknown>;
  }>;
  downloadHistory: Array<{
    timestamp: Date;
    ipAddress: string;
    fileSize: number;
    downloadTime: number; // milliseconds
    success: boolean;
    errorMessage?: string;
  }>;
  emailHistory: Array<{
    timestamp: Date;
    recipient: string;
    subject: string;
    status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
    errorMessage?: string;
  }>;
}

/**
 * Package Analytics Interface
 */
export interface PackageAnalytics {
  packageId: string;
  
  // Usage metrics
  totalViews: number;
  totalDownloads: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
  
  // Performance metrics
  averageDownloadTime: number;
  downloadSuccessRate: number;
  popularPhotos: Array<{
    photoId: string;
    photoType: string;
    viewCount: number;
    downloadCount: number;
  }>;
  
  // Geographic data
  accessByCountry: Record<string, number>;
  accessByCity: Record<string, number>;
  
  // Time-based analytics
  accessByHour: number[]; // 24-hour array
  accessByDay: number[]; // 7-day array
  accessTrend: Array<{
    date: string;
    views: number;
    downloads: number;
  }>;
  
  // Client engagement
  firstAccessTime?: Date;
  lastAccessTime?: Date;
  timeToFirstDownload?: number; // minutes after package creation
  
  // Quality metrics
  clientSatisfactionRating?: number; // 1-5 if feedback provided
  clientFeedback?: string;
}

/**
 * Bulk Package Operation Interface
 */
export interface BulkPackageOperation {
  operationType: 'create' | 'send' | 'expire' | 'delete';
  homeDropIds: string[];
  packageTemplate: string;
  options?: {
    customName?: string;
    expiryDays?: number;
    maxDownloads?: number;
    emailTemplate?: string;
    includeCustomMessage?: string;
  };
  
  // Progress tracking
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  processedCount: number;
  errorCount: number;
  errors: Array<{
    homeDropId: string;
    error: string;
  }>;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Client Delivery Service Class
 */
class ClientDeliveryService {
  private readonly PACKAGES_COLLECTION = 'client-packages';
  private readonly TEMPLATES_COLLECTION = 'package-templates';
  private readonly TRACKING_COLLECTION = 'delivery-tracking';
  private readonly ANALYTICS_COLLECTION = 'package-analytics';
  private readonly BULK_OPS_COLLECTION = 'bulk-package-operations';
  
  // Default package templates
  private readonly defaultTemplates: PackageTemplate[] = [
    {
      id: 'progress-report',
      name: 'Progress Report',
      description: 'Installation progress photos for client updates',
      photoTypes: ['power-meter-test', 'fibertime-setup-confirmation'],
      includeMetadata: true,
      includeGPS: false,
      maxResolution: 'medium',
      emailTemplate: 'progress-update',
      isDefault: true
    },
    {
      id: 'completion-package',
      name: 'Completion Package',
      description: 'Complete installation documentation',
      photoTypes: ['power-meter-test', 'fibertime-setup-confirmation', 'fibertime-device-actions', 'router-4-lights-status'],
      includeMetadata: true,
      includeGPS: true,
      maxResolution: 'large',
      emailTemplate: 'completion-notice',
      isDefault: true
    },
    {
      id: 'technical-package',
      name: 'Technical Package',
      description: 'High-resolution photos with full metadata for technical review',
      photoTypes: ['power-meter-test', 'fibertime-setup-confirmation', 'fibertime-device-actions', 'router-4-lights-status'],
      includeMetadata: true,
      includeGPS: true,
      maxResolution: 'original',
      emailTemplate: 'technical-delivery',
      isDefault: false
    }
  ];
  
  constructor() {
    this.initializeService();
  }
  
  /**
   * Initialize the client delivery service
   */
  private async initializeService(): Promise<void> {
    try {
      // Ensure default templates exist
      await this.ensureDefaultTemplates();
      log.info('Client Delivery Service initialized', {}, 'ClientDeliveryService');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to initialize Client Delivery Service', { error: errorMessage }, 'ClientDeliveryService');
    }
  }
  
  /**
   * Ensure default package templates exist in Firestore
   */
  private async ensureDefaultTemplates(): Promise<void> {
    for (const template of this.defaultTemplates) {
      try {
        const docRef = doc(db, this.TEMPLATES_COLLECTION, template.id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          await setDoc(docRef, template);
          log.info('Created default package template', { templateId: template.id }, 'ClientDeliveryService');
        }
      } catch (error: unknown) {
        log.warn('Failed to create default template', { templateId: template.id, error }, 'ClientDeliveryService');
      }
    }
  }
  
  // ==================== Package Creation ====================
  
  /**
   * Create client package using template
   */
  async createPackageFromTemplate(
    homeDropId: string,
    templateId: string,
    options: {
      customName?: string;
      clientEmail?: string;
      expiryDays?: number;
      maxDownloads?: number;
      includeCustomMessage?: string;
    } = {}
  ): Promise<string> {
    try {
      // Get template
      const template = await this.getPackageTemplate(templateId);
      if (!template) {
        throw new Error(`Package template ${templateId} not found`);
      }
      
      // Get home drop details
      const homeDrop = await homeDropCaptureService.getHomeDropCapture(homeDropId);
      if (!homeDrop) {
        throw new Error(`Home drop ${homeDropId} not found`);
      }
      
      // Get photos matching template criteria
      const allPhotos = await photoManagementService.getHomeDropPhotos(homeDropId);
      const templatePhotos = allPhotos.filter(photo => 
        template.photoTypes.includes(photo.photoType) &&
        photo.approvalStatus === 'approved'
      );
      
      if (templatePhotos.length === 0) {
        throw new Error('No approved photos found matching template criteria');
      }
      
      // Create package using photo management service
      const packageId = await photoManagementService.createClientPackage(
        homeDropId,
        templateId === 'completion-package' ? 'completion' : 'custom',
        {
          customName: options.customName || template.name,
          photoIds: templatePhotos.map(p => p.id),
          clientEmail: options.clientEmail,
          expiryDays: options.expiryDays,
          maxDownloads: options.maxDownloads,
          requiresAuth: false
        }
      );
      
      // Initialize tracking and analytics
      await this.initializePackageTracking(packageId);
      await this.initializePackageAnalytics(packageId);
      
      log.info('Package created from template', { 
        packageId, 
        templateId, 
        homeDropId,
        photoCount: templatePhotos.length 
      }, 'ClientDeliveryService');
      
      return packageId;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to create package from template', { 
        homeDropId, 
        templateId, 
        error: errorMessage 
      }, 'ClientDeliveryService');
      throw error;
    }
  }
  
  /**
   * Create custom client package
   */
  async createCustomPackage(
    homeDropId: string,
    photoIds: string[],
    options: {
      packageName: string;
      clientEmail?: string;
      expiryDays?: number;
      maxDownloads?: number;
      includeMetadata?: boolean;
      includeGPS?: boolean;
      maxResolution?: 'original' | 'large' | 'medium';
      customMessage?: string;
    }
  ): Promise<string> {
    try {
      // Validate photos exist and are approved
      const photos = await Promise.all(
        photoIds.map(id => photoManagementService.getPhotoMetadata(id))
      );
      
      const validPhotos = photos.filter(p => 
        p && 
        p.homeDropId === homeDropId && 
        p.approvalStatus === 'approved'
      );
      
      if (validPhotos.length === 0) {
        throw new Error('No valid approved photos found');
      }
      
      // Create package
      const packageId = await photoManagementService.createClientPackage(
        homeDropId,
        'custom',
        {
          customName: options.packageName,
          photoIds: validPhotos.map(p => p!.id),
          clientEmail: options.clientEmail,
          expiryDays: options.expiryDays,
          maxDownloads: options.maxDownloads,
          requiresAuth: false
        }
      );
      
      // Initialize tracking
      await this.initializePackageTracking(packageId);
      await this.initializePackageAnalytics(packageId);
      
      log.info('Custom package created', { 
        packageId, 
        homeDropId,
        photoCount: validPhotos.length 
      }, 'ClientDeliveryService');
      
      return packageId;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to create custom package', { homeDropId, error: errorMessage }, 'ClientDeliveryService');
      throw error;
    }
  }
  
  // ==================== Package Management ====================
  
  /**
   * Get client package by ID
   */
  async getClientPackage(packageId: string): Promise<ClientPhotoPackage | null> {
    try {
      const docRef = doc(db, this.PACKAGES_COLLECTION, packageId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          downloadExpiry: data.downloadExpiry.toDate(),
          deliveredAt: data.deliveredAt?.toDate(),
          lastAccessedAt: data.lastAccessedAt?.toDate(),
          emailSentAt: data.emailSentAt?.toDate()
        } as ClientPhotoPackage;
      }
      
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get client package', { packageId, error: errorMessage }, 'ClientDeliveryService');
      throw error;
    }
  }
  
  /**
   * Get all packages for a home drop
   */
  async getHomeDropPackages(homeDropId: string): Promise<ClientPhotoPackage[]> {
    try {
      const q = query(
        collection(db, this.PACKAGES_COLLECTION),
        where('homeDropId', '==', homeDropId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        downloadExpiry: doc.data().downloadExpiry.toDate(),
        deliveredAt: doc.data().deliveredAt?.toDate(),
        lastAccessedAt: doc.data().lastAccessedAt?.toDate(),
        emailSentAt: doc.data().emailSentAt?.toDate()
      })) as ClientPhotoPackage[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get home drop packages', { homeDropId, error: errorMessage }, 'ClientDeliveryService');
      throw error;
    }
  }
  
  /**
   * Update package status
   */
  async updatePackageStatus(
    packageId: string, 
    status: ClientPhotoPackage['status'],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.PACKAGES_COLLECTION, packageId);
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: Timestamp.now()
      };
      
      if (status === 'delivered') {
        updateData.deliveredAt = Timestamp.now();
      }
      
      if (metadata) {
        Object.assign(updateData, metadata);
      }
      
      await updateDoc(docRef, updateData);
      
      log.info('Package status updated', { packageId, status }, 'ClientDeliveryService');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to update package status', { packageId, error: errorMessage }, 'ClientDeliveryService');
      throw error;
    }
  }
  
  // ==================== Access Tracking ====================
  
  /**
   * Track package access
   */
  async trackPackageAccess(
    packageId: string,
    action: 'viewed' | 'downloaded' | 'accessed',
    metadata: {
      ipAddress: string;
      userAgent: string;
      fileSize?: number;
      downloadTime?: number;
      success?: boolean;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      // Update package last accessed time
      const packageDocRef = doc(db, this.PACKAGES_COLLECTION, packageId);
      await updateDoc(packageDocRef, {
        lastAccessedAt: Timestamp.now(),
        downloadCount: action === 'downloaded' ? 
          (await this.getPackageDownloadCount(packageId)) + 1 : 
          (await this.getPackageDownloadCount(packageId))
      });
      
      // Add to tracking log
      const trackingDocRef = doc(db, this.TRACKING_COLLECTION, packageId);
      const trackingDoc = await getDoc(trackingDocRef);
      
      const accessEntry = {
        timestamp: new Date(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        action,
        metadata: metadata
      };
      
      if (trackingDoc.exists()) {
        const data = trackingDoc.data() as DeliveryTracking;
        data.accessLog.push(accessEntry);
        
        if (action === 'downloaded') {
          data.downloadHistory.push({
            timestamp: new Date(),
            ipAddress: metadata.ipAddress,
            fileSize: metadata.fileSize || 0,
            downloadTime: metadata.downloadTime || 0,
            success: metadata.success !== false,
            errorMessage: metadata.errorMessage
          });
        }
        
        await updateDoc(trackingDocRef, {
          accessLog: data.accessLog,
          downloadHistory: data.downloadHistory
        });
      }
      
      // Update analytics
      await this.updatePackageAnalytics(packageId, action, metadata);
      
      log.info('Package access tracked', { packageId, action }, 'ClientDeliveryService');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to track package access', { packageId, error: errorMessage }, 'ClientDeliveryService');
    }
  }
  
  /**
   * Get package analytics
   */
  async getPackageAnalytics(packageId: string): Promise<PackageAnalytics | null> {
    try {
      const docRef = doc(db, this.ANALYTICS_COLLECTION, packageId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          firstAccessTime: data.firstAccessTime?.toDate(),
          lastAccessTime: data.lastAccessTime?.toDate()
        } as PackageAnalytics;
      }
      
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get package analytics', { packageId, error: errorMessage }, 'ClientDeliveryService');
      throw error;
    }
  }
  
  // ==================== Bulk Operations ====================
  
  /**
   * Create packages for multiple home drops
   */
  async createBulkPackages(
    homeDropIds: string[],
    templateId: string,
    options: BulkPackageOperation['options'] = {}
  ): Promise<string> {
    try {
      const operationId = this.generateOperationId();
      
      // Create bulk operation record
      const bulkOperation: BulkPackageOperation = {
        operationType: 'create',
        homeDropIds,
        packageTemplate: templateId,
        options,
        status: 'pending',
        progress: 0,
        processedCount: 0,
        errorCount: 0,
        errors: [],
        createdBy: 'admin', // TODO: Get actual user
        createdAt: new Date()
      };
      
      await this.saveBulkOperation(operationId, bulkOperation);
      
      // Process in background
      this.processBulkOperation(operationId).catch(error => {
        log.error('Bulk operation failed', { operationId, error }, 'ClientDeliveryService');
      });
      
      log.info('Bulk package operation started', { operationId, count: homeDropIds.length }, 'ClientDeliveryService');
      return operationId;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to start bulk package operation', { error: errorMessage }, 'ClientDeliveryService');
      throw error;
    }
  }
  
  /**
   * Process bulk operation
   */
  private async processBulkOperation(operationId: string): Promise<void> {
    try {
      const operation = await this.getBulkOperation(operationId);
      if (!operation) return;
      
      await this.updateBulkOperationStatus(operationId, 'processing');
      
      const results = [];
      for (let i = 0; i < operation.homeDropIds.length; i++) {
        const homeDropId = operation.homeDropIds[i];
        
        try {
          const packageId = await this.createPackageFromTemplate(
            homeDropId, 
            operation.packageTemplate,
            operation.options || {}
          );
          results.push({ homeDropId, packageId });
          
          const progress = ((i + 1) / operation.homeDropIds.length) * 100;
          await this.updateBulkOperationProgress(operationId, progress, i + 1, operation.errorCount);
          
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          operation.errors.push({ homeDropId, error: errorMessage });
          await this.updateBulkOperationProgress(operationId, 0, operation.processedCount, operation.errorCount + 1);
        }
      }
      
      await this.updateBulkOperationStatus(operationId, 'completed', { completedAt: new Date() });
      
      log.info('Bulk operation completed', { 
        operationId, 
        success: results.length, 
        errors: operation.errors.length 
      }, 'ClientDeliveryService');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Bulk operation processing failed', { operationId, error: errorMessage }, 'ClientDeliveryService');
      await this.updateBulkOperationStatus(operationId, 'failed', { error: errorMessage });
    }
  }
  
  // ==================== Helper Methods ====================
  
  /**
   * Get package template
   */
  private async getPackageTemplate(templateId: string): Promise<PackageTemplate | null> {
    try {
      const docRef = doc(db, this.TEMPLATES_COLLECTION, templateId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as PackageTemplate : null;
    } catch (error: unknown) {
      log.error('Failed to get package template', { templateId, error }, 'ClientDeliveryService');
      return null;
    }
  }
  
  /**
   * Initialize package tracking
   */
  private async initializePackageTracking(packageId: string): Promise<void> {
    const tracking: DeliveryTracking = {
      packageId,
      accessLog: [],
      downloadHistory: [],
      emailHistory: []
    };
    
    const docRef = doc(db, this.TRACKING_COLLECTION, packageId);
    await setDoc(docRef, tracking);
  }
  
  /**
   * Initialize package analytics
   */
  private async initializePackageAnalytics(packageId: string): Promise<void> {
    const analytics: PackageAnalytics = {
      packageId,
      totalViews: 0,
      totalDownloads: 0,
      uniqueVisitors: 0,
      averageSessionDuration: 0,
      averageDownloadTime: 0,
      downloadSuccessRate: 100,
      popularPhotos: [],
      accessByCountry: {},
      accessByCity: {},
      accessByHour: new Array(24).fill(0),
      accessByDay: new Array(7).fill(0),
      accessTrend: []
    };
    
    const docRef = doc(db, this.ANALYTICS_COLLECTION, packageId);
    await setDoc(docRef, analytics);
  }
  
  /**
   * Update package analytics
   */
  private async updatePackageAnalytics(
    packageId: string,
    action: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    // This would contain analytics update logic
    // For brevity, implementing basic structure
    const docRef = doc(db, this.ANALYTICS_COLLECTION, packageId);
    const updates: Record<string, unknown> = {};
    
    if (action === 'viewed') {
      updates.totalViews = (await this.getAnalyticsValue(packageId, 'totalViews')) + 1;
    } else if (action === 'downloaded') {
      updates.totalDownloads = (await this.getAnalyticsValue(packageId, 'totalDownloads')) + 1;
    }
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(docRef, updates);
    }
  }
  
  /**
   * Get analytics value helper
   */
  private async getAnalyticsValue(packageId: string, field: string): Promise<number> {
    try {
      const docRef = doc(db, this.ANALYTICS_COLLECTION, packageId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data()[field] || 0) : 0;
    } catch {
      return 0;
    }
  }
  
  /**
   * Get package download count
   */
  private async getPackageDownloadCount(packageId: string): Promise<number> {
    try {
      const docRef = doc(db, this.PACKAGES_COLLECTION, packageId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data().downloadCount || 0) : 0;
    } catch {
      return 0;
    }
  }
  
  /**
   * Save bulk operation
   */
  private async saveBulkOperation(operationId: string, operation: BulkPackageOperation): Promise<void> {
    const docRef = doc(db, this.BULK_OPS_COLLECTION, operationId);
    await setDoc(docRef, {
      ...operation,
      createdAt: Timestamp.fromDate(operation.createdAt),
      completedAt: operation.completedAt ? Timestamp.fromDate(operation.completedAt) : null
    });
  }
  
  /**
   * Get bulk operation
   */
  private async getBulkOperation(operationId: string): Promise<BulkPackageOperation | null> {
    const docRef = doc(db, this.BULK_OPS_COLLECTION, operationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt?.toDate()
      } as BulkPackageOperation;
    }
    
    return null;
  }
  
  /**
   * Update bulk operation status
   */
  private async updateBulkOperationStatus(
    operationId: string, 
    status: BulkPackageOperation['status'],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const docRef = doc(db, this.BULK_OPS_COLLECTION, operationId);
    const updates = { status, ...metadata };
    
    if (metadata?.completedAt) {
      updates.completedAt = Timestamp.fromDate(metadata.completedAt as Date);
    }
    
    await updateDoc(docRef, updates);
  }
  
  /**
   * Update bulk operation progress
   */
  private async updateBulkOperationProgress(
    operationId: string,
    progress: number,
    processedCount: number,
    errorCount: number
  ): Promise<void> {
    const docRef = doc(db, this.BULK_OPS_COLLECTION, operationId);
    await updateDoc(docRef, {
      progress,
      processedCount,
      errorCount
    });
  }
  
  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BULK-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const clientDeliveryService = new ClientDeliveryService();
export type { 
  PackageTemplate, 
  DeliveryTracking, 
  PackageAnalytics, 
  BulkPackageOperation 
};