# FibreField Implementation Plan
## Executive Summary
Phased implementation to transform FibreField from 70% UI-complete/0% functional to production-ready PWA with Home Drop Capture capabilities. Total estimated time: 92 hours across 4 phases.

## Task Breakdown

### Phase 1: Critical Fixes & Core Setup (Total: 9 hours)
- [ ] Task 1.1: Re-enable periodic cleanup in assignment service (1h)
  - Acceptance Criteria: Service runs without errors, cleanup scheduled properly
  - Dependencies: None
- [ ] Task 1.2: Install missing Radix UI components (1h)
  - Acceptance Criteria: Build succeeds without component errors
  - Dependencies: None
- [ ] Task 1.3: Fix Next.js 15 metadata warnings (2h)
  - Acceptance Criteria: Zero metadata warnings in build/dev
  - Dependencies: None
- [ ] Task 1.4: Setup Firebase project configuration (2h)
  - Acceptance Criteria: Firebase initialized with correct project ID
  - Dependencies: Firebase console access
- [ ] Task 1.5: Configure environment variables (1h)
  - Acceptance Criteria: All Firebase keys in .env.local
  - Dependencies: Task 1.4
- [ ] Task 1.6: Validate TypeScript configuration (2h)
  - Acceptance Criteria: Zero type errors, strict mode enabled
  - Dependencies: Tasks 1.1-1.3

### Phase 2: Core Functionality Implementation (Total: 28 hours)
- [ ] Task 2.1: Implement Firebase Authentication (8h)
  - Acceptance Criteria: Login/logout functional, auth persistence works
  - Dependencies: Phase 1 complete
- [ ] Task 2.2: Replace REST calls with Firebase SDK (10h)
  - Acceptance Criteria: All API calls use Firestore, offline mode works
  - Dependencies: Task 2.1
- [ ] Task 2.3: Implement photo upload with Firebase Storage (6h)
  - Acceptance Criteria: Photos upload, compress, and retrieve successfully
  - Dependencies: Task 2.1
- [ ] Task 2.4: Restore admin review features (4h)
  - Acceptance Criteria: Admin can view, approve, reject captures
  - Dependencies: Tasks 2.1-2.3

### Phase 3: Home Drop Feature Completion (Total: 35 hours)
- [ ] Task 3.1: Test and validate offline sync workflow (4h)
  - Acceptance Criteria: Data syncs when reconnected, no data loss
  - Dependencies: Phase 2 complete
- [ ] Task 3.2: Implement QGIS/QField GeoPackage import (8h)
  - Acceptance Criteria: Can import .gpkg files, parse features
  - Dependencies: None (parallel work)
- [ ] Task 3.3: Implement QGIS/QField GeoPackage export (6h)
  - Acceptance Criteria: Export captures as valid .gpkg
  - Dependencies: Task 3.2
- [ ] Task 3.4: Add photo quality validation system (5h)
  - Acceptance Criteria: Photos validated for resolution, focus, lighting
  - Dependencies: Task 2.3
- [ ] Task 3.5: Build client delivery system (6h)
  - Acceptance Criteria: Generate delivery packages, track status
  - Dependencies: Tasks 3.4, 2.4
- [ ] Task 3.6: Create pole-drop relationship tracking (6h)
  - Acceptance Criteria: Link drops to poles, visualize relationships
  - Dependencies: Task 2.2

### Phase 4: Testing & Production Readiness (Total: 20 hours)
- [ ] Task 4.1: Integration testing for all workflows (6h)
  - Acceptance Criteria: All happy paths tested, >90% coverage
  - Dependencies: Phase 3 complete
- [ ] Task 4.2: E2E testing with Playwright (5h)
  - Acceptance Criteria: Critical user journeys automated
  - Dependencies: Task 4.1
- [ ] Task 4.3: Performance optimization (4h)
  - Acceptance Criteria: <1.5s page load, <200ms API responses
  - Dependencies: All features complete
- [ ] Task 4.4: Security audit and fixes (3h)
  - Acceptance Criteria: No critical vulnerabilities
  - Dependencies: All features complete
- [ ] Task 4.5: Documentation and deployment prep (2h)
  - Acceptance Criteria: README updated, deployment guide ready
  - Dependencies: Tasks 4.1-4.4

## Dependencies & Prerequisites
- Technical: 
  - Firebase project access (fibreflow-73daf)
  - Node.js 18+, npm 9+
  - Radix UI components (@radix-ui/react-switch, @radix-ui/react-slider)
  - GDAL.js for GeoPackage handling
- Data: 
  - Existing Firestore collections
  - Firebase Storage bucket configured
  - Sample GeoPackage files for testing
- External: 
  - Firebase console access
  - QGIS test environment
  - Client delivery endpoint/process

## Risk Analysis
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Firebase SDK integration conflicts | Medium | High | Use exact versions from main FibreFlow app |
| QGIS/GeoPackage complexity | High | Medium | Create minimal viable implementation first |
| Offline sync data conflicts | Medium | High | Implement conflict resolution strategy |
| Photo quality validation accuracy | Low | Medium | Use simple threshold-based validation initially |
| Next.js 15 breaking changes | Low | High | Pin to stable version, monitor issues |

## Required Resources
- Agents: 
  - code-implementer (TypeScript/React)
  - firebase-integration-specialist
  - test-coverage-validator
  - performance-optimizer
- Tools: 
  - Firebase Console
  - QGIS Desktop (testing)
  - Chrome DevTools (PWA testing)
  - Playwright (E2E testing)
- Human: 
  - Firebase admin access
  - Client for delivery testing
  - Field technician for UAT

## Success Criteria
- [ ] All TypeScript compilation errors resolved
- [ ] Firebase authentication fully functional
- [ ] Photo upload/retrieval working offline and online
- [ ] Home Drop Capture 4-step workflow complete
- [ ] QGIS integration import/export functional
- [ ] All tests passing with >90% coverage
- [ ] Zero TypeScript/linting errors
- [ ] Performance benchmarks met (<1.5s load, <200ms API)
- [ ] Successful field test with real technician

## Timeline
- Start Date: 2025-09-09
- Phase 1 Completion: 2025-09-10 (1-2 days)
- Phase 2 Completion: 2025-09-14 (1 week)
- Phase 3 Completion: 2025-09-21 (2 weeks)
- Phase 4 Completion: 2025-09-25 (2.5 weeks)
- End Date: 2025-09-25
- Critical Path: Phase 1 → Task 2.1 → Task 2.2 → Task 3.1

## Implementation Notes
1. **Parallel Execution Opportunities**:
   - QGIS integration can be developed while Firebase work proceeds
   - UI components can be refined during backend development
   - Documentation can be updated continuously

2. **Quick Wins** (implement first for momentum):
   - Install Radix UI components (unblocks build)
   - Re-enable assignment service cleanup
   - Fix Next.js metadata warnings

3. **High-Risk Areas** requiring extra attention:
   - Firebase SDK integration (potential conflicts)
   - Offline sync conflict resolution
   - QGIS GeoPackage format handling

4. **Testing Strategy**:
   - Unit tests for each service
   - Integration tests for workflows
   - E2E tests for critical paths
   - Manual field testing before deployment