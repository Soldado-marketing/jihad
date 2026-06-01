# MAOS Sprint 1 Permission Drift Review Checklist

## Purpose

Prevent Sprint 1 implementation from bypassing the approved controller, guard, service, repository, tenant context, and audit patterns.

## Review Items

| Item | Required Result |
|---|---|
| Controllers | Controllers do not access persistence directly |
| Protected routes | Protected routes use permission guard or have documented safe public status |
| Tenant context | Tenant-owned operations require tenant context |
| Service scope | Sensitive services re-check tenant/resource scope |
| Repositories | Tenant-owned repositories reject missing tenant context |
| Denied behavior | Denials do not reveal hidden tenant/resource metadata |
| Audit events | Sensitive allowed/denied actions are audit-ready |
| Redaction | Audit payloads exclude secrets and sensitive content |
| Non-scope modules | No client portal, CRM, projects/tasks, finance, AI, reports, or automations introduced |

## Exit Rule

Sprint 1 cannot close if any protected route, service, or repository can bypass tenant context, permission decision, scope validation, or audit readiness where required.
