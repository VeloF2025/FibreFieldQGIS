# PRD: FibreField Home Drop Capture Enhancement

## Product Overview

**Feature Name**: Home Drop Capture  
**Purpose**: Capture installation data for fiber home drop installations that are connected to specific poles, with integrated navigation, admin approval workflow, and QGIS/QField compatibility.

## Current Application Analysis

### Existing Pole Capture Workflow:
- **4-step process**: Basic Info → GPS Location → Photo Capture → Review & Save
- **6 photo types**: before, front, side, depth, concrete, compaction (3 required minimum)
- **Offline-first architecture**: IndexedDB storage with Dexie.js, background sync
- **GPS validation**: High-accuracy positioning with nearest pole detection
- **Service layer**: `PoleCaptureService` (460 lines) with full CRUD operations
- **Reusable components**: Multi-photo capture with compression

## Feature Requirements

### 1. Core Home Drop Capture

#### 1.1 Workflow Structure (4 Steps - Mirror Pole Capture)
1. **Drop Selection & Basic Info**
   - Select from assigned drops (not free-form entry)
   - Display: Drop Number + Connected Pole Number
   - Project info auto-populated from assignment
   - Notes field (optional)

2. **GPS Location with Navigation**
   - High-accuracy GPS capture
   - Visual map showing drop location and connected pole
   - Navigation guidance to assigned location
   - Validate proximity to assigned pole location
   - Warning if >100m from connected pole

3. **Photo Capture (4 Required Photos)**
   - Power Meter Test Result
   - Fibertime/Nokia Setup Confirmation Screenshot  
   - Fibertime/Nokia Device Actions Screenshot
   - Router and 4 Lights Status Photo

4. **Review & Save**
   - Show drop-to-pole relationship
   - Data validation and final submission
   - Offline queue for backend sync

#### 1.2 Key Architectural Requirements
- **Pole-Drop Relationship**: Every home drop MUST be connected to a pole number
- **Backend Pre-Assignment**: Drops assigned to technicians with pole associations
- **QGIS/QField Compatibility**: Data exchange via GeoPackage format
- **Offline-First**: Full functionality without network connection

### 2. Visual Navigation System

#### 2.1 Map Integration (QGIS/QField Compatible)
- **Base Maps**: OpenStreetMap, MBTiles for offline use
- **Assignment Display**: Show assigned drops and connected poles on map
- **Navigation**: GPS-guided routing to each location
- **Proximity Alerts**: Notify when within 50m of target
- **Multi-stop Routing**: Optimize route between multiple assignments

#### 2.2 QGIS Integration
- **Data Import**: Load assignments from QGIS GeoPackage exports
- **Coordinate Systems**: Support EPSG:4326 and project-specific CRS
- **Layer Support**: Poles, drops, service areas, road networks
- **Export Compatibility**: Generate QGIS-compatible capture results

### 3. Admin/Supervisor Approval System

#### 3.1 Web Dashboard Features
- **Capture Review Interface**: List all submitted captures
- **Photo Gallery**: View captured photos with zoom and annotation
- **Approval Workflow**: Approve/reject/request changes with notes
- **Batch Operations**: Bulk approval for multiple captures
- **Geographic Context**: Review captures on interactive map

#### 3.2 Approval Process
- **Quality Checklist**: Standardized approval criteria for each photo type
- **Review Status Tracking**: pending → approved → rejected → changes_requested
- **Notification System**: Alert field workers of approval status
- **Revision Workflow**: Handle rejected captures and resubmissions

### 4. Enhanced Photo Management

#### 4.1 Photo Storage System
- **Cloud Storage**: High-resolution originals in AWS S3/Firebase Storage
- **Thumbnails**: Multiple sizes for mobile app performance
- **Metadata**: GPS coordinates, timestamps, approval status
- **Geotagging**: EXIF GPS data for QGIS compatibility

#### 4.2 Client Delivery System
- **Photo Packages**: Bundle approved photos by project/client
- **Bulk Downloads**: Generate ZIP files with metadata
- **Access Control**: Secure download links with expiration
- **Delivery Tracking**: Monitor client access and downloads

## Data Architecture

### Core Data Models

```typescript
// Assignment data (from backend/QGIS)
export interface HomeDropAssignment {
  id: string;
  dropNumber: string;
  connectedPoleNumber: string; // Critical: Pole relationship
  projectId: string;
  projectName: string;
  expectedLocation?: GPSLocation;
  assignedTo: string;
  assignedAt: Date;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
}

// Capture data (created by mobile)
export interface HomeDropCapture {
  id: string;
  assignmentId: string;
  dropNumber: string;
  connectedPoleNumber: string; // From assignment
  projectId: string;
  
  status: 'draft' | 'in_progress' | 'captured' | 'synced' | 'error';
  gpsLocation?: GPSLocation;
  photos: CapturedPhoto[];
  
  // Review workflow
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

// Photo types specific to home drops
export type HomeDropPhotoType = 
  | 'power-meter-test' 
  | 'fibertime-setup-confirmation'
  | 'fibertime-device-actions'
  | 'router-4-lights-status';
```

## Technical Implementation

### New Components Required

1. **Services**
   - `src/services/home-drop-assignment.service.ts` - Assignment sync
   - `src/services/home-drop-capture.service.ts` - Capture workflow
   - `src/services/map-navigation.service.ts` - Navigation and routing

2. **Mobile App Pages**
   - `src/app/home-drop-capture/assignments/page.tsx` - Assignment list
   - `src/app/home-drop-capture/[assignmentId]/page.tsx` - Capture workflow
   - `src/app/home-drop-capture/navigation/page.tsx` - Map navigation

3. **Admin Web Interface**
   - `src/app/admin/captures/page.tsx` - Review dashboard
   - `src/app/admin/captures/[captureId]/page.tsx` - Individual review
   - `src/app/admin/photos/gallery/page.tsx` - Photo management
   - `src/app/admin/client-packages/page.tsx` - Client delivery

4. **Database Extensions**
   - `homeDropAssignments` table - Assignment data
   - `homeDropCaptures` table - Capture data  
   - `homeDropPhotos` table - Photo storage with metadata
   - `clientPhotoPackages` table - Client delivery tracking

### Backend API Requirements

```typescript
// Assignment management
GET /api/home-drops/assignments/{technicianId}
PUT /api/home-drops/assignments/{assignmentId}/status

// Capture submission
POST /api/home-drops/captures
GET /api/home-drops/captures/{captureId}

// Review workflow  
GET /api/admin/captures/pending-review
PUT /api/admin/captures/{captureId}/review

// Photo management
POST /api/photos/upload
GET /api/photos/{photoId}/download
POST /api/client-packages/create

// Navigation support
GET /api/poles/{poleNumber}/location
GET /api/navigation/route
```

## QGIS/QField Integration

### Data Exchange Format
- **Import**: QGIS GeoPackage with assignment layers
- **Export**: GeoPackage with completed captures for QGIS import
- **Compatibility**: EPSG:4326 coordinate system, standard attribute schemas
- **Photos**: Geotagged JPEG with EXIF GPS data

### Workflow Integration
1. **QGIS Planning**: Create assignments with pole-drop relationships
2. **Export**: Generate GeoPackage for FibreField import
3. **Field Capture**: Complete assignments using FibreField mobile app
4. **Import Back**: Load completed captures into QGIS for analysis

## Success Metrics

### Field Worker Efficiency
- **Navigation Accuracy**: <10m GPS accuracy at target locations
- **Completion Rate**: >95% successful capture rate
- **Time Reduction**: 30% faster location finding with navigation

### Admin Productivity
- **Review Speed**: <3 minutes average review time per capture
- **Approval Rate**: Track approval vs. rejection ratios
- **Client Delivery**: Automated package generation and delivery

### System Performance
- **Offline Capability**: 100% function without network
- **Sync Reliability**: <1% data loss in offline scenarios  
- **Photo Quality**: Maintain image quality through compression

## Implementation Phases

**Phase 1 (4-6 weeks)**: Core home drop capture workflow + navigation
**Phase 2 (3-4 weeks)**: Admin review interface + approval workflow
**Phase 3 (2-3 weeks)**: Photo management + client delivery system
**Phase 4 (2-3 weeks)**: QGIS integration + testing

**Total Estimated Timeline**: 11-16 weeks

## Deliverables

1. **Mobile App Enhancement**: Complete home drop capture workflow
2. **Admin Web Dashboard**: Review and approval interface  
3. **Photo Management System**: Storage, approval, and client delivery
4. **Navigation Integration**: GPS-guided field worker assistance
5. **QGIS Compatibility**: Data exchange and workflow integration
6. **Documentation**: User guides and technical specifications

---

*This PRD provides a comprehensive roadmap for implementing the home drop capture feature while maintaining compatibility with your existing QGIS/QField infrastructure and adding the navigation and approval capabilities requested.*

**Document Created**: 2025-09-08  
**Version**: 1.0  
**Status**: Draft for Review