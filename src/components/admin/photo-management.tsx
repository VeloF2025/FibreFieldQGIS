/**
 * Photo Management Admin Component
 * 
 * Comprehensive photo gallery and management interface for administrators.
 * Provides photo viewing, approval workflow, metadata management, and bulk operations.
 * 
 * Key Features:
 * 1. Photo gallery with multiple view modes (grid, list, map)
 * 2. Photo approval workflow with batch operations
 * 3. Metadata viewing and editing
 * 4. EXIF data display for QGIS compatibility
 * 5. Photo quality assessment tools
 * 6. Search and filtering capabilities
 * 7. Client package preparation
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  MapPin, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Eye,
  Edit,
  Trash2,
  Package,
  Settings,
  ImageIcon,
  Calendar,
  User,
  Info,
  Maximize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Star,
  Clock,
  FileImage,
  MapPinIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { InteractiveMap } from '@/components/mapping/interactive-map';
import { photoManagementService, type PhotoMetadata } from '@/services/photo-management.service';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';

/**
 * Photo Filter Options
 */
interface PhotoFilters {
  homeDropId?: string;
  photoType?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  dateRange?: {
    start: Date;
    end: Date;
  };
  capturedBy?: string;
  hasGPS?: boolean;
  qualityScore?: {
    min: number;
    max: number;
  };
}

/**
 * Photo View Modes
 */
type ViewMode = 'grid' | 'list' | 'map';

/**
 * Photo Gallery Card Component
 */
function PhotoGalleryCard({ 
  photo, 
  isSelected, 
  onSelect, 
  onView, 
  onApprove, 
  onReject 
}: {
  photo: PhotoMetadata;
  isSelected: boolean;
  onSelect: (photoId: string, selected: boolean) => void;
  onView: (photo: PhotoMetadata) => void;
  onApprove: (photoId: string) => void;
  onReject: (photoId: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  const getQualityColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200 hover:shadow-lg",
      isSelected && "ring-2 ring-blue-500"
    )}>
      {/* Photo Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={photo.urls.thumbnail}
          alt={`${photo.photoType} - ${photo.filename}`}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          onClick={() => onView(photo)}
          loading="lazy"
        />
        
        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => onView(photo)}>
              <Eye className="w-4 h-4" />
            </Button>
            {photo.approvalStatus === 'pending' && (
              <>
                <Button size="sm" variant="default" onClick={() => onApprove(photo.id)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onReject(photo.id)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(photo.id, Boolean(checked))}
            className="bg-white"
          />
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={getStatusColor(photo.approvalStatus)}>
            {photo.approvalStatus}
          </Badge>
        </div>
      </div>
      
      {/* Photo Details */}
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-sm truncate">{photo.photoType.replace('-', ' ')}</h3>
            {photo.qualityScore && (
              <span className={cn("text-xs font-medium", getQualityColor(photo.qualityScore))}>
                {photo.qualityScore}%
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <FileImage className="w-3 h-3" />
              <span>{(photo.originalSize / 1024 / 1024).toFixed(1)}MB</span>
            </div>
            <div className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              <span>{photo.width}×{photo.height}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(photo.capturedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate">{photo.capturedBy}</span>
            </div>
          </div>
          
          {photo.exif?.gps && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <MapPinIcon className="w-3 h-3" />
              <span>GPS: {photo.exif.gps.latitude.toFixed(4)}, {photo.exif.gps.longitude.toFixed(4)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Photo Detail Modal Component
 */
function PhotoDetailModal({ 
  photo, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject 
}: {
  photo: PhotoMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (photoId: string, notes?: string) => void;
  onReject: (photoId: string, reason: string) => void;
}) {
  const [activeTab, setActiveTab] = useState('image');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [imageScale, setImageScale] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);

  if (!photo) return null;

  const handleApprove = () => {
    onApprove(photo.id, approvalNotes || undefined);
    setApprovalNotes('');
    onClose();
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    onReject(photo.id, rejectionReason);
    setRejectionReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{photo.photoType.replace('-', ' ')} - {photo.filename}</span>
            <Badge className={
              photo.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
              photo.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-orange-100 text-orange-800'
            }>
              {photo.approvalStatus}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="exif">EXIF Data</TabsTrigger>
            <TabsTrigger value="approval">Approval</TabsTrigger>
          </TabsList>
          
          <TabsContent value="image" className="h-[70vh] overflow-auto">
            <div className="space-y-4">
              {/* Image Controls */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setImageScale(Math.max(25, imageScale - 25))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">{imageScale}%</span>
                  <Button size="sm" variant="outline" onClick={() => setImageScale(Math.min(200, imageScale + 25))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setImageRotation(imageRotation - 90)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setImageRotation(imageRotation + 90)}>
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select defaultValue="medium">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thumbnail">Thumbnail</SelectItem>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="original">Original</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" asChild>
                    <a href={photo.urls.original} target="_blank" rel="noopener noreferrer">
                      <Maximize2 className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              {/* Image Display */}
              <div className="flex justify-center bg-gray-50 rounded-lg p-4 overflow-auto">
                <img
                  src={photo.urls.medium}
                  alt={photo.filename}
                  className="max-w-none transition-transform duration-200"
                  style={{
                    transform: `scale(${imageScale / 100}) rotate(${imageRotation}deg)`
                  }}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="metadata" className="h-[70vh] overflow-auto">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">File Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Filename:</span>
                      <span className="font-medium">{photo.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Size:</span>
                      <span className="font-medium">{(photo.originalSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium">{photo.fileFormat.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">MIME Type:</span>
                      <span className="font-medium">{photo.mimeType}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Image Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dimensions:</span>
                      <span className="font-medium">{photo.width} × {photo.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aspect Ratio:</span>
                      <span className="font-medium">{photo.aspectRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Megapixels:</span>
                      <span className="font-medium">{((photo.width * photo.height) / 1000000).toFixed(1)} MP</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Capture Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Photo Type:</span>
                      <span className="font-medium">{photo.photoType.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Captured By:</span>
                      <span className="font-medium">{photo.capturedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Captured At:</span>
                      <span className="font-medium">{new Date(photo.capturedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uploaded At:</span>
                      <span className="font-medium">
                        {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleString() : 'Pending'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {photo.qualityScore && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Quality Assessment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quality Score:</span>
                        <span className={cn(
                          "font-medium",
                          photo.qualityScore >= 80 ? "text-green-600" :
                          photo.qualityScore >= 60 ? "text-orange-600" :
                          "text-red-600"
                        )}>
                          {photo.qualityScore}%
                        </span>
                      </div>
                      {photo.qualityNotes && (
                        <div>
                          <span className="text-gray-600">Notes:</span>
                          <p className="text-sm mt-1">{photo.qualityNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="exif" className="h-[70vh] overflow-auto">
            <div className="space-y-4">
              {photo.exif?.gps && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" />
                      GPS Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Latitude:</span>
                      <span className="font-medium">{photo.exif.gps.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Longitude:</span>
                      <span className="font-medium">{photo.exif.gps.longitude.toFixed(6)}</span>
                    </div>
                    {photo.exif.gps.altitude && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Altitude:</span>
                        <span className="font-medium">{photo.exif.gps.altitude.toFixed(1)}m</span>
                      </div>
                    )}
                    {photo.exif.gps.accuracy && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Accuracy:</span>
                        <span className="font-medium">{photo.exif.gps.accuracy.toFixed(1)}m</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {photo.exif?.camera && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Camera Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {photo.exif.camera.make && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Make:</span>
                        <span className="font-medium">{photo.exif.camera.make}</span>
                      </div>
                    )}
                    {photo.exif.camera.model && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-medium">{photo.exif.camera.model}</span>
                      </div>
                    )}
                    {photo.exif.camera.iso && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">ISO:</span>
                        <span className="font-medium">{photo.exif.camera.iso}</span>
                      </div>
                    )}
                    {photo.exif.camera.aperture && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Aperture:</span>
                        <span className="font-medium">f/{photo.exif.camera.aperture}</span>
                      </div>
                    )}
                    {photo.exif.camera.shutterSpeed && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shutter Speed:</span>
                        <span className="font-medium">{photo.exif.camera.shutterSpeed}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {!photo.exif && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center text-gray-500">
                      <Info className="w-8 h-8 mx-auto mb-2" />
                      <p>No EXIF data available for this image</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="approval" className="h-[70vh] overflow-auto">
            <div className="space-y-6">
              {photo.approvalStatus === 'pending' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-green-600">Approve Photo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="approvalNotes">Approval Notes (Optional)</Label>
                        <Textarea
                          id="approvalNotes"
                          placeholder="Add notes about photo quality, compliance, etc..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Photo
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-red-600">Reject Photo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                        <Textarea
                          id="rejectionReason"
                          placeholder="Specify why this photo is being rejected..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                      <Button 
                        onClick={handleReject} 
                        variant="destructive" 
                        className="w-full"
                        disabled={!rejectionReason.trim()}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Photo
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {photo.approvalStatus === 'approved' && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-green-700">Photo Approved</h3>
                      {photo.approvedBy && (
                        <p className="text-sm text-gray-600 mt-2">
                          Approved by {photo.approvedBy} on {photo.approvedAt ? new Date(photo.approvedAt).toLocaleDateString() : ''}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {photo.approvalStatus === 'rejected' && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-red-700">Photo Rejected</h3>
                      {photo.rejectionReason && (
                        <p className="text-sm text-gray-600 mt-2 max-w-md">
                          {photo.rejectionReason}
                        </p>
                      )}
                      {photo.approvedBy && (
                        <p className="text-xs text-gray-500 mt-2">
                          Rejected by {photo.approvedBy} on {photo.approvedAt ? new Date(photo.approvedAt).toLocaleDateString() : ''}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Photo Management Component
 */
export function PhotoManagement() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoMetadata[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PhotoFilters>({});
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = photos;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(photo => 
        photo.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.photoType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.capturedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.approvalStatus) {
      filtered = filtered.filter(photo => photo.approvalStatus === filters.approvalStatus);
    }

    // Photo type filter
    if (filters.photoType) {
      filtered = filtered.filter(photo => photo.photoType === filters.photoType);
    }

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(photo => {
        const capturedDate = new Date(photo.capturedAt);
        return capturedDate >= filters.dateRange!.start && capturedDate <= filters.dateRange!.end;
      });
    }

    // GPS filter
    if (filters.hasGPS !== undefined) {
      filtered = filtered.filter(photo => 
        filters.hasGPS ? !!photo.exif?.gps : !photo.exif?.gps
      );
    }

    // Quality score filter
    if (filters.qualityScore) {
      filtered = filtered.filter(photo => 
        photo.qualityScore !== undefined &&
        photo.qualityScore >= filters.qualityScore!.min &&
        photo.qualityScore <= filters.qualityScore!.max
      );
    }

    setFilteredPhotos(filtered);
  }, [photos, searchTerm, filters]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      
      // For now, load photos by approval status
      // In a real implementation, you'd have an endpoint to get all photos
      const pendingPhotos = await photoManagementService.getPhotosByApprovalStatus('pending');
      const approvedPhotos = await photoManagementService.getPhotosByApprovalStatus('approved');
      const rejectedPhotos = await photoManagementService.getPhotosByApprovalStatus('rejected');
      
      const allPhotos = [...pendingPhotos, ...approvedPhotos, ...rejectedPhotos];
      setPhotos(allPhotos);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to load photos', { error: errorMessage }, 'PhotoManagement');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (photoId: string, selected: boolean) => {
    setSelectedPhotos(prev => 
      selected 
        ? [...prev, photoId]
        : prev.filter(id => id !== photoId)
    );
  };

  const handleViewPhoto = (photo: PhotoMetadata) => {
    setSelectedPhoto(photo);
    setIsDetailModalOpen(true);
  };

  const handleApprovePhoto = async (photoId: string, notes?: string) => {
    try {
      await photoManagementService.updatePhotoApproval(photoId, 'approved', 'admin-user', notes);
      await loadPhotos();
      log.info('Photo approved', { photoId }, 'PhotoManagement');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to approve photo', { photoId, error: errorMessage }, 'PhotoManagement');
    }
  };

  const handleRejectPhoto = async (photoId: string, reason: string) => {
    try {
      await photoManagementService.updatePhotoApproval(photoId, 'rejected', 'admin-user', reason);
      await loadPhotos();
      log.info('Photo rejected', { photoId, reason }, 'PhotoManagement');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to reject photo', { photoId, error: errorMessage }, 'PhotoManagement');
    }
  };

  const handleBulkApprove = async () => {
    try {
      for (const photoId of selectedPhotos) {
        await photoManagementService.updatePhotoApproval(photoId, 'approved', 'admin-user');
      }
      setSelectedPhotos([]);
      await loadPhotos();
      log.info('Bulk photo approval completed', { count: selectedPhotos.length }, 'PhotoManagement');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to bulk approve photos', { error: errorMessage }, 'PhotoManagement');
    }
  };

  const handleBulkReject = () => {
    // TODO: Implement bulk rejection dialog
    console.log('Bulk reject:', selectedPhotos);
  };

  const photosWithGPS = useMemo(() => 
    filteredPhotos.filter(p => p.exif?.gps),
    [filteredPhotos]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Camera className="w-8 h-8 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Photo Management</h2>
          <p className="text-gray-600">
            Showing {filteredPhotos.length} of {photos.length} photos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <MapPin className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search photos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filters.approvalStatus || 'all'} onValueChange={(value) => 
          setFilters(prev => ({ 
            ...prev, 
            approvalStatus: value === 'all' ? undefined : value as any 
          }))
        }>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filters.photoType || 'all'} onValueChange={(value) => 
          setFilters(prev => ({ 
            ...prev, 
            photoType: value === 'all' ? undefined : value 
          }))
        }>
          <SelectTrigger>
            <SelectValue placeholder="Photo Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="power-meter-test">Power Meter Test</SelectItem>
            <SelectItem value="fibertime-setup-confirmation">Fibertime Setup</SelectItem>
            <SelectItem value="fibertime-device-actions">Fibertime Actions</SelectItem>
            <SelectItem value="router-4-lights-status">Router Status</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={() => setFilters({})}>
          <Filter className="w-4 h-4 mr-2" />
          Clear
        </Button>
        
        <Button onClick={loadPhotos}>
          Refresh
        </Button>
      </div>

      {/* Content */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map(photo => (
            <PhotoGalleryCard
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotos.includes(photo.id)}
              onSelect={handlePhotoSelect}
              onView={handleViewPhoto}
              onApprove={handleApprovePhoto}
              onReject={handleRejectPhoto}
            />
          ))}
        </div>
      )}

      {viewMode === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle>Photo Locations</CardTitle>
            <CardDescription>
              Photos with GPS data ({photosWithGPS.length} of {filteredPhotos.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              {/* TODO: Implement map view with photo markers */}
              <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Map view coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedPhotos.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedPhotos.length} selected
                </span>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedPhotos([])}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve All
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBulkReject}>
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject All
                  </Button>
                  <Button size="sm" variant="outline">
                    <Package className="w-4 h-4 mr-1" />
                    Create Package
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photo Detail Modal */}
      <PhotoDetailModal
        photo={selectedPhoto}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPhoto(null);
        }}
        onApprove={handleApprovePhoto}
        onReject={handleRejectPhoto}
      />
    </div>
  );
}