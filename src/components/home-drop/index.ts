/**
 * Home Drop Components Exports
 * 
 * This index file provides centralized exports for all home drop related components
 * and ensures proper TypeScript module resolution.
 */

// Assignment Components
export { AssignmentList } from './assignment-list';
export { 
  AssignmentCard, 
  CompactAssignmentCard, 
  MinimalAssignmentCard 
} from './assignment-card';
export { AssignmentDetailsModal } from './assignment-details-modal';

// Type exports for convenience
export type {
  AssignmentStatus,
  AssignmentPriority,
  AssignmentFilterOptions,
  AssignmentStatistics,
  GeoPackageAssignment,
  BulkAssignmentOperation,
  AssignmentValidationResult
} from '../../services/home-drop-assignment.service';

// Home drop types
export type {
  HomeDropAssignment,
  HomeDropCapture,
  HomeDropPhoto,
  HomeDropPhotoType,
  HomeDropStatus,
  HomeDropSyncStatus
} from '../../types/home-drop.types';