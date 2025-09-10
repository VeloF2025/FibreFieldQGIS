/**
 * Individual Home Drop Capture Review Page
 * 
 * Detailed review interface for a single home drop capture.
 * Features:
 * - Comprehensive capture information display
 * - High-resolution photo gallery with zoom and annotations
 * - Quality assessment checklist
 * - Approval/rejection workflow with detailed feedback
 * - Revision tracking and history
 * - Geographic context and pole relationship
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  MapPin, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InteractiveMap } from '@/components/mapping/interactive-map';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { log } from '@/lib/logger';
import type {
  HomeDropCapture,
  HomeDropPhoto,
  HomeDropPhotoType
} from '@/types/home-drop.types';

/**
 * Photo Gallery Component with Advanced Features
 */
function PhotoGallery({ 
  photos,
  captureId 
}: { 
  photos: HomeDropPhoto[];
  captureId: string;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<HomeDropPhoto | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [annotations, setAnnotations] = useState<Array<{
    x: number;
    y: number;
    note: string;
    id: string;
  }>>([]);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);

  const photoTypeLabels: Record<HomeDropPhotoType, string> = {
    'power-meter-test': 'Power Meter Reading',
    'fibertime-setup-confirmation': 'Fibertime Setup',
    'fibertime-device-actions': 'Device Configuration',
    'router-4-lights-status': 'Router Status'
  };

  const handlePhotoClick = (photo: HomeDropPhoto) => {
    setSelectedPhoto(photo);
    setZoom(1);
    setRotation(0);
  };

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (isAddingAnnotation) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      
      const annotationId = `ann-${Date.now()}`;
      setAnnotations(prev => [...prev, {
        id: annotationId,
        x,
        y,
        note: 'Click to add note'
      }]);
      setIsAddingAnnotation(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Photo Thumbnails */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
            onClick={() => handlePhotoClick(photo)}
          >
            <img
              src={photo.data}
              alt={photoTypeLabels[photo.type]}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-xs font-medium truncate">
                {photoTypeLabels[photo.type]}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white/80 text-xs">
                  {Math.round(photo.size / 1024)}KB
                </span>
                {photo.isValid !== false && (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedPhoto && photoTypeLabels[selectedPhoto.type]}</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                  className={isAddingAnnotation ? "bg-blue-100" : ""}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(prev => Math.min(prev + 0.5, 3))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(prev => Math.max(prev - 0.5, 0.5))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative overflow-hidden bg-gray-100 rounded-lg" style={{ height: '500px' }}>
            {selectedPhoto && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={selectedPhoto.data}
                  alt={photoTypeLabels[selectedPhoto.type]}
                  className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-crosshair"
                  style={{ 
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center'
                  }}
                  onClick={handleImageClick}
                />
                
                {/* Annotations */}
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer"
                    style={{ 
                      left: `${annotation.x}%`, 
                      top: `${annotation.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    title={annotation.note}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Photo Metadata */}
          {selectedPhoto && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4">
              <div>
                <span className="text-gray-500">Size:</span>
                <span className="ml-2 font-medium">
                  {Math.round(selectedPhoto.size / 1024)}KB
                </span>
              </div>
              <div>
                <span className="text-gray-500">Resolution:</span>
                <span className="ml-2 font-medium">
                  {selectedPhoto.resolution?.width || 'N/A'} × {selectedPhoto.resolution?.height || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Timestamp:</span>
                <span className="ml-2 font-medium">
                  {new Date(selectedPhoto.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Compressed:</span>
                <span className="ml-2 font-medium">
                  {selectedPhoto.compressed ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Quality Assessment Checklist
 */
function QualityChecklist({ 
  capture,
  onUpdate 
}: { 
  capture: HomeDropCapture;
  onUpdate: (checks: Partial<HomeDropCapture['qualityChecks']>) => void;
}) {
  const qualityChecks = capture.qualityChecks || {
    powerLevelAcceptable: false,
    allPhotosPresent: false,
    customerVerified: false,
    installationComplete: false,
    serviceActive: false
  };

  const checklistItems = [
    {
      key: 'powerLevelAcceptable' as keyof typeof qualityChecks,
      label: 'Power Level Acceptable',
      description: 'Optical power reading within acceptable range (-30 to -8 dBm)',
      required: true
    },
    {
      key: 'allPhotosPresent' as keyof typeof qualityChecks,
      label: 'All Required Photos Present',
      description: 'Power meter, Fibertime setup, device actions, and router status',
      required: true
    },
    {
      key: 'customerVerified' as keyof typeof qualityChecks,
      label: 'Customer Details Verified',
      description: 'Customer information and location confirmed',
      required: true
    },
    {
      key: 'installationComplete' as keyof typeof qualityChecks,
      label: 'Installation Complete',
      description: 'All equipment installed and configured properly',
      required: true
    },
    {
      key: 'serviceActive' as keyof typeof qualityChecks,
      label: 'Service Active',
      description: 'Internet service tested and working',
      required: false
    }
  ];

  const handleCheckChange = (key: keyof typeof qualityChecks, checked: boolean) => {
    const updatedChecks = { ...qualityChecks, [key]: checked };
    
    // Calculate overall score
    const totalItems = checklistItems.length;
    const passedItems = checklistItems.filter(item => updatedChecks[item.key]).length;
    const overallScore = Math.round((passedItems / totalItems) * 100);
    
    onUpdate({ ...updatedChecks, overallScore });
  };

  const completedItems = checklistItems.filter(item => qualityChecks[item.key]).length;
  const completionRate = (completedItems / checklistItems.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quality Assessment</span>
          <Badge 
            variant={completionRate === 100 ? "success" : completionRate >= 60 ? "default" : "destructive"}
          >
            {completedItems}/{checklistItems.length} Complete
          </Badge>
        </CardTitle>
        <CardDescription>
          Review each aspect of the installation quality
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Overall Score</span>
            <span className="font-medium">{qualityChecks.overallScore || 0}%</span>
          </div>
          <Progress value={qualityChecks.overallScore || 0} className="h-2" />
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.key} className="flex items-start space-x-3">
              <Checkbox
                id={item.key}
                checked={Boolean(qualityChecks[item.key]) || false}
                onCheckedChange={(checked) => handleCheckChange(item.key, Boolean(checked))}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                  {item.label}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        {qualityChecks.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">{qualityChecks.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Approval/Rejection Dialog
 */
function ApprovalDialog({ 
  capture,
  action,
  onSubmit,
  onCancel 
}: {
  capture: HomeDropCapture;
  action: 'approve' | 'reject';
  onSubmit: (notes?: string) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(notes || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'approve' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            {action === 'approve' ? 'Approve' : 'Reject'} Installation
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' 
              ? 'Confirm that this home drop installation meets all quality standards.'
              : 'Provide feedback on why this installation requires rework.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">
              {action === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
            </Label>
            <Textarea
              id="notes"
              placeholder={
                action === 'approve'
                  ? 'Add any additional comments or observations...'
                  : 'Explain what needs to be corrected or improved...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          
          {action === 'reject' && !notes.trim() && (
            <p className="text-sm text-red-600">
              Please provide a reason for rejection to help the technician understand what needs to be fixed.
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (action === 'reject' && !notes.trim())}
            variant={action === 'approve' ? 'default' : 'destructive'}
          >
            {isSubmitting ? 'Processing...' : 
              action === 'approve' ? 'Approve Installation' : 'Reject & Request Rework'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Individual Review Page Component
 */
export default function IndividualCaptureReviewPage() {
  const params = useParams();
  const router = useRouter();
  const captureId = params.captureId as string;
  
  const [capture, setCapture] = useState<HomeDropCapture | null>(null);
  const [photos, setPhotos] = useState<HomeDropPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | null>(null);

  // Load capture data
  useEffect(() => {
    if (captureId) {
      loadCaptureData();
    }
  }, [captureId]);

  const loadCaptureData = async () => {
    try {
      setIsLoading(true);
      
      const captureData = await homeDropCaptureService.getHomeDropCapture(captureId);
      if (!captureData) {
        throw new Error('Capture not found');
      }
      
      setCapture(captureData);
      setPhotos(captureData.photos || []);
      
    } catch (error) {
      log.error('Failed to load capture data:', {}, "Page", error as Error);
      // TODO: Show error message or redirect
    } finally {
      setIsLoading(false);
    }
  };

  const handleQualityUpdate = useCallback(async (checks: Partial<HomeDropCapture['qualityChecks']>) => {
    if (!capture) return;
    
    try {
      const updatedQualityChecks = {
        powerLevelAcceptable: false,
        allPhotosPresent: false,
        customerVerified: false,
        installationComplete: false,
        serviceActive: false,
        ...capture.qualityChecks,
        ...checks
      };
      
      await homeDropCaptureService.updateHomeDropCapture(captureId, {
        qualityChecks: updatedQualityChecks
      });
      
      // Update local state
      setCapture(prev => prev ? {
        ...prev,
        qualityChecks: updatedQualityChecks
      } : null);
      
    } catch (error) {
      log.error('Failed to update quality checks:', {}, "Page", error as Error);
    }
  }, [capture, captureId]);

  const handleApproval = async (notes?: string) => {
    try {
      await homeDropCaptureService.approveHomeDropCapture(
        captureId,
        'admin-user' // TODO: Use actual admin user ID
      );
      
      // TODO: Add success notification
      setActiveAction(null);
      router.push('/admin/home-drop-reviews');
      
    } catch (error) {
      log.error('Failed to approve capture:', {}, "Page", error as Error);
    }
  };

  const handleRejection = async (notes?: string) => {
    if (!notes) return;
    
    try {
      await homeDropCaptureService.rejectHomeDropCapture(
        captureId,
        'admin-user', // TODO: Use actual admin user ID
        notes
      );
      
      // TODO: Add success notification
      setActiveAction(null);
      router.push('/admin/home-drop-reviews');
      
    } catch (error) {
      log.error('Failed to reject capture:', {}, "Page", error as Error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading capture details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!capture) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Capture not found</h3>
              <p className="text-gray-500 mb-4">The requested home drop capture could not be found.</p>
              <Button onClick={() => router.push('/admin/home-drop-reviews')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reviews
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: HomeDropCapture['status']) => {
    switch (status) {
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{capture.customer.name}</h1>
            <p className="text-gray-600">{capture.customer.address}</p>
          </div>
          <Badge className={getStatusColor(capture.status)}>
            {capture.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          {capture.status === 'pending_approval' && (
            <>
              <Button
                variant="destructive"
                onClick={() => setActiveAction('reject')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => setActiveAction('approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Installation Photos
                <Badge variant="outline">
                  {photos.length}/{capture.requiredPhotos.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <PhotoGallery photos={photos} captureId={captureId} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No photos available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Installation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Installation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="equipment">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="equipment">Equipment</TabsTrigger>
                  <TabsTrigger value="power">Power Readings</TabsTrigger>
                  <TabsTrigger value="service">Service</TabsTrigger>
                </TabsList>
                
                <TabsContent value="equipment" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>ONT Serial Number</Label>
                      <p className="text-sm font-mono mt-1">
                        {capture.installation.equipment.ontSerialNumber || 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <Label>Router Serial Number</Label>
                      <p className="text-sm font-mono mt-1">
                        {capture.installation.equipment.routerSerialNumber || 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <Label>Fiber Length</Label>
                      <p className="text-sm mt-1">
                        {capture.installation.equipment.fiberLength 
                          ? `${capture.installation.equipment.fiberLength}m`
                          : 'Not recorded'
                        }
                      </p>
                    </div>
                    <div>
                      <Label>Connector Type</Label>
                      <p className="text-sm mt-1">
                        {capture.installation.equipment.connectorType || 'Not recorded'}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="power" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Optical Power</Label>
                      <p className="text-lg font-semibold mt-1">
                        {capture.installation.powerReadings.opticalPower 
                          ? `${capture.installation.powerReadings.opticalPower} dBm`
                          : 'Not measured'
                        }
                      </p>
                      {capture.installation.powerReadings.opticalPower && (
                        <Badge 
                          variant={
                            capture.installation.powerReadings.opticalPower >= -8 && 
                            capture.installation.powerReadings.opticalPower <= -30
                              ? "success" 
                              : "destructive"
                          }
                          className="mt-1"
                        >
                          {capture.installation.powerReadings.opticalPower >= -8 && 
                           capture.installation.powerReadings.opticalPower <= -30
                            ? "Within Range"
                            : "Out of Range"
                          }
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Label>Signal Strength</Label>
                      <p className="text-lg font-semibold mt-1">
                        {capture.installation.powerReadings.signalStrength 
                          ? `${capture.installation.powerReadings.signalStrength}%`
                          : 'Not measured'
                        }
                      </p>
                    </div>
                    <div>
                      <Label>Link Quality</Label>
                      <p className="text-lg font-semibold mt-1">
                        {capture.installation.powerReadings.linkQuality 
                          ? `${capture.installation.powerReadings.linkQuality}%`
                          : 'Not measured'
                        }
                      </p>
                    </div>
                    <div>
                      <Label>Test Timestamp</Label>
                      <p className="text-sm mt-1">
                        {capture.installation.powerReadings.testTimestamp
                          ? new Date(capture.installation.powerReadings.testTimestamp).toLocaleString()
                          : 'Not recorded'
                        }
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="service" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Service Type</Label>
                      <p className="text-sm mt-1">
                        {capture.installation.serviceConfig.serviceType || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <Label>Bandwidth</Label>
                      <p className="text-sm mt-1">
                        {capture.installation.serviceConfig.bandwidth || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <Label>VLAN ID</Label>
                      <p className="text-sm font-mono mt-1">
                        {capture.installation.serviceConfig.vlanId || 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <Label>IP Address</Label>
                      <p className="text-sm font-mono mt-1">
                        {capture.installation.serviceConfig.ipAddress || 'DHCP'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Service Status</Label>
                      <Badge 
                        variant={capture.installation.serviceConfig.activationStatus ? "success" : "destructive"}
                      >
                        {capture.installation.serviceConfig.activationStatus ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Geographic Context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location & Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InteractiveMap
                homeDrops={[capture]}
                height="300px"
                showGPSTracker={false}
                showLayerToggle={false}
              />
              
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <Label>GPS Coordinates</Label>
                  <p className="font-mono text-xs mt-1">
                    {capture.gpsLocation 
                      ? `${capture.gpsLocation.latitude.toFixed(6)}, ${capture.gpsLocation.longitude.toFixed(6)}`
                      : 'Not recorded'
                    }
                  </p>
                </div>
                <div>
                  <Label>GPS Accuracy</Label>
                  <p className="text-sm mt-1">
                    {capture.gpsLocation 
                      ? `±${capture.gpsLocation.accuracy}m`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <Label>Connected Pole</Label>
                  <p className="text-sm font-medium mt-1">{capture.poleNumber}</p>
                </div>
                <div>
                  <Label>Distance from Pole</Label>
                  <p className="text-sm mt-1">
                    {capture.distanceFromPole 
                      ? `${Math.round(capture.distanceFromPole)}m`
                      : 'Not calculated'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quality & Actions */}
        <div className="space-y-6">
          {/* Capture Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capture Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Capture ID</span>
                <span className="text-sm font-mono">{capture.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Project</span>
                <span className="text-sm">{capture.projectName || capture.projectId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Technician</span>
                <span className="text-sm">{capture.capturedByName || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Captured</span>
                <span className="text-sm">
                  {capture.capturedAt 
                    ? new Date(capture.capturedAt).toLocaleDateString()
                    : 'In progress'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm">
                  {new Date(capture.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quality Assessment */}
          <QualityChecklist capture={capture} onUpdate={handleQualityUpdate} />

          {/* Notes & Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes & Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {capture.notes && (
                <div>
                  <Label className="text-xs text-gray-500">Installation Notes</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded mt-1">{capture.notes}</p>
                </div>
              )}
              
              {capture.technicalNotes && (
                <div>
                  <Label className="text-xs text-gray-500">Technical Notes</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded mt-1">{capture.technicalNotes}</p>
                </div>
              )}
              
              {capture.customerFeedback && (
                <div>
                  <Label className="text-xs text-gray-500">Customer Feedback</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded mt-1">{capture.customerFeedback}</p>
                </div>
              )}
              
              {capture.approval?.rejectionNotes && (
                <div>
                  <Label className="text-xs text-gray-500">Previous Rejection Notes</Label>
                  <p className="text-sm bg-red-50 p-3 rounded border border-red-200 mt-1">
                    {capture.approval.rejectionNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval/Rejection Dialog */}
      {activeAction && (
        <ApprovalDialog
          capture={capture}
          action={activeAction}
          onSubmit={activeAction === 'approve' ? handleApproval : handleRejection}
          onCancel={() => setActiveAction(null)}
        />
      )}
    </div>
  );
}