/**
 * Photo Step Component - 4 required photo types capture interface
 * 
 * Features:
 * - 4 required photo types: Power Meter, Fibertime Setup, Device Actions, Router Lights
 * - Photo capture with quality validation
 * - Visual progress tracking
 * - File size and format validation
 * - Mobile-optimized camera interface
 */

'use client';

import React, { useCallback } from 'react';
import { ArrowLeft, ArrowRight, Camera, CheckCircle, Zap, Router, Clock, Battery } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { HomeDropPhoto } from '@/types/home-drop.types';
import { log } from '@/lib/logger';

interface PhotoStepComponentProps {
  photos: Record<string, HomeDropPhoto>;
  onPhotoCapture: (photoType: string, photo: HomeDropPhoto) => void;
  onNext: () => void;
  onPrevious: () => void;
  canProceed: boolean;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

// Required photo types for home drop
const REQUIRED_PHOTOS = [
  {
    type: 'powerMeter',
    title: 'Power Meter',
    description: 'Reading and device status',
    icon: Zap,
    instructions: 'Capture clear image of power meter reading and overall device condition',
    color: 'border-yellow-300 bg-yellow-50 text-yellow-800'
  },
  {
    type: 'fibertimeSetup',
    title: 'Fibertime Setup',
    description: 'Equipment configuration',
    icon: Router,
    instructions: 'Show complete fibertime equipment setup with all connections visible',
    color: 'border-blue-300 bg-blue-50 text-blue-800'
  },
  {
    type: 'deviceActions',
    title: 'Device Actions',
    description: 'Installation steps',
    icon: Clock,
    instructions: 'Document key installation or configuration steps being performed',
    color: 'border-purple-300 bg-purple-50 text-purple-800'
  },
  {
    type: 'routerLights',
    title: 'Router Lights',
    description: 'Status indicators',
    icon: Battery,
    instructions: 'Clear view of router status lights showing connectivity and power',
    color: 'border-green-300 bg-green-50 text-green-800'
  }
];

export function PhotoStepComponent({
  photos,
  onPhotoCapture,
  onNext,
  onPrevious,
  canProceed,
  isLoading,
  onLoadingChange
}: PhotoStepComponentProps) {

  const handlePhotoCapture = useCallback(async (photoType: string, file: File) => {
    onLoadingChange(true);
    
    try {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Image file is too large. Please use an image smaller than 10MB.');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file.');
      }

      // Create photo object
      const photoData: HomeDropPhoto = {
        id: `${photoType}_${Date.now()}`,
        type: photoType as any,
        data: '', // Will be populated later
        size: file.size,
        timestamp: new Date(),
        compressed: false
      };

      onPhotoCapture(photoType, photoData);
      
      log.info('Photo captured successfully', { 
        photoType, 
        filename: file.name, 
        size: file.size 
      }, 'PhotoStepComponent');

    } catch (error: unknown) {
      log.error('Photo capture failed', { photoType }, 'PhotoStepComponent', error as Error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to process photo';
      alert(`Photo capture failed: ${errorMessage}`);
    } finally {
      onLoadingChange(false);
    }
  }, [onPhotoCapture, onLoadingChange]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  const getPhotoProgress = (): { captured: number; total: number } => {
    return {
      captured: Object.keys(photos).length,
      total: REQUIRED_PHOTOS.length
    };
  };

  const progress = getPhotoProgress();
  const isCapturing = isLoading;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Camera className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-medium">Photo Capture</h3>
        </div>
        <p className="text-sm text-gray-600">
          Capture all {REQUIRED_PHOTOS.length} required photos to proceed
        </p>
        <div className="mt-2">
          <span className="text-sm font-medium">
            Progress: {progress.captured} of {progress.total} photos captured
          </span>
        </div>
      </div>

      {/* Photo Capture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REQUIRED_PHOTOS.map((photoConfig) => {
          const Icon = photoConfig.icon;
          const capturedPhoto = photos[photoConfig.type];
          const isCapturing = isLoading;
          
          return (
            <div 
              key={photoConfig.type} 
              className={`border-2 rounded-lg p-4 transition-all ${
                capturedPhoto 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Photo Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded ${photoConfig.color} ${!capturedPhoto ? 'opacity-60' : ''}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{photoConfig.title}</h3>
                  <p className="text-sm text-gray-600">{photoConfig.description}</p>
                </div>
                {capturedPhoto && (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
              </div>
              
              {/* Instructions */}
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                {photoConfig.instructions}
              </p>
              
              {/* Capture Interface */}
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
                  disabled={isCapturing}
                />
                
                <Label 
                  htmlFor={`photo-${photoConfig.type}`} 
                  className="cursor-pointer block"
                >
                  <div className={`p-4 border-2 border-dashed rounded-lg text-center transition-colors ${
                    capturedPhoto 
                      ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  } ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    
                    {capturedPhoto ? (
                      <div className="text-green-600">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                        <div className="text-sm font-medium mb-1">Photo Captured</div>
                        <div className="text-xs text-green-700 mb-1">{capturedPhoto.id}</div>
                        <div className="text-xs text-green-600">
                          {formatFileSize(capturedPhoto.size)} • 
                          {capturedPhoto.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-green-500 mt-2">
                          Tap to replace
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-sm font-medium text-gray-700">
                          {isCapturing ? 'Processing...' : 'Tap to capture'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          JPG, PNG • Max 10MB
                        </div>
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Status */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium text-blue-900">Capture Progress:</span>
            <span className="ml-2 text-blue-800">
              {progress.captured} of {progress.total} photos completed
            </span>
          </div>
          {canProceed && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">All photos captured!</span>
            </div>
          )}
        </div>
        
        {progress.captured > 0 && progress.captured < progress.total && (
          <div className="mt-2 text-xs text-blue-700">
            {progress.total - progress.captured} more photo{progress.total - progress.captured !== 1 ? 's' : ''} required
          </div>
        )}
      </div>

      {/* Photo Requirements Note */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Photo Requirements</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• All photos must be clear and well-lit</li>
          <li>• Include all relevant equipment and connections</li>
          <li>• Avoid blurry or poorly framed images</li>
          <li>• Each photo type serves specific documentation needs</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isCapturing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={onNext}
          disabled={!canProceed || isCapturing}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}