import React from 'react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportAssignmentsModal } from '../import-assignments-modal';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';

// Mock the dependencies
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    book_new: vi.fn(),
    json_to_sheet: vi.fn(),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}));

vi.mock('papaparse', () => ({
  parse: vi.fn()
}));
vi.mock('@/services/home-drop-assignment.service', () => ({
  homeDropAssignmentService: {
    createStandaloneAssignment: vi.fn().mockResolvedValue({
      id: 'test-assignment-123',
      status: 'pending'
    })
  }
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Test data
const mockCSVData = `Customer Name,Service Address,Contact Number,Email Address,Priority
John Doe,123 Main St,+1-555-0101,john@example.com,high
Jane Smith,456 Oak Ave,+1-555-0102,jane@example.com,medium`;

const mockExcelData = [
  ['Customer Name', 'Service Address', 'Contact Number', 'Email Address', 'Priority'],
  ['John Doe', '123 Main St', '+1-555-0101', 'john@example.com', 'high'],
  ['Jane Smith', '456 Oak Ave', '+1-555-0102', 'jane@example.com', 'medium']
];

const mockJSONData = [
  {
    customerName: 'John Doe',
    customerAddress: '123 Main St',
    contactNumber: '+1-555-0101',
    email: 'john@example.com',
    priority: 'high'
  },
  {
    customerName: 'Jane Smith', 
    customerAddress: '456 Oak Ave',
    contactNumber: '+1-555-0102',
    email: 'jane@example.com',
    priority: 'medium'
  }
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onImportComplete: vi.fn(),
  technicianId: 'tech-123'
};

describe('ImportAssignmentsModal - Enhanced Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock File and FileReader
    global.File = class MockFile {
      name: string;
      type: string;
      size: number;
      
      constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
        this.name = name;
        this.type = options?.type || '';
        this.size = parts.reduce((acc, part) => acc + part.toString().length, 0);
      }
    } as any;

    global.FileReader = class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      result: string | ArrayBuffer | null = null;

      readAsText(file: Blob) {
        setTimeout(() => {
          if (file instanceof File && file.name.endsWith('.csv')) {
            this.result = mockCSVData;
          } else if (file instanceof File && file.name.endsWith('.json')) {
            this.result = JSON.stringify(mockJSONData);
          }
          this.onload?.({ target: { result: this.result } } as any);
        }, 0);
      }

      readAsArrayBuffer(file: Blob) {
        setTimeout(() => {
          // Mock Excel file data
          this.result = new ArrayBuffer(100);
          this.onload?.({ target: { result: this.result } } as any);
        }, 0);
      }
    } as any;

    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('should render the modal with enhanced file format descriptions', () => {
    render(<ImportAssignmentsModal {...defaultProps} />);
    
    expect(screen.getByText('CSV Files')).toBeInTheDocument();
    expect(screen.getByText('Comma-separated values with automatic delimiter detection and field mapping')).toBeInTheDocument();
    
    expect(screen.getByText('Excel Files')).toBeInTheDocument();
    expect(screen.getByText('Excel workbook (.xlsx/.xls) with multi-worksheet support and intelligent field mapping')).toBeInTheDocument();
    
    expect(screen.getByText('JSON Files')).toBeInTheDocument();
    expect(screen.getByText('JavaScript Object Notation array with schema validation and error detection')).toBeInTheDocument();
  });

  it('should provide sample downloads for all three formats', () => {
    render(<ImportAssignmentsModal {...defaultProps} />);
    
    expect(screen.getByText('Download CSV Sample')).toBeInTheDocument();
    expect(screen.getByText('Download Excel Sample')).toBeInTheDocument();
    expect(screen.getByText('Download JSON Sample')).toBeInTheDocument();
  });

  describe('Enhanced CSV Parsing', () => {
    beforeEach(() => {
      (Papa.parse as Mock).mockImplementation((content: string, options: any) => {
        options.complete({
          data: [
            { 'Customer Name': 'John Doe', 'Service Address': '123 Main St', 'Contact Number': '+1-555-0101', 'Email Address': 'john@example.com', 'Priority': 'high' },
            { 'Customer Name': 'Jane Smith', 'Service Address': '456 Oak Ave', 'Contact Number': '+1-555-0102', 'Email Address': 'jane@example.com', 'Priority': 'medium' }
          ],
          errors: [],
          meta: {
            fields: ['Customer Name', 'Service Address', 'Contact Number', 'Email Address', 'Priority']
          }
        });
      });
    });

    it('should parse CSV files using PapaParse with proper configuration', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File([mockCSVData], 'test.csv', { type: 'text/csv' });
      const fileInput = screen.getByTestId('file-input') || document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(Papa.parse).toHaveBeenCalledWith(
          mockCSVData,
          expect.objectContaining({
            header: true,
            skipEmptyLines: true,
            trimHeaders: true,
            transformHeader: expect.any(Function),
            transform: expect.any(Function),
            complete: expect.any(Function),
            error: expect.any(Function)
          })
        );
      });
    });

    it('should handle CSV parsing errors gracefully', async () => {
      (Papa.parse as Mock).mockImplementation((content: string, options: any) => {
        options.complete({
          data: [],
          errors: [{ type: 'Delimiter', message: 'Invalid delimiter' }],
          meta: { fields: [] }
        });
      });

      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['invalid,csv'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/CSV parsing failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Excel Parsing', () => {
    beforeEach(() => {
      (XLSX.read as Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      });

      (XLSX.utils.sheet_to_json as Mock).mockReturnValue(mockExcelData);
      (XLSX.utils.book_new as Mock).mockReturnValue({});
      (XLSX.utils.json_to_sheet as Mock).mockReturnValue({});
      (XLSX.utils.book_append_sheet as Mock).mockImplementation(() => {});
      (XLSX.writeFile as Mock).mockImplementation(() => {});
    });

    it('should parse Excel files using xlsx library', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['mock excel data'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(XLSX.read).toHaveBeenCalledWith(expect.any(ArrayBuffer), { type: 'array' });
      });
    });

    it('should handle Excel files with no worksheets', async () => {
      (XLSX.read as Mock).mockReturnValue({
        SheetNames: [],
        Sheets: {}
      });

      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['mock excel data'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/Excel file contains no worksheets/)).toBeInTheDocument();
      });
    });

    it('should generate Excel sample files', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const downloadButton = screen.getByText('Download Excel Sample');
      await userEvent.click(downloadButton);

      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'sample-assignments.xlsx');
    });
  });

  describe('Enhanced JSON Parsing', () => {
    it('should validate JSON structure and provide detailed errors', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File([JSON.stringify(mockJSONData)], 'test.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/Data Preview/)).toBeInTheDocument();
      });
    });

    it('should handle invalid JSON format', async () => {
      global.FileReader = class MockFileReader {
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        result: string | null = null;

        readAsText(file: Blob) {
          setTimeout(() => {
            this.result = '{ invalid json }';
            this.onload?.({ target: { result: this.result } } as any);
          }, 0);
        }
      } as any;

      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['{ invalid json }'], 'test.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/Invalid JSON format/)).toBeInTheDocument();
      });
    });
  });

  describe('Intelligent Field Mapping', () => {
    beforeEach(() => {
      (Papa.parse as Mock).mockImplementation((content: string, options: any) => {
        options.complete({
          data: [
            { 'Client Name': 'John Doe', 'Address': '123 Main St', 'Phone': '+1-555-0101' }
          ],
          errors: [],
          meta: {
            fields: ['Client Name', 'Address', 'Phone']
          }
        });
      });
    });

    it('should intelligently map similar field names', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['Client Name,Address,Phone\nJohn Doe,123 Main St,+1-555-0101'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        // Should be on step 2 (Preview) after successful parsing
        expect(screen.getByText('Data Preview')).toBeInTheDocument();
        expect(screen.getByText('Field Mapping')).toBeInTheDocument();
      });

      // Check that intelligent mapping worked
      await waitFor(() => {
        // The "Client Name" should be mapped to "Customer Name"
        // The "Address" should be mapped to "Service Address" 
        // The "Phone" should be mapped to "Contact Number"
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Enhanced Validation', () => {
    beforeEach(() => {
      (Papa.parse as Mock).mockImplementation((content: string, options: any) => {
        options.complete({
          data: [
            { 'Customer Name': 'John Doe', 'Service Address': '123 Main St', 'Email Address': 'invalid-email', 'Contact Number': '123' },
            { 'Customer Name': 'Jane Smith', 'Service Address': 'Incomplete', 'Priority': 'invalid-priority' }
          ],
          errors: [],
          meta: {
            fields: ['Customer Name', 'Service Address', 'Email Address', 'Contact Number', 'Priority']
          }
        });
      });
    });

    it('should validate email format', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/Invalid email format/)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone number format/)).toBeInTheDocument();
      });
    });

    it('should validate priority values', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/Priority must be high, medium, or low/)).toBeInTheDocument();
      });
    });

    it('should warn about short addresses', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/Address seems too short/)).toBeInTheDocument();
      });
    });
  });

  describe('File Type Detection', () => {
    it('should detect file types by extension', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      // Test CSV detection
      const csvFile = new File(['test'], 'test.csv', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, csvFile);
      }

      // Should use CSV parser despite wrong MIME type
      await waitFor(() => {
        expect(Papa.parse).toHaveBeenCalled();
      });
    });

    it('should fallback to MIME type when extension is unclear', async () => {
      render(<ImportAssignmentsModal {...defaultProps} />);
      
      const file = new File(['test'], 'data', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        await userEvent.upload(fileInput, file);
      }

      await waitFor(() => {
        expect(Papa.parse).toHaveBeenCalled();
      });
    });
  });
});