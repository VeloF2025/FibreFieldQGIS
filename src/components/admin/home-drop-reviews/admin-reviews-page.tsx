'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import type { HomeDropCapture } from '@/types/home-drop.types';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { CaptureListComponent } from './capture-list.component';
import { ReviewDetailsModal } from './review-details.modal';
import { BulkActionsComponent } from './bulk-actions.component';

/**
 * Admin Reviews Page - Main Container Component
 * 
 * Coordinates the home drop review workflow with specialized components.
 * Handles state management and data fetching for the review process.
 * 
 * Line count target: <200 lines
 */

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

export default function AdminReviewsPage() {
  // State management
  const [captures, setCaptures] = useState<HomeDropCapture[]>([]);
  const [filteredCaptures, setFilteredCaptures] = useState<HomeDropCapture[]>([]);
  const [selectedCaptures, setSelectedCaptures] = useState<Set<string>>(new Set());
  const [selectedCapture, setSelectedCapture] = useState<HomeDropCapture | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    inReview: 0
  });
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'week',
    technician: 'all',
    searchTerm: ''
  });

  // Data fetching
  useEffect(() => {
    loadCaptures();
    const interval = setInterval(loadCaptures, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter captures when filters change
  useEffect(() => {
    applyFilters();
  }, [captures, filters]);

  const loadCaptures = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [allCaptures, statistics] = await Promise.all([
        homeDropCaptureService.getAllHomeDropCaptures(),
        homeDropCaptureService.getStatistics()
      ]);

      setCaptures(allCaptures);
      
      // Calculate review stats
      const reviewStats = calculateReviewStats(allCaptures);
      setStats(reviewStats);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load captures');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateReviewStats = (allCaptures: HomeDropCapture[]): ReviewStats => {
    const stats = {
      total: allCaptures.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      inReview: 0
    };

    allCaptures.forEach(capture => {
      switch (capture.approvalStatus) {
        case 'pending':
          stats.pending++;
          break;
        case 'approved':
          stats.approved++;
          break;
        case 'rejected':
          stats.rejected++;
          break;
        case 'requires_changes':
          stats.inReview++;
          break;
      }
    });

    return stats;
  };

  const applyFilters = () => {
    let filtered = [...captures];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(capture => {
        if (filters.status === 'pending') return capture.approvalStatus === 'pending';
        if (filters.status === 'approved') return capture.approvalStatus === 'approved';
        if (filters.status === 'rejected') return capture.approvalStatus === 'rejected';
        return true;
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(capture => 
        new Date(capture.createdAt) >= cutoff
      );
    }

    // Search term filter
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(capture =>
        capture.poleNumber.toLowerCase().includes(search) ||
        capture.customer?.name?.toLowerCase().includes(search) ||
        capture.customer?.address?.toLowerCase().includes(search) ||
        capture.capturedBy?.toLowerCase().includes(search)
      );
    }

    setFilteredCaptures(filtered);
  };

  const handleCaptureSelect = (captureId: string, selected: boolean) => {
    const newSelected = new Set(selectedCaptures);
    if (selected) {
      newSelected.add(captureId);
    } else {
      newSelected.delete(captureId);
    }
    setSelectedCaptures(newSelected);
  };

  const handleCaptureView = (capture: HomeDropCapture) => {
    setSelectedCapture(capture);
    setIsModalOpen(true);
  };

  const handleApprovalAction = async (action: 'approve' | 'reject', captureIds: string[], reason?: string) => {
    try {
      for (const id of captureIds) {
        if (action === 'approve') {
          await homeDropCaptureService.approveHomeDropCapture(id, 'admin', 'Bulk approval');
        } else {
          await homeDropCaptureService.rejectHomeDropCapture(id, 'admin', reason || 'Bulk rejection');
        }
      }
      
      // Refresh data and clear selections
      await loadCaptures();
      setSelectedCaptures(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  if (isLoading && captures.length === 0) {
    return (
      <AuthGuard requiredRole="admin">
        <AppLayout>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading captures...
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Home Drop Reviews</h1>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Review</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-blue-600">{stats.inReview}</div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          <BulkActionsComponent
            selectedCount={selectedCaptures.size}
            onApprove={(reason) => handleApprovalAction('approve', Array.from(selectedCaptures), reason)}
            onReject={(reason) => handleApprovalAction('reject', Array.from(selectedCaptures), reason)}
            onClearSelection={() => setSelectedCaptures(new Set())}
          />

          {/* Capture List */}
          <CaptureListComponent
            captures={filteredCaptures}
            selectedCaptures={selectedCaptures}
            filters={filters}
            onFilterChange={setFilters}
            onCaptureSelect={handleCaptureSelect}
            onCaptureView={handleCaptureView}
            isLoading={isLoading}
          />

          {/* Review Details Modal */}
          <ReviewDetailsModal
            capture={selectedCapture}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onApprove={(id, reason) => handleApprovalAction('approve', [id], reason)}
            onReject={(id, reason) => handleApprovalAction('reject', [id], reason)}
          />
        </div>
      </AppLayout>
    </AuthGuard>
  );
}