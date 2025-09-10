'use client';

import React from 'react';
import {
  Upload,
  Download,
  FileUp,
  CheckCircle2,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  downloadSampleCSV, 
  downloadSampleExcel, 
  downloadSampleJSON 
} from '@/utils/sample-file-generators.utils';
import type { SupportedFormat } from '@/types/import-assignments.types';

interface FileUploadStepProps {
  supportedFormats: SupportedFormat[];
  selectedFile: File | null;
  isDragging: boolean;
  isLoading: boolean;
  parseError: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  dropzoneRef: React.RefObject<HTMLDivElement>;
  onFileSelect: (file: File) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

/**
 * File Upload Step Component
 * 
 * Handles file selection, validation, and drag-and-drop functionality.
 * Provides sample file downloads and format information.
 * 
 * Features:
 * - Drag and drop file upload
 * - File format validation
 * - Sample file generation
 * - Visual feedback for file selection
 * - Format support information
 */
export function FileUploadStep({
  supportedFormats,
  selectedFile,
  isDragging,
  isLoading,
  parseError,
  fileInputRef,
  dropzoneRef,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop
}: FileUploadStepProps) {
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* File Format Information */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">Supported File Formats</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {supportedFormats.map((format) => (
            <Card key={format.extension} className="p-4">
              <div className="flex items-start space-x-3">
                <format.icon className="w-5 h-5 mt-0.5 text-blue-500" />
                <div>
                  <p className="font-medium">{format.label}</p>
                  <p className="text-sm text-gray-600">{format.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Sample Files Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sample Files</h3>
        <p className="text-sm text-gray-600">
          Download sample files to see the expected format and structure for your assignments.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadSampleCSV}
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV Sample
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadSampleExcel}
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel Sample
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadSampleJSON}
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download JSON Sample
          </Button>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upload Your File</h3>
        <div
          ref={dropzoneRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300",
            selectedFile && "border-green-500 bg-green-50",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleBrowseClick}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              {selectedFile ? (
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              ) : (
                <FileUp className="w-12 h-12 text-gray-400" />
              )}
            </div>
            
            {selectedFile ? (
              <div>
                <p className="text-lg font-medium text-green-700">File Selected</p>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                {isLoading && (
                  <div className="flex items-center justify-center mt-2">
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    <span className="text-sm">Processing file...</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">Drop your file here</p>
                <p className="text-sm text-gray-600">or click to browse</p>
                <p className="text-xs text-gray-500 mt-2">
                  Supports CSV, Excel (.xlsx), and JSON files up to 10MB
                </p>
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={handleBrowseClick}
              disabled={isLoading}
              className="mt-4"
            >
              {isLoading ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? 'Choose Different File' : 'Select File'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Error display */}
        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Upload Tips */}
      <Card>
        <CardHeader>
          <h4 className="text-md font-medium">Upload Tips</h4>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Ensure your file has a header row with column names</li>
            <li>• Customer Name and Service Address are required fields</li>
            <li>• Use standard date formats (YYYY-MM-DD or MM/DD/YYYY)</li>
            <li>• Priority should be &apos;high&apos;, &apos;medium&apos;, or &apos;low&apos;</li>
            <li>• Files are limited to 10MB maximum size</li>
            <li>• Download sample files to see the expected format</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}