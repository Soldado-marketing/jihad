# MAOS Phase 15 Product Backlog & Sprint Plan

## Product Backlog & Sprint Plan Document

**Platform:** Marketing Agency Operating System (MAOS)  
**Document Version:** Phase 15 v1.0  
**Planning Basis:** Approved Master Specification v1.0, approved Phase 13 MVP Roadmap, approved Phase 14 Technical Implementation Architecture  
**Document Type:** Planning specification only  
**Code Status:** No code, no SQL, no migrations, no implementation scripts  

---

## Source Documents

| Source | Usage |
|---|---|
| MAOS_MASTER_SPECIFICATION_v1.0.md | Source of truth for product scope, roles, permissions, critical rules, workflows, data objects, dashboards, and release principles |
| MAOS_MVP_ROADMAP_IMPLEMENTATION_PLAN_PHASE_13.md | Primary source for MVP boundary, milestones, epics, MVP exclusions, assumptions, risks, acceptance criteria, and launch gates |
| MAOS_TECHNICAL_IMPLEMENTATION_ARCHITECTURE_PHASE_14.md | Primary source for technical stack, architecture boundaries, tenant isolation, authorization, audit logging, deployment, jobs, realtime, AI, and hardening controls |
| Phase 1-12 documents | Detail reference only when deeper domain rules are needed |

---

## 1. Backlog Strategy

The MAOS MVP backlog converts the approved roadmap into implementation-ready work while preserving strict scope control. The backlog prioritizes client-facing delivery value, permission-safe access, auditability, and realistic engineering sequence.

Backlog strategy:

- Build the permission, tenant, session, and audit foundation before any sensitive module.
- Build manual workflows before automation-heavy workflows.
- Build projects, tasks, files, approvals, and chat before basic AI.
- Build finance only after clients, projects, Owner-only permissions, and audit logging exist.
- Build reports only after enough reliable data-producing modules exist.
- Keep full automation builder, full payroll automation, advanced BI forecasting, white-label customization, and full mobile app outside MVP.
- Include QA, security, and release governance work in every sprint.
- Treat every client-facing, finance, AI, reporting, file, and realtime feature as permission-sensitive.

Primary MVP outcome:

MAOS MVP should allow a small to mid-sized marketing agency to invite internal users and clients, manage projects/tasks/subtasks, communicate, share versioned files, collect basic approvals, use voice notes and basic voice-to-task drafts, manage a basic CRM pipeline, create basic invoices and partial payment records, and view basic role-safe dashboards and reports.

---

## 2. Backlog Structure

Backlog hierarchy:

| Level | Description | Example |
|---|---|---|
| Epic | Business capability grouped by MVP module | E1 Identity and Tenant Foundation |
| Feature | Product capability inside an epic | Invite-only user onboarding |
| User story | Role-based implementation unit with acceptance criteria | Owner invites user |
| Technical task | Engineering task needed to support stories | Tenant-aware repository baseline |
| QA task | Test planning, test execution, evidence capture | Cross-tenant permission tests |
| Security task | Security validation or control implementation | Owner-only finance denial tests |
| UX/UI task | User experience and interface design task | Workspace navigation states |
| Data task | Data model, indexes, constraints, seed data, migration planning | Tenant-owned table design |
| DevOps task | Environments, CI/CD, monitoring, backup, release support | Staging deployment pipeline |
| Release task | UAT, release candidate, rollback, launch readiness | MVP go/no-go checklist |

Backlog status model:

| Status | Meaning |
|---|---|
| Backlog | Captured and not yet selected for sprint |
| Ready | Meets Definition of Ready |
| In Sprint | Selected for active sprint |
| In Progress | Work started |
| In Review | Awaiting product, QA, security, or code review |
| QA | Under test execution |
| Blocked | Cannot proceed due to dependency or decision |
| Done | Meets Definition of Done |
| Deferred | Explicitly moved outside MVP or later release |

---

## 3. Epic Breakdown

| Epic ID | Epic | MVP Goal | Primary Milestone(s) | Risk Level |
|---|---|---|---|---|
| E1 | Identity and Tenant Foundation | Invite-only tenant access, users, roles, permissions, sessions, audit foundation | M0, M1 | Critical |
| E2 | Workspace Shell and Navigation | Role-aware workspace shell, navigation, localization, responsive layout | M2 | Medium |
| E3 | Project Delivery Core | Projects, tasks, subtasks, assignments, status tracking, basic dependencies | M3 | High |
| E4 | Client Portal Core | Client-safe project visibility, approvals, files, chat entry points, invoice visibility | M4 | Critical |
| E5 | CRM Basic | Leads, opportunities, meetings, follow-ups, pipeline stages | M5 | Medium |
| E6 | Collaboration Core | Internal/client chat, files, file versioning, basic approvals, notifications | M6, M7 | High |
| E7 | Voice and Basic AI | Voice notes, transcription, voice-to-task draft, human confirmation | M7 | High |
| E8 | Finance Basic | Owner-only invoices, partial payments, basic revenue tracking | M8 | Critical |
| E9 | Dashboards and Reports Basic | Basic role-safe dashboards and reports with suppression rules | M9 | High |
| E10 | QA and Release Governance | Testing, UAT, security hardening, release candidate, launch readiness | M10, M11 | Critical |

---

## 4. Feature Breakdown

| Epic | MVP Features | Explicitly Deferred |
|---|---|---|
| E1 | Tenant setup, invite-only access, users, roles, sessions, devices, login history, RBAC, custom permission foundation, audit foundation | Public registration, SSO marketplace, advanced policy builder |
| E2 | Internal workspace shell, role-aware navigation, basic settings, RTL/LTR support, responsive web | Full mobile app, advanced personalization, white-label customization |
| E3 | Projects, tasks, subtasks, assignment, due dates, priorities, statuses, comments, basic dependencies | Complex recurring projects, advanced workload optimizer, automation builder |
| E4 | Client dashboard, client project page, client-safe files, approvals, client chat, own invoice/payment visibility | Advanced portal customization, client self-registration, cross-client benchmarking |
| E5 | Leads, opportunities, meetings, follow-ups, pipeline board, basic CRM dashboard | Advanced forecasting, advanced proposal builder, integrations marketplace |
| E6 | Internal chat, client chat, file uploads, file versions, file visibility, basic approval workflow, notifications | Advanced revision studio, file previews if not needed for pilot, advanced approval routing |
| E7 | Voice note upload, transcription job, transcript review, voice-to-task draft, human approval | AI Analyst, AI financial analytics, autonomous AI actions |
| E8 | Basic invoice creation, invoice status, partial payment records, basic revenue dashboard, Owner-only visibility | Full payroll automation, advanced wallet, refunds, credit notes, profitability analytics |
| E9 | Owner/manager/employee/client dashboards, basic project/task/CRM/invoice reports, suppression rules | Advanced BI forecasting, anomaly detection, data warehouse |
| E10 | Test plans, QA evidence, UAT, security tests, release gates, rollback plan, monitoring readiness | Long-term enterprise release train automation |

---

## 5. User Story Breakdown

User stories are defined inside each epic section with:

- Story ID
- User role
- User story
- Priority
- Dependencies
- Acceptance criteria
- Negative test case
- Permission rule
- Audit/log requirement
- QA requirement
- Estimated size
- Suggested sprint
- Status

Story size scale:

| Size | Meaning |
|---|---|
| XS | Very small, low uncertainty |
| S | Small, focused story |
| M | Normal implementation story |
| L | Larger story with multiple states or integrations |
| XL | Too large unless split; used only for tightly governed sprint planning |

---

## 6. Technical Task Breakdown

Technical task categories:

| Category | Required MVP Tasks |
|---|---|
| Architecture | ADRs, module boundaries, REST-first standards, tenant context propagation, service/repository pattern |
| Frontend | Next.js app shell, role-aware routing, shadcn/ui or equivalent components, Tailwind design tokens, RTL/LTR support |
| Backend | NestJS modules, validation layer, permission guards, tenant resolver, audit service, domain services |
| Database | PostgreSQL schema planning, tenant_id policy, relationships, constraints, indexes, sensitive-table hardening baseline |
| Storage | S3-compatible storage, signed URL policy, metadata, file version records, malware scan decision |
| Realtime | WebSocket or managed realtime decision, channel authorization, revocation behavior |
| Jobs | Redis/BullMQ or equivalent setup, retry/dead-letter contract, job context propagation |
| AI | Provider abstraction, transcription provider selection, AI gateway, permission-filtered retrieval, human approval gates |
| Reporting | Permission-safe query layer, hidden count/total suppression, basic report definitions |
| DevOps | Docker deployment, staging/production environments, CI/CD gates, secrets, monitoring, backups |

---

## 7. QA Task Breakdown

QA task categories:

| Category | Required MVP QA Tasks |
|---|---|
| Test planning | Sprint test plans, traceability from story acceptance criteria to test evidence |
| Functional tests | Happy path, negative path, edge cases per module |
| Permission tests | Owner, Manager, Employee, Client role matrix tests |
| Tenant tests | Cross-tenant denial, tenant context in jobs/realtime/reports/AI |
| Client visibility tests | Own-client-only access, client-visible flags, internal data exclusion |
| Finance tests | Owner-only finance, explicit denial, client own invoice/payment visibility |
| AI tests | Permission enforcement, prompt injection, source reference, human confirmation |
| Realtime tests | Subscription authorization, revoked session behavior, channel membership changes |
| File tests | Signed URL permission, version access, visibility, share revocation |
| Reporting tests | Hidden count/total suppression, role-safe dashboard access |
| Release tests | Regression, smoke, UAT evidence, rollback dry-run |

---

## 8. UX/UI Task Breakdown

UX/UI task categories:

| Category | Required MVP UX/UI Tasks |
|---|---|
| Design system | Design tokens, component inventory, form patterns, table/list states, empty/loading/error states |
| Workspace shell | Sidebar, top bar, command/search entry, user/account menu, role-aware navigation |
| RTL/LTR | Arabic RTL layouts, English/German LTR layouts, mixed-language behavior |
| Project/task UI | Project list, project detail, task board/list, task detail, subtask panel |
| Client portal UI | Client dashboard, client project page, approvals, files, client chat, invoice view |
| CRM UI | Pipeline board, lead detail, opportunity detail, meeting/follow-up views |
| Collaboration UI | Chat channels, file library, file version history, approval center |
| Voice/AI UI | Voice recorder/upload, transcript review, AI task draft confirmation |
| Finance UI | Owner finance center, invoice detail, payment status, basic revenue dashboard |
| Reporting UI | Dashboard widgets, report tables, filters, permission-safe empty/denied states |

---

## 9. DevOps Task Breakdown

DevOps task categories:

| Category | Required MVP DevOps Tasks |
|---|---|
| Repository setup | Monorepo or app structure decision, lint/format/test standards, branch policy |
| Environments | Local/dev, QA, staging, UAT, production, sandbox/demo tenant strategy |
| Containers | Docker-based local and deployable services |
| CI/CD | Build, test, security scan, deploy gates, rollback path |
| Secrets | Environment secrets management and rotation policy |
| Observability | App logs, worker logs, frontend errors, uptime checks, queue monitoring |
| Backup | PostgreSQL backup, object storage backup/versioning, restore drill |
| Release | Release candidate deployment, smoke tests, go/no-go evidence |

---

## 10. Security Task Breakdown

Security task categories:

| Category | Required MVP Security Tasks |
|---|---|
| Access control | Invite-only access, no public registration, RBAC, custom permission foundation |
| Tenant isolation | Tenant resolver, tenant context propagation, tenant-aware repositories |
| Sensitive hardening | Targeted sensitive-table database-level controls where practical |
| Audit | Append-only policy, sensitive redaction, audit access restriction |
| Client boundary | Client portal APIs, client-visible flags, internal data exclusion |
| Finance | Owner-only finance, client own invoice/payment visibility |
| File security | Signed URLs, short TTL, permission check before URL generation |
| Realtime security | Session auth, channel authorization, revocation behavior |
| AI safety | Prompt injection protection, permission-filtered AI gateway, no autonomous final actions |
| Reporting privacy | Hidden count/total suppression, role-safe reports |

---

## 11. Data/Database Task Breakdown

Data task categories:

| Category | Required MVP Data Tasks |
|---|---|
| Core identity | tenants, memberships, users, invitations, roles, permissions, permission grants |
| Security | sessions, devices, login history, audit logs |
| Projects | clients, projects, tasks, subtasks, task dependencies, task comments |
| CRM | leads, opportunities, meetings, follow-ups, pipeline stages |
| Collaboration | channels, chat messages, files, file versions, file shares, approvals |
| Voice/AI | voice notes, transcripts, AI logs, AI task drafts |
| Finance | invoices, invoice line items, payment records, partial payments, revenue records |
| Reporting | dashboard definitions, report definitions, report access logs |
| Jobs | job records or queue metadata where needed for observability and dead-letter tracking |

Data rules:

- Every tenant-owned table must include `tenant_id` or approved tenant scope equivalent.
- Tenant-owned data access must use tenant-aware repository/service patterns.
- Sensitive records must be considered for targeted RLS or equivalent controls where practical.
- Finance records are Owner-only by default.
- Client-visible records require explicit client scope and publication state.

---

## 12. AI Task Breakdown

MVP AI scope is limited to voice-to-task basic workflow.

AI tasks:

| Area | MVP Tasks |
|---|---|
| Provider abstraction | Select AI/transcription provider after Arabic, English, German, and mixed-language evaluation |
| AI gateway | Centralize AI calls behind permission-filtered gateway |
| Transcription | Store original voice note, transcript, confidence, language, failure state |
| Voice-to-task draft | Extract task title, description, due date, priority, assignee suggestion, project/client suggestion |
| Human approval | Require user confirmation before saving any AI-generated task |
| Prompt injection | Treat retrieved content, transcript text, and user prompts as untrusted input |
| AI logging | Log prompt metadata, source references, permission result, output type, approval result |
| QA | Test permission leakage, prompt injection, hallucination, low-confidence transcript behavior |

Out of MVP:

- AI Analyst.
- AI financial analytics.
- Autonomous AI actions.
- AI-generated final reports.
- Cross-module AI recommendations beyond voice-to-task draft assistance.

---

## 13. Release Task Breakdown

Release tasks:

| Release Area | Required Tasks |
|---|---|
| Sprint release | Sprint review, demo, QA evidence, regression notes |
| Release candidate | Full MVP regression, UAT, security, rollback validation, monitoring readiness |
| Launch | Production smoke test, support readiness, incident response path, known issues register |
| Hotfix | Classification, owner approval, targeted tests, rollback plan, post-hotfix audit |
| Rollback | Rollback decision trigger, rollback owner, data safety check, communication |

---

## 14. Sprint Planning Model

Sprint assumptions:

- Sprint length: 1-2 weeks depending on team capacity.
- Sprint team: product owner, technical lead, frontend engineer, backend engineer, QA lead, designer, DevOps/security support.
- Every sprint includes product, engineering, QA, security, and demo work.
- Sprint scope is locked after sprint planning unless a critical defect or approved change control occurs.
- Each sprint must produce reviewable evidence, not only implementation notes.

Sprint cadence:

| Event | Purpose |
|---|---|
| Backlog refinement | Confirm story readiness, dependencies, size, and risks |
| Sprint planning | Select stories that meet Definition of Ready |
| Daily execution | Resolve blockers and dependency risks |
| Mid-sprint QA/security check | Catch permission, data, or client visibility issues early |
| Sprint review | Demo completed work against acceptance criteria |
| Sprint retrospective | Improve process, quality, and scope control |

---

## 15. Sprint 0 Plan

### Sprint 0: Setup & Architecture Readiness

| Field | Plan |
|---|---|
| Sprint goal | Establish project structure, technical standards, environments, decisions, and release governance foundations |
| Included milestone(s) | Milestone 0 |
| Included epics | E1, E10 |
| User stories | E1-US01, E10-US01 |
| Technical tasks | Repository structure, ADR templates, module boundary decisions, REST standards, tenant context pattern, audit event standards |
| QA tasks | Initial test strategy, evidence model, traceability template, baseline smoke checklist |
| Security tasks | Security baseline, tenant isolation decision review, audit redaction policy draft |
| UX/UI tasks | Design system baseline, workspace shell wireframe review, component inventory |
| DevOps tasks | Docker baseline, CI skeleton, staging strategy, secrets strategy, monitoring decision, backup/restore approach |
| Dependencies | Approved Phase 13 and Phase 14 |
| Risks | Architecture drift, unresolved vendor decisions, weak release gates |
| Exit criteria | Stack decisions assigned, repo standards approved, CI baseline exists, environment plan approved, open technical decisions have owners/deadlines |
| Demo outcome | Architecture readiness walkthrough and release governance checklist |

---

## 16. Sprint 1 Plan

### Sprint 1: Identity, Tenants, Permissions, Audit Foundation

| Field | Plan |
|---|---|
| Sprint goal | Build invite-only access foundation with tenant context, roles, sessions, permissions, and audit logging |
| Included milestone(s) | Milestone 1 |
| Included epics | E1, E10 |
| User stories | E1-US01, E1-US02, E1-US03, E1-US04, E1-US05 |
| Technical tasks | Tenant resolver, user/membership services, invitation flow, session/device model, RBAC guard, audit service |
| QA tasks | Invite flow tests, login/session tests, role matrix tests, audit evidence tests |
| Security tasks | No public registration tests, cross-tenant denial tests, permission drift review, audit tamper/redaction validation |
| UX/UI tasks | Login, invite acceptance, basic account setup, denied-state screens |
| DevOps tasks | Auth secrets, staging auth config, audit log observability |
| Dependencies | Sprint 0 decisions |
| Risks | Tenant leakage, permission bypass, missing audit events |
| Exit criteria | Owner/Manager/Employee/Client role tests pass; no public registration; tenant context present in protected paths; audit events generated |
| Demo outcome | Owner invites users and role-based access is enforced |

---

## 17. Sprint 2 Plan

### Sprint 2: Workspace Shell, Roles UI, Basic Navigation

| Field | Plan |
|---|---|
| Sprint goal | Deliver role-aware workspace shell and navigation for internal users and clients |
| Included milestone(s) | Milestone 2 |
| Included epics | E2, E10 |
| User stories | E2-US01, E2-US02, E2-US03, E2-US04 |
| Technical tasks | Next.js shell, role-aware routing, layout state, localization structure, permission-aware navigation |
| QA tasks | Navigation tests by role, denied route tests, RTL/LTR layout checks |
| Security tasks | Unauthorized route handling, client route separation, session expiry handling |
| UX/UI tasks | Sidebar, topbar, settings entry, empty/loading/error states, Arabic RTL and English/German LTR checks |
| DevOps tasks | Frontend build pipeline, frontend error tracking |
| Dependencies | Sprint 1 |
| Risks | Exposing hidden navigation, poor RTL readiness |
| Exit criteria | Role-specific navigation works; denied routes do not leak names/counts; basic responsive layouts pass |
| Demo outcome | Internal workspace shell and safe role navigation |

---

## 18. Sprint 3 Plan

### Sprint 3: Projects, Tasks, Subtasks Core

| Field | Plan |
|---|---|
| Sprint goal | Deliver project delivery core for internal teams |
| Included milestone(s) | Milestone 3 |
| Included epics | E3, E10 |
| User stories | E3-US01, E3-US02, E3-US03, E3-US04, E3-US05 |
| Technical tasks | Project service, task service, subtask service, assignment, status, priority, due date, basic dependency model |
| QA tasks | Project/task CRUD tests, assignment tests, status transition tests, own/assigned visibility tests |
| Security tasks | Manager assigned-scope tests, employee own/assigned tests, client denial tests |
| UX/UI tasks | Project list, project detail, task board/list, task detail, subtask panel |
| DevOps tasks | Database backup check after core data model |
| Dependencies | Sprint 1, Sprint 2 |
| Risks | Scope creep into advanced workload automation, weak permission scoping |
| Exit criteria | Internal users can create and manage projects/tasks according to role; unauthorized users are denied |
| Demo outcome | Manager assigns tasks and employees update assigned work |

---

## 19. Sprint 4 Plan

### Sprint 4: Client Portal Foundation

| Field | Plan |
|---|---|
| Sprint goal | Build client-safe portal foundation without exposing internal workspace data |
| Included milestone(s) | Milestone 4 |
| Included epics | E4, E10 |
| User stories | E4-US01, E4-US02, E4-US03, E4-US04 |
| Technical tasks | Client portal routing, client membership scope, client-visible project data, client-safe resource resolver |
| QA tasks | Own-client-only tests, hidden internal data tests, cross-client denial tests |
| Security tasks | Client boundary validation, internal notes/chat/payroll/finance exclusion tests |
| UX/UI tasks | Client dashboard, client project page, approval entry, file/chat placeholders |
| DevOps tasks | Client portal monitoring route checks |
| Dependencies | Sprint 1, Sprint 2, Sprint 3 |
| Risks | Client data leakage, hidden internal data exposure |
| Exit criteria | Clients see only own client-visible project data; cross-client and internal data access denied |
| Demo outcome | Client logs in and views a safe project page |

---

## 20. Sprint 5 Plan

### Sprint 5: CRM Basic + Collaboration Foundation

| Field | Plan |
|---|---|
| Sprint goal | Deliver basic CRM pipeline and collaboration foundations |
| Included milestone(s) | Milestone 5, start of Milestone 6 |
| Included epics | E5, E6, E10 |
| User stories | E5-US01, E5-US02, E5-US03, E5-US04, E6-US01 |
| Technical tasks | Leads, opportunities, pipeline stages, meetings, follow-ups, collaboration channel model |
| QA tasks | CRM pipeline tests, follow-up tests, manager/owner visibility tests, channel membership baseline tests |
| Security tasks | CRM scope tests, client denial for internal CRM, audit logging for sensitive CRM changes |
| UX/UI tasks | CRM board, lead detail, opportunity detail, meeting/follow-up views, collaboration entry points |
| DevOps tasks | Basic notification/event observability |
| Dependencies | Sprint 1, Sprint 2 |
| Risks | CRM and collaboration collision, incomplete audit for sales changes |
| Exit criteria | Basic CRM pipeline is usable and collaboration channel permissions are prepared |
| Demo outcome | Owner/Manager manages a lead through pipeline stages |

---

## 21. Sprint 6 Plan

### Sprint 6: Files, File Versioning, Approvals

| Field | Plan |
|---|---|
| Sprint goal | Deliver permission-safe file upload, file versioning, and basic approval workflow |
| Included milestone(s) | Milestone 6 |
| Included epics | E4, E6, E10 |
| User stories | E6-US02, E6-US03, E6-US04, E6-US05, E4-US05 |
| Technical tasks | S3-compatible storage integration, signed URL service, file metadata, file versions, approval records, visibility rules |
| QA tasks | File upload/download tests, signed URL denial tests, version history tests, approval tests |
| Security tasks | Short-lived signed URL validation, permission check before URL generation, client-visible file tests |
| UX/UI tasks | File library, file detail, version history, approval center, client approval state |
| DevOps tasks | Object storage config, malware scanning decision gate, storage backup/versioning plan |
| Dependencies | Sprint 3, Sprint 4 |
| Risks | Signed URL leakage, wrong file version visibility, client access to internal files |
| Exit criteria | Users can upload versions and request/record approvals with permission-safe access |
| Demo outcome | Client approves a client-visible file version |

---

## 22. Sprint 7 Plan

### Sprint 7: Chat + Notifications + Realtime

| Field | Plan |
|---|---|
| Sprint goal | Deliver internal chat, client chat, notifications, and realtime update foundation |
| Included milestone(s) | Milestone 6 |
| Included epics | E6, E10 |
| User stories | E6-US06, E6-US07, E6-US08, E6-US09 |
| Technical tasks | Chat service, channel membership, realtime subscriptions, notification service, realtime revocation behavior |
| QA tasks | Internal/client chat separation tests, notification recipient tests, realtime subscription tests |
| Security tasks | Channel authorization, session revocation test, minimal realtime payload test |
| UX/UI tasks | Internal chat UI, client chat UI, notification center, unread states |
| DevOps tasks | Realtime provider setup or WebSocket deployment path, realtime monitoring |
| Dependencies | Sprint 1, Sprint 4, Sprint 6 |
| Risks | Unauthorized realtime subscriptions, cross-channel message leakage, duplicate notifications |
| Exit criteria | Internal and client chat are separated; revoked sessions stop receiving protected events where supported |
| Demo outcome | Internal and client messages flow only to authorized members |

---

## 23. Sprint 8 Plan

### Sprint 8: Voice Notes + Voice-To-Task Basic

| Field | Plan |
|---|---|
| Sprint goal | Deliver voice note capture, transcription, and AI-generated task draft with human approval |
| Included milestone(s) | Milestone 7 |
| Included epics | E7, E10 |
| User stories | E7-US01, E7-US02, E7-US03, E7-US04, E7-US05 |
| Technical tasks | Voice note storage, transcription job, provider abstraction, AI gateway, task draft extraction, approval-to-create flow |
| QA tasks | Voice upload tests, transcription failure tests, multilingual sample tests, AI draft confirmation tests |
| Security tasks | Prompt injection tests, AI permission tests, transcript permission tests, provider retention review |
| UX/UI tasks | Voice recorder/upload UI, transcript review, AI task draft confirmation UI, low-confidence warning |
| DevOps tasks | AI/transcription secrets, worker queue monitoring, provider failure alerts |
| Dependencies | Sprint 3, Sprint 6, Sprint 7 |
| Risks | Poor Arabic/German transcription, AI leakage, task creation without approval |
| Exit criteria | Voice-to-task only creates drafts; human confirmation required; permission and injection tests pass |
| Demo outcome | Employee records voice note and confirms AI-generated task draft |

---

## 24. Sprint 9 Plan

### Sprint 9: Finance Basic

| Field | Plan |
|---|---|
| Sprint goal | Deliver Owner-only basic invoices, partial payments, and revenue tracking |
| Included milestone(s) | Milestone 8 |
| Included epics | E8, E10 |
| User stories | E8-US01, E8-US02, E8-US03, E8-US04, E8-US05 |
| Technical tasks | Invoice service, invoice status, partial payment records, revenue records, client invoice visibility, audit events |
| QA tasks | Invoice lifecycle tests, partial payment tests, owner-only tests, client own invoice/payment tests |
| Security tasks | Manager/employee finance denial tests, client other-invoice denial tests, finance audit validation |
| UX/UI tasks | Owner finance center, invoice detail, partial payment view, client invoice view |
| DevOps tasks | Payment provider decision gate if payment integration is used; finance monitoring alerts |
| Dependencies | Sprint 1, Sprint 4, Sprint 5 |
| Risks | Financial data exposure, payment status errors, missing audit events |
| Exit criteria | Owner can manage basic invoices; clients see own approved invoices/payments only; finance audit logs pass |
| Demo outcome | Owner creates invoice and client sees permitted invoice/payment status |

---

## 25. Sprint 10 Plan

### Sprint 10: Dashboards & Reports Basic

| Field | Plan |
|---|---|
| Sprint goal | Deliver basic role-safe dashboards and reports |
| Included milestone(s) | Milestone 9 |
| Included epics | E9, E10 |
| User stories | E9-US01, E9-US02, E9-US03, E9-US04, E9-US05 |
| Technical tasks | Dashboard service, report service, permission-safe query layer, hidden count/total suppression, basic report access logs |
| QA tasks | Dashboard role tests, report privacy tests, hidden count/total suppression tests, finance report denial tests |
| Security tasks | No hidden aggregate leakage, client-safe report tests, Owner-only finance dashboard tests |
| UX/UI tasks | Owner dashboard, manager dashboard, employee dashboard, client dashboard, report list/detail |
| DevOps tasks | Report performance monitoring, dashboard error tracking |
| Dependencies | Sprint 3, Sprint 4, Sprint 5, Sprint 9 |
| Risks | Hidden count leakage, role data leakage, slow reports |
| Exit criteria | Basic dashboards and reports are role-safe and suppression tests pass |
| Demo outcome | Owner/Manager/Employee/Client each sees only allowed dashboard data |

---

## 26. Sprint 11 Plan

### Sprint 11: MVP QA, UAT, Security Hardening

| Field | Plan |
|---|---|
| Sprint goal | Execute full MVP regression, UAT, security hardening, and release readiness validation |
| Included milestone(s) | Milestone 10 |
| Included epics | E10 and all MVP epics |
| User stories | E10-US02, E10-US03, E10-US04, E10-US05 |
| Technical tasks | Defect fixes, hardening fixes, performance tuning, release candidate preparation |
| QA tasks | Full regression, UAT scripts, evidence capture, defect verification, accessibility and multilingual testing |
| Security tasks | Permission matrix regression, tenant isolation tests, AI safety tests, finance/client/report privacy tests |
| UX/UI tasks | UAT feedback review, critical usability fixes, RTL/LTR final pass |
| DevOps tasks | Staging release candidate, backup/restore drill, monitoring validation, rollback dry-run |
| Dependencies | Sprints 1-10 |
| Risks | Late security defects, UAT blockers, weak rollback readiness |
| Exit criteria | Critical defects closed, UAT evidence complete, security tests pass, rollback validated |
| Demo outcome | MVP candidate passes UAT and security review |

---

## 27. MVP Release Candidate Sprint

### Sprint 12: MVP Release Candidate

| Field | Plan |
|---|---|
| Sprint goal | Freeze MVP scope, stabilize release candidate, and validate launch readiness |
| Included milestone(s) | Milestone 10, Milestone 11 preparation |
| Included epics | E10 and release-critical fixes only |
| User stories | E10-US06, release defects only |
| Technical tasks | Release candidate hardening, configuration lock, critical defect fixes only |
| QA tasks | Smoke tests, regression delta, UAT sign-off validation, known issues review |
| Security tasks | Final permission tests, audit log validation, sensitive data checks |
| UX/UI tasks | Release blocker fixes only |
| DevOps tasks | Production deployment rehearsal, rollback rehearsal, monitoring alert test |
| Dependencies | Sprint 11 |
| Risks | Scope creep, unverified rollback, hidden production configuration gap |
| Exit criteria | Release candidate approved; no critical or high unapproved defects; rollback and monitoring verified |
| Demo outcome | Release candidate go/no-go review |

---

## 28. MVP Launch Sprint

### Sprint 13: MVP Launch

| Field | Plan |
|---|---|
| Sprint goal | Launch MVP to approved pilot tenant(s) with support, monitoring, and rollback readiness |
| Included milestone(s) | Milestone 11 |
| Included epics | E10 and operational launch tasks |
| User stories | E10-US07 |
| Technical tasks | Production rollout, launch configuration, post-launch monitoring checks |
| QA tasks | Production smoke tests, pilot validation checklist, launch evidence capture |
| Security tasks | Production access check, sensitive action audit check, incident response readiness |
| UX/UI tasks | Launch support review, pilot onboarding content review |
| DevOps tasks | Deployment, monitoring, backup verification, rollback standby |
| Dependencies | Sprint 12 release candidate approval |
| Risks | Launch incident, pilot workflow blocker, data visibility issue |
| Exit criteria | Pilot launch complete, smoke tests pass, monitoring active, support path live, rollback available |
| Demo outcome | Pilot tenant operational in production |

---

## 29. Milestone-To-Sprint Mapping

| Milestone | Name | Sprint(s) |
|---|---|---|
| M0 | Project Setup & Architecture Validation | Sprint 0 |
| M1 | Auth, Tenants, Roles, Permissions | Sprint 1 |
| M2 | Core Workspace UI | Sprint 2 |
| M3 | Projects, Tasks, Subtasks | Sprint 3 |
| M4 | Client Portal | Sprint 4 |
| M5 | CRM Basic | Sprint 5 |
| M6 | Collaboration, Chat, Files | Sprint 5, Sprint 6, Sprint 7 |
| M7 | Voice Notes & Voice-To-Task Basic | Sprint 8 |
| M8 | Finance Basic | Sprint 9 |
| M9 | Dashboards & Reports Basic | Sprint 10 |
| M10 | QA, UAT, Security Testing | Sprint 11, Sprint 12 |
| M11 | MVP Launch | Sprint 13 |

---

## 30. Dependency Map

| Dependency Rule | Backlog Enforcement |
|---|---|
| Permissions before client portal | E4 cannot start until E1 core permission and audit foundation pass |
| Audit before finance | E8 cannot start until audit service and finance audit event schema are validated |
| Projects/tasks before AI | E7 cannot start until E3 project/task/subtask foundation exists |
| Files before approvals | E6 file and version records must exist before client file approvals are complete |
| Voice notes before voice-to-task | E7 voice capture/storage precedes transcription and task draft extraction |
| Client/project data before finance | E8 invoices require client and project references |
| Data modules before reports | E9 starts after projects, CRM, client portal, and finance basic produce data |
| Manual workflows before automations | MVP uses system-defined notifications/reminders only |
| QA before launch | E10 gates Sprints 11-13 |
| No sensitive module before permission validation | E4, E6, E7, E8, E9 require permission regression tests |

---

## 31. Priority Model

Priority levels:

| Priority | Meaning | MVP Use |
|---|---|---|
| P0 | Launch blocker, security blocker, or core MVP path | Must be done before MVP launch |
| P1 | Important MVP capability but can degrade gracefully | Required unless explicitly deferred by change control |
| P2 | Useful but not launch-critical | Candidate for Version 1.1 |
| P3 | Later enhancement | Not MVP |

Prioritization scoring:

| Factor | Weight | Notes |
|---|---:|---|
| Client-facing value | High | Earlier delivery improves pilot validation |
| Security dependency | Critical | Must precede sensitive modules |
| Data dependency | High | Enables later workflows and reports |
| Operational value | Medium | Improves agency workflow adoption |
| Technical risk reduction | High | Architecture risks must be reduced early |
| Scope risk | Critical | Non-MVP scope must be controlled |

---

## 32. Story Estimation Model

| Size | Typical Criteria |
|---|---|
| XS | Text/UI state, small validation, small config change |
| S | Single-screen or single-service feature with low risk |
| M | Multi-state feature or normal API/UI story |
| L | Cross-module story, permission-sensitive flow, or background job |
| XL | Large flow requiring split unless explicitly accepted |

Sizing rules:

- Permission-sensitive stories cannot be smaller than S unless purely copy/UI.
- Client-facing stories require QA/security tasks in the estimate.
- Finance stories include Owner-only tests and audit validation in the estimate.
- AI stories include permission, prompt injection, provider failure, and human approval tests.
- Realtime stories include subscription and session revocation tests.

---

## 33. Definition of Ready

A story is ready only when:

- User role is defined.
- Business value is clear.
- Dependencies are identified.
- Acceptance criteria are testable.
- Negative test case is defined.
- Permission rule is defined.
- Audit/log requirement is defined for sensitive actions.
- UX/UI requirements or wireframe reference are available.
- Data objects are identified.
- QA requirement is defined.
- Security requirement is defined where relevant.
- Estimated size is assigned.
- Sprint target is proposed.
- Non-MVP expansion is excluded or explicitly deferred.

---

## 34. Definition of Done

A story is done only when:

- Functional acceptance criteria pass.
- Negative test case passes.
- Permission tests pass.
- Tenant/client scope tests pass where relevant.
- Audit/log requirements are validated.
- UX states are complete, including empty/loading/error/denied states.
- RTL/LTR impact is checked where user-facing.
- QA evidence is attached.
- Security review is complete for sensitive stories.
- No critical or high defect remains open unless approved by release exception.
- Documentation or release notes are updated where needed.
- Feature is demo-ready and rollback-safe.

---

## 35. QA Acceptance Mapping

| Epic | Required QA Acceptance |
|---|---|
| E1 | Invite-only, no public registration, session/device/login history, RBAC, audit evidence |
| E2 | Role navigation, unauthorized routes, RTL/LTR, responsive states |
| E3 | Project/task/subtask CRUD, assignment, status, own/assigned visibility |
| E4 | Client own-only access, client-visible flags, internal data exclusion |
| E5 | Lead/opportunity pipeline, meetings, follow-ups, role visibility |
| E6 | Chat separation, file versioning, signed URLs, approvals, notification recipient safety |
| E7 | Voice upload, transcription, low-confidence review, AI draft confirmation, prompt injection tests |
| E8 | Owner-only finance, client own invoice/payment visibility, partial payment audit |
| E9 | Dashboard permissions, hidden count/total suppression, report audit logs |
| E10 | Regression, UAT, security, rollback, monitoring, launch evidence |

---

## 36. Security Acceptance Mapping

| Security Rule | Required Backlog Coverage |
|---|---|
| Invite-only access | E1 stories and Sprint 1 tests |
| No public registration | E1 negative tests |
| Tenant isolation | E1, E3, E4, E6, E8, E9 tests |
| RBAC and custom permissions | E1 plus every sensitive epic |
| Client-visible data only | E4, E6, E8, E9 |
| Owner-only finance | E8 and E9 |
| AI respects permissions | E7 |
| Automations respect permissions | MVP notification/reminder tasks in E6/E10 |
| Hidden count/total suppression | E9 |
| Sensitive action audit logging | E1, E4, E6, E7, E8, E9 |
| Realtime authorization | E6 Sprint 7 |
| Signed URL security | E6 Sprint 6 |

---

## 37. Risk-Based Testing Mapping

| Risk | Test Focus | Sprint Gate |
|---|---|---|
| Tenant leakage | Cross-tenant denial tests | Sprint 1 and regression |
| Client data leakage | Client visibility and cross-client tests | Sprint 4, Sprint 6, Sprint 10 |
| Finance exposure | Owner-only and client own-invoice tests | Sprint 9, Sprint 10 |
| AI leakage | Permission-filtered AI and prompt injection tests | Sprint 8 |
| Realtime stale authorization | Session revocation and channel membership tests | Sprint 7 |
| Signed URL leakage | URL generation permission and expiry tests | Sprint 6 |
| Report aggregate leakage | Hidden count/total suppression tests | Sprint 10 |
| Weak audit | Audit event coverage and redaction tests | Sprint 1 onward |
| Bad transcription quality | Arabic/German/mixed-language voice samples | Sprint 8 |
| Release failure | Rollback dry-run and monitoring validation | Sprint 11-13 |

---

## 38. Release Gates

| Gate | Required Evidence |
|---|---|
| Sprint completion gate | Story acceptance, QA evidence, security checks, demo |
| Milestone gate | Milestone exit criteria, dependency review, unresolved risk review |
| Client-facing gate | Client-safe visibility tests, cross-client denial tests, audit logs |
| Finance gate | Owner-only tests, explicit denial tests, finance audit logs |
| AI gate | Prompt injection tests, permission tests, provider policy review, human approval validation |
| Reporting gate | Hidden count/total suppression tests, role-safe dashboard tests |
| Release candidate gate | Regression, UAT, security, rollback, monitoring, known issues approval |
| Launch gate | Production smoke, backup/restore readiness, incident path, support readiness |

---

## 39. Roles and Ownership

| Role | Ownership |
|---|---|
| Product Owner | MVP scope, priority, acceptance criteria, pilot success |
| CTO | Architecture, technical decisions, security gates, go/no-go participation |
| Technical Lead | Engineering execution, module boundaries, sprint technical readiness |
| Frontend Lead | Workspace, portal, UI quality, RTL/LTR readiness |
| Backend Lead | API, services, permissions, jobs, audit, data access patterns |
| Database Architect | PostgreSQL model, tenant hardening, indexes, constraints |
| Security Architect | RBAC, tenant isolation, client boundary, audit, AI/security tests |
| QA Lead | Test plans, evidence, regression, UAT readiness |
| Designer | UX/UI flows, wireframes, component states, accessibility |
| DevOps Architect | CI/CD, environments, monitoring, backup, rollback |
| AI Systems Architect | Provider selection, AI gateway, transcription quality, AI safety |
| Finance Owner | Finance rules, invoice/payment acceptance, Owner-only access validation |
| Client Representative | UAT feedback and client portal acceptance |

---

## 40. Backlog Governance

Backlog governance rules:

- Product Owner owns backlog priority.
- CTO owns technical feasibility and security-critical sequencing.
- QA Lead can block sprint exit when acceptance evidence is missing.
- Security Architect can block client-facing, finance, AI, realtime, file, and report features.
- Non-MVP additions require change control.
- Sprint scope is not expanded without capacity and risk review.
- Critical defects can interrupt sprint scope only through triage.
- Stories without testable acceptance criteria remain in Backlog.

---

## 41. Change Control

Change request model:

| Field | Required |
|---|---|
| Change summary | Required |
| Business reason | Required |
| MVP impact | Required |
| Dependency impact | Required |
| Security impact | Required |
| QA impact | Required |
| Schedule impact | Required |
| Owner | Required |
| Decision | Approve, defer, reject |
| Audit note | Required for scope-sensitive changes |

Approval rules:

- Product Owner approves product scope changes.
- CTO approves architecture and dependency changes.
- Security Architect approves sensitive security/client/finance/AI/reporting changes.
- Release Manager approves release-stage changes.

---

## 42. Scope Control

MVP exclusions:

- No advanced AI Analyst.
- No AI financial analytics.
- No full automation builder.
- No full payroll automation.
- No advanced BI forecasting.
- No advanced anomaly detection.
- No complex recurring projects.
- No advanced wallet system.
- No integration marketplace.
- No white-label tenant customization.
- No full mobile app.
- No advanced data warehouse.

Scope expansion rule:

Any MVP scope expansion must include business justification, dependency check, security review, QA impact review, and schedule impact review. If the expansion touches client-facing, finance, AI, reporting, file, realtime, or tenant isolation behavior, Security Architect approval is mandatory.

---

## 43. Sprint Review Process

Sprint review checklist:

- Demo completed stories only.
- Show role-specific behavior where relevant.
- Show permission denial states for sensitive stories.
- Show audit evidence for sensitive actions.
- Show QA evidence summary.
- Identify accepted, rejected, and carried-over stories.
- Record product feedback.
- Update risks and dependencies.
- Confirm whether milestone exit criteria are met.

---

## 44. Sprint Retrospective Process

Retrospective focus:

- Scope stability.
- Acceptance criteria quality.
- Permission/security defect rate.
- QA evidence quality.
- Dependency accuracy.
- Technical debt.
- UX clarity.
- Test automation opportunities.
- Release risk.

Retrospective outputs:

- 1-3 process improvements.
- Action owner.
- Target sprint.
- Risk impact.
- Follow-up status.

---

## 45. Epic E1: Identity and Tenant Foundation

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Establish secure invite-only tenant access, roles, permissions, sessions, devices, login history, and audit foundation |
| Business value | Enables secure pilot onboarding and prevents unauthorized access |
| Technical value | Creates the required foundation for every sensitive module |
| Dependencies | Phase 14 architecture decisions, Sprint 0 standards |
| Risk level | Critical |
| Sprint allocation | Sprint 0, Sprint 1 |
| Exit criteria | Invite-only access works; RBAC enforced; tenant context propagated; audit foundation validated |

### Feature Breakdown

| Feature | Description |
|---|---|
| Tenant foundation | Tenant, membership, tenant context, tenant resolver |
| Invite-only access | Owner-generated invitations, no public registration |
| Sessions and devices | Session lifecycle, device tracking, login history |
| Roles and permissions | Owner, Manager, Employee, Client roles and custom permission foundation |
| Audit foundation | Append-only sensitive action audit events with redaction rules |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Tenant resolver; identity module; invitation service; RBAC guard; tenant-aware repository pattern; audit service |
| QA tasks | Invite tests; no-public-registration tests; session tests; role matrix tests; cross-tenant tests |
| Security tasks | Permission drift review; audit tamper/redaction tests; tenant context tests |
| UX/UI tasks | Login, invitation acceptance, account setup, denied access state |
| Data tasks | Tenants, memberships, users, invitations, roles, permissions, sessions, devices, login history, audit logs |
| Acceptance criteria | All protected routes require authenticated session; role access enforced; sensitive actions audited |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1-US01 | Owner | As an Owner, I can create the first tenant and confirm architecture readiness decisions | P0 | None | Tenant record exists; owner membership exists; technical decisions are assigned | Non-owner cannot create tenant | Owner bootstrap only | Tenant creation logged | Setup validation evidence | M | Sprint 0 | Backlog |
| E1-US02 | Owner | As an Owner, I can invite internal users and clients by email | P0 | E1-US01 | Invitation has role, tenant, expiry, status; recipient can accept | Uninvited email cannot register | Owner or granted manager only | Invite create/accept/revoke logged | Invite acceptance and expiry tests | M | Sprint 1 | Backlog |
| E1-US03 | User | As a user, I can sign in, maintain a session, and see my account state | P0 | E1-US02 | Session created; device recorded; login history stored | Expired/revoked session cannot access app | Authenticated invited users only | Login/session/device events logged | Session expiry/revocation tests | M | Sprint 1 | Backlog |
| E1-US04 | Owner | As an Owner, I can assign roles and permissions safely | P0 | E1-US03 | Owner, Manager, Employee, Client roles enforced | Manager cannot grant Owner privileges | Owner or explicit security grant | Role/permission changes logged | RBAC matrix tests | L | Sprint 1 | Backlog |
| E1-US05 | Security Auditor | As a security reviewer, I can verify audit logs for sensitive actions | P0 | E1-US03 | Audit event includes actor, tenant, resource, action, permission result, outcome, timestamp | Normal user cannot edit/delete audit records | Owner/security-grant only | Audit read/export/correction logged | Tamper/redaction tests | L | Sprint 1 | Backlog |

---

## 46. Epic E2: Workspace Shell and Navigation

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Provide role-aware workspace shell and safe navigation for internal users and clients |
| Business value | Gives users a usable operating workspace early |
| Technical value | Establishes frontend architecture, routing, layout, and localization base |
| Dependencies | E1 |
| Risk level | Medium |
| Sprint allocation | Sprint 2 |
| Exit criteria | Navigation is role-aware, unauthorized routes are safe, RTL/LTR support is validated |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Next.js shell; route groups; permission-aware route resolver; localization direction handling |
| QA tasks | Role navigation; denied routes; responsive layout; RTL/LTR checks |
| Security tasks | Hidden navigation item checks; client route separation |
| UX/UI tasks | Sidebar, topbar, dashboards placeholder, settings entry, denied states |
| Data tasks | User preferences if needed; language preference; timezone preference |
| Acceptance criteria | Users see only allowed navigation and cannot access hidden routes directly |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E2-US01 | Internal User | As an internal user, I can use the workspace shell and main navigation | P0 | E1 | Sidebar/topbar render; allowed modules visible | User cannot see modules without permission | Role-aware navigation | Navigation denial logged when sensitive | Role navigation tests | M | Sprint 2 | Backlog |
| E2-US02 | Client | As a client, I see only client portal navigation | P0 | E1 | Client sees client dashboard/project/chat/files/invoices where allowed | Client cannot see internal CRM, finance center, audit logs | Client role only | Unauthorized route attempts logged | Client route denial tests | M | Sprint 2 | Backlog |
| E2-US03 | User | As a user, I can use Arabic RTL, English LTR, and German LTR layouts | P1 | E1 | Direction, text alignment, and layout states render correctly | Arabic layout must not break navigation | User language preference | None unless setting changed | RTL/LTR visual QA | M | Sprint 2 | Backlog |
| E2-US04 | User | As a user, I see safe empty, loading, error, and denied states | P1 | E1 | States are clear and do not reveal hidden data | Denied state must not reveal hidden counts | Permission-aware UI state | Sensitive denial logged | UI state tests | S | Sprint 2 | Backlog |

---

## 47. Epic E3: Project Delivery Core

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Enable agency teams to manage projects, tasks, subtasks, assignments, statuses, due dates, and priorities |
| Business value | Core operational value for distributed marketing teams |
| Technical value | Creates data foundation for client portal, files, voice-to-task, finance, and reports |
| Dependencies | E1, E2 |
| Risk level | High |
| Sprint allocation | Sprint 3 |
| Exit criteria | Internal project/task workflows pass role and audit tests |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Project service; task service; subtask service; assignment; statuses; due dates; priorities; basic dependency records |
| QA tasks | CRUD tests; status transition tests; assignment tests; own/assigned visibility tests |
| Security tasks | Manager assigned-scope tests; employee assigned/own tests; client denial tests |
| UX/UI tasks | Project list, project detail, task list/board, task detail, subtask panel |
| Data tasks | Clients, projects, tasks, subtasks, dependencies, task activity |
| Acceptance criteria | Users can manage project work only within allowed scope |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E3-US01 | Owner/Manager | As an Owner or Manager, I can create a project linked to a client | P0 | E1, E2 | Project has client, owner/manager, status, due date | Employee cannot create project unless granted | Owner/Manager or explicit grant | Project create/update logged | Project CRUD tests | M | Sprint 3 | Backlog |
| E3-US02 | Manager | As a Manager, I can create and assign tasks in assigned projects | P0 | E3-US01 | Task has title, assignee, status, priority, due date | Manager cannot assign outside accessible project | Assigned project scope | Task create/assign logged | Assignment tests | M | Sprint 3 | Backlog |
| E3-US03 | Employee | As an Employee, I can update my assigned task status | P0 | E3-US02 | Employee can move allowed status and add update | Employee cannot update unassigned task | Own/assigned tasks only | Task status update logged | Own/assigned tests | S | Sprint 3 | Backlog |
| E3-US04 | Manager/Employee | As a project user, I can create and complete subtasks | P1 | E3-US02 | Subtask belongs to task and has status/assignee | User cannot create subtask in inaccessible task | Parent task scope applies | Subtask changes logged | Subtask tests | M | Sprint 3 | Backlog |
| E3-US05 | Manager | As a Manager, I can link a basic task dependency | P1 | E3-US02 | Dependency prevents confusing ordering and displays clearly | Dependency cannot cross inaccessible project | Manager in project scope | Dependency create/remove logged | Dependency tests | S | Sprint 3 | Backlog |

---

## 48. Epic E4: Client Portal Core

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Provide clients with safe access to their projects, approvals, files, chat, and allowed billing data |
| Business value | Delivers early client-facing value and differentiates MAOS |
| Technical value | Enforces client data boundary and client-visible publication rules |
| Dependencies | E1, E2, E3 |
| Risk level | Critical |
| Sprint allocation | Sprint 4, Sprint 6 |
| Exit criteria | Clients can only access own client-visible data; internal data never leaks |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Client portal routing; client membership; client-safe resource resolver; visibility flags |
| QA tasks | Client own-only tests; hidden internal data tests; cross-client denial tests |
| Security tasks | Internal notes/chat/payroll/employee cost/audit exclusion |
| UX/UI tasks | Client dashboard, client project page, client approval entry, client files entry |
| Data tasks | Client memberships, client visibility records, client project access |
| Acceptance criteria | Client portal never exposes internal workspace data |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E4-US01 | Client | As a client, I can view my client dashboard | P0 | E1, E2 | Dashboard shows own client-visible projects and actions | Client cannot see another client's data | Own-client-only | Sensitive client access logged where configured | Client visibility tests | M | Sprint 4 | Backlog |
| E4-US02 | Client | As a client, I can view my approved project page | P0 | E3, E4-US01 | Project page shows approved progress, deliverables, files, approvals | Internal notes and private tasks hidden | Client-visible records only | Project client view logged where sensitive | Cross-client denial tests | L | Sprint 4 | Backlog |
| E4-US03 | Manager | As a Manager, I can mark project content as client-visible | P0 | E3 | Visibility state is explicit and reversible | Employee cannot publish unless granted | Manager/Owner or explicit grant | Publish/unpublish logged | Publication tests | M | Sprint 4 | Backlog |
| E4-US04 | Client | As a client, I see a safe denied state when accessing unavailable content | P0 | E4-US01 | Denied state reveals no hidden totals/names | Invalid URL cannot reveal resource existence | Own-client-only | Denial logged for sensitive attempts | Hidden metadata tests | S | Sprint 4 | Backlog |
| E4-US05 | Client | As a client, I can approve a client-visible file or deliverable | P0 | E6-US03 | Approval decision is recorded and visible to authorized team | Client cannot approve internal/private file | Client-visible approval only | Approval decision logged | Approval workflow tests | M | Sprint 6 | Backlog |

---

## 49. Epic E5: CRM Basic

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Deliver basic lead and opportunity management with meetings and follow-ups |
| Business value | Supports sales pipeline visibility before advanced forecasting |
| Technical value | Adds CRM data for dashboards and future automations |
| Dependencies | E1, E2 |
| Risk level | Medium |
| Sprint allocation | Sprint 5 |
| Exit criteria | CRM pipeline, meetings, and follow-ups are usable and permission-safe |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Lead service; opportunity service; pipeline stage transitions; meetings; follow-ups |
| QA tasks | Pipeline tests; stage transition tests; follow-up due tests |
| Security tasks | CRM visibility by role; client denial for internal CRM |
| UX/UI tasks | CRM board, lead detail, opportunity detail, meeting/follow-up views |
| Data tasks | Leads, opportunities, meetings, follow-ups, pipeline stages |
| Acceptance criteria | Lead to opportunity flow supports Lead, Contacted, Meeting, Proposal, Negotiation, Won, Lost |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E5-US01 | Owner/Manager | As a sales user, I can create and qualify leads | P0 | E1, E2 | Lead has source, contact info, owner, stage | Client cannot access CRM lead | Owner/Manager or CRM grant | Lead create/update logged | Lead tests | M | Sprint 5 | Backlog |
| E5-US02 | Owner/Manager | As a sales user, I can move leads/opportunities through the MVP pipeline | P0 | E5-US01 | Pipeline supports approved stages | Invalid transition is blocked or flagged | CRM permission required | Stage change logged | Pipeline transition tests | M | Sprint 5 | Backlog |
| E5-US03 | Owner/Manager | As a sales user, I can schedule meetings and record outcomes | P1 | E5-US01 | Meeting has date/time, participants, notes, outcome | Unauthorized user cannot view private meeting | CRM scope applies | Meeting create/update logged | Meeting tests | S | Sprint 5 | Backlog |
| E5-US04 | Owner/Manager | As a sales user, I can create follow-ups with due dates | P0 | E5-US01 | Follow-up has owner, due date, status | Follow-up cannot assign inaccessible user | CRM scope applies | Follow-up create/complete logged | Follow-up overdue tests | S | Sprint 5 | Backlog |

---

## 50. Epic E6: Collaboration Core

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Enable safe internal and client collaboration through chat, files, versions, approvals, and notifications |
| Business value | Centralizes execution conversations and deliverable review |
| Technical value | Establishes storage, realtime, notifications, and approval foundations |
| Dependencies | E1, E3, E4 |
| Risk level | High |
| Sprint allocation | Sprint 5, Sprint 6, Sprint 7 |
| Exit criteria | File, approval, chat, and notification workflows are permission-safe |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Channel model; file metadata; signed URLs; file versions; approvals; notification events; realtime subscriptions |
| QA tasks | Chat separation tests; file version tests; signed URL tests; approval tests; notification recipient tests |
| Security tasks | Client/internal channel separation; URL permission; session revocation; minimal realtime payload |
| UX/UI tasks | Chat, file library, version history, approval center, notification center |
| Data tasks | Channels, channel members, messages, files, file versions, approvals, notifications |
| Acceptance criteria | Collaboration never crosses tenant, client, channel, or file visibility boundaries |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E6-US01 | Internal User | As an internal user, I can see collaboration spaces linked to projects | P1 | E3 | Project channel exists and membership follows project access | Non-member cannot see channel | Project membership | Channel access denial logged where sensitive | Channel membership tests | M | Sprint 5 | Backlog |
| E6-US02 | Internal User | As a user, I can upload files to a project or task | P0 | E3 | File metadata stored; signed upload/download flow works | Unauthorized user cannot upload/view file | Project/task access required | Upload/view/download logged | File tests | M | Sprint 6 | Backlog |
| E6-US03 | Internal User | As a user, I can upload a new file version | P0 | E6-US02 | Version history shows latest and prior versions | User cannot view private version | File access applies | Version upload/view logged | Versioning tests | M | Sprint 6 | Backlog |
| E6-US04 | Manager | As a Manager, I can request approval for a deliverable | P0 | E6-US03 | Approval request links file/task/client and status | Cannot request approval for inaccessible file | Manager/Owner/project grant | Approval request logged | Approval request tests | M | Sprint 6 | Backlog |
| E6-US05 | Client/Internal Reviewer | As a reviewer, I can approve or request changes | P0 | E6-US04 | Decision captured with actor, timestamp, status | Reviewer cannot approve unassigned/private request | Assigned reviewer/client-visible only | Decision logged | Approval decision tests | M | Sprint 6 | Backlog |
| E6-US06 | Internal User | As an internal user, I can send internal chat messages | P0 | E6-US01 | Message appears only to internal channel members | Client cannot see internal chat | Internal channel membership | Message create logged if sensitive | Internal chat tests | M | Sprint 7 | Backlog |
| E6-US07 | Client/Internal User | As a permitted user, I can send client chat messages | P0 | E4, E6-US01 | Message appears only to client channel members | Other client cannot access channel | Client channel membership | Client message logged where sensitive | Client chat tests | M | Sprint 7 | Backlog |
| E6-US08 | User | As a user, I receive safe notifications for assigned work and approvals | P1 | E3, E6-US04 | Notification recipient is correct and payload is minimal | Unauthorized recipient receives no notification | Recipient permission required | Notification delivery logged | Recipient safety tests | M | Sprint 7 | Backlog |
| E6-US09 | User | As a user, I receive realtime updates only for authorized channels | P1 | E6-US06 | Realtime subscriptions validate session and membership | Revoked session stops receiving protected events where supported | Realtime channel authorization | Unauthorized subscription logged | Realtime revocation tests | L | Sprint 7 | Backlog |

---

## 51. Epic E7: Voice and Basic AI

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Support voice notes and basic voice-to-task draft creation with human approval |
| Business value | Speeds task capture for distributed teams |
| Technical value | Establishes AI gateway, transcription job, and AI safety baseline |
| Dependencies | E1, E3, E6 |
| Risk level | High |
| Sprint allocation | Sprint 8 |
| Exit criteria | AI creates drafts only; human confirmation required; permission and prompt injection tests pass |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Voice upload; transcription job; provider abstraction; AI gateway; extraction draft; task creation confirmation |
| QA tasks | Arabic/English/German voice tests; transcription failure tests; low-confidence tests |
| Security tasks | AI permission tests; prompt injection tests; transcript visibility tests; provider retention review |
| UX/UI tasks | Voice recorder/upload, transcript review, low-confidence warning, task draft confirmation |
| Data tasks | Voice notes, transcripts, AI logs, AI task drafts |
| Acceptance criteria | AI never creates final task without human approval |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E7-US01 | Internal User | As a user, I can record or upload a voice note to an accessible project/task | P0 | E3, E6 | Voice note stored with context and visibility | User cannot attach voice note to inaccessible project | Project/task access required | Voice upload logged | Voice upload tests | M | Sprint 8 | Backlog |
| E7-US02 | Internal User | As a user, I can view a transcript when processing succeeds | P0 | E7-US01 | Transcript has language, confidence, status | Unauthorized user cannot view transcript | Voice note scope applies | Transcript view/edit logged | Transcript permission tests | M | Sprint 8 | Backlog |
| E7-US03 | Internal User | As a user, I see low-confidence transcript warning and can edit before action | P0 | E7-US02 | Low-confidence state requires review | Low-confidence transcript cannot auto-create task | Same as voice scope | Review/edit logged | Low-confidence tests | S | Sprint 8 | Backlog |
| E7-US04 | Internal User | As a user, AI can create a task draft from a voice note | P0 | E7-US02, E3 | Draft includes title, description, due date, priority, project, assignee suggestion | Prompt injection in transcript is ignored | AI uses accessible context only | AI request/output/permission logged | AI safety tests | L | Sprint 8 | Backlog |
| E7-US05 | Internal User | As a user, I can confirm or reject an AI-generated task draft | P0 | E7-US04 | Confirmed draft creates task; rejected draft is not saved as task | AI cannot create task without confirmation | User must have create task permission | Approval/rejection logged | Human approval tests | M | Sprint 8 | Backlog |

---

## 52. Epic E8: Finance Basic

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Provide Owner-only basic invoices, partial payment tracking, and revenue visibility |
| Business value | Enables basic billing and revenue tracking in MVP |
| Technical value | Establishes finance permissions and audit controls for later finance/payroll expansion |
| Dependencies | E1, E4, E5 |
| Risk level | Critical |
| Sprint allocation | Sprint 9 |
| Exit criteria | Owner-only finance works and clients see only own approved invoice/payment records |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Invoice service; invoice status; partial payment records; revenue records; client invoice visibility |
| QA tasks | Invoice lifecycle; partial payment; Owner-only; client own invoice/payment tests |
| Security tasks | Manager/employee denial; client other-invoice denial; finance audit validation |
| UX/UI tasks | Owner finance center, invoice detail, payment status, client invoice view |
| Data tasks | Invoices, invoice line items, payments, partial payments, revenue records |
| Acceptance criteria | Finance data is Owner-only except approved client own invoice/payment visibility |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E8-US01 | Owner | As an Owner, I can create a basic invoice for a client/project | P0 | E1, E4 | Invoice has client, project optional, lines, currency, status | Manager/Employee cannot create unless explicit finance grant | Owner-only default | Invoice create/update logged | Owner-only tests | L | Sprint 9 | Backlog |
| E8-US02 | Owner | As an Owner, I can record a partial payment | P0 | E8-US01 | Payment amount updates invoice balance and status | Payment cannot exceed allowed balance without validation | Owner-only default | Payment record logged | Partial payment tests | M | Sprint 9 | Backlog |
| E8-US03 | Owner | As an Owner, I can track basic revenue from invoices/payments | P0 | E8-US01, E8-US02 | Revenue dashboard uses approved invoice/payment data | Non-owner cannot access revenue data | Owner-only default | Revenue view logged where sensitive | Revenue tests | M | Sprint 9 | Backlog |
| E8-US04 | Client | As a client, I can view my approved invoices and payment status | P0 | E4, E8-US01 | Client sees own approved invoices/payments only | Client cannot see another client invoice | Own-client invoice visibility | Client invoice view logged where sensitive | Client billing visibility tests | M | Sprint 9 | Backlog |
| E8-US05 | Owner | As an Owner, I can update invoice status safely | P1 | E8-US01 | Status changes follow allowed lifecycle | Unauthorized role cannot change status | Owner-only default | Status change logged | Invoice status tests | S | Sprint 9 | Backlog |

---

## 53. Epic E9: Dashboards and Reports Basic

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Provide basic role-safe dashboards and reports |
| Business value | Gives owners, managers, employees, and clients operational visibility |
| Technical value | Establishes permission-safe reporting and aggregate suppression baseline |
| Dependencies | E3, E4, E5, E8 |
| Risk level | High |
| Sprint allocation | Sprint 10 |
| Exit criteria | Dashboards/reports never expose hidden counts, hidden totals, or unauthorized data |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Dashboard service; report service; permission-safe query layer; suppression rules; report access logs |
| QA tasks | Role dashboard tests; hidden count/total tests; report permission tests |
| Security tasks | Aggregate leakage prevention; client-safe reports; finance report Owner-only |
| UX/UI tasks | Basic dashboards, report list, report filters, safe empty/denied states |
| Data tasks | Report definitions, dashboard widgets, report access logs |
| Acceptance criteria | All reports respect role, tenant, client, finance, and suppression rules |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E9-US01 | Owner | As an Owner, I can view a basic business dashboard | P0 | E3, E5, E8 | Shows allowed project, CRM, invoice/revenue summaries | Hidden data suppression applies to denied drill-downs | Owner global access | Sensitive dashboard access logged | Owner dashboard tests | L | Sprint 10 | Backlog |
| E9-US02 | Manager | As a Manager, I can view assigned project/team dashboard | P0 | E3 | Shows assigned operational data only | Manager cannot see global finance/payroll | Assigned/granted scope only | Dashboard access logged where sensitive | Manager dashboard tests | M | Sprint 10 | Backlog |
| E9-US03 | Employee | As an Employee, I can view my personal dashboard | P0 | E3 | Shows assigned tasks and personal activity only | Employee cannot see team/global finance | Own/assigned work only | Access logged where sensitive | Employee dashboard tests | M | Sprint 10 | Backlog |
| E9-US04 | Client | As a client, I can view my client dashboard and basic reports | P0 | E4, E8 | Shows own client-visible project/invoice data | No internal notes, costs, payroll, other clients | Client-safe only | Client report access logged where sensitive | Client-safe report tests | M | Sprint 10 | Backlog |
| E9-US05 | Authorized User | As a user, I can open basic project/task/CRM reports safely | P1 | E3, E5 | Reports show only allowed rows and aggregates | Hidden count/total not revealed | Role/scope aware | Report access logged | Suppression tests | L | Sprint 10 | Backlog |

---

## 54. Epic E10: QA and Release Governance

### Epic Summary

| Field | Detail |
|---|---|
| Epic goal | Ensure MVP can be tested, validated, released, monitored, and supported safely |
| Business value | Reduces launch risk and protects client trust |
| Technical value | Establishes release gates, QA evidence, UAT, rollback, and incident readiness |
| Dependencies | All epics |
| Risk level | Critical |
| Sprint allocation | Sprint 0-13 |
| Exit criteria | MVP launch gates pass with evidence |

### Task Breakdown

| Task Type | Tasks |
|---|---|
| Technical tasks | Test harness standards, release flags, monitoring hooks, rollback readiness |
| QA tasks | Test plans, regression, UAT, evidence, known issues register |
| Security tasks | Security regression, permission tests, tenant isolation tests, sensitive feature tests |
| UX/UI tasks | UAT feedback review, launch-critical usability fixes |
| Data tasks | Test tenants, seed strategy, QA evidence records, release records |
| Acceptance criteria | No MVP launch without UAT sign-off, rollback plan, monitoring, and critical defect closure |

### User Stories

| Story ID | User Role | User Story | Priority | Dependencies | Acceptance Criteria | Negative Test Case | Permission Rule | Audit/Log Requirement | QA Requirement | Size | Suggested Sprint | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E10-US01 | QA Lead | As QA Lead, I can define MVP test strategy and evidence requirements | P0 | None | Test categories and evidence model approved | Story without acceptance criteria cannot be ready | QA governance | QA approvals logged if system-managed | QA plan review | M | Sprint 0 | Backlog |
| E10-US02 | QA Lead | As QA Lead, I can run full MVP regression | P0 | Sprints 1-10 | Regression covers functional, permission, client, finance, AI, reporting | Critical failed test blocks release | QA/release role | Test run evidence retained | Regression suite | L | Sprint 11 | Backlog |
| E10-US03 | Security Architect | As Security Architect, I can validate MVP security gates | P0 | Sprints 1-10 | Tenant, permission, client, finance, AI, file, realtime, report tests pass | Any critical leakage blocks release | Security gate owner | Security test evidence logged | Security regression | L | Sprint 11 | Backlog |
| E10-US04 | Product Owner | As Product Owner, I can collect UAT sign-off from pilot users | P0 | Sprint 11 | UAT roles complete agreed workflows | Unapproved critical UAT issue blocks release | UAT participants only | UAT sign-off recorded | UAT evidence | M | Sprint 11 | Backlog |
| E10-US05 | Release Manager | As Release Manager, I can validate rollback and monitoring before launch | P0 | Sprint 11 | Rollback dry-run and monitoring pass | Missing rollback blocks release | Release owner | Release readiness logged | Rollback/monitoring tests | M | Sprint 11 | Backlog |
| E10-US06 | Release Manager | As Release Manager, I can approve a release candidate | P0 | E10-US02-E10-US05 | RC has no unapproved critical/high defects | Scope addition cannot enter RC without approval | Release governance | RC approval logged | RC smoke/regression | M | Sprint 12 | Backlog |
| E10-US07 | Operations | As Operations, I can launch MVP to pilot tenant with support readiness | P0 | E10-US06 | Production smoke passes; monitoring active; support path live | Failed smoke triggers rollback/no-go | Launch role | Launch events logged | Production smoke tests | M | Sprint 13 | Backlog |

---

## 55. Technical Dependency Map

| Technical Dependency | Blocks |
|---|---|
| Tenant resolver and tenant-aware repository pattern | All tenant-owned modules |
| RBAC guard and service-level scope validation | Client portal, projects, files, chat, AI, finance, reports |
| Audit service | Client portal, files, approvals, AI, finance, reports |
| S3-compatible signed URL service | File upload, file versions, client file approvals |
| Queue/jobs foundation | Transcription, AI, notifications, report generation if async |
| Realtime provider | Chat, notifications, task/approval updates |
| AI provider and retention approval | Voice-to-task basic |
| Report permission-safe query layer | Dashboards and reports |
| Backup/restore validation | MVP production launch |

---

## 56. MVP Readiness Checklist

| Checklist Item | Required Status |
|---|---|
| MVP scope matches Phase 13 | Required |
| Technical architecture matches Phase 14 | Required |
| Stack preserved | Required |
| Invite-only access implemented | Required |
| No public registration | Required |
| Tenant isolation tests pass | Required |
| RBAC and resource scope tests pass | Required |
| Client portal visibility tests pass | Required |
| Owner-only finance tests pass | Required |
| AI voice-to-task human approval tests pass | Required |
| File signed URL tests pass | Required |
| Realtime authorization tests pass | Required |
| Hidden count/total suppression tests pass | Required |
| Audit logs validated | Required |
| Regression tests pass | Required |
| UAT signed off | Required |
| Rollback validated | Required |
| Monitoring active | Required |
| Known issues approved | Required |
| Launch go/no-go complete | Required |

---

## 57. Final Backlog Approval Checklist

| Approval Item | Status Requirement |
|---|---|
| Backlog strategy defined | Complete |
| Backlog hierarchy defined | Complete |
| MVP epics defined | Complete |
| User stories include required metadata | Complete |
| Technical tasks defined | Complete |
| QA tasks defined | Complete |
| UX/UI tasks defined | Complete |
| DevOps tasks defined | Complete |
| Security tasks defined | Complete |
| Data/database tasks defined | Complete |
| AI task scope limited to MVP | Complete |
| Sprint 0-13 plans defined | Complete |
| Milestone-to-sprint mapping defined | Complete |
| Dependency map defined | Complete |
| Priority and estimation models defined | Complete |
| Definition of Ready defined | Complete |
| Definition of Done defined | Complete |
| QA acceptance mapping defined | Complete |
| Security acceptance mapping defined | Complete |
| Risk-based testing mapping defined | Complete |
| Release gates defined | Complete |
| Ownership model defined | Complete |
| Change control defined | Complete |
| Scope control defined | Complete |
| MVP readiness checklist defined | Complete |

---

## Final Phase 15 Statement

This Product Backlog & Sprint Plan converts the approved MAOS Master Specification, MVP Roadmap, and Technical Implementation Architecture into a controlled implementation plan for MVP launch. The plan preserves the approved MVP boundary, keeps sensitive modules behind permissions and audit gates, avoids advanced non-MVP features, and sequences delivery from architecture and access control through workspace, projects, client portal, CRM, collaboration, voice/basic AI, finance, reporting, QA, release candidate, and launch.

---

## 58. Phase 15 Backlog Hardening Addendum

This addendum closes the approval-blocking backlog and sprint planning gaps identified in the strict Phase 15 audit. It does not expand MVP scope. It clarifies sprint-ready setup tasks, Sprint 0 decision execution, overload controls, sequencing rules, incremental regression expectations, sprint load, and export readiness.

### 58.1 Technical Setup Task Matrix

| Task ID | Area | Description | Owner Role | Sprint | Dependency | Acceptance Criteria | Risk If Missing |
|---|---|---|---|---|---|---|---|
| TS-FE-01 | Frontend | Next.js application setup | Frontend Lead | Sprint 0 | Stack approval | Application shell can run in local/dev environment with agreed structure | Frontend work starts inconsistently |
| TS-FE-02 | Frontend | React/TypeScript baseline | Frontend Lead | Sprint 0 | TS-FE-01 | TypeScript strictness, linting, and component conventions documented | Type drift and inconsistent UI implementation |
| TS-FE-03 | Frontend | Tailwind CSS setup | Frontend Lead / Designer | Sprint 0 | TS-FE-01 | Design token baseline and utility conventions approved | UI inconsistency and rework |
| TS-FE-04 | Frontend | shadcn/ui or equivalent component setup | Frontend Lead / Designer | Sprint 0 | TS-FE-02, TS-FE-03 | Core components selected and usage rules documented | Slow UI delivery and inconsistent controls |
| TS-FE-05 | Frontend | Route group structure | Frontend Lead / Security Architect | Sprint 0 | TS-FE-01 | Internal and client route groups are separated and permission-aware routing pattern is documented | Client/internal route leakage risk |
| TS-FE-06 | Frontend | RTL/LTR foundation | Frontend Lead / Designer | Sprint 0 | TS-FE-03 | Arabic RTL and English/German LTR layout baseline validated | Localization rework and broken Arabic UX |
| TS-FE-07 | Frontend | Frontend environment config | DevOps Architect / Frontend Lead | Sprint 0 | Environment strategy | Environment variable strategy exists for local, QA, staging, and production | Environment drift |
| TS-FE-08 | Frontend | Frontend error tracking | DevOps Architect | Sprint 0 | Monitoring/logging decision | Frontend error events are routed to selected monitoring provider or approved placeholder | Silent frontend failures |
| TS-BE-01 | Backend | NestJS application setup | Backend Lead | Sprint 0 | Stack approval | Backend app structure exists with agreed module conventions | Backend module drift |
| TS-BE-02 | Backend | Modular backend structure | Principal Software Architect / Backend Lead | Sprint 0 | TS-BE-01 | MVP modules and boundaries are documented | Business logic duplication |
| TS-BE-03 | Backend | REST API standards | Backend Lead | Sprint 0 | TS-BE-01 | Resource naming, error model, pagination, and response conventions are approved | Inconsistent API contracts |
| TS-BE-04 | Backend | DTO validation baseline | Backend Lead / QA Lead | Sprint 0 | TS-BE-03 | Validation pattern is defined for all inbound API payloads | Unsafe or inconsistent validation |
| TS-BE-05 | Backend | Auth module skeleton | Backend Lead / Security Architect | Sprint 0 | TS-BE-01 | Auth module boundaries and dependencies are ready for Sprint 1 | Sprint 1 auth delay |
| TS-BE-06 | Backend | Permission guard skeleton | Security Architect / Backend Lead | Sprint 0 | TS-BE-01 | Guard pattern is documented and ready for Sprint 1 implementation | Permission bypass risk |
| TS-BE-07 | Backend | Tenant resolver skeleton | Principal Software Architect / Backend Lead | Sprint 0 | Tenant hardening decision assigned | Tenant context entry point is documented for request and job flows | Tenant context gap |
| TS-BE-08 | Backend | Audit service skeleton | Backend Lead / Security Architect | Sprint 0 | Audit event standard | Audit service interface and event taxonomy are ready for Sprint 1 | Missing sensitive action audit |
| TS-DB-01 | Database | PostgreSQL environment setup | Database Architect / DevOps Architect | Sprint 0 | Hosting/environment decision | PostgreSQL local/dev/QA setup is documented | Database work blocked |
| TS-DB-02 | Database | Prisma/ORM decision and setup | Database Architect / Principal Software Architect | Sprint 0 | ORM decision | ORM choice is recorded in ADR and setup path is approved | Data access inconsistency |
| TS-DB-03 | Database | Tenant-aware repository baseline | Database Architect / Backend Lead | Sprint 0 | TS-DB-02 | Repository pattern requires tenant context for tenant-owned records | Cross-tenant leakage risk |
| TS-DB-04 | Database | tenant_id policy | Database Architect / Security Architect | Sprint 0 | TS-DB-03 | Tenant-owned table rule and exceptions process are documented | Incomplete tenant isolation |
| TS-DB-05 | Database | Sensitive-table hardening plan | Database Architect / Security Architect | Sprint 0 | Tenant hardening/RLS decision assigned | Sensitive tables and targeted RLS/equivalent candidates are listed | App-only isolation risk |
| TS-DB-06 | Database | Migration governance process | Database Architect / Release Manager | Sprint 0 | TS-DB-02 | Migration review, rollback, backup, and environment promotion rules are documented | Unsafe schema changes |
| TS-DB-07 | Database | Seed/test data strategy | QA Lead / Database Architect | Sprint 0 | QA strategy | Test tenants, roles, clients, projects, and permission fixtures are planned | Weak QA coverage |
| TS-INF-01 | Infrastructure | Docker local environment | DevOps Architect | Sprint 0 | Repository setup | Local app, API, database, jobs, and supporting services can be started consistently | Developer setup delays |
| TS-INF-02 | Infrastructure | Docker deployable services | DevOps Architect | Sprint 0 | TS-INF-01 | Deployment container pattern approved for staging/production | Deployment inconsistency |
| TS-INF-03 | Infrastructure | Redis/BullMQ setup | DevOps Architect / Backend Lead | Sprint 0 | Jobs architecture | Queue provider and local/dev setup are documented | AI/notification job delay |
| TS-INF-04 | Infrastructure | S3-compatible storage setup | DevOps Architect / Backend Lead | Sprint 0 | Object storage decision assigned | Storage provider path, bucket strategy, and signed URL assumptions documented | File sprint blocked |
| TS-INF-05 | Infrastructure | Email provider decision/setup | DevOps Architect / Product Operations | Sprint 0 | Email provider decision | Invite email path is selected or approved placeholder exists | Invite flow blocked |
| TS-INF-06 | Infrastructure | Monitoring/logging provider setup | DevOps Architect | Sprint 0 | Monitoring decision | App, worker, frontend, and queue monitoring plan approved | Silent failures |
| TS-INF-07 | Infrastructure | Backup/restore process setup | DevOps Architect / Database Architect | Sprint 0 | Backup decision | Backup and restore drill plan exists before production path | Unverified recovery |
| TS-INF-08 | Infrastructure | CI/CD baseline | DevOps Architect / Release Manager | Sprint 0 | Repository setup | Build, test, security scan, and deploy gate skeleton exists | Uncontrolled releases |
| TS-INF-09 | Infrastructure | Secrets management | DevOps Architect / Security Architect | Sprint 0 | Environment strategy | Secret storage, rotation, and access rules are documented | Secret leakage |
| TS-INF-10 | Infrastructure | Hotfix path setup | Release Manager / CTO | Sprint 0 | Release governance | Hotfix classification, approval, minimum tests, rollback, and audit path are documented | Unsafe production fixes |

### 58.2 Open Decisions Sprint 0 Matrix

Sprint 0 must convert Phase 14 open technical decisions into assigned artifacts. No Sprint 1 work may start with an unresolved decision that blocks identity, tenant isolation, environments, security, or audit foundation.

| Decision | Decision Owner | Required By Milestone/Gate | Sprint 0 Action | Decision Deadline | Risk If Unresolved | Escalation Path | Output Artifact |
|---|---|---|---|---|---|---|---|
| Hosting platform | CTO / DevOps Architect | Milestone 0 exit | Compare managed Docker platform, cloud containers, and Kubernetes need | Before Sprint 0 close | Environment drift and delayed CI/CD | CTO decision | Hosting ADR |
| ORM choice | Principal Software Architect | Milestone 0 exit | Select Prisma or equivalent and define tenant-aware repository wrapper | Before data access implementation | Permission drift | CTO architecture review | ORM ADR |
| Tenant hardening/RLS level | Database Architect / Security Architect | Milestone 1 design gate | Define targeted RLS/equivalent baseline for sensitive tables | Before Sprint 1B starts | Tenant leakage | CTO + Security review | Tenant hardening decision |
| Realtime provider | Principal Software Architect / DevOps Architect | Milestone 6 design gate | Identify default provider/path and operational assumptions | Before Sprint 7 planning | Unauthorized subscriptions or delivery risk | CTO decision | Realtime selection note |
| Payment provider | Finance Owner / CTO | Milestone 8 design gate | Identify MVP provider assumptions or manual payment status fallback | Before Sprint 9 planning | Unsupported billing/currency path | Owner/CTO decision | Payment provider note |
| AI provider | AI Systems Architect / Security Architect | Milestone 7 design gate | Confirm provider abstraction and retention requirements | Before Sprint 8 planning | AI launch blocked or retention mismatch | CTO + Security review | AI provider policy note |
| Transcription provider | AI Systems Architect | Milestone 7 design gate | Plan Arabic/English/German/mixed-language benchmark | Before Sprint 8 planning | Poor voice-to-task quality | CTO + Product review | Transcription benchmark plan |
| Report export in MVP | Product Strategy Lead / Security Architect | Milestone 9 design gate | Decide defer or limited export; default defer sensitive exports | Before Sprint 10 planning | Export leakage or scope creep | Product/CTO decision | Report export scope note |
| RLS adoption | Database Architect / Security Architect | Milestone 1 design gate | Align with tenant hardening/RLS level decision | Before Sprint 1B starts | App-only isolation gap | Security architecture review | RLS adoption ADR |
| Deployment region | DevOps Architect / Owner | Milestone 0 exit | Select primary region based on pilot tenant and provider availability | Before production environment setup | Data residency or latency issue | Owner/CTO decision | Region decision note |
| Object storage provider | DevOps Architect / Security Architect | Milestone 6 design gate | Select S3-compatible path or approved MVP placeholder | Before Sprint 6 planning | File security gap | CTO + Security decision | Storage provider ADR |
| Email provider | DevOps Architect / Product Operations | Milestone 1 invite gate | Select transactional email path for invites | Before Sprint 1 invite testing | Invite failures | Product Operations escalation | Email provider note |
| Monitoring/logging provider | DevOps Architect | Milestone 0 exit | Select observability baseline for app, worker, frontend, queue | Before staging release gates | Silent failures | CTO/Release Manager decision | Observability ADR |
| Backup/restore provider or process | DevOps Architect / Database Architect | Milestone 11 go/no-go | Define backup provider/process and restore drill plan | Before production launch path | Data loss risk | CTO + Owner decision | Backup/restore plan |

### 58.3 Sprint 1 Overload Reduction

Sprint 1 remains a critical foundation sprint. To avoid delivery risk, it must be managed as two internal sequences. If team capacity is limited, these sequences must become two physical sprints.

| Sequence | Scope | Required Work | Exit Gate |
|---|---|---|---|
| Sprint 1A Identity Foundation | Tenant and identity basics | Tenant resolver, invitation flow, user/membership model, session basics, no public registration, login history basics | Invited users can sign in; public registration is blocked; tenant context exists; login history is captured |
| Sprint 1B Permissions & Audit Foundation | Authorization and audit baseline | RBAC guard, permission foundation, resource scope checks, audit service baseline, audit redaction baseline, permission drift review | Protected routes enforce roles; sensitive operations produce redacted audit events; permission drift review passes |

Sprint 1 split rule:

- If one backend engineer and one QA resource cannot complete Sprint 1A and Sprint 1B within the sprint capacity, split Sprint 1 into:
  - Sprint 1A Identity Foundation.
  - Sprint 1B Permissions & Audit Foundation.
- Client portal, finance, AI, reporting, files, and realtime work remain blocked until Sprint 1B exit gate passes.

### 58.4 Sprint 6 Sequencing: Files Before Approvals

Sprint 6 must be executed in this order:

| Step | Scope | Required Work | Readiness Gate |
|---|---|---|---|
| Step 1 | File foundation | Object storage configuration, file metadata model, signed URL service, file upload/download, file versioning | File upload/download and version tests pass; signed URL permission tests pass |
| Step 2 | File visibility and permissions | File visibility rules, client-visible file checks, file version permission tests | Client-visible and private file access tests pass |
| Step 3 | Approval workflows | Approval records, approval request workflow, approval decision workflow, client approval flow | Approval actions pass only after file scope and visibility rules are enforced |

Sprint 6 rule:

- Approval workflow cannot be marked ready until file storage, file versioning, and signed URL permission tests pass.
- If file security tests fail, approval stories remain blocked and move to the next sprint or a controlled spillover.

### 58.5 Sprint 11 Workload Reduction And RC Handoff

Sprint 11 is too broad if treated as one undifferentiated sprint. It must be managed as two internal phases, or split into two physical sprints when capacity is constrained.

| Sequence | Scope | Required Work | Exit Gate |
|---|---|---|---|
| Sprint 11A Regression And Triage | Quality and security validation | Full MVP regression, permission/security regression, client visibility regression, finance and AI safety regression, defect triage | No unresolved critical defects; high defects have approved fix path or release exception |
| Sprint 11B UAT And Release Preparation | Launch readiness | UAT execution, accessibility and RTL/LTR final pass, backup/restore drill, rollback dry-run, monitoring validation, release candidate preparation | UAT evidence complete; rollback and monitoring validated; RC handoff package ready |

Sprint 11 rule:

- If critical or high defects remain after Sprint 11A, Sprint 11B cannot start as release preparation.
- If sprint count must remain unchanged, release candidate stabilization moves into Sprint 12 only and Sprint 11 focuses on regression, UAT, and defect triage.

### 58.6 Incremental Regression Requirements

Regression must not wait until Sprint 11. Every sensitive sprint must include incremental regression evidence.

| Sprint | Regression Scope | Required Evidence | Blocking Criteria |
|---|---|---|---|
| Sprint 1 | Auth/session/RBAC/audit regression | Invite, no-public-registration, session, role, permission, audit evidence | Any tenant/auth/permission bypass blocks Sprint 1 exit |
| Sprint 3 | Project/task permission regression | Owner/Manager/Employee/Client project/task access matrix | Unauthorized project/task access blocks Sprint 3 exit |
| Sprint 4 | Client portal visibility regression | Own-client-only, client-visible flag, internal data exclusion evidence | Any cross-client/internal data leakage blocks Sprint 4 exit |
| Sprint 6 | File/version/approval permission regression | Signed URL, version access, client-visible file, approval evidence | Failed signed URL or file visibility test blocks approvals |
| Sprint 7 | Chat/realtime notification regression | Channel membership, notification recipient, session revocation evidence | Unauthorized message, event, or notification blocks Sprint 7 exit |
| Sprint 8 | AI voice-to-task safety regression | Prompt injection, permission, low-confidence transcript, human confirmation evidence | AI final action without confirmation or leakage blocks Sprint 8 exit |
| Sprint 9 | Finance Owner-only regression | Owner-only, manager/employee denial, client own invoice/payment evidence | Any unauthorized finance access blocks Sprint 9 exit |
| Sprint 10 | Report hidden count/total suppression regression | Role dashboard, client-safe report, hidden aggregate suppression evidence | Hidden count/total leakage blocks Sprint 10 exit |
| Sprint 11 | Full MVP regression | End-to-end functional, security, client, finance, AI, reporting, rollback evidence | Any unresolved critical defect blocks RC handoff |

### 58.7 Sprint Load Classification

| Sprint | Load Level | Main Bottleneck | Overload Risk | Recommended Mitigation | Split Recommendation If Needed |
|---|---|---|---|---|---|
| Sprint 0 | Medium | Decisions and environment setup | Open decisions spill into Sprint 1 | Time-box ADRs and assign owners | Split only if hosting/ORM/tenant decisions remain unresolved |
| Sprint 1 | Critical | Identity, tenant, RBAC, audit | Too much security foundation in one sprint | Use Sprint 1A/1B sequencing | Split into Sprint 1A and Sprint 1B if capacity is limited |
| Sprint 2 | Medium | Role-aware UI and RTL/LTR | Navigation states incomplete | Keep dashboard content as placeholders | No split expected |
| Sprint 3 | High | Project/task model and permissions | Task scope rules incomplete | Prioritize core CRUD and assigned-scope tests | Split only if dependencies/workload expands |
| Sprint 4 | Critical | Client boundary | Client leakage risk | Block on Sprint 1B and run visibility regression | Split if client portal and approval UI are combined too early |
| Sprint 5 | Medium | CRM plus collaboration foundation | Channel model competes with CRM | Keep collaboration to channel foundation only | No split expected |
| Sprint 6 | Critical | File security before approvals | Signed URL and approval flow collide | Enforce Step 1-3 sequencing | Split if file security is not stable by midpoint |
| Sprint 7 | High | Realtime authorization | Revocation and channel scope complexity | Prioritize internal/client channel separation | Split if realtime provider setup slips |
| Sprint 8 | High | AI/transcription quality | Provider and prompt injection risk | Benchmark provider before implementation | Split if transcription provider decision is late |
| Sprint 9 | Critical | Finance permissions and audit | Financial exposure risk | Owner-only first; client view second | Split if payment provider integration is added |
| Sprint 10 | High | Report privacy | Hidden aggregate leakage | Limit report set and enforce suppression | Split if exports are added |
| Sprint 11 | Critical | Regression, UAT, hardening | Too much validation in one sprint | Use Sprint 11A/11B sequencing | Split into two physical sprints if critical defects appear |
| Sprint 12 | High | RC stabilization | Scope creep into release candidate | Defect-only policy | Split only if release candidate fails go/no-go |
| Sprint 13 | Medium | Production launch | Pilot support and rollback readiness | Launch with narrow pilot tenant scope | No split expected unless production smoke fails |

### 58.8 Backlog Export Readiness

The backlog can be exported to Jira, Linear, or an equivalent delivery tool only after Phase 15 is approved and Sprint 0 decisions are assigned.

Export mapping:

| Backlog Field | Jira/Linear Mapping |
|---|---|
| Epic ID | Epic key or initiative |
| User story ID | Issue key / story key |
| Technical task | Task or sub-task |
| QA task | Test task or QA sub-task |
| Security task | Security-labeled task or blocking checklist item |
| Labels | MVP, MAOS, phase-15, epic ID, sprint, risk level, role |
| Priority | P0/P1/P2/P3 |
| Sprint | Suggested sprint field |
| Owner role | Assignee role or component owner |
| Risk level | Risk label or custom field |
| Acceptance criteria | Story acceptance field |
| QA requirement | QA checklist or linked test case |
| Security requirement | Security checklist or linked security test |
| Dependencies | Blocked by / blocks relationship |
| Status | Backlog, Ready, In Sprint, In Progress, QA, Done, Deferred |

Export rules:

- Do not export to Jira/Linear until Phase 15 is approved.
- Do not start Sprint 1 until Sprint 0 open decisions are assigned and blocking decisions are closed or explicitly time-boxed.
- Do not mark a story Ready if acceptance criteria, permission rule, negative test case, QA requirement, and audit/log requirement are missing.
- Do not export deferred non-MVP features into active MVP sprints.

### 58.9 Final Phase 15 Approval Validation

| Approval Condition | Validation Result |
|---|---|
| Sprint 0 decisions are mapped | Passed through Open Decisions Sprint 0 Matrix |
| Sprint 1 overload is resolved or split-ready | Passed through Sprint 1A/1B sequence and split rule |
| Sprint 6 sequencing is explicit | Passed through files-before-approvals sequence |
| Sprint 11 workload is controlled | Passed through Sprint 11A/11B sequence and RC handoff rule |
| Incremental regression exists for sensitive sprints | Passed through Incremental Regression Requirements |
| Technical setup tasks are sprint-ready | Passed through Technical Setup Task Matrix |
| No non-MVP scope was added | Passed; addendum clarifies delivery controls only |
| Backlog export readiness is defined | Passed through Jira/Linear export mapping and export rules |

Updated planning assessment:

| Metric | Updated Result |
|---|---|
| Backlog completeness | 97% |
| Sprint realism score | 94% |
| MVP delivery risk level | Medium |
| Phase 15 approval status | Approved, assuming Sprint 0 decisions are assigned before Sprint 1 begins |
