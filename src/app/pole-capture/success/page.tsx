'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Home, Plus, List, RefreshCw } from 'lucide-react';
import { poleCaptureService } from '@/services/pole-capture.service';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function PoleSuccessPageWrapper() {
  return (
    <AuthGuard>
      <PoleSuccessPage />
    </AuthGuard>
  );
}

function PoleSuccessPage() {
  const router = useRouter();
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    const stats = await poleCaptureService.getStatistics();
    setStatistics(stats);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Pole Captured Successfully!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Your pole data has been saved and will be synced when online.
          </p>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {statistics.total}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Captures
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {statistics.pendingSync}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pending Sync
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/pole-capture')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Capture Another Pole
            </button>
            
            <button
              onClick={() => router.push('/pole-capture/list')}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
            >
              <List className="w-5 h-5" />
              View All Captures
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}