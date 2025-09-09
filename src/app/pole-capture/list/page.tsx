'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Camera, Clock, Cloud, CloudOff, AlertCircle, Search } from 'lucide-react';
import { poleCaptureService, type PoleCapture } from '@/services/pole-capture.service';
import { gpsService } from '@/services/gps.service';
import { AuthGuard } from '@/components/auth/auth-guard';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PoleCaptureListPageWrapper() {
  return (
    <AuthGuard>
      <PoleCaptureListPage />
    </AuthGuard>
  );
}

function PoleCaptureListPage() {
  const router = useRouter();
  const [captures, setCaptures] = useState<PoleCapture[]>([]);
  const [filteredCaptures, setFilteredCaptures] = useState<PoleCapture[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'in_progress' | 'captured' | 'synced'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCaptures();
    
    // Set up live query subscription
    const subscription = poleCaptureService.watchPoleCaptures().subscribe(
      (data) => {
        if (data) {
          setCaptures(data);
          filterCaptures(data, searchTerm, filterStatus);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    filterCaptures(captures, searchTerm, filterStatus);
  }, [searchTerm, filterStatus, captures]);

  const loadCaptures = async () => {
    setIsLoading(true);
    try {
      const data = await poleCaptureService.getAllPoleCaptures();
      setCaptures(data);
      setFilteredCaptures(data);
    } catch (error) {
      console.error('Error loading captures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterCaptures = (data: PoleCapture[], search: string, status: string) => {
    let filtered = [...data];

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(c => c.status === status);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.poleNumber?.toLowerCase().includes(searchLower) ||
        c.projectName?.toLowerCase().includes(searchLower) ||
        c.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    setFilteredCaptures(filtered);
  };

  const resumeCapture = (poleNumber: string) => {
    router.push(`/pole-capture?resume=${poleNumber}`);
  };

  const deleteCapture = async (poleNumber: string) => {
    if (!confirm('Are you sure you want to delete this capture?')) return;
    
    try {
      await poleCaptureService.deletePoleCapture(poleNumber);
      await loadCaptures();
    } catch (error) {
      console.error('Error deleting capture:', error);
      alert('Failed to delete capture');
    }
  };

  const getStatusBadge = (capture: PoleCapture) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: null },
      in_progress: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
      captured: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <CloudOff className="w-3 h-3" /> },
      synced: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <Cloud className="w-3 h-3" /> },
      error: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertCircle className="w-3 h-3" /> }
    };

    const config = capture.syncStatus === 'error' 
      ? statusConfig.error 
      : statusConfig[capture.status] || statusConfig.draft;

    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit', config.color)}>
        {config.icon}
        {capture.syncStatus === 'error' ? 'Sync Error' : capture.status}
      </span>
    );
  };

  const statistics = {
    total: captures.length,
    draft: captures.filter(c => c.status === 'draft').length,
    inProgress: captures.filter(c => c.status === 'in_progress').length,
    captured: captures.filter(c => c.status === 'captured').length,
    synced: captures.filter(c => c.status === 'synced').length,
    errors: captures.filter(c => c.syncStatus === 'error').length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Pole Captures
              </h1>
            </div>
            <button
              onClick={() => router.push('/pole-capture')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              New Capture
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {statistics.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {statistics.draft}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Draft</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {statistics.inProgress}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {statistics.captured}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Captured</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {statistics.synced}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Synced</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {statistics.errors}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by pole number, project, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'draft', 'in_progress', 'captured', 'synced'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={cn(
                    'px-4 py-2 rounded-lg transition-colors',
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Captures List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading captures...</p>
          </div>
        ) : filteredCaptures.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== 'all' 
                ? 'No captures found matching your filters'
                : 'No pole captures yet'}
            </p>
            <button
              onClick={() => router.push('/pole-capture')}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Capture
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCaptures.map((capture) => (
              <div
                key={capture.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => capture.status === 'in_progress' ? resumeCapture(capture.id!) : null}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {capture.poleNumber || capture.id}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {capture.projectName || 'No project assigned'}
                    </p>
                  </div>
                  {getStatusBadge(capture)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {capture.gpsLocation && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{gpsService.formatCoordinates(capture.gpsLocation as any)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Camera className="w-4 h-4" />
                    <span>{capture.photos?.length || 0} photos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{formatDateTime(capture.updatedAt || capture.createdAt)}</span>
                  </div>
                </div>

                {capture.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {capture.notes}
                  </p>
                )}

                {capture.syncError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {capture.syncError}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {capture.status === 'in_progress' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resumeCapture(capture.id!);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCapture(capture.id!);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}