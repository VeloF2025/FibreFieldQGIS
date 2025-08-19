# CLAUDE.md - FibreField Project

## ARCHON INTEGRATION

**Status**: Active
**Project ID**: `fibrefield-project`
**Activated**: 2025-08-19 14:14

### Project Context
- **Type**: Progressive Web Application (PWA)
- **Languages**: TypeScript, JavaScript
- **Framework**: Next.js 15, React 19
- **Purpose**: Offline-capable field data collection for fiber optic infrastructure
- **Path**: C:\Jarvis\AI Workspace\FibreField\fibrefield

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

3. **Data Models**
   ```typescript
   PoleCapture {
     id, projectId, contractorId, status,
     gpsLocation, photos: Array, poleNumber, notes,
     capturedBy, capturedAt, syncedAt
   }
   ```

4. **Current Issues**
   - Build failures due to missing UI components (@radix-ui)
   - No functional API integration
   - Authentication scaffolded but not implemented
   - Photo upload UI exists but lacks backend logic
   - 70% UI complete, 0% API functional

5. **Integration Points**
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
// Core Services
PoleCaptureService    // 460 lines - handles offline storage
AuthService          // Firebase authentication
OfflineStorageService // IndexedDB management
PhotoService         // Capture and compression
LocationService      // GPS and geolocation
SyncService         // Background synchronization
```

### API Endpoints (Planned)

```
POST /api/poles/capture    // Submit pole capture
GET  /api/poles/pending    // Get pending captures
POST /api/photos/upload    // Upload photos
GET  /api/projects         // Get available projects
GET  /api/contractors      // Get contractor list
POST /api/sync/batch       // Batch sync offline data
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

### Integration Rules

1. **Mobile-First Design** - All UI must be touch-friendly
2. **Offline-First Data** - Always cache locally first
3. **Progressive Enhancement** - Core features work without network
4. **Firebase Integration** - Use shared project configuration
5. **Type Safety** - 100% TypeScript, no any types

---
*Archon Integration configured by @Archon activation protocol*
