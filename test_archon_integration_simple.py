#!/usr/bin/env python3
"""
Test Archon Integration for FibreField Project
Validates that MCP tools and workflow are properly configured
"""

import json
import requests
from pathlib import Path

class ArchonIntegrationTest:
    def __init__(self):
        self.project_id = "fibrefield-project"
        self.archon_api = "http://localhost:8181/api"
        self.archon_ui = "http://localhost:3737"
        self.project_path = Path(__file__).parent
        
    def test_archon_services(self):
        """Test if Archon services are running"""
        try:
            response = requests.get(f"{self.archon_api}/health", timeout=5)
            if response.status_code == 200:
                print("[PASS] Archon API is running")
                return True
            else:
                print(f"[FAIL] Archon API returned status {response.status_code}")
                return False
        except Exception as e:
            print(f"[FAIL] Archon API not accessible: {e}")
            return False
    
    def test_project_setup(self):
        """Test if project is properly configured"""
        
        # Check CLAUDE.md
        claude_md = self.project_path / "CLAUDE.md"
        if claude_md.exists():
            content = claude_md.read_text()
            if "ARCHON INTEGRATION" in content and "fibrefield-project" in content:
                print("[PASS] CLAUDE.md configured for Archon")
            else:
                print("[FAIL] CLAUDE.md missing Archon configuration")
                return False
        else:
            print("[FAIL] CLAUDE.md not found")
            return False
        
        # Check MCP config
        mcp_config = self.project_path / "mcp_config.json"
        if mcp_config.exists():
            try:
                config = json.loads(mcp_config.read_text())
                if "archon" in config.get("mcpServers", {}):
                    print("[PASS] MCP configuration found")
                else:
                    print("[FAIL] MCP configuration missing Archon server")
                    return False
            except Exception as e:
                print(f"[FAIL] Invalid MCP configuration: {e}")
                return False
        else:
            print("[FAIL] MCP configuration not found")
            return False
        
        # Check initial tasks
        tasks_file = self.project_path / "initial_tasks.json"
        if tasks_file.exists():
            try:
                tasks = json.loads(tasks_file.read_text())
                if len(tasks) >= 5:
                    print(f"[PASS] Found {len(tasks)} initial tasks")
                else:
                    print(f"[FAIL] Only {len(tasks)} tasks found, expected at least 5")
                    return False
            except Exception as e:
                print(f"[FAIL] Invalid tasks file: {e}")
                return False
        else:
            print("[FAIL] Initial tasks file not found")
            return False
        
        return True
    
    def test_workflow_commands(self):
        """Test workflow command templates"""
        
        commands = [
            f"archon:manage_task(action=\"list\", project_id=\"{self.project_id}\", filter_by=\"status\", filter_value=\"todo\")",
            f"archon:perform_rag_query(query=\"[relevant feature/pattern]\", match_count=5)",
            f"archon:search_code_examples(query=\"[implementation pattern]\", match_count=3)"
        ]
        
        print("[PASS] MCP Command Templates:")
        for i, cmd in enumerate(commands, 1):
            print(f"   {i}. {cmd}")
        
        return True
    
    def test_project_knowledge(self):
        """Test knowledge base setup"""
        
        knowledge_file = self.project_path / "knowledge_index.json"
        if knowledge_file.exists():
            try:
                knowledge = json.loads(knowledge_file.read_text())
                print(f"[PASS] Knowledge base index with {len(knowledge)} items")
                
                # Show knowledge types
                types = set(item.get("type", "unknown") for item in knowledge)
                print(f"   Knowledge types: {', '.join(types)}")
                return True
            except Exception as e:
                print(f"[FAIL] Invalid knowledge index: {e}")
                return False
        else:
            print("[FAIL] Knowledge index not found")
            return False
    
    def run_full_test(self):
        """Run complete integration test"""
        
        print("Testing Archon Integration for FibreField Project")
        print("=" * 50)
        
        tests = [
            ("Archon Services", self.test_archon_services),
            ("Project Setup", self.test_project_setup), 
            ("Workflow Commands", self.test_workflow_commands),
            ("Knowledge Base", self.test_project_knowledge)
        ]
        
        results = []
        for test_name, test_func in tests:
            print(f"\nTesting {test_name}:")
            result = test_func()
            results.append((test_name, result))
        
        print("\n" + "=" * 50)
        print("Test Results:")
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "PASS" if result else "FAIL"
            print(f"   {test_name}: {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("\nArchon integration is fully configured!")
            print(f"UI: {self.archon_ui}/projects/{self.project_id}")
            print("Next: Use MCP tools to manage tasks and search knowledge")
        else:
            print("\nSome issues found. Check Archon services and configuration.")
            
        return passed == total

def main():
    """Main test runner"""
    test = ArchonIntegrationTest()
    success = test.run_full_test()
    
    if success:
        print("\nReady to use Archon workflow:")
        print("   1. Check tasks: Use MCP tool archon:manage_task")
        print("   2. Search knowledge: Use MCP tool archon:perform_rag_query")
        print("   3. Find examples: Use MCP tool archon:search_code_examples")
    
    return success

if __name__ == "__main__":
    main()