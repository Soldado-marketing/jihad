# MAOS Phase 14 Technical Implementation Architecture

**Version:** 1.0  
**Phase:** Phase 14  
**Status:** Technical Architecture Draft For Approval  
**Primary References:** `MAOS_MASTER_SPECIFICATION_v1.0.md`, `MAOS_MVP_ROADMAP_IMPLEMENTATION_PLAN_PHASE_13.md`  
**Supporting References:** Approved Phase 1 through Phase 12 documents where deeper technical detail is required  
**Document Role:** Implementation-ready technical architecture for the MAOS MVP and future platform expansion  
**Code Policy:** This is an architecture document only. It contains no code, SQL, migrations, or implementation scripts.

---

## 1. Technical Architecture Overview

### 1.1 Purpose

This document translates the approved MAOS Master Specification and MVP Roadmap into a practical technical architecture. The architecture must support a secure, invite-only, multi-tenant SaaS MVP without over-engineering, while preserving a path to future AI, automation, BI, payroll, and enterprise-grade expansion.

### 1.2 Architecture Direction

MAOS should start as a modular web SaaS application with clear frontend, backend, database, file, job, realtime, audit, and integration boundaries. The MVP should avoid microservice complexity but must preserve module boundaries so high-volume or high-risk services can be extracted later.

Recommended starting model:

- Next.js web frontend for internal workspace and client portal.
- NestJS backend API using TypeScript.
- PostgreSQL primary operational database.
- S3-compatible object storage for files and voice assets.
- Redis/BullMQ or equivalent for background jobs.
- WebSockets or managed realtime service for chat, notifications, task updates, and approvals.
- REST API first.
- AI provider abstraction with OpenAI or compatible provider as the first implementation option.
- Docker-based deployment with separate staging and production environments.

### 1.3 Architecture Modules

| Module | MVP Role | Post-MVP Expansion |
|---|---|---|
| Web App | Internal workspace and client portal | Advanced white label, deeper analytics, mobile wrappers |
| API Layer | Business API, validation, permissions, orchestration | Public API, integration API, partner webhooks |
| Identity | Auth, invitations, sessions, devices | MFA, SSO, enterprise identity |
| Permission Engine | RBAC, custom permission foundation, resource scope | Advanced policies and delegated admin |
| Tenant Service | Tenant resolution and tenant context | Enterprise isolation tiers |
| Project/Task Service | Projects, tasks, subtasks, dependencies | Recurring projects, workload, skill matching |
| CRM Service | Leads, opportunities, meetings, follow-ups | Proposals, quotations, advanced forecasting |
| Collaboration Service | Chat, files, approvals, voice notes | Advanced revisions, file previews, rich collaboration |
| Finance Service | Basic invoices, partial payments, revenue | Wallet, payroll, profitability, credit notes, refunds |
| AI Gateway | Voice-to-task and limited task drafts | AI assistant, copilot, analyst, AI search/reporting |
| Automation Service | System-defined notifications/reminders | Full workflow builder and advanced execution safety |
| Reporting Service | Basic dashboards and reports | BI, scheduled reports, exports, forecasting |
| Audit Service | Sensitive action logs | Compliance analytics and retention policies |
| Job Workers | Notifications, AI, voice, reports | Automation runs, scheduled reports, analytics jobs |

### 1.4 Technical Dependency Map

Tenant Resolver
  -> Auth and Session
  -> Permission Engine
  -> Audit Logging
  -> Core Workspace
  -> Projects and Tasks
  -> Client Portal
  -> Files, Chat, Approvals
  -> Voice Notes
  -> Basic AI
  -> CRM
  -> Finance
  -> Reports
  -> QA and Release Gates

Dependency principles:

- Permissions before client portal, finance, AI, automations, and reports.
- Audit logging before finance, client portal publication, AI, and automations.
- Projects/tasks before files, approvals, voice-to-task, reports, and finance linkage.
- Files before client approvals.
- Voice notes before voice-to-task.
- Client/project data before finance.
- Data-producing modules before reports.
- Manual workflows before advanced automations.
- QA before launch.

### 1.5 Required Technical Diagrams

#### Diagram 1: Technical system overview diagram

Users and Clients
  -> Next.js Web App
  -> API Gateway / NestJS API
  -> Tenant Resolver
  -> Auth and Permission Engine
  -> Domain Modules
  -> PostgreSQL, Object Storage, Redis Queue, Realtime, AI Provider
  -> Audit Logs and Observability

#### Diagram 2: Frontend/backend/database architecture diagram

Browser
  -> Next.js Routes and UI Components
  -> API Client
  -> NestJS Controllers
  -> Application Services
  -> Tenant-Aware Repositories
  -> PostgreSQL

#### Diagram 3: Tenant isolation diagram

Request Host/Session
  -> Resolve Tenant
  -> Load Membership
  -> Apply Tenant Context
  -> Enforce Resource Scope
  -> Execute Tenant-Scoped Data Access
  -> Log Sensitive Result

#### Diagram 4: Authentication and authorization diagram

Invite Token
  -> Account Setup
  -> Login
  -> Session and Device Record
  -> Tenant Membership
  -> Role and Permission Evaluation
  -> Resource Scope Evaluation
  -> Allow, Deny, Redact, or Require Approval

#### Diagram 5: Client portal data boundary diagram

Client User
  -> Client Portal Route
  -> Client Membership Check
  -> Own Client Scope
  -> Client-Visible Records Only
  -> No Internal Notes, Global Finance, Payroll, Audit, or Other Client Data

#### Diagram 6: File storage and versioning diagram

File Upload
  -> Permission Check
  -> Malware Scan Job
  -> Object Storage
  -> File Metadata
  -> Version Record
  -> Visibility Rules
  -> Signed Download Link
  -> Audit Log

#### Diagram 7: Chat and realtime diagram

Chat Message
  -> Channel Membership Check
  -> Persist Message
  -> Realtime Event
  -> Notify Authorized Members
  -> Audit/Activity Log Where Required

#### Diagram 8: Voice note processing diagram

Voice Upload
  -> Permission and Consent Check
  -> Object Storage
  -> Transcription Job
  -> Transcript Record
  -> AI Extraction Draft
  -> Human Confirmation
  -> Task Created

#### Diagram 9: AI permission-filtered retrieval diagram

AI Request
  -> User/Tenant/Role Context
  -> Permission-Filtered Data Resolver
  -> Prompt Injection Guard
  -> Redaction/Suppression
  -> Provider Call
  -> Source References
  -> Human Approval If Needed
  -> AI Audit Log

#### Diagram 10: Automation execution diagram

Trigger Event
  -> Load Automation Rule
  -> Validate Execution Context
  -> Revalidate Permissions
  -> Evaluate Conditions
  -> Execute Allowed Actions
  -> Log Steps
  -> Retry, Dead-Letter, or Complete

#### Diagram 11: Reporting/BI data access diagram

Report Request
  -> Tenant and Role Context
  -> Permission-Safe Query Layer
  -> Suppress Hidden Counts/Totals
  -> Render Report
  -> Export Approval If Needed
  -> Report Access Log

#### Diagram 12: Audit logging diagram

Sensitive Action
  -> Actor Context
  -> Resource Context
  -> Permission Result
  -> Action Result
  -> Audit Event
  -> Protected Audit Storage
  -> Owner/Security View

#### Diagram 13: Background jobs and queue diagram

API Action
  -> Job Enqueue With Tenant and Actor Context
  -> Worker
  -> Permission Revalidation
  -> External Service or Internal Task
  -> Result Record
  -> Notification and Audit

#### Diagram 14: Deployment environments diagram

Development
  -> QA
  -> Staging
  -> UAT
  -> Production
  -> Monitoring, Backup, Incident Response

#### Diagram 15: CI/CD workflow diagram

Commit
  -> Static Checks
  -> Tests
  -> Build Artifact
  -> Security Scan
  -> Deploy To Staging
  -> Smoke/UAT Gate
  -> Production Approval
  -> Production Deploy
  -> Monitoring and Rollback Readiness

#### Diagram 16: Backup and recovery diagram

Production Data
  -> Scheduled Database Backup
  -> Object Storage Versioning/Backup
  -> Backup Verification
  -> Restore Drill
  -> Recovery Report
  -> RPO/RTO Review

---

## 2. Recommended Technology Stack

### 2.1 Final Recommended MVP Stack

| Layer | Final Recommendation | MVP Rationale |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Strong web app foundation, routing, SSR/CSR flexibility, broad talent availability |
| Styling/UI | Tailwind CSS with shadcn/ui or equivalent component system | Fast, consistent, accessible UI delivery without custom design system overhead |
| Backend | NestJS on Node.js with TypeScript | Structured modular backend, dependency injection, guards, validation, background integration |
| API Style | REST first | Clear MVP implementation, easier testing, avoids premature GraphQL complexity |
| Database | PostgreSQL | Strong relational integrity, reporting capability, indexing, JSON support where justified |
| ORM/Data Access | Prisma or equivalent, behind tenant-aware repository/service layer | Faster development with type-safe access, but tenant filtering must not rely on developer memory |
| Tenant Isolation | Shared database with mandatory tenant-scoped records, tenant-aware repositories, constraints, and targeted database-level protections for sensitive tables | Balanced MVP speed and safety |
| Realtime | WebSockets through backend or managed realtime service | Supports chat, notifications, task and approval updates |
| File Storage | S3-compatible object storage with signed URLs and metadata in PostgreSQL | Scalable storage, clear access control, versioning support |
| Queue/Jobs | Redis with BullMQ or equivalent | Reliable MVP background jobs for notifications, voice, AI, reports |
| AI | Provider abstraction with OpenAI or compatible provider as initial provider | Avoid vendor lock-in and enforce permission gateway |
| Search | PostgreSQL full-text search for MVP | Avoid external search complexity until search scale is proven |
| Deployment | Docker-based deployment to managed application platform or Kubernetes only if needed | Repeatable environments without premature orchestration complexity |
| Observability | Centralized logs, metrics, error tracking, uptime checks | Required for production MVP and incident response |
| CI/CD | Automated checks, tests, build, staging deploy, approval gate to production | Required for release governance |

### 2.2 Stack Decision Matrix

| Area | Option A | Option B | Decision | Rationale |
|---|---|---|---|---|
| Frontend framework | Next.js | Vite SPA | Next.js | Better route structure, SSR options, and future portal/SEO flexibility |
| UI system | Tailwind + shadcn/ui | Fully custom components | Tailwind + shadcn/ui or equivalent | Speeds consistent MVP delivery while allowing brand expansion later |
| Backend framework | NestJS | Express/Fastify only | NestJS | More structure for modules, guards, validation, dependency boundaries |
| API model | REST | GraphQL | REST first | MVP needs clarity, testability, and predictable permission checks |
| Database | PostgreSQL | MySQL/MongoDB | PostgreSQL | Best fit for relational permissions, reporting, finance, audit, and constraints |
| ORM | Prisma | TypeORM/Knex/raw database access | Prisma or equivalent | Good productivity; must be wrapped with tenant-aware access patterns |
| Realtime | Backend WebSockets | Managed realtime | Start with backend WebSockets if team can operate; managed service if speed is critical | Choose based on team capacity and hosting constraints |
| Search | PostgreSQL full-text | External search engine | PostgreSQL full-text for MVP | External search can wait until volume and search complexity justify it |
| Queue | Redis/BullMQ | Cloud-native queue | Redis/BullMQ or equivalent | Simple and common for Node/NestJS; cloud queue acceptable if platform standard |
| AI provider | OpenAI | Multi-provider from day one | Provider abstraction with one initial provider | Preserve governance without over-building provider routing |
| Deployment | Managed Docker platform | Kubernetes | Managed Docker first | Kubernetes is likely overkill for MVP unless team already operates it |
| Analytics | Operational PostgreSQL reports | Dedicated warehouse | PostgreSQL for MVP, warehouse later | Advanced BI needs validated data first |

### 2.3 Stack Acceptance Criteria

- Stack supports tenant isolation, RBAC, audit logging, client portal boundaries, basic finance, files, chat, voice, and basic reports.
- Stack can be operated by a small engineering team.
- Stack does not require advanced enterprise infrastructure before MVP launch.
- Stack has a credible path to AI, automation, BI, and enterprise expansion.

---

## 3. Frontend Architecture

| Area | Specification |
|---|---|
| Purpose | Provide internal workspace and client portal UI for Owner, Manager, Employee, and Client roles |
| Recommended approach | Next.js application with role-aware route groups, shared design system, typed API client, RTL/LTR support, and permission-aware navigation |
| Alternatives considered | Vite SPA, separate apps for workspace/portal, server-rendered monolith |
| Decision rationale | Next.js gives good structure for shared UI, route separation, future white-labeling, and responsive web delivery |
| Dependencies | Auth/session, tenant context, permission metadata, API contracts |
| Security implications | UI must never be the only access control; hidden navigation is convenience only; all data requires backend authorization |
| MVP implementation level | Workspace shell, client portal shell, core screens, dashboard basics, projects/tasks, CRM, chat/files/approvals, finance basic |
| Post-MVP expansion path | Advanced white-label layouts, richer reports, public docs/help, mobile app or mobile wrapper |
| Risks | UI route leakage, inconsistent RTL/LTR, hidden sensitive widgets |
| Acceptance criteria | Role-specific navigation works; unauthorized routes deny access; Arabic RTL, English LTR, German LTR smoke tests pass |

---

## 4. Backend Architecture

| Area | Specification |
|---|---|
| Purpose | Central API and business logic layer for tenant-aware workflows |
| Recommended approach | NestJS modular backend with domain modules, shared auth/permission/audit services, validation layer, and tenant-aware repositories |
| Alternatives considered | Express/Fastify minimal API, serverless-only backend, separate microservices |
| Decision rationale | NestJS provides structure without microservice overhead and supports guards, modules, jobs, and integration boundaries |
| Dependencies | PostgreSQL, Redis queue, object storage, realtime, AI gateway, notification providers |
| Security implications | Backend is source of truth for tenant isolation, permissions, redaction, audit, and client-safe outputs |
| MVP implementation level | Modular monolith with clear domain module boundaries |
| Post-MVP expansion path | Extract AI, automation, reporting, or file processing into separate services when load or team ownership justifies |
| Risks | Over-coupling modules, inconsistent permission checks, long-running tasks inside request cycle |
| Acceptance criteria | All protected routes enforce tenant, session, role, permission, resource scope, and audit rules where required |

### 4.1 Backend Module Boundaries

| Module | Primary Responsibility |
|---|---|
| Identity Module | Invitations, users, login, sessions, devices |
| Tenant Module | Tenant resolution, tenant settings, module flags |
| Permission Module | RBAC, custom permission foundation, resource scope checks |
| Audit Module | Sensitive event creation and audit access |
| Project Module | Projects, tasks, subtasks, dependencies |
| Client Portal Module | Client-safe data access and portal APIs |
| CRM Module | Leads, opportunities, meetings, follow-ups |
| Collaboration Module | Chat, files, approvals, voice notes |
| Finance Module | Basic invoices, payments, revenue |
| AI Module | Provider gateway, voice-to-task, AI logs |
| Reporting Module | Basic dashboards and reports |
| Notification Module | In-app/email/realtime notifications |
| Job Module | Queue producers and worker orchestration |

---

## 5. Database Architecture

| Area | Specification |
|---|---|
| Purpose | Store tenant-scoped operational, audit, finance, collaboration, AI, and reporting records |
| Recommended approach | PostgreSQL shared database for MVP with tenant_id on every tenant-owned table, strict tenant-aware data access layer, foreign key tenant consistency, and sensitive-table hardening |
| Alternatives considered | Dedicated database per tenant, schema-per-tenant, document database |
| Decision rationale | Shared PostgreSQL is realistic for MVP and supports relational integrity, reporting, and future isolation tiers |
| Dependencies | Data model from Master/Phase 2, ORM, migration governance, backup strategy |
| Security implications | Tenant filters are mandatory; finance, client portal, AI, audit, and report tables require extra denial tests and audit rules |
| MVP implementation level | Core tenant-scoped schema for auth, projects, client portal, CRM, collaboration, finance basic, reports basic, audit logs |
| Post-MVP expansion path | Optional RLS expansion, dedicated enterprise tenant databases, analytics warehouse, vector/search stores |
| Risks | Missing tenant filter, weak constraints, reporting leakage, finance data exposure |
| Acceptance criteria | Tenant isolation tests pass; all tenant-owned records include tenant context; cross-tenant relationship violations are blocked |

Database implementation principles:

- Every tenant-owned table includes tenant context.
- Every repository/service receives tenant context explicitly.
- Direct unscoped data access is prohibited.
- Sensitive records include classification and audit-relevant metadata.
- Finance and client-facing records include visibility states.
- Reports use permission-safe data access, not raw unrestricted aggregation.

---

## 6. API Architecture

| Area | Specification |
|---|---|
| Purpose | Provide stable and secure API contract between web app and backend modules |
| Recommended approach | REST API first with resource-oriented endpoints, DTO validation, permission guards, and consistent error model |
| Alternatives considered | GraphQL, RPC-only, backend-for-frontend only |
| Decision rationale | REST is easier to secure, document, test, audit, and reason about for MVP |
| Dependencies | Auth, tenant resolver, permission engine, validation, audit service |
| Security implications | API must enforce all access rules server-side and avoid metadata leaks in errors |
| MVP implementation level | Internal web app API and client portal API with strict server-side checks |
| Post-MVP expansion path | Public integration API, webhooks, optional GraphQL for read-heavy dashboard composition if justified |
| Risks | Inconsistent authorization, over-fetching sensitive fields, hidden count leakage |
| Acceptance criteria | Every protected API validates tenant, session, role, permission, resource scope, and client visibility where applicable |

---

## 7. Authentication Architecture

| Area | Specification |
|---|---|
| Purpose | Enforce invite-only identity and session lifecycle |
| Recommended approach | Email invitation flow, account setup, secure session tokens, device records, login history, session revocation |
| Alternatives considered | Public registration, passwordless-only, third-party identity from day one |
| Decision rationale | Invite-only is mandatory; first-party flow is simplest for MVP while preserving future SSO/MFA |
| Dependencies | Tenant membership, invitations, users, sessions, devices, audit logs |
| Security implications | No public registration; invitation creation/acceptance/revocation must be audited |
| MVP implementation level | Invite-only login, sessions, devices, login history basics |
| Post-MVP expansion path | MFA, SSO, enterprise identity, conditional access |
| Risks | Invite token leakage, weak session expiry, untracked devices |
| Acceptance criteria | Public registration is impossible; invite-only tests pass; sessions/devices/login events are recorded |

---

## 8. Authorization Architecture

| Area | Specification |
|---|---|
| Purpose | Enforce RBAC, custom permission foundation, resource scope, client visibility, and financial restrictions |
| Recommended approach | Central permission engine invoked by API guards and domain services; deny by default; permission decisions logged for sensitive actions |
| Alternatives considered | Route-only checks, UI-only checks, hardcoded role checks |
| Decision rationale | MAOS requires cross-module access consistency; hardcoded checks will fail as modules grow |
| Dependencies | Roles, permissions, tenant memberships, resource ownership, client visibility, audit logs |
| Security implications | AI, automations, reports, files, finance, and client portal must use the same permission foundation |
| MVP implementation level | Owner, Manager, Employee, Client roles; core permissions; explicit finance restriction |
| Post-MVP expansion path | Policy builder, delegated admin, advanced resource-level grants |
| Risks | Permission drift, role shortcuts, authorization bypass in background jobs |
| Acceptance criteria | Owner/Manager/Employee/Client access tests pass across MVP modules; denied actions do not leak hidden data |

Authorization evaluation order:

1. Tenant context.
2. Authenticated session.
3. Tenant membership.
4. Role.
5. Custom permission or explicit grant.
6. Resource scope.
7. Client visibility.
8. Sensitivity classification.
9. Finance/payroll/AI/report/automation rule.
10. Audit/logging requirement.

---

## 9. Tenant Isolation Architecture

| Area | Specification |
|---|---|
| Purpose | Prevent cross-tenant access across UI, API, database, files, jobs, AI, reports, and logs |
| Recommended approach | Resolve tenant from host/session; attach tenant context to every request/job; require tenant_id in tenant-owned records; tenant-aware repository layer; tenant-scoped object storage metadata |
| Alternatives considered | Separate database per tenant from day one, schema-per-tenant |
| Decision rationale | Shared database with strict scoping is realistic for MVP; enterprise isolation can come later |
| Dependencies | Tenant service, auth, ORM/data access layer, file metadata, job context |
| Security implications | Tenant isolation failure is critical; tests must attempt cross-tenant access in every sensitive module |
| MVP implementation level | Strict shared-DB tenant scoping and cross-tenant denial tests |
| Post-MVP expansion path | Enterprise tenant isolation with dedicated database/storage/keys where required |
| Risks | Missing tenant context in worker/report/search path |
| Acceptance criteria | Cross-tenant UI/API/job/file/report/AI tests fail closed |

---

## 10. Client Portal Architecture

| Area | Specification |
|---|---|
| Purpose | Provide clients a safe portal with only own approved client-visible data |
| Recommended approach | Shared frontend app with separated client portal route group and backend portal APIs that enforce client membership and client-visible flags |
| Alternatives considered | Separate client portal app, public share links only |
| Decision rationale | Shared app reduces MVP complexity while backend boundaries protect data |
| Dependencies | Client records, client memberships, project visibility, file visibility, approvals, invoices, reports |
| Security implications | Client portal must never expose internal workspace data, internal chat, employee costs, payroll, audit logs, other clients, or unapproved files |
| MVP implementation level | Client dashboard, client project page, client chat, approvals, files, invoices/payments, client-safe reports |
| Post-MVP expansion path | White-label client portal, custom domain, richer reports, client self-service settings |
| Risks | Internal data leakage, wrong client scope, hidden metadata in counts |
| Acceptance criteria | Client can access only own approved records; cross-client and internal data tests pass |

---

## 11. Project/Task Architecture

| Area | Specification |
|---|---|
| Purpose | Core delivery system for projects, tasks, subtasks, dependencies, assignments, and status |
| Recommended approach | Project/task domain module with explicit project membership, task assignment, status model, activity logs, and client visibility flags |
| Alternatives considered | Generic work item system from day one, external project management integration |
| Decision rationale | Dedicated project/task model is simpler and better aligned to MVP workflows |
| Dependencies | Tenants, clients, users, permissions, audit/activity logs |
| Security implications | Tasks and subtasks must inherit project/client scope; client-visible task data must be explicitly marked |
| MVP implementation level | Projects, tasks, subtasks, basic dependencies, comments/status/assignment |
| Post-MVP expansion path | Recurring tasks/projects, workload balancer, skill matching, templates |
| Risks | Task scope leakage, unclear status model, dependency complexity |
| Acceptance criteria | Assigned-scope tests pass; clients see only approved client-visible project/task data |

---

## 12. CRM Architecture

| Area | Specification |
|---|---|
| Purpose | Support basic sales pipeline from lead to won/lost |
| Recommended approach | CRM module with leads, opportunities, meetings, follow-ups, simple stage model, and activity logs |
| Alternatives considered | Full CRM implementation, external CRM integration |
| Decision rationale | MVP needs basic pipeline value without proposal/quotation complexity |
| Dependencies | Users, clients, permissions, notifications, reports |
| Security implications | Assigned sales scope must be enforced; revenue/forecast fields must respect finance visibility where applicable |
| MVP implementation level | Leads, opportunities, meetings, follow-ups, pipeline stages |
| Post-MVP expansion path | Proposals, quotations, revenue forecasting, lead source analytics |
| Risks | Overbuilding CRM before project/client workflows stabilize |
| Acceptance criteria | Lead to Won/Lost workflow works; assigned CRM scope tests pass |

---

## 13. File Storage Architecture

| Area | Specification |
|---|---|
| Purpose | Store project/client deliverables, versions, voice files, and approval assets securely |
| Recommended approach | S3-compatible object storage with signed URLs, metadata in PostgreSQL, file version records, visibility states, and malware scan workflow |
| Alternatives considered | Database file storage, local disk, third-party drive integration first |
| Decision rationale | Object storage is scalable and separates binary assets from operational data |
| Dependencies | File metadata, permissions, object storage provider, malware scanning service, audit logs |
| Security implications | Signed URLs must be short-lived; file access must be checked before URL generation; client-visible files require explicit approval/visibility |
| MVP implementation level | Upload, download, metadata, versioning, visibility, scan status |
| Post-MVP expansion path | File previews, advanced locking, retention policies, DLP scanning |
| Risks | Leaked signed URLs, missing scan step, version confusion |
| Acceptance criteria | Unauthorized file access denied; version history preserved; client sees only approved files |

---

## 14. Chat Architecture

| Area | Specification |
|---|---|
| Purpose | Support internal and client-safe communication in context |
| Recommended approach | Chat module with channels, members, messages, attachments, realtime delivery, and separate internal/client channel types |
| Alternatives considered | External chat integration, comments-only MVP |
| Decision rationale | Chat is core to agency operations and client coordination |
| Dependencies | Realtime service, file service, permissions, notifications |
| Security implications | Clients must never access internal channels; file links inside chat must preserve file permissions |
| MVP implementation level | Internal chat and client chat basics |
| Post-MVP expansion path | Mentions, message search, retention controls, AI summaries |
| Risks | Channel membership leakage, file link leakage |
| Acceptance criteria | Internal/client channel separation tests pass; messages are only delivered to authorized members |

---

## 15. Voice Notes Architecture

| Area | Specification |
|---|---|
| Purpose | Capture voice notes and support basic voice-to-task workflow |
| Recommended approach | Store voice files in object storage, metadata in PostgreSQL, process transcription in background job, store transcript and extraction draft with permissions |
| Alternatives considered | Browser-only local transcription, external voice note tool integration |
| Decision rationale | Background processing is safer and more reliable for MVP |
| Dependencies | File storage, job queue, AI gateway/transcription provider, permissions, audit logs |
| Security implications | Voice/transcripts can include sensitive client data; access must follow context and retention rules |
| MVP implementation level | Upload/record, processing status, transcript, task draft confirmation |
| Post-MVP expansion path | Meeting-to-tasks, multilingual quality review, voice retention policies |
| Risks | Poor transcription, unauthorized transcript access, AI extraction error |
| Acceptance criteria | Voice-to-task creates only drafts; task creation requires human confirmation |

---

## 16. AI Integration Architecture

| Area | Specification |
|---|---|
| Purpose | Provide safe AI capabilities without bypassing permissions |
| Recommended approach | AI Gateway service with provider abstraction, permission-filtered data resolver, prompt injection guard, redaction, human approval gates, and AI logs |
| Alternatives considered | Direct provider calls from frontend, direct provider calls from domain modules, multi-provider routing from day one |
| Decision rationale | Central gateway enforces governance and keeps provider selection replaceable |
| Dependencies | Permission engine, audit logs, file/transcript data, job queue, provider credentials |
| Security implications | AI must never retrieve, infer, or output data the user cannot access manually |
| MVP implementation level | Basic voice-to-task/task draft support only |
| Post-MVP expansion path | AI Assistant, Copilot, Analyst, AI Search, AI Reporting, AI Analytics |
| Risks | Prompt injection, hidden data leakage, hallucinated tasks, provider retention policy mismatch |
| Acceptance criteria | AI permission tests, prompt injection tests, source context checks, and human approval tests pass |

---

## 17. Automation Engine Architecture

| Area | Specification |
|---|---|
| Purpose | Support system-defined MVP notifications/reminders and future workflow builder |
| Recommended approach | Event-triggered internal automation service for MVP; full rule builder deferred until manual workflows stabilize |
| Alternatives considered | Full automation builder in MVP, external automation tool integration |
| Decision rationale | Full builder is too risky for MVP because permissions, loops, idempotency, and approval rules are complex |
| Dependencies | Event/queue system, permissions, audit logs, notifications |
| Security implications | Automations must execute with approved context and must not bypass permissions |
| MVP implementation level | System-defined notification/reminder/status automations only |
| Post-MVP expansion path | Rule versions, execution contexts, runtime revalidation, dead-letter, idempotency, workflow builder |
| Risks | Unapproved automated actions, notification leakage, loop risk |
| Acceptance criteria | MVP automations are predefined, permission-safe, auditable, and cannot perform destructive actions |

---

## 18. Finance Architecture

| Area | Specification |
|---|---|
| Purpose | Support owner-only basic invoices, partial payments, and revenue visibility |
| Recommended approach | Finance module with invoice, line item, payment/allocation, partial payment, and revenue records; Owner-only access by default |
| Alternatives considered | Full accounting integration, payroll/profitability in MVP |
| Decision rationale | Basic billing proves value without high-risk payroll/profit complexity |
| Dependencies | Clients, projects, permissions, audit logs, reports |
| Security implications | Finance data is sensitive; managers/employees denied by default; clients see own approved invoices/payments only |
| MVP implementation level | Basic invoices, partial payments, payment status, basic revenue dashboard |
| Post-MVP expansion path | Wallet, refunds, credit notes, employee costs, payroll, profitability analytics |
| Risks | Finance data leakage, payment status mismatch, insufficient audit trail |
| Acceptance criteria | Owner-only finance tests pass; clients can only view own approved billing records |

---

## 19. Reporting/BI Architecture

| Area | Specification |
|---|---|
| Purpose | Provide basic permission-safe dashboards and reports from MVP data |
| Recommended approach | Reporting service using PostgreSQL-backed permission-safe query layer, role dashboards, basic report definitions, and report access logs |
| Alternatives considered | Dedicated BI warehouse, external BI tool, full semantic layer in MVP |
| Decision rationale | Basic reports are enough until data quality and volume are validated |
| Dependencies | Project/task/CRM/finance data, permission engine, audit/report logs |
| Security implications | Reports must suppress hidden counts, hidden totals, unauthorized finance, and cross-client data |
| MVP implementation level | Owner/Manager/Employee/Client dashboards and basic reports |
| Post-MVP expansion path | KPI library, saved reports, scheduled reports, exports, forecasting, anomaly detection, data warehouse |
| Risks | Hidden total leakage, client aggregation leakage, slow report queries |
| Acceptance criteria | Dashboard/report permission tests pass; client-safe reports exclude internal data |

---

## 20. Audit Logging Architecture

| Area | Specification |
|---|---|
| Purpose | Record sensitive actions and permission-relevant events across the platform |
| Recommended approach | Central audit service called by domain modules and workers; protected audit table; structured event schema; Owner/security access controls |
| Alternatives considered | Plain application logs only, per-module audit tables only |
| Decision rationale | Central audit model is required before finance, client portal, AI, and automations |
| Dependencies | Actor context, tenant context, resource context, permission result, outcome |
| Security implications | Audit logs are sensitive and must not be visible to clients or unauthorized roles |
| MVP implementation level | Invitations, permissions, client publication, finance, approvals, file access, AI actions, report access where sensitive |
| Post-MVP expansion path | Audit analytics, retention policies, export, compliance reporting |
| Risks | Missing audit events, overly verbose sensitive details, tampering |
| Acceptance criteria | Sensitive MVP actions create audit records and unauthorized users cannot view them |

---

## 21. Notification Architecture

| Area | Specification |
|---|---|
| Purpose | Notify users about invites, tasks, approvals, chat, follow-ups, invoice status, and system events |
| Recommended approach | Notification service with in-app notifications and email where configured, delivered through queue workers |
| Alternatives considered | Email-only MVP, realtime-only notifications |
| Decision rationale | In-app plus email gives practical coverage without overbuilding |
| Dependencies | Queue, user preferences, permissions, email provider, realtime events |
| Security implications | Notifications must not leak hidden record names, counts, finance values, or internal content |
| MVP implementation level | Invites, assignments, approvals, chat mentions, follow-ups, invoice updates |
| Post-MVP expansion path | Notification preferences, digest emails, escalation rules, automation-driven notifications |
| Risks | Notification leakage, noisy notifications, failed delivery |
| Acceptance criteria | Notification content is permission-safe and delivery failures are visible to authorized admins |

---

## 22. Search Architecture

| Area | Specification |
|---|---|
| Purpose | Provide basic search over permitted MVP records |
| Recommended approach | PostgreSQL full-text search for MVP with permission filters applied before result return |
| Alternatives considered | External search engine, vector search in MVP |
| Decision rationale | MVP search scope is limited; external search should wait until volume and use cases justify it |
| Dependencies | Database indexes, permission engine, searchable metadata |
| Security implications | Search must not reveal hidden result counts or unauthorized object metadata |
| MVP implementation level | Basic search across projects, tasks, CRM, files metadata where permitted |
| Post-MVP expansion path | External search engine, AI search, vector retrieval, transcript search |
| Risks | Hidden result leakage, slow search queries |
| Acceptance criteria | Search results only include objects user can manually access |

---

## 23. Background Jobs Architecture

| Area | Specification |
|---|---|
| Purpose | Process non-immediate tasks reliably without blocking user requests |
| Recommended approach | Redis/BullMQ or equivalent queue with typed job names, tenant context, actor context, retry policy, dead-letter handling path |
| Alternatives considered | Inline processing, cloud-native queue only, scheduled scripts |
| Decision rationale | Jobs are required for voice, AI, notifications, reports, and future automations |
| Dependencies | Redis/queue provider, workers, audit logs, permissions, external providers |
| Security implications | Workers must revalidate tenant/permission context for sensitive operations |
| MVP implementation level | Notifications, voice processing, AI extraction, report generation basics |
| Post-MVP expansion path | Automation execution, scheduled reports, BI aggregation, file processing |
| Risks | Lost jobs, duplicate processing, stale permissions, worker overload |
| Acceptance criteria | Jobs preserve tenant/actor context, retry safely, and log failures |

---

## 24. Caching Strategy

| Area | Specification |
|---|---|
| Purpose | Improve performance without weakening permissions |
| Recommended approach | Minimal MVP caching for static/config data and safe short-lived server cache; avoid caching sensitive personalized aggregates until rules mature |
| Alternatives considered | Aggressive cache-first architecture, CDN caching of app data |
| Decision rationale | Permission-sensitive SaaS requires conservative caching |
| Dependencies | Tenant context, role context, invalidation rules |
| Security implications | Cache keys must include tenant and permission-relevant scope; sensitive finance/client data should not be broadly cached |
| MVP implementation level | Cache tenant settings, non-sensitive lookup data, UI assets |
| Post-MVP expansion path | Report cache with permission-aware keys, invalidation, and freshness indicators |
| Risks | Cross-tenant cache leakage, stale permissions, hidden totals exposed |
| Acceptance criteria | No cache entry can be reused across tenants or incompatible permission scopes |

---

## 25. Queue/Event Architecture

| Area | Specification |
|---|---|
| Purpose | Support asynchronous workflows, notifications, and future event-driven automation |
| Recommended approach | Internal domain events published after committed business changes; queue jobs carry tenant, actor, resource, and sensitivity metadata |
| Alternatives considered | External event bus from day one, no event model |
| Decision rationale | MVP needs event discipline but not enterprise event infrastructure |
| Dependencies | Domain modules, job queue, audit service, notification service |
| Security implications | Events must not expose sensitive payloads to unauthorized processors; workers must re-check scope where needed |
| MVP implementation level | Internal events for invites, task assignments, approvals, file versions, chat, invoices, reports |
| Post-MVP expansion path | Full automation trigger system, event replay controls, integration webhooks |
| Risks | Duplicate events, stale data, sensitive payloads |
| Acceptance criteria | Event consumers are idempotent where needed and do not bypass permissions |

---

## 26. Realtime Architecture

| Area | Specification |
|---|---|
| Purpose | Provide live updates for chat, notifications, tasks, approvals, and client portal activity |
| Recommended approach | WebSocket gateway or managed realtime service using authenticated subscriptions and channel membership checks |
| Alternatives considered | Polling only, third-party chat service |
| Decision rationale | Chat requires realtime behavior; managed service may reduce operational work if budget allows |
| Dependencies | Auth/session, channel membership, notification service |
| Security implications | Realtime subscriptions must be authorized and disconnected on session revocation where possible |
| MVP implementation level | Chat, notification updates, task/approval status updates |
| Post-MVP expansion path | Presence, typing indicators, richer collaboration, live report refresh |
| Risks | Unauthorized subscriptions, stale membership, connection scaling |
| Acceptance criteria | Realtime events only reach authorized tenant/channel/resource members |

---

## 27. Security Architecture

| Area | Specification |
|---|---|
| Purpose | Enforce secure-by-default implementation across application layers |
| Recommended approach | Defense-in-depth using invite-only auth, tenant context, RBAC/custom permissions, resource scope, audit logs, secure file access, provider secret isolation, and secure release gates |
| Alternatives considered | Minimal role checks only, external security review after MVP |
| Decision rationale | MAOS handles clients, finance, files, AI, and reports; security must be built before sensitive features |
| Dependencies | Auth, authorization, audit, tenant resolver, CI/CD, observability |
| Security implications | Security is a platform foundation, not a later hardening task |
| MVP implementation level | Auth, RBAC, tenant isolation, client boundaries, owner-only finance, audit logs, basic rate limits |
| Post-MVP expansion path | MFA, SSO, advanced rate limits, field-level sensitivity, enterprise policies |
| Risks | Permission bypass, token leakage, insecure exports, AI/report leakage |
| Acceptance criteria | Security test suite passes before MVP launch |

### 27.1 Security Implementation Principles

- Deny by default.
- Server-side authorization is mandatory.
- UI hiding is not authorization.
- Every tenant-owned operation must carry tenant context.
- Every sensitive action must be audit-logged.
- Financial data is Owner-only by default.
- Client portal APIs return only client-visible data.
- AI and automations must use permission-checked service paths.
- Reports must suppress hidden counts and totals.
- Secrets must be stored in environment secret management, not source files.

---

## 28. Deployment Architecture

| Area | Specification |
|---|---|
| Purpose | Deploy repeatable, isolated, observable application environments |
| Recommended approach | Docker-based build artifacts deployed to managed application runtime; separate web, API, worker, database, cache, storage, and realtime components |
| Alternatives considered | Kubernetes from day one, manual server deployment, serverless-only deployment |
| Decision rationale | Docker provides repeatability; managed runtime avoids MVP infrastructure overreach |
| Dependencies | CI/CD, secrets, environment config, database, object storage, Redis |
| Security implications | Environment isolation, secret management, network restrictions, secure image pipeline |
| MVP implementation level | Staging and production with separate resources |
| Post-MVP expansion path | Blue/green deploys, multi-region, enterprise environments, Kubernetes if justified |
| Risks | Environment drift, secret leakage, weak rollback |
| Acceptance criteria | Staging mirrors production enough for release validation; rollback procedure exists |

---

## 29. Environment Strategy

| Environment | Purpose | Data Rules | Required Controls |
|---|---|---|---|
| Local/Dev | Developer work | Synthetic or local test data only | No production secrets |
| QA | Test execution | Test data only | QA evidence, repeatable seed data |
| Staging | Production-like validation | Sanitized or approved controlled data | Release gates, smoke tests |
| UAT | Pilot validation | Approved pilot/UAT data | Role test accounts, UAT sign-off |
| Production | Live tenants | Real tenant data | Monitoring, backups, incident response |
| Sandbox/Pilot | Controlled first tenant trials | Pilot data only | Limited rollout and support monitoring |

Acceptance criteria:

- No production data in local/dev.
- Staging and production secrets are separated.
- UAT users cover Owner, Manager, Employee, and Client.
- Production has backup, monitoring, rollback, and incident processes.

---

## 30. CI/CD Strategy

| Area | Specification |
|---|---|
| Purpose | Provide repeatable quality gates from change to production |
| Recommended approach | Automated pipeline for static checks, tests, build, security scan, staging deploy, smoke tests, approval gate, production deploy |
| Alternatives considered | Manual deployment, production-only deploys |
| Decision rationale | Release governance requires repeatable evidence and rollback readiness |
| Dependencies | Test architecture, environment strategy, secrets, artifact storage |
| Security implications | CI/CD must protect secrets and prevent unapproved production deploys |
| MVP implementation level | Required before MVP launch |
| Post-MVP expansion path | Preview environments, canary releases, policy-as-code checks |
| Risks | Skipped tests, untracked hotfixes, deployment drift |
| Acceptance criteria | Production deploy requires passing checks and explicit approval |

---

## 31. Observability and Monitoring

| Area | Specification |
|---|---|
| Purpose | Detect failures, performance issues, security-relevant anomalies, and job problems |
| Recommended approach | Centralized application logs, error tracking, metrics, uptime checks, queue monitoring, worker failure alerts, audit visibility |
| Alternatives considered | Logs only, manual monitoring |
| Decision rationale | MVP launch requires operational confidence and incident response |
| Dependencies | Runtime platform, logging provider, metrics provider, alerting channels |
| Security implications | Logs must avoid sensitive content leakage and protect audit data |
| MVP implementation level | API errors, frontend errors, job failures, uptime, queue health, database health |
| Post-MVP expansion path | SLOs, anomaly alerts, user behavior analytics, cost monitoring |
| Risks | Silent job failures, missing incident alerts, sensitive logs |
| Acceptance criteria | Critical service/job failures alert authorized operators |

---

## 32. Backup and Recovery

| Area | Specification |
|---|---|
| Purpose | Protect operational data, files, audit records, and recovery readiness |
| Recommended approach | Scheduled PostgreSQL backups, object storage versioning/backup, backup verification, restore drills, documented RPO/RTO targets |
| Alternatives considered | Provider default backups only, manual export backups |
| Decision rationale | MVP handles real client and finance data; restore must be validated |
| Dependencies | Database provider, object storage, environment strategy, release governance |
| Security implications | Backups contain sensitive tenant data and must be encrypted and access-controlled |
| MVP implementation level | Scheduled backups, restore test before launch, backup access restriction |
| Post-MVP expansion path | Point-in-time recovery, tenant-level export/restore, enterprise RPO/RTO tiers |
| Risks | Backup not restorable, object/file mismatch, unauthorized backup access |
| Acceptance criteria | Restore drill passes before MVP launch |

---

## 33. Performance Strategy

| Area | Specification |
|---|---|
| Purpose | Ensure MVP workflows are responsive for pilot tenants |
| Recommended approach | Optimize core database indexes, avoid heavy synchronous jobs, use queues for AI/voice/reports, limit report complexity |
| Alternatives considered | Premature caching/warehouse optimization |
| Decision rationale | MVP should be reliable without advanced infrastructure |
| Dependencies | Database indexing, job queue, frontend loading states, monitoring |
| Security implications | Performance shortcuts must not bypass permission checks |
| MVP implementation level | Response-time monitoring, basic indexes, async heavy work |
| Post-MVP expansion path | Report caching, read replicas, analytics store, CDN tuning |
| Risks | Slow dashboards, large file bottlenecks, voice job delays |
| Acceptance criteria | Core screens and actions meet agreed MVP thresholds in staging/UAT |

---

## 34. Scalability Strategy

| Area | Specification |
|---|---|
| Purpose | Allow MVP to grow without premature enterprise complexity |
| Recommended approach | Horizontal scaling for web/API/workers, managed PostgreSQL scaling, object storage, queue-based processing |
| Alternatives considered | Microservices from day one, single server deployment |
| Decision rationale | Modular monolith plus scalable infrastructure is the right MVP balance |
| Dependencies | Deployment platform, database provider, queue, object storage |
| Security implications | Scaling must preserve tenant context and secrets isolation |
| MVP implementation level | Scale web/API/workers independently if needed |
| Post-MVP expansion path | Service extraction, read replicas, warehouse, enterprise tenant isolation |
| Risks | Worker bottlenecks, database contention, realtime scaling |
| Acceptance criteria | MVP can support pilot tenants and realistic test load without architectural redesign |

---

## 35. Data Migration Strategy

| Area | Specification |
|---|---|
| Purpose | Safely migrate initial tenant/client/project/CRM/file data if pilot requires it |
| Recommended approach | MVP supports controlled data loading only after field mapping, validation, tenant scope assignment, backup, and reconciliation |
| Alternatives considered | Full self-service migration in MVP, manual data entry only |
| Decision rationale | Pilot may need starter data, but full migration tooling is post-MVP |
| Dependencies | Data model, validation rules, backup/recovery, QA evidence |
| Security implications | Imported data must not cross tenant/client boundaries and must preserve visibility flags |
| MVP implementation level | Manual or controlled admin-assisted data loading for pilot only |
| Post-MVP expansion path | Migration tools, data loading templates, validation dashboards |
| Risks | Bad mappings, duplicate clients/tasks, permission/visibility errors |
| Acceptance criteria | Imported pilot data reconciles and passes tenant/client visibility checks |

---

## 36. Testing Architecture

| Area | Specification |
|---|---|
| Purpose | Validate functional behavior, security, permissions, client visibility, AI safety, finance, reports, performance, and release readiness |
| Recommended approach | Layered testing: unit-level acceptance, API integration, end-to-end role tests, permission matrix tests, client portal tests, finance tests, AI safety tests, report privacy tests, smoke tests |
| Alternatives considered | Manual QA only, late-stage security testing only |
| Decision rationale | MAOS critical rules require tests before release, not after launch |
| Dependencies | QA evidence model, test data, role accounts, CI/CD, staging/UAT environments |
| Security implications | Permission tests are mandatory for sensitive modules |
| MVP implementation level | Automated and manual evidence for all MVP critical flows |
| Post-MVP expansion path | Expanded regression suite, performance test suite, security automation, DR drills |
| Risks | Missing negative tests, weak client visibility tests, untested rollback |
| Acceptance criteria | Milestone 10 passes with evidence before launch |

---

## 37. Release Architecture

| Area | Specification |
|---|---|
| Purpose | Govern safe MVP launch and future releases |
| Recommended approach | Release gates with staged rollout: internal alpha, client portal beta, finance beta, MVP release candidate, production launch |
| Alternatives considered | Big-bang launch, ad hoc hotfixes |
| Decision rationale | Client-facing and finance modules require controlled release evidence |
| Dependencies | CI/CD, monitoring, rollback, QA evidence, UAT sign-off |
| Security implications | No production release without security, permission, audit, and rollback validation |
| MVP implementation level | Release checklist and go/no-go approval |
| Post-MVP expansion path | Canary rollout, feature flags, release exception workflow, hotfix governance |
| Risks | Launching with unresolved critical defects, weak rollback, missing monitoring |
| Acceptance criteria | UAT signed, critical defects closed, rollback validated, monitoring active |

---

## 38. MVP Technical Scope

### 38.1 MVP Architecture Boundaries

Included in MVP technical implementation:

- Next.js web app for internal workspace and client portal.
- NestJS modular backend API.
- PostgreSQL tenant-scoped operational database.
- S3-compatible object storage with signed URLs.
- Redis/BullMQ or equivalent for jobs.
- Realtime for chat, notifications, task/approval updates.
- Auth, invitations, sessions, devices, RBAC/custom permission foundation.
- Audit logs before client portal, finance, AI, and reports.
- Projects, tasks, subtasks, basic dependencies.
- Client portal with strict own-client data boundary.
- Basic CRM.
- Files, file versioning, chat, approvals.
- Voice notes and voice-to-task basic.
- Basic invoices, partial payments, revenue tracking.
- Basic dashboards and reports.
- QA/UAT/security/release gates.

Excluded from MVP technical implementation:

- Full automation builder.
- Advanced AI Analyst.
- AI financial analytics.
- Full payroll automation.
- Advanced wallet.
- Advanced BI forecasting/anomaly detection.
- Enterprise data warehouse.
- Integration marketplace.
- Native mobile app.
- Full white-label customization.

### 38.2 MVP Technical Acceptance Criteria

- Tenant isolation is enforceable in every MVP module.
- Permissions are enforced server-side before sensitive modules.
- Audit logs exist before finance, client portal, AI, and automations.
- AI cannot bypass permissions and cannot save task actions without human approval.
- Reports suppress hidden counts and hidden totals.
- Owner Only Financial Access is technically enforceable.
- Client portal cannot access internal workspace data.
- No Start = No Time and No Time = No Payroll are preserved in architecture for later payroll enforcement.

---

## 39. Post-MVP Technical Scope

| Version | Technical Expansion |
|---|---|
| Version 1.1 | White-label basics, wallet basic, scheduled reports, richer client portal, recurring task basics, file previews |
| Version 1.2 | Payroll approval workflow, employee costs, advanced profitability, workload, skill matching, AI search/reporting, automation templates |
| Version 2.0 | Full automation builder, advanced AI Analyst, advanced BI forecasting, anomaly detection, warehouse, integration marketplace, native mobile app, enterprise tenant isolation |

Expansion rules:

- Do not add advanced automation before manual workflows are stable.
- Do not add advanced BI before data quality is validated.
- Do not add payroll automation before approved time workflow is mature.
- Do not add AI analytics before source, permission, and leakage controls are proven.

---

## 40. Open Technical Decisions

| Decision | Options | Recommended Default | Owner | Required By Milestone/Gate | Decision Deadline | Risk If Unresolved | Escalation Path |
|---|---|---|---|---|---|---|---|
| Hosting platform | Managed app platform, cloud containers, Kubernetes | Managed Docker-capable app platform unless team already operates Kubernetes | CTO / DevOps Architect | Milestone 0 exit | Before architecture validation sign-off | Environment drift, delayed CI/CD, unclear rollback | CTO decision with Product/Finance input |
| ORM choice | Prisma, TypeORM, Knex | Prisma or equivalent with tenant-aware repository wrapper | Principal Software Architect | Milestone 0 exit | Before data access implementation starts | Permission drift and inconsistent repository patterns | CTO architecture review |
| Tenant hardening/RLS level | Application-enforced only, targeted RLS/database controls, broad RLS | Tenant-aware repositories plus targeted database-level protection for sensitive tables where practical | Database Architect / Security Architect | Milestone 1 design gate | Before auth/tenant implementation exit | Tenant leakage risk and failed security audit | CTO + Security Architect decision |
| Realtime provider | Backend WebSockets, managed realtime | Backend WebSockets if operations capacity exists; managed realtime if speed and reliability are higher priority | Principal Software Architect / DevOps Architect | Milestone 6 design gate | Before chat implementation starts | Unauthorized subscriptions or delivery delays | CTO decision |
| Payment provider | Stripe or regional provider | Select provider based on pilot countries, EUR/USD/AED/SAR needs, and compliance | Finance Owner / CTO | Milestone 8 design gate | Before finance implementation starts | Unsupported country/currency, payment reconciliation issues | Owner/CTO decision |
| AI provider | OpenAI or compatible provider | Provider abstraction with approved retention and no unauthorized training | AI Systems Architect / Security Architect | Milestone 7 design gate | Before voice-to-task implementation starts | AI retention mismatch or blocked launch | CTO + Security Architect decision |
| Transcription provider | AI provider transcription, specialized transcription provider | Provider selected after Arabic/German/mixed-language quality test | AI Systems Architect | Milestone 7 design gate | Before transcription workflow build | Poor transcript quality and unusable voice-to-task | CTO + Product Strategy Lead decision |
| Report export in MVP | Limited export, defer export | Defer sensitive exports unless pilot requires them | Product Strategy Lead / Security Architect | Milestone 9 design gate | Before reporting implementation starts | Export leakage or scope creep | Product/CTO decision |
| RLS adoption | Broad MVP RLS, targeted RLS, equivalent database-level controls | Targeted RLS/equivalent controls for sensitive tables where practical; mandatory tenant-aware service layer regardless | Database Architect / Security Architect | Milestone 1 design gate | Before database implementation hardens | Application-only tenant isolation gap | Security architecture review |
| Deployment region | Single primary region, regional choice | Pick region based on pilot tenant, client expectations, and provider availability | DevOps Architect / Owner | Milestone 0 exit | Before production environment setup | Data residency concern, latency, provider limitation | Owner/CTO decision |
| Object storage provider | AWS S3, Cloudflare R2, MinIO-compatible managed storage, regional S3-compatible provider | S3-compatible managed provider with signed URL, versioning, lifecycle, and malware scanning integration | DevOps Architect / Security Architect | Milestone 6 design gate | Before file implementation starts | File security or compliance gap | CTO + Security decision |
| Email provider | Transactional email provider, platform email service | Provider with reliable deliverability, templates, auditability, and regional compliance | DevOps Architect / Product Operations | Milestone 1 for invites; Milestone 6 for notifications | Before invitation flow production test | Invite failures and notification gaps | Product Operations escalation |
| Monitoring/logging provider | Managed observability suite, self-hosted logs/metrics | Managed observability with app logs, worker logs, frontend errors, uptime, and alerting | DevOps Architect | Milestone 0 exit | Before staging release gates | Silent failures and weak incident response | CTO/Release Manager decision |
| Backup/restore provider or process | Managed database backup, custom backup process, third-party backup tooling | Managed database backup plus documented restore drill and object storage backup/versioning | DevOps Architect / Database Architect | Before production launch | Before Milestone 11 go/no-go | Unverified recovery and data loss risk | CTO + Owner decision |

---

## 41. Technical Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Tenant isolation failure | Critical | Tenant-aware repositories, tests, context propagation, audit denied attempts |
| Client portal data leakage | Critical | Client-specific APIs, client-visible flags, negative tests |
| Finance data exposure | Critical | Owner-only permissions, server-side checks, audit logs |
| AI permission bypass | Critical | AI gateway, permission-filtered resolver, human approval, AI logs |
| Report hidden total leakage | High | Permission-safe queries, suppression rules, report tests |
| File signed URL leakage | High | Short-lived signed URLs, permission check before generation, audit |
| Background job stale permissions | High | Jobs include context and revalidate sensitive permissions |
| Realtime unauthorized subscription | High | Authenticated subscriptions and membership checks |
| Scope creep | High | MVP boundaries and Phase 13 scope control rules |
| Slow dashboards/search | Medium | MVP indexing, simple reports, query monitoring |
| Deployment/rollback failure | High | CI/CD gates, staging validation, rollback plan |
| Backup restore failure | High | Restore drills before launch |

---

## 42. Implementation Readiness Checklist

| Checklist Item | Required Status |
|---|---|
| Final recommended MVP stack selected | Required |
| Stack decision matrix reviewed | Required |
| Architecture modules mapped | Required |
| Technical dependency map accepted | Required |
| Tenant isolation approach approved | Required before Milestone 1 |
| Auth and authorization approach approved | Required before Milestone 1 |
| Audit logging architecture approved | Required before client portal, finance, AI, reports |
| Client portal boundary approved | Required before Milestone 4 |
| File storage and signed URL model approved | Required before Milestone 6 |
| Realtime approach selected | Required before Milestone 6 |
| AI provider and retention policy selected | Required before Milestone 7 |
| Finance access model approved | Required before Milestone 8 |
| Reporting privacy approach approved | Required before Milestone 9 |
| Queue/job architecture approved | Required before AI, reports, notifications |
| Deployment and environment strategy approved | Required before staging |
| CI/CD gate approved | Required before production |
| Observability and monitoring active | Required before launch |
| Backup and restore drill passed | Required before launch |
| Security test suite defined | Required before Milestone 10 |
| MVP technical acceptance criteria passed | Required before launch |
| Open technical decisions assigned owners | Required before Milestone 0 exit |

## 43. Phase 14 Technical Hardening Addendum

### 43.1 Sensitive Table Hardening Baseline

Shared PostgreSQL remains acceptable for the MVP, but tenant isolation must not rely on developer discipline alone. Every tenant-owned table must include tenant context, and every tenant-owned query must pass through tenant-aware repository or service patterns. Sensitive tables require additional hardening beyond normal application filters and must be considered for targeted RLS or equivalent database-level protection where practical.

Baseline rules:

- Every tenant-owned table must include `tenant_id` or an approved tenant scope equivalent.
- Every tenant-owned query must pass through a tenant-aware repository/service pattern.
- Sensitive tables must receive additional security review before Milestone 1 exits.
- Targeted RLS or equivalent database-level protection is the default hardening target for sensitive tables where compatible with the chosen ORM and operations model.
- If targeted RLS is deferred for a sensitive table, the deferral must be documented with compensating controls and security approval.
- Application-level tenant checks remain mandatory even where database-level controls exist.

| Sensitive Table Group | Required Tenant Scope | Application-Level Control | Database-Level Hardening Target | Audit Requirement | Test Requirement |
|---|---|---|---|---|---|
| audit_logs | tenant_id and actor/resource context | Owner/security-grant access only through audit service | Append-only table policy and targeted database-level access restrictions where practical | Audit view/export/correction events | Cross-tenant denial, tamper attempt, unauthorized view denial |
| finance records | tenant_id, client_id/project_id where applicable | Owner-only finance service checks | Targeted RLS/equivalent or restricted database role access | Create/update/view/export logged | Owner-only and non-owner denial tests |
| invoices | tenant_id, client_id | Finance service plus client-own invoice visibility checks | Targeted RLS/equivalent for tenant and client scope | Invoice create/update/view logged | Client own-only and other-client denial tests |
| payments | tenant_id, invoice_id/client_id | Finance service plus payment status rules | Targeted RLS/equivalent for tenant and client scope | Payment create/update/view logged | Partial payment and unauthorized payment view denial |
| revenue records | tenant_id, project_id/client_id | Owner-only revenue access | Targeted RLS/equivalent for tenant scope | Revenue view/report logged where sensitive | Manager/employee denial and report denial tests |
| client portal visibility records | tenant_id, client_id, resource_id | Client portal service only returns approved visible records | Targeted RLS/equivalent for client scope where practical | Publication/unpublication logged | Client-safe visibility and cross-client denial tests |
| file metadata | tenant_id, client/project/task context | File service checks before metadata or URL access | Targeted RLS/equivalent for tenant and resource scope | Upload/view/download/share logged where sensitive | Unauthorized file metadata and URL denial |
| file versions | tenant_id, file_id/resource context | File service version access checks | Targeted RLS/equivalent tied to file scope | Version upload/view logged | Version history unauthorized access denial |
| file shares | tenant_id, file_id, recipient/client scope | Share service validates recipient and visibility | Targeted RLS/equivalent for share scope | Share create/revoke/view logged | Invalid share and revoked share denial |
| chat messages | tenant_id, channel_id | Channel membership checks | Targeted RLS/equivalent for channel scope where practical | Sensitive channel access logged where required | Internal/client channel separation tests |
| voice notes | tenant_id, project/task/channel/client context | Voice service access checks | Targeted RLS/equivalent for tenant and resource scope | Voice create/view/process logged | Unauthorized transcript/voice denial |
| transcripts | tenant_id, voice_note_id | Transcript access inherits voice note scope | Targeted RLS/equivalent tied to voice note scope | Transcript view/edit logged where sensitive | Transcript cross-scope denial |
| AI logs | tenant_id, actor, source references | AI gateway-only access with redaction | Restricted database role access and targeted RLS where practical | AI prompt/output/action/denial logged | Unauthorized AI log access denial |
| report access logs | tenant_id, report/dashboard/user context | Reporting service creates and Owner/security views | Restricted access and targeted tenant scope | Report view/export/schedule logged | Report access log visibility tests |
| automation run logs | tenant_id, automation_id/run_id | Automation service access only | Targeted tenant scope and restricted database role access | Run/step/failure logged | Unauthorized automation log denial |
| permission grants | tenant_id, grantor, grantee, resource scope | Permission service only; Owner/security-grant controls | Restricted access and targeted tenant scope | Grant/revoke/change logged | Privilege escalation denial tests |
| sessions/devices/login history | tenant_id/user_id/session/device context | Identity service only | Restricted database role access and targeted user/tenant scope | Session/device/login events logged | Session revocation and unauthorized device view denial |

### 43.2 Tenant-Aware Repository And Guard Pattern

Required backend pattern:

- Controllers never access data directly.
- Controllers call application/domain services only.
- Services receive tenant context and actor context.
- Services call tenant-aware repositories for tenant-owned records.
- Repositories require tenant context for all tenant-owned data access.
- Permission guards run before service execution for protected routes.
- Domain services re-check resource scope for sensitive operations.
- Background workers must use the same service and permission paths as request handlers.
- Reports, AI, automations, and jobs must not bypass the permission engine.
- Repository methods that access tenant-owned data must reject missing tenant context.

Acceptance criteria:

- No protected module can query tenant-owned data without tenant context.
- No sensitive module can execute without permission guard and service-level scope validation.
- Permission drift review is required before Milestone 1 exits.
- Background job, report, AI, and automation code paths must be included in permission drift review.
- Direct database access from controllers is prohibited by architecture review.

### 43.3 Audit Log Tamper-Resistance And Redaction

Audit policy:

- Audit logs are append-only.
- No normal user can update or delete audit records.
- Audit correction requires a separate correction event, not overwrite.
- Audit access is restricted to Owner or explicitly granted security roles.
- Audit records must include actor, tenant, resource, action, permission result, outcome, timestamp, and session/device where available.
- Audit exports require explicit permission and must create a separate audit event.
- Audit retention policy must be defined before production launch.
- Audit backup and restore must preserve integrity and event order.

Redaction rules:

- Sensitive payloads must be redacted.
- Audit logs must not store raw secrets.
- Audit logs must not store full payment data.
- Audit logs must not store unnecessary file content.
- AI prompts containing sensitive content must not be stored unless governed by the approved AI retention policy.
- Chat, voice, transcript, and file references should be stored as scoped references rather than raw content unless the audit policy explicitly requires content capture.
- Financial values in audit logs should be minimized to action/result metadata unless full value capture is required and permission-protected.

Acceptance criteria:

- Unauthorized audit update/delete attempts fail.
- Audit correction creates a new event.
- Sensitive audit records are redacted.
- Audit export requires permission and logs export.
- Restore drill preserves audit records.

### 43.4 Realtime Session Revocation And Authorization Behavior

Realtime rules:

- WebSocket/realtime connections must authenticate a valid session.
- Channel subscriptions must validate tenant, role, permission, and membership.
- On session revocation, realtime connection should be disconnected where supported.
- If immediate disconnect is not supported, maximum token/session TTL must limit exposure.
- Channel membership changes must invalidate or revalidate active subscriptions.
- Client chat and internal chat must use separate channel scopes.
- Realtime events must contain minimal payloads.
- Sensitive realtime events should send references, not full sensitive data.
- Unauthorized subscription attempts must be denied and logged where sensitive.
- Realtime delivery must not be treated as proof of permission for later API fetches.

Acceptance criteria:

- Revoked sessions cannot continue receiving sensitive realtime events beyond the accepted TTL.
- Removed channel members stop receiving channel events.
- Clients cannot subscribe to internal channels.
- Realtime event payloads do not include unnecessary sensitive content.

### 43.5 AI Transcription Quality And Provider Evaluation

AI/voice risk controls:

- Arabic and German transcription quality must be evaluated before MVP launch.
- Provider must be tested with Arabic, English, German, and mixed-language voice samples.
- Low-confidence transcripts must be marked and require human review.
- Voice-to-task must never create a task without human confirmation.
- Transcript retention must follow AI/voice retention policy.
- Provider retention and training policy must be approved before use.
- Transcription failures must preserve original audio and allow manual transcript entry.
- Sensitive voice/transcript access must follow project, task, channel, client, and tenant permissions.

Provider evaluation criteria:

| Criterion | Required Evaluation |
|---|---|
| Arabic accuracy | Test agency-style Arabic samples, including dialect and formal Arabic where expected |
| German accuracy | Test German client/project/task vocabulary |
| English accuracy | Test baseline English project and task notes |
| Mixed-language handling | Test Arabic/English/German switching in one note |
| Speaker clarity tolerance | Test noisy, accented, and mobile-recorded samples |
| Data retention terms | Provider retention must align with MAOS retention policy |
| No unauthorized training | Provider must not train on tenant data without explicit authorization |
| Region/data processing terms | Processing region and subprocessor terms must be reviewed |
| Cost per minute | Cost must fit MVP pilot budget |
| Latency | Processing time must fit user expectations for task drafting |
| Failure handling | Failed transcription must expose safe retry/manual entry path |

Acceptance criteria:

- Arabic, English, German, and mixed-language test samples pass agreed MVP quality threshold.
- Low-confidence output is clearly marked.
- Task creation requires human confirmation.
- Provider retention/training terms are approved before production use.

### 43.6 MVP System Automation Idempotency And Loop Prevention

MVP automation controls:

- System-defined automations must have idempotency keys where duplicate execution is possible.
- Notification automations must avoid duplicate spam.
- Reminder automations must have rate limits.
- Status-event automations must prevent self-triggered loops.
- Finance notification automations must not expose financial details to unauthorized users.
- Client-facing automations must be client-safe.
- Automation events must include tenant and actor context.
- Failed sensitive automation runs must be logged.
- MVP automations cannot perform destructive actions automatically.
- Full workflow builder remains post-MVP.

Acceptance criteria:

- Duplicate notification jobs do not spam users.
- Reminder automations respect rate limits.
- Status automation cannot trigger itself indefinitely.
- Finance/client notifications pass permission-safe content tests.

### 43.7 Job Retry, Dead-Letter, And Provider Failure Contract

Job contract:

| Control | Requirement |
|---|---|
| Retry policy | Defined per job type |
| Retry limit | Required for every queued job type |
| Backoff strategy | Exponential or provider-appropriate backoff for transient failures |
| Dead-letter state | Job enters dead-letter state after retry exhaustion |
| Admin/operator visibility | Failed and dead-letter jobs visible to authorized operators |
| Sensitive failure redaction | Job errors must redact secrets, payment data, client confidential data, and raw AI content where required |
| Idempotency key | Required for jobs that create records, update finance state, send notifications, or call external providers |
| Tenant and actor context | Preserved in every job payload or securely resolvable job context |
| Permission revalidation | Required before sensitive job execution |
| User-facing failure state | Required where user action depends on job outcome |
| No silent failure | Finance, client-facing, AI, report, and file jobs must not fail silently |

External provider failure handling:

| Provider | Failure Handling |
|---|---|
| AI provider | Mark AI job failed or retryable; preserve user-facing draft state; do not create final action automatically |
| Transcription provider | Preserve original audio; allow retry or manual transcript entry; mark low/no transcript clearly |
| Email provider | Retry with limit; show delivery failure to authorized admin/operator; do not leak message content in error |
| Storage provider | Fail upload/download safely; do not create completed file metadata without stored object confirmation |
| Payment provider if used | Treat failure as pending/failed; never mark paid without confirmed provider result; audit status changes |

Acceptance criteria:

- Every MVP job type has retry limit, backoff, idempotency decision, and failure visibility.
- Dead-letter jobs are visible to authorized operators.
- Sensitive job errors are redacted.
- Permission revalidation occurs before sensitive job execution.

### 43.8 MVP Hotfix Path

Hotfix rules:

| Hotfix Area | Requirement |
|---|---|
| Hotfix classification | Security, finance, client portal, AI, data loss, availability, report privacy, file access, payment, operational defect |
| Hotfix approval owner | Release Manager plus CTO; Security Architect required for security/client/finance/AI/privacy hotfix |
| Security hotfix path | Immediate triage, exploit containment, targeted fix, security regression, production approval, post-hotfix audit |
| Finance hotfix path | Owner/Finance approval, finance access regression, payment/invoice audit validation, communication if client-impacting |
| Client portal hotfix path | Client-safe visibility regression and cross-client denial tests before deploy |
| AI hotfix path | Prompt injection/leakage regression and provider behavior validation before deploy |
| Rollback requirement | Every hotfix must define rollback trigger and validation |
| Minimal test requirement | Targeted test, affected permission test, smoke test, rollback check |
| Production approval gate | Release Manager and CTO approval; Security approval when sensitive |
| Post-hotfix audit | Hotfix deployment and approval must be logged |
| Communication requirement | Internal communication required; client communication required if client-impacting |
| Known issue registration | Required if issue remains partially unresolved |
| Incident link | Required if hotfix addresses an incident |

Acceptance criteria:

- No hotfix deploys without classification, approver, minimum tests, rollback plan, and audit.
- Sensitive hotfixes require Security Architect review.
- Client-impacting hotfixes include communication plan.

### 43.9 Additional Technical Risks And Mitigations

| Risk | Severity | Impact | Mitigation | Owner | Required Validation |
|---|---|---|---|---|---|
| Audit log tampering | Critical | Loss of trust and compliance evidence | Append-only policy, correction events, restricted access | Security Architect | Tamper attempt test |
| Audit log sensitive payload leakage | Critical | Secrets, finance, AI, or client confidential data exposed | Redaction rules and audit schema review | Security Architect | Sensitive audit redaction test |
| RLS/tenant hardening gap | Critical | Sensitive table exposure if app-layer check fails | Targeted RLS/equivalent controls for sensitive tables where practical | Database Architect | Sensitive table cross-tenant denial test |
| Application-only tenant isolation failure | Critical | Cross-tenant data breach | Tenant-aware repositories, guard pattern, tests | Principal Software Architect | Cross-tenant test suite |
| Arabic/German transcription quality failure | High | Voice-to-task unusable or wrong task drafts | Provider evaluation and low-confidence review | AI Systems Architect | Multilingual transcription benchmark |
| AI provider retention mismatch | Critical | Provider stores/trains on unauthorized data | Provider policy review and abstraction | AI Systems Architect / Security Architect | Provider terms approval |
| Realtime stale authorization | High | Revoked/removed users receive events | Disconnect/revalidate subscriptions and TTL limit | Principal Software Architect | Revocation realtime test |
| Job duplicate execution | High | Duplicate notifications, files, invoices, or records | Idempotency keys and duplicate checks | Backend Lead | Duplicate job test |
| Dead-letter invisibility | High | Failed sensitive workflows unnoticed | Operator dead-letter dashboard/report | DevOps Architect | Dead-letter visibility test |
| Hotfix without enough testing | High | Production regression or security bypass | Hotfix path with minimum tests and approval | Release Manager | Hotfix dry-run |
| Payment provider country/currency mismatch | High | Inability to process pilot billing | Provider selection by pilot countries/currencies | Finance Owner | Provider capability review |
| Report export accidentally enabled too early | High | Sensitive data export leakage | Default defer/export feature flag and approval gate | Product Strategy Lead / Security Architect | Export disabled/permission test |

### 43.10 MVP Technical Control Matrix

| Control Area | Risk Addressed | Technical Control | Required Test | Owner | Milestone Gate |
|---|---|---|---|---|---|
| Tenant isolation | Cross-tenant data leakage | Tenant resolver, tenant-aware repositories, tenant context in jobs/files/reports/AI | Cross-tenant denial tests | Principal Software Architect | Milestone 1 |
| Sensitive-table hardening | App-layer tenant filter failure | Targeted RLS/equivalent controls where practical and restricted database access | Sensitive table access tests | Database Architect | Milestone 1 |
| Authorization guards | Permission bypass | Route guards plus service-level resource scope validation | RBAC/resource-scope tests | Security Architect | Milestone 1 |
| Audit tamper-resistance | Audit record overwrite/delete | Append-only policy and correction events | Tamper attempt test | Security Architect | Before client portal/finance |
| Audit redaction | Sensitive payload exposure | Redaction rules for secrets, payment, AI, file/chat/voice content | Sensitive audit payload test | Security Architect | Before production |
| Client portal boundary | Internal/client data leakage | Client portal APIs, client-visible flags, own-client scope | Client-safe/cross-client tests | Product Lead / Security Architect | Milestone 4 |
| Owner-only finance | Financial exposure | Finance permission guard and Owner-only default | Owner/non-owner finance tests | Finance Owner / Security Architect | Milestone 8 |
| Signed URL security | Unauthorized file access | Permission check before short-lived signed URL generation | File URL access tests | Backend Lead | Milestone 6 |
| Realtime session revocation | Revoked session receives events | Disconnect/revalidate subscriptions and TTL limit | Realtime revocation test | Principal Software Architect | Milestone 6 |
| Voice/transcription quality | Poor Arabic/German task extraction | Provider benchmark and low-confidence human review | Multilingual voice sample tests | AI Systems Architect | Milestone 7 |
| AI permission gateway | AI hidden data leakage | Permission-filtered resolver, redaction, prompt injection guard | AI leakage/prompt injection tests | AI Systems Architect / Security Architect | Milestone 7 |
| MVP automation idempotency | Duplicate spam/loops | Idempotency keys, rate limits, loop prevention | Duplicate/reminder/loop tests | Backend Lead | Before MVP automations |
| Job dead-letter handling | Silent failed workflows | Retry limits, dead-letter state, operator visibility | Failed job/dead-letter tests | DevOps Architect | Before AI/reports/files jobs |
| Report hidden count/total suppression | Report data leakage | Permission-safe query layer and suppression rules | Report privacy tests | Reporting Lead / Security Architect | Milestone 9 |
| Hotfix governance | Unsafe production fixes | Classification, approval, minimal tests, rollback, audit | Hotfix dry-run | Release Manager | Before production |
| Backup/restore validation | Data loss | Scheduled backups and restore drills | Restore drill | DevOps Architect / Database Architect | Before launch |

**Final Phase 14 Statement:** MAOS should be implemented as a secure modular SaaS MVP using a pragmatic TypeScript web stack, PostgreSQL, object storage, background jobs, realtime updates, and centralized permission/audit controls. The MVP must prioritize tenant isolation, invite-only access, client-safe data boundaries, Owner-only finance, basic project/task/client workflows, basic CRM, files/chat/approvals, limited AI, and basic reports. Advanced automation, AI analytics, payroll automation, BI forecasting, marketplace, mobile apps, and enterprise isolation should be added only after the MVP workflows and data quality are validated.
