'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Circle,
  RefreshCw,
  Download,
  Upload,
  Plus,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  homeDropAssignmentService, 
  type AssignmentFilterOptions,
  type AssignmentStatistics,
  type AssignmentStatus,
  type AssignmentPriority
} from '@/services/home-drop-assignment.service';
import type { HomeDropAssignment } from '@/types/home-drop.types';
import { AssignmentCard } from './assignment-card';

/**
 * Assignment List View Props
 */
interface AssignmentListProps {
  technicianId?: string;           // Filter by technician (optional)
  showFilters?: boolean;           // Show filter controls
  showStats?: boolean;             // Show statistics
  enableBulkActions?: boolean;     // Enable bulk operations
  onAssignmentSelect?: (assignment: HomeDropAssignment) => void;
  onAssignmentAction?: (action: string, assignmentId: string) => void;
  className?: string;
}

/**
 * Filter State
 */
interface FilterState {
  search: string;
  status: AssignmentStatus[];
  priority: AssignmentPriority[];
  assignedTo: string[];
  dateRange: {
    start: string;
    end: string;
  };
  overdue: boolean;
}

/**
 * Assignment List Component
 * 
 * Provides comprehensive assignment management with filtering,
 * search, bulk operations, and real-time updates.
 */
export function AssignmentList({
  technicianId,
  showFilters = true,
  showStats = true,
  enableBulkActions = false,
  onAssignmentSelect,
  onAssignmentAction,
  className
}: AssignmentListProps) {
  // State
  const [assignments, setAssignments] = useState<HomeDropAssignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<HomeDropAssignment[]>([]);
  const [statistics, setStatistics] = useState<AssignmentStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: [],
    priority: [],
    assignedTo: technicianId ? [technicianId] : [],
    dateRange: {
      start: '',
      end: ''
    },
    overdue: false
  });

  // Load assignments
  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      
      let assignmentList: HomeDropAssignment[];
      
      if (technicianId) {
        assignmentList = await homeDropAssignmentService.getAssignmentsForTechnician(technicianId);
      } else {
        assignmentList = await homeDropAssignmentService.getAllAssignments();
      }

      setAssignments(assignmentList);
      
      if (showStats) {
        const stats = await homeDropAssignmentService.getStatistics();
        setStatistics(stats);
      }
    } catch (error) {
      log.error('Failed to load assignments:', {}, "Assignmentlist", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters and search
  const applyFilters = useMemo(() => {
    let filtered = assignments;

    // Text search
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(assignment =>
        assignment.id.toLowerCase().includes(searchTerm) ||
        assignment.poleNumber.toLowerCase().includes(searchTerm) ||
        assignment.customer.name.toLowerCase().includes(searchTerm) ||
        assignment.customer.address.toLowerCase().includes(searchTerm) ||
        assignment.installationNotes?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(assignment =>
        filters.status.includes(assignment.status)
      );
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(assignment =>
        filters.priority.includes(assignment.priority)
      );
    }

    // Date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(assignment => {
        const assignedDate = new Date(assignment.assignedAt);
        return assignedDate >= startDate && assignedDate <= endDate;
      });
    }

    // Overdue filter
    if (filters.overdue) {
      const now = new Date();
      filtered = filtered.filter(assignment =>
        assignment.scheduledDate &&
        new Date(assignment.scheduledDate) < now &&
        !['completed', 'cancelled'].includes(assignment.status)
      );
    }

    // Tab filter
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending':
          filtered = filtered.filter(a => a.status === 'pending');
          break;
        case 'in-progress':
          filtered = filtered.filter(a => ['accepted', 'in_progress'].includes(a.status));
          break;
        case 'completed':
          filtered = filtered.filter(a => a.status === 'completed');
          break;
      }
    }

    return filtered;
  }, [assignments, filters, activeTab]);

  // Update filtered assignments when filters change
  useEffect(() => {
    setFilteredAssignments(applyFilters);
  }, [applyFilters]);

  // Load data on mount
  useEffect(() => {
    loadAssignments();
  }, [technicianId]);

  // Set up real-time updates
  useEffect(() => {
    const watchFunction = technicianId
      ? homeDropAssignmentService.watchAssignmentsForTechnician(technicianId)
      : homeDropAssignmentService.watchAllAssignments();

    const subscription = watchFunction.subscribe((updatedAssignments: HomeDropAssignment[]) => {
      setAssignments(updatedAssignments);
    });

    return () => subscription?.unsubscribe?.();
  }, [technicianId]);

  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  // Handle filter change
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle assignment selection
  const handleAssignmentSelect = (assignment: HomeDropAssignment) => {
    if (onAssignmentSelect) {
      onAssignmentSelect(assignment);
    }
  };

  // Handle assignment action
  const handleAssignmentAction = (action: string, assignmentId: string) => {
    if (onAssignmentAction) {
      onAssignmentAction(action, assignmentId);
    }
  };

  // Toggle assignment selection for bulk operations
  const toggleAssignmentSelection = (assignmentId: string) => {
    setSelectedAssignments(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(assignmentId)) {
        newSelection.delete(assignmentId);
      } else {
        newSelection.add(assignmentId);
      }
      return newSelection;
    });
  };

  // Select all assignments
  const selectAllAssignments = () => {
    setSelectedAssignments(new Set(filteredAssignments.map(a => a.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedAssignments(new Set());
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
        return 'outline';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'destructive';
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Get priority badge variant
  const getPriorityBadgeVariant = (priority: AssignmentPriority) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className={cn('assignment-list space-y-6', className)}>
      {/* Statistics */}
      {showStats && statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Circle className="w-4 h-4 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <RefreshCw className="w-4 h-4 text-blue-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {statistics.overdue > 0 && (
            <Card className="md:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{statistics.overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters and Search */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Assignments</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadAssignments}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Quick Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search assignments, pole numbers, customers..."
                    value={filters.search}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={filters.overdue ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange('overdue', !filters.overdue)}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Overdue ({statistics?.overdue || 0})
                </Button>
                
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({assignments.filter(a => a.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="in-progress">
                  In Progress ({assignments.filter(a => ['accepted', 'in_progress'].includes(a.status)).length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({assignments.filter(a => a.status === 'completed').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {enableBulkActions && selectedAssignments.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedAssignments.size} assignment{selectedAssignments.size !== 1 ? 's' : ''} selected
                </span>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Reassign
                </Button>
                <Button variant="outline" size="sm">
                  Update Priority
                </Button>
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">No assignments found</h3>
                  <p className="text-gray-600 mt-1">
                    {filters.search || filters.status.length > 0 || filters.overdue
                      ? 'Try adjusting your filters to see more assignments.'
                      : 'No assignments have been created yet.'}
                  </p>
                </div>
                {!technicianId && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Assignment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                selected={selectedAssignments.has(assignment.id)}
                onSelect={handleAssignmentSelect}
                onAction={handleAssignmentAction}
                onToggleSelection={enableBulkActions ? toggleAssignmentSelection : undefined}
                showPoleConnection={true}
                showCustomerInfo={true}
                showProgressIndicator={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load more or pagination can be added here */}
      {filteredAssignments.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline">
            Load More Assignments
          </Button>
        </div>
      )}
    </div>
  );
}