#!/usr/bin/env python3
"""
Archon MCP Configuration Setup for FibreField Project
Sets up MCP tool commands for task management and knowledge search
"""

import json
import os
from pathlib import Path
from datetime import datetime

class ArchonMCPSetup:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.project_id = "fibrefield-project"
        
    def setup_mcp_config(self):
        """Set up MCP configuration for Archon tools"""
        
        mcp_config = {
            "mcpServers": {
                "archon": {
                    "command": "python",
                    "args": [
                        str(Path("C:/Jarvis/AI Workspace/Archon/mcp_server.py"))
                    ],
                    "env": {
                        "ARCHON_PROJECT_ID": self.project_id,
                        "ARCHON_API_URL": "http://localhost:8181/api",
                        "ARCHON_UI_URL": "http://localhost:3737"
                    }
                }
            },
            "project_config": {
                "name": "FibreField",
                "project_id": self.project_id,
                "type": "Progressive Web Application",
                "languages": ["TypeScript", "JavaScript"],
                "frameworks": ["Next.js", "React"],
                "setup_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }
        
        # Write MCP config to project directory
        mcp_config_file = self.project_path / "mcp_config.json"
        with open(mcp_config_file, 'w') as f:
            json.dump(mcp_config, f, indent=2)
            
        print(f"[SUCCESS] Created MCP config: {mcp_config_file}")
        return mcp_config_file
    
    def create_initial_tasks(self):
        """Create initial tasks for the FibreField project"""
        
        initial_tasks = [
            {
                "id": "fibre-001",
                "title": "Fix build errors - Install missing Radix UI components",
                "description": "Install @radix-ui/react-switch and @radix-ui/react-slider to resolve build failures",
                "status": "todo",
                "priority": "high",
                "category": "bug_fix",
                "estimated_hours": 1
            },
            {
                "id": "fibre-002", 
                "title": "Implement Firebase authentication integration",
                "description": "Replace auth scaffolding with functional Firebase Auth using shared configuration",
                "status": "todo",
                "priority": "high",
                "category": "feature",
                "estimated_hours": 4
            },
            {
                "id": "fibre-003",
                "title": "Replace REST API calls with Firebase SDK",
                "description": "Update API integration to use Firebase SDK instead of REST endpoints to match FibreFlow patterns",
                "status": "todo", 
                "priority": "medium",
                "category": "refactor",
                "estimated_hours": 6
            },
            {
                "id": "fibre-004",
                "title": "Implement photo upload backend logic",
                "description": "Add Firebase Storage integration for photo uploads with compression",
                "status": "todo",
                "priority": "medium", 
                "category": "feature",
                "estimated_hours": 3
            },
            {
                "id": "fibre-005",
                "title": "Test offline synchronization workflow",
                "description": "Validate pole capture data syncs correctly when connection is restored",
                "status": "todo",
                "priority": "medium",
                "category": "testing",
                "estimated_hours": 2
            }
        ]
        
        # Write tasks to JSON file
        tasks_file = self.project_path / "initial_tasks.json"
        with open(tasks_file, 'w') as f:
            json.dump(initial_tasks, f, indent=2)
            
        print(f"[SUCCESS] Created initial tasks: {tasks_file}")
        return tasks_file
    
    def create_knowledge_index(self):
        """Create knowledge base index for the project"""
        
        knowledge_items = [
            {
                "type": "documentation",
                "source": "README.md",
                "content": "FibreField PWA project documentation",
                "tags": ["setup", "overview", "requirements"]
            },
            {
                "type": "api_reference", 
                "source": "API_REFERENCE.md",
                "content": "API endpoints and data models",
                "tags": ["api", "endpoints", "models"]
            },
            {
                "type": "architecture",
                "source": "src/services/",
                "content": "Service layer architecture and patterns",
                "tags": ["services", "architecture", "patterns"]
            },
            {
                "type": "data_models",
                "source": "src/models/field-capture.model.ts",
                "content": "Core data models for pole capture workflow",
                "tags": ["models", "typescript", "data"]
            },
            {
                "type": "components",
                "source": "src/components/",
                "content": "React components and UI patterns",
                "tags": ["react", "components", "ui"]
            }
        ]
        
        knowledge_file = self.project_path / "knowledge_index.json"
        with open(knowledge_file, 'w') as f:
            json.dump(knowledge_items, f, indent=2)
            
        print(f"[SUCCESS] Created knowledge index: {knowledge_file}")
        return knowledge_file
    
    def setup_project(self):
        """Complete project setup for Archon integration"""
        
        print(f"[ARCHON] Setting up Archon integration for FibreField...")
        print(f"[PATH] {self.project_path}")
        print(f"[PROJECT_ID] {self.project_id}")
        
        # 1. Set up MCP configuration
        mcp_config = self.setup_mcp_config()
        
        # 2. Create initial tasks
        tasks_file = self.create_initial_tasks()
        
        # 3. Create knowledge index
        knowledge_file = self.create_knowledge_index()
        
        # 4. Create summary report
        self.create_setup_report(mcp_config, tasks_file, knowledge_file)
        
        print(f"\n[COMPLETED] Archon integration setup complete!")
        print(f"[UI] Access project at: http://localhost:3737/projects/{self.project_id}")
        print(f"[MCP] Use MCP tools: archon:manage_task, archon:perform_rag_query, archon:search_code_examples")
        
    def create_setup_report(self, mcp_config, tasks_file, knowledge_file):
        """Create a setup completion report"""
        
        report = f"""# Archon Integration Setup Report
## FibreField Project

**Setup Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Project ID**: {self.project_id}
**Project Path**: {self.project_path}

### Files Created:
- MCP Configuration: {mcp_config}
- Initial Tasks: {tasks_file} (5 tasks)
- Knowledge Index: {knowledge_file} (5 knowledge items)

### MCP Tools Available:
1. `archon:manage_task` - Task management (list, create, update, delete)
2. `archon:perform_rag_query` - Knowledge base search
3. `archon:search_code_examples` - Code pattern search

### Initial Tasks Created:
1. Fix build errors (Radix UI components) - HIGH PRIORITY
2. Implement Firebase authentication - HIGH PRIORITY  
3. Replace REST API with Firebase SDK - MEDIUM PRIORITY
4. Implement photo upload backend - MEDIUM PRIORITY
5. Test offline synchronization - MEDIUM PRIORITY

### Next Steps:
1. Start Archon services: `cd C:/Jarvis/AI Workspace/Archon && docker-compose up -d`
2. Check task list: Use MCP tool `archon:manage_task`
3. Begin with high priority tasks
4. Use knowledge search before implementing new patterns

### Integration Rules:
- NEVER start coding without checking Archon tasks
- ALWAYS search Archon before implementing new patterns  
- UPDATE task status in real-time as work progresses
- CREATE tasks for any new requirements discovered
- SEARCH knowledge base before asking questions

---
*Archon Integration Setup Complete*
"""
        
        report_file = self.project_path / "ARCHON_SETUP_REPORT.md"
        with open(report_file, 'w') as f:
            f.write(report)
            
        print(f"[SUCCESS] Created setup report: {report_file}")
        return report_file

def main():
    """Main entry point"""
    project_path = Path(__file__).parent
    setup = ArchonMCPSetup(project_path)
    setup.setup_project()

if __name__ == "__main__":
    main()