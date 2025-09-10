/**
 * Assignment Step Component - Assignment selection interface
 * 
 * Features:
 * - Assignment selection with filtering
 * - Assignment details display
 * - Priority and due date validation
 * - Service area information
 */

'use client';

import React from 'react';
import { ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { HomeDropAssignment } from '@/types/home-drop.types';
import { log } from '@/lib/logger';

interface AssignmentStepComponentProps {
  assignments: HomeDropAssignment[];
  selectedAssignment: HomeDropAssignment | null;
  onAssignmentSelect: (assignment: HomeDropAssignment | null) => void;
  onNext: () => void;
  canProceed: boolean;
}

export function AssignmentStepComponent({
  assignments,
  selectedAssignment,
  onAssignmentSelect,
  onNext,
  canProceed
}: AssignmentStepComponentProps) {

  const handleAssignmentChange = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    onAssignmentSelect(assignment || null);
    
    if (assignment) {
      log.info('Assignment selected', { 
        assignmentId: assignment.id,
        serviceArea: assignment.serviceArea,
        priority: assignment.priority
      }, 'AssignmentStepComponent');
    }
  };

  const getPriorityVariant = (priority: string): "destructive" | "secondary" | "default" => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatDueDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const isDueSoon = (dateString: string): boolean => {
    try {
      const dueDate = new Date(dateString);
      const now = new Date();
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours <= 24 && diffHours > 0; // Due within 24 hours
    } catch {
      return false;
    }
  };

  const isOverdue = (dateString: string): boolean => {
    try {
      const dueDate = new Date(dateString);
      const now = new Date();
      return dueDate < now;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Selection */}
      <div>
        <Label htmlFor="assignment" className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4" />
          Select Assignment
        </Label>
        
        <Select onValueChange={handleAssignmentChange} value={selectedAssignment?.id || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an assignment..." />
          </SelectTrigger>
          <SelectContent>
            {assignments.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No assignments available
              </div>
            ) : (
              assignments.map((assignment) => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  <div className="w-full">
                    <div className="font-medium">{assignment.serviceArea}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Due: {formatDueDate(assignment.dueDate)}</span>
                      <Badge 
                        variant={getPriorityVariant(assignment.priority)}
                        className="text-xs"
                      >
                        {assignment.priority}
                      </Badge>
                      {isOverdue(assignment.dueDate) && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                      {isDueSoon(assignment.dueDate) && !isOverdue(assignment.dueDate) && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                          Due Soon
                        </Badge>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Assignment Details */}
      {selectedAssignment && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium mb-3 text-blue-900">Assignment Details</h3>
          <div className="space-y-3">
            {/* Service Area */}
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-blue-800">Service Area:</span>
              <span className="text-sm text-blue-700 text-right max-w-xs">
                {selectedAssignment.serviceArea}
              </span>
            </div>

            {/* Priority and Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Priority:</span>
              <div className="flex items-center gap-2">
                <Badge variant={getPriorityVariant(selectedAssignment.priority)}>
                  {selectedAssignment.priority.toUpperCase()}
                </Badge>
                {isOverdue(selectedAssignment.dueDate) && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Due Date:</span>
              <span className={`text-sm ${
                isOverdue(selectedAssignment.dueDate) 
                  ? 'text-red-600 font-medium' 
                  : isDueSoon(selectedAssignment.dueDate)
                    ? 'text-yellow-600 font-medium'
                    : 'text-blue-700'
              }`}>
                {formatDueDate(selectedAssignment.dueDate)}
              </span>
            </div>

            {/* Estimated Duration */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Estimated Duration:</span>
              <span className="text-sm text-blue-700">
                {selectedAssignment.estimatedDuration}
              </span>
            </div>

            {/* Requirements (if available) */}
            {selectedAssignment.requirements && selectedAssignment.requirements.length > 0 && (
              <div>
                <span className="text-sm font-medium text-blue-800 block mb-1">Requirements:</span>
                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                  {selectedAssignment.requirements.map((req, index) => (
                    <li key={index} className="list-disc">
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment Summary Stats */}
      {assignments.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Available Assignments</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{assignments.length}</div>
              <div className="text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">
                {assignments.filter(a => a.priority === 'high').length}
              </div>
              <div className="text-gray-600">High Priority</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-600">
                {assignments.filter(a => isDueSoon(a.dueDate)).length}
              </div>
              <div className="text-gray-600">Due Soon</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">
                {assignments.filter(a => isOverdue(a.dueDate)).length}
              </div>
              <div className="text-gray-600">Overdue</div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {assignments.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            No assignments are currently available. Please contact your supervisor or refresh the page.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="min-w-24"
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}