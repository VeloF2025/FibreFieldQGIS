'use client';

import React from 'react';
import { ArrowRight, Eye, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { 
  FieldMapping, 
  ParsedAssignment, 
  ValidationError, 
  AssignmentField 
} from '@/types/import-assignments.types';

interface DataValidationStepProps {
  selectedFile: File | null;
  parsedData: ParsedAssignment[];
  fieldMappings: FieldMapping[];
  csvHeaders: string[];
  validationErrors: ValidationError[];
  assignmentFields: AssignmentField[];
  onFieldMappingChange: (assignmentField: string, csvField: string) => void;
}

/**
 * Data Validation Step Component
 * 
 * Handles field mapping for CSV/Excel files and displays data preview
 * with validation results and error highlighting.
 * 
 * Features:
 * - Intelligent field mapping interface
 * - Data validation and error display
 * - Preview table with validation status
 * - Validation statistics summary
 * - Mobile-responsive field mapping
 */
export function DataValidationStep({
  selectedFile,
  parsedData,
  fieldMappings,
  csvHeaders,
  validationErrors,
  assignmentFields,
  onFieldMappingChange
}: DataValidationStepProps) {

  const isCSVorExcel = selectedFile && (
    selectedFile.name.endsWith('.csv') || 
    selectedFile.name.endsWith('.xlsx') || 
    selectedFile.name.endsWith('.xls')
  );

  const errorCount = validationErrors.filter(e => e.type === 'error').length;
  const warningCount = validationErrors.filter(e => e.type === 'warning').length;
  const validRowCount = parsedData.filter(r => r.isValid).length;

  return (
    <div className="space-y-6">
      {/* Field Mapping Section - Only for CSV/Excel files */}
      {isCSVorExcel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Field Mapping</CardTitle>
            <CardDescription>
              Map your file columns to assignment fields. Mappings have been automatically detected where possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fieldMappings.map((mapping) => {
                const field = assignmentFields.find(f => f.key === mapping.assignmentField);
                if (!field) return null;

                return (
                  <div key={mapping.assignmentField} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 border rounded-lg">
                    {/* Assignment Field Info */}
                    <div>
                      <Label className="font-medium">
                        {field.label}
                        {mapping.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        {field.description}
                      </p>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* File Column Selector */}
                    <div className="space-y-2">
                      <Select
                        value={mapping.csvField}
                        onValueChange={(value) => onFieldMappingChange(mapping.assignmentField, value)}
                      >
                        <SelectTrigger className={cn(
                          "w-full",
                          mapping.required && !mapping.csvField && "border-red-500"
                        )}>
                          <SelectValue placeholder="Select column from file" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {csvHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {mapping.required && !mapping.csvField && (
                        <p className="text-xs text-red-600">Required field must be mapped</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Preview and Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Data Preview & Validation
          </CardTitle>
          <CardDescription>
            Review your data before import ({parsedData.length} rows found)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Validation Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-green-50">
                <div className="flex items-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                  <div>
                    <p className="text-lg font-semibold text-green-700">{validRowCount}</p>
                    <p className="text-sm text-green-600">Valid Rows</p>
                  </div>
                </div>
              </Card>
              
              {errorCount > 0 && (
                <Card className="p-4 bg-red-50">
                  <div className="flex items-center">
                    <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
                    <div>
                      <p className="text-lg font-semibold text-red-700">{errorCount}</p>
                      <p className="text-sm text-red-600">Errors</p>
                    </div>
                  </div>
                </Card>
              )}
              
              {warningCount > 0 && (
                <Card className="p-4 bg-yellow-50">
                  <div className="flex items-center">
                    <AlertCircle className="w-6 h-6 text-yellow-500 mr-2" />
                    <div>
                      <p className="text-lg font-semibold text-yellow-700">{warningCount}</p>
                      <p className="text-sm text-yellow-600">Warnings</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Validation Issues List */}
            {validationErrors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Validation Issues:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-3 bg-gray-50">
                  {validationErrors.map((error, index) => (
                    <div key={index} className={cn(
                      "text-sm p-2 rounded flex items-start",
                      error.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {error.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <strong>Row {error.row}:</strong> {error.message}
                        <span className="text-xs block mt-1 opacity-75">Field: {error.field}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="space-y-2">
              <h4 className="font-medium">Data Preview (First 10 rows)</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">Customer</th>
                        <th className="px-3 py-2 text-left font-medium">Address</th>
                        <th className="px-3 py-2 text-left font-medium">Contact</th>
                        <th className="px-3 py-2 text-left font-medium">Priority</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, index) => {
                        // Get mapped field values
                        const getFieldValue = (fieldKey: string) => {
                          const mapping = fieldMappings.find(m => m.assignmentField === fieldKey);
                          const csvField = mapping?.csvField;
                          return csvField ? row[csvField] : row[fieldKey];
                        };

                        return (
                          <tr key={index} className={cn(
                            "border-t hover:bg-gray-50",
                            !row.isValid && "bg-red-50"
                          )}>
                            <td className="px-3 py-2">
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500">{row.originalRow}</span>
                                {row.isValid ? (
                                  <CheckCircle2 className="w-3 h-3 ml-1 text-green-500" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 ml-1 text-red-500" />
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 max-w-32 truncate" title={getFieldValue('customerName') || 'N/A'}>
                              {getFieldValue('customerName') || <span className="text-gray-400">N/A</span>}
                            </td>
                            <td className="px-3 py-2 max-w-48 truncate" title={getFieldValue('customerAddress') || 'N/A'}>
                              {getFieldValue('customerAddress') || <span className="text-gray-400">N/A</span>}
                            </td>
                            <td className="px-3 py-2 max-w-32 truncate" title={getFieldValue('contactNumber') || 'N/A'}>
                              {getFieldValue('contactNumber') || <span className="text-gray-400">N/A</span>}
                            </td>
                            <td className="px-3 py-2">
                              {getFieldValue('priority') ? (
                                <Badge variant={
                                  getFieldValue('priority') === 'high' ? 'destructive' : 
                                  getFieldValue('priority') === 'medium' ? 'default' : 'secondary'
                                }>
                                  {getFieldValue('priority')}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">medium</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.isValid ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Valid
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  {validationErrors.filter(e => e.row === row.originalRow && e.type === 'error').length} Error(s)
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {parsedData.length > 10 && (
                <p className="text-sm text-gray-600 text-center py-2">
                  Showing first 10 of {parsedData.length} rows
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Readiness Status */}
      {parsedData.length > 0 && (
        <Card className={cn(
          "border-l-4",
          errorCount === 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              {errorCount === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              )}
              <div>
                <p className="font-medium">
                  {errorCount === 0 ? 'Ready to Import' : 'Import Blocked'}
                </p>
                <p className="text-sm text-gray-600">
                  {errorCount === 0 ? 
                    `${validRowCount} valid assignment(s) ready for import` :
                    `Fix ${errorCount} error(s) before proceeding with import`
                  }
                  {warningCount > 0 && ` (${warningCount} warning(s) will be imported with default values)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}