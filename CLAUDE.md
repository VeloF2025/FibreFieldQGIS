# CLAUDE.md - FibreField Project

## ARCHON INTEGRATION

**Status**: Active - Enhanced for Home Drop Capture
**Project ID**: `fibrefield-project`
**Activated**: 2025-08-19 14:14
**Enhanced**: 2025-09-08 (Home Drop Capture Feature)

### Project Context
- **Type**: Progressive Web Application (PWA) 
- **Languages**: TypeScript, JavaScript
- **Framework**: Next.js 15, React 19
- **Purpose**: Offline-capable field data collection for fiber optic infrastructure with Home Drop Capture
- **Path**: C:\Jarvis\AI Workspace\FibreField
- **Enhancement**: Home Drop Capture workflow with QGIS/QField integration

### Tech Stack
- Next.js 15.1.3
- React 19.0.0
- TypeScript 5.7.3
- Tailwind CSS 3.4.17
- Firebase SDK 11.1.0
- Dexie.js (IndexedDB)
- Capacitor (Native APIs)
- Zustand (State Management)
- React Query (Server State)

### MANDATORY WORKFLOW RULES

#### Before Starting ANY Task:
```javascript
// ALWAYS execute these checks first:
1. archon:manage_task(action="list", project_id="fibrefield-project", filter_by="status", filter_value="todo")
2. archon:perform_rag_query(query="[relevant feature/pattern]", match_count=5)
3. archon:search_code_examples(query="[implementation pattern]", match_count=3)
```

#### During Development:
```javascript
// Update task status immediately when starting:
archon:manage_task(action="update", task_id="[current_task_id]", update_fields={"status": "doing"})

// Search before implementing:
archon:perform_rag_query(query="[specific technical question]")

// Create tasks for discoveries:
archon:manage_task(action="create", project_id="fibrefield-project", title="[new requirement]")
```

#### After Completing Work:
```javascript
// Mark task complete:
archon:manage_task(action="update", task_id="[task_id]", update_fields={"status": "done"})

// Document learnings:
// Add to knowledge base if new patterns discovered
```

### Quick Commands

**Get all project tasks:**
```
Show me all Archon tasks for project fibrefield-project
```

**Search project knowledge:**
```
Search Archon for [topic] in project fibrefield-project
```

**Create new task:**
```
Create Archon task: [description] for project fibrefield-project
```

### FibreField Specific Knowledge

#### Core Features
1. **Offline-First Architecture**
   - IndexedDB with Dexie.js for local persistence
   - Service worker for offline caching
   - Background sync queue for data synchronization

2. **Pole Capture Workflow**
   - GPS location tracking with accuracy validation
   - 6 required photos per pole (before, front, side, depth, concrete, compaction)
   - Status tracking: draft → in_progress → captured → synced → error
   - Offline queue management

3. **Home Drop Capture Workflow (NEW ENHANCEMENT)**
   - **4-Step Capture Process**:
     1. **Assignments**: Select and assign home drop tasks
     2. **GPS**: Validate and record location with accuracy requirements
     3. **Photos**: Capture 4 required photo types with quality validation
     4. **Review**: Final review and submission workflow
   
   - **4 Required Photo Types**:
     1. **Power Meter**: Reading and device status
     2. **Fibertime Setup**: Equipment configuration and connections  
     3. **Device Actions**: Installation and configuration steps
     4. **Router Lights**: Status indicators and connectivity verification
   
   - **QGIS/QField Integration**:
     - Import/export GeoPackage (.gpkg) format
     - Synchronized field data with desktop GIS
     - Offline mapping capabilities
     - GPS track recording and waypoint management
   
   - **Admin Approval Workflow**:
     - Pending → Under Review → Approved/Rejected → Complete
     - Photo quality validation and approval
     - Client delivery preparation
     - Status tracking and notifications
   
   - **Pole-Drop Relationship Tracking**:
     - Link home drops to originating poles
     - Track service coverage areas  
     - Relationship mapping and visualization
     - Data integrity validation

4. **Data Models**
   ```typescript
   PoleCapture {
     id, projectId, contractorId, status,
     gpsLocation, photos: Array, poleNumber, notes,
     capturedBy, capturedAt, syncedAt
   }
   
   HomeDropCapture {
     id, projectId, contractorId, poleId, status,
     assignmentId, gpsLocation, accuracy,
     photos: {
       powerMeter: Photo,
       fibertimeSetup: Photo,
       deviceActions: Photo,
       routerLights: Photo
     },
     dropNumber, serviceAddress, customerInfo,
     qgisData: GeoPackageFeature,
     approvalStatus, approvedBy, approvedAt,
     capturedBy, capturedAt, syncedAt,
     clientDelivered, deliveredAt
   }
   
   Assignment {
     id, projectId, assignedTo, status,
     dueDate, priority, serviceArea,
     estimatedDuration, requirements,
     createdBy, createdAt, completedAt
   }
   ```

5. **Current Issues & Enhancement Requirements**
   - Build failures due to missing UI components (@radix-ui)
   - No functional API integration
   - Authentication scaffolded but not implemented
   - Photo upload UI exists but lacks backend logic
   - 70% UI complete, 0% API functional
   - **NEW**: Home Drop Capture workflow needs implementation
   - **NEW**: QGIS/QField integration requires GeoPackage handling
   - **NEW**: Admin approval system needs backend implementation
   - **NEW**: Pole-drop relationship tracking system

6. **Integration Points**
   - Shares Firebase project: fibreflow-73daf
   - API mismatch: expects REST but FibreFlow uses Firestore SDK
   - Needs alignment with main FibreFlow patterns

### Development Guidelines

1. **NEVER** start coding without checking Archon tasks
2. **ALWAYS** search Archon before implementing new patterns
3. **UPDATE** task status in real-time as work progresses
4. **CREATE** tasks for any new requirements discovered
5. **SEARCH** knowledge base before asking questions

### Service Architecture

```typescript
// Core Services (Existing)
PoleCaptureService    // 460 lines - handles offline storage
AuthService          // Firebase authentication
OfflineStorageService // IndexedDB management
PhotoService         // Capture and compression
LocationService      // GPS and geolocation
SyncService         // Background synchronization

// New Services (Home Drop Enhancement)
HomeDropCaptureService // Home drop workflow management
AssignmentService     // Task assignment and tracking
QgisIntegrationService // GeoPackage import/export
ApprovalWorkflowService // Admin approval system
PoleDropRelationService // Relationship tracking
ClientDeliveryService // Photo delivery management
GeoPackageService    // QGIS/QField data handling
```

### API Endpoints (Planned)

```
// Existing Pole Capture API
POST /api/poles/capture    // Submit pole capture
GET  /api/poles/pending    // Get pending captures
POST /api/photos/upload    // Upload photos
GET  /api/projects         // Get available projects
GET  /api/contractors      // Get contractor list
POST /api/sync/batch       // Batch sync offline data

// NEW: Home Drop Capture API
GET  /api/assignments             // Get assignments for technician
POST /api/assignments/{id}/accept // Accept assignment
GET  /api/home-drops/pending      // Get pending home drop captures
POST /api/home-drops/capture      // Submit home drop capture
PUT  /api/home-drops/{id}/status  // Update capture status

// NEW: Photo Management API
POST /api/home-drops/{id}/photos/{type}  // Upload specific photo type
GET  /api/home-drops/{id}/photos         // Get all photos for drop
POST /api/photos/validate                // Validate photo quality

// NEW: QGIS/QField Integration API  
GET  /api/qgis/export/{projectId}.gpkg   // Export GeoPackage
POST /api/qgis/import                    // Import GeoPackage data
GET  /api/qgis/features/{layerName}      // Get layer features

// NEW: Admin Approval API
GET  /api/admin/pending-approvals        // Get items awaiting approval
POST /api/admin/approve/{id}             // Approve home drop capture
POST /api/admin/reject/{id}              // Reject with feedback
GET  /api/admin/reports/completion       // Completion reports

// NEW: Client Delivery API
POST /api/delivery/prepare/{id}          // Prepare client delivery package
GET  /api/delivery/status/{id}           // Check delivery status
POST /api/delivery/send/{id}             // Send to client

// NEW: Pole-Drop Relations API
GET  /api/relations/pole/{poleId}/drops  // Get drops for pole
POST /api/relations/link                 // Link drop to pole
GET  /api/relations/coverage/{areaId}    // Get coverage area data
```

### Known Issues & Solutions

1. **Missing Radix UI Components**
   - Install: `npm install @radix-ui/react-switch @radix-ui/react-slider`

2. **API Integration Mismatch**
   - Replace REST calls with Firebase SDK
   - Use AngularFire patterns from main app

3. **Authentication Not Working**
   - Implement Firebase Auth with same config
   - Share auth state with main FibreFlow

4. **Photo Upload Backend**
   - Use Firebase Storage
   - Implement compression before upload

5. **NEW: QGIS/QField Integration Requirements**
   - Install: `npm install @mapbox/geojsonhint gdal-js`
   - Implement GeoPackage reader/writer
   - Handle coordinate system transformations

6. **NEW: Home Drop Capture Workflow**
   - Create stepper component for 4-step process
   - Implement assignment selection interface
   - Build photo capture UI for 4 specific types

7. **NEW: Admin Approval System**
   - Design approval dashboard interface
   - Implement photo quality validation
   - Create client delivery pipeline

8. **NEW: Pole-Drop Relationship System**
   - Design relationship database schema
   - Implement mapping visualization
   - Create coverage area reporting

### Integration Rules

1. **Mobile-First Design** - All UI must be touch-friendly
2. **Offline-First Data** - Always cache locally first
3. **Progressive Enhancement** - Core features work without network
4. **Firebase Integration** - Use shared project configuration
5. **Type Safety** - 100% TypeScript, no any types
6. **NEW: QGIS Compatibility** - All geospatial data must be QGIS/QField compatible
7. **NEW: Photo Quality Standards** - All photos must meet minimum quality thresholds
8. **NEW: Workflow Consistency** - 4-step process must be followed for all captures
9. **NEW: Admin Approval Required** - All captures require approval before client delivery
10. **NEW: Relationship Integrity** - All drops must be linked to originating poles

---
*Archon Integration configured by @Archon activation protocol*
