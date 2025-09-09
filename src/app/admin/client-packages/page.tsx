/**
 * Client Packages Management Page
 * 
 * Administrative interface for managing client photo packages and deliveries.
 * Provides package tracking, delivery management, and analytics capabilities.
 * 
 * Key Features:
 * 1. Package listing with status tracking
 * 2. Delivery analytics and reporting
 * 3. Client access management
 * 4. Download tracking and statistics
 * 5. Package expiration and renewal
 * 6. Bulk package operations
 * 7. Email delivery management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Mail, 
  Download, 
  Eye, 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Search, 
  Plus,
  Send,
  Copy,
  ExternalLink,
  BarChart3,
  Trash2,
  FileText,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  clientDeliveryService,
  type PackageAnalytics
} from '@/services/client-delivery.service';
import { 
  type ClientPhotoPackage 
} from '@/services/photo-management.service';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';

/**
 * Package Statistics Component
 */
function PackageStatistics({ stats }: { 
  stats: {
    total: number;
    active: number;
    expired: number;
    delivered: number;
    totalDownloads: number;
    averageAccess: number;
    thisWeek: number;
    thisMonth: number;
  }
}) {
  const deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
  const activeRate = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
          <Package className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.thisWeek} created this week
          </p>
          <div className="mt-2 text-xs">
            <span className="text-blue-600">{stats.thisMonth}</span> this month
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
          <Activity className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active}</div>
          <p className="text-xs text-muted-foreground">
            {activeRate.toFixed(1)}% of total
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${activeRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
          <Download className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDownloads}</div>
          <p className="text-xs text-muted-foreground">
            Avg {stats.averageAccess.toFixed(1)} per package
          </p>
          <div className="mt-2 text-xs">
            <span className="text-green-600">↑</span> {stats.delivered} delivered
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{deliveryRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.expired} expired packages
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${deliveryRate}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Package List Item Component
 */
function PackageListItem({ 
  packageData, 
  onViewDetails, 
  onSendEmail, 
  onCopyLink, 
  onRenewPackage, 
  onDeletePackage 
}: {
  packageData: ClientPhotoPackage;
  onViewDetails: (packageId: string) => void;
  onSendEmail: (packageId: string) => void;
  onCopyLink: (packageId: string) => void;
  onRenewPackage: (packageId: string) => void;
  onDeletePackage: (packageId: string) => void;
}) {
  const getStatusColor = (status: ClientPhotoPackage['status']) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'creating': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ClientPhotoPackage['status']) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'delivered': return <Mail className="w-4 h-4" />;
      case 'expired': return <XCircle className="w-4 h-4" />;
      case 'creating': return <Clock className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const isExpired = new Date() > new Date(packageData.downloadExpiry);
  const daysUntilExpiry = Math.ceil(
    (new Date(packageData.downloadExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">
                {packageData.customName || `${packageData.packageType} Package`}
              </h3>
              <Badge className={getStatusColor(packageData.status)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(packageData.status)}
                  <span className="capitalize">{packageData.status}</span>
                </div>
              </Badge>
            </div>
            <p className="text-gray-600">{packageData.clientName}</p>
            {packageData.clientEmail && (
              <p className="text-sm text-gray-500">{packageData.clientEmail}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onViewDetails(packageData.id)}>
              <Eye className="w-4 h-4 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <FileText className="w-3 h-3" />
              <span>Photos</span>
            </div>
            <span className="font-medium">{packageData.totalPhotos}</span>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Download className="w-3 h-3" />
              <span>Downloads</span>
            </div>
            <span className="font-medium">
              {packageData.downloadCount} / {packageData.maxDownloads}
            </span>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Calendar className="w-3 h-3" />
              <span>Created</span>
            </div>
            <span className="font-medium">
              {new Date(packageData.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Clock className="w-3 h-3" />
              <span>Expires</span>
            </div>
            <span className={cn(
              "font-medium",
              isExpired ? "text-red-600" :
              daysUntilExpiry <= 3 ? "text-orange-600" :
              "text-green-600"
            )}>
              {isExpired ? 'Expired' : `${daysUntilExpiry} days`}
            </span>
          </div>
        </div>

        {/* Download Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Download Progress</span>
            <span>{Math.round((packageData.downloadCount / packageData.maxDownloads) * 100)}%</span>
          </div>
          <Progress 
            value={(packageData.downloadCount / packageData.maxDownloads) * 100}
            className="h-2"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => onCopyLink(packageData.id)}>
            <Copy className="w-4 h-4 mr-1" />
            Copy Link
          </Button>
          
          {packageData.clientEmail && !packageData.emailSent && (
            <Button size="sm" variant="outline" onClick={() => onSendEmail(packageData.id)}>
              <Send className="w-4 h-4 mr-1" />
              Send Email
            </Button>
          )}
          
          {isExpired && (
            <Button size="sm" variant="outline" onClick={() => onRenewPackage(packageData.id)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Renew
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onDeletePackage(packageData.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>

        {/* Email Status */}
        {packageData.emailSent && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>
                Email sent {packageData.emailSentAt ? new Date(packageData.emailSentAt).toLocaleDateString() : ''}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Package Details Modal Component
 */
function PackageDetailsModal({ 
  packageData, 
  analytics, 
  isOpen, 
  onClose 
}: {
  packageData: ClientPhotoPackage | null;
  analytics: PackageAnalytics | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!packageData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{packageData.customName || `${packageData.packageType} Package`}</span>
            <Badge className={
              packageData.status === 'ready' ? 'bg-green-100 text-green-800' :
              packageData.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
              packageData.status === 'expired' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }>
              {packageData.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Package Details</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="access">Access Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="h-[60vh] overflow-auto space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Package Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Package ID:</span>
                    <span className="font-medium font-mono">{packageData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{packageData.packageType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Photos:</span>
                    <span className="font-medium">{packageData.totalPhotos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Package Size:</span>
                    <span className="font-medium">
                      {packageData.zipFileSize ? `${(packageData.zipFileSize / 1024 / 1024).toFixed(1)} MB` : 'Calculating...'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{packageData.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{packageData.clientEmail || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Project:</span>
                    <span className="font-medium">{packageData.projectName}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Access Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Download URL:</span>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Downloads:</span>
                    <span className="font-medium">{packageData.maxDownloads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Downloads Used:</span>
                    <span className="font-medium">{packageData.downloadCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requires Auth:</span>
                    <span className="font-medium">{packageData.requiresAuth ? 'Yes' : 'No'}</span>
                  </div>
                  {packageData.accessCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Access Code:</span>
                      <span className="font-medium font-mono">{packageData.accessCode}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{new Date(packageData.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className={cn(
                      "font-medium",
                      new Date() > new Date(packageData.downloadExpiry) ? "text-red-600" : "text-green-600"
                    )}>
                      {new Date(packageData.downloadExpiry).toLocaleString()}
                    </span>
                  </div>
                  {packageData.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">First Access:</span>
                      <span className="font-medium">{new Date(packageData.deliveredAt).toLocaleString()}</span>
                    </div>
                  )}
                  {packageData.lastAccessedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Access:</span>
                      <span className="font-medium">{new Date(packageData.lastAccessedAt).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="h-[60vh] overflow-auto">
            {analytics ? (
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Usage Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{analytics.totalViews}</div>
                        <div className="text-xs text-gray-500">Total Views</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{analytics.totalDownloads}</div>
                        <div className="text-xs text-gray-500">Downloads</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{analytics.uniqueVisitors}</div>
                        <div className="text-xs text-gray-500">Unique Visitors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {analytics.downloadSuccessRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Success Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Session:</span>
                      <span className="font-medium">
                        {Math.round(analytics.averageSessionDuration / 60)}m {analytics.averageSessionDuration % 60}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Download Time:</span>
                      <span className="font-medium">{analytics.averageDownloadTime.toFixed(1)}s</span>
                    </div>
                    {analytics.timeToFirstDownload && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time to First Download:</span>
                        <span className="font-medium">{Math.round(analytics.timeToFirstDownload)}m</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No analytics data available</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="access" className="h-[60vh] overflow-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Access History</CardTitle>
                <CardDescription>Recent access attempts and downloads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Access log data coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Client Packages Management Page Component
 */
export default function ClientPackagesPage() {
  const [packages, setPackages] = useState<ClientPhotoPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<ClientPhotoPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ClientPhotoPackage | null>(null);
  const [packageAnalytics, setPackageAnalytics] = useState<PackageAnalytics | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    delivered: 0,
    totalDownloads: 0,
    averageAccess: 0,
    thisWeek: 0,
    thisMonth: 0
  });

  // Load packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  // Filter packages based on search and status
  useEffect(() => {
    let filtered = packages;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(pkg => 
        pkg.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pkg.customName && pkg.customName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        pkg.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pkg => pkg.status === statusFilter);
    }
    
    setFilteredPackages(filtered);
  }, [packages, searchTerm, statusFilter]);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Load packages from service
      // For now, using mock data
      const mockPackages: ClientPhotoPackage[] = [];
      setPackages(mockPackages);
      
      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const activePackages = mockPackages.filter(pkg => 
        pkg.status === 'ready' && new Date(pkg.downloadExpiry) > now
      );
      
      const expiredPackages = mockPackages.filter(pkg => 
        new Date(pkg.downloadExpiry) <= now
      );
      
      const deliveredPackages = mockPackages.filter(pkg => 
        pkg.status === 'delivered'
      );
      
      const totalDownloads = mockPackages.reduce((sum, pkg) => sum + pkg.downloadCount, 0);
      const averageAccess = mockPackages.length > 0 ? totalDownloads / mockPackages.length : 0;
      
      const thisWeekCount = mockPackages.filter(pkg => 
        new Date(pkg.createdAt) >= weekAgo
      ).length;
      
      const thisMonthCount = mockPackages.filter(pkg => 
        new Date(pkg.createdAt) >= monthAgo
      ).length;
      
      setStats({
        total: mockPackages.length,
        active: activePackages.length,
        expired: expiredPackages.length,
        delivered: deliveredPackages.length,
        totalDownloads,
        averageAccess,
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount
      });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to load client packages', { error: errorMessage }, 'ClientPackages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (packageId: string) => {
    const packageData = packages.find(pkg => pkg.id === packageId);
    if (!packageData) return;
    
    try {
      // Load analytics data
      const analytics = await clientDeliveryService.getPackageAnalytics(packageId);
      setPackageAnalytics(analytics);
    } catch (error: unknown) {
      log.warn('Failed to load package analytics', { packageId }, 'ClientPackages');
      setPackageAnalytics(null);
    }
    
    setSelectedPackage(packageData);
    setIsDetailsModalOpen(true);
  };

  const handleSendEmail = async (packageId: string) => {
    try {
      // TODO: Implement email sending
      log.info('Sending package email', { packageId }, 'ClientPackages');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to send package email', { packageId, error: errorMessage }, 'ClientPackages');
    }
  };

  const handleCopyLink = async (packageId: string) => {
    try {
      const link = `${window.location.origin}/packages/${packageId}`;
      await navigator.clipboard.writeText(link);
      log.info('Package link copied to clipboard', { packageId }, 'ClientPackages');
    } catch (error: unknown) {
      log.warn('Failed to copy package link', { packageId }, 'ClientPackages');
    }
  };

  const handleRenewPackage = async (packageId: string) => {
    try {
      // TODO: Implement package renewal
      log.info('Renewing package', { packageId }, 'ClientPackages');
      await loadPackages();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to renew package', { packageId, error: errorMessage }, 'ClientPackages');
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    try {
      // TODO: Implement package deletion
      log.info('Deleting package', { packageId }, 'ClientPackages');
      await loadPackages();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to delete package', { packageId, error: errorMessage }, 'ClientPackages');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="w-8 h-8 animate-pulse mx-auto mb-4" />
            <p className="text-gray-500">Loading client packages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Client Packages</h1>
          <p className="text-gray-600">
            Manage photo packages and client deliveries
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadPackages}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <PackageStatistics stats={stats} />

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search packages by client name, project, or package ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="creating">Creating</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Package List */}
      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first client package to get started"
                  }
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Package
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPackages.map(packageData => (
            <PackageListItem
              key={packageData.id}
              packageData={packageData}
              onViewDetails={handleViewDetails}
              onSendEmail={handleSendEmail}
              onCopyLink={handleCopyLink}
              onRenewPackage={handleRenewPackage}
              onDeletePackage={handleDeletePackage}
            />
          ))
        )}
      </div>

      {/* Package Details Modal */}
      <PackageDetailsModal
        packageData={selectedPackage}
        analytics={packageAnalytics}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedPackage(null);
          setPackageAnalytics(null);
        }}
      />
    </div>
  );
}