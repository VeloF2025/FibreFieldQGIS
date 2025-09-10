/**
 * Admin Home Drop Review Dashboard
 * 
 * Main interface for supervisors/admins to review and approve home drop captures.
 * Features:
 * - Overview dashboard with statistics
 * - Filterable list of captures requiring review
 * - Bulk operations for efficient approval workflow
 * - Geographic context with interactive map
 * - Quality metrics and performance tracking
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Camera, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Settings,
  Users,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { InteractiveMap } from '@/components/mapping/interactive-map';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import type { 
  HomeDropCapture, 
  HomeDropStatistics,
  HomeDropStatus,
  HomeDropFilterOptions 
} from '@/types/home-drop.types';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';

/**
 * Review Dashboard Statistics Component
 */
function ReviewDashboardStats({ statistics }: { statistics: HomeDropStatistics }) {
  const pendingReview = statistics.total - statistics.approved - statistics.rejected;
  const completionRate = statistics.total > 0 ? (statistics.approved / statistics.total) * 100 : 0;
  const rejectionRate = statistics.total > 0 ? (statistics.rejected / statistics.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingReview}</div>
          <p className="text-xs text-muted-foreground">
            {statistics.todayCount} new today
          </p>
          <div className="mt-2">
            <Progress 
              value={(pendingReview / statistics.total) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.approved}</div>
          <p className="text-xs text-muted-foreground">
            {completionRate.toFixed(1)}% completion rate
          </p>
          <div className="mt-2">
            <Progress 
              value={completionRate} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.rejected}</div>
          <p className="text-xs text-muted-foreground">
            {rejectionRate.toFixed(1)}% rejection rate
          </p>
          <div className="mt-2">
            <Progress 
              value={rejectionRate} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Captures</CardTitle>
          <BarChart3 className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total}</div>
          <p className="text-xs text-muted-foreground">
            {statistics.weekCount} this week
          </p>
          <div className="mt-2 text-xs">
            <span className="text-green-600">↑ {statistics.monthCount}</span> this month
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Capture Review Card Component
 */
function CaptureReviewCard({ 
  capture, 
  onSelect, 
  isSelected,
  onViewDetails 
}: { 
  capture: HomeDropCapture;
  onSelect: (captureId: string, selected: boolean) => void;
  isSelected: boolean;
  onViewDetails: (captureId: string) => void;
}) {
  const getStatusColor = (status: HomeDropStatus) => {
    switch (status) {
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'captured': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedPhotos = capture.completedPhotos.length;
  const requiredPhotos = capture.requiredPhotos.length;
  const photoProgress = (completedPhotos / requiredPhotos) * 100;

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md cursor-pointer",
      isSelected && "ring-2 ring-blue-500"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(capture.id, Boolean(checked))}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{capture.customer.name}</h3>
                <Badge className={getStatusColor(capture.status)}>
                  {capture.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{capture.customer.address}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(capture.id);
            }}
          >
            Review
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <MapPin className="w-3 h-3" />
              <span>Pole</span>
            </div>
            <span className="font-medium">{capture.poleNumber}</span>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Users className="w-3 h-3" />
              <span>Technician</span>
            </div>
            <span className="font-medium">{capture.capturedByName || 'Unknown'}</span>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Camera className="w-3 h-3" />
              <span>Photos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{completedPhotos}/{requiredPhotos}</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${photoProgress}%` }}
                />
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <Clock className="w-3 h-3" />
              <span>Captured</span>
            </div>
            <span className="font-medium">
              {capture.capturedAt 
                ? new Date(capture.capturedAt).toLocaleDateString()
                : 'In Progress'
              }
            </span>
          </div>
        </div>

        {/* Quality Indicators */}
        {capture.qualityChecks && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Quality Score</span>
              <span className={cn(
                "font-medium",
                (capture.qualityChecks.overallScore || 0) >= 80 ? "text-green-600" : 
                (capture.qualityChecks.overallScore || 0) >= 60 ? "text-orange-600" : 
                "text-red-600"
              )}>
                {capture.qualityChecks.overallScore || 0}%
              </span>
            </div>
            <Progress 
              value={capture.qualityChecks.overallScore || 0} 
              className="mt-1 h-1"
            />
          </div>
        )}

        {/* Power Reading */}
        {capture.installation.powerReadings.opticalPower && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">Optical Power</span>
            <span className="font-medium">
              {capture.installation.powerReadings.opticalPower} dBm
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Filter Controls Component
 */
function FilterControls({ 
  filters, 
  onFilterChange,
  onReset 
}: {
  filters: HomeDropFilterOptions;
  onFilterChange: (filters: Partial<HomeDropFilterOptions>) => void;
  onReset: () => void;
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select
              value={filters.status?.[0] || 'all'}
              onValueChange={(value) => 
                onFilterChange({
                  status: value === 'all' ? undefined : [value as HomeDropStatus]
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending_approval">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="captured">Captured</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Project</label>
            <Select
              value={filters.projectId?.[0] || 'all'}
              onValueChange={(value) => 
                onFilterChange({
                  projectId: value === 'all' ? undefined : [value]
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {/* TODO: Add project options dynamically */}
                <SelectItem value="project1">Project 1</SelectItem>
                <SelectItem value="project2">Project 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Select
              onValueChange={(value) => {
                const now = new Date();
                let start: Date;
                
                switch (value) {
                  case 'today':
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                  case 'week':
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                  case 'month':
                    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                  default:
                    start = new Date(0);
                }
                
                onFilterChange({
                  dateRange: value === 'all' ? undefined : { start, end: now }
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Issues</label>
            <Select
              onValueChange={(value) => {
                switch (value) {
                  case 'errors':
                    onFilterChange({ hasErrors: true });
                    break;
                  case 'needs_approval':
                    onFilterChange({ needsApproval: true });
                    break;
                  case 'missing_photos':
                    onFilterChange({ hasPhotos: false });
                    break;
                  default:
                    onFilterChange({ 
                      hasErrors: undefined, 
                      needsApproval: undefined,
                      hasPhotos: undefined 
                    });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All captures" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All captures</SelectItem>
                <SelectItem value="needs_approval">Needs Approval</SelectItem>
                <SelectItem value="errors">Has Errors</SelectItem>
                <SelectItem value="missing_photos">Missing Photos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Bulk Actions Component
 */
function BulkActions({ 
  selectedCaptures, 
  onBulkApprove, 
  onBulkReject,
  onBulkExport,
  onClearSelection 
}: {
  selectedCaptures: string[];
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkExport: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCaptures.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedCaptures.length} selected
            </span>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onClearSelection}
              >
                Clear
              </Button>
              
              <Button
                size="sm"
                variant="default"
                onClick={onBulkApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve All
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={onBulkReject}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject All
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={onBulkExport}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Admin Review Dashboard Component
 */
export default function AdminHomeDropReviewsPage() {
  const [captures, setCaptures] = useState<HomeDropCapture[]>([]);
  const [filteredCaptures, setFilteredCaptures] = useState<HomeDropCapture[]>([]);
  const [statistics, setStatistics] = useState<HomeDropStatistics | null>(null);
  const [selectedCaptures, setSelectedCaptures] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<HomeDropFilterOptions>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter captures based on search and filters
  useEffect(() => {
    let filtered = captures;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(capture => 
        capture.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        capture.customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        capture.poleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        capture.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply additional filters
    if (Object.keys(filters).length > 0) {
      homeDropCaptureService.filterHomeDropCaptures(filters)
        .then(results => {
          const filteredIds = new Set(results.map(r => r.id));
          setFilteredCaptures(filtered.filter(c => filteredIds.has(c.id)));
        });
    } else {
      setFilteredCaptures(filtered);
    }
  }, [captures, searchTerm, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load all captures
      const allCaptures = await homeDropCaptureService.getAllHomeDropCaptures();
      setCaptures(allCaptures);
      
      // Load statistics
      const stats = await homeDropCaptureService.getStatistics();
      setStatistics(stats);
      
    } catch (error) {
      log.error('Failed to load review data:', {}, "Pageoriginal", error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureSelection = (captureId: string, selected: boolean) => {
    setSelectedCaptures(prev => 
      selected 
        ? [...prev, captureId]
        : prev.filter(id => id !== captureId)
    );
  };

  const handleBulkApprove = async () => {
    try {
      for (const captureId of selectedCaptures) {
        await homeDropCaptureService.approveHomeDropCapture(
          captureId, 
          'admin-user' // TODO: Use actual admin user ID
        );
      }
      setSelectedCaptures([]);
      await loadData();
    } catch (error) {
      log.error('Failed to bulk approve:', {}, "Pageoriginal", error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleBulkReject = () => {
    // TODO: Open bulk rejection dialog with reason input
    log.info('Bulk reject:', { selectedCaptures }, "Pageoriginal");
  };

  const handleBulkExport = () => {
    // TODO: Export selected captures
    log.info('Bulk export:', { selectedCaptures }, "Pageoriginal");
  };

  const handleViewDetails = (captureId: string) => {
    window.open(`/admin/home-drop-reviews/${captureId}`, '_blank');
  };

  const handleFilterChange = (newFilters: Partial<HomeDropFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleFilterReset = () => {
    setFilters({});
    setSearchTerm('');
  };

  const capturesForMap = useMemo(() => 
    filteredCaptures.filter(c => c.gpsLocation || c.customer.location),
    [filteredCaptures]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading review dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Home Drop Reviews</h1>
          <p className="text-gray-600">Review and approve home drop installations</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && <ReviewDashboardStats statistics={statistics} />}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by customer name, address, pole number, or capture ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <FilterControls
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="space-y-4">
            {filteredCaptures.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No captures found</h3>
                    <p className="text-gray-500">
                      {searchTerm || Object.keys(filters).length > 0 
                        ? "Try adjusting your search or filter criteria"
                        : "No home drop captures are available for review"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredCaptures.map(capture => (
                  <CaptureReviewCard
                    key={capture.id}
                    capture={capture}
                    isSelected={selectedCaptures.includes(capture.id)}
                    onSelect={handleCaptureSelection}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Overview</CardTitle>
              <CardDescription>
                View all home drop captures on the map for geographic context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InteractiveMap
                homeDrops={capturesForMap}
                height="600px"
                showGPSTracker={false}
                onMarkerClick={(type, id) => {
                  if (type === 'home-drop') {
                    handleViewDetails(id);
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions */}
      <BulkActions
        selectedCaptures={selectedCaptures}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        onBulkExport={handleBulkExport}
        onClearSelection={() => setSelectedCaptures([])}
      />
    </div>
  );
}