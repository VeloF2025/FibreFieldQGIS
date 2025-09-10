'use client';

import React, { useState } from 'react';
import { AssignmentList, AssignmentDetailsModal } from '@/components/home-drop';
import type { HomeDropAssignment } from '@/types/home-drop.types';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { log } from '@/lib/logger';

/**
 * Home Drop Assignments Demo Page
 * 
 * Demonstrates the complete Home Drop Assignment Management System
 * with all features including filtering, search, and assignment actions.
 */
export default function HomeDropAssignmentsPage() {
  const [selectedAssignment, setSelectedAssignment] = useState<HomeDropAssignment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Handle assignment selection
  const handleAssignmentSelect = (assignment: HomeDropAssignment) => {
    setSelectedAssignment(assignment);
    setIsDetailsModalOpen(true);
  };

  // Handle assignment actions
  const handleAssignmentAction = (action: string, assignmentId: string) => {
    log.info(`🔧 Assignment Action: ${action} for assignment ${assignmentId}`, {}, "Page");
    
    // Here you would implement the actual action handlers
    switch (action) {
      case 'accept':
        // homeDropAssignmentService.acceptAssignment(assignmentId, currentUserId);
        break;
      case 'start':
        // homeDropAssignmentService.startAssignment(assignmentId, currentUserId);
        break;
      case 'complete':
        // homeDropAssignmentService.completeAssignment(assignmentId, currentUserId);
        break;
      case 'navigate':
        // Open navigation to assignment location
        break;
      case 'edit':
        // Open edit modal
        break;
      default:
        log.info(`Unhandled action: ${action}`, {}, "Page");
    }
  };

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Home Drop Assignments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage work assignments for field technicians with real-time updates and offline support
          </p>
        </div>

        {/* Assignment List with all features */}
        <AssignmentList
          showFilters={true}
          showStats={true}
          enableBulkActions={true}
          onAssignmentSelect={handleAssignmentSelect}
          onAssignmentAction={handleAssignmentAction}
        />

        {/* Assignment Details Modal */}
        <AssignmentDetailsModal
          assignment={selectedAssignment || undefined}
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          onAction={handleAssignmentAction}
          showActions={true}
        />
      </div>
    </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}