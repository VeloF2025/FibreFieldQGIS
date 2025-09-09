/**
 * Advanced Photo Reviewer Component
 * 
 * Specialized component for reviewing home drop photos with:
 * - High-resolution viewing with zoom and pan
 * - Photo quality scoring and validation
 * - Annotation system for feedback
 * - Metadata display and analysis
 * - Comparison with reference standards
 * - Batch photo operations
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Star, 
  MessageSquare, 
  Grid, 
  Maximize2,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  MapPin,
  Ruler,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HomeDropPhoto, HomeDropPhotoType } from '@/types/home-drop.types';
import { cn } from '@/lib/utils';

/**
 * Photo Quality Scorer
 */
interface PhotoQualityScore {
  overall: number;
  clarity: number;
  lighting: number;
  composition: number;
  completeness: number;
  issues: string[];
  suggestions: string[];
}

function calculatePhotoQuality(photo: HomeDropPhoto): PhotoQualityScore {
  const score: PhotoQualityScore = {
    overall: 0,
    clarity: 85, // Default scores - in real implementation would use AI analysis
    lighting: 75,
    composition: 80,
    completeness: 90,
    issues: [],
    suggestions: []
  };

  // Analyze photo size (larger generally better quality)
  if (photo.size < 100000) { // < 100KB
    score.clarity -= 20;
    score.issues.push('Low resolution image');
    score.suggestions.push('Use higher resolution camera setting');
  }

  // Check if compressed (affects quality)
  if (photo.compressed) {
    score.clarity -= 10;
    score.issues.push('Image heavily compressed');
  }

  // Resolution analysis
  if (photo.resolution) {
    const totalPixels = photo.resolution.width * photo.resolution.height;
    if (totalPixels < 1000000) { // < 1MP
      score.clarity -= 15;
      score.issues.push('Low pixel count');
    }
  }

  // Photo type specific validation
  switch (photo.type) {
    case 'power-meter-test':
      if (!photo.validationNotes?.includes('reading visible')) {
        score.completeness -= 30;
        score.issues.push('Power reading not clearly visible');
        score.suggestions.push('Ensure power meter display is clearly readable');
      }
      break;
    case 'router-4-lights-status':
      if (!photo.validationNotes?.includes('all lights')) {
        score.completeness -= 25;
        score.issues.push('Not all router lights visible');
        score.suggestions.push('Capture all 4 LED status lights');
      }
      break;
  }

  // Calculate overall score
  score.overall = Math.round(
    (score.clarity + score.lighting + score.composition + score.completeness) / 4
  );

  return score;
}

/**
 * Photo Annotation System
 */
interface PhotoAnnotation {
  id: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
  note: string;
  type: 'issue' | 'good' | 'question' | 'info';
  createdAt: Date;
  createdBy: string;
}

function PhotoAnnotationLayer({
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  isEditing
}: {
  annotations: PhotoAnnotation[];
  onAddAnnotation: (x: number, y: number) => void;
  onUpdateAnnotation: (id: string, updates: Partial<PhotoAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  isEditing: boolean;
}) {
  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    onAddAnnotation(x, y);
  };

  const getAnnotationColor = (type: PhotoAnnotation['type']) => {
    switch (type) {
      case 'issue': return 'bg-red-500 border-red-600';
      case 'good': return 'bg-green-500 border-green-600';
      case 'question': return 'bg-yellow-500 border-yellow-600';
      case 'info': return 'bg-blue-500 border-blue-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  return (
    <div className="absolute inset-0" onClick={handleImageClick}>
      {annotations.map((annotation, index) => (
        <div
          key={annotation.id}
          className={cn(
            "absolute w-6 h-6 rounded-full border-2 shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white text-xs font-bold",
            getAnnotationColor(annotation.type)
          )}
          style={{ 
            left: `${annotation.x}%`, 
            top: `${annotation.y}%`
          }}
          title={annotation.note}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}

/**
 * Photo Metadata Panel
 */
function PhotoMetadataPanel({ 
  photo, 
  qualityScore 
}: { 
  photo: HomeDropPhoto;
  qualityScore: PhotoQualityScore;
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPhotoTypeDescription = (type: HomeDropPhotoType) => {
    const descriptions = {
      'power-meter-test': 'Power meter reading showing optical power levels for signal strength validation',
      'fibertime-setup-confirmation': 'Fibertime device setup confirmation screen showing successful configuration',
      'fibertime-device-actions': 'Device configuration actions and settings applied during setup',
      'router-4-lights-status': 'Router status display showing all 4 LED indicators in active state'
    };
    return descriptions[type];
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Photo Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <Badge variant="outline">{photo.type.replace('-', ' ')}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Size:</span>
            <span>{formatFileSize(photo.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Resolution:</span>
            <span>
              {photo.resolution 
                ? `${photo.resolution.width} × ${photo.resolution.height}`
                : 'Unknown'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Timestamp:</span>
            <span>{new Date(photo.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Compressed:</span>
            <Badge variant={photo.compressed ? "destructive" : "success"}>
              {photo.compressed ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-2">Quality Assessment</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Overall Score</span>
              <span className={cn(
                "text-sm font-bold",
                qualityScore.overall >= 80 ? "text-green-600" :
                qualityScore.overall >= 60 ? "text-yellow-600" : "text-red-600"
              )}>
                {qualityScore.overall}%
              </span>
            </div>
            <Progress value={qualityScore.overall} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Clarity:</span>
              <span className="ml-2 font-medium">{qualityScore.clarity}%</span>
            </div>
            <div>
              <span className="text-gray-600">Lighting:</span>
              <span className="ml-2 font-medium">{qualityScore.lighting}%</span>
            </div>
            <div>
              <span className="text-gray-600">Composition:</span>
              <span className="ml-2 font-medium">{qualityScore.composition}%</span>
            </div>
            <div>
              <span className="text-gray-600">Completeness:</span>
              <span className="ml-2 font-medium">{qualityScore.completeness}%</span>
            </div>
          </div>
        </div>
      </div>

      {qualityScore.issues.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="font-medium mb-2 text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Issues Found
            </h4>
            <ul className="space-y-1">
              {qualityScore.issues.map((issue, index) => (
                <li key={index} className="text-sm text-red-600">• {issue}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {qualityScore.suggestions.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="font-medium mb-2 text-blue-600 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Suggestions
            </h4>
            <ul className="space-y-1">
              {qualityScore.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-blue-600">• {suggestion}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Separator />

      <div>
        <h4 className="font-medium mb-2">Requirements</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          {getPhotoTypeDescription(photo.type)}
        </p>
      </div>

      {photo.location && (
        <>
          <Separator />
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Location
            </h4>
            <div className="text-xs space-y-1">
              <div>Lat: {photo.location.latitude.toFixed(6)}</div>
              <div>Lng: {photo.location.longitude.toFixed(6)}</div>
              {photo.location.accuracy && (
                <div>Accuracy: ±{photo.location.accuracy}m</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Main Photo Reviewer Component
 */
interface PhotoReviewerProps {
  photos: HomeDropPhoto[];
  onPhotoUpdate?: (photoId: string, updates: Partial<HomeDropPhoto>) => void;
  onAnnotationUpdate?: (photoId: string, annotations: PhotoAnnotation[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function PhotoReviewer({
  photos,
  onPhotoUpdate,
  onAnnotationUpdate,
  readOnly = false,
  className
}: PhotoReviewerProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [annotations, setAnnotations] = useState<Record<string, PhotoAnnotation[]>>({});
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);

  const selectedPhoto = photos[selectedPhotoIndex];
  const selectedPhotoQuality = selectedPhoto ? calculatePhotoQuality(selectedPhoto) : null;

  const photoTypeLabels: Record<HomeDropPhotoType, string> = {
    'power-meter-test': 'Power Meter Reading',
    'fibertime-setup-confirmation': 'Fibertime Setup',
    'fibertime-device-actions': 'Device Configuration',
    'router-4-lights-status': 'Router Status'
  };

  const handleAnnotationAdd = (x: number, y: number) => {
    if (!selectedPhoto || readOnly) return;
    
    const newAnnotation: PhotoAnnotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      note: 'Click to add note',
      type: 'info',
      createdAt: new Date(),
      createdBy: 'current-user' // TODO: Get from auth context
    };

    setAnnotations(prev => ({
      ...prev,
      [selectedPhoto.id]: [...(prev[selectedPhoto.id] || []), newAnnotation]
    }));

    onAnnotationUpdate?.(selectedPhoto.id, [...(annotations[selectedPhoto.id] || []), newAnnotation]);
  };

  const handleAnnotationUpdate = (annotationId: string, updates: Partial<PhotoAnnotation>) => {
    if (!selectedPhoto || readOnly) return;

    setAnnotations(prev => ({
      ...prev,
      [selectedPhoto.id]: (prev[selectedPhoto.id] || []).map(ann =>
        ann.id === annotationId ? { ...ann, ...updates } : ann
      )
    }));

    const updatedAnnotations = (annotations[selectedPhoto.id] || []).map(ann =>
      ann.id === annotationId ? { ...ann, ...updates } : ann
    );

    onAnnotationUpdate?.(selectedPhoto.id, updatedAnnotations);
  };

  const handleAnnotationDelete = (annotationId: string) => {
    if (!selectedPhoto || readOnly) return;

    setAnnotations(prev => ({
      ...prev,
      [selectedPhoto.id]: (prev[selectedPhoto.id] || []).filter(ann => ann.id !== annotationId)
    }));

    const filteredAnnotations = (annotations[selectedPhoto.id] || []).filter(ann => ann.id !== annotationId);
    onAnnotationUpdate?.(selectedPhoto.id, filteredAnnotations);
  };

  const handlePhotoApproval = (approved: boolean) => {
    if (!selectedPhoto || readOnly) return;
    
    onPhotoUpdate?.(selectedPhoto.id, {
      isValid: approved,
      validationNotes: approved ? 'Approved by admin' : 'Rejected by admin'
    });
  };

  if (photos.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-4" />
            <p>No photos to review</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photo Review
              <Badge variant="outline">
                {photos.length} photos
              </Badge>
            </CardTitle>
            <CardDescription>
              Review installation photos for quality and compliance
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'detail' ? 'default' : 'outline'}
              onClick={() => setViewMode('detail')}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            
            {viewMode === 'detail' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMetadata(!showMetadata)}
              >
                {showMetadata ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => {
              const quality = calculatePhotoQuality(photo);
              return (
                <div
                  key={photo.id}
                  className={cn(
                    "relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                    selectedPhotoIndex === index 
                      ? "border-blue-500 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <img
                    src={photo.data}
                    alt={photoTypeLabels[photo.type]}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Quality indicator */}
                  <div className="absolute top-2 right-2">
                    <Badge 
                      variant={quality.overall >= 80 ? "success" : quality.overall >= 60 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {quality.overall}%
                    </Badge>
                  </div>
                  
                  {/* Photo type */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-medium truncate">
                      {photoTypeLabels[photo.type]}
                    </p>
                  </div>
                  
                  {/* Validation status */}
                  <div className="absolute top-2 left-2">
                    {photo.isValid === true && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {photo.isValid === false && <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Photo Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1))}
                  disabled={selectedPhotoIndex === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  {selectedPhotoIndex + 1} of {photos.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPhotoIndex(Math.min(photos.length - 1, selectedPhotoIndex + 1))}
                  disabled={selectedPhotoIndex === photos.length - 1}
                >
                  Next
                </Button>
              </div>
              
              <div className="text-lg font-medium">
                {photoTypeLabels[selectedPhoto.type]}
              </div>
              
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handlePhotoApproval(false)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handlePhotoApproval(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
            </div>

            {/* Main Photo View */}
            <div className={cn("grid gap-6", showMetadata ? "grid-cols-3" : "grid-cols-1")}>
              <div className={cn("space-y-4", showMetadata ? "col-span-2" : "col-span-1")}>
                {/* Photo Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={isAnnotating ? "default" : "outline"}
                      onClick={() => setIsAnnotating(!isAnnotating)}
                      disabled={readOnly}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {isAnnotating ? 'Stop Annotating' : 'Add Annotations'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoom(Math.max(50, zoom - 25))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">{zoom}%</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoom(Math.min(300, zoom + 25))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRotation((rotation + 90) % 360)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Photo Display */}
                <div 
                  className="relative bg-gray-100 rounded-lg overflow-hidden"
                  style={{ height: '500px' }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={selectedPhoto.data}
                      alt={photoTypeLabels[selectedPhoto.type]}
                      className="max-w-full max-h-full object-contain transition-transform duration-200"
                      style={{ 
                        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                        transformOrigin: 'center'
                      }}
                    />
                  </div>

                  {/* Annotation Layer */}
                  <PhotoAnnotationLayer
                    annotations={annotations[selectedPhoto.id] || []}
                    onAddAnnotation={handleAnnotationAdd}
                    onUpdateAnnotation={handleAnnotationUpdate}
                    onDeleteAnnotation={handleAnnotationDelete}
                    isEditing={isAnnotating}
                  />

                  {isAnnotating && (
                    <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      Click on the image to add annotations
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Panel */}
              {showMetadata && selectedPhotoQuality && (
                <div className="space-y-6">
                  <PhotoMetadataPanel 
                    photo={selectedPhoto} 
                    qualityScore={selectedPhotoQuality} 
                  />
                  
                  {/* Annotations List */}
                  {(annotations[selectedPhoto.id] || []).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Annotations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(annotations[selectedPhoto.id] || []).map((annotation, index) => (
                          <div key={annotation.id} className="text-xs border rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  annotation.type === 'issue' && "border-red-500 text-red-500",
                                  annotation.type === 'good' && "border-green-500 text-green-500",
                                  annotation.type === 'question' && "border-yellow-500 text-yellow-500",
                                  annotation.type === 'info' && "border-blue-500 text-blue-500"
                                )}
                              >
                                {index + 1}
                              </Badge>
                              <span className="text-gray-500">
                                {new Date(annotation.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700">{annotation.note}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}