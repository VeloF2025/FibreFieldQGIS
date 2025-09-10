'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, RotateCw, Image as ImageIcon, Zap, Settings, Wifi, Router } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomeDropPhoto, HomeDropPhotoType } from '@/types/home-drop.types';

interface PhotoCaptureProps {
  type: HomeDropPhotoType;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  required?: boolean;
  existingPhoto?: HomeDropPhoto;
  onPhotoCapture: (photo: HomeDropPhoto) => void;
  onPhotoRemove: () => void;
}

function PhotoCapture({
  type,
  label,
  description,
  icon,
  required = true,
  existingPhoto,
  onPhotoCapture,
  onPhotoRemove
}: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingPhoto?.data || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      const photo: HomeDropPhoto = {
        id: `${type}_${Date.now()}`,
        type,
        data,
        timestamp: new Date(),
        size: file.size,
        compressed: false
      };
      
      setPreview(data);
      onPhotoCapture(photo);
    };
    reader.readAsDataURL(file);
  };

  // Start camera capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      log.error('Error accessing camera:', {}, "Homedropphotoscapture", error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to base64
    canvas.toBlob((blob) => {
      if (!blob) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        const photo: HomeDropPhoto = {
          id: `${type}_${Date.now()}`,
          type,
          data,
          timestamp: new Date(),
          size: blob.size,
          compressed: false,
          resolution: {
            width: canvas.width,
            height: canvas.height
          }
        };

        setPreview(data);
        onPhotoCapture(photo);
        stopCamera();
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  // Remove photo
  const removePhoto = () => {
    setPreview(null);
    onPhotoRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Retake photo
  const retakePhoto = () => {
    removePhoto();
    startCamera();
  };

  return (
    <div className="home-drop-photo-capture-container">
      <div className="photo-header mb-3">
        <div className="flex items-center gap-3 mb-2">
          {icon && (
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {label}
                {required && <span className="text-red-500">*</span>}
              </h4>
              {preview && (
                <Check className="w-5 h-5 text-green-500" />
              )}
            </div>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="photo-content">
        {!preview && !isCapturing && (
          <div className="photo-actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                onClick={startCamera}
                className="flex items-center justify-center gap-3 px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 px-4 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Upload</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Photo placeholder */}
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No photo captured</p>
              </div>
            </div>
          </div>
        )}

        {isCapturing && (
          <div className="camera-view relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={capturePhoto}
                className="w-16 h-16 bg-white rounded-full border-4 border-blue-600 hover:bg-gray-100 transition-colors shadow-lg"
                aria-label="Capture photo"
              />
              <button
                onClick={stopCamera}
                className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                aria-label="Cancel"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div className="photo-preview relative">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
              <img
                src={preview}
                alt={label}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={retakePhoto}
                  className="p-2 bg-white/90 text-gray-700 rounded-full hover:bg-white transition-colors shadow-md"
                  aria-label="Retake photo"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
                <button
                  onClick={removePhoto}
                  className="p-2 bg-white/90 text-red-600 rounded-full hover:bg-white transition-colors shadow-md"
                  aria-label="Remove photo"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium">{label}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface HomeDropPhotosCaptureProps {
  photos: HomeDropPhoto[];
  onPhotosChange: (photos: HomeDropPhoto[]) => void;
  className?: string;
}

// Home Drop Photo Requirements - 4 specific types for installation validation
const HOME_DROP_PHOTO_REQUIREMENTS: Array<{
  type: HomeDropPhotoType;
  label: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}> = [
  {
    type: 'power-meter-test',
    label: 'Power Meter Test',
    description: 'Optical power reading showing signal strength levels (-8 to -30 dBm)',
    icon: <Zap className="w-5 h-5 text-yellow-600" />,
    required: true
  },
  {
    type: 'fibertime-setup-confirmation',
    label: 'FiberTime Setup Confirmation',
    description: 'FiberTime device configuration screen showing successful setup',
    icon: <Settings className="w-5 h-5 text-blue-600" />,
    required: true
  },
  {
    type: 'fibertime-device-actions',
    label: 'FiberTime Device Actions',
    description: 'FiberTime device showing completed installation actions/tests',
    icon: <Settings className="w-5 h-5 text-green-600" />,
    required: true
  },
  {
    type: 'router-4-lights-status',
    label: 'Router 4-Lights Status',
    description: 'Router showing all 4 status lights active (Power, Internet, WiFi, LAN)',
    icon: <Router className="w-5 h-5 text-emerald-600" />,
    required: true
  }
];

export function HomeDropPhotosCapture({
  photos,
  onPhotosChange,
  className
}: HomeDropPhotosCaptureProps) {
  const handlePhotoCapture = useCallback((photo: HomeDropPhoto) => {
    // Replace existing photo of same type or add new
    const existingIndex = photos.findIndex(p => p.type === photo.type);
    const newPhotos = [...photos];
    
    if (existingIndex >= 0) {
      newPhotos[existingIndex] = photo;
    } else {
      newPhotos.push(photo);
    }
    
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange]);

  const handlePhotoRemove = useCallback((type: HomeDropPhotoType) => {
    const newPhotos = photos.filter(p => p.type !== type);
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange]);

  const getPhotoByType = (type: HomeDropPhotoType): HomeDropPhoto | undefined => {
    return photos.find(p => p.type === type);
  };

  const requiredPhotosCount = HOME_DROP_PHOTO_REQUIREMENTS.filter(r => r.required).length;
  const capturedRequiredCount = HOME_DROP_PHOTO_REQUIREMENTS.filter(r => 
    r.required && getPhotoByType(r.type)
  ).length;

  return (
    <div className={cn('home-drop-photos-capture', className)}>
      {/* Progress Indicator */}
      <div className="photos-progress mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Installation Photo Progress
          </span>
          <span className={cn(
            "text-sm font-medium px-3 py-1 rounded-full",
            capturedRequiredCount === requiredPhotosCount
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          )}>
            {capturedRequiredCount} of {requiredPhotosCount} required
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={cn(
              "h-3 rounded-full transition-all duration-500",
              capturedRequiredCount === requiredPhotosCount
                ? "bg-green-600"
                : "bg-blue-600"
            )}
            style={{
              width: `${(capturedRequiredCount / requiredPhotosCount) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Photo Requirements */}
      <div className="photos-grid space-y-6">
        {HOME_DROP_PHOTO_REQUIREMENTS.map((req) => (
          <div 
            key={req.type}
            className={cn(
              "p-4 border rounded-lg transition-all",
              getPhotoByType(req.type)
                ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            )}
          >
            <PhotoCapture
              type={req.type}
              label={req.label}
              description={req.description}
              icon={req.icon}
              required={req.required}
              existingPhoto={getPhotoByType(req.type)}
              onPhotoCapture={handlePhotoCapture}
              onPhotoRemove={() => handlePhotoRemove(req.type)}
            />
          </div>
        ))}
      </div>

      {/* Summary Section */}
      <div className="photos-summary mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
          Photo Summary ({photos.length} captured)
        </h4>
        
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((photo) => {
              const requirement = HOME_DROP_PHOTO_REQUIREMENTS.find(r => r.type === photo.type);
              return (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"
                >
                  <img
                    src={photo.data}
                    alt={requirement?.label || photo.type}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    {requirement?.icon && (
                      <div className="p-1 bg-white/90 rounded">
                        {requirement.icon}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                    <p className="font-medium truncate">
                      {requirement?.label || photo.type.replace(/-/g, ' ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No photos captured yet</p>
            <p className="text-sm mt-1">Start by capturing the power meter test photo</p>
          </div>
        )}
        
        {/* Photo Requirements Checklist */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Installation Requirements Checklist:
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {HOME_DROP_PHOTO_REQUIREMENTS.map((req) => (
              <div key={req.type} className="flex items-center gap-2">
                {getPhotoByType(req.type) ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 border border-gray-300 rounded" />
                )}
                <span className={cn(
                  getPhotoByType(req.type) 
                    ? "text-green-700 dark:text-green-300" 
                    : "text-gray-600 dark:text-gray-400"
                )}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}