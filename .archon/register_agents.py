#!/usr/bin/env python3
"""
FibreField Archon Agent Registration
Registers project-specific agents to Archon Supabase system
"""

import json
import yaml
import uuid
from datetime import datetime
from pathlib import Path

def load_project_agents():
    """Load project agents from YAML config"""
    agents_file = Path(__file__).parent / "project_agents.yaml"
    
    with open(agents_file, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    return config

def generate_agent_records():
    """Generate agent records for Supabase insertion"""
    config = load_project_agents()
    project_info = config['project_info']
    agents = config['specialized_agents']
    
    agent_records = []
    
    # Process each agent category
    for category, category_agents in agents.items():
        if isinstance(category_agents, list):
            for agent in category_agents:
                record = {
                    'id': str(uuid.uuid4()),
                    'project_id': project_info['id'],
                    'project_name': project_info['name'],
                    'agent_name': agent['name'],
                    'agent_type': agent['type'],
                    'specialization': agent['specialization'],
                    'category': category,
                    'priority': agent['priority'],
                    'activation_command': agent['activation_command'],
                    'focus_areas': agent.get('focus_areas', []),
                    'status': agent.get('status', 'active'),
                    'tech_stack': project_info['tech_stack'],
                    'complexity_score': project_info['complexity_score'],
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'metadata': {
                        'current_issues': agent.get('current_issues', []),
                        'workflows': agent.get('workflows', []),
                        'targets': agent.get('targets', {}),
                        'deployment_ready': agent.get('deployment_ready', False),
                        'config_files': agent.get('config_files', []),
                        'completed_tasks': agent.get('completed_tasks', []),
                        'formats': agent.get('formats', []),
                        'roles': agent.get('roles', []),
                        'security_patterns': agent.get('security_patterns', []),
                        'dashboards': agent.get('dashboards', []),
                        'patterns': agent.get('patterns', [])
                    }
                }
                agent_records.append(record)
    
    return agent_records

def create_supabase_sql():
    """Generate SQL for Supabase agent insertion to archon_agents_v3 table"""
    records = generate_agent_records()
    
    sql_statements = []
    sql_statements.append("-- FibreField Project-Specific Agents Registration")
    sql_statements.append("-- Target: archon_agents_v3 table (Archon 3.0)")
    sql_statements.append("-- Generated: " + datetime.now().isoformat())
    sql_statements.append("")
    
    # First ensure project exists
    sql_statements.append("-- Ensure FibreField project exists")
    project_insert = f"""
INSERT INTO public.archon_projects (
    id, name, title, description, created_at, updated_at
) VALUES (
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'FibreField',
    'FibreField PWA - Fiber Optic Field Data Collection',
    'Progressive Web Application for offline-capable field data collection. Next.js 15, React 19, TypeScript. Mobile-first design for fiber optic pole installations. Tech stack: Next.js 15, React 19, TypeScript 5.7.3, Firebase, Tailwind CSS, PWA, IndexedDB, QGIS. Complexity score: 8.7',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = NOW();
"""
    sql_statements.append(project_insert)
    sql_statements.append("")
    
    # Map our agent types to valid enum values
    type_mapping = {
        'test-coverage-validator': 'TEST_COVERAGE_VALIDATOR',
        'system-architect': 'SYSTEM_ARCHITECT', 
        'performance-optimizer': 'PERFORMANCE_OPTIMIZER',
        'code-implementer': 'CODE_IMPLEMENTER',
        'api-design-architect': 'API_DESIGN_ARCHITECT',
        'security-auditor': 'SECURITY_AUDITOR',
        'deployment-automation': 'DEPLOYMENT_AUTOMATION',
        'code-quality-reviewer': 'CODE_QUALITY_REVIEWER'
    }
    
    # Insert agents
    sql_statements.append("-- Insert FibreField specialized agents into archon_agents_v3")
    for record in records:
        # Map to valid agent_type enum
        agent_type = type_mapping.get(record['agent_type'], 'CODE_IMPLEMENTER')
        
        # Create capabilities JSON
        capabilities = {
            'specialization': record['specialization'],
            'focus_areas': record['focus_areas'],
            'current_issues': record['metadata'].get('current_issues', []),
            'workflows': record['metadata'].get('workflows', []),
            'targets': record['metadata'].get('targets', {}),
            'activation_command': record['activation_command'],
            'category': record['category'],
            'priority': record['priority']
        }
        
        insert_sql = f"""
INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    '{record['id']}',
    '{record['agent_name']}',
    '{agent_type}',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{json.dumps(capabilities)}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();
"""
        sql_statements.append(insert_sql)
    
    return '\n'.join(sql_statements)

def main():
    """Main registration function"""
    print("🌟 FibreField Archon Agent Registration")
    print("=====================================")
    
    # Load and validate config
    config = load_project_agents()
    print(f"✅ Loaded {len(config['specialized_agents'])} agent categories")
    
    # Generate records
    records = generate_agent_records()
    print(f"✅ Generated {len(records)} agent records")
    
    # Create SQL
    sql = create_supabase_sql()
    
    # Write SQL file
    sql_file = Path(__file__).parent / "supabase_agent_registration.sql"
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"✅ Generated SQL file: {sql_file}")
    
    # Write JSON records for API registration
    json_file = Path(__file__).parent / "agent_records.json" 
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, default=str)
    
    print(f"✅ Generated JSON file: {json_file}")
    
    print("\n🚀 Next Steps:")
    print("1. Execute the SQL file in Supabase dashboard")
    print("2. Or use the JSON file for API-based registration")
    print("3. Verify agent registration in Archon system")
    
    # Display agent summary
    print(f"\n📊 Agent Summary:")
    for record in records:
        print(f"  {record['priority']:2}. {record['agent_name']} ({record['category']})")
        print(f"      → {record['activation_command']}")
    
    print(f"\n✅ FibreField agents ready for Archon registration!")

if __name__ == "__main__":
    main()