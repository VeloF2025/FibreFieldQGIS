# FibreField Home Drop Capture Enhancement Specification

## Project Overview
Enhancement to the existing FibreField PWA to add comprehensive Home Drop Capture capabilities with QGIS/QField integration, admin approval workflow, and client delivery system.

## 1. Data Models

### 1.1 HomeDropCapture Model
```typescript
interface HomeDropCapture {
  id: string;
  projectId: string;
  contractorId: string;
  poleId: string; // Links to originating pole
  assignmentId: string;
  
  // Location Data
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    timestamp: Date;
  };
  
  // 4-Step Workflow Status
  status: 'draft' | 'assignment_selected' | 'gps_validated' | 'photos_captured' | 'review_complete' | 'submitted' | 'synced' | 'error';
  currentStep: 1 | 2 | 3 | 4; // Assignment → GPS → Photos → Review
  
  // Photo Requirements (4 specific types)
  photos: {
    powerMeter: Photo | null;
    fibertimeSetup: Photo | null;
    deviceActions: Photo | null;
    routerLights: Photo | null;
  };
  
  // Service Information
  dropNumber: string;
  serviceAddress: string;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    serviceType: string;
  };
  
  // QGIS Integration
  qgisData: {
    featureId: string;
    layerName: string;
    geometry: GeoJSON.Geometry;
    attributes: Record<string, any>;
    crs: string; // Coordinate reference system
  };
  
  // Approval Workflow
  approvalStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  qualityScore?: number; // 0-100 based on photo quality validation
  
  // Client Delivery
  clientDelivered: boolean;
  deliveredAt?: Date;
  deliveryMethod?: 'email' | 'portal' | 'usb' | 'cloud_link';
  
  // Metadata
  capturedBy: string;
  capturedAt: Date;
  syncedAt?: Date;
  lastModified: Date;
  version: number;
}
```

### 1.2 Assignment Model
```typescript
interface Assignment {
  id: string;
  projectId: string;
  assignedTo: string; // Technician ID
  createdBy: string; // Admin/Manager ID
  
  // Assignment Details
  title: string;
  description: string;
  serviceAddress: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Location & Area
  serviceArea: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Requirements & Constraints
  estimatedDuration: number; // minutes
  requirements: string[];
  specialInstructions?: string;
  requiredEquipment: string[];
  
  // Status Tracking
  status: 'created' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Metadata
  createdAt: Date;
  lastModified: Date;
}
```

### 1.3 Photo Model (Enhanced)
```typescript
interface Photo {
  id: string;
  type: 'power_meter' | 'fibertime_setup' | 'device_actions' | 'router_lights';
  
  // File Data
  filename: string;
  filepath: string;
  fileSize: number;
  mimeType: string;
  
  // Image Properties
  width: number;
  height: number;
  orientation: number;
  
  // Capture Metadata
  capturedAt: Date;
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // Quality Validation
  qualityScore: number; // 0-100
  qualityChecks: {
    brightness: 'pass' | 'fail' | 'warning';
    focus: 'pass' | 'fail' | 'warning';
    composition: 'pass' | 'fail' | 'warning';
    relevance: 'pass' | 'fail' | 'warning';
  };
  
  // Processing
  compressed: boolean;
  compressionRatio?: number;
  thumbnailPath?: string;
  
  // Upload Status
  uploaded: boolean;
  uploadedAt?: Date;
  firebaseUrl?: string;
  
  // Validation
  validated: boolean;
  validatedBy?: string;
  validatedAt?: Date;
  validationNotes?: string;
}
```

### 1.4 QGisIntegration Model
```typescript
interface QGisIntegration {
  id: string;
  projectId: string;
  
  // GeoPackage Details
  geoPackagePath: string;
  layerName: string;
  featureCount: number;
  
  // Coordinate System
  sourceCrs: string;
  targetCrs: string; // Usually EPSG:4326 for GPS
  
  // Import/Export Status
  lastImportAt?: Date;
  lastExportAt?: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  
  // Field Mapping
  fieldMapping: Record<string, string>; // QGIS field → App field
  
  // Features
  features: {
    id: string;
    geometry: GeoJSON.Geometry;
    properties: Record<string, any>;
    linked: boolean; // Is linked to a home drop capture
    homeDropId?: string;
  }[];
  
  // Metadata
  createdAt: Date;
  lastModified: Date;
}
```

## 2. Four-Step Capture Workflow

### Step 1: Assignment Selection
**Purpose**: Select and accept assignments for home drop captures
**UI Components**: Assignment list, filters, acceptance dialog
**Validations**: 
- Assignment must be active and assigned to current user
- No conflicting assignments in same time slot
- Required equipment availability check

**Data Flow**:
1. Fetch assignments from API
2. Display filtered list based on technician
3. Allow assignment acceptance
4. Update assignment status to 'accepted'
5. Initialize HomeDropCapture record

### Step 2: GPS Validation
**Purpose**: Validate and record precise location with accuracy requirements
**UI Components**: GPS status indicator, accuracy meter, location map
**Requirements**:
- Minimum accuracy: 3 meters
- Maximum timeout: 60 seconds
- Fallback to manual coordinate entry if GPS fails

**Data Flow**:
1. Request high-accuracy GPS position
2. Validate accuracy meets requirements
3. Display location on map for verification
4. Allow manual coordinate adjustment if needed
5. Save validated coordinates to capture record

### Step 3: Photo Capture (4 Required Types)
**Purpose**: Capture and validate 4 specific photo types
**Photo Types**:
1. **Power Meter**: Reading and device status
2. **Fibertime Setup**: Equipment configuration and connections
3. **Device Actions**: Installation and configuration steps  
4. **Router Lights**: Status indicators and connectivity verification

**Quality Requirements**:
- Minimum resolution: 1920x1080
- Maximum file size: 5MB (after compression)
- Required metadata: GPS coordinates, timestamp
- Quality validation: brightness, focus, composition checks

**UI Components**: Camera interface, photo preview, quality validation feedback
**Data Flow**:
1. Camera interface for each photo type
2. Real-time quality validation during capture
3. Allow retake if quality insufficient
4. Compress and store locally with metadata
5. Update capture record with photo references

### Step 4: Review & Submission
**Purpose**: Final review of all captured data before submission
**UI Components**: Summary view, photo gallery, edit options, submission confirmation
**Validations**:
- All 4 photos captured and validated
- GPS coordinates within accuracy requirements
- Assignment details confirmed
- Quality scores meet minimum thresholds

**Data Flow**:
1. Display comprehensive summary of capture
2. Allow editing of any step (with validation)
3. Final quality check of all components
4. Submit to admin approval queue
5. Queue for offline sync if no network

## 3. QGIS/QField Integration Specifications

### 3.1 GeoPackage Format Support
**File Format**: .gpkg (SQLite-based)
**Coordinate Systems**: Support for EPSG:4326 (WGS84) and local projections
**Feature Types**: Points, lines, polygons for service areas and infrastructure

### 3.2 Import/Export Workflow
**Import Process**:
1. Select .gpkg file from device storage
2. Parse layer structure and coordinate system
3. Extract features and attributes
4. Map QGIS fields to app data model
5. Create assignments from features

**Export Process**:
1. Collect all completed home drop captures
2. Convert to GeoPackage format with proper CRS
3. Include photos as embedded or linked resources
4. Generate metadata and attribution
5. Save to device for QGIS import

### 3.3 Field Mapping Configuration
```typescript
interface FieldMapping {
  qgisField: string;
  appField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
  transformation?: string; // JS function for data transformation
}
```

## 4. Admin Approval Workflow

### 4.1 Approval States
1. **Pending**: Initial submission from technician
2. **Under Review**: Admin actively reviewing
3. **Approved**: Passed quality validation
4. **Rejected**: Failed validation, returned to technician
5. **Completed**: Approved and delivered to client

### 4.2 Quality Validation Criteria
**Photo Quality (70 points)**:
- Brightness/Exposure (20 points)
- Focus/Sharpness (20 points)
- Composition/Framing (15 points)
- Relevance to type (15 points)

**Data Quality (30 points)**:
- GPS accuracy (10 points)
- Completeness (10 points)
- Consistency (10 points)

**Minimum Passing Score**: 75/100

### 4.3 Admin Dashboard Features
- **Pending Approvals Queue**: Prioritized list of submissions
- **Photo Viewer**: Full-screen photo review with quality metrics
- **Batch Actions**: Approve/reject multiple submissions
- **Quality Reports**: Analytics on technician performance
- **Client Delivery**: Prepare and send approved packages

## 5. Photo Management & Client Delivery

### 5.1 Photo Processing Pipeline
1. **Capture**: High-resolution capture with metadata
2. **Compression**: Reduce file size while maintaining quality
3. **Quality Check**: Automated validation scoring
4. **Thumbnail Generation**: Create preview images
5. **Upload**: Secure upload to Firebase Storage
6. **Approval**: Admin quality validation
7. **Client Package**: Prepare delivery-ready package

### 5.2 Client Delivery Options
**Email Delivery**: Compressed package with download links
**Portal Access**: Secure client portal with project access
**Cloud Link**: Shared folder with access controls
**USB Export**: Local export for physical delivery

### 5.3 Delivery Package Contents
- All 4 validated photos (high resolution)
- Location map with service address
- Capture metadata and timestamps
- Quality validation report
- Service completion certificate

## 6. Pole-Drop Relationship Tracking

### 6.1 Relationship Model
```typescript
interface PoleDropRelation {
  id: string;
  poleId: string;
  homeDropId: string;
  relationshipType: 'direct_feed' | 'splitter_fed' | 'cascade_fed';
  
  // Network Path
  cableLength: number; // meters
  splitterCount: number;
  intermediatePoints: Array<{
    latitude: number;
    longitude: number;
    description: string;
  }>;
  
  // Service Details
  serviceType: 'residential' | 'business' | 'enterprise';
  bandwidth: string;
  installDate: Date;
  
  // Status
  active: boolean;
  createdAt: Date;
  lastModified: Date;
}
```

### 6.2 Coverage Area Tracking
**Service Areas**: Polygonal coverage areas linked to poles
**Capacity Planning**: Track connections per pole vs capacity
**Network Visualization**: Map view of pole-drop relationships
**Reporting**: Coverage reports and utilization analytics

## 7. Offline Architecture Considerations

### 7.1 Data Synchronization Strategy
**Priority Order**:
1. Critical captures (completed workflow)
2. Assignment updates
3. Photo uploads
4. Quality validations
5. Analytics data

### 7.2 Conflict Resolution
**Last-Write-Wins**: For most data with timestamp comparison
**Admin Override**: Admin changes always take precedence
**Photo Immutability**: Photos cannot be changed once validated
**Version Control**: Track version numbers for conflict detection

### 7.3 Storage Requirements
**Local Storage**: 500MB minimum for offline operation
**Photo Cache**: 200MB for captured photos
**Map Cache**: 100MB for offline mapping
**Data Cache**: 50MB for assignments and captures
**Sync Queue**: 50MB for pending uploads

## 8. Security & Privacy Considerations

### 8.1 Data Protection
**Client Photos**: Encrypted at rest and in transit
**Location Data**: Anonymized after service completion
**Personal Info**: GDPR compliant handling and retention
**Access Controls**: Role-based access to sensitive data

### 8.2 Authentication & Authorization
**Technician Access**: Can only view assigned tasks
**Admin Access**: Full approval and management capabilities
**Client Access**: Read-only access to their own data
**Audit Trail**: Complete log of all data access and changes

## 9. Performance Requirements

### 9.1 Mobile Performance
**App Startup**: < 3 seconds on 4G connection
**Photo Capture**: < 1 second from tap to capture
**GPS Lock**: < 30 seconds under normal conditions
**Offline Sync**: Background sync without UI blocking
**Battery Impact**: Minimal drain during normal operation

### 9.2 Storage Efficiency
**Photo Compression**: 70-80% size reduction with quality preservation
**Database Optimization**: Indexed queries for fast search
**Cache Management**: Automatic cleanup of old data
**Incremental Sync**: Only sync changed data

## 10. Implementation Phases

### Phase 1: Core Workflow (Weeks 1-2)
- Basic 4-step capture workflow
- Photo capture and storage
- GPS validation
- Local data models

### Phase 2: Admin System (Weeks 3-4)
- Admin approval dashboard
- Photo quality validation
- Basic client delivery

### Phase 3: QGIS Integration (Weeks 5-6)
- GeoPackage import/export
- Field mapping configuration
- Coordinate system handling

### Phase 4: Advanced Features (Weeks 7-8)
- Pole-drop relationship tracking
- Advanced analytics and reporting
- Performance optimization

### Phase 5: Polish & Testing (Weeks 9-10)
- End-to-end testing
- Performance optimization
- User acceptance testing
- Documentation completion

---

*This specification serves as the comprehensive blueprint for the Home Drop Capture enhancement to the FibreField application.*