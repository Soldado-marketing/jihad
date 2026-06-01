# ADR-003: Backend Stack

Status: Approved

## Context

MAOS requires a backend architecture that can enforce tenant isolation, invite-only access, RBAC, custom permission foundations, resource scope validation, audit logging, client boundaries, Owner-only finance visibility, AI permission enforcement, background jobs, and future automation/reporting safety.

The MVP must avoid premature microservices while preserving clear module boundaries. The backend must support a REST-first API and a future worker path without duplicating business logic.

## Decision

MAOS will use NestJS, Node.js, TypeScript, and a REST-first API architecture for the MVP backend.

The approved backend application boundary is `apps/api`. Background jobs are separated into the `apps/worker` boundary but must reuse the same domain services and permission rules where sensitive operations are involved.

## Recommended Backend Stack

| Area | Decision |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript |
| API style | REST-first |
| API validation | DTO validation baseline required |
| Module style | Modular backend inside modular monolith |
| Worker path | `apps/worker` for asynchronous jobs |
| Shared contracts | `packages/types` for request/response and shared contracts |

## Modular Backend Boundaries

The backend should be organized into domain modules, each with clear ownership and dependency direction.

| Module Group | Boundary Expectation |
|---|---|
| Identity and tenants | Own invitations, users, memberships, sessions, devices, and tenant context |
| Permissions | Own RBAC, custom permission foundations, and resource scope checks |
| Audit | Own audit event creation, redaction rules, and sensitive access events |
| Projects/tasks | Own projects, tasks, subtasks, assignments, statuses, and dependencies |
| Client portal | Own client-safe read/write boundaries and client-visible data rules |
| CRM | Own leads, opportunities, meetings, follow-ups, proposals, and quotations |
| Collaboration | Own chat, notifications, files linkage, and client/internal channel separation |
| Files | Own metadata, versioning, visibility, and signed URL request paths |
| Voice/AI | Own voice note processing, transcription, AI task draft boundaries, and approval handoff |
| Finance | Own basic invoices, partial payments, revenue tracking, and Owner-only visibility |
| Reporting | Own permission-safe reporting and hidden count/total suppression |

## Validation Baseline

| Rule | Requirement |
|---|---|
| DTO validation | All write APIs must validate request shape before service execution |
| Error model | Errors must avoid hidden metadata leakage |
| Permission guards | Protected routes must run server-side permission guards |
| Scope validation | Sensitive services must re-check tenant, client, and resource scope |
| Audit hooks | Sensitive actions must record audit events when audit baseline is available |

## API Conventions Overview

| Area | Convention |
|---|---|
| API style | REST-first; GraphQL is not part of MVP unless later justified |
| Resource naming | Resource-oriented paths |
| Versioning | Versioning strategy to be finalized in ADR-006 |
| Pagination | Required for list endpoints once implementation begins |
| Filtering | Must be permission-safe and tenant-scoped |
| Client portal APIs | Must never expose internal workspace data |
| Financial APIs | Owner-only by default, with client own invoice/payment visibility where allowed |

## Consequences

| Consequence | Impact |
|---|---|
| NestJS module discipline is required | Module boundaries must be reviewed before implementation |
| REST-first simplifies MVP delivery | Frontend and API teams can align on clear contracts |
| Permission drift must be prevented | Controllers, services, repositories, jobs, AI, reports, and future automations must not bypass permission rules |
| Worker reuse is required | Background jobs must use shared service/permission paths for sensitive actions |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Backend stack is documented as NestJS, Node.js, TypeScript, REST-first | Met |
| `apps/api` is confirmed as backend boundary | Met |
| `apps/worker` is confirmed as worker boundary | Met |
| Modular backend boundaries are documented | Met |
| Validation baseline is documented | Met |
| No backend implementation was added | Met |
