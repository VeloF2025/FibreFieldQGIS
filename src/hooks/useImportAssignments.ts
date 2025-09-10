'use client';

import { useState, useCallback, useRef } from 'react';
import { log } from '@/lib/logger';
import { homeDropAssignmentService } from '@/services/home-drop-assignment.service';
import { parseFile, ASSIGNMENT_FIELDS, SUPPORTED_FORMATS, validateFile } from '@/utils/file-parsing.utils';
import type {
  ImportAssignmentsState,
  ImportStep,
  ValidationError,
  FieldMapping,
  ParsedAssignment,
  ImportResult
} from '@/types/import-assignments.types';

/**
 * Custom hook for managing import assignments state and logic
 */
export const useImportAssignments = (technicianId?: string) => {
  // State management
  const [state, setState] = useState<ImportAssignmentsState>({
    currentStep: 1,
    selectedFile: null,
    isDragging: false,
    isLoading: false,
    parseError: '',
    parsedData: [],
    validationErrors: [],
    fieldMappings: [],
    csvHeaders: [],
    importProgress: 0,
    importResult: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Steps configuration
  const steps: ImportStep[] = [
    {
      id: 1,
      title: 'File Selection',
      description: 'Choose your assignment file and format',
      completed: state.selectedFile !== null
    },
    {
      id: 2,
      title: 'Data Preview',
      description: 'Review and map your data fields',
      completed: state.parsedData.length > 0 && state.validationErrors.filter(e => e.type === 'error').length === 0
    },
    {
      id: 3,
      title: 'Import Progress',
      description: 'Import assignments and view results',
      completed: state.importResult !== null
    }
  ];

  /**
   * Create intelligent field mappings with fuzzy matching
   */
  const createIntelligentFieldMappings = useCallback((headers: string[]): FieldMapping[] => {
    return ASSIGNMENT_FIELDS.map(field => {
      // Create variations of field names to match against
      const searchTerms = [
        field.key.toLowerCase(),
        field.label.toLowerCase(),
        // Split camelCase and add variations
        field.key.replace(/([A-Z])/g, ' $1').toLowerCase().trim(),
        // Common variations
        field.key.replace(/([A-Z])/g, '_$1').toLowerCase().trim(),
        field.key.replace(/([A-Z])/g, '-$1').toLowerCase().trim()
      ];

      // Add specific mappings for common field variations
      const commonMappings: Record<string, string[]> = {
        customerName: ['customer name', 'name', 'client name', 'customer', 'full name'],
        customerAddress: ['address', 'service address', 'install address', 'location', 'site address'],
        contactNumber: ['phone', 'contact', 'contact number', 'phone number', 'mobile', 'telephone'],
        email: ['email', 'email address', 'e-mail', 'contact email'],
        accountNumber: ['account', 'account number', 'account #', 'account id', 'customer account'],
        poleNumber: ['pole', 'pole number', 'pole #', 'pole id', 'pole ref'],
        priority: ['priority', 'urgency', 'importance', 'level'],
        scheduledDate: ['date', 'scheduled date', 'install date', 'appointment', 'schedule'],
        installationNotes: ['notes', 'installation notes', 'install notes', 'comments', 'remarks'],
        accessNotes: ['access notes', 'access', 'access info', 'access instructions', 'special instructions']
      };

      if (commonMappings[field.key]) {
        searchTerms.push(...commonMappings[field.key]);
      }

      // Find best matching header
      const matchedHeader = headers.find(header => {
        const headerLower = header.toLowerCase().trim();
        return searchTerms.some(term => 
          headerLower === term ||
          headerLower.includes(term) ||
          term.includes(headerLower)
        );
      });

      return {
        csvField: matchedHeader || '',
        assignmentField: field.key,
        required: field.required
      };
    });
  }, []);

  /**
   * Enhanced data validation with detailed error checking
   */
  const validateParsedData = useCallback((data: ParsedAssignment[], fieldMappings: FieldMapping[]) => {
    const errors: ValidationError[] = [];
    const seenCustomers = new Set<string>();
    
    data.forEach((row, index) => {
      const rowNum = row.originalRow || index + 1;
      
      // Check required fields
      ASSIGNMENT_FIELDS.filter(f => f.required).forEach(field => {
        const mapping = fieldMappings.find(m => m.assignmentField === field.key);
        const csvField = mapping?.csvField;
        const value = csvField ? row[csvField] : row[field.key];
        
        if (!value || value.toString().trim() === '') {
          errors.push({
            row: rowNum,
            field: field.label,
            message: `${field.label} is required`,
            type: 'error'
          });
        }
      });

      // Get mapped values for validation
      const getMappedValue = (fieldKey: string): string => {
        const mapping = fieldMappings.find(m => m.assignmentField === fieldKey);
        const csvField = mapping?.csvField;
        return csvField ? (row[csvField] || '') : (row[fieldKey] || '');
      };

      // Validate priority values
      const priority = getMappedValue('priority');
      if (priority && !['high', 'medium', 'low'].includes(priority.toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'Priority',
          message: 'Priority must be high, medium, or low',
          type: 'warning'
        });
      }

      // Validate date format
      const scheduledDate = getMappedValue('scheduledDate');
      if (scheduledDate) {
        const parsedDate = new Date(scheduledDate);
        if (isNaN(parsedDate.getTime())) {
          errors.push({
            row: rowNum,
            field: 'Scheduled Date',
            message: 'Invalid date format. Use YYYY-MM-DD or MM/DD/YYYY',
            type: 'warning'
          });
        }
      }

      // Validate email format
      const email = getMappedValue('email');
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            row: rowNum,
            field: 'Email',
            message: 'Invalid email format',
            type: 'warning'
          });
        }
      }

      // Validate phone number format
      const contactNumber = getMappedValue('contactNumber');
      if (contactNumber) {
        const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
        if (!phoneRegex.test(contactNumber.replace(/\s/g, ''))) {
          errors.push({
            row: rowNum,
            field: 'Contact Number',
            message: 'Invalid phone number format',
            type: 'warning'
          });
        }
      }

      // Check for duplicate customers
      const customerName = getMappedValue('customerName');
      const customerAddress = getMappedValue('customerAddress');
      const customerKey = `${customerName.toLowerCase()}-${customerAddress.toLowerCase()}`;
      
      if (customerName && customerAddress) {
        if (seenCustomers.has(customerKey)) {
          errors.push({
            row: rowNum,
            field: 'Customer',
            message: 'Duplicate customer found (same name and address)',
            type: 'warning'
          });
        } else {
          seenCustomers.add(customerKey);
        }
      }

      // Validate address format (basic check)
      if (customerAddress && customerAddress.length < 10) {
        errors.push({
          row: rowNum,
          field: 'Customer Address',
          message: 'Address seems too short. Please verify it\'s complete',
          type: 'warning'
        });
      }

      // Update row validation status
      const rowErrors = errors.filter(e => e.row === rowNum && e.type === 'error');
      const rowWarnings = errors.filter(e => e.row === rowNum && e.type === 'warning');
      
      row.isValid = rowErrors.length === 0;
      row.validationErrors = errors.filter(e => e.row === rowNum).map(e => `${e.type.toUpperCase()}: ${e.message}`);
    });

    // Log validation summary
    const errorCount = errors.filter(e => e.type === 'error').length;
    const warningCount = errors.filter(e => e.type === 'warning').length;
    
    log.info('Data validation completed', {
      totalRows: data.length,
      validRows: data.filter(r => r.isValid).length,
      errors: errorCount,
      warnings: warningCount
    }, 'useImportAssignments');

    return errors;
  }, []);

  /**
   * Reset all state to initial values
   */
  const resetState = useCallback(() => {
    setState({
      currentStep: 1,
      selectedFile: null,
      isDragging: false,
      isLoading: false,
      parseError: '',
      parsedData: [],
      validationErrors: [],
      fieldMappings: [],
      csvHeaders: [],
      importProgress: 0,
      importResult: null
    });
  }, []);

  /**
   * Handle file selection and parsing
   */
  const handleFileSelect = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setState(prev => ({ ...prev, parseError: error }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      selectedFile: file, 
      parseError: '', 
      isLoading: true 
    }));

    try {
      const result = await parseFile(file);

      // Set headers for field mapping (CSV and Excel only)
      const headers = result.fileType === 'csv' || result.fileType === 'excel' ? result.headers : [];
      const mappings = result.fileType === 'json' ? 
        // For JSON, create direct mappings
        ASSIGNMENT_FIELDS.map(field => ({
          csvField: result.headers.includes(field.key) ? field.key : '',
          assignmentField: field.key,
          required: field.required
        })) :
        // For CSV/Excel, create intelligent mappings
        createIntelligentFieldMappings(result.headers);

      const validationErrors = validateParsedData(result.data, mappings);

      setState(prev => ({
        ...prev,
        parsedData: result.data,
        csvHeaders: headers,
        fieldMappings: mappings,
        validationErrors,
        currentStep: result.data.length > 0 ? 2 : 1,
        isLoading: false
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      setState(prev => ({ 
        ...prev, 
        parseError: errorMessage, 
        isLoading: false 
      }));
      
      log.error('File parsing failed', {
        filename: file.name,
        error: errorMessage
      }, 'useImportAssignments', error instanceof Error ? error : new Error(errorMessage));
    }
  }, [createIntelligentFieldMappings, validateParsedData]);

  /**
   * Handle field mapping change
   */
  const handleFieldMappingChange = useCallback((assignmentField: string, csvField: string) => {
    setState(prev => {
      const newMappings = prev.fieldMappings.map(mapping => 
        mapping.assignmentField === assignmentField 
          ? { ...mapping, csvField }
          : mapping
      );
      
      const validationErrors = validateParsedData(prev.parsedData, newMappings);
      
      return {
        ...prev,
        fieldMappings: newMappings,
        validationErrors
      };
    });
  }, [validateParsedData]);

  /**
   * Execute the import process
   */
  const executeImport = useCallback(async () => {
    if (!state.parsedData.length) return;
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      currentStep: 3, 
      importProgress: 0 
    }));

    const result: ImportResult = {
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const validRows = state.parsedData.filter(row => row.isValid);
      const total = validRows.length;
      
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        try {
          // Map CSV fields to assignment fields
          const mappedData: any = {};
          state.fieldMappings.forEach(mapping => {
            if (mapping.csvField) {
              mappedData[mapping.assignmentField] = row[mapping.csvField];
            }
          });

          // Create assignment
          await homeDropAssignmentService.createStandaloneAssignment({
            poleNumber: mappedData.poleNumber || 'IMPORT-PENDING',
            customer: {
              name: mappedData.customerName || 'Unknown Customer',
              address: mappedData.customerAddress || 'No address provided',
              contactNumber: mappedData.contactNumber,
              email: mappedData.email,
              accountNumber: mappedData.accountNumber
            },
            assignedTo: technicianId || mappedData.assignedTo || 'unassigned',
            assignedBy: 'import-system',
            priority: (mappedData.priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
            scheduledDate: mappedData.scheduledDate ? new Date(mappedData.scheduledDate) : undefined,
            installationNotes: mappedData.installationNotes || 'Imported from file',
            accessNotes: mappedData.accessNotes || '',
            status: 'pending'
          });

          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: row.originalRow || i + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          log.error('Failed to import assignment', { row: row.originalRow }, 'useImportAssignments', error instanceof Error ? error : new Error(String(error)));
        }
        
        setState(prev => ({ 
          ...prev, 
          importProgress: Math.round(((i + 1) / total) * 100) 
        }));
      }

      log.info('Import completed', result, 'useImportAssignments');
    } catch (error) {
      log.error('Import process failed', {}, 'useImportAssignments', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setState(prev => ({ 
        ...prev, 
        importResult: result, 
        isLoading: false 
      }));
    }
  }, [state.parsedData, state.fieldMappings, technicianId]);

  /**
   * Navigate to a specific step
   */
  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  /**
   * Set dragging state
   */
  const setIsDragging = useCallback((isDragging: boolean) => {
    setState(prev => ({ ...prev, isDragging }));
  }, []);

  return {
    // State
    ...state,
    steps,
    fileInputRef,
    dropzoneRef,
    
    // Actions
    resetState,
    handleFileSelect,
    handleFieldMappingChange,
    executeImport,
    setCurrentStep,
    setIsDragging,
    
    // Constants
    supportedFormats: SUPPORTED_FORMATS,
    assignmentFields: ASSIGNMENT_FIELDS
  };
};