# MAOS Module Boundary Map

## Purpose

This document defines the MVP modular monolith boundaries for MAOS. It is a setup artifact only and does not implement application modules.

| Module | Purpose | Location | Owner Role | Depends On | Must Not Bypass | MVP Status |
|---|---|---|---|---|---|---|
| Web frontend | Internal workspace and client portal UI | `apps/web` | Frontend Lead | Shared types, frontend setup standard | Permission-aware navigation and client-safe route rules | MVP boundary |
| API backend | REST-first backend API | `apps/api` | Backend Lead | Backend setup standard, permission standards | Tenant resolver, permission guards, service layer, audit rules | MVP boundary |
| Worker | Background jobs for later voice, notifications, reports, and automation tasks | `apps/worker` | Backend Lead / DevOps Architect | Queue/jobs ADR, service layer | Tenant/actor context and permission-safe services | MVP boundary, implementation later |
| Shared types | API and domain contract types | `packages/types` | Principal Software Architect | API standards | Versioned contract ownership | MVP support boundary |
| Shared config | Shared tooling and environment standards | `packages/config` | DevOps Architect / Principal Software Architect | Repository standard | Approved config review | MVP support boundary |
| Identity | Invitations, users, memberships, sessions, devices, login history | `apps/api` domain module | Backend Lead / Security Architect | Tenant context, audit | Invite-only, no public registration, audit logging | MVP core |
| Tenants | Tenant membership and tenant context | `apps/api` domain module | Database Architect / Security Architect | PostgreSQL strategy, tenant baseline | Tenant-aware repository rules | MVP core |
| Permissions | RBAC, custom permission foundation, resource scope validation | `apps/api` domain module | Security Architect | Identity, tenants | Server-side permission engine and service-level scope checks | MVP core |
| Audit | Sensitive action logs, redaction, actor/resource context | `apps/api` domain module | Security Architect / Backend Lead | Identity, tenants, permissions | Append-only audit and redaction rules | MVP core |
| Projects | Projects, client links, status, project-level visibility | `apps/api` domain module and `apps/web` UI | Product Owner / Backend Lead | Tenants, permissions, audit | Client boundary and project scope validation | MVP core |
| Tasks | Tasks, subtasks, assignment, status, due dates, basic workload | `apps/api` domain module and `apps/web` UI | Product Owner / Backend Lead | Projects, permissions, audit | Resource scope checks and audit for sensitive changes | MVP core |
| Client portal | Client-facing project, file, approval, invoice, and report views | `apps/web` and `apps/api` modules | Product Owner / Security Architect | Identity, tenants, permissions, projects | Internal notes, internal chat, payroll, costs, audit logs, hidden data | MVP core |
| CRM | Leads, opportunities, meetings, follow-ups, basic pipeline | `apps/api` domain module and `apps/web` UI | Product Owner | Tenants, permissions, audit | Client and tenant boundaries | MVP basic |
| Collaboration | Internal chat, client chat, notifications | `apps/api`, `apps/web`, future realtime boundary | Product Owner / Backend Lead | Identity, permissions, client boundaries | Internal/client channel separation | MVP basic |
| Files | File metadata, versions, visibility, signed URL request path | `apps/api` domain module and storage provider later | Backend Lead / Security Architect | Permissions, audit, object storage ADR | Permission checks before URL generation | MVP basic |
| Voice | Voice notes, transcript storage path, task draft handoff | `apps/api`, `apps/worker` later | AI Systems Architect / Backend Lead | Files, projects, tasks, permissions | Human approval and transcript permission rules | MVP basic |
| AI | Basic voice-to-task draft extraction and permission-safe gateway | `apps/api`, `apps/worker` later | AI Systems Architect / Security Architect | Voice, tasks, permissions, audit | Permission engine, source scope, human approval | MVP limited |
| Finance | Basic invoices, partial payments, basic revenue visibility | `apps/api` domain module and `apps/web` UI | Finance Owner / Security Architect | Clients, projects, permissions, audit | Owner-only financial access and client own invoice/payment visibility | MVP basic |
| Reporting | Basic dashboards and reports | `apps/api` query services and `apps/web` UI | Product Owner / Security Architect | Data-producing modules, permissions, audit | Hidden count/total suppression and client-safe report rules | MVP basic |

## Boundary Rules

| Rule | Requirement |
|---|---|
| Controllers do not access persistence directly | Controllers call services |
| Services receive tenant and actor context | Required for protected modules |
| Repositories are tenant-aware | Tenant-owned data requires tenant context |
| Sensitive operations re-check scope | Permission guard plus service-level resource validation |
| Jobs reuse service paths | Workers must not bypass permission or audit standards |
| Client portal is isolated by rules | Own-client-only and client-visible data only |
| Finance is Owner-only by default | Client invoice/payment visibility is explicitly scoped |
| AI is permission-filtered | AI cannot retrieve hidden data |

## Day 2 Acceptance Criteria

| Criterion | Status |
|---|---|
| MVP module boundaries are documented | Met |
| Locations are documented | Met |
| Owner roles are documented | Met |
| Dependencies are documented | Met |
| Must-not-bypass rules are documented | Met |
| No production modules were implemented | Met |
