/**
 * Home Drop Workflow Container - Main orchestrator and state management
 * 
 * Manages the 4-step workflow:
 * Step 1: Assignment Selection
 * Step 2: GPS Location Validation  
 * Step 3: Photo Capture (4 required types)
 * Step 4: Review & Submit
 */

'use client';

import React, { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { log } from '@/lib/logger';
import type { 
  HomeDropCapture, 
  HomeDropAssignment, 
  HomeDropPhoto 
} from '@/types/home-drop.types';
import { AssignmentStepComponent } from './assignment-step-component';
import { GPSStepComponent } from './gps-step-component';
import { PhotoStepComponent } from './photo-step-component';
import { ReviewStepComponent } from './review-step-component';

interface HomeDropWorkflowContainerProps {
  onComplete: (capture: Partial<HomeDropCapture>) => Promise<void>;
  onCancel: () => void;
  assignments?: HomeDropAssignment[];
  isSubmitting?: boolean;
}

// Step definitions
const WORKFLOW_STEPS = [
  {
    id: 1,
    title: 'Assignment',
    description: 'Select assignment and validate details',
    component: 'assignment'
  },
  {
    id: 2,
    title: 'GPS Location',
    description: 'Validate location accuracy',
    component: 'gps'
  },
  {
    id: 3,
    title: 'Photo Capture',
    description: 'Capture 4 required photos',
    component: 'photo'
  },
  {
    id: 4,
    title: 'Review & Submit',
    description: 'Final review and submission',
    component: 'review'
  }
] as const;

export function HomeDropWorkflowContainer({ 
  onComplete, 
  onCancel, 
  assignments = [], 
  isSubmitting = false 
}: HomeDropWorkflowContainerProps) {
  // Workflow state
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Capture data
  const [selectedAssignment, setSelectedAssignment] = useState<HomeDropAssignment | null>(null);
  const [gpsLocation, setGpsLocation] = useState<GeolocationCoordinates | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Record<string, HomeDropPhoto>>({});
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    serviceAddress: ''
  });
  const [notes, setNotes] = useState('');

  // Get current step progress
  const progress = (currentStep / WORKFLOW_STEPS.length) * 100;

  // Step navigation handlers
  const handleNext = useCallback(() => {
    if (currentStep < WORKFLOW_STEPS.length) {
      setCurrentStep(prev => prev + 1);
      log.info('Advanced to next step', { step: currentStep + 1 }, 'HomeDropWorkflowContainer');
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      log.info('Moved to previous step', { step: currentStep - 1 }, 'HomeDropWorkflowContainer');
    }
  }, [currentStep]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!selectedAssignment || !gpsLocation) {
      log.warn('Missing required data for submission', {
        hasAssignment: !!selectedAssignment,
        hasGPS: !!gpsLocation
      }, 'HomeDropWorkflowContainer');
      return;
    }

    try {
      const captureData: Partial<HomeDropCapture> = {
        assignmentId: selectedAssignment.id,
        projectId: selectedAssignment.projectId,
        contractorId: selectedAssignment.assignedTo,
        serviceAddress: customerInfo.serviceAddress || selectedAssignment.serviceArea,
        gpsLocation: {
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          accuracy: gpsAccuracy || 0,
          timestamp: new Date()
        },
        photos,
        customerInfo,
        notes,
        status: 'captured',
        approvalStatus: 'pending'
      };

      log.info('Submitting home drop capture', { 
        assignmentId: selectedAssignment.id,
        photoCount: Object.keys(photos).length
      }, 'HomeDropWorkflowContainer');

      await onComplete(captureData);
    } catch (error: unknown) {
      log.error('Failed to submit home drop capture', {}, 'HomeDropWorkflowContainer', error);
      throw error;
    }
  }, [selectedAssignment, gpsLocation, gpsAccuracy, photos, customerInfo, notes, onComplete]);

  // Validation helpers
  const canProceedFromStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return !!selectedAssignment;
      case 2:
        return !!gpsLocation && (gpsAccuracy || 0) <= 20; // 20m accuracy requirement
      case 3:
        return Object.keys(photos).length === 4; // 4 required photos
      case 4:
        return !!customerInfo.serviceAddress;
      default:
        return true;
    }
  }, [selectedAssignment, gpsLocation, gpsAccuracy, photos, customerInfo.serviceAddress]);

  // Render current step component
  const renderStepComponent = () => {
    const currentStepConfig = WORKFLOW_STEPS[currentStep - 1];
    
    switch (currentStepConfig.component) {
      case 'assignment':
        return (
          <AssignmentStepComponent
            assignments={assignments}
            selectedAssignment={selectedAssignment}
            onAssignmentSelect={setSelectedAssignment}
            onNext={handleNext}
            canProceed={canProceedFromStep(1)}
          />
        );
        
      case 'gps':
        return (
          <GPSStepComponent
            gpsLocation={gpsLocation}
            gpsAccuracy={gpsAccuracy}
            onLocationUpdate={(location, accuracy) => {
              setGpsLocation(location);
              setGpsAccuracy(accuracy);
            }}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canProceed={canProceedFromStep(2)}
            isLoading={isLoading}
            onLoadingChange={setIsLoading}
          />
        );
        
      case 'photo':
        return (
          <PhotoStepComponent
            photos={photos}
            onPhotoCapture={(photoType, photo) => {
              setPhotos(prev => ({ ...prev, [photoType]: photo }));
            }}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canProceed={canProceedFromStep(3)}
            isLoading={isLoading}
            onLoadingChange={setIsLoading}
          />
        );
        
      case 'review':
        return (
          <ReviewStepComponent
            selectedAssignment={selectedAssignment}
            gpsAccuracy={gpsAccuracy}
            photos={photos}
            customerInfo={customerInfo}
            notes={notes}
            onCustomerInfoChange={setCustomerInfo}
            onNotesChange={setNotes}
            onSubmit={handleSubmit}
            onPrevious={handlePrevious}
            canSubmit={canProceedFromStep(4)}
            isSubmitting={isSubmitting}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Home Drop Capture</h1>
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Step {currentStep} of {WORKFLOW_STEPS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {WORKFLOW_STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {WORKFLOW_STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {renderStepComponent()}
        </CardContent>
      </Card>
    </div>
  );
}