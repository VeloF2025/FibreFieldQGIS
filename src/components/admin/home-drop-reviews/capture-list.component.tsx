'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  MapPin,
  Camera,
  User,
  Calendar,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { HomeDropCapture } from '@/types/home-drop.types';

/**
 * Capture List Component
 * 
 * Displays filtered list of home drop captures with sorting and selection.
 * Handles filtering, searching, and individual capture actions.
 * 
 * Line count target: <200 lines
 */

interface FilterOptions {
  status: string;
  dateRange: string;
  technician: string;
  searchTerm: string;
}

interface Props {
  captures: HomeDropCapture[];
  selectedCaptures: Set<string>;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onCaptureSelect: (captureId: string, selected: boolean) => void;
  onCaptureView: (capture: HomeDropCapture) => void;
  isLoading: boolean;
}

export function CaptureListComponent({
  captures,
  selectedCaptures,
  filters,
  onFilterChange,
  onCaptureSelect,
  onCaptureView,
  isLoading
}: Props) {
  
  const handleSelectAll = (checked: boolean) => {
    captures.forEach(capture => {
      onCaptureSelect(capture.id, checked);
    });
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSyncStatusIcon = (syncStatus: string | undefined) => {
    switch (syncStatus) {
      case 'synced':
        return <Wifi className="h-4 w-4 text-green-600" title="Synced" />;
      case 'pending':
      case 'syncing':
        return <Wifi className="h-4 w-4 text-yellow-600" title="Syncing" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-600" title="Sync Error" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" title="Not Synced" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allSelected = captures.length > 0 && captures.every(capture => selectedCaptures.has(capture.id));
  const someSelected = captures.some(capture => selectedCaptures.has(capture.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Home Drop Captures ({captures.length})
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by pole, customer, or technician..."
              value={filters.searchTerm}
              onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={filters.status} onValueChange={(value) => onFilterChange({ ...filters, status: value })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select value={filters.dateRange} onValueChange={(value) => onFilterChange({ ...filters, dateRange: value })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Bulk Selection Header */}
        {captures.length > 0 && (
          <div className="flex items-center gap-3 pb-4 border-b">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              {selectedCaptures.size > 0 
                ? `${selectedCaptures.size} of ${captures.length} selected`
                : 'Select all'
              }
            </span>
          </div>
        )}

        {/* Capture List */}
        <div className="space-y-3 mt-4">
          {captures.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-gray-500">
              No captures found matching the current filters.
            </div>
          ) : (
            captures.map((capture) => (
              <div
                key={capture.id}
                className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                  selectedCaptures.has(capture.id) ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Selection Checkbox */}
                  <Checkbox
                    checked={selectedCaptures.has(capture.id)}
                    onCheckedChange={(checked) => onCaptureSelect(capture.id, checked as boolean)}
                    className="mt-1"
                  />

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        {/* Pole and Customer Info */}
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">Pole {capture.poleNumber}</h3>
                          {getStatusBadge(capture.approvalStatus)}
                          {getSyncStatusIcon(capture.syncStatus)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {capture.customer?.name || 'Unknown Customer'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {capture.customer?.address || 'No address'}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(capture.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {capture.capturedBy || 'Unknown Technician'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Camera className="h-4 w-4" />
                            {capture.photos?.length || 0} photos
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCaptureView(capture)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}