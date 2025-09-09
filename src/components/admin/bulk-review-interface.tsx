/**
 * Bulk Review Interface
 * 
 * Efficient interface for reviewing multiple home drop captures simultaneously.
 * Features:
 * - Multi-select capture management
 * - Batch operations (approve, reject, export)
 * - Quality-based filtering and sorting
 * - Bulk annotation and feedback
 * - Progress tracking and status updates
 * - Export capabilities for client delivery
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  MapPin,
  Camera,
  Star,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Package,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import type { 
  HomeDropCapture, 
  HomeDropStatus,
  HomeDropFilterOptions 
} from '@/types/home-drop.types';
import { cn } from '@/lib/utils';

/**
 * Bulk Operation Types
 */
type BulkOperationType = 'approve' | 'reject' | 'export' | 'assign-reviewer' | 'update-priority';

interface BulkOperationConfig {
  type: BulkOperationType;
  captures: string[];
  data?: any;
}

/**
 * Sort and Filter Options
 */
type SortField = 'capturedAt' | 'customerName' | 'qualityScore' | 'status' | 'technician';
type SortOrder = 'asc' | 'desc';

interface SortOptions {
  field: SortField;
  order: SortOrder;
}

/**
 * Capture Summary Card for Bulk View
 */
function CaptureSummaryCard({
  capture,
  isSelected,
  onSelect,
  onViewDetails,
  showPhotos = true
}: {
  capture: HomeDropCapture;
  isSelected: boolean;
  onSelect: (captureId: string, selected: boolean) => void;
  onViewDetails: (captureId: string) => void;
  showPhotos?: boolean;
}) {
  const qualityScore = capture.qualityChecks?.overallScore || 0;
  const photoCount = capture.photos?.length || 0;
  const requiredPhotoCount = capture.requiredPhotos?.length || 4;
  
  const getStatusColor = (status: HomeDropStatus) => {
    switch (status) {
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'captured': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md cursor-pointer",
      isSelected && "ring-2 ring-blue-500 bg-blue-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(capture.id, Boolean(checked))}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{capture.customer.name}</h3>
                <Badge className={cn("text-xs", getStatusColor(capture.status))}>
                  {capture.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 truncate">{capture.customer.address}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Pole {capture.poleNumber}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {capture.capturedAt 
                      ? new Date(capture.capturedAt).toLocaleDateString()
                      : 'In progress'
                    }
                  </span>
                </div>
                {capture.capturedByName && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{capture.capturedByName}</span>
                  </div>
                )}
              </div>
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
            <Eye className="w-4 h-4 mr-1" />
            Review
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 mb-3">
          {/* Quality Score */}
          <div className="text-center">
            <div className={cn("text-lg font-bold", getQualityColor(qualityScore))}>
              {qualityScore}%
            </div>
            <div className="text-xs text-gray-500">Quality</div>
          </div>
          
          {/* Photos */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Camera className="w-3 h-3" />
              <span className="text-sm font-medium">{photoCount}/{requiredPhotoCount}</span>
            </div>
            <div className="text-xs text-gray-500">Photos</div>
          </div>
          
          {/* Power Reading */}
          <div className="text-center">
            <div className="text-sm font-medium">
              {capture.installation?.powerReadings?.opticalPower
                ? `${capture.installation.powerReadings.opticalPower} dBm`
                : 'N/A'
              }
            </div>
            <div className="text-xs text-gray-500">Power</div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Photo Completion</span>
            <span className="font-medium">{Math.round((photoCount / requiredPhotoCount) * 100)}%</span>
          </div>
          <Progress value={(photoCount / requiredPhotoCount) * 100} className="h-1" />
          
          {qualityScore > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Quality Score</span>
                <span className={cn("font-medium", getQualityColor(qualityScore))}>
                  {qualityScore}%
                </span>
              </div>
              <Progress value={qualityScore} className="h-1" />
            </>
          )}
        </div>

        {/* Issue Indicators */}
        {capture.qualityChecks?.overallScore && capture.qualityChecks.overallScore < 70 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-700">Quality issues detected</span>
          </div>
        )}

        {photoCount < requiredPhotoCount && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
            <Camera className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-700">Missing required photos</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Bulk Action Toolbar
 */
function BulkActionToolbar({
  selectedCaptureIds,
  onBulkOperation,
  onClearSelection
}: {
  selectedCaptureIds: string[];
  onBulkOperation: (operation: BulkOperationConfig) => void;
  onClearSelection: () => void;
}) {
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);

  if (selectedCaptureIds.length === 0) {
    return null;
  }

  const handleBulkApprove = () => {
    onBulkOperation({
      type: 'approve',
      captures: selectedCaptureIds
    });
  };

  const handleBulkReject = () => {
    if (!bulkRejectReason.trim()) return;
    
    onBulkOperation({
      type: 'reject',
      captures: selectedCaptureIds,
      data: { reason: bulkRejectReason }
    });
    
    setBulkRejectReason('');
    setShowBulkRejectDialog(false);
  };

  const handleBulkExport = () => {
    onBulkOperation({
      type: 'export',
      captures: selectedCaptureIds
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-4xl w-full px-4">
      <Card className="shadow-2xl border-2 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium">
                {selectedCaptureIds.length} captures selected
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={onClearSelection}
              >
                Clear Selection
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve All
              </Button>
              
              <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject All
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Reject Captures</DialogTitle>
                    <DialogDescription>
                      Provide a reason for rejecting {selectedCaptureIds.length} captures.
                      This will send feedback to technicians.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-reject-reason">Rejection Reason</Label>
                      <Textarea
                        id="bulk-reject-reason"
                        placeholder="Explain what needs to be corrected..."
                        value={bulkRejectReason}
                        onChange={(e) => setBulkRejectReason(e.target.value)}
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowBulkRejectDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkReject}
                      disabled={!bulkRejectReason.trim()}
                    >
                      Reject {selectedCaptureIds.length} Captures
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkExport}
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
 * Advanced Filters Panel
 */
function AdvancedFiltersPanel({
  filters,
  onFiltersChange,
  onReset
}: {
  filters: HomeDropFilterOptions & { qualityScore?: [number, number] };
  onFiltersChange: (filters: Partial<HomeDropFilterOptions & { qualityScore?: [number, number] }>) => void;
  onReset: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset All
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select
                value={filters.status?.[0] || 'all'}
                onValueChange={(value) => 
                  onFiltersChange({
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

            {/* Quality Score Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Quality Score: {filters.qualityScore?.[0] || 0}% - {filters.qualityScore?.[1] || 100}%
              </Label>
              <Slider
                value={filters.qualityScore || [0, 100]}
                onValueChange={(value) => onFiltersChange({ qualityScore: value as [number, number] })}
                min={0}
                max={100}
                step={10}
                className="mt-2"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Date Range</Label>
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
                  
                  onFiltersChange({
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

            {/* Issues Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Issues</Label>
              <Select
                onValueChange={(value) => {
                  switch (value) {
                    case 'quality_issues':
                      // This would need custom filtering logic
                      break;
                    case 'missing_photos':
                      onFiltersChange({ hasPhotos: false });
                      break;
                    case 'errors':
                      onFiltersChange({ hasErrors: true });
                      break;
                    default:
                      onFiltersChange({ 
                        hasErrors: undefined, 
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
                  <SelectItem value="quality_issues">Quality Issues</SelectItem>
                  <SelectItem value="missing_photos">Missing Photos</SelectItem>
                  <SelectItem value="errors">Has Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Main Bulk Review Interface Component
 */
interface BulkReviewInterfaceProps {
  captures: HomeDropCapture[];
  onCaptureUpdate?: (captureId: string, updates: Partial<HomeDropCapture>) => void;
  onBulkOperation?: (operation: BulkOperationConfig) => Promise<void>;
  className?: string;
}

export function BulkReviewInterface({
  captures: initialCaptures,
  onCaptureUpdate,
  onBulkOperation,
  className
}: BulkReviewInterfaceProps) {
  const [captures, setCaptures] = useState(initialCaptures);
  const [selectedCaptureIds, setSelectedCaptureIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<HomeDropFilterOptions & { qualityScore?: [number, number] }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOptions, setSortOptions] = useState<SortOptions>({ field: 'capturedAt', order: 'desc' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter and sort captures
  const filteredAndSortedCaptures = useMemo(() => {
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

    // Apply quality score filter
    if (filters.qualityScore) {
      filtered = filtered.filter(capture => {
        const score = capture.qualityChecks?.overallScore || 0;
        return score >= filters.qualityScore![0] && score <= filters.qualityScore![1];
      });
    }

    // Apply other filters (would need to implement filtering service call for complex filters)
    // For now, just apply simple filters locally

    // Sort captures
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'customerName':
          aValue = a.customer.name;
          bValue = b.customer.name;
          break;
        case 'qualityScore':
          aValue = a.qualityChecks?.overallScore || 0;
          bValue = b.qualityChecks?.overallScore || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'technician':
          aValue = a.capturedByName || '';
          bValue = b.capturedByName || '';
          break;
        case 'capturedAt':
        default:
          aValue = new Date(a.capturedAt || a.createdAt);
          bValue = new Date(b.capturedAt || b.createdAt);
          break;
      }

      if (aValue < bValue) return sortOptions.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOptions.order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [captures, searchTerm, filters, sortOptions]);

  const handleCaptureSelection = (captureId: string, selected: boolean) => {
    setSelectedCaptureIds(prev => 
      selected 
        ? [...prev, captureId]
        : prev.filter(id => id !== captureId)
    );
  };

  const handleSelectAll = () => {
    if (selectedCaptureIds.length === filteredAndSortedCaptures.length) {
      setSelectedCaptureIds([]);
    } else {
      setSelectedCaptureIds(filteredAndSortedCaptures.map(c => c.id));
    }
  };

  const handleBulkOperation = async (operation: BulkOperationConfig) => {
    setIsProcessing(true);
    try {
      if (onBulkOperation) {
        await onBulkOperation(operation);
      } else {
        // Default implementation
        switch (operation.type) {
          case 'approve':
            for (const captureId of operation.captures) {
              await homeDropCaptureService.approveHomeDropCapture(
                captureId,
                'admin-user' // TODO: Use actual admin user ID
              );
            }
            break;
          case 'reject':
            for (const captureId of operation.captures) {
              await homeDropCaptureService.rejectHomeDropCapture(
                captureId,
                'admin-user', // TODO: Use actual admin user ID
                operation.data?.reason || 'Quality standards not met',
                operation.data?.reason
              );
            }
            break;
          case 'export':
            // TODO: Implement export functionality
            console.log('Exporting captures:', operation.captures);
            break;
        }
      }
      
      // Clear selection after successful operation
      setSelectedCaptureIds([]);
      
      // Refresh captures
      // TODO: Refresh captures from service
      
    } catch (error) {
      console.error('Bulk operation failed:', error);
      // TODO: Show error notification
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = (captureId: string) => {
    window.open(`/admin/home-drop-reviews/${captureId}`, '_blank');
  };

  const handleSortChange = (field: SortField) => {
    setSortOptions(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search captures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedCaptureIds.length === filteredAndSortedCaptures.length ? 'Deselect All' : 'Select All'}
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFiltersPanel
        filters={filters}
        onFiltersChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
        onReset={() => {
          setFilters({});
          setSearchTerm('');
        }}
      />

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Sort by:</span>
        {(['capturedAt', 'customerName', 'qualityScore', 'status', 'technician'] as SortField[]).map(field => (
          <Button
            key={field}
            variant={sortOptions.field === field ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange(field)}
            className="capitalize"
          >
            {field === 'capturedAt' ? 'Date' : field.replace(/([A-Z])/g, ' $1')}
            {sortOptions.field === field && (
              sortOptions.order === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
            )}
          </Button>
        ))}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredAndSortedCaptures.length} of {captures.length} captures
        </span>
        {selectedCaptureIds.length > 0 && (
          <span>{selectedCaptureIds.length} selected</span>
        )}
      </div>

      {/* Captures Grid/List */}
      {filteredAndSortedCaptures.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No captures found</h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        )}>
          {filteredAndSortedCaptures.map(capture => (
            <CaptureSummaryCard
              key={capture.id}
              capture={capture}
              isSelected={selectedCaptureIds.includes(capture.id)}
              onSelect={handleCaptureSelection}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCaptureIds={selectedCaptureIds}
        onBulkOperation={handleBulkOperation}
        onClearSelection={() => setSelectedCaptureIds([])}
      />

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <div>
                <div className="font-medium">Processing bulk operation...</div>
                <div className="text-sm text-gray-500">Please wait while we process your request</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}