# ADR-001: Modular Monolith Architecture

Status: Approved

## Status

Approved

## Context

MAOS is being implemented as a Marketing Agency Operating System for distributed marketing teams and clients. The approved MVP requires owner, manager, employee, and client workspaces with projects, tasks, subtasks, basic approvals, files, chat, voice notes, basic voice-to-task, basic CRM, basic finance, dashboards, reports, invite-only access, permissions, and audit logging.

The platform needs strong tenant isolation, role-based access, client data boundaries, Owner-only finance visibility, auditability, and a clear post-MVP path for AI, automations, reporting, payroll, and advanced BI. Sprint 0 Day 1 must establish an implementation structure that supports fast MVP delivery without premature service fragmentation.

## Decision

MAOS will use a monorepo with a modular monolith architecture for the MVP.

The repository structure will separate application entry points from shared packages:

| Area | Path | Purpose |
|---|---|---|
| Web app | `apps/web` | Internal workspace and client portal frontend |
| API app | `apps/api` | Backend API entry point |
| Worker app | `apps/worker` | Background jobs and asynchronous processing |
| Shared logic | `packages/shared` | Cross-application utilities and shared domain-neutral helpers |
| Shared config | `packages/config` | Shared linting, TypeScript, environment, and tooling standards |
| Shared types | `packages/types` | Shared request, response, and domain contract types |
| Architecture decisions | `docs/adr` | ADRs and architecture decision log |
| Sprint governance | `docs/sprint-0` | Sprint 0 tracking, summaries, and readiness artifacts |
| Standards | `docs/standards` | Repository, API, data access, and implementation standards |
| QA | `docs/qa` | QA evidence, test plans, and validation templates |
| Security | `docs/security` | Security baselines, permission standards, and audit rules |
| Release | `docs/release` | Release, rollback, hotfix, and readiness governance |

The existing root-level Next.js application remains unchanged during Sprint 0 Day 1. Any future migration of existing source into `apps/web` must be handled as a later implementation task with explicit testing and review.

## Rationale

| Reason | Rationale |
|---|---|
| MVP speed | A modular monolith avoids premature microservices overhead while keeping delivery fast. |
| Security consistency | A central permission and audit model is easier to enforce before modules are split. |
| Tenant isolation | Tenant context and scoped repositories can be standardized once and used across modules. |
| Product cohesion | CRM, projects, client portal, files, chat, finance, reporting, and AI share business workflows. |
| Lower operational cost | Fewer deployable runtime surfaces reduces DevOps overhead during MVP. |
| Clear expansion path | Modules can later be extracted when scaling, compliance, or team ownership requires it. |

## Consequences

| Consequence | Impact |
|---|---|
| Shared deployment boundary | MVP backend modules deploy together until a module requires independent scaling. |
| Strong module discipline required | Teams must enforce module boundaries through standards and review. |
| Central permission engine | All protected modules must use the same authorization and audit approach. |
| Easier transaction boundaries | Cross-module workflows can start within one backend boundary. |
| Future extraction remains possible | Modules must avoid hidden coupling and direct cross-module data access. |

## Module Boundaries

The MVP modular monolith is organized around domain modules. Each module owns its application behavior and must use shared cross-cutting services for tenant context, permissions, audit logging, notifications, background jobs, and file access.

| Module | Responsibility | Boundary Rules |
|---|---|---|
| Identity and tenancy | Invitations, users, memberships, sessions, devices, login history | Must be built before client portal, finance, AI, or reports |
| Authorization | RBAC, custom permission foundation, resource scope checks | Must run server-side and must not be bypassed by jobs, reports, AI, or future automations |
| Audit | Sensitive event logging, redaction, actor/resource context | Must exist before finance, client portal, AI, and sensitive reporting |
| Workspace shell | Internal navigation, role-aware UI shell, denied states | Must not expose hidden modules through navigation |
| Client portal | Client-visible projects, approvals, files, invoices, reports | Must use own-client-only and client-visible data rules |
| Projects and tasks | Projects, tasks, subtasks, status, assignments, basic workload views | Core delivery module for MVP |
| CRM basic | Leads, opportunities, meetings, follow-ups, basic pipeline | MVP sales workflow without advanced forecasting automation |
| Collaboration | Internal chat, client chat, notifications | Must separate internal and client channels |
| Files and approvals | Uploads, versions, client-visible files, approval flow | Must use permission checks before file access or signed URL generation |
| Voice and basic AI | Voice notes, transcription, task draft extraction | Human approval required before task creation |
| Finance basic | Basic invoices, partial payments, basic revenue visibility | Owner-only by default, with client own invoice/payment visibility |
| Dashboards and reports basic | Basic operational and client-safe reporting | Must suppress unauthorized counts, totals, and hidden data |
| Background jobs | Asynchronous voice, notification, reporting, and later automation jobs | Must preserve tenant and actor context |

## Post-MVP Expansion Path

MAOS may extract modules after MVP only when there is a concrete scaling, compliance, isolation, or ownership reason.

| Expansion Candidate | Extraction Trigger |
|---|---|
| Worker processing | Background workload or AI/transcription volume requires independent scaling |
| File service | File scanning, storage, versioning, or signed URL load requires separate scaling |
| Realtime service | Chat/notification concurrency requires separate connection scaling |
| AI gateway | AI provider abstraction, retrieval, and safety controls require independent governance |
| Reporting/BI | Report generation, snapshots, exports, or analytics workloads require data pipeline separation |
| Automations engine | Full workflow builder and event processing require independent execution controls |
| Finance/payments | Payment provider integration or financial compliance requires stronger isolation |

Extraction must preserve tenant isolation, RBAC, audit logging, client boundaries, Owner-only finance rules, and permission-safe reports.

## Approval Notes

- Repository decision: monorepo.
- Architecture style: modular monolith.
- Sprint 0 Day 1 status: approved for Day 2 module-map and stack decisions.
