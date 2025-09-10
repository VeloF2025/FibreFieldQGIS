# AGENTS.md - Guidelines for Agentic Coding in FibreField

## Build/Lint/Test Commands
- Build: npm run build (Next.js production build)
- Lint: npm run lint (ESLint with TypeScript rules)
- Test (Unit): npm run test or vitest (full suite)
- Run single unit test: vitest path/to/test.spec.ts
- Test (E2E): npx playwright test (full suite)
- Run single E2E test: npx playwright test tests/e2e/assignment-functionality.spec.ts

## Code Style Guidelines
- **Imports**: Use absolute paths for app/lib/components (e.g., import { Component } from '@/components/ui'); alphabetical order; group by type (React, third-party, local).
- **Formatting**: Prettier defaults (single quotes, semi-colons, 2-space indent); run npm run format before commits.
- **Types**: Strict TypeScript; no 'any'; explicit types for props/functions; use interfaces for complex types.
- **Naming Conventions**: camelCase for variables/functions; PascalCase for components/types; UPPER_CASE for constants; descriptive names (e.g., handlePoleCapture instead of handleClick).
- **Error Handling**: Use try-catch for async ops; custom Error subclasses; log with logger.ts; return meaningful error messages; avoid silent failures.
- **General**: Offline-first; mimic existing patterns (e.g., Zustand for state); no comments unless requested; follow Next.js conventions; secure Firebase usage.

## Additional Rules
- No Cursor or Copilot rules found in repository.
- Always check Archon tasks before coding; update statuses in real-time.

(Last updated: 2025-09-09)
