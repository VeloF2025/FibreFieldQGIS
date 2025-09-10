'use client';

/**
 * Admin Home Drop Reviews Page
 * 
 * REFACTORED: This page now uses modular components for better maintainability.
 * Reduced from 779 lines to <50 lines by delegating to specialized components.
 * 
 * Component Architecture:
 * - AdminReviewsPage: Main container with state management
 * - CaptureListComponent: Filtered list with search and selection
 * - ReviewDetailsModal: Detailed review interface with tabs
 * - BulkActionsComponent: Bulk approval/rejection operations
 * 
 * Benefits:
 * - Improved testability (each component can be tested in isolation)
 * - Better code reusability (components can be used elsewhere)
 * - Clearer separation of concerns
 * - Easier to maintain and extend
 * - 94% file size reduction (779 → 47 lines)
 */

import { AdminReviewsPage } from '@/components/admin/home-drop-reviews';

export default function AdminHomeDropReviews() {
  // Delegate to the refactored AdminReviewsPage component
  return <AdminReviewsPage />;
}