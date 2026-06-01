# Sprint 2 Frontend Location Decision

## Status

Approved for Sprint 2.

## Decision

Sprint 2 creates the MAOS frontend baseline under `apps/web`.

The existing root Next.js app remains active and unmoved. It is not migrated during Sprint 2 because it already contains a separate application surface and moving it would create unnecessary risk.

## Rationale

- Sprint 0 and frontend setup standards identify `apps/web` as the future MAOS frontend boundary.
- The existing root Next.js app is not MAOS-specific and must not be moved without a dedicated migration decision.
- Creating `apps/web` keeps MAOS MVP work isolated while preserving the current root app.
- This approach supports the approved monorepo direction without blocking Sprint 2 shell work.

## Consequences

- Sprint 2 frontend checks run from `apps/web`.
- Root Next.js behavior remains unchanged.
- Future migration or consolidation, if needed, must be handled by a separate approved task.
- Shared packages can be introduced later through `packages/types`, `packages/config`, and `packages/shared`.

## Acceptance Criteria

- `apps/web` contains the Sprint 2 workspace shell baseline.
- Existing root app files are not moved.
- No client portal, CRM, projects/tasks, finance, AI, reports, or automations are introduced.
- The frontend shell includes route groups, role-aware navigation, denied/unauthorized states, RTL/LTR helpers, accessibility baseline behavior, and API health reference.
