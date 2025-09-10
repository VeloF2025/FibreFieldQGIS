'use client';

import React, { useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useImportAssignments } from '@/hooks/useImportAssignments';
import { FileUploadStep } from './import-steps/FileUploadStep';
import { DataValidationStep } from './import-steps/DataValidationStep';
import { ImportProcessStep } from './import-steps/ImportProcessStep';
import type { ImportAssignmentsModalProps } from '@/types/import-assignments.types';

/**
 * Main Import Assignments Modal Component
 * 
 * Orchestrates the multi-step import process using a custom hook
 * and dedicated step components. Maintains clean separation of concerns
 * while providing a cohesive user experience.
 * 
 * Features:
 * - Multi-step wizard interface
 * - Progress tracking with step indicators
 * - File upload, validation, and import processing
 * - Error handling and user feedback
 * - Mobile-responsive design
 * - State management via custom hook
 */
export function ImportAssignmentsModal({
  isOpen,
  onClose,
  onImportComplete,
  technicianId
}: ImportAssignmentsModalProps) {
  
  const {
    // State
    currentStep,
    selectedFile,
    isDragging,
    isLoading,
    parseError,
    parsedData,
    validationErrors,
    fieldMappings,
    csvHeaders,
    importProgress,
    importResult,
    steps,
    fileInputRef,
    dropzoneRef,
    supportedFormats,
    assignmentFields,
    
    // Actions
    resetState,
    handleFileSelect,
    handleFieldMappingChange,
    executeImport,
    setCurrentStep,
    setIsDragging
  } = useImportAssignments(technicianId);

  /**
   * Handle modal close with state cleanup
   */
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  /**
   * Handle successful import completion
   */
  const handleImportSuccess = useCallback(() => {
    if (importResult && importResult.successful > 0) {
      onImportComplete();
    }
  }, [importResult, onImportComplete]);

  /**
   * Drag and drop event handlers
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, [setIsDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect, setIsDragging]);

  /**
   * Render appropriate step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <FileUploadStep
            supportedFormats={supportedFormats}
            selectedFile={selectedFile}
            isDragging={isDragging}
            isLoading={isLoading}
            parseError={parseError}
            fileInputRef={fileInputRef}
            dropzoneRef={dropzoneRef}
            onFileSelect={handleFileSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        );

      case 2:
        return (
          <DataValidationStep
            selectedFile={selectedFile}
            parsedData={parsedData}
            fieldMappings={fieldMappings}
            csvHeaders={csvHeaders}
            validationErrors={validationErrors}
            assignmentFields={assignmentFields}
            onFieldMappingChange={handleFieldMappingChange}
          />
        );

      case 3:
        return (
          <ImportProcessStep
            isLoading={isLoading}
            importProgress={importProgress}
            importResult={importResult}
            validRowCount={parsedData.filter(r => r.isValid).length}
          />
        );

      default:
        return null;
    }
  };

  /**
   * Determine if current step can proceed
   */
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return selectedFile !== null && !parseError && !isLoading;
      case 2:
        return parsedData.length > 0 && validationErrors.filter(e => e.type === 'error').length === 0;
      case 3:
        return importResult !== null;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Dialog Header */}
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            Import Home Drop Assignments
          </DialogTitle>
          <DialogDescription>
            Import assignments from CSV, Excel, or JSON files with intelligent field mapping and data validation.
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between py-4 border-b">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Circle and Info */}
              <div className="flex items-center flex-1">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  currentStep === step.id 
                    ? "bg-blue-500 text-white" 
                    : step.completed 
                      ? "bg-green-500 text-white" 
                      : "bg-gray-200 text-gray-600"
                )}>
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                
                {/* Step Info - Hidden on mobile */}
                <div className="ml-3 hidden md:block">
                  <p className={cn(
                    "text-sm font-medium",
                    currentStep === step.id ? "text-blue-600" : "text-gray-900"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-4 transition-colors",
                  step.completed ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px] py-4">
          {renderStepContent()}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
          {/* Close/Cancel Button */}
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          
          {/* Navigation and Action Buttons */}
          <div className="flex space-x-2">
            {/* Back Button */}
            {currentStep > 1 && !isLoading && !importResult && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {/* Next Button - Step 1 to 2 */}
            {currentStep === 1 && canProceedFromStep(1) && (
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={isLoading}
              >
                Next: Review Data
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {/* Import Button - Step 2 to 3 */}
            {currentStep === 2 && canProceedFromStep(2) && (
              <Button 
                onClick={executeImport}
                disabled={isLoading || parsedData.filter(r => r.isValid).length === 0}
              >
                Import {parsedData.filter(r => r.isValid).length} Assignment{parsedData.filter(r => r.isValid).length !== 1 ? 's' : ''}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {/* Complete Button - After successful import */}
            {currentStep === 3 && importResult && importResult.successful > 0 && (
              <Button 
                onClick={() => {
                  handleImportSuccess();
                  handleClose();
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}