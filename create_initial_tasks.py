#!/usr/bin/env python3
"""
Create initial Archon RAM tasks for FibreField development
"""

import sys
import json
from datetime import datetime

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ID = "215e643e-f2c1-4566-911f-b4ac8fa58256"  # From activation
PROJECT_NAME = "FibreField Mobile PWA"

# Initial tasks based on current state
INITIAL_TASKS = [
    {
        "title": "Fix missing Radix UI components build error",
        "description": "Install @radix-ui/react-switch and @radix-ui/react-slider to fix build failures",
        "priority": "high",
        "category": "bug",
        "status": "todo"
    },
    {
        "title": "Implement Firebase Authentication",
        "description": "Complete Firebase Auth integration using shared fibreflow-73daf project config",
        "priority": "high",
        "category": "feature",
        "status": "todo"
    },
    {
        "title": "Replace REST API calls with Firebase SDK",
        "description": "Align with main FibreFlow app by using Firestore SDK instead of REST endpoints",
        "priority": "high",
        "category": "refactor",
        "status": "todo"
    },
    {
        "title": "Implement photo upload backend with Firebase Storage",
        "description": "Complete photo upload functionality using Firebase Storage with compression",
        "priority": "medium",
        "category": "feature",
        "status": "todo"
    },
    {
        "title": "Complete offline sync queue implementation",
        "description": "Finish background sync service for offline data synchronization",
        "priority": "medium",
        "category": "feature",
        "status": "todo"
    },
    {
        "title": "Add GPS accuracy validation",
        "description": "Implement GPS accuracy threshold checking before accepting location",
        "priority": "medium",
        "category": "feature",
        "status": "todo"
    },
    {
        "title": "Create PWA manifest and service worker",
        "description": "Complete PWA setup with proper manifest.json and service worker registration",
        "priority": "low",
        "category": "feature",
        "status": "todo"
    },
    {
        "title": "Add unit tests for PoleCaptureService",
        "description": "Create comprehensive tests for the 460-line PoleCaptureService",
        "priority": "low",
        "category": "testing",
        "status": "todo"
    },
    {
        "title": "Implement data compression for photos",
        "description": "Add image compression before storing in IndexedDB and uploading",
        "priority": "low",
        "category": "optimization",
        "status": "todo"
    },
    {
        "title": "Document API endpoints and data flow",
        "description": "Create comprehensive documentation for all services and data models",
        "priority": "low",
        "category": "documentation",
        "status": "todo"
    }
]

def main():
    print("=" * 80)
    print("📋 CREATING INITIAL TASKS FOR FIBREFIELD")
    print("=" * 80)
    print(f"Project: {PROJECT_NAME}")
    print(f"Project ID: {PROJECT_ID}")
    print(f"Tasks to create: {len(INITIAL_TASKS)}")
    print()
    
    # Save tasks to JSON for reference
    tasks_file = "initial_tasks.json"
    with open(tasks_file, 'w', encoding='utf-8') as f:
        json.dump({
            "project_id": PROJECT_ID,
            "project_name": PROJECT_NAME,
            "created_at": datetime.now().isoformat(),
            "tasks": INITIAL_TASKS
        }, f, indent=2)
    
    print(f"✅ Saved {len(INITIAL_TASKS)} tasks to {tasks_file}")
    print()
    
    print("📝 Task Summary by Priority:")
    print("-" * 40)
    
    high = [t for t in INITIAL_TASKS if t['priority'] == 'high']
    medium = [t for t in INITIAL_TASKS if t['priority'] == 'medium']
    low = [t for t in INITIAL_TASKS if t['priority'] == 'low']
    
    print(f"🔴 High Priority: {len(high)} tasks")
    for task in high:
        print(f"   - {task['title']}")
    
    print(f"\n🟡 Medium Priority: {len(medium)} tasks")
    for task in medium:
        print(f"   - {task['title']}")
    
    print(f"\n🟢 Low Priority: {len(low)} tasks")
    for task in low:
        print(f"   - {task['title']}")
    
    print()
    print("=" * 80)
    print("📌 To add these tasks to Archon RAM, use:")
    print(f'archon:manage_task(action="create", project_id="{PROJECT_ID}", ...')
    print()
    print("Or import them programmatically using the Archon RAM API.")
    print("=" * 80)

if __name__ == "__main__":
    main()