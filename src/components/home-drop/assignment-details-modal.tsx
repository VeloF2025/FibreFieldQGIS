'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText,
  Zap,
  AlertCircle,
  CheckCircle2,
  Circle,
  Play,
  Navigation,
  Edit,
  UserCheck,
  Pause,
  RotateCcw,
  ExternalLink,
  Copy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle 
} from '@/components/ui/card';
import { 
  homeDropAssignmentService 
} from '@/services/home-drop-assignment.service';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { poleCaptureService } from '@/services/pole-capture.service';
import type { 
  HomeDropAssignment,
  HomeDropCapture 
} from '@/types/home-drop.types';
import type { PoleCapture } from '@/services/pole-capture.service';

/**
 * Assignment Details Modal Props
 */
interface AssignmentDetailsModalProps {
  assignmentId?: string;
  assignment?: HomeDropAssignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (action: string, assignmentId: string) => void;
  showActions?: boolean;
  readOnly?: boolean;
}

/**
 * Assignment Details Modal Component
 * 
 * Shows comprehensive assignment information including:
 * - Assignment details and status
 * - Connected pole information
 * - Customer information and location
 * - Installation progress
 * - Timeline and history
 * - Available actions
 */
export function AssignmentDetailsModal({
  assignmentId,
  assignment: propAssignment,
  open,
  onOpenChange,
  onAction,
  showActions = true,
  readOnly = false
}: AssignmentDetailsModalProps) {
  // State
  const [assignment, setAssignment] = useState<HomeDropAssignment | null>(propAssignment || null);
  const [homeDropCapture, setHomeDropCapture] = useState<HomeDropCapture | null>(null);
  const [poleCapture, setPoleCapture] = useState<PoleCapture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'history'>('overview');

  // Load assignment data
  const loadAssignmentData = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Load assignment
      const assignmentData = await homeDropAssignmentService.getAssignment(id);
      if (!assignmentData) {
        throw new Error(`Assignment ${id} not found`);
      }
      setAssignment(assignmentData);

      // Load home drop capture
      const homeDropData = await homeDropCaptureService.getHomeDropCapture(assignmentData.homeDropId);
      setHomeDropCapture(homeDropData || null);

      // Load pole capture
      const poleData = await poleCaptureService.getPoleCapture(assignmentData.poleNumber);
      setPoleCapture(poleData || null);

    } catch (error) {
      console.error('Failed to load assignment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      if (assignmentId && assignmentId !== assignment?.id) {
        loadAssignmentData(assignmentId);
      } else if (propAssignment && propAssignment.id !== assignment?.id) {
        setAssignment(propAssignment);
        // Load related data
        homeDropCaptureService.getHomeDropCapture(propAssignment.homeDropId).then(setHomeDropCapture);
        poleCaptureService.getPoleCapture(propAssignment.poleNumber).then(setPoleCapture);
      }
    }
  }, [open, assignmentId, propAssignment]);

  // Handle action
  const handleAction = (action: string) => {
    if (assignment && onAction) {
      onAction(action, assignment.id);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Circle, label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case 'accepted':
        return { icon: UserCheck, label: 'Accepted', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'in_progress':
        return { icon: Play, label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'completed':
        return { icon: CheckCircle2, label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'cancelled':
        return { icon: Pause, label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100' };
      case 'expired':
        return { icon: Clock, label: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { icon: Circle, label: status, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  // Get available actions
  const getAvailableActions = () => {
    if (!assignment) return [];

    const actions: Array<{
      key: string;
      label: string;
      icon: React.ComponentType<any>;
      variant?: 'default' | 'destructive' | 'outline';
      primary?: boolean;
    }> = [];

    switch (assignment.status) {
      case 'pending':
        actions.push(
          { key: 'accept', label: 'Accept Assignment', icon: UserCheck, primary: true },
          { key: 'reassign', label: 'Reassign', icon: User, variant: 'outline' },
          { key: 'cancel', label: 'Cancel Assignment', icon: X, variant: 'destructive' }
        );
        break;
      case 'accepted':
        actions.push(
          { key: 'start', label: 'Start Work', icon: Play, primary: true },
          { key: 'reassign', label: 'Reassign', icon: User, variant: 'outline' }
        );
        break;
      case 'in_progress':
        actions.push(
          { key: 'complete', label: 'Mark Complete', icon: CheckCircle2, primary: true },
          { key: 'pause', label: 'Pause Work', icon: Pause, variant: 'outline' }
        );
        break;
      case 'completed':
        actions.push(
          { key: 'reopen', label: 'Reopen', icon: RotateCcw, variant: 'outline' }
        );
        break;
    }

    // Common actions
    if (assignment.status !== 'completed') {
      actions.push({ key: 'edit', label: 'Edit Details', icon: Edit, variant: 'outline' });
    }

    return actions;
  };

  if (!assignment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Assignment not found</h3>
              <p className="text-gray-600 mt-2">
                The requested assignment could not be loaded.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusInfo = getStatusInfo(assignment.status);
  const StatusIcon = statusInfo.icon;
  const availableActions = getAvailableActions();
  const isOverdue = assignment.scheduledDate 
    ? new Date(assignment.scheduledDate) < new Date() && !['completed', 'cancelled'].includes(assignment.status)
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={cn('w-6 h-6', statusInfo.color)} />
              <div>
                <DialogTitle className="text-xl">
                  Assignment #{assignment.id.split('-').pop()?.toUpperCase()}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={statusInfo.bgColor}>
                    {statusInfo.label}
                  </Badge>
                  {assignment.priority !== 'medium' && (
                    <Badge variant={assignment.priority === 'high' ? 'destructive' : 'secondary'}>
                      {assignment.priority.toUpperCase()} PRIORITY
                    </Badge>
                  )}
                  {isOverdue && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      OVERDUE
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(assignment.id)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Assignment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Assignment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Assigned By</p>
                        <p className="font-medium">{assignment.assignedBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Assigned To</p>
                        <p className="font-medium">{assignment.assignedTo}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Assigned</p>
                      <p className="font-medium">
                        {new Date(assignment.assignedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(assignment.assignedAt), { addSuffix: true })}
                      </p>
                    </div>

                    {assignment.scheduledDate && (
                      <div>
                        <p className="text-sm text-gray-600">Scheduled Date</p>
                        <p className={cn(
                          'font-medium',
                          isOverdue ? 'text-red-600' : 'text-gray-900'
                        )}>
                          {new Date(assignment.scheduledDate).toLocaleString()}
                        </p>
                        {isOverdue && (
                          <p className="text-xs text-red-500 font-medium">
                            Overdue by {formatDistanceToNow(new Date(assignment.scheduledDate))}
                          </p>
                        )}
                      </div>
                    )}

                    {(assignment.acceptedAt || assignment.startedAt || assignment.completedAt) && (
                      <div className="space-y-2">
                        <Separator />
                        {assignment.acceptedAt && (
                          <div>
                            <p className="text-sm text-gray-600">Accepted</p>
                            <p className="text-sm">{new Date(assignment.acceptedAt).toLocaleString()}</p>
                          </div>
                        )}
                        {assignment.startedAt && (
                          <div>
                            <p className="text-sm text-gray-600">Started</p>
                            <p className="text-sm">{new Date(assignment.startedAt).toLocaleString()}</p>
                          </div>
                        )}
                        {assignment.completedAt && (
                          <div>
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="text-sm">{new Date(assignment.completedAt).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Connected Pole Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      Connected Pole
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Pole Number</p>
                        <p className="font-medium text-lg">#{assignment.poleNumber}</p>
                      </div>
                      
                      {poleCapture && (
                        <>
                          <div>
                            <p className="text-sm text-gray-600">Pole Status</p>
                            <Badge variant="outline">
                              {poleCapture.status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </div>
                          
                          {poleCapture.gpsLocation && (
                            <div>
                              <p className="text-sm text-gray-600">Pole Location</p>
                              <p className="text-sm">
                                {poleCapture.gpsLocation.latitude.toFixed(6)}, {poleCapture.gpsLocation.longitude.toFixed(6)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Accuracy: ±{poleCapture.gpsLocation.accuracy}m
                              </p>
                            </div>
                          )}
                          
                          <Button variant="outline" size="sm" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Pole Details
                          </Button>
                        </>
                      )}
                      
                      {!poleCapture && (
                        <div className="text-center py-4">
                          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Pole information not available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Customer Name</p>
                        <p className="font-medium text-lg">{assignment.customer.name}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                          <p className="text-sm leading-relaxed">{assignment.customer.address}</p>
                        </div>
                      </div>
                      
                      {assignment.customer.accountNumber && (
                        <div>
                          <p className="text-sm text-gray-600">Account Number</p>
                          <p className="font-medium">{assignment.customer.accountNumber}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {assignment.customer.contactNumber && (
                        <div>
                          <p className="text-sm text-gray-600">Phone Number</p>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <p className="font-medium">{assignment.customer.contactNumber}</p>
                            <Button variant="outline" size="sm">
                              Call
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {assignment.customer.email && (
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <p className="font-medium">{assignment.customer.email}</p>
                            <Button variant="outline" size="sm">
                              Email
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Installation Notes */}
              {(assignment.installationNotes || assignment.accessNotes) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes & Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignment.installationNotes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Installation Notes</p>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <p className="text-sm">{assignment.installationNotes}</p>
                        </div>
                      </div>
                    )}
                    
                    {assignment.accessNotes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Access Instructions</p>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm">{assignment.accessNotes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Installation Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {homeDropCapture ? (
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">Home Drop Capture Available</h3>
                        <p className="text-gray-600 mt-2">
                          Installation progress is being tracked.
                        </p>
                        <Button className="mt-4">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Home Drop Details
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Circle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No Progress Yet</h3>
                      <p className="text-gray-600 mt-2">
                        Installation has not started yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Assignment Created */}
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Assignment Created</p>
                        <p className="text-xs text-gray-500">
                          {new Date(assignment.assignedAt).toLocaleString()} by {assignment.assignedBy}
                        </p>
                      </div>
                    </div>

                    {/* Status Changes */}
                    {assignment.acceptedAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Assignment Accepted</p>
                          <p className="text-xs text-gray-500">
                            {new Date(assignment.acceptedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {assignment.startedAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Work Started</p>
                          <p className="text-xs text-gray-500">
                            {new Date(assignment.startedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {assignment.completedAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Assignment Completed</p>
                          <p className="text-xs text-gray-500">
                            {new Date(assignment.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {assignment.status === 'pending' && (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No activity yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer with Actions */}
        {showActions && availableActions.length > 0 && (
          <DialogFooter className="flex-shrink-0">
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Close
              </Button>
              {availableActions.map((action) => (
                <Button
                  key={action.key}
                  variant={action.variant || (action.primary ? 'default' : 'outline')}
                  onClick={() => handleAction(action.key)}
                  className={action.primary ? 'flex-2' : 'flex-1'}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}