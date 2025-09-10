'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  MapPin,
  Camera,
  User,
  Calendar,
  Zap,
  Signal,
  Download,
  ExternalLink
} from 'lucide-react';
import type { HomeDropCapture, HomeDropPhotoStorage } from '@/types/home-drop.types';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';

/**
 * Review Details Modal Component
 * 
 * Displays detailed information about a home drop capture for admin review.
 * Includes photos, GPS data, installation details, and approval actions.
 * 
 * Line count target: <200 lines
 */

interface Props {
  capture: HomeDropCapture | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (captureId: string, reason: string) => Promise<void>;
  onReject: (captureId: string, reason: string) => Promise<void>;
}

export function ReviewDetailsModal({ capture, isOpen, onClose, onApprove, onReject }: Props) {
  const [photos, setPhotos] = useState<HomeDropPhotoStorage[]>([]);
  const [approvalReason, setApprovalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (capture && isOpen) {
      loadPhotos();
    }
  }, [capture, isOpen]);

  const loadPhotos = async () => {
    if (!capture) return;
    
    try {
      const capturePhotos = await homeDropCaptureService.getHomeDropPhotos(capture.id);
      setPhotos(capturePhotos);
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const handleApprove = async () => {
    if (!capture) return;
    
    setIsSubmitting(true);
    try {
      await onApprove(capture.id, approvalReason || 'Approved by admin');
      onClose();
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!capture || !rejectionReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onReject(capture.id, rejectionReason);
      onClose();
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!capture) return null;

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPhotoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'power-meter-test': 'Power Meter Reading',
      'fibertime-setup-confirmation': 'Fibertime Setup',
      'fibertime-device-actions': 'Device Actions',
      'router-4-lights-status': 'Router Status'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Home Drop Review - Pole {capture.poleNumber}
            {getStatusBadge(capture.approvalStatus)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{capture.customer?.name || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{capture.customer?.address || 'Not provided'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Capture Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Capture Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{capture.capturedBy || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{formatDate(capture.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{photos.length} photos</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* GPS Information */}
            {capture.gpsLocation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">GPS Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Latitude:</span>
                      <div className="font-mono">{capture.gpsLocation.latitude.toFixed(6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Longitude:</span>
                      <div className="font-mono">{capture.gpsLocation.longitude.toFixed(6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Accuracy:</span>
                      <div>{capture.gpsLocation.accuracy?.toFixed(1)}m</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Distance from Pole:</span>
                      <div>{capture.distanceFromPole?.toFixed(1) || 'N/A'}m</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photos.map((photo) => (
                <Card key={photo.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{getPhotoTypeLabel(photo.type)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <Camera className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Captured: {formatDate(photo.metadata?.capturedAt || photo.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {photos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No photos available for this capture.
              </div>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            {/* Installation Details */}
            {capture.installation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Installation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {capture.installation.powerReadings && (
                    <div>
                      <span className="text-gray-500">Optical Power:</span>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {capture.installation.powerReadings.opticalPower} dBm
                      </div>
                    </div>
                  )}
                  
                  {capture.installation.serviceConfig && (
                    <div>
                      <span className="text-gray-500">Service Status:</span>
                      <div className="flex items-center gap-2">
                        <Signal className="h-4 w-4" />
                        {capture.installation.serviceConfig.activationStatus || 'Not configured'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {capture.approvalStatus === 'pending' && (
              <div className="space-y-4">
                {/* Approval Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-green-700">Approve Capture</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Optional approval notes..."
                      value={approvalReason}
                      onChange={(e) => setApprovalReason(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                    <Button 
                      onClick={handleApprove} 
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Approving...' : 'Approve Capture'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Rejection Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-red-700">Reject Capture</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Please provide reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="resize-none"
                      rows={3}
                      required
                    />
                    <Button 
                      onClick={handleReject} 
                      disabled={isSubmitting || !rejectionReason.trim()}
                      variant="destructive"
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Rejecting...' : 'Reject Capture'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {capture.approvalStatus === 'approved' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-green-600">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                    <p>This capture has been approved.</p>
                    {capture.approvedBy && (
                      <p className="text-sm text-gray-500">Approved by {capture.approvedBy}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {capture.approvalStatus === 'rejected' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-red-600">
                    <XCircle className="h-12 w-12 mx-auto mb-2" />
                    <p>This capture has been rejected.</p>
                    {capture.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-left">
                        <strong>Reason:</strong> {capture.rejectionReason}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}