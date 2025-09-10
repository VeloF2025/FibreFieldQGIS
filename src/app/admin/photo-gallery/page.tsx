/**
 * Admin Photo Gallery Page
 * 
 * Main administrative interface for photo management in the FibreField system.
 * Provides comprehensive photo viewing, approval, and organization capabilities.
 * 
 * Key Features:
 * 1. Photo gallery with multiple view modes
 * 2. Advanced filtering and search capabilities  
 * 3. Batch photo operations and approval workflow
 * 4. Photo metadata viewing and editing
 * 5. Client package creation integration
 * 6. Photo quality assessment tools
 * 7. EXIF data viewing for QGIS compatibility
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Package, 
  Download, 
  Upload, 
  Settings, 
  RefreshCw, 
  Filter,
  Search,
  Plus,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PhotoManagement } from '@/components/admin/photo-management';
import { ClientPackageCreator } from '@/components/admin/client-package-creator';
import { photoManagementService, type PhotoMetadata } from '@/services/photo-management.service';
import { clientDeliveryService } from '@/services/client-delivery.service';
import { log } from '@/lib/logger';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

/**
 * Photo Gallery Statistics Component
 */
function PhotoGalleryStats({ stats }: { 
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalSizeGB: number;
    withGPS: number;
    todayCount: number;
    weekCount: number;
  } 
}) {
  const approvalRate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
  const gpsRate = stats.total > 0 ? (stats.withGPS / stats.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
          <Camera className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.todayCount} uploaded today
          </p>
          <div className="mt-2 text-xs">
            <span className="text-blue-600">{stats.weekCount}</span> this week
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          <Filter className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}% of total
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{approvalRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.approved} approved, {stats.rejected} rejected
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${approvalRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <Download className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSizeGB.toFixed(1)} GB</div>
          <p className="text-xs text-muted-foreground">
            {gpsRate.toFixed(1)}% with GPS data
          </p>
          <div className="mt-2 text-xs">
            <span className="text-green-600">{stats.withGPS}</span> QGIS ready
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Quick Actions Component
 */
function QuickActions({ 
  onCreatePackage, 
  onBulkUpload, 
  onExportData,
  onSettings 
}: {
  onCreatePackage: () => void;
  onBulkUpload: () => void;
  onExportData: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={onCreatePackage}
      >
        <Package className="w-6 h-6" />
        <span className="text-sm">Create Package</span>
      </Button>
      
      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={onBulkUpload}
      >
        <Upload className="w-6 h-6" />
        <span className="text-sm">Bulk Upload</span>
      </Button>
      
      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={onExportData}
      >
        <Download className="w-6 h-6" />
        <span className="text-sm">Export Data</span>
      </Button>
      
      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={onSettings}
      >
        <Settings className="w-6 h-6" />
        <span className="text-sm">Settings</span>
      </Button>
    </div>
  );
}

/**
 * Bulk Upload Dialog Component
 */
function BulkUploadDialog({ 
  isOpen, 
  onClose 
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    setSelectedFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // TODO: Implement bulk upload logic
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        // Simulate upload progress
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }
      
      log.info('Bulk upload completed', { count: selectedFiles.length }, 'PhotoGallery');
      setSelectedFiles([]);
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Bulk upload failed', { error: errorMessage }, 'PhotoGallery');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Photo Upload</DialogTitle>
          <DialogDescription>
            Upload multiple photos at once. Only image files are accepted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                Drop photos here or{' '}
                <label className="text-blue-600 cursor-pointer hover:underline">
                  browse files
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, and other image formats
              </p>
            </div>
          </div>
          
          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Badge variant="outline">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading photos...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0 || isUploading}
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Admin Photo Gallery Page Component
 */
export default function AdminPhotoGalleryPage() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalSizeGB: 0,
    withGPS: 0,
    todayCount: 0,
    weekCount: 0
  });
  
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      
      // Load photos to calculate statistics
      const [pendingPhotos, approvedPhotos, rejectedPhotos] = await Promise.all([
        photoManagementService.getPhotosByApprovalStatus('pending'),
        photoManagementService.getPhotosByApprovalStatus('approved'),
        photoManagementService.getPhotosByApprovalStatus('rejected')
      ]);
      
      const allPhotos = [...pendingPhotos, ...approvedPhotos, ...rejectedPhotos];
      
      // Calculate statistics
      const totalSizeBytes = allPhotos.reduce((sum, photo) => sum + photo.originalSize, 0);
      const withGPS = allPhotos.filter(photo => photo.exif?.gps).length;
      
      // Date calculations
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const todayCount = allPhotos.filter(photo => 
        new Date(photo.capturedAt) >= today
      ).length;
      
      const weekCount = allPhotos.filter(photo => 
        new Date(photo.capturedAt) >= weekAgo
      ).length;
      
      setStats({
        total: allPhotos.length,
        pending: pendingPhotos.length,
        approved: approvedPhotos.length,
        rejected: rejectedPhotos.length,
        totalSizeGB: totalSizeBytes / (1024 ** 3),
        withGPS,
        todayCount,
        weekCount
      });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to load photo statistics', { error: errorMessage }, 'PhotoGallery');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = () => {
    setIsPackageDialogOpen(true);
  };

  const handleBulkUpload = () => {
    setIsBulkUploadOpen(true);
  };

  const handleExportData = () => {
    // TODO: Implement data export functionality
    log.info('Export data requested', {}, 'PhotoGallery');
  };

  const handleSettings = () => {
    // TODO: Open settings dialog
    log.info('Settings requested', {}, 'PhotoGallery');
  };

  const handleRefreshData = () => {
    loadStatistics();
    // Also refresh the photo management component
    window.location.reload();
  };

  if (isLoading) {
    return (
      <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
        <AppLayout>
          <div className="space-y-6">
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Camera className="w-8 h-8 animate-pulse mx-auto mb-4" />
                  <p className="text-gray-500">Loading photo gallery...</p>
                </div>
              </div>
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
          <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Photo Gallery</h1>
          <p className="text-gray-600">
            Manage photos, approvals, and client deliveries
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefreshData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create Client Package</DialogTitle>
                <DialogDescription>
                  Create a photo package for client delivery
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[80vh] overflow-y-auto">
                <ClientPackageCreator
                  onPackageCreated={(packageId) => {
                    log.info('Package created from gallery', { packageId }, 'PhotoGallery');
                    setIsPackageDialogOpen(false);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics */}
      <PhotoGalleryStats stats={stats} />

      {/* Quick Actions */}
      <QuickActions
        onCreatePackage={handleCreatePackage}
        onBulkUpload={handleBulkUpload}
        onExportData={handleExportData}
        onSettings={handleSettings}
      />

      {/* Main Content */}
      <Tabs defaultValue="gallery" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Photo Gallery
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Client Packages
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery">
          <PhotoManagement />
        </TabsContent>

        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>Client Package Management</CardTitle>
              <CardDescription>
                Manage photo packages and client deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Package management coming soon</p>
                <Button onClick={handleCreatePackage}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Package
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Trends</CardTitle>
                <CardDescription>Photo upload activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
                <CardDescription>Photo quality and approval metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Approval Rate</span>
                    <span className="font-medium">
                      {stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Photos with GPS</span>
                    <span className="font-medium">
                      {stats.total > 0 ? ((stats.withGPS / stats.total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average File Size</span>
                    <span className="font-medium">
                      {stats.total > 0 ? (stats.totalSizeGB * 1024 / stats.total).toFixed(1) : 0} MB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
      />
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}