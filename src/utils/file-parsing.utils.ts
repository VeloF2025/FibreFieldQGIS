/**
 * File parsing utilities for import assignments functionality
 */

import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { log } from '@/lib/logger';
import type { 
  FileParseResult, 
  ParsedAssignment, 
  SupportedFormat,
  AssignmentField 
} from '@/types/import-assignments.types';
import { FileText, Table } from 'lucide-react';

export const SUPPORTED_FORMATS: SupportedFormat[] = [
  {
    extension: '.csv',
    label: 'CSV Files',
    description: 'Comma-separated values with automatic delimiter detection and field mapping',
    icon: Table,
    mimeType: 'text/csv'
  },
  {
    extension: '.xlsx',
    label: 'Excel Files',
    description: 'Excel workbook (.xlsx/.xls) with multi-worksheet support and intelligent field mapping',
    icon: FileText,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    extension: '.json',
    label: 'JSON Files',
    description: 'JavaScript Object Notation array with schema validation and error detection',
    icon: FileText,
    mimeType: 'application/json'
  }
];

export const ASSIGNMENT_FIELDS: AssignmentField[] = [
  { key: 'customerName', label: 'Customer Name', required: true, description: 'Full name of the customer' },
  { key: 'customerAddress', label: 'Service Address', required: true, description: 'Complete service installation address' },
  { key: 'contactNumber', label: 'Contact Number', required: false, description: 'Customer phone number' },
  { key: 'email', label: 'Email Address', required: false, description: 'Customer email address' },
  { key: 'accountNumber', label: 'Account Number', required: false, description: 'Customer account reference' },
  { key: 'poleNumber', label: 'Pole Number', required: false, description: 'Connected pole number' },
  { key: 'priority', label: 'Priority', required: false, description: 'high, medium, or low' },
  { key: 'scheduledDate', label: 'Scheduled Date', required: false, description: 'Installation date (YYYY-MM-DD)' },
  { key: 'installationNotes', label: 'Installation Notes', required: false, description: 'Special instructions' },
  { key: 'accessNotes', label: 'Access Notes', required: false, description: 'Access information (gate codes, etc.)' }
];

/**
 * Validate uploaded file size and format
 */
export const validateFile = (file: File): string | null => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return 'File size must be less than 10MB';
  }

  const validTypes = SUPPORTED_FORMATS.map(f => f.mimeType);
  const validExtensions = SUPPORTED_FORMATS.map(f => f.extension);
  
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!hasValidType && !hasValidExtension) {
    return 'Please select a valid CSV, Excel, or JSON file';
  }

  return null;
};

/**
 * Detect file type based on extension and MIME type
 */
export const detectFileType = (file: File): 'csv' | 'excel' | 'json' => {
  const extension = file.name.toLowerCase();
  if (extension.endsWith('.csv')) return 'csv';
  if (extension.endsWith('.xlsx') || extension.endsWith('.xls')) return 'excel';
  if (extension.endsWith('.json')) return 'json';
  
  // Fallback to MIME type detection
  if (file.type === 'text/csv') return 'csv';
  if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel';
  if (file.type === 'application/json') return 'json';
  
  throw new Error('Unable to detect file type. Please use .csv, .xlsx, or .json files');
};

/**
 * Enhanced CSV parsing using PapaParse
 */
export const parseCSV = (content: string): Promise<FileParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter(error => error.type === 'Delimiter');
          if (criticalErrors.length > 0) {
            reject(new Error(`CSV parsing failed: ${criticalErrors[0].message}`));
            return;
          }
        }

        if (!results.data || results.data.length === 0) {
          reject(new Error('CSV file must contain at least one data row'));
          return;
        }

        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          reject(new Error('CSV file must have a header row'));
          return;
        }

        const data = results.data.map((item: any, index: number) => ({
          ...item,
          originalRow: index + 2 // +2 because index is 0-based and we skip header
        }));

        resolve({
          data,
          headers,
          errors: results.errors.map(err => `Row ${err.row}: ${err.message}`),
          fileType: 'csv'
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

/**
 * Enhanced Excel parsing using xlsx library
 */
export const parseExcel = async (file: File): Promise<FileParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result as ArrayBuffer;
        if (!fileData) {
          reject(new Error('Failed to read Excel file'));
          return;
        }

        // Parse the workbook
        const workbook = XLSX.read(fileData, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          reject(new Error('Excel file contains no worksheets'));
          return;
        }

        // Use the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        if (!worksheet) {
          reject(new Error('Failed to read worksheet data'));
          return;
        }

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Use first row as header
          defval: '', // Default value for empty cells
          blankrows: false // Skip blank rows
        }) as any[][];

        if (jsonData.length < 2) {
          reject(new Error('Excel file must have at least a header row and one data row'));
          return;
        }

        // Extract headers from first row
        const headers = jsonData[0].map((header: any) => String(header).trim()).filter(h => h);
        
        if (headers.length === 0) {
          reject(new Error('Excel file must have column headers'));
          return;
        }

        // Convert data rows to objects
        const parsedRows = jsonData.slice(1)
          .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
          .map((row, index) => {
            const rowData: ParsedAssignment = {
              originalRow: index + 2 // +2 because index is 0-based and we skip header
            };
            
            headers.forEach((header, colIndex) => {
              const cellValue = row[colIndex];
              rowData[header] = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
            });
            
            return rowData;
          });

        if (parsedRows.length === 0) {
          reject(new Error('Excel file contains no valid data rows'));
          return;
        }

        resolve({
          data: parsedRows,
          headers,
          errors: [],
          fileType: 'excel'
        });
      } catch (error) {
        reject(new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Enhanced JSON parsing with validation
 */
export const parseJSON = (content: string): Promise<FileParseResult> => {
  return new Promise((resolve, reject) => {
    try {
      const parsed = JSON.parse(content);
      
      if (!Array.isArray(parsed)) {
        reject(new Error('JSON file must contain an array of assignment objects'));
        return;
      }

      if (parsed.length === 0) {
        reject(new Error('JSON file must contain at least one assignment object'));
        return;
      }

      // Extract headers from first object keys
      const headers = Object.keys(parsed[0] || {});
      if (headers.length === 0) {
        reject(new Error('JSON objects must have at least one property'));
        return;
      }

      const processedData = parsed.map((item, index) => {
        if (typeof item !== 'object' || item === null) {
          throw new Error(`Row ${index + 1}: Each item must be an object`);
        }
        
        return {
          ...item,
          originalRow: index + 1
        };
      });

      resolve({
        data: processedData,
        headers,
        errors: [],
        fileType: 'json'
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        reject(new Error('Invalid JSON format: ' + error.message));
      } else {
        reject(error instanceof Error ? error : new Error('JSON parsing failed'));
      }
    }
  });
};

/**
 * Main file parsing function
 */
export const parseFile = async (file: File): Promise<FileParseResult> => {
  const fileType = detectFileType(file);
  let result: FileParseResult;

  switch (fileType) {
    case 'csv': {
      const reader = new FileReader();
      const content = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read CSV file'));
        reader.readAsText(file);
      });
      result = await parseCSV(content);
      break;
    }
    
    case 'excel': {
      result = await parseExcel(file);
      break;
    }
    
    case 'json': {
      const reader = new FileReader();
      const content = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read JSON file'));
        reader.readAsText(file);
      });
      result = await parseJSON(content);
      break;
    }
    
    default:
      throw new Error('Unsupported file type');
  }

  // Handle parsing warnings
  if (result.errors.length > 0) {
    log.warn('File parsing warnings', {
      filename: file.name,
      warnings: result.errors
    }, 'FileParsingUtils');
  }

  log.info('File parsed successfully', {
    count: result.data.length,
    filename: file.name,
    fileType: result.fileType,
    headers: result.headers.length
  }, 'FileParsingUtils');

  return result;
};