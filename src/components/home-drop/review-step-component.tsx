/**
 * Review Step Component - Final review and submission workflow
 * 
 * Features:
 * - Customer information form with validation
 * - Capture summary display
 * - Photo validation review
 * - GPS accuracy confirmation
 * - Final submission with loading states
 */

'use client';

import React from 'react';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, User, MapPin, Camera, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { HomeDropAssignment, HomeDropPhoto } from '@/types/home-drop.types';

interface ReviewStepComponentProps {
  selectedAssignment: HomeDropAssignment | null;
  gpsAccuracy: number | null;
  photos: Record<string, HomeDropPhoto>;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    serviceAddress: string;
  };
  notes: string;
  onCustomerInfoChange: (info: {
    name: string;
    phone: string;
    email: string;
    serviceAddress: string;
  }) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => Promise<void>;
  onPrevious: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}

export function ReviewStepComponent({
  selectedAssignment,
  gpsAccuracy,
  photos,
  customerInfo,
  notes,
  onCustomerInfoChange,
  onNotesChange,
  onSubmit,
  onPrevious,
  canSubmit,
  isSubmitting
}: ReviewStepComponentProps) {

  const handleCustomerInfoChange = (field: keyof typeof customerInfo, value: string) => {
    onCustomerInfoChange({
      ...customerInfo,
      [field]: value
    });
  };

  const getPhotoCount = (): number => {
    return Object.keys(photos).length;
  };

  const getTotalFileSize = (): string => {
    const totalBytes = Object.values(photos).reduce((sum, photo) => sum + photo.size, 0);
    if (totalBytes < 1024 * 1024) {
      return `${Math.round(totalBytes / 1024)} KB`;
    }
    return `${Math.round(totalBytes / (1024 * 1024))} MB`;
  };

  const getAccuracyStatus = (accuracy: number | null): 'excellent' | 'good' | 'poor' => {
    if (!accuracy) return 'poor';
    if (accuracy <= 5) return 'excellent';
    if (accuracy <= 20) return 'good';
    return 'poor';
  };

  const getAccuracyBadge = (status: 'excellent' | 'good' | 'poor'): JSX.Element => {
    switch (status) {
      case 'excellent':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'good':
        return <Badge variant="default">Good</Badge>;
      case 'poor':
        return <Badge variant="destructive">Poor</Badge>;
    }
  };

  const validateForm = (): boolean => {
    return canSubmit && !!customerInfo.serviceAddress.trim();
  };

  return (
    <div className="space-y-6">
      {/* Customer Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium">Customer Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={customerInfo.name}
              onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
              placeholder="Enter customer name"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="customerPhone">Phone Number</Label>
            <Input
              id="customerPhone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
              placeholder="Enter phone number"
              className="mt-1"
            />
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="customerEmail">Email Address</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerInfo.email}
              onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
              placeholder="Enter email address"
              className="mt-1"
            />
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="serviceAddress" className="flex items-center gap-1">
              Service Address
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="serviceAddress"
              value={customerInfo.serviceAddress}
              onChange={(e) => handleCustomerInfoChange('serviceAddress', e.target.value)}
              placeholder="Enter complete service address"
              className="mt-1"
              required
            />
            {!customerInfo.serviceAddress.trim() && (
              <p className="text-sm text-red-600 mt-1">Service address is required</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Notes Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <Label htmlFor="notes">Additional Notes</Label>
        </div>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Enter any additional notes, observations, or special instructions..."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Capture Summary Section */}
      <div className="p-4 bg-gray-50 rounded-lg border">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Capture Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assignment Details */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">Assignment</h4>
            {selectedAssignment ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Service Area:</span>
                  <div className="text-gray-600 ml-4">{selectedAssignment.serviceArea}</div>
                </div>
                <div>
                  <span className="font-medium">Priority:</span>
                  <Badge 
                    variant={selectedAssignment.priority === 'high' ? 'destructive' : 'secondary'} 
                    className="ml-2 text-xs"
                  >
                    {selectedAssignment.priority.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Due Date:</span>
                  <div className="text-gray-600 ml-4">
                    {new Date(selectedAssignment.dueDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No assignment selected
              </div>
            )}
          </div>

          {/* Technical Details */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">Technical Data</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">GPS Accuracy:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">±{gpsAccuracy?.toFixed(1)}m</span>
                  {gpsAccuracy && getAccuracyBadge(getAccuracyStatus(gpsAccuracy))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="font-medium">Photos:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getPhotoCount()}/4 captured</span>
                  {getPhotoCount() === 4 ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Total File Size:</span>
                <span className="font-mono text-gray-600">{getTotalFileSize()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Details */}
        {getPhotoCount() > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide mb-2">
              Captured Photos
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(photos).map(([type, photo]) => (
                <div key={type} className="bg-white rounded p-2 border">
                  <div className="font-medium capitalize mb-1">
                    {type.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-gray-500">
                    {Math.round(photo.size / 1024)} KB
                  </div>
                  <div className="text-gray-500">
                    {photo.capturedAt.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Validation Warnings */}
      {!validateForm() && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-yellow-800 mb-1">
                Please complete all required fields
              </div>
              <ul className="text-yellow-700 space-y-1">
                {!customerInfo.serviceAddress.trim() && (
                  <li>• Service address is required</li>
                )}
                {getPhotoCount() !== 4 && (
                  <li>• All 4 photos must be captured</li>
                )}
                {!selectedAssignment && (
                  <li>• Assignment must be selected</li>
                )}
                {!gpsAccuracy || gpsAccuracy > 20 && (
                  <li>• GPS accuracy must be ±20m or better</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={onSubmit}
          disabled={!validateForm() || isSubmitting}
          size="lg"
          className="min-w-32"
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
      </div>
    </div>
  );
}