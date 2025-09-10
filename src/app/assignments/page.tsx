'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppLayout } from '@/components/layout/app-layout';
import { AssignmentList } from '@/components/home-drop/assignment-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { Plus, Calendar, MapPin, User } from 'lucide-react';
import type { HomeDropAssignment } from '@/types/home-drop.types';
import { log } from '@/lib/logger';

export default function AssignmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<HomeDropAssignment | null>(null);

  // Handle assignment selection
  const handleAssignmentSelect = (assignment: HomeDropAssignment) => {
    setSelectedAssignment(assignment);
    // Navigate to home drop capture with this assignment
    router.push(`/home-drop-capture?assignmentId=${assignment.id}`);
  };

  // Handle assignment actions
  const handleAssignmentAction = (action: string, assignmentId: string) => {
    switch (action) {
      case 'start_capture':
        router.push(`/home-drop-capture?assignmentId=${assignmentId}`);
        break;
      case 'view_details':
        // Could open a modal or navigate to details page
        log.info('View details for assignment:', { assignmentId }, "Page");
        break;
      case 'mark_complete':
        // Handle completion
        log.info('Mark complete:', { assignmentId }, "Page");
        break;
      default:
        log.info('Unknown action:', { action, assignmentId }, "Page");
    }
  };

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
              <p className="text-gray-600">View and manage your field installation assignments</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push('/navigation')}>
                <MapPin className="h-4 w-4 mr-2" />
                Navigation
              </Button>
              <Button onClick={() => router.push('/home-drop-capture')}>
                <Plus className="h-4 w-4 mr-2" />
                New Capture
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => router.push('/home-drop-capture')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Start New Capture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Begin a new home drop installation capture
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => router.push('/navigation')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Field Navigation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  GPS-guided navigation to assignment locations
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => router.push('/sync')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Check offline data synchronization status
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Assignment List */}
          <AssignmentList
            technicianId={user?.uid}
            showFilters={true}
            showStats={true}
            enableBulkActions={false}
            onAssignmentSelect={handleAssignmentSelect}
            onAssignmentAction={handleAssignmentAction}
          />
        </div>
      </AppLayout>
    </AuthGuard>
  );
}