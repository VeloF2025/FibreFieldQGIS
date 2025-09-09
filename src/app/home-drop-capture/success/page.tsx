'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Home, MapPin, Camera, Clock, ArrowRight } from 'lucide-react';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { cn } from '@/lib/utils';
import type { HomeDropCapture } from '@/types/home-drop.types';

export default function HomeDropSuccessPageWrapper() {
  return (
    <AuthGuard>
      <HomeDropSuccessPage />
    </AuthGuard>
  );
}

function HomeDropSuccessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [latestCapture, setLatestCapture] = useState<HomeDropCapture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLatestCapture = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // Get all captures for user and find the most recent completed one
        const captures = await homeDropCaptureService.getAllHomeDropCaptures();
        const userCaptures = captures
          .filter(capture => 
            capture.capturedBy === user.uid && 
            ['captured', 'pending_approval', 'approved'].includes(capture.status)
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        if (userCaptures.length > 0) {
          setLatestCapture(userCaptures[0]);
        }
      } catch (error) {
        console.error('Error loading latest capture:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLatestCapture();
  }, [user]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'pending_approval':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'approved':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'captured':
        return 'Capture Complete';
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      default:
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Home className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Home Drop Capture Complete
            </h1>
          </div>
        </div>
      </div>

      {/* Success Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Installation Capture Submitted!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Your home drop installation has been successfully captured and submitted for approval.
          </p>
          {latestCapture && (
            <div className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
              getStatusColor(latestCapture.status)
            )}>
              {latestCapture.status === 'pending_approval' && <Clock className="w-4 h-4" />}
              {latestCapture.status === 'approved' && <CheckCircle className="w-4 h-4" />}
              {getStatusLabel(latestCapture.status)}
            </div>
          )}
        </div>

        {/* Capture Details */}
        {latestCapture && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Capture Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pole Number</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {latestCapture.poleNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {latestCapture.customer.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {latestCapture.customer.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed At</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(latestCapture.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Photos Captured</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {latestCapture.photos.length} installation photos
                    </p>
                  </div>
                </div>

                {latestCapture.gpsLocation && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">GPS Location</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {latestCapture.gpsLocation.latitude.toFixed(6)}, {latestCapture.gpsLocation.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Accuracy: ±{latestCapture.gpsLocation.accuracy}m
                      </p>
                    </div>
                  </div>
                )}

                {latestCapture.distanceFromPole && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Distance from Pole</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {latestCapture.distanceFromPole.toFixed(0)} meters
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Captured Photos Preview */}
            {latestCapture.photos.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Installation Photos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {latestCapture.photos.map((photo, index) => (
                    <div key={photo.id || index} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={photo.data}
                        alt={photo.type}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            What happens next?
          </h3>
          <div className="space-y-3 text-blue-700 dark:text-blue-300">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <p>Your installation capture is automatically queued for sync when connectivity is available.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <p>An administrator will review your submission and approve or request changes.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <p>You&apos;ll be notified once the installation has been approved and marked complete.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/home-drop-capture')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Start New Capture
          </button>
          
          <button
            onClick={() => router.push('/home-drop-assignments')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            View Assignments
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Need help or have questions about your submission?{' '}
            <button 
              onClick={() => alert('Contact support feature coming soon!')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}