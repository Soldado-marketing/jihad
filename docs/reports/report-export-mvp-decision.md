# MAOS Report Export MVP Decision

## Recommended Decision

Limit report export in MVP. If export is included, it must be restricted to permission-safe basic reports and must pass report privacy, audit logging, and hidden count/total suppression checks before release.

## Report Privacy Rules

Reports must respect tenant isolation, RBAC, custom permissions, client boundaries, Owner-only finance access, and client-safe report visibility. Exports require permission and audit logging.

## Hidden Count/Total Suppression Dependency

Report exports cannot include hidden counts, hidden totals, unauthorized aggregates, cross-client aggregates, or unauthorized finance/payroll data.

## Owner

Product Owner / Security Architect.

## Assigned Sprint 10 Gate

Final export scope must be decided before Dashboards & Reports Basic exits Sprint 10.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Recommended export decision is documented | Met |
| Report privacy rules are documented | Met |
| Hidden count/total suppression dependency is documented | Met |
| Owner is documented | Met |
| Sprint 10 gate is documented | Met |
