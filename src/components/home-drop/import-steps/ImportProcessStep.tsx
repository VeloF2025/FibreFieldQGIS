'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, RotateCcw, FileText, Users, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ImportResult } from '@/types/import-assignments.types';

interface ImportProcessStepProps {
  isLoading: boolean;
  importProgress: number;
  importResult: ImportResult | null;
  validRowCount: number;
}

/**
 * Import Process Step Component
 * 
 * Displays import progress, results, and detailed error information.
 * Shows real-time progress updates during the import process.
 * 
 * Features:
 * - Real-time progress tracking
 * - Success/failure statistics
 * - Detailed error reporting
 * - Import completion summary
 * - Visual progress indicators
 */
export function ImportProcessStep({
  isLoading,
  importProgress,
  importResult,
  validRowCount
}: ImportProcessStepProps) {

  if (!importResult && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Import</h3>
        <p className="text-gray-600">
          Click &quot;Import Assignments&quot; to begin importing {validRowCount} valid assignment{validRowCount !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Import Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            {isLoading ? (
              <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
            )}
            Import Progress
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Importing assignments to the system...' : 'Import process completed'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full h-3" />
            </div>
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    Processing assignments... {importProgress}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <div className="space-y-6">
          {/* Success/Failure Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Successful Imports */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mr-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">
                      {importResult.successful}
                    </p>
                    <p className="text-sm text-green-600">
                      Assignment{importResult.successful !== 1 ? 's' : ''} Created
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Failed Imports */}
            {importResult.failed > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mr-4">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-700">
                        {importResult.failed}
                      </p>
                      <p className="text-sm text-red-600">
                        Import{importResult.failed !== 1 ? 's' : ''} Failed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Detailed Results Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Summary</CardTitle>
              <CardDescription>
                Detailed breakdown of the import process results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Import Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-blue-600">Total Processed</p>
                      <p className="font-semibold text-blue-700">
                        {importResult.successful + importResult.failed}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <Users className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-green-600">Success Rate</p>
                      <p className="font-semibold text-green-700">
                        {Math.round((importResult.successful / (importResult.successful + importResult.failed)) * 100)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge variant="outline" className="font-semibold">
                        Complete
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                {importResult.successful > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">
                          Successfully imported {importResult.successful} assignment{importResult.successful !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          The assignments have been added to the system and are now available for technicians to accept and work on.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Details */}
          {importResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-700 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Import Errors
                </CardTitle>
                <CardDescription>
                  Detailed information about rows that failed to import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-red-800">
                              Row {error.row}
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              {error.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {importResult.errors.length > 5 && (
                    <p className="text-sm text-gray-600 text-center">
                      Showing all {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {importResult.successful > 0 && (
                  <div className="flex items-start">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                    <p className="text-sm">
                      Successfully imported assignments are now available in the assignment list for technicians to view and accept.
                    </p>
                  </div>
                )}
                
                {importResult.failed > 0 && (
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-1 flex-shrink-0" />
                    <p className="text-sm">
                      Review the error details above, correct the issues in your source file, and re-import the failed rows.
                    </p>
                  </div>
                )}
                
                <div className="flex items-start">
                  <FileText className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    You can close this dialog and return to the assignment list to verify the imported assignments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}