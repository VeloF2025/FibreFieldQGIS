/**
 * Shared type definitions for import assignments functionality
 */

export interface ImportStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface ParsedAssignment {
  [key: string]: any;
  originalRow?: number;
  validationErrors?: string[];
  isValid?: boolean;
}

export interface FileParseResult {
  data: ParsedAssignment[];
  headers: string[];
  errors: string[];
  fileType: 'csv' | 'excel' | 'json';
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ImportResult {
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export interface FieldMapping {
  csvField: string;
  assignmentField: string;
  required: boolean;
}

export interface SupportedFormat {
  extension: string;
  label: string;
  description: string;
  icon: any;
  mimeType: string;
}

export interface AssignmentField {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

export interface ImportAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  technicianId?: string;
}

export interface ImportAssignmentsState {
  currentStep: number;
  selectedFile: File | null;
  isDragging: boolean;
  isLoading: boolean;
  parseError: string;
  parsedData: ParsedAssignment[];
  validationErrors: ValidationError[];
  fieldMappings: FieldMapping[];
  csvHeaders: string[];
  importProgress: number;
  importResult: ImportResult | null;
}