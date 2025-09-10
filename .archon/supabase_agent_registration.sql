-- FibreField Project-Specific Agents Registration
-- Target: archon_agents_v3 table (Archon 3.0)
-- Generated: 2025-09-09T12:15:12.599956

-- Ensure FibreField project exists

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


-- Insert FibreField specialized agents into archon_agents_v3

INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    'd4fdc8b2-d6a5-40ba-b556-d8c1b1a3d135',
    'fibre-test-optimizer',
    'TEST_COVERAGE_VALIDATOR',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "E2E test timing, Firebase loading states, PWA test patterns", "focus_areas": ["Playwright E2E test optimization", "Firebase authentication test flows", "PWA loading state handling", "Mobile responsiveness testing"], "current_issues": ["Authentication tests failing due to loading delays", "Service worker initialization timing", "Firebase async loading patterns"], "workflows": [], "targets": {}, "activation_command": "@fibre-test-optimizer", "category": "high_priority", "priority": 1}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    '56b4f709-9d83-402f-94e8-f3ed2180097b',
    'firebase-integration-specialist',
    'SYSTEM_ARCHITECT',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "Firebase Auth, Firestore, Storage optimization for PWA", "focus_areas": ["Firebase project: fibreflow-73daf", "Firestore index deployment", "Authentication RBAC patterns", "Offline sync with IndexedDB"], "current_issues": ["Firebase project access limitations", "Index deployment blocked", "Security rules configuration"], "workflows": [], "targets": {}, "activation_command": "@firebase-integration-specialist", "category": "high_priority", "priority": 2}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    'a4b9f87f-ae18-49a5-a440-d860f8cc2f3c',
    'pwa-performance-optimizer',
    'PERFORMANCE_OPTIMIZER',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "Service worker, caching, bundle optimization, Core Web Vitals", "focus_areas": ["Bundle size optimization (<500KB chunks)", "Service worker caching strategies", "Image compression and loading", "API response time optimization"], "current_issues": [], "workflows": [], "targets": ["Page load: <1.5s", "API response: <200ms", "Lighthouse PWA score: >90", "Core Web Vitals: All green"], "activation_command": "@pwa-performance-optimizer", "category": "high_priority", "priority": 3}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    'feb6dae7-3ed9-4ea7-b5f8-921ad8793219',
    'home-drop-workflow-specialist',
    'CODE_IMPLEMENTER',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "4-step capture workflow, photo validation, GPS accuracy", "focus_areas": ["Assignment selection and filtering", "GPS location validation (\u00b120m accuracy)", "4 photo types: Power Meter, Fibertime, Device Actions, Router Lights", "Customer info capture and validation"], "current_issues": [], "workflows": ["Step 1: Assignment Selection", "Step 2: GPS Validation", "Step 3: Photo Capture (4 types)", "Step 4: Review & Submit"], "targets": {}, "activation_command": "@home-drop-workflow-specialist", "category": "core_development", "priority": 4}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    '88f946a5-8670-433b-a217-3386a6c000a8',
    'qgis-integration-architect',
    'API_DESIGN_ARCHITECT',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "GeoPackage handling, coordinate systems, QGIS/QField compatibility", "focus_areas": ["GeoPackage (.gpkg) import/export", "Coordinate system transformations (WGS84, UTM)", "QGIS Desktop integration", "QField mobile synchronization"], "current_issues": [], "workflows": [], "targets": {}, "activation_command": "@qgis-integration-architect", "category": "core_development", "priority": 5}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    '9c9a0a67-3b94-4a03-9639-0b85946fe366',
    'rbac-security-enforcer',
    'SECURITY_AUDITOR',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "Role-based access control, route protection, data isolation", "focus_areas": [], "current_issues": [], "workflows": [], "targets": {}, "activation_command": "@rbac-security-enforcer", "category": "core_development", "priority": 6}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    'd9bf7265-a572-43c5-a440-9fad57bf354d',
    'vercel-deployment-orchestrator',
    'DEPLOYMENT_AUTOMATION',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "Production deployment, environment configuration, monitoring", "focus_areas": ["Vercel deployment optimization", "Environment variable management", "Production monitoring setup", "SSL and domain configuration"], "current_issues": [], "workflows": [], "targets": {}, "activation_command": "@vercel-deployment-orchestrator", "category": "production_readiness", "priority": 7}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    '5f9aceff-6009-4d1e-a7f3-4c689daf1121',
    'fibre-analytics-monitor',
    'PERFORMANCE_OPTIMIZER',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "Field data analytics, capture metrics, quality scoring", "focus_areas": ["Capture completion rates", "Photo quality metrics", "GPS accuracy statistics", "Technician performance tracking"], "current_issues": [], "workflows": [], "targets": {}, "activation_command": "@fibre-analytics-monitor", "category": "production_readiness", "priority": 8}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    '0bc39509-5f95-4313-a508-b1db8e95467d',
    'typescript-next15-compatibilizer',
    'CODE_QUALITY_REVIEWER',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "Next.js 15 compatibility, TypeScript strict mode", "focus_areas": [], "current_issues": [], "workflows": [], "targets": {}, "activation_command": "@typescript-next15-compatibilizer", "category": "maintenance", "priority": 9}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();


INSERT INTO public.archon_agents_v3 (
    id, name, agent_type, model_tier, project_id, state,
    capabilities, created_at, updated_at
) VALUES (
    'f1503d7e-d9fd-44b4-8737-c9547fe4926a',
    'offline-sync-validator',
    'CODE_IMPLEMENTER',
    'SONNET',
    'f1b3e4d5-c2a9-4f7e-8b6d-9c3a1f2e5d7b',
    'ACTIVE',
    '{"specialization": "IndexedDB sync, conflict resolution, data integrity", "focus_areas": ["Dexie.js optimization", "Sync queue management", "Conflict resolution strategies", "Data consistency validation"], "current_issues": [], "workflows": [], "targets": {}, "activation_command": "@offline-sync-validator", "category": "maintenance", "priority": 10}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();
