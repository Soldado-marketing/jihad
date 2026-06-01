# MAOS Tenant Context Propagation Standard

## Purpose

Define where tenant context must be present across MAOS request, job, realtime, report, AI, file, and audit flows.

## HTTP Request Tenant Context

Tenant context is resolved after authentication and tenant membership validation. Protected services and repositories must receive tenant context explicitly.

## Background Job Tenant Context

Background jobs must include tenant context or a safe reference that resolves tenant context. Sensitive jobs must revalidate permission scope at execution time.

## Realtime Tenant Context

Realtime connections and channel subscriptions must validate session, tenant membership, role, permission, and channel membership before sending events.

## Report Tenant Context

Reports must run inside tenant context and permission scope. Report queries must suppress unauthorized counts, totals, and cross-client aggregates.

## AI Tenant Context

AI retrieval and AI actions must use tenant and permission-filtered data sources. AI must not use hidden tenant, client, project, file, finance, payroll, report, or audit data.

## File Tenant Context

File metadata, versions, shares, visibility, and signed URL requests must be tenant-scoped and permission-checked before access.

## Audit Tenant Context

Audit events must include tenant context where available, actor context, resource context, permission result, outcome, timestamp, and session/device context when available.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| HTTP request tenant context is documented | Met |
| Background job tenant context is documented | Met |
| Realtime tenant context is documented | Met |
| Report tenant context is documented | Met |
| AI tenant context is documented | Met |
| File tenant context is documented | Met |
| Audit tenant context is documented | Met |
