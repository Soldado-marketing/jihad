# MAOS Sprint 0 Execution Checklist

## MVP Project Setup & Architecture Readiness

**Platform:** Marketing Agency Operating System (MAOS)  
**Sprint:** Sprint 0  
**Sprint Type:** Execution checklist and planning document  
**Primary References:** MAOS Master Specification v1.0, Phase 13 MVP Roadmap, Phase 14 Technical Implementation Architecture, Phase 15 Product Backlog & Sprint Plan  
**Code Status:** No code, no SQL, no migrations, no implementation scripts  

---

## 1. Sprint 0 Objective

Sprint 0 establishes the implementation foundation for MAOS MVP before Sprint 1 begins. It must confirm architecture decisions, repository standards, environment strategy, CI/CD baseline, security baseline, tenant isolation standard, audit standard, QA evidence model, UX/UI baseline, DevOps baseline, and release governance.

Sprint 0 is successful when the team can start Sprint 1 with approved standards for:

- Tenant isolation.
- Invite-only identity foundation.
- Auth/session/device patterns.
- RBAC and permission guard patterns.
- Audit logging and redaction.
- Repository and branching standards.
- Environment and deployment baseline.
- QA evidence and security test baseline.
- Hotfix and rollback path.

---

## 2. Sprint 0 Scope

| Scope Area | Included In Sprint 0 |
|---|---|
| Architecture validation | Confirm modular monolith, module boundaries, REST-first API, tenant-aware service/repository pattern |
| Technical decisions | Close or assign all blocking decisions required before Sprint 1 |
| Repository standards | Define repository structure, branch policy, review standards, naming conventions |
| Frontend baseline | Establish Next.js, React, TypeScript, Tailwind, component system, routing, RTL/LTR foundation |
| Backend baseline | Establish NestJS structure, REST standards, validation, auth skeleton, permission guard skeleton, tenant resolver skeleton, audit skeleton |
| Database baseline | Establish PostgreSQL environment strategy, ORM choice, tenant_id policy, sensitive-table hardening plan |
| DevOps baseline | Establish Docker, CI/CD, environments, secrets, monitoring, backups, deployment region, hotfix path |
| Security baseline | Establish invite-only, no public registration, tenant isolation, permission, audit, client boundary, finance, AI, report privacy standards |
| QA baseline | Establish test strategy, evidence template, regression mapping, Sprint 1 readiness tests |
| UX/UI baseline | Establish design tokens, component baseline, workspace shell rules, RTL/LTR, accessibility baseline |
| Release governance | Establish go/no-go, rollback, hotfix, known issue, release evidence rules |

---

## 3. Sprint 0 Non-Scope

Sprint 0 must not build production feature workflows.

| Non-Scope Item | Reason |
|---|---|
| User-facing production auth implementation | Sprint 1 scope |
| Client portal implementation | Blocked until permission/audit foundation is approved |
| Project/task feature implementation | Sprint 3 scope |
| CRM implementation | Sprint 5 scope |
| File upload implementation | Sprint 6 scope |
| Chat/realtime implementation | Sprint 7 scope |
| Voice-to-task implementation | Sprint 8 scope |
| Finance implementation | Sprint 9 scope |
| Dashboards/reports implementation | Sprint 10 scope |
| Full automation builder | Non-MVP |
| Full payroll automation | Non-MVP |
| Advanced AI Analyst | Non-MVP |
| Advanced BI forecasting | Non-MVP |
| White-label tenant customization | Non-MVP |
| Native/full mobile app | Non-MVP |

---

## 4. Sprint 0 Roles and Owners

| Role | Sprint 0 Ownership |
|---|---|
| Product Owner | MVP scope confirmation, Sprint 1 readiness decision, product constraints |
| CTO | Final architecture approval, technical decision escalation, go/no-go ownership |
| Technical Program Manager | Sprint 0 coordination, checklist tracking, dependency management |
| Principal Software Architect | Architecture style, module boundaries, API conventions, repository standards |
| Frontend Lead | Frontend stack, route groups, RTL/LTR baseline, component system |
| Backend Lead | Backend stack, module skeletons, REST standards, validation, services |
| Database Architect | PostgreSQL strategy, ORM decision, tenant_id policy, data access baseline |
| Security Architect | Tenant isolation, permissions, audit, client boundary, sensitive controls |
| DevOps Architect | Environments, Docker, CI/CD, secrets, monitoring, backups, region |
| QA Lead | QA strategy, evidence template, Sprint 1 test readiness, regression baseline |
| Designer | UI baseline, component inventory, accessibility, RTL/LTR design checks |
| AI Systems Architect | AI/transcription provider shortlist and retention/security requirements |
| Finance Owner | Payment provider shortlist, Owner-only finance standard, finance audit requirements |
| Release Manager | Hotfix path, rollback baseline, release gates, deployment evidence |

---

## 5. Sprint 0 Required Decisions

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| D-001 | Hosting platform decision | CTO / DevOps Architect | Hosting ADR | Phase 14 deployment architecture | Managed Docker-capable platform or justified alternative selected | Blocking | Day 2 |
| D-002 | Repository structure decision | Principal Software Architect | Repository standard | Team structure | Monorepo vs multi-repo decision approved | Blocking | Day 1 |
| D-003 | Monorepo vs multi-repo decision | CTO / Principal Software Architect | Repository ADR | D-002 | Chosen structure supports frontend, backend, jobs, docs, tests | Blocking | Day 1 |
| D-004 | ORM choice | Database Architect / Principal Software Architect | ORM ADR | PostgreSQL strategy | Prisma or equivalent chosen with tenant-aware repository wrapper | Blocking | Day 2 |
| D-005 | PostgreSQL environment strategy | Database Architect / DevOps Architect | Database environment plan | Hosting decision | Local, QA, staging, production database strategy documented | Blocking | Day 3 |
| D-006 | Tenant hardening/RLS baseline | Database Architect / Security Architect | Tenant isolation baseline | ORM choice | tenant_id policy and targeted RLS/equivalent baseline approved | Blocking | Day 3 |
| D-007 | Realtime provider approach | Principal Software Architect / DevOps Architect | Realtime decision note | Phase 14 realtime architecture | WebSocket or managed realtime path selected or time-boxed | Non-blocking for Sprint 1 | Day 5 |
| D-008 | Object storage provider | DevOps Architect / Security Architect | Storage provider ADR | Hosting/region decision | S3-compatible provider path selected or approved placeholder documented | Non-blocking for Sprint 1 | Day 5 |
| D-009 | Email provider | DevOps Architect / Product Operations | Email provider note | Invite flow needs | Invitation email path selected or approved placeholder exists | Blocking | Day 3 |
| D-010 | Monitoring/logging provider | DevOps Architect | Observability ADR | Hosting decision | App, worker, frontend, queue monitoring baseline selected | Blocking | Day 4 |
| D-011 | Backup/restore provider or process | DevOps Architect / Database Architect | Backup/restore plan | PostgreSQL strategy | Backup and restore drill approach approved | Blocking before launch, required plan in Sprint 0 | Day 5 |
| D-012 | CI/CD platform | DevOps Architect / Release Manager | CI/CD baseline plan | Repository decision | Build/test/security/deploy gate path approved | Blocking | Day 3 |
| D-013 | Secrets management | DevOps Architect / Security Architect | Secrets management plan | Hosting decision | Secret storage, access, rotation, and environment rules documented | Blocking | Day 4 |
| D-014 | Deployment region | DevOps Architect / Owner | Region decision note | Pilot tenant profile | Primary region selected or decision gate assigned | Blocking before production, required assignment in Sprint 0 | Day 4 |
| D-015 | Payment provider shortlist | Finance Owner / CTO | Payment shortlist note | Pilot country/currency assumptions | Shortlist supports EUR, USD, AED, SAR or manual MVP fallback documented | Non-blocking for Sprint 1 | Day 5 |
| D-016 | AI provider shortlist | AI Systems Architect / Security Architect | AI provider shortlist | AI retention/security rules | Provider shortlist includes retention, no unauthorized training, data handling notes | Non-blocking for Sprint 1 | Day 5 |
| D-017 | Transcription provider shortlist | AI Systems Architect | Transcription shortlist | AI provider shortlist | Arabic, English, German, mixed-language evaluation plan exists | Non-blocking for Sprint 1 | Day 5 |
| D-018 | Report export MVP decision | Product Owner / Security Architect | Report export scope note | Reporting privacy rules | Export deferred or limited MVP scope approved | Non-blocking for Sprint 1 | Day 5 |
| D-019 | Hotfix path | Release Manager / CTO | Hotfix and rollback baseline | Release governance | Hotfix classification, approval owner, minimum tests, rollback and audit rules approved | Blocking | Day 5 |

---

## 6. Sprint 0 ADR List

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| ADR-001 | Architecture style: modular monolith | CTO / Principal Software Architect | ADR-001 | Master/Phase 14 | Modular monolith approved with module boundaries and post-MVP expansion path | Blocking | Day 1 |
| ADR-002 | Frontend stack | Frontend Lead | ADR-002 | Approved stack | Next.js, React, TypeScript, Tailwind, shadcn/ui or equivalent documented | Blocking | Day 2 |
| ADR-003 | Backend stack | Backend Lead | ADR-003 | Approved stack | NestJS, Node.js, TypeScript, REST-first baseline documented | Blocking | Day 2 |
| ADR-004 | Database and tenant isolation strategy | Database Architect / Security Architect | ADR-004 | D-004, D-006 | PostgreSQL, tenant_id, tenant-aware repositories, targeted RLS/equivalent baseline documented | Blocking | Day 3 |
| ADR-005 | ORM/data access strategy | Database Architect / Principal Software Architect | ADR-005 | D-004 | ORM choice and repository/service pattern approved | Blocking | Day 3 |
| ADR-006 | API style: REST-first | Backend Lead | ADR-006 | ADR-003 | Resource conventions, DTO validation, error model, pagination approach approved | Blocking | Day 3 |
| ADR-007 | File storage strategy | DevOps Architect / Backend Lead | ADR-007 | D-008 | S3-compatible storage, signed URL policy, versioning assumptions documented | Non-blocking for Sprint 1 | Day 5 |
| ADR-008 | Realtime strategy | Principal Software Architect / DevOps Architect | ADR-008 | D-007 | WebSocket/managed realtime path, auth, revocation, channel authorization documented | Non-blocking for Sprint 1 | Day 5 |
| ADR-009 | Queue/jobs strategy | Backend Lead / DevOps Architect | ADR-009 | CI/CD and environment plan | Redis/BullMQ or equivalent, retry/dead-letter, tenant/actor context documented | Non-blocking for Sprint 1 | Day 5 |
| ADR-010 | AI/transcription provider strategy | AI Systems Architect / Security Architect | ADR-010 | D-016, D-017 | Provider shortlist, retention/security, language benchmark, human approval rules documented | Non-blocking for Sprint 1 | Day 5 |
| ADR-011 | Deployment and environment strategy | DevOps Architect | ADR-011 | D-001, D-014 | Local, QA, staging, UAT, production, demo/sandbox plan documented | Blocking | Day 4 |
| ADR-012 | Observability and monitoring strategy | DevOps Architect | ADR-012 | D-010 | Logs, metrics, errors, queue monitoring, uptime checks baseline documented | Blocking | Day 4 |
| ADR-013 | Backup and recovery strategy | DevOps Architect / Database Architect | ADR-013 | D-011 | Backup cadence, restore drill, object storage backup/versioning documented | Blocking before production, plan required | Day 5 |
| ADR-014 | Security baseline and audit strategy | Security Architect | ADR-014 | D-006 | Invite-only, no public registration, RBAC, audit schema/redaction, sensitive controls documented | Blocking | Day 4 |
| ADR-015 | Hotfix and rollback strategy | Release Manager / CTO | ADR-015 | D-019 | Hotfix classes, approvers, minimum tests, rollback triggers, post-hotfix audit documented | Blocking | Day 5 |

---

## 7. Sprint 0 Technical Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| TECH-001 | Confirm modular monolith module map | Principal Software Architect | Module boundary map | ADR-001 | MVP modules and ownership boundaries are documented | Blocking | Day 2 |
| TECH-002 | Define service/repository layering standard | Principal Software Architect / Backend Lead | Layering standard | ADR-004, ADR-005 | Controllers, services, tenant-aware repositories, guards, workers path documented | Blocking | Day 3 |
| TECH-003 | Define tenant context propagation standard | Security Architect / Backend Lead | Tenant context standard | D-006 | Request, job, realtime, report, AI context rules documented | Blocking | Day 3 |
| TECH-004 | Define audit event taxonomy | Security Architect / Backend Lead | Audit event standard | ADR-014 | Actor, tenant, resource, action, permission result, outcome, timestamp fields documented | Blocking | Day 4 |
| TECH-005 | Define API contract standards | Backend Lead | API standards document | ADR-006 | REST resource naming, validation, error model, status handling approved | Blocking | Day 3 |
| TECH-006 | Define branch and review standards | Technical Program Manager / CTO | Repository standard | D-002 | Branch policy, review rules, protected branches, PR checks documented | Blocking | Day 2 |
| TECH-007 | Define MVP feature flag policy | Release Manager / Backend Lead | Feature flag policy | Release governance | MVP-only flags, disabled non-MVP features, rollback controls documented | Non-blocking | Day 5 |
| TECH-008 | Define documentation structure | Technical Program Manager | Documentation index | Repository standard | ADRs, checklists, QA evidence, release notes locations documented | Non-blocking | Day 3 |

---

## 8. Sprint 0 Frontend Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| FE-001 | Confirm Next.js app setup standard | Frontend Lead | Frontend setup note | ADR-002 | App structure and routing conventions are approved | Blocking | Day 2 |
| FE-002 | Confirm React/TypeScript baseline | Frontend Lead | TypeScript/frontend standard | ADR-002 | Strictness, linting, component conventions documented | Blocking | Day 2 |
| FE-003 | Confirm Tailwind CSS baseline | Frontend Lead / Designer | Styling baseline | ADR-002 | Design tokens and styling conventions documented | Blocking | Day 3 |
| FE-004 | Confirm shadcn/ui or equivalent component baseline | Frontend Lead / Designer | Component baseline | FE-003 | Core component system and usage rules documented | Blocking | Day 3 |
| FE-005 | Define route group structure | Frontend Lead / Security Architect | Route structure note | Security baseline | Internal and client routes are separated and permission-aware | Blocking | Day 4 |
| FE-006 | Define role-aware navigation pattern | Frontend Lead / Security Architect | Navigation standard | FE-005 | Navigation visibility and denied-state behavior documented | Blocking | Day 4 |
| FE-007 | Define Arabic RTL and English/German LTR baseline | Designer / Frontend Lead | RTL/LTR checklist | FE-003 | Directionality, layout mirroring, text alignment rules documented | Blocking | Day 4 |
| FE-008 | Define frontend environment config approach | Frontend Lead / DevOps Architect | Frontend env note | Environment plan | Environment-specific variables and safe exposure rules documented | Blocking | Day 4 |
| FE-009 | Define frontend error tracking baseline | DevOps Architect / Frontend Lead | Frontend monitoring note | Monitoring provider decision | Error capture path and privacy rules documented | Non-blocking | Day 5 |

---

## 9. Sprint 0 Backend Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| BE-001 | Confirm NestJS application setup standard | Backend Lead | Backend setup note | ADR-003 | Module and provider conventions documented | Blocking | Day 2 |
| BE-002 | Define modular backend structure | Principal Software Architect / Backend Lead | Backend module map | ADR-001, ADR-003 | Identity, projects, client portal, CRM, collaboration, files, AI, finance, reporting, audit modules mapped | Blocking | Day 3 |
| BE-003 | Define REST API standards | Backend Lead | REST API standard | ADR-006 | Routes, DTOs, errors, pagination, filtering rules documented | Blocking | Day 3 |
| BE-004 | Define DTO validation baseline | Backend Lead / QA Lead | Validation standard | BE-003 | Validation rules and failure response standards documented | Blocking | Day 3 |
| BE-005 | Define auth module skeleton scope | Backend Lead / Security Architect | Auth skeleton plan | ADR-014 | Invite-only, login, session, device, login history boundaries documented | Blocking | Day 4 |
| BE-006 | Define permission guard skeleton scope | Security Architect / Backend Lead | Permission guard plan | ADR-014 | Route guard plus service-level resource scope validation documented | Blocking | Day 4 |
| BE-007 | Define tenant resolver skeleton scope | Principal Software Architect / Backend Lead | Tenant resolver plan | D-006 | Tenant context resolution and propagation rules documented | Blocking | Day 4 |
| BE-008 | Define audit service skeleton scope | Backend Lead / Security Architect | Audit service plan | TECH-004 | Audit service responsibilities, redaction, access restrictions documented | Blocking | Day 4 |
| BE-009 | Define background worker service path | Backend Lead / DevOps Architect | Worker service standard | ADR-009 | Workers must use same service/permission path as API where sensitive | Non-blocking for Sprint 1 | Day 5 |

---

## 10. Sprint 0 Database Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| DB-001 | Define PostgreSQL environment strategy | Database Architect / DevOps Architect | PostgreSQL environment plan | D-001 | Local/dev/QA/staging/production database approach documented | Blocking | Day 3 |
| DB-002 | Confirm ORM/data access strategy | Database Architect / Principal Software Architect | ORM ADR | D-004 | ORM choice and repository wrapper approved | Blocking | Day 3 |
| DB-003 | Define tenant-aware repository baseline | Database Architect / Backend Lead | Repository baseline | DB-002 | Tenant context required for tenant-owned data access | Blocking | Day 3 |
| DB-004 | Define tenant_id policy | Database Architect / Security Architect | tenant_id policy | D-006 | Tenant-owned tables must include tenant_id or approved equivalent | Blocking | Day 3 |
| DB-005 | Define sensitive-table hardening plan | Database Architect / Security Architect | Sensitive table hardening note | D-006 | Audit, finance, files, chat, AI logs, reports, sessions, permissions hardening targets listed | Blocking | Day 4 |
| DB-006 | Define migration governance process | Database Architect / Release Manager | Migration governance plan | DB-002 | Review, rollback, backup, environment promotion, and approval process documented | Blocking | Day 4 |
| DB-007 | Define seed/test data strategy | QA Lead / Database Architect | Test data plan | QA baseline | Test tenants, roles, clients, projects, permissions, client visibility fixtures documented | Blocking | Day 5 |
| DB-008 | Define indexing review process | Database Architect | Indexing checklist | Phase 2 database summary | Index review required for tenant, foreign key, search, report, audit-heavy access paths | Non-blocking | Day 5 |

---

## 11. Sprint 0 DevOps Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| DEVOPS-001 | Define Docker local environment | DevOps Architect | Docker local plan | Repository decision | App, API, database, queue, and storage placeholders are included in setup plan | Blocking | Day 3 |
| DEVOPS-002 | Define Docker deployable services | DevOps Architect | Deployment service plan | Hosting decision | Deployable service boundaries documented | Blocking | Day 4 |
| DEVOPS-003 | Define QA/staging/UAT/production environments | DevOps Architect / QA Lead | Environment plan | ADR-011 | Environment purpose, data rules, access rules, refresh/reset approach documented | Blocking | Day 4 |
| DEVOPS-004 | Define CI/CD baseline | DevOps Architect / Release Manager | CI/CD baseline plan | Repository decision | Build, test, security scan, deploy gate, rollback gate documented | Blocking | Day 4 |
| DEVOPS-005 | Define secrets management | DevOps Architect / Security Architect | Secrets management plan | Hosting decision | Secret storage, access, rotation, audit, environment separation documented | Blocking | Day 4 |
| DEVOPS-006 | Define monitoring/logging baseline | DevOps Architect | Monitoring/logging baseline | D-010 | App, frontend, worker, queue, uptime, error tracking baseline documented | Blocking | Day 5 |
| DEVOPS-007 | Define backup/restore process | DevOps Architect / Database Architect | Backup/restore plan | D-011 | Backup cadence, restore drill, RPO/RTO placeholders, object storage assumptions documented | Blocking | Day 5 |
| DEVOPS-008 | Define deployment region baseline | DevOps Architect / Owner | Region note | D-014 | Region selected or decision deadline and risk accepted | Blocking before production, assignment required | Day 4 |
| DEVOPS-009 | Define hotfix path setup | Release Manager / CTO | Hotfix path document | ADR-015 | Classification, approvers, minimum tests, rollback, audit, communication documented | Blocking | Day 5 |

---

## 12. Sprint 0 Security Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| SEC-001 | Define invite-only access standard | Security Architect / Product Owner | Invite-only standard | Master critical rules | No public registration rule documented and mapped to Sprint 1 tests | Blocking | Day 3 |
| SEC-002 | Define tenant isolation baseline | Security Architect / Database Architect | Tenant isolation baseline | D-006 | Tenant resolver, tenant-aware repositories, tenant_id policy, sensitive hardening documented | Blocking | Day 3 |
| SEC-003 | Define RBAC and custom permission foundation | Security Architect | Permission baseline | ADR-014 | Owner/Manager/Employee/Client role model and custom permission extension pattern documented | Blocking | Day 4 |
| SEC-004 | Define service-level resource scope validation | Security Architect / Backend Lead | Scope validation standard | BE-006 | Sensitive operations require guard plus service-level scope check | Blocking | Day 4 |
| SEC-005 | Define audit logging baseline | Security Architect / Backend Lead | Audit baseline | TECH-004 | Required fields, append-only policy, correction event, owner/security access documented | Blocking | Day 4 |
| SEC-006 | Define audit redaction baseline | Security Architect | Audit redaction checklist | SEC-005 | Raw secrets, full payment data, sensitive AI prompts, unnecessary file/chat/voice content excluded | Blocking | Day 4 |
| SEC-007 | Define client portal boundary standard | Security Architect / Product Owner | Client boundary rules | Master/Phase 13 | Client-visible, own-client-only, internal exclusion rules documented | Blocking before client portal, required in Sprint 0 | Day 5 |
| SEC-008 | Define Owner-only finance standard | Security Architect / Finance Owner | Finance security standard | Phase 8/Phase 13 | Owner-only default, client own invoice/payment visibility, audit requirements documented | Blocking before finance, required in Sprint 0 | Day 5 |
| SEC-009 | Define AI provider security requirements | Security Architect / AI Systems Architect | AI security checklist | Phase 9/Phase 14 | Retention, no unauthorized training, prompt injection, permission gateway, human approval rules documented | Blocking before AI, required in Sprint 0 | Day 5 |
| SEC-010 | Define report privacy/export standard | Security Architect / Product Owner | Report privacy baseline | Phase 11/Phase 13 | Hidden count/total suppression and export decision gate documented | Blocking before reports, required in Sprint 0 | Day 5 |
| SEC-011 | Define file signed URL security rules | Security Architect / Backend Lead | Signed URL security note | ADR-007 | Permission check, short TTL, minimal payload, audit requirements documented | Non-blocking for Sprint 1 | Day 5 |
| SEC-012 | Define realtime authorization baseline | Security Architect / Principal Software Architect | Realtime security note | ADR-008 | Subscription auth, membership check, session revocation behavior documented | Non-blocking for Sprint 1 | Day 5 |

---

## 13. Sprint 0 QA Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| QA-001 | Define MVP QA strategy | QA Lead | QA strategy note | Phase 12/Phase 15 | Functional, permission, security, client, finance, AI, reporting, release test categories documented | Blocking | Day 3 |
| QA-002 | Define QA evidence template | QA Lead | QA evidence template | Phase 12 | Evidence ID, test case, tester, environment, role, expected/actual, logs, screenshots, result fields included | Blocking | Day 3 |
| QA-003 | Define Sprint 1 test plan | QA Lead / Security Architect | Sprint 1 test plan | E1 scope | Invite, no-public-registration, session, device, RBAC, audit tests listed | Blocking | Day 4 |
| QA-004 | Define permission test matrix baseline | QA Lead / Security Architect | Permission test matrix | SEC-003 | Owner/Manager/Employee/Client allowed and denied actions documented | Blocking | Day 4 |
| QA-005 | Define tenant isolation test baseline | QA Lead / Security Architect | Tenant isolation test plan | SEC-002 | Cross-tenant denial test approach documented | Blocking | Day 4 |
| QA-006 | Define client visibility test baseline | QA Lead / Product Owner | Client visibility test plan | SEC-007 | Own-client-only and internal data exclusion tests documented | Blocking before client portal, required in Sprint 0 | Day 5 |
| QA-007 | Define finance security test baseline | QA Lead / Finance Owner | Finance test plan | SEC-008 | Owner-only and client own invoice/payment test approach documented | Blocking before finance, required in Sprint 0 | Day 5 |
| QA-008 | Define AI safety test baseline | QA Lead / AI Systems Architect | AI safety test plan | SEC-009 | Prompt injection, permission, retention, human approval test approach documented | Blocking before AI, required in Sprint 0 | Day 5 |
| QA-009 | Define report privacy test baseline | QA Lead / Security Architect | Report privacy test plan | SEC-010 | Hidden count/total suppression and export tests documented | Blocking before reports, required in Sprint 0 | Day 5 |
| QA-010 | Define regression cadence | QA Lead | Incremental regression plan | Phase 15 | Sensitive sprint regression expectations mapped to sprints | Blocking | Day 5 |

---

## 14. Sprint 0 UX/UI Setup Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| UX-001 | Define MVP design system baseline | Designer / Frontend Lead | Design system baseline | Phase 5/Phase 13 | Tokens, typography, spacing, color, component usage baseline documented | Blocking | Day 3 |
| UX-002 | Define core component inventory | Designer / Frontend Lead | Component inventory | UX-001 | Buttons, forms, tables, modals, tabs, menus, status badges, empty states listed | Blocking | Day 3 |
| UX-003 | Define workspace shell baseline | Designer / Product Owner | Workspace shell checklist | Phase 5 | Sidebar, topbar, navigation, settings, user menu, denied states documented | Blocking | Day 4 |
| UX-004 | Define client portal UI safety baseline | Designer / Security Architect | Client portal UI rules | SEC-007 | Client-safe data display, hidden states, denied states documented | Blocking before client portal, required in Sprint 0 | Day 5 |
| UX-005 | Define Arabic RTL baseline | Designer / Frontend Lead | Arabic RTL checklist | FE-007 | RTL layout mirroring, alignment, truncation, forms, navigation rules documented | Blocking | Day 4 |
| UX-006 | Define English/German LTR baseline | Designer / Frontend Lead | LTR checklist | FE-007 | LTR rules and German text expansion handling documented | Blocking | Day 4 |
| UX-007 | Define accessibility baseline | Designer / QA Lead | Accessibility checklist | Phase 12 | Keyboard, contrast, labels, focus states, form errors baseline documented | Blocking | Day 5 |
| UX-008 | Define Sprint 1 UX scope | Designer / Product Owner | Sprint 1 UX brief | Sprint 1 scope | Login, invite acceptance, setup, denied states wireframe requirements documented | Blocking | Day 5 |

---

## 15. Sprint 0 Documentation Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Target Completion Within Sprint 0 |
|---|---|---|---|---|---|---|---|
| DOC-001 | Create architecture decision log | Technical Program Manager | ADR index | ADR list | All ADRs listed with owner, status, due date | Blocking | Day 1 |
| DOC-002 | Create repository standard | Principal Software Architect | Repository standard document | D-002 | Structure, naming, branch policy, PR review rules documented | Blocking | Day 2 |
| DOC-003 | Create environment plan | DevOps Architect | Environment plan | DEVOPS-003 | Local/dev/QA/staging/UAT/production strategy documented | Blocking | Day 4 |
| DOC-004 | Create CI/CD baseline plan | DevOps Architect / Release Manager | CI/CD plan | DEVOPS-004 | Build, test, security scan, deploy, rollback gates documented | Blocking | Day 4 |
| DOC-005 | Create permission/audit implementation standard | Security Architect / Backend Lead | Permission/audit standard | SEC-003, SEC-005 | Guard, scope validation, audit event/redaction rules documented | Blocking | Day 5 |
| DOC-006 | Create QA evidence template | QA Lead | QA evidence template | QA-002 | Template approved for Sprint 1 use | Blocking | Day 3 |
| DOC-007 | Create security baseline checklist | Security Architect | Security checklist | SEC-001 to SEC-012 | Security setup checklist approved | Blocking | Day 5 |
| DOC-008 | Create UX/UI baseline checklist | Designer | UX/UI checklist | UX-001 to UX-008 | Design and accessibility baseline approved | Blocking | Day 5 |
| DOC-009 | Create DevOps deployment baseline | DevOps Architect | DevOps baseline | DEVOPS-001 to DEVOPS-009 | Environment, deploy, monitoring, backup, hotfix paths documented | Blocking | Day 5 |
| DOC-010 | Create Sprint 1 readiness decision record | Technical Program Manager / CTO | Sprint 1 readiness note | All blocking Sprint 0 items | Go/no-go decision documented | Blocking | Day 5 |

---

## 16. Sprint 0 Open Decisions Matrix

| Decision | Owner | Deadline | Risk If Unresolved | Required Artifact | Sprint 1 Impact |
|---|---|---|---|---|---|
| Hosting platform | CTO / DevOps Architect | Day 2 | CI/CD and environment drift | Hosting ADR | Blocks environment setup if unresolved |
| Repository structure | Principal Software Architect | Day 1 | Team cannot align on delivery workflow | Repository standard | Blocks all setup tasks |
| Monorepo vs multi-repo | CTO / Principal Software Architect | Day 1 | Fragmented standards and tooling | Repository ADR | Blocks Sprint 0 technical setup |
| ORM choice | Database Architect / Principal Software Architect | Day 2 | Data access and tenant repository drift | ORM ADR | Blocks tenant-aware repository baseline |
| PostgreSQL environment strategy | Database Architect / DevOps Architect | Day 3 | Database setup and QA data delays | PostgreSQL environment plan | Blocks Sprint 1 data foundation |
| Tenant hardening/RLS baseline | Security Architect / Database Architect | Day 3 | Tenant leakage and failed security gate | Tenant isolation baseline | Blocks Sprint 1B |
| Realtime provider approach | Principal Software Architect / DevOps Architect | Day 5 | Later chat/realtime delay | Realtime decision note | Does not block Sprint 1 |
| Object storage provider | DevOps Architect / Security Architect | Day 5 | Later file sprint delay | Storage ADR | Does not block Sprint 1 |
| Email provider | DevOps Architect / Product Operations | Day 3 | Invite flow cannot be tested | Email provider note | Blocks invitation testing |
| Monitoring/logging provider | DevOps Architect | Day 4 | Silent failures in Sprint 1 | Observability ADR | Blocks Sprint 1 observability readiness |
| Backup/restore provider or process | DevOps Architect / Database Architect | Day 5 | Recovery path unverified | Backup/restore plan | Does not block Sprint 1 if plan exists |
| CI/CD platform | DevOps Architect / Release Manager | Day 3 | Uncontrolled builds and releases | CI/CD plan | Blocks quality gates |
| Secrets management | DevOps Architect / Security Architect | Day 4 | Secret leakage | Secrets plan | Blocks environment readiness |
| Deployment region | DevOps Architect / Owner | Day 4 | Data residency or latency risk | Region note | Does not block Sprint 1 if assigned |
| Payment provider shortlist | Finance Owner / CTO | Day 5 | Later finance delay | Payment shortlist | Does not block Sprint 1 |
| AI provider shortlist | AI Systems Architect / Security Architect | Day 5 | Later AI delay | AI shortlist | Does not block Sprint 1 |
| Transcription provider shortlist | AI Systems Architect | Day 5 | Later voice-to-task quality risk | Transcription shortlist | Does not block Sprint 1 |
| Report export MVP decision | Product Owner / Security Architect | Day 5 | Later report scope creep | Report export decision | Does not block Sprint 1 |
| Hotfix path | Release Manager / CTO | Day 5 | Unsafe production fix process | Hotfix/rollback baseline | Blocks release governance readiness |

---

## 17. Sprint 0 Risk Register

| Risk ID | Risk | Severity | Owner | Mitigation | Blocking Trigger |
|---|---|---|---|---|---|
| R0-001 | Open technical decisions spill into Sprint 1 | High | Technical Program Manager | Daily decision tracking and CTO escalation | Blocking decisions unresolved by Day 5 |
| R0-002 | Tenant isolation baseline is vague | Critical | Security Architect / Database Architect | Approve tenant_id policy, tenant-aware repository standard, targeted RLS/equivalent plan | No approved tenant isolation baseline |
| R0-003 | Permission/audit standards are not ready | Critical | Security Architect / Backend Lead | Approve guard, scope validation, audit event/redaction standards | No Sprint 1 permission/audit standard |
| R0-004 | Email provider path blocks invite testing | High | DevOps Architect / Product Operations | Select provider or approved placeholder | No invite email path by Day 3 |
| R0-005 | Repository structure decision delays all setup | High | Principal Software Architect | Decide monorepo/multi-repo on Day 1 | No repo decision by Day 1 |
| R0-006 | CI/CD baseline is incomplete | High | DevOps Architect / Release Manager | Define build, test, security scan, deploy gate plan | No CI/CD plan by Day 4 |
| R0-007 | QA evidence model is missing | High | QA Lead | Approve evidence template and Sprint 1 test plan | No QA evidence template |
| R0-008 | Client boundary rules are deferred | High | Security Architect / Product Owner | Document client-safe rules even before client portal build | No client boundary baseline by Day 5 |
| R0-009 | Finance security rules are deferred | High | Finance Owner / Security Architect | Approve Owner-only finance standard in Sprint 0 | No finance security baseline by Day 5 |
| R0-010 | Hotfix and rollback path is missing | High | Release Manager / CTO | Approve hotfix/rollback baseline | No hotfix/rollback baseline by Day 5 |

---

## 18. Sprint 0 Deliverables

| Deliverable | Owner | Acceptance Standard |
|---|---|---|
| Architecture decision log | Technical Program Manager | All ADRs listed with owner, status, due date |
| Approved stack decision | CTO | Frontend, backend, database, storage, jobs, realtime, AI, deployment baselines confirmed |
| Repository standard | Principal Software Architect | Structure, branch, review, naming, and documentation rules approved |
| Environment plan | DevOps Architect | Local/dev/QA/staging/UAT/production strategy approved |
| CI/CD baseline plan | DevOps Architect / Release Manager | Build, test, security scan, deploy and rollback gates documented |
| Secrets management plan | DevOps Architect / Security Architect | Secret access, rotation, environment separation approved |
| Tenant isolation baseline | Security Architect / Database Architect | tenant_id, tenant-aware repository, targeted hardening baseline approved |
| Permission/audit implementation standard | Security Architect / Backend Lead | Guard, service scope validation, audit event, redaction standards approved |
| QA evidence template | QA Lead | Evidence capture ready for Sprint 1 tests |
| Security baseline checklist | Security Architect | Invite-only, RBAC, tenant, client, finance, AI, report privacy controls documented |
| UX/UI baseline checklist | Designer | Design system, RTL/LTR, accessibility, workspace shell baseline approved |
| DevOps deployment baseline | DevOps Architect | Docker, deployment, monitoring, backup, restore, hotfix paths documented |
| Monitoring/logging baseline | DevOps Architect | Frontend, backend, worker, queue, uptime monitoring baseline approved |
| Backup/restore plan | DevOps Architect / Database Architect | Backup process and restore drill plan documented |
| Hotfix/rollback baseline | Release Manager / CTO | Hotfix classes, approvers, minimum tests, rollback, post-hotfix audit documented |
| Sprint 1 readiness decision | CTO / Product Owner / QA Lead / Security Architect | Go/no-go decision recorded |

---

## 19. Sprint 0 Exit Criteria

Sprint 0 may close only when all blocking items are complete or explicitly escalated with accepted risk.

| Exit Criterion | Required Result |
|---|---|
| Architecture style approved | ADR-001 complete |
| Frontend/backend/database stack approved | ADR-002, ADR-003, ADR-004, ADR-005 complete |
| Repository standard approved | Repository standard complete |
| Environment strategy approved | ADR-011 and environment plan complete |
| CI/CD baseline approved | CI/CD baseline plan complete |
| Secrets management approved | Secrets plan complete |
| Tenant isolation baseline approved | Tenant resolver, tenant_id policy, tenant-aware repository, hardening plan complete |
| Auth/session/device standard approved | Auth skeleton scope and Sprint 1 plan complete |
| Permission/audit implementation standard approved | Guard, resource scope validation, audit event/redaction standard complete |
| QA evidence template approved | QA evidence template ready for Sprint 1 |
| Security baseline checklist approved | Invite-only, no public registration, tenant, RBAC, audit, client, finance, AI, report privacy baselines complete |
| UX/UI baseline approved | Design system, RTL/LTR, accessibility, workspace shell checklist complete |
| DevOps baseline approved | Docker, environments, monitoring, backup, hotfix/rollback baseline complete |
| Open decisions assigned | Each decision has owner, deadline, artifact, and risk |
| Sprint 1 readiness decision recorded | Go/no-go complete |

---

## 20. Sprint 0 Go/No-Go Gate

### Go Criteria

Sprint 1 may start only if:

- Tenant isolation baseline is approved.
- Auth/session/device implementation standard is approved.
- Permission guard and service-level scope validation standards are approved.
- Audit logging and redaction standards are approved.
- Invite-only and no-public-registration rules are approved.
- Repository, environment, CI/CD, and secrets standards are approved.
- QA evidence template and Sprint 1 test plan are approved.
- Blocking open decisions have owners, deadlines, risks, and artifacts.

### No-Go Criteria

Sprint 1 must not start if:

- Tenant isolation baseline is missing or vague.
- Permission/audit standards are incomplete.
- Repository structure is unresolved.
- CI/CD baseline is missing.
- Secrets management is undefined.
- QA evidence template is missing.
- Invite-only/no-public-registration standard is missing.
- Email provider path or approved invite testing fallback is missing.

### Conditional Go

Conditional go is allowed only when:

- The unresolved item does not block Sprint 1 identity, tenant, auth, permission, audit, QA, or environment work.
- The unresolved item has a named owner, deadline, risk, escalation path, and artifact.
- CTO, QA Lead, and Security Architect accept the risk in the Sprint 1 readiness decision.

---

## 21. Sprint 0 Handoff To Sprint 1

Sprint 0 hands Sprint 1 an approved foundation for Identity, Tenants, Permissions, and Audit.

| Sprint 1 Workstream | Required Sprint 0 Handoff |
|---|---|
| Tenant resolver | Tenant context standard, tenant_id policy, repository baseline |
| Invitation flow | Email provider path, no-public-registration standard, invitation data rules |
| User/membership model | Repository standard, database strategy, tenant membership rules |
| Session basics | Auth/session/device standard, secrets plan, login history requirements |
| RBAC guard | Permission baseline, route guard pattern, service scope validation standard |
| Resource scope checks | Tenant-aware repository pattern and permission drift review requirement |
| Audit service baseline | Audit event taxonomy, redaction checklist, append-only policy |
| Sprint 1 QA | QA evidence template, Sprint 1 test plan, permission matrix baseline |
| Sprint 1 security | Security baseline checklist, tenant isolation test approach, audit validation approach |
| Sprint 1 release governance | CI/CD baseline, hotfix/rollback baseline, monitoring/logging baseline |

Sprint 1 readiness statement:

Sprint 1 is ready only when the Product Owner, CTO, QA Lead, Security Architect, Backend Lead, Database Architect, and DevOps Architect agree that Sprint 0 has produced the required standards and that no blocking decision remains unresolved.

---

## 22. Sprint 0 Critical Rules

| Rule ID | Critical Rule | Enforcement |
|---|---|---|
| CR-001 | Sprint 1 cannot start until tenant isolation, auth, permission, and audit implementation standards are approved. | Enforced by Sprint 0 Go/No-Go Gate |
| CR-002 | No client portal work can start until client boundary rules are approved. | Enforced by Security Architect before Sprint 4 planning |
| CR-003 | No finance work can start until Owner-only finance rules and audit requirements are approved. | Enforced by Finance Owner and Security Architect before Sprint 9 planning |
| CR-004 | No AI work can start until provider evaluation and retention/security requirements are approved. | Enforced by AI Systems Architect and Security Architect before Sprint 8 planning |
| CR-005 | No report/export work can start until report privacy and export decision are approved. | Enforced by Product Owner and Security Architect before Sprint 10 planning |
| CR-006 | Open technical decisions must have owner, deadline, risk, and artifact. | Enforced by Technical Program Manager during Sprint 0 decision tracking |
| CR-007 | Do not include code in Sprint 0 documentation outputs. | Enforced by planning/documentation review |
| CR-008 | Do not include SQL in Sprint 0 documentation outputs. | Enforced by planning/documentation review |
| CR-009 | Do not include migrations in Sprint 0 documentation outputs. | Enforced by planning/documentation review |
| CR-010 | Checklist and planning document only. | Enforced by Sprint 0 scope control |

---

## Final Sprint 0 Statement

Sprint 0 is the control point that prevents MAOS MVP from starting implementation with unclear architecture, weak tenant isolation, incomplete permissions, missing audit standards, or ungoverned release processes. Sprint 1 must not begin until Sprint 0 has produced the required decision artifacts, baselines, checklists, and go/no-go approval.
