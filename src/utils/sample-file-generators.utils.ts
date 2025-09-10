/**
 * Sample file generation utilities for import assignments
 */

import * as XLSX from 'xlsx';
import { ASSIGNMENT_FIELDS } from './file-parsing.utils';

/**
 * Generate and download sample CSV file
 */
export const downloadSampleCSV = () => {
  const headers = ASSIGNMENT_FIELDS.map(f => f.label);
  const sampleRows = [
    ['John Doe', '123 Main St, City, State', '+1-555-0101', 'john@example.com', 'ACC12345', 'POLE001', 'high', '2024-01-15', 'Standard installation', 'Gate code: 1234'],
    ['Jane Smith', '456 Oak Ave, City, State', '+1-555-0102', 'jane@example.com', 'ACC12346', 'POLE002', 'medium', '2024-01-16', 'Requires ladder truck', 'Contact before arrival']
  ];
  
  const csvContent = [headers, ...sampleRows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-assignments.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generate and download sample Excel file
 */
export const downloadSampleExcel = () => {
  const sampleData = [
    {
      'Customer Name': 'John Doe',
      'Service Address': '123 Main St, City, State',
      'Contact Number': '+1-555-0101',
      'Email Address': 'john@example.com',
      'Account Number': 'ACC12345',
      'Pole Number': 'POLE001',
      'Priority': 'high',
      'Scheduled Date': '2024-01-15',
      'Installation Notes': 'Standard installation',
      'Access Notes': 'Gate code: 1234'
    },
    {
      'Customer Name': 'Jane Smith',
      'Service Address': '456 Oak Ave, City, State',
      'Contact Number': '+1-555-0102',
      'Email Address': 'jane@example.com',
      'Account Number': 'ACC12346',
      'Pole Number': 'POLE002',
      'Priority': 'medium',
      'Scheduled Date': '2024-01-16',
      'Installation Notes': 'Requires ladder truck',
      'Access Notes': 'Contact before arrival'
    }
  ];
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set column widths
  const columnWidths = [
    { wpx: 120 }, // Customer Name
    { wpx: 200 }, // Service Address  
    { wpx: 120 }, // Contact Number
    { wpx: 150 }, // Email Address
    { wpx: 120 }, // Account Number
    { wpx: 100 }, // Pole Number
    { wpx: 80 },  // Priority
    { wpx: 100 }, // Scheduled Date
    { wpx: 200 }, // Installation Notes
    { wpx: 200 }  // Access Notes
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assignments');
  
  // Generate Excel file
  XLSX.writeFile(workbook, 'sample-assignments.xlsx');
};

/**
 * Generate and download sample JSON file
 */
export const downloadSampleJSON = () => {
  const sampleData = [
    {
      customerName: 'John Doe',
      customerAddress: '123 Main St, City, State',
      contactNumber: '+1-555-0101',
      email: 'john@example.com',
      accountNumber: 'ACC12345',
      poleNumber: 'POLE001',
      priority: 'high',
      scheduledDate: '2024-01-15',
      installationNotes: 'Standard installation',
      accessNotes: 'Gate code: 1234'
    },
    {
      customerName: 'Jane Smith',
      customerAddress: '456 Oak Ave, City, State',
      contactNumber: '+1-555-0102',
      email: 'jane@example.com',
      accountNumber: 'ACC12346',
      poleNumber: 'POLE002',
      priority: 'medium',
      scheduledDate: '2024-01-16',
      installationNotes: 'Requires ladder truck',
      accessNotes: 'Contact before arrival'
    }
  ];
  
  const jsonContent = JSON.stringify(sampleData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-assignments.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};