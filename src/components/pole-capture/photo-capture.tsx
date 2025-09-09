'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, RotateCw, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhotoType, CapturedPhoto } from '@/services/pole-capture.service';

interface PhotoCaptureProps {
  type: PhotoType;
  label: string;
  description?: string;
  required?: boolean;
  existingPhoto?: CapturedPhoto;
  onPhotoCapture: (photo: CapturedPhoto) => void;
  onPhotoRemove: () => void;
}

export function PhotoCapture({
  type,
  label,
  description,
  required = false,
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
      const photo: CapturedPhoto = {
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
      console.error('Error accessing camera:', error);
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
        const photo: CapturedPhoto = {
          id: `${type}_${Date.now()}`,
          type,
          data,
          timestamp: new Date(),
          size: blob.size,
          compressed: false
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
    <div className="photo-capture-container">
      <div className="photo-header mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            {label}
            {required && <span className="text-red-500">*</span>}
          </h4>
          {preview && (
            <Check className="w-4 h-4 text-green-500" />
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="photo-content">
        {!preview && !isCapturing && (
          <div className="photo-actions grid grid-cols-2 gap-2">
            <button
              onClick={startCamera}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>Camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Upload</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
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
                className="w-16 h-16 bg-white rounded-full border-4 border-blue-600 hover:bg-gray-100 transition-colors"
                aria-label="Capture photo"
              />
              <button
                onClick={stopCamera}
                className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                aria-label="Cancel"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div className="photo-preview relative">
            <img
              src={preview}
              alt={label}
              className="w-full rounded-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={retakePhoto}
                className="p-2 bg-white/90 text-gray-700 rounded-lg hover:bg-white transition-colors"
                aria-label="Retake photo"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={removePhoto}
                className="p-2 bg-white/90 text-red-600 rounded-lg hover:bg-white transition-colors"
                aria-label="Remove photo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MultiPhotosCaptureProps {
  photos: CapturedPhoto[];
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  className?: string;
}

const PHOTO_REQUIREMENTS: Array<{
  type: PhotoType;
  label: string;
  description: string;
  required: boolean;
}> = [
  {
    type: 'before',
    label: 'Before Installation',
    description: 'Site before pole installation',
    required: true
  },
  {
    type: 'front',
    label: 'Front View',
    description: 'Front view of installed pole',
    required: true
  },
  {
    type: 'side',
    label: 'Side View',
    description: 'Side angle view of pole',
    required: true
  },
  {
    type: 'depth',
    label: 'Installation Depth',
    description: 'Shows depth of pole installation',
    required: false
  },
  {
    type: 'concrete',
    label: 'Concrete Base',
    description: 'Foundation/base of pole',
    required: false
  },
  {
    type: 'compaction',
    label: 'Ground Compaction',
    description: 'Ground compaction around pole',
    required: false
  }
];

export function MultiPhotosCapture({
  photos,
  onPhotosChange,
  className
}: MultiPhotosCaptureProps) {
  const handlePhotoCapture = useCallback((photo: CapturedPhoto) => {
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

  const handlePhotoRemove = useCallback((type: PhotoType) => {
    const newPhotos = photos.filter(p => p.type !== type);
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange]);

  const getPhotoByType = (type: PhotoType): CapturedPhoto | undefined => {
    return photos.find(p => p.type === type);
  };

  const requiredPhotosCount = PHOTO_REQUIREMENTS.filter(r => r.required).length;
  const capturedRequiredCount = PHOTO_REQUIREMENTS.filter(r => 
    r.required && getPhotoByType(r.type)
  ).length;

  return (
    <div className={cn('multi-photos-capture', className)}>
      <div className="photos-progress mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Photo Progress
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {capturedRequiredCount} of {requiredPhotosCount} required
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(capturedRequiredCount / requiredPhotosCount) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="photos-grid space-y-4">
        {PHOTO_REQUIREMENTS.map((req) => (
          <PhotoCapture
            key={req.type}
            type={req.type}
            label={req.label}
            description={req.description}
            required={req.required}
            existingPhoto={getPhotoByType(req.type)}
            onPhotoCapture={handlePhotoCapture}
            onPhotoRemove={() => handlePhotoRemove(req.type)}
          />
        ))}
      </div>

      <div className="photos-summary mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Captured Photos ({photos.length})
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"
            >
              <img
                src={photo.data}
                alt={photo.type}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                {photo.type}
              </div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 6 - photos.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
            >
              <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}