'use client';

import React, { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  AlertCircle,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  MoreHorizontal,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Navigation,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { 
  HomeDropAssignment,
  AssignmentStatus,
  AssignmentPriority 
} from '@/services/home-drop-assignment.service';

/**
 * Assignment Card Props
 */
interface AssignmentCardProps {
  assignment: HomeDropAssignment;
  selected?: boolean;
  showPoleConnection?: boolean;     // Show connected pole number
  showCustomerInfo?: boolean;       // Show customer details
  showProgressIndicator?: boolean;  // Show workflow progress
  showActions?: boolean;            // Show action buttons
  compact?: boolean;                // Compact view
  onSelect?: (assignment: HomeDropAssignment) => void;
  onAction?: (action: string, assignmentId: string) => void;
  onToggleSelection?: (assignmentId: string) => void;
  className?: string;
}

/**
 * Assignment Card Component
 * 
 * Displays assignment information with pole connection, status,
 * customer details, and available actions.
 */
export function AssignmentCard({
  assignment,
  selected = false,
  showPoleConnection = true,
  showCustomerInfo = true,
  showProgressIndicator = true,
  showActions = true,
  compact = false,
  onSelect,
  onAction,
  onToggleSelection,
  className
}: AssignmentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate if assignment is overdue
  const isOverdue = assignment.scheduledDate 
    ? new Date(assignment.scheduledDate) < new Date() && !['completed', 'cancelled'].includes(assignment.status)
    : false;

  // Calculate time since assignment
  const timeAgo = formatDistanceToNow(new Date(assignment.assignedAt), { addSuffix: true });

  // Get status display info
  const getStatusInfo = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Circle,
          label: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          variant: 'secondary' as const
        };
      case 'accepted':
        return {
          icon: UserCheck,
          label: 'Accepted',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          variant: 'outline' as const
        };
      case 'in_progress':
        return {
          icon: Play,
          label: 'In Progress',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          variant: 'default' as const
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          variant: 'success' as const
        };
      case 'cancelled':
        return {
          icon: Pause,
          label: 'Cancelled',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          variant: 'destructive' as const
        };
      case 'expired':
        return {
          icon: Clock,
          label: 'Expired',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          variant: 'destructive' as const
        };
      default:
        return {
          icon: Circle,
          label: status,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          variant: 'secondary' as const
        };
    }
  };

  // Get priority display info
  const getPriorityInfo = (priority: AssignmentPriority) => {
    switch (priority) {
      case 'high':
        return {
          label: 'High Priority',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          variant: 'destructive' as const
        };
      case 'medium':
        return {
          label: 'Medium Priority',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          variant: 'default' as const
        };
      case 'low':
        return {
          label: 'Low Priority',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          variant: 'secondary' as const
        };
      default:
        return {
          label: priority,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          variant: 'secondary' as const
        };
    }
  };

  const statusInfo = getStatusInfo(assignment.status);
  const priorityInfo = getPriorityInfo(assignment.priority);

  // Handle card click
  const handleCardClick = () => {
    if (onSelect) {
      onSelect(assignment);
    }
  };

  // Handle action
  const handleAction = (action: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onAction) {
      onAction(action, assignment.id);
    }
  };

  // Handle selection toggle
  const handleSelectionToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(assignment.id);
    }
  };

  // Get available actions based on status
  const getAvailableActions = () => {
    const actions: Array<{
      key: string;
      label: string;
      icon: React.ComponentType<any>;
      variant?: 'default' | 'destructive' | 'outline';
    }> = [];

    switch (assignment.status) {
      case 'pending':
        actions.push(
          { key: 'accept', label: 'Accept', icon: UserCheck },
          { key: 'reassign', label: 'Reassign', icon: User, variant: 'outline' },
          { key: 'cancel', label: 'Cancel', icon: Trash2, variant: 'destructive' }
        );
        break;
      case 'accepted':
        actions.push(
          { key: 'start', label: 'Start Work', icon: Play },
          { key: 'reassign', label: 'Reassign', icon: User, variant: 'outline' },
          { key: 'cancel', label: 'Cancel', icon: Trash2, variant: 'destructive' }
        );
        break;
      case 'in_progress':
        actions.push(
          { key: 'complete', label: 'Mark Complete', icon: CheckCircle2 },
          { key: 'pause', label: 'Pause', icon: Pause, variant: 'outline' }
        );
        break;
      case 'completed':
        actions.push(
          { key: 'view-details', label: 'View Details', icon: Eye, variant: 'outline' }
        );
        break;
    }

    // Common actions
    actions.push(
      { key: 'navigate', label: 'Get Directions', icon: Navigation, variant: 'outline' },
      { key: 'edit', label: 'Edit', icon: Edit, variant: 'outline' }
    );

    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <Card 
      className={cn(
        'relative transition-all duration-200 hover:shadow-md cursor-pointer',
        selected && 'ring-2 ring-blue-500',
        isOverdue && 'border-red-200 bg-red-50/30',
        compact && 'p-3',
        className
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection checkbox */}
      {onToggleSelection && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelectionToggle}
            onClick={handleSelectionToggle}
          />
        </div>
      )}

      <CardHeader className={cn('pb-2', compact && 'pb-1', onToggleSelection && 'pl-8')}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Assignment ID and Priority */}
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                #{assignment.id.split('-').pop()?.toUpperCase()}
              </h4>
              {assignment.priority !== 'medium' && (
                <Badge variant={priorityInfo.variant} className="text-xs">
                  {assignment.priority.toUpperCase()}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  OVERDUE
                </Badge>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <statusInfo.icon className={cn('w-4 h-4', statusInfo.color)} />
              <Badge variant={statusInfo.variant} className="text-xs">
                {statusInfo.label}
              </Badge>
              <span className="text-xs text-gray-500">{timeAgo}</span>
            </div>
          </div>

          {/* Actions Menu */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableActions.slice(0, 2).map((action) => (
                  <DropdownMenuItem
                    key={action.key}
                    onClick={(e) => handleAction(action.key, e)}
                  >
                    <action.icon className="w-4 h-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
                {availableActions.length > 2 && (
                  <>
                    <DropdownMenuSeparator />
                    {availableActions.slice(2).map((action) => (
                      <DropdownMenuItem
                        key={action.key}
                        onClick={(e) => handleAction(action.key, e)}
                      >
                        <action.icon className="w-4 h-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn('pb-3', compact && 'pb-2')}>
        {/* Pole Connection */}
        {showPoleConnection && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Zap className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Connected to Pole</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                #{assignment.poleNumber}
              </p>
            </div>
          </div>
        )}

        {/* Customer Information */}
        {showCustomerInfo && (
          <div className="space-y-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {assignment.customer.name}
              </p>
              <div className="flex items-start gap-1 mt-1">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {assignment.customer.address}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            {(assignment.customer.contactNumber || assignment.customer.email) && (
              <div className="flex items-center gap-4 text-sm">
                {assignment.customer.contactNumber && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {assignment.customer.contactNumber}
                    </span>
                  </div>
                )}
                {assignment.customer.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {assignment.customer.email}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Date */}
        {assignment.scheduledDate && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className={cn('w-4 h-4', isOverdue ? 'text-red-500' : 'text-blue-600')} />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className={cn(
                'text-sm font-medium',
                isOverdue ? 'text-red-600' : 'text-blue-600'
              )}>
                {new Date(assignment.scheduledDate).toLocaleDateString()} at{' '}
                {new Date(assignment.scheduledDate).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        )}

        {/* Installation Notes */}
        {assignment.installationNotes && !compact && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {assignment.installationNotes}
            </p>
          </div>
        )}
      </CardContent>

      {/* Footer with Quick Actions */}
      {!compact && availableActions.length > 0 && (
        <CardFooter className="pt-0">
          <div className="flex items-center gap-2 w-full">
            {availableActions.slice(0, 2).map((action) => (
              <Button
                key={action.key}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={(e) => handleAction(action.key, e)}
                className="flex-1"
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardFooter>
      )}

      {/* Progress Indicator */}
      {showProgressIndicator && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className={cn(
              'h-full transition-all duration-300',
              assignment.status === 'pending' && 'w-1/4 bg-yellow-500',
              assignment.status === 'accepted' && 'w-2/4 bg-blue-500',
              assignment.status === 'in_progress' && 'w-3/4 bg-blue-500',
              assignment.status === 'completed' && 'w-full bg-green-500',
              assignment.status === 'cancelled' && 'w-full bg-red-500',
              assignment.status === 'expired' && 'w-full bg-red-500'
            )}
          />
        </div>
      )}

      {/* Hover overlay for selection */}
      {isHovered && onToggleSelection && (
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none rounded-lg" />
      )}
    </Card>
  );
}

/**
 * Compact Assignment Card for list views
 */
export function CompactAssignmentCard(props: AssignmentCardProps) {
  return <AssignmentCard {...props} compact={true} showActions={false} />;
}

/**
 * Assignment Card with minimal information for mobile views
 */
export function MinimalAssignmentCard({
  assignment,
  onSelect,
  className
}: {
  assignment: HomeDropAssignment;
  onSelect?: (assignment: HomeDropAssignment) => void;
  className?: string;
}) {
  const statusInfo = {
    pending: { icon: Circle, color: 'text-yellow-600' },
    accepted: { icon: UserCheck, color: 'text-blue-600' },
    in_progress: { icon: Play, color: 'text-blue-600' },
    completed: { icon: CheckCircle2, color: 'text-green-600' },
    cancelled: { icon: Pause, color: 'text-gray-600' },
    expired: { icon: Clock, color: 'text-red-600' }
  }[assignment.status] || { icon: Circle, color: 'text-gray-600' };

  const StatusIcon = statusInfo.icon;

  return (
    <Card 
      className={cn('p-4 cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={() => onSelect?.(assignment)}
    >
      <div className="flex items-center gap-3">
        <StatusIcon className={cn('w-5 h-5', statusInfo.color)} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {assignment.customer.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            Pole #{assignment.poleNumber}
          </p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-xs">
            {assignment.status.replace('_', ' ').toUpperCase()}
          </Badge>
          {assignment.priority === 'high' && (
            <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
          )}
        </div>
      </div>
    </Card>
  );
}