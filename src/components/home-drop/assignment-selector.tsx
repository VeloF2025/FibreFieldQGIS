'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, Phone, User, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { homeDropAssignmentService, type HomeDropAssignment } from '@/services/home-drop-assignment.service';
import { cn } from '@/lib/utils';

interface AssignmentSelectorProps {
  technicianId: string;
  onAssignmentSelect: (assignment: HomeDropAssignment) => void;
  className?: string;
}

type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
type AssignmentPriority = 'high' | 'medium' | 'low';

export function AssignmentSelector({ 
  technicianId, 
  onAssignmentSelect, 
  className 
}: AssignmentSelectorProps) {
  const [assignments, setAssignments] = useState<HomeDropAssignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<HomeDropAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AssignmentStatus[]>(['pending', 'accepted']);
  const [filterPriority, setFilterPriority] = useState<AssignmentPriority[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  // Load assignments for technician
  useEffect(() => {
    const loadAssignments = async () => {
      if (!technicianId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const techAssignments = await homeDropAssignmentService.getAssignmentsForTechnician(
          technicianId,
          ['pending', 'accepted', 'in_progress'] // Only show actionable assignments
        );
        
        // Sort by priority and scheduled date
        const sortedAssignments = techAssignments.sort((a, b) => {
          // Priority order: high > medium > low
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (priorityDiff !== 0) return priorityDiff;
          
          // Then by scheduled date (earliest first)
          if (a.scheduledDate && b.scheduledDate) {
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
          } else if (a.scheduledDate) {
            return -1;
          } else if (b.scheduledDate) {
            return 1;
          }
          
          // Finally by assignment date (newest first)
          return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
        });
        
        setAssignments(sortedAssignments);
      } catch (err) {
        log.error('Error loading assignments:', {}, "Assignmentselector", err);
        setError(err instanceof Error ? err.message : 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [technicianId]);

  // Filter assignments based on search and filters
  useEffect(() => {
    let filtered = assignments;

    // Apply status filter
    if (filterStatus.length > 0) {
      filtered = filtered.filter(assignment => filterStatus.includes(assignment.status));
    }

    // Apply priority filter
    if (filterPriority.length > 0) {
      filtered = filtered.filter(assignment => filterPriority.includes(assignment.priority));
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(assignment =>
        assignment.poleNumber.toLowerCase().includes(searchLower) ||
        assignment.customer.name.toLowerCase().includes(searchLower) ||
        assignment.customer.address.toLowerCase().includes(searchLower) ||
        assignment.customer.contactNumber?.toLowerCase().includes(searchLower) ||
        assignment.installationNotes?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAssignments(filtered);
  }, [assignments, searchTerm, filterStatus, filterPriority]);

  const handleAssignmentSelect = (assignment: HomeDropAssignment) => {
    setSelectedAssignment(assignment.id);
    onAssignmentSelect(assignment);
  };

  const toggleStatusFilter = (status: AssignmentStatus) => {
    setFilterStatus(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority: AssignmentPriority) => {
    setFilterPriority(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const getPriorityColor = (priority: AssignmentPriority) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'accepted': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'in_progress': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'completed': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
      case 'cancelled': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      case 'expired': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const isOverdue = (assignment: HomeDropAssignment) => {
    if (!assignment.scheduledDate) return false;
    return new Date(assignment.scheduledDate) < new Date() && assignment.status !== 'completed';
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={cn('assignment-selector', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading assignments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('assignment-selector', className)}>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('assignment-selector space-y-4', className)}>
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by pole number, customer name, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Status Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            {(['pending', 'accepted', 'in_progress'] as AssignmentStatus[]).map(status => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full border transition-colors',
                  filterStatus.includes(status)
                    ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                    : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Priority Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority:</span>
            {(['high', 'medium', 'low'] as AssignmentPriority[]).map(priority => (
              <button
                key={priority}
                onClick={() => togglePriorityFilter(priority)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full border transition-colors',
                  filterPriority.includes(priority)
                    ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                    : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''} found
        </span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Assignment List */}
      <div className="space-y-3">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No assignments found matching your criteria</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              onClick={() => handleAssignmentSelect(assignment)}
              className={cn(
                'p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md',
                selectedAssignment === assignment.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {assignment.poleNumber}
                      </span>
                    </div>
                    
                    <span className={cn(
                      'px-2 py-1 text-xs rounded-full font-medium',
                      getPriorityColor(assignment.priority)
                    )}>
                      {assignment.priority}
                    </span>
                    
                    <span className={cn(
                      'px-2 py-1 text-xs rounded-full font-medium',
                      getStatusColor(assignment.status)
                    )}>
                      {assignment.status.replace('_', ' ')}
                    </span>
                    
                    {isOverdue(assignment) && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {assignment.customer.name}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        {assignment.customer.address}
                      </span>
                    </div>
                    
                    {assignment.customer.contactNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                          {assignment.customer.contactNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Schedule and Notes */}
                  <div className="space-y-1">
                    {assignment.scheduledDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={cn(
                          'text-sm',
                          isOverdue(assignment) 
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        )}>
                          Scheduled: {formatDate(assignment.scheduledDate)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Assigned: {formatDate(assignment.assignedAt)}
                      </span>
                    </div>
                    
                    {assignment.installationNotes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          &quot;{assignment.installationNotes}&quot;
                        </p>
                      </div>
                    )}
                    
                    {assignment.accessNotes && (
                      <div className="mt-2">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Access:</strong> {assignment.accessNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedAssignment === assignment.id && (
                  <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {filteredAssignments.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            💡 <strong>Tip:</strong> Select an assignment above to begin the home drop installation capture process.
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
            <p>• High priority assignments are shown first</p>
            <p>• Overdue assignments are highlighted in red</p>
            <p>• Contact customer before starting if phone number is available</p>
          </div>
        </div>
      )}
    </div>
  );
}