#!/usr/bin/env python3
"""
Archon RAM Activation Script for FibreField
Automatically integrates FibreField with Archon RAM knowledge base
"""

import os
import sys
import json
import uuid
from datetime import datetime
from pathlib import Path

# Force UTF-8 encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_PATH = Path(__file__).parent
PROJECT_NAME = "FibreField Mobile PWA"
PROJECT_ID = str(uuid.uuid4())

def create_claude_md():
    """Create or update CLAUDE.md with Archon integration rules"""
    
    claude_content = f'''# CLAUDE.md - FibreField Project

## ARCHON RAM INTEGRATION ✅

**Status**: Active
**Project ID**: `{PROJECT_ID}`
**Activated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}

### Project Context
- **Type**: Progressive Web Application (PWA)
- **Languages**: TypeScript, JavaScript
- **Framework**: Next.js 15, React 19
- **Purpose**: Offline-capable field data collection for fiber optic infrastructure
- **Path**: {PROJECT_PATH}

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
1. archon:manage_task(action="list", project_id="{PROJECT_ID}", filter_by="status", filter_value="todo")
2. archon:perform_rag_query(query="[relevant feature/pattern]", match_count=5)
3. archon:search_code_examples(query="[implementation pattern]", match_count=3)
```

#### During Development:
```javascript
// Update task status immediately when starting:
archon:manage_task(action="update", task_id="[current_task_id]", update_fields={{"status": "doing"}})

// Search before implementing:
archon:perform_rag_query(query="[specific technical question]")

// Create tasks for discoveries:
archon:manage_task(action="create", project_id="{PROJECT_ID}", title="[new requirement]")
```

#### After Completing Work:
```javascript
// Mark task complete:
archon:manage_task(action="update", task_id="[task_id]", update_fields={{"status": "done"}})

// Document learnings:
// Add to knowledge base if new patterns discovered
```

### Quick Commands

**Get all project tasks:**
```
Show me all Archon tasks for FibreField project {PROJECT_ID}
```

**Search project knowledge:**
```
Search Archon for [topic] in FibreField project
```

**Create new task:**
```
Create Archon task: [description] for FibreField project
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
   PoleCapture {{
     id, projectId, contractorId, status,
     gpsLocation, photos: Array, poleNumber, notes,
     capturedBy, capturedAt, syncedAt
   }}
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
*Archon RAM Integration configured for optimal development workflow*
'''
    
    claude_path = PROJECT_PATH / "CLAUDE.md"
    with open(claude_path, 'w', encoding='utf-8') as f:
        f.write(claude_content)
    
    print(f"✅ Created CLAUDE.md at: {claude_path}")
    return PROJECT_ID

def add_to_archon_ram():
    """Add FibreField project to Archon RAM knowledge base"""
    
    try:
        from supabase import create_client
        
        SUPABASE_URL = "https://fsqjhqtvborvmoyfedwf.supabase.co"
        SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcWpocXR2Ym9ydm1veWZlZHdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MjIxMiwiZXhwIjoyMDcxMDI4MjEyfQ.LCDrQqY4S_PQlTwNhzlzKe_UouhauKJFrSFaWXxrRBM"
        
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Check if FibreField already exists
        existing = supabase.table('archon_ram_knowledge_sources').select('*').eq('name', 'FibreField Mobile PWA').execute()
        
        if existing.data:
            source_id = existing.data[0]['id']
            print(f"✅ FibreField already in Archon RAM (ID: {source_id[:8]}...)")
        else:
            # Create new source
            source_id = str(uuid.uuid4())
            source_data = {
                'id': source_id,
                'name': PROJECT_NAME,
                'source_type': 'project',
                'description': 'Progressive Web Application for offline-capable field data collection. Next.js 15, React 19, TypeScript. Mobile-first design for fiber optic pole installations.',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            supabase.table('archon_ram_knowledge_sources').insert(source_data).execute()
            print(f"✅ Added FibreField to Archon RAM (ID: {source_id[:8]}...)")
        
        # Add enhanced knowledge items
        knowledge_items = [
            {
                'content': 'FibreField PWA with Next.js 15.1.3, React 19.0.0, TypeScript 5.7.3. Offline-first architecture using IndexedDB/Dexie.js, service workers, and background sync.',
                'category': 'technical'
            },
            {
                'content': 'Pole capture workflow: GPS location, 6 required photos, offline queue, status tracking (draft/in_progress/captured/synced/error). Firebase integration for sync.',
                'category': 'features'
            },
            {
                'content': 'Current state: 70% UI complete, 0% API functional. Missing Radix UI components, authentication not implemented, photo upload backend needed.',
                'category': 'status'
            },
            {
                'content': 'Services: PoleCaptureService (offline storage), AuthService (Firebase), OfflineStorageService (IndexedDB), PhotoService (compression), LocationService (GPS).',
                'category': 'architecture'
            },
            {
                'content': 'Mobile-first responsive design with touch interactions, PWA capabilities, Capacitor for native APIs, Zustand state management, React Query for server state.',
                'category': 'mobile'
            }
        ]
        
        # Add knowledge items
        for item in knowledge_items:
            item_data = {
                'id': str(uuid.uuid4()),
                'source_id': source_id,
                'content': item['content'],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            try:
                supabase.table('archon_ram_knowledge_items').insert(item_data).execute()
                print(f"  ✅ Added: {item['content'][:50]}...")
            except Exception as e:
                print(f"  ⚠️ Could not add knowledge: {e}")
        
        return source_id
        
    except Exception as e:
        print(f"⚠️ Could not connect to Archon RAM: {e}")
        print("   Knowledge will be stored locally in CLAUDE.md")
        return None

def create_mcp_config():
    """Create MCP tool configuration for FibreField"""
    
    mcp_config = {
        "project": "FibreField",
        "tools": {
            "archon_ram": {
                "enabled": True,
                "auto_search": True,
                "project_id": PROJECT_ID
            },
            "task_management": {
                "enabled": True,
                "auto_create": True,
                "categories": ["bug", "feature", "optimization", "documentation"]
            },
            "knowledge_search": {
                "enabled": True,
                "sources": ["local", "archon_ram", "firebase_docs"]
            }
        },
        "workflows": {
            "before_coding": [
                "check_tasks",
                "search_patterns",
                "review_examples"
            ],
            "after_feature": [
                "update_task",
                "document_patterns",
                "add_to_knowledge"
            ]
        }
    }
    
    mcp_path = PROJECT_PATH / ".mcp" / "config.json"
    mcp_path.parent.mkdir(exist_ok=True)
    
    with open(mcp_path, 'w', encoding='utf-8') as f:
        json.dump(mcp_config, f, indent=2)
    
    print(f"✅ Created MCP configuration at: {mcp_path}")

def main():
    """Main activation process"""
    print("=" * 80)
    print("🧠 ARCHON RAM ACTIVATION FOR FIBREFIELD")
    print("=" * 80)
    print(f"Project: {PROJECT_NAME}")
    print(f"Location: {PROJECT_PATH}")
    print()
    
    # Step 1: Create CLAUDE.md
    print("📝 Creating CLAUDE.md with Archon rules...")
    project_id = create_claude_md()
    print()
    
    # Step 2: Add to Archon RAM
    print("💾 Adding FibreField to Archon RAM knowledge base...")
    source_id = add_to_archon_ram()
    print()
    
    # Step 3: Create MCP configuration
    print("🔧 Creating MCP tool configuration...")
    create_mcp_config()
    print()
    
    # Step 4: Summary
    print("=" * 80)
    print("✅ ARCHON RAM ACTIVATION COMPLETE")
    print("=" * 80)
    print()
    print("📋 Next Steps:")
    print("1. Restart your IDE to load new configuration")
    print("2. Use Archon commands to manage tasks")
    print("3. Search knowledge base before implementing")
    print("4. Update task status as you work")
    print()
    print("🎯 Quick Start Commands:")
    print(f'  archon:manage_task(action="list", project_id="{PROJECT_ID}")')
    print(f'  archon:perform_rag_query(query="offline storage", project="{PROJECT_NAME}")')
    print(f'  archon:search_code_examples(query="PWA service worker")')
    print()
    print("📚 Documentation:")
    print(f"  - CLAUDE.md: {PROJECT_PATH / 'CLAUDE.md'}")
    print(f"  - MCP Config: {PROJECT_PATH / '.mcp' / 'config.json'}")
    print()
    print("🚀 FibreField is now integrated with Archon RAM!")

if __name__ == "__main__":
    main()