'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Save, MapPin, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { poleCaptureService, type PoleCapture, type CapturedPhoto } from '@/services/pole-capture.service';
import { gpsService, type GPSPosition } from '@/services/gps.service';
import { MultiPhotosCapture } from '@/components/pole-capture/photo-capture';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface StepData {
  projectId?: string;
  poleNumber?: string;
  notes?: string;
  gpsLocation?: GPSPosition;
  photos?: CapturedPhoto[];
}

export default function PoleCapturePageWrapper() {
  return (
    <AuthGuard>
      <PoleCaptureFlow />
    </AuthGuard>
  );
}

function PoleCaptureFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [stepData, setStepData] = useState<StepData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<GPSPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [nearestPoles, setNearestPoles] = useState<PoleCapture['nearestPoles']>([]);
  
  // Mock projects for now (will be loaded from FibreFlow API later)
  const projects = [
    { id: 'proj-1', name: 'Lawley Installation' },
    { id: 'proj-2', name: 'Mohadin Phase 2' },
    { id: 'proj-3', name: 'Test Project' }
  ];

  const TOTAL_STEPS = 4;
  const STEP_TITLES = [
    'Basic Information',
    'GPS Location',
    'Capture Photos',
    'Review & Save'
  ];

  // Initialize or resume capture session
  useEffect(() => {
    const initializeCapture = async () => {
      // Check for existing in-progress captures
      const inProgress = await poleCaptureService.getInProgressCaptures();
      if (inProgress.length > 0) {
        // Resume the most recent one
        const recent = inProgress[0];
        setCaptureId(recent.id || null);
        setCurrentStep(recent.currentStep || 1);
        
        // Restore data
        setStepData({
          projectId: recent.projectId,
          poleNumber: recent.poleNumber,
          notes: recent.notes,
          gpsLocation: recent.gpsLocation ? {
            ...recent.gpsLocation,
            timestamp: Date.now()
          } : undefined,
          photos: recent.photos
        });
        
        if (recent.gpsLocation) {
          setGpsPosition({
            ...recent.gpsLocation,
            timestamp: Date.now()
          });
        }
      } else {
        // Create new capture session
        const newId = await poleCaptureService.createPoleCapture({
          capturedBy: user?.uid,
          capturedByName: user?.displayName || user?.email
        });
        setCaptureId(newId);
      }
    };

    initializeCapture();
  }, [user]);

  // Save progress on step change
  const saveProgress = async () => {
    if (!captureId) return;
    
    setIsSaving(true);
    try {
      await poleCaptureService.saveProgress(captureId, currentStep, {
        projectId: stepData.projectId,
        poleNumber: stepData.poleNumber,
        notes: stepData.notes,
        gpsLocation: gpsPosition ? {
          latitude: gpsPosition.latitude,
          longitude: gpsPosition.longitude,
          accuracy: gpsPosition.accuracy,
          altitude: gpsPosition.altitude || undefined,
          heading: gpsPosition.heading || undefined,
          speed: gpsPosition.speed || undefined
        } : undefined,
        photos: stepData.photos || []
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle GPS capture
  const captureGPS = async () => {
    setIsLoading(true);
    setGpsError(null);
    
    try {
      const position = await gpsService.getCurrentPosition({
        requiredAccuracy: 10,
        maxAttempts: 5,
        enableHighAccuracy: true
      });
      
      setGpsPosition(position);
      setStepData(prev => ({ ...prev, gpsLocation: position }));
      
      // Find nearest poles
      if (captureId) {
        await poleCaptureService.updateGPSLocation(captureId, {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          altitude: position.altitude || undefined,
          heading: position.heading || undefined,
          speed: position.speed || undefined
        });
        
        const capture = await poleCaptureService.getPoleCapture(captureId);
        if (capture?.nearestPoles) {
          setNearestPoles(capture.nearestPoles);
        }
      }
    } catch (error) {
      setGpsError(error instanceof Error ? error.message : 'Failed to get GPS location');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle photo changes
  const handlePhotosChange = (photos: CapturedPhoto[]) => {
    setStepData(prev => ({ ...prev, photos }));
  };

  // Navigate between steps
  const goToStep = async (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;
    
    // Save current progress before moving
    await saveProgress();
    setCurrentStep(step);
  };

  // Final save
  const handleFinalSave = async () => {
    if (!captureId) return;
    
    setIsLoading(true);
    try {
      // Update with all final data
      await poleCaptureService.updatePoleCapture(captureId, {
        ...stepData,
        status: 'captured',
        gpsLocation: gpsPosition ? {
          latitude: gpsPosition.latitude,
          longitude: gpsPosition.longitude,
          accuracy: gpsPosition.accuracy,
          altitude: gpsPosition.altitude || undefined,
          heading: gpsPosition.heading || undefined,
          speed: gpsPosition.speed || undefined
        } : undefined
      });
      
      // Navigate to success page or list
      router.push('/pole-capture/success');
    } catch (error) {
      console.error('Error saving pole capture:', error);
      alert('Failed to save pole capture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if step is complete
  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!stepData.projectId;
      case 2:
        return !!gpsPosition;
      case 3:
        return (stepData.photos?.length || 0) >= 3; // At least 3 required photos
      case 4:
        return true; // Review step is always accessible if reached
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Pole Capture {captureId && `(${captureId})`}
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isSaving && 'Saving...'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            {STEP_TITLES.map((title, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 cursor-pointer',
                  currentStep === index + 1
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : isStepComplete(index + 1)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-600'
                )}
                onClick={() => goToStep(index + 1)}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2',
                    currentStep === index + 1
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isStepComplete(index + 1)
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {isStepComplete(index + 1) ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="hidden sm:inline">{title}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Basic Information
              </h2>
              
              <div>
                <Label htmlFor="project">Project *</Label>
                <select
                  id="project"
                  value={stepData.projectId || ''}
                  onChange={(e) => setStepData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                >
                  <option value="">Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="poleNumber">Pole Number (Optional)</Label>
                <Input
                  id="poleNumber"
                  type="text"
                  value={stepData.poleNumber || ''}
                  onChange={(e) => setStepData(prev => ({ ...prev, poleNumber: e.target.value }))}
                  placeholder="e.g., LAW.P.B167 (leave empty to auto-generate)"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <textarea
                  id="notes"
                  value={stepData.notes || ''}
                  onChange={(e) => setStepData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Any additional notes about this pole..."
                />
              </div>
            </div>
          )}

          {/* Step 2: GPS Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                GPS Location
              </h2>

              {!gpsPosition ? (
                <div className="text-center py-8">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <button
                    onClick={captureGPS}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Getting GPS Location...' : 'Capture GPS Location'}
                  </button>
                  {gpsError && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      {gpsError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-medium text-green-900 dark:text-green-100">
                          GPS Location Captured
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          {gpsService.formatCoordinates(gpsPosition)}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Accuracy: {gpsService.formatAccuracy(gpsPosition.accuracy)}
                          {!gpsService.isAccuracyAcceptable(gpsPosition.accuracy) && (
                            <span className="text-orange-600 dark:text-orange-400 ml-2">
                              (Low accuracy - consider recapturing)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {nearestPoles.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Nearest Poles
                      </h3>
                      <ul className="space-y-1">
                        {nearestPoles.map((pole, index) => (
                          <li key={index} className="text-sm text-blue-700 dark:text-blue-300">
                            {pole.poleNumber} - {gpsService.formatDistance(pole.distance)} away
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={captureGPS}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Recapture GPS
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Photos */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Capture Photos
              </h2>
              <MultiPhotosCapture
                photos={stepData.photos || []}
                onPhotosChange={handlePhotosChange}
              />
            </div>
          )}

          {/* Step 4: Review & Save */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Review & Save
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Basic Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Project:</dt>
                      <dd className="font-medium">
                        {projects.find(p => p.id === stepData.projectId)?.name || 'Not selected'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Pole Number:</dt>
                      <dd className="font-medium">
                        {stepData.poleNumber || 'Auto-generate'}
                      </dd>
                    </div>
                    {stepData.notes && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Notes:</dt>
                        <dd className="font-medium">{stepData.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    GPS Location
                  </h3>
                  {gpsPosition ? (
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Coordinates:</dt>
                        <dd className="font-medium">
                          {gpsService.formatCoordinates(gpsPosition)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Accuracy:</dt>
                        <dd className="font-medium">
                          {gpsService.formatAccuracy(gpsPosition.accuracy)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">No GPS location captured</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Photos
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {stepData.photos?.length || 0} photos captured
                  </p>
                  {stepData.photos && stepData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {stepData.photos.map((photo) => (
                        <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                          <img
                            src={photo.data}
                            alt={photo.type}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleFinalSave}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Pole Capture
                  </>
                )}
              </button>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
            {currentStep < TOTAL_STEPS && (
              <button
                onClick={() => goToStep(currentStep + 1)}
                disabled={!isStepComplete(currentStep)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}