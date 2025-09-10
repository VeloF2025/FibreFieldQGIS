'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppLayout } from '@/components/layout/app-layout';
import { HomeDropWorkflow } from '@/components/home-drop/home-drop-workflow';
import { homeDropAssignmentService } from '@/services/home-drop-assignment.service';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import type { HomeDropCapture, HomeDropAssignment } from '@/types/home-drop.types';
import { log } from '@/lib/logger';

export default function HomeDropCapturePage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<HomeDropAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load assignments on component mount
  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      
      // For demo purposes, we'll create some mock assignments
      // In production, this should load from homeDropAssignmentService
      const mockAssignments: HomeDropAssignment[] = [
        {
          id: 'hda-001',
          homeDropId: 'hd-001',
          poleNumber: 'pole-001',
          customer: {
            name: 'John Smith',
            address: '123 Main Street, Toronto, ON',
            contactNumber: '416-555-0123'
          },
          assignedTo: 'tech-001',
          assignedBy: 'manager-001',
          assignedAt: new Date(),
          priority: 'high',
          status: 'pending',
          installationNotes: 'Fiber installation, Router setup, Speed test'
        },
        {
          id: 'hda-002',
          homeDropId: 'hd-002',
          poleNumber: 'pole-002',
          customer: {
            name: 'Jane Doe',
            address: '456 Oak Avenue, Toronto, ON',
            contactNumber: '416-555-0456'
          },
          assignedTo: 'tech-001',
          assignedBy: 'manager-001',
          assignedAt: new Date(),
          priority: 'medium',
          status: 'pending',
          installationNotes: 'Equipment check, Signal testing'
        },
        {
          id: 'hda-003',
          homeDropId: 'hd-003',
          poleNumber: 'pole-003',
          customer: {
            name: 'Bob Johnson',
            address: '789 Pine Boulevard, Toronto, ON',
            contactNumber: '416-555-0789'
          },
          assignedTo: 'tech-001',
          assignedBy: 'manager-002',
          assignedAt: new Date(),
          priority: 'low',
          status: 'pending',
          installationNotes: 'Final inspection, Customer handoff'
        }
      ];
      
      setAssignments(mockAssignments);
      
      // Uncomment below for production:
      // const assignmentList = await homeDropAssignmentService.getAssignmentsForTechnician();
      // setAssignments(assignmentList);
    } catch (error) {
      log.error('Failed to load assignments:', {}, "Page", error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureComplete = async (captureData: Partial<HomeDropCapture>) => {
    try {
      setIsSubmitting(true);
      
      // Submit capture data
      // TODO: Implement createCapture method in homeDropCaptureService
      // await homeDropCaptureService.createCapture(captureData);
      
      // Navigate to success page
      router.push('/home-drop-capture/success');
    } catch (error) {
      log.error('Failed to save home drop capture:', {}, "Page", error as Error);
      alert('Failed to save capture data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to dashboard or assignments list
    router.push('/');
  };

  if (isLoading) {
    return (
      <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
        <AppLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-gray-600">Loading assignments...</div>
              </div>
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
          <HomeDropWorkflow
            assignments={assignments}
            onComplete={handleCaptureComplete}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </AppLayout>
    </AuthGuard>
  );
}