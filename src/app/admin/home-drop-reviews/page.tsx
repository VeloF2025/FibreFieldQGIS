'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Eye,
  MapPin,
  Camera,
  User,
  Calendar,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { photoUploadService } from '@/services/photo-upload.service';
import type { HomeDropCapture } from '@/types/home-drop.types';

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  inReview: number;
}

interface FilterOptions {
  status: string;
  dateRange: string;
  technician: string;
  searchTerm: string;
}

export default function AdminHomeDropReviewsPage() {
  const [captures, setCaptures] = useState<HomeDropCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCapture, setSelectedCapture] = useState<HomeDropCapture | null>(null);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    inReview: 0
  });
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    technician: 'all',
    searchTerm: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const itemsPerPage = 10;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load captures
  useEffect(() => {
    loadCaptures();
  }, []);

  const loadCaptures = async () => {
    setLoading(true);
    try {
      const allCaptures = await homeDropCaptureService.getAllHomeDropCaptures();
      setCaptures(allCaptures);
      calculateStats(allCaptures);
    } catch (error) {
      console.error('Failed to load captures:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (capturesList: HomeDropCapture[]) => {
    const newStats: ReviewStats = {
      total: capturesList.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      inReview: 0
    };

    capturesList.forEach(capture => {
      switch (capture.approvalStatus) {
        case 'pending':
          newStats.pending++;
          break;
        case 'approved':
          newStats.approved++;
          break;
        case 'rejected':
          newStats.rejected++;
          break;
        case 'under_review':
          newStats.inReview++;
          break;
      }
    });

    setStats(newStats);
  };

  // Filter captures
  const filteredCaptures = captures.filter(capture => {
    // Status filter
    if (filters.status !== 'all' && capture.approvalStatus !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const captureDate = new Date(capture.capturedAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - captureDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          if (daysDiff > 0) return false;
          break;
        case 'week':
          if (daysDiff > 7) return false;
          break;
        case 'month':
          if (daysDiff > 30) return false;
          break;
      }
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const searchFields = [
        capture.id,
        capture.dropNumber,
        capture.serviceAddress,
        capture.customerInfo?.name,
        capture.capturedBy
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchFields.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCaptures.length / itemsPerPage);
  const paginatedCaptures = filteredCaptures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleApprove = async (captureId: string) => {
    try {
      await homeDropCaptureService.updateApprovalStatus(captureId, 'approved');
      await loadCaptures();
      setSelectedCapture(null);
    } catch (error) {
      console.error('Failed to approve capture:', error);
    }
  };

  const handleReject = async (captureId: string, reason: string) => {
    try {
      await homeDropCaptureService.updateApprovalStatus(captureId, 'rejected', reason);
      await loadCaptures();
      setSelectedCapture(null);
    } catch (error) {
      console.error('Failed to reject capture:', error);
    }
  };

  const handleBulkApprove = async () => {
    const pendingCaptures = filteredCaptures.filter(c => c.approvalStatus === 'pending');
    for (const capture of pendingCaptures) {
      await handleApprove(capture.id);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['ID', 'Drop Number', 'Address', 'Customer', 'Technician', 'Date', 'Status', 'Quality Score'],
      ...filteredCaptures.map(c => [
        c.id,
        c.dropNumber,
        c.serviceAddress,
        c.customerInfo?.name || '',
        c.capturedBy,
        new Date(c.capturedAt).toLocaleString(),
        c.approvalStatus,
        c.qualityScore || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `home-drop-reviews-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Home Drop Reviews</h1>
          <p className="text-gray-600">Review and approve home drop installations</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="outline" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 text-orange-600">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          <Button variant="outline" onClick={loadCaptures}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Review</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inReview}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by ID, address, customer..."
                  className="pl-10"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                />
              </div>
            </div>
            
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBulkApprove} disabled={stats.pending === 0}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Bulk Approve
              </Button>
              <Button variant="outline" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading reviews...</p>
            </div>
          ) : filteredCaptures.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No home drop captures found</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID / Drop #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Technician
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCaptures.map((capture) => (
                      <tr key={capture.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium">{capture.id}</p>
                            <p className="text-xs text-gray-500">{capture.dropNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm">{capture.serviceAddress}</p>
                              <p className="text-xs text-gray-500">
                                {capture.gpsLocation?.latitude?.toFixed(6)}, {capture.gpsLocation?.longitude?.toFixed(6)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm">{capture.customerInfo?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{capture.customerInfo?.phone || ''}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{capture.capturedBy}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">
                              {new Date(capture.capturedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {capture.qualityScore ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${getQualityColor(capture.qualityScore)}`}>
                                {capture.qualityScore}%
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    capture.qualityScore >= 80 ? 'bg-green-500' :
                                    capture.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${capture.qualityScore}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(capture.approvalStatus)}>
                            {capture.approvalStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCapture(capture)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {capture.approvalStatus === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(capture.id)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    const reason = prompt('Rejection reason:');
                                    if (reason) handleReject(capture.id, reason);
                                  }}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredCaptures.length)} of{' '}
                    {filteredCaptures.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Home Drop Details - {selectedCapture.id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCapture(null)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="w-full">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="photos">Photos</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Drop Number</p>
                      <p className="font-medium">{selectedCapture.dropNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Service Address</p>
                      <p className="font-medium">{selectedCapture.serviceAddress}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Name</p>
                      <p className="font-medium">{selectedCapture.customerInfo?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedCapture.customerInfo?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedCapture.customerInfo?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Service Type</p>
                      <p className="font-medium">{selectedCapture.customerInfo?.serviceType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Captured By</p>
                      <p className="font-medium">{selectedCapture.capturedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Captured At</p>
                      <p className="font-medium">
                        {new Date(selectedCapture.capturedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quality Score</p>
                      <p className={`font-medium ${getQualityColor(selectedCapture.qualityScore || 0)}`}>
                        {selectedCapture.qualityScore || 'Not rated'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge className={getStatusColor(selectedCapture.approvalStatus)}>
                        {selectedCapture.approvalStatus}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedCapture.rejectionReason && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Rejection Reason:</strong> {selectedCapture.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                
                <TabsContent value="photos" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedCapture.photos).map(([type, photo]) => (
                      <div key={type} className="border rounded-lg p-2">
                        <p className="text-sm font-medium mb-2 capitalize">
                          {type.replace(/_/g, ' ')}
                        </p>
                        {photo ? (
                          <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                            <Camera className="h-8 w-8 text-gray-400" />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-50 rounded flex items-center justify-center">
                            <p className="text-sm text-gray-500">No photo</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="location" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Latitude</p>
                      <p className="font-medium">{selectedCapture.gpsLocation?.latitude?.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Longitude</p>
                      <p className="font-medium">{selectedCapture.gpsLocation?.longitude?.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Accuracy</p>
                      <p className="font-medium">{selectedCapture.gpsLocation?.accuracy?.toFixed(2)}m</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Altitude</p>
                      <p className="font-medium">
                        {selectedCapture.gpsLocation?.altitude?.toFixed(2) || 'N/A'}m
                      </p>
                    </div>
                  </div>
                  
                  <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-gray-400" />
                    <p className="ml-2 text-gray-500">Map view placeholder</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Created: {new Date(selectedCapture.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Last Modified: {new Date(selectedCapture.lastModified).toLocaleString()}</span>
                    </div>
                    {selectedCapture.syncedAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Synced: {new Date(selectedCapture.syncedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedCapture.approvedAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>Approved: {new Date(selectedCapture.approvedAt).toLocaleString()}</span>
                        <span>by {selectedCapture.approvedBy}</span>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              {selectedCapture.approvalStatus === 'pending' && (
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) handleReject(selectedCapture.id, reason);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedCapture.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}