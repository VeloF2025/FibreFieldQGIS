'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Save, MapPin, Camera, CheckCircle, AlertCircle, Users, Home } from 'lucide-react';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { type HomeDropAssignment } from '@/services/home-drop-assignment.service';
import { gpsService, type GPSPosition } from '@/services/gps.service';
import { HomeDropPhotosCapture } from '@/components/home-drop/home-drop-photos-capture';
import { AssignmentSelector } from '@/components/home-drop/assignment-selector';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { HomeDropPhoto } from '@/types/home-drop.types';

interface StepData {
  assignmentId?: string;
  assignment?: HomeDropAssignment;
  poleNumber?: string;
  customer?: {
    name: string;
    address: string;
    contactNumber?: string;
    email?: string;
  };
  notes?: string;
  gpsLocation?: GPSPosition;
  photos?: HomeDropPhoto[];
}

export default function HomeDropCapturePageWrapper() {
  return (
    <AuthGuard>
      <HomeDropCaptureFlow />
    </AuthGuard>
  );
}

function HomeDropCaptureFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [stepData, setStepData] = useState<StepData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<GPSPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distanceFromPole, setDistanceFromPole] = useState<number | null>(null);

  const TOTAL_STEPS = 4;
  const STEP_TITLES = [
    'Assignment Selection',
    'GPS Location',
    'Capture Photos',
    'Review & Save'
  ];

  // Initialize or resume capture session
  useEffect(() => {
    const initializeCapture = async () => {
      if (!user?.uid) return;

      try {
        // Check for existing in-progress captures
        const inProgressCaptures = await homeDropCaptureService.getAllHomeDropCaptures();
        const userInProgress = inProgressCaptures.filter(
          capture => capture.capturedBy === user.uid && capture.status === 'in_progress'
        );

        if (userInProgress.length > 0) {
          // Resume the most recent one
          const recent = userInProgress[0];
          setCaptureId(recent.id);
          setCurrentStep(recent.workflow.currentStep || 1);
          
          // Restore data
          setStepData({
            assignmentId: recent.assignmentId,
            assignment: recent.assignment,
            poleNumber: recent.poleNumber,
            customer: recent.customer,
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
            setDistanceFromPole(recent.distanceFromPole || null);
          }
        }
      } catch (error) {
        console.error('Error initializing capture:', error);
      }
    };

    initializeCapture();
  }, [user]);

  // Save progress on step change
  const saveProgress = async () => {
    if (!captureId) return;
    
    setIsSaving(true);
    try {
      await homeDropCaptureService.saveProgress(captureId, currentStep, {
        assignmentId: stepData.assignmentId,
        assignment: stepData.assignment,
        poleNumber: stepData.poleNumber,
        customer: stepData.customer,
        notes: stepData.notes,
        gpsLocation: gpsPosition ? {
          latitude: gpsPosition.latitude,
          longitude: gpsPosition.longitude,
          accuracy: gpsPosition.accuracy,
          altitude: gpsPosition.altitude || undefined,
          heading: gpsPosition.heading || undefined,
          speed: gpsPosition.speed || undefined,
          capturedAt: new Date()
        } : undefined,
        photos: stepData.photos || []
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle assignment selection
  const handleAssignmentSelect = async (assignment: HomeDropAssignment) => {
    try {
      // Create or update home drop capture
      if (!captureId) {
        const newCaptureId = await homeDropCaptureService.createHomeDropCapture({
          poleNumber: assignment.poleNumber,
          projectId: 'home-drop-project', // TODO: Get from assignment or config
          contractorId: user?.uid || '',
          assignmentId: assignment.id,
          assignment,
          customer: assignment.customer,
          capturedBy: user?.uid || '',
          capturedByName: user?.displayName || user?.email || 'Unknown'
        });
        setCaptureId(newCaptureId);
      } else {
        await homeDropCaptureService.updateHomeDropCapture(captureId, {
          assignmentId: assignment.id,
          assignment,
          poleNumber: assignment.poleNumber,
          customer: assignment.customer
        });
      }

      setStepData(prev => ({
        ...prev,
        assignmentId: assignment.id,
        assignment,
        poleNumber: assignment.poleNumber,
        customer: assignment.customer
      }));

      // Progress workflow
      if (captureId) {
        await homeDropCaptureService.progressWorkflow(captureId, 'assignments');
      }
    } catch (error) {
      console.error('Error selecting assignment:', error);
      alert('Failed to select assignment. Please try again.');
    }
  };

  // Handle GPS capture
  const captureGPS = async () => {
    setIsLoading(true);
    setGpsError(null);
    
    try {
      const position = await gpsService.getCurrentPosition({
        requiredAccuracy: 20, // Home drops can be slightly less accurate than poles
        maxAttempts: 5,
        enableHighAccuracy: true
      });
      
      setGpsPosition(position);
      setStepData(prev => ({ ...prev, gpsLocation: position }));
      
      // Update GPS location and calculate distance from pole
      if (captureId) {
        await homeDropCaptureService.updateGPSLocation(captureId, {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          altitude: position.altitude || undefined,
          heading: position.heading || undefined,
          speed: position.speed || undefined,
          capturedAt: new Date()
        });
        
        // Get updated capture with distance calculation
        const capture = await homeDropCaptureService.getHomeDropCapture(captureId);
        if (capture?.distanceFromPole !== undefined) {
          setDistanceFromPole(capture.distanceFromPole);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get GPS location';
      setGpsError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle photo changes
  const handlePhotosChange = (photos: HomeDropPhoto[]) => {
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
      // Submit for approval
      await homeDropCaptureService.submitForApproval(captureId);
      
      // Navigate to success page or list
      router.push('/home-drop-capture/success');
    } catch (error) {
      console.error('Error saving home drop capture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save home drop capture: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if step is complete
  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!stepData.assignment;
      case 2:
        return !!gpsPosition;
      case 3:
        return (stepData.photos?.length || 0) >= 4; // All 4 required photos
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
            <div className="flex items-center gap-2">
              <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Home Drop Capture {captureId && `(${captureId})`}
              </h1>
            </div>
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
          {/* Step 1: Assignment Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Assignment Selection
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Choose a home drop installation assignment to begin capture
                  </p>
                </div>
              </div>
              
              {stepData.assignment ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-green-900 dark:text-green-100">
                        Assignment Selected
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
                        <p><strong>Pole:</strong> {stepData.assignment.poleNumber}</p>
                        <p><strong>Customer:</strong> {stepData.assignment.customer.name}</p>
                        <p><strong>Address:</strong> {stepData.assignment.customer.address}</p>
                        {stepData.assignment.customer.contactNumber && (
                          <p><strong>Contact:</strong> {stepData.assignment.customer.contactNumber}</p>
                        )}
                        <p><strong>Priority:</strong> {stepData.assignment.priority}</p>
                      </div>
                      <button
                        onClick={() => setStepData(prev => ({ ...prev, assignment: undefined, assignmentId: undefined }))}
                        className="mt-3 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
                      >
                        Change Assignment
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <AssignmentSelector
                  technicianId={user?.uid || ''}
                  onAssignmentSelect={handleAssignmentSelect}
                />
              )}

              {stepData.assignment && (
                <div className="mt-6">
                  <Label htmlFor="notes">Installation Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    value={stepData.notes || ''}
                    onChange={(e) => setStepData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Any additional notes about this installation..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: GPS Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    GPS Location
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Capture the precise location of the customer premises
                  </p>
                </div>
              </div>

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

                  {distanceFromPole !== null && (
                    <div className={cn(
                      "p-4 rounded-lg",
                      distanceFromPole > 500
                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                        : distanceFromPole > 200
                        ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                        : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    )}>
                      <h3 className="font-medium mb-1">
                        Distance from Pole: {distanceFromPole.toFixed(0)}m
                      </h3>
                      <p className="text-sm">
                        {distanceFromPole > 500 
                          ? "⚠️ Distance exceeds maximum recommended range (500m)"
                          : distanceFromPole > 200
                          ? "⚠️ Distance is at the higher end of typical range"
                          : "✓ Distance is within normal range"
                        }
                      </p>
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
              <div className="flex items-center gap-3 mb-6">
                <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Capture Photos
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Capture all 4 required installation photos
                  </p>
                </div>
              </div>
              
              <HomeDropPhotosCapture
                photos={stepData.photos || []}
                onPhotosChange={handlePhotosChange}
              />
            </div>
          )}

          {/* Step 4: Review & Save */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Review & Save
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Review all captured information before final submission
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Assignment Information */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Assignment Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Pole Number:</dt>
                      <dd className="font-medium">{stepData.assignment?.poleNumber || 'Not selected'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Customer:</dt>
                      <dd className="font-medium">{stepData.assignment?.customer.name || 'Not selected'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Address:</dt>
                      <dd className="font-medium">{stepData.assignment?.customer.address || 'Not selected'}</dd>
                    </div>
                    {stepData.assignment?.customer.contactNumber && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Contact:</dt>
                        <dd className="font-medium">{stepData.assignment.customer.contactNumber}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-600 dark:text-gray-400">Priority:</dt>
                      <dd className="font-medium capitalize">{stepData.assignment?.priority || 'Not set'}</dd>
                    </div>
                    {stepData.notes && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Notes:</dt>
                        <dd className="font-medium">{stepData.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* GPS Location */}
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
                      {distanceFromPole !== null && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Distance from Pole:</dt>
                          <dd className="font-medium">
                            {distanceFromPole.toFixed(0)}m
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">No GPS location captured</p>
                  )}
                </div>

                {/* Photos */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Installation Photos
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {stepData.photos?.length || 0} of 4 required photos captured
                  </p>
                  {stepData.photos && stepData.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {stepData.photos.map((photo) => (
                        <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                          <img
                            src={photo.data}
                            alt={photo.type}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                            {photo.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleFinalSave}
                disabled={isLoading || !isStepComplete(1) || !isStepComplete(2) || !isStepComplete(3)}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  'Submitting for Approval...'
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Submit for Approval
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