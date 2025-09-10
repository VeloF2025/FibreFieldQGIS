/**
 * Home Drop Capture 4-Step Workflow
 * 
 * Step 1: Assignment Selection
 * Step 2: GPS Location Validation
 * Step 3: Photo Capture (4 required types)
 * Step 4: Review & Submit
 * 
 * This component has been refactored into modular components:
 * - HomeDropWorkflowContainer: Main orchestrator
 * - AssignmentStepComponent: Assignment selection
 * - GPSStepComponent: GPS validation
 * - PhotoStepComponent: Photo capture
 * - ReviewStepComponent: Final review and submission
 */

'use client';

import React from 'react';
import { HomeDropWorkflowContainer } from './home-drop-workflow-container';
import type { 
  HomeDropCapture, 
  HomeDropAssignment
} from '@/types/home-drop.types';

interface HomeDropWorkflowProps {
  onComplete: (capture: Partial<HomeDropCapture>) => Promise<void>;
  onCancel: () => void;
  assignments?: HomeDropAssignment[];
  isSubmitting?: boolean;
}

export function HomeDropWorkflow({ 
  onComplete, 
  onCancel, 
  assignments = [], 
  isSubmitting = false 
}: HomeDropWorkflowProps) {
  return (
    <HomeDropWorkflowContainer
      onComplete={onComplete}
      onCancel={onCancel}
      assignments={assignments}
      isSubmitting={isSubmitting}
    />
  );
}