/**
 * Home Drop Capture 4-Step Workflow
 * 
 * Step 1: Assignment Selection
 * Step 2: GPS Location Validation
 * Step 3: Photo Capture (4 required types)
 * Step 4: Review & Submit
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  MapPin, 
  Camera, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Zap,
  Router,
  Battery,
  User,
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { 
  HomeDropCapture, 
  HomeDropAssignment, 
  HomeDropPhoto 
} from '@/types/home-drop.types';

interface HomeDropWorkflowProps {
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
    icon: User
  },
  {
    id: 2,
    title: 'GPS Location',
    description: 'Validate location accuracy',
    icon: MapPin
  },
  {
    id: 3,
    title: 'Photo Capture',
    description: 'Capture 4 required photos',
    icon: Camera
  },
  {
    id: 4,
    title: 'Review & Submit',
    description: 'Final review and submission',
    icon: CheckCircle
  }
];

// Required photo types for home drop
const REQUIRED_PHOTOS = [
  {
    type: 'powerMeter',
    title: 'Power Meter',
    description: 'Reading and device status',
    icon: Zap,
    instructions: 'Capture clear image of power meter reading and overall device condition'
  },
  {
    type: 'fibertimeSetup',
    title: 'Fibertime Setup',
    description: 'Equipment configuration',
    icon: Router,
    instructions: 'Show complete fibertime equipment setup with all connections visible'
  },
  {
    type: 'deviceActions',
    title: 'Device Actions',
    description: 'Installation steps',
    icon: Clock,
    instructions: 'Document key installation or configuration steps being performed'
  },
  {
    type: 'routerLights',
    title: 'Router Lights',
    description: 'Status indicators',
    icon: Battery,
    instructions: 'Clear view of router status lights showing connectivity and power'
  }
];

export function HomeDropWorkflow({ 
  onComplete, 
  onCancel, 
  assignments = [], 
  isSubmitting = false 
}: HomeDropWorkflowProps) {
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

  // GPS location handler
  const handleGetLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      setGpsLocation(position.coords);
      setGpsAccuracy(position.coords.accuracy);
    } catch (error) {
      console.error('GPS error:', error);
      alert('Failed to get GPS location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Photo capture handler
  const handlePhotoCapture = useCallback(async (photoType: string, file: File) => {
    setIsLoading(true);
    
    try {
      // Create photo object
      const photoData: HomeDropPhoto = {
        id: `${photoType}_${Date.now()}`,
        type: photoType as any,
        filename: file.name,
        size: file.size,
        capturedAt: new Date(),
        file: file, // Store file for later upload
        quality: {
          score: 85, // Placeholder - would be calculated based on image analysis
          width: 1920,
          height: 1080
        }
      };

      setPhotos(prev => ({
        ...prev,
        [photoType]: photoData
      }));
    } catch (error) {
      console.error('Photo capture error:', error);
      alert('Failed to process photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Step navigation
  const handleNext = () => {
    if (currentStep < WORKFLOW_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedAssignment || !gpsLocation) {
      alert('Missing required data');
      return;
    }

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

    await onComplete(captureData);
  };

  // Validation helpers
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!selectedAssignment;
      case 2:
        return !!gpsLocation && (gpsAccuracy || 0) <= 20; // 20m accuracy requirement
      case 3:
        return Object.keys(photos).length === REQUIRED_PHOTOS.length;
      case 4:
        return !!customerInfo.serviceAddress;
      default:
        return true;
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

        {/* Steps indicator */}
        <div className="flex justify-between mt-4">
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const canProceed = canProceedFromStep(step.id);
            
            return (
              <div 
                key={step.id} 
                className={`flex flex-col items-center space-y-2 ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                <div className={`p-2 rounded-full border-2 ${
                  isActive 
                    ? 'border-blue-600 bg-blue-50' 
                    : isCompleted 
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-300 bg-gray-50'
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="text-center">
                  <div className="font-medium text-xs">{step.title}</div>
                  <div className="text-xs text-gray-500 max-w-20 leading-tight">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(WORKFLOW_STEPS[currentStep - 1].icon, { className: "h-5 w-5" })}
            {WORKFLOW_STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {WORKFLOW_STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Step 1: Assignment Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="assignment">Select Assignment</Label>
                <Select onValueChange={(value) => {
                  const assignment = assignments.find(a => a.id === value);
                  setSelectedAssignment(assignment || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an assignment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        <div>
                          <div className="font-medium">{assignment.serviceArea}</div>
                          <div className="text-sm text-gray-500">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAssignment && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2">Assignment Details</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Service Area:</strong> {selectedAssignment.serviceArea}</div>
                    <div><strong>Priority:</strong> 
                      <Badge variant={selectedAssignment.priority === 'high' ? 'destructive' : 'secondary'} className="ml-2">
                        {selectedAssignment.priority}
                      </Badge>
                    </div>
                    <div><strong>Estimated Duration:</strong> {selectedAssignment.estimatedDuration}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: GPS Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <Button 
                  onClick={handleGetLocation} 
                  disabled={isLoading}
                  size="lg"
                  className="mb-4"
                >
                  <Navigation className="h-5 w-5 mr-2" />
                  {isLoading ? 'Getting Location...' : 'Get GPS Location'}
                </Button>
              </div>

              {gpsLocation && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">Location Captured</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Latitude:</strong> {gpsLocation.latitude.toFixed(6)}</div>
                    <div><strong>Longitude:</strong> {gpsLocation.longitude.toFixed(6)}</div>
                    <div><strong>Accuracy:</strong> ±{gpsAccuracy?.toFixed(1)}m
                      {gpsAccuracy && gpsAccuracy <= 20 ? (
                        <Badge variant="secondary" className="ml-2">Good</Badge>
                      ) : (
                        <Badge variant="destructive" className="ml-2">Poor</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {gpsAccuracy && gpsAccuracy > 20 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      GPS accuracy is poor (>{gpsAccuracy.toFixed(1)}m). Please move to an open area and try again.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Photo Capture */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_PHOTOS.map((photoConfig) => {
                  const Icon = photoConfig.icon;
                  const capturedPhoto = photos[photoConfig.type];
                  
                  return (
                    <div key={photoConfig.type} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4" />
                        <h3 className="font-medium">{photoConfig.title}</h3>
                        {capturedPhoto && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {photoConfig.description}
                      </p>
                      
                      <p className="text-xs text-gray-500 mb-3">
                        {photoConfig.instructions}
                      </p>
                      
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoCapture(photoConfig.type, file);
                            }
                          }}
                          className="hidden"
                          id={`photo-${photoConfig.type}`}
                        />
                        
                        <Label 
                          htmlFor={`photo-${photoConfig.type}`} 
                          className="cursor-pointer"
                        >
                          <div className={`p-3 border-2 border-dashed rounded-lg text-center ${
                            capturedPhoto 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}>
                            {capturedPhoto ? (
                              <div className="text-green-600">
                                <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                                <div className="text-sm font-medium">Photo Captured</div>
                                <div className="text-xs">{capturedPhoto.filename}</div>
                              </div>
                            ) : (
                              <div>
                                <Camera className="h-6 w-6 mx-auto mb-1" />
                                <div className="text-sm">Tap to capture</div>
                              </div>
                            )}
                          </div>
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm">
                  <strong>Progress:</strong> {Object.keys(photos).length} of {REQUIRED_PHOTOS.length} photos captured
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="font-medium mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="serviceAddress">Service Address *</Label>
                    <Input
                      id="serviceAddress"
                      value={customerInfo.serviceAddress}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, serviceAddress: e.target.value }))}
                      placeholder="Enter complete service address"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any additional notes or observations..."
                  rows={3}
                />
              </div>

              {/* Review Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">Capture Summary</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Assignment:</strong> {selectedAssignment?.serviceArea}</div>
                  <div><strong>GPS Accuracy:</strong> ±{gpsAccuracy?.toFixed(1)}m</div>
                  <div><strong>Photos:</strong> {Object.keys(photos).length}/4 captured</div>
                  <div><strong>Service Address:</strong> {customerInfo.serviceAddress || 'Not provided'}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep === WORKFLOW_STEPS.length ? (
          <Button
            onClick={handleSubmit}
            disabled={!canProceedFromStep(currentStep) || isSubmitting}
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit Capture
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceedFromStep(currentStep)}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}