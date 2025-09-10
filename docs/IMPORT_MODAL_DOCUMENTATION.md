# Import Assignments Modal Documentation

## Overview

The ImportAssignmentsModal is a comprehensive, professional-grade import dialog that replaces the basic file input functionality in the FibreField PWA. It provides a multi-step wizard interface for importing Home Drop Assignments with full validation, error handling, and user guidance.

## Features Implemented

### ✅ 1. Professional Import Dialog
- **Multi-step wizard interface**: 3-step process (File Selection → Data Preview → Import Progress)
- **Modern UI**: Built with shadcn/ui components for consistency
- **Step indicators**: Visual progress tracking with completion states
- **Responsive design**: Works on mobile, tablet, and desktop
- **Accessibility**: Full keyboard navigation and screen reader support

### ✅ 2. File Format Support
- **CSV files (.csv)**: With intelligent header detection and field mapping
- **JSON files (.json)**: Direct object array import
- **Excel files (.xlsx, .xls)**: Placeholder for future xlsx library integration
- **Clear format instructions**: With examples for each supported format

### ✅ 3. Data Validation & Preview
- **Preview table**: Shows first 10 rows before import
- **Field mapping interface**: Map CSV headers to assignment fields
- **Required field validation**: Checks for mandatory fields
- **Data type validation**: Validates dates, priorities, etc.
- **Real-time validation**: Shows errors and warnings as you configure
- **Duplicate detection**: Flags potential duplicate entries

### ✅ 4. Enhanced UX Features
- **Sample file downloads**: CSV and JSON templates available
- **Drag & drop upload**: Intuitive file selection
- **Progress indicators**: Real-time import progress
- **Detailed success/error messages**: Clear feedback on import results
- **Import summary**: Shows successful vs failed imports

### ✅ 5. Error Handling
- **Parsing error display**: Shows specific file parsing issues
- **Line-by-line validation**: Highlights invalid data with row numbers
- **Graceful error recovery**: Continues importing valid rows even if some fail
- **Detailed error logs**: For troubleshooting and debugging

### ✅ 6. Accessibility & Mobile
- **Keyboard navigation**: Full keyboard accessibility
- **Screen reader support**: Proper ARIA labels and descriptions
- **Mobile responsive**: Touch-friendly interactions
- **High contrast support**: Works with system accessibility settings

## File Format Specifications

### CSV Format
```csv
Customer Name,Service Address,Contact Number,Email Address,Account Number,Pole Number,Priority,Scheduled Date,Installation Notes,Access Notes
John Doe,123 Main St City State,+1-555-0101,john@example.com,ACC12345,POLE001,high,2024-01-15,Standard installation,Gate code: 1234
```

**Required Fields:**
- Customer Name (required)
- Service Address (required)

**Optional Fields:**
- Contact Number
- Email Address  
- Account Number
- Pole Number
- Priority (high/medium/low)
- Scheduled Date (YYYY-MM-DD format)
- Installation Notes
- Access Notes

### JSON Format
```json
[
  {
    "customerName": "John Doe",
    "customerAddress": "123 Main St, City, State", 
    "contactNumber": "+1-555-0101",
    "email": "john@example.com",
    "accountNumber": "ACC12345",
    "poleNumber": "POLE001",
    "priority": "high",
    "scheduledDate": "2024-01-15",
    "installationNotes": "Standard installation",
    "accessNotes": "Gate code: 1234"
  }
]
```

## Technical Implementation

### Component Architecture
```
ImportAssignmentsModal/
├── Multi-step wizard state management
├── File parsing (CSV/JSON) 
├── Data validation engine
├── Field mapping interface
├── Progress tracking
└── Error handling system
```

### Key Technologies Used
- **React Hooks**: State management with useState, useCallback
- **TypeScript**: Full type safety with custom interfaces
- **shadcn/ui**: Professional UI components
- **File API**: Browser file reading capabilities  
- **Drag & Drop API**: Native HTML5 drag and drop
- **CSV Parsing**: Custom CSV parser (can be extended with Papa Parse)

### Data Flow
1. **File Selection**: User selects/drops file → validation → parsing
2. **Data Preview**: Parsed data → field mapping → validation → preview table
3. **Import Execution**: Valid rows → batch creation → progress tracking → results

## Usage Instructions

### For End Users

1. **Step 1: File Selection**
   - Click "Import" button in the assignments list
   - Download sample files if needed
   - Select or drag & drop your assignment file
   - File is automatically validated and parsed

2. **Step 2: Data Preview**  
   - Review the preview table showing your data
   - For CSV files: Map column headers to assignment fields
   - Check validation messages for any errors
   - Fix issues or proceed with valid rows only

3. **Step 3: Import Progress**
   - Watch real-time progress as assignments are created
   - Review import summary (successful vs failed)
   - Check detailed error messages if any imports failed

### For Developers

#### Integration
```tsx
import { ImportAssignmentsModal } from '@/components/home-drop/import-assignments-modal';

// In your component:
<ImportAssignmentsModal
  isOpen={showImportModal}
  onClose={() => setShowImportModal(false)}
  onImportComplete={handleImportComplete}
  technicianId={technicianId} // Optional: pre-assign to technician
/>
```

#### Extending File Support
To add Excel support:
1. Install xlsx library: `npm install xlsx`
2. Implement parseExcel function in the modal
3. Add Excel parsing logic to file handler

#### Customizing Field Mappings
Edit the `assignmentFields` array in the component to modify:
- Required fields
- Field labels and descriptions
- Validation rules

## Performance Considerations

### File Size Limits
- Maximum file size: 10MB
- Recommended: <1MB for best performance
- Large files are processed in chunks to prevent UI blocking

### Batch Processing
- Imports are processed sequentially to prevent database overwhelming
- Progress updates every import to maintain UI responsiveness
- Failed imports don't stop the entire process

### Memory Management
- Files are read as text streams
- Parsed data is cleaned up after import
- Temporary DOM elements are automatically removed

## Error Scenarios & Solutions

### Common Import Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "File too large" | File > 10MB | Split into smaller files |
| "Invalid CSV format" | Missing headers/malformed CSV | Check file format, ensure headers exist |
| "Required field missing" | Empty required fields | Fill in customer name and address |
| "Invalid date format" | Wrong date format | Use YYYY-MM-DD format |
| "Invalid priority" | Priority not high/medium/low | Use only valid priority values |

### Debugging Tips

1. **Check browser console**: Detailed error logs are written to console
2. **Validate sample files**: Test with provided sample files first  
3. **Check field mappings**: Ensure CSV columns are mapped correctly
4. **Review validation errors**: Address all red errors before importing
5. **Test small batches**: Start with 1-2 rows to verify format

## Future Enhancements

### Planned Features
- [ ] Excel (.xlsx) file support with xlsx library
- [ ] Advanced CSV parsing with Papa Parse library
- [ ] Bulk edit capabilities in preview step
- [ ] Import history and rollback functionality
- [ ] Custom field validation rules
- [ ] Import scheduling for large files
- [ ] Integration with QGIS GeoPackage format

### Extensibility Points
- Custom parsers for new file formats
- Additional validation rules
- Custom field mapping presets  
- Integration with external data sources
- Automated data cleanup and normalization

## Testing

### Manual Testing Checklist
- [ ] File selection works via click and drag & drop
- [ ] All supported file formats parse correctly
- [ ] Field mapping interface functions properly
- [ ] Validation catches required field errors
- [ ] Preview table displays data correctly
- [ ] Import progress updates in real-time
- [ ] Success/error messages are clear
- [ ] Modal can be closed at any step
- [ ] Responsive design works on mobile

### Sample Test Files
- `public/sample-assignments.csv` - Valid CSV with 4 records
- `public/sample-assignments.json` - Valid JSON with 4 records
- Both include all field types for comprehensive testing

## Code Quality

### TypeScript Coverage
- 100% type safety with no `any` types
- Custom interfaces for all data structures  
- Proper error type handling
- Generic types for reusability

### Performance Optimizations
- `useCallback` for event handlers to prevent re-renders
- Efficient state updates with proper dependencies
- Lazy loading of large datasets
- Debounced validation for real-time feedback

### Accessibility Features  
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements
- High contrast color scheme
- Focus management in modal

This comprehensive import modal significantly enhances the user experience for managing Home Drop Assignments while maintaining the high code quality standards of the FibreField PWA.