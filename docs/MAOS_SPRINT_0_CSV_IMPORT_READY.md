# MAOS Sprint 0 CSV Import Ready

## 1. CSV Import Overview

**Platform:** Marketing Agency Operating System (MAOS)  
**Sprint:** Sprint 0  
**Source Export:** MAOS_SPRINT_0_JIRA_LINEAR_TASK_EXPORT.md  
**Output Type:** CSV-ready markdown import document  
**Task Source Rule:** Only primary day task tables are included.  
**Excluded Views:** Blocking Decision Tasks, ADR Tasks, Security Gate Tasks, QA Gate Tasks, DevOps Gate Tasks, and Sprint 1 Gate Tasks are not imported as tasks.  
**Code Status:** No code, no SQL, no migrations, no implementation scripts.

This document is designed for clean manual import or CSV conversion into Jira, Linear, ClickUp, Notion, or similar delivery tools. Every CSV field is quoted to preserve commas, slashes, labels, and gate descriptions safely.

---

## 2. CSV Field Mapping

| CSV Column | Source Field | Import Purpose |
|---|---|---|
| Task ID | Task ID | External issue key or custom ID |
| Title | Title | Issue title |
| Description | Description | Issue body or description |
| Day | Day | Sprint 0 target day |
| Workstream | Workstream | Functional lane or team area |
| Owner Role | Owner Role | Role placeholder before assigning named owner |
| Priority | Priority | P0/P1/P2 import priority |
| Blocking Status | Blocking Status | Blocking, Non-blocking, or Gate |
| Dependency | Dependency | Linked prerequisite or blocker note |
| Required Output | Required Output | Deliverable artifact |
| Acceptance Criteria | Acceptance Criteria | Completion criteria |
| Risk If Missed | Risk If Missed | Risk field or issue note |
| Escalation Trigger | Escalation Trigger | Escalation rule |
| Labels | Labels | Semicolon-separated import labels |
| Suggested Status | Suggested Status | Initial workflow state |
| Sprint | Sprint | Sprint assignment |
| Gate Impact | Gate Impact | Sprint 1 or later gate impact |

---

## 3. Duplicate Prevention Rules

| Rule | Requirement |
|---|---|
| Primary source only | Import only rows from Day 1 through Day 5B task tables. |
| No special views | Do not import rows from Blocking Decision Tasks, ADR Tasks, Security Gate Tasks, QA Gate Tasks, DevOps Gate Tasks, or Sprint 1 Gate Tasks. |
| Unique task IDs | Treat Task ID as the unique external key. |
| Views become filters | Recreate special views as saved filters using labels and Task IDs, not as new tasks. |
| Gate tasks are primary tasks | Day 5B gate rows are valid primary tasks and should be imported once. |
| ADR tasks are primary only when daily | ADR rows in Day 1-Day 5A are valid primary tasks. ADR view rows are not imported. |
| Labels preserved | Keep labels exactly as semicolon-separated values. |
| Owner field | Import Owner Role as text until a named owner is assigned. |

---

## 4. Primary Task Source Tables

| Source Table | Included | Task Count | Notes |
|---|---:|---:|---|
| Day 1 Tasks | Yes | 5 | Repository and architecture foundation |
| Day 2 Tasks | Yes | 10 | Stack and module architecture |
| Day 3 Tasks | Yes | 21 | Database, tenant, API, QA, invite-only foundation |
| Day 4A Tasks | Yes | 10 | Security, DevOps, backend readiness |
| Day 4B Tasks | Yes | 7 | UX, API, frontend readiness |
| Day 5A Tasks | Yes | 10 | Non-Sprint-1 decision assignment review |
| Day 5B Tasks | Yes | 10 | Sprint 1 Go/No-Go gates |
| Blocking Decision Tasks | No | 0 | View/filter only |
| ADR Tasks | No | 0 | View/filter only |
| Security Gate Tasks | No | 0 | View/filter only |
| QA Gate Tasks | No | 0 | View/filter only |
| DevOps Gate Tasks | No | 0 | View/filter only |
| Sprint 1 Gate Tasks | No | 0 | View/filter only |

Primary task total: **73**.

---

## 5. CSV Table

"Task ID","Title","Description","Day","Workstream","Owner Role","Priority","Blocking Status","Dependency","Required Output","Acceptance Criteria","Risk If Missed","Escalation Trigger","Labels","Suggested Status","Sprint","Gate Impact"
"S0-D1-001","Decide repository structure","Decide where frontend, backend, jobs, docs, tests, QA evidence, and release artifacts live.","Day 1","Architecture","Principal Software Architect","P0","Blocking","Team structure","Repository standard","Repository structure is approved and documented.","All setup tasks lack structure.","No decision by end of Day 1 escalates to CTO.","sprint-0; day-1; decision; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D1-002","Decide monorepo vs multi-repo","Choose repo model for MVP speed and standards consistency.","Day 1","Architecture","CTO / Principal Software Architect","P0","Blocking","S0-D1-001","Repository ADR","Chosen model supports frontend, backend, jobs, docs, and tests.","Fragmented tooling and review standards.","No agreement by end of Day 1 escalates to CTO.","sprint-0; day-1; decision; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D1-003","Approve modular monolith architecture","Approve ADR-001 for MVP modular monolith and post-MVP expansion path.","Day 1","Architecture","CTO / Principal Software Architect","P0","Blocking","Master Specification and Phase 14","ADR-001","Modular monolith approved with module boundaries.","Premature microservices or unclear module ownership.","ADR-001 not approved by end of Day 1 escalates to CTO.","sprint-0; day-1; adr; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D1-004","Create architecture decision log","Create ADR index with owner, status, due day, dependency, and approval state.","Day 1","Documentation","Technical Program Manager","P0","Blocking","ADR list","Architecture decision log","All ADRs listed with owners and target days.","Decisions become invisible or unmanaged.","Missing ADR index by end of Day 1 escalates to CTO.","sprint-0; day-1; decision; release; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 0 governance gate"
"S0-D1-005","Confirm Sprint 0 decision tracking process","Define daily decision review, missed-decision escalation, and status update rules.","Day 1","Program Management","Technical Program Manager","P0","Blocking","Sprint 0 board","Decision tracker","Blocking decisions have daily review and CTO escalation path.","Blocking items drift into Sprint 1.","Any Day 1 blocking item lacks owner or target.","sprint-0; day-1; decision; release; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D2-001","Select hosting platform","Select Docker-capable hosting platform or justified equivalent.","Day 2","DevOps","CTO / DevOps Architect","P0","Blocking","Phase 14 deployment architecture","Hosting ADR","Platform supports Docker deployment, staging, production, secrets, monitoring, and rollback path.","Environment and CI/CD planning drift.","Not closed by end of Day 2 escalates to CTO.","sprint-0; day-2; decision; devops; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D2-002","Select ORM and data access direction","Choose Prisma or equivalent and define tenant-aware wrapper expectation.","Day 2","Database","Database Architect / Principal Software Architect","P0","Blocking","PostgreSQL strategy","ORM ADR","ORM supports tenant-aware repository pattern and scoped queries.","Tenant repository baseline delayed.","Not closed by end of Day 2 escalates to CTO.","sprint-0; day-2; decision; database; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D2-003","Approve frontend stack ADR","Document Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui or equivalent.","Day 2","Frontend","Frontend Lead","P0","Blocking","Approved stack","ADR-002","Frontend stack and component direction are documented.","Frontend setup inconsistency.","ADR-002 not approved by end of Day 2.","sprint-0; day-2; adr; frontend; blocking; sprint-1-gate","Ready","Sprint 0","Frontend baseline gate"
"S0-D2-004","Approve backend stack ADR","Document NestJS, Node.js, TypeScript, and REST-first backend baseline.","Day 2","Backend","Backend Lead","P0","Blocking","Approved stack","ADR-003","Backend stack and module conventions are documented.","Backend setup inconsistency.","ADR-003 not approved by end of Day 2.","sprint-0; day-2; adr; backend; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D2-005","Confirm modular monolith module map","Map MVP modules, ownership boundaries, and dependency direction.","Day 2","Architecture","Principal Software Architect","P0","Blocking","ADR-001","Module boundary map","MVP modules and ownership boundaries are documented.","Duplicated business logic and unclear ownership.","Module map missing by end of Day 2.","sprint-0; day-2; backend; frontend; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 architecture gate"
"S0-D2-006","Define branch and review standards","Define branch policy, protected branches, reviews, and merge checks.","Day 2","Release","Technical Program Manager / CTO","P0","Blocking","Repository decision","Repository standard","Branch policy, review rules, protected branches, and review checks documented.","Unsafe changes enter Sprint 1.","Branch or review rules missing by end of Day 2.","sprint-0; day-2; release; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D2-007","Create repository standard document","Document structure, naming, branch policy, PR rules, and artifact locations.","Day 2","Documentation","Principal Software Architect","P0","Blocking","S0-D1-001","Repository standard document","Repository standard is usable by full team.","Team workflow inconsistency.","Repository standard not approved by end of Day 2.","sprint-0; day-2; release; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D2-008","Confirm frontend setup standard","Define frontend app structure and routing conventions.","Day 2","Frontend","Frontend Lead","P1","Blocking","ADR-002","Frontend setup note","App structure and routing conventions are approved.","Frontend setup becomes inconsistent.","Setup note missing by end of Day 2.","sprint-0; day-2; frontend; blocking","Ready","Sprint 0","Frontend setup gate"
"S0-D2-009","Confirm React and TypeScript baseline","Define strictness, linting, type conventions, and component quality rules.","Day 2","Frontend","Frontend Lead","P1","Blocking","ADR-002","TypeScript/frontend standard","Frontend type and quality expectations are clear.","Weak type discipline and inconsistent implementation.","TypeScript baseline missing.","sprint-0; day-2; frontend; blocking","Ready","Sprint 0","Frontend quality gate"
"S0-D2-010","Confirm NestJS setup standard","Define backend module, provider, validation, and service conventions.","Day 2","Backend","Backend Lead","P0","Blocking","ADR-003","Backend setup note","Backend setup is ready for Sprint 1 module work.","Sprint 1 backend modules diverge.","Backend setup note missing.","sprint-0; day-2; backend; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-001","Define PostgreSQL environment strategy","Define local, QA, staging, and production database strategy.","Day 3","Database","Database Architect / DevOps Architect","P0","Blocking","Hosting decision","Database environment plan","Database environments and data boundaries documented.","Sprint 1 data foundation delayed.","Missing plan by end of Day 3 escalates to CTO and DevOps Architect.","sprint-0; day-3; database; devops; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-002","Define tenant hardening/RLS baseline","Approve tenant_id policy and targeted RLS or equivalent baseline.","Day 3","Security","Database Architect / Security Architect","P0","Blocking","ORM choice","Tenant isolation baseline","Tenant-owned data rules and targeted hardening baseline approved.","Cross-tenant leakage risk.","Missing or vague baseline escalates to CTO and Security Architect.","sprint-0; day-3; security; database; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-003","Approve database and tenant isolation ADR","Document PostgreSQL, tenant_id, repositories, and database hardening.","Day 3","Database","Database Architect / Security Architect","P0","Blocking","D-004 and D-006","ADR-004","Database and tenant rules are implementation-ready.","Data access and tenant rules remain unclear.","ADR-004 not approved by end of Day 3.","sprint-0; day-3; adr; database; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-004","Approve ORM/data access ADR","Document ORM choice and repository/service access pattern.","Day 3","Database","Database Architect / Principal Software Architect","P0","Blocking","D-004","ADR-005","ORM and tenant-aware repository pattern approved.","Permission drift in repositories.","ADR-005 not approved by end of Day 3.","sprint-0; day-3; adr; database; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-005","Approve REST-first API ADR","Document REST naming, DTO validation, error model, and pagination.","Day 3","Backend","Backend Lead","P0","Blocking","ADR-003","ADR-006","API behavior is consistent enough for Sprint 1.","API inconsistency and rework.","ADR-006 not approved by end of Day 3.","sprint-0; day-3; adr; backend; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-006","Define service/repository layering standard","Define controller, service, guard, repository, and worker access rules.","Day 3","Architecture","Principal Software Architect / Backend Lead","P0","Blocking","ADR-004 and ADR-005","Layering standard","Protected modules cannot bypass services or tenant-aware repositories.","Direct data access and permission bypass risk.","Layering standard missing by end of Day 3.","sprint-0; day-3; backend; security; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-007","Define tenant context propagation standard","Define tenant context for requests, jobs, realtime, reports, and AI.","Day 3","Security","Security Architect / Backend Lead","P0","Blocking","D-006","Tenant context standard","Tenant context is required anywhere tenant-owned data is accessed.","Tenant context loss in jobs or services.","Tenant context standard missing.","sprint-0; day-3; security; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-008","Define API contract standards","Define REST standards, validation, status handling, and error behavior.","Day 3","Backend","Backend Lead","P0","Blocking","ADR-006","API standards document","API contracts are clear enough for Sprint 1.","Frontend/backend contract drift.","API standard missing.","sprint-0; day-3; backend; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-009","Define DTO validation baseline","Define input validation and failure response standards.","Day 3","Backend","Backend Lead / QA Lead","P0","Blocking","API standards","Validation standard","Validation rules are testable by QA.","Unsafe or inconsistent input handling.","Validation standard missing.","sprint-0; day-3; backend; qa; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-010","Define tenant-aware repository baseline","Require tenant context for tenant-owned data access.","Day 3","Database","Database Architect / Backend Lead","P0","Blocking","ORM ADR","Repository baseline","No tenant-owned data query can bypass tenant context.","Cross-tenant access risk.","Repository baseline missing.","sprint-0; day-3; database; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-011","Define tenant_id policy","Define when tenant_id is mandatory and how exceptions are approved.","Day 3","Database","Database Architect / Security Architect","P0","Blocking","Tenant baseline","tenant_id policy","Tenant-owned tables require tenant_id or approved equivalent.","Tenant-owned data lacks enforceable scope.","tenant_id policy missing.","sprint-0; day-3; database; security; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-012","Define invite-only access standard","Document no public registration and invitation-only access behavior.","Day 3","Security","Security Architect / Product Owner","P0","Blocking","Master critical rules","Invite-only standard","Public registration is explicitly blocked and mapped to Sprint 1 tests.","Public access ambiguity.","Invite-only standard missing.","sprint-0; day-3; security; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-013","Define MVP QA strategy","Define test categories for functional, permission, security, tenant, client, finance, AI, and reports.","Day 3","QA","QA Lead","P0","Blocking","Phase 12 and Phase 15","QA strategy note","QA knows how Sprint 1 and later gates will be validated.","QA scope remains unclear.","QA strategy missing by end of Day 3.","sprint-0; day-3; qa; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 QA gate"
"S0-D3-014","Define QA evidence template","Define evidence model for role, tenant, scope, result, logs, screenshots, and reviewer.","Day 3","QA","QA Lead","P0","Blocking","Phase 12","QA evidence template","QA can record evidence from Day 1 of Sprint 1.","Acceptance evidence cannot be captured.","QA evidence template missing.","sprint-0; day-3; qa; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 QA gate"
"S0-D3-015","Define Tailwind CSS baseline","Define styling conventions and design token expectations.","Day 3","Frontend","Frontend Lead / Designer","P1","Blocking","ADR-002","Styling baseline","Styling decisions are clear enough for Sprint 2.","UI baseline inconsistency.","Styling baseline missing.","sprint-0; day-3; frontend; ux-ui; blocking","Ready","Sprint 0","Sprint 2 gate"
"S0-D3-016","Define component baseline","Define component system usage rules and ownership.","Day 3","Frontend","Frontend Lead / Designer","P1","Blocking","Styling baseline","Component baseline","Designers and frontend share component model.","Component fragmentation.","Component baseline missing.","sprint-0; day-3; frontend; ux-ui; blocking","Ready","Sprint 0","Sprint 2 gate"
"S0-D3-017","Define backend module map","Map identity, projects, client portal, CRM, collaboration, files, AI, finance, reporting, and audit modules.","Day 3","Backend","Principal Software Architect / Backend Lead","P0","Blocking","ADR-001 and ADR-003","Backend module map","Backend module boundaries are clear.","Module ownership remains ambiguous.","Backend module map missing.","sprint-0; day-3; backend; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-018","Define Docker local environment plan","Define local app, API, database, queue, and storage placeholders.","Day 3","DevOps","DevOps Architect","P1","Blocking","Repository decision","Docker local plan","Developers can reproduce local environment setup later.","Local setup inconsistency.","Docker local plan missing.","sprint-0; day-3; devops; blocking","Ready","Sprint 0","Developer readiness gate"
"S0-D3-019","Define CI/CD platform decision","Select CI/CD path and baseline quality gates.","Day 3","DevOps","DevOps Architect / Release Manager","P0","Blocking","Repository decision","CI/CD baseline plan","Build, test, security, and deploy gate path approved.","Quality gates cannot be enforced.","CI/CD platform unresolved by end of Day 3.","sprint-0; day-3; devops; ci-cd; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D3-020","Define documentation structure","Define locations for ADRs, checklists, QA evidence, release notes, and security baselines.","Day 3","Documentation","Technical Program Manager","P1","Non-blocking","Repository standard","Documentation index","Team can find all Sprint 0 outputs.","Artifacts become scattered.","Documentation index missing.","sprint-0; day-3; release; non-blocking","Ready","Sprint 0","Sprint 0 closure"
"S0-D3-021","Define email provider path or invite fallback","Select email provider path or approved fallback for invitation testing.","Day 3","DevOps","DevOps Architect / Product Operations","P0","Blocking","Invite-only standard","Email provider note or invite fallback","Sprint 1 invitation testing can proceed safely.","Invite-only flow cannot be tested.","No provider or fallback by Day 3 escalates to Product Owner and CTO.","sprint-0; day-3; decision; devops; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-001","Close CI/CD baseline","Finalize CI/CD plan for build, test, scan, deploy, and rollback gates.","Day 4A","DevOps","DevOps Architect / Release Manager","P0","Blocking","Repository decision","CI/CD baseline plan","Build, test, security scan, deploy, rollback gates documented.","Sprint 1 changes lack quality gates.","No CI/CD baseline by Day 4A close escalates to CTO.","sprint-0; day-4a; devops; ci-cd; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-002","Close secrets management","Define secret storage, access, rotation, audit, and environment separation.","Day 4A","Security","DevOps Architect / Security Architect","P0","Blocking","Hosting decision","Secrets management plan","Secrets plan is approved and environment-specific.","Secret leakage or unsafe configs.","Missing or vague plan escalates to CTO and Security Architect.","sprint-0; day-4a; security; devops; secrets; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-003","Close monitoring/logging baseline","Finalize observability provider and monitoring baseline.","Day 4A","DevOps","DevOps Architect","P0","Blocking","Hosting decision","Observability ADR and monitoring baseline","App, frontend, worker, queue, uptime, and error monitoring documented.","Sprint 1 failures are invisible.","Monitoring not ready by Day 4A escalates to CTO.","sprint-0; day-4a; devops; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-004","Close deployment/environment strategy","Define local, QA, staging, UAT, production, demo/sandbox, and service boundaries.","Day 4A","DevOps","DevOps Architect / QA Lead","P0","Blocking","Hosting and region decisions","Deployment/environment plan","Environment plan and deployable service boundaries approved.","Environment drift and unsafe test data.","Environment strategy not approved by Day 4A.","sprint-0; day-4a; devops; qa; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-005","Close deployment region baseline","Select region or assign risk-owned decision path.","Day 4A","DevOps","DevOps Architect / Owner","P1","Non-blocking","Pilot tenant profile","Region note","Region selected or owner, deadline, and risk accepted.","Later compliance and latency ambiguity.","Region decision unowned by Day 4.","sprint-0; day-4a; devops; non-blocking","Ready","Sprint 0","Environment planning gate"
"S0-D4A-006","Close security baseline/audit strategy","Approve invite-only, no-public-registration, RBAC, audit schema, redaction, and sensitive controls.","Day 4A","Security","Security Architect","P0","Blocking","Tenant baseline","ADR-014","Security and audit rules are implementation-ready.","Sprint 1B starts without enforceable security baseline.","ADR-014 not approved by Day 4A.","sprint-0; day-4a; security; permission-audit; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-007","Close permission guard standard","Define route guard and service-level resource scope validation.","Day 4A","Security","Security Architect / Backend Lead","P0","Blocking","ADR-014","Permission guard and scope validation standard","Guard plus service-level scope checks are documented.","Permission bypass risk.","Permission guard standard missing by Day 4A.","sprint-0; day-4a; backend; security; permission-audit; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-008","Close audit standards","Define audit taxonomy, audit service, append-only access, and redaction rules.","Day 4A","Security","Security Architect / Backend Lead","P0","Blocking","ADR-014","Audit event, audit service, and redaction standards","Sensitive actions can be logged safely in Sprint 1.","Sensitive actions unaudited or over-logged.","Audit standards missing by Day 4A.","sprint-0; day-4a; backend; security; permission-audit; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-009","Close backend auth and tenant readiness","Define auth/session/device scope and tenant resolver scope for Sprint 1A.","Day 4A","Backend","Backend Lead / Principal Software Architect","P0","Blocking","Tenant baseline and ADR-014","Auth and tenant resolver readiness notes","Auth and tenant resolver scope ready for Sprint 1A.","Sprint 1A implementation unsafe or unclear.","Auth or tenant resolver scope missing.","sprint-0; day-4a; backend; security; tenant-isolation; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4A-010","Close sensitive-table hardening and migration governance","Define sensitive table hardening targets and database change governance.","Day 4A","Database","Database Architect / Security Architect / Release Manager","P0","Blocking","Tenant/RLS baseline and ORM decision","Sensitive-table hardening note and migration governance plan","Sensitive hardening targets and review/rollback rules documented.","Sensitive data or migrations become under-governed.","Hardening or migration governance missing.","sprint-0; day-4a; database; security; release; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4B-001","Close UX/RTL/LTR baseline","Define workspace shell, Arabic RTL, English LTR, and German LTR rules.","Day 4B","UX/UI","Designer / Frontend Lead / Product Owner","P1","Non-blocking","Styling baseline","Workspace shell and RTL/LTR checklists","Workspace shell and directionality rules are documented.","Sprint 2 UI starts with layout ambiguity.","Baseline lacks directionality or workspace rules.","sprint-0; day-4b; ux-ui; frontend; non-blocking","Ready","Sprint 0","Sprint 2 gate"
"S0-D4B-002","Close accessibility baseline","Define keyboard, contrast, labels, focus, and form error baseline.","Day 4B","QA","Designer / QA Lead","P1","Non-blocking","Phase 12","Accessibility checklist","Accessibility expectations are documented.","Accessibility issues accumulate until late QA.","Accessibility baseline unowned.","sprint-0; day-4b; qa; ux-ui; non-blocking","Ready","Sprint 0","Release readiness gate"
"S0-D4B-003","Close frontend environment config","Define frontend variables and safe exposure rules by environment.","Day 4B","Frontend","Frontend Lead / DevOps Architect","P1","Non-blocking","Environment plan","Frontend environment note","Environment-specific variables and safe exposure rules documented.","Frontend config leaks or drifts.","Frontend env note missing.","sprint-0; day-4b; frontend; devops; non-blocking","Ready","Sprint 0","Frontend readiness gate"
"S0-D4B-004","Close route group structure","Define internal and client route groups with permission-aware boundaries.","Day 4B","Frontend","Frontend Lead / Security Architect","P1","Non-blocking","Security baseline","Route structure note","Internal and client routes are separated and permission-aware.","Client/internal route leakage risk.","Route structure missing.","sprint-0; day-4b; frontend; security; non-blocking","Ready","Sprint 0","Client portal readiness gate"
"S0-D4B-005","Close role-aware navigation","Define navigation visibility and denied-state behavior.","Day 4B","Frontend","Frontend Lead / Security Architect","P1","Non-blocking","Route group structure","Navigation standard","UI does not expose hidden modules through navigation.","Hidden modules leak through UI states.","Navigation standard missing.","sprint-0; day-4b; frontend; security; non-blocking","Ready","Sprint 0","Sprint 2 gate"
"S0-D4B-006","Close API contract readiness","Finalize REST naming, validation, error model, and status handling.","Day 4B","Backend","Backend Lead","P0","Blocking","ADR-006","API standards document","API standard is ready for Sprint 1 API consistency.","Sprint 1 API implementation becomes inconsistent.","API standard missing by Day 4B.","sprint-0; day-4b; backend; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D4B-007","Close DTO validation readiness","Finalize validation rules and failure response standard.","Day 4B","Backend","Backend Lead / QA Lead","P0","Blocking","API contract readiness","Validation standard","Validation standard is testable and ready for Sprint 1.","Unsafe or inconsistent validation.","DTO validation standard missing by Day 4B.","sprint-0; day-4b; backend; qa; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5A-001","Classify realtime provider decision","Classify realtime path as closed, assigned forward, escalated, or deferred.","Day 5A","Architecture","Principal Software Architect / DevOps Architect","P2","Non-blocking","Phase 14 realtime architecture","Realtime decision note","Owner, deadline, risk, and Sprint 7 gate assigned if not closed.","Realtime work later starts with ambiguity.","No owner, deadline, or gate by Day 5A close.","sprint-0; day-5a; decision; devops; non-blocking","Ready","Sprint 0","Sprint 7 gate"
"S0-D5A-002","Classify object storage decision","Classify S3-compatible provider path or approved placeholder.","Day 5A","DevOps","DevOps Architect / Security Architect","P2","Non-blocking","Hosting/region decision","Object storage decision note","Owner, deadline, risk, and Sprint 6 gate assigned if not closed.","File work later blocked by provider ambiguity.","No owner, deadline, or gate by Day 5A close.","sprint-0; day-5a; decision; devops; security; non-blocking","Ready","Sprint 0","Sprint 6 gate"
"S0-D5A-003","Classify payment provider shortlist","Define payment provider shortlist or manual MVP fallback path.","Day 5A","Finance","Finance Owner / CTO","P2","Non-blocking","Pilot countries and currencies","Payment shortlist note","Path supports EUR, USD, AED, SAR or documents manual fallback.","Sprint 9 finance planning uncertainty.","No payment shortlist owner by Day 5A.","sprint-0; day-5a; decision; non-blocking","Ready","Sprint 0","Sprint 9 gate"
"S0-D5A-004","Classify AI provider shortlist","Define AI provider shortlist with retention, training, and security notes.","Day 5A","AI","AI Systems Architect / Security Architect","P2","Non-blocking","AI retention/security rules","AI provider shortlist","Retention, no unauthorized training, and data handling notes included.","Sprint 8 AI security uncertainty.","No AI provider owner by Day 5A.","sprint-0; day-5a; decision; security; non-blocking","Ready","Sprint 0","Sprint 8 gate"
"S0-D5A-005","Classify transcription provider shortlist","Define transcription provider benchmark plan for Arabic, English, German, and mixed-language voice.","Day 5A","AI","AI Systems Architect","P2","Non-blocking","AI provider shortlist","Transcription shortlist","Language benchmark owner and gate assigned before Sprint 8.","Voice-to-task quality risk unowned.","No transcription benchmark plan.","sprint-0; day-5a; decision; qa; non-blocking","Ready","Sprint 0","Sprint 8 gate"
"S0-D5A-006","Classify report export MVP decision","Decide whether export is deferred or limited in MVP.","Day 5A","Reporting","Product Owner / Security Architect","P2","Non-blocking","Reporting privacy rules","Report export decision note","Export deferred or limited scope approved.","Report export scope creep or privacy risk.","Export decision missing by Day 5A.","sprint-0; day-5a; decision; security; non-blocking","Ready","Sprint 0","Sprint 10 gate"
"S0-D5A-007","Classify backup/restore plan","Close backup plan or assign launch gate with owner, deadline, and risk.","Day 5A","DevOps","DevOps Architect / Database Architect","P1","Non-blocking","PostgreSQL strategy","Backup/restore plan or assigned launch gate","Backup cadence, restore drill, RPO/RTO placeholders, and object storage assumptions documented or gated.","Recovery planning remains vague.","Backup/restore unowned by Day 5A.","sprint-0; day-5a; devops; database; non-blocking","Ready","Sprint 0","Launch readiness gate"
"S0-D5A-008","Classify queue/jobs and worker path","Define queue/jobs decision note and worker permission path.","Day 5A","Backend","Backend Lead / DevOps Architect","P2","Non-blocking","CI/CD and environment plan","Queue/jobs decision note and worker standard","Worker permission path and later sprint gate assigned.","Future jobs bypass permissions.","No owner, deadline, or gate by Day 5A.","sprint-0; day-5a; backend; devops; non-blocking","Ready","Sprint 0","Sprint 8 gate"
"S0-D5A-009","Classify frontend error tracking","Define frontend monitoring note or assign owner and gate.","Day 5A","Frontend","DevOps Architect / Frontend Lead","P2","Non-blocking","Monitoring provider decision","Frontend monitoring note","Error tracking owner and gate assigned.","Frontend failures are harder to diagnose.","No owner or deadline by Day 5A.","sprint-0; day-5a; frontend; devops; non-blocking","Ready","Sprint 0","Sprint 2 readiness gate"
"S0-D5A-010","Classify signed URL and realtime security notes","Assign security standards for signed URLs and realtime authorization.","Day 5A","Security","Security Architect / Backend Lead / Principal Software Architect","P2","Non-blocking","ADR-007 and ADR-008","Signed URL and realtime security notes","Later sprint gates assigned with owner and risk.","Future files or realtime expose data.","Security notes unassigned by Day 5A.","sprint-0; day-5a; security; non-blocking","Ready","Sprint 0","Sprint 6/Sprint 7 gate"
"S0-D5B-001","Repository standard gate","Verify repository structure, branch policy, review rules, and repository ADR.","Day 5B","Architecture","Principal Software Architect","P0","Gate","Day 1 and Day 2 repository tasks","Repository standard and repository ADR","Repository standard is approved and usable for Sprint 1.","Sprint 1 starts without execution structure.","Missing repository standard blocks Sprint 1.","sprint-0; day-5b; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-002","Hosting, CI/CD, and secrets gate","Verify hosting path, CI/CD baseline, and secrets plan.","Day 5B","DevOps","DevOps Architect / Release Manager / Security Architect","P0","Gate","Day 2-Day 4A DevOps tasks","Hosting, CI/CD, and secrets readiness","Hosting, CI/CD gates, and secrets management approved.","Sprint 1 changes cannot be governed safely.","Any environment gate missing blocks Sprint 1.","sprint-0; day-5b; devops; ci-cd; secrets; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-003","Tenant isolation gate","Verify tenant isolation baseline, tenant_id policy, repositories, and hardening.","Day 5B","Security","Database Architect / Security Architect","P0","Gate","Tenant/RLS and repository tasks","Tenant isolation baseline","Tenant isolation is implementation-ready and testable.","Cross-tenant leakage risk.","Tenant baseline missing or vague blocks Sprint 1.","sprint-0; day-5b; security; database; tenant-isolation; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-004","Auth/session/device gate","Verify invite-only, no-public-registration, login, session, device, and login history scope.","Day 5B","Security","Backend Lead / Security Architect","P0","Gate","Security baseline and auth readiness","Auth/session/device standard","Auth/session/device scope is documented for Sprint 1A.","Sprint 1 auth work starts unsafe.","Auth/session standard missing blocks Sprint 1.","sprint-0; day-5b; backend; security; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-005","RBAC and permission gate","Verify role model, permission guard, and service-level scope validation.","Day 5B","Security","Security Architect / Backend Lead","P0","Gate","ADR-014 and permission tasks","Permission guard and scope validation standard","RBAC, route guard, and service-level resource scope validation approved.","Permission bypass risk.","Permission guard standard missing blocks Sprint 1.","sprint-0; day-5b; security; backend; permission-audit; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-006","Audit logging and redaction gate","Verify audit taxonomy, append-only policy, correction rules, access limits, and redaction.","Day 5B","Security","Security Architect / Backend Lead","P0","Gate","Audit standards","Audit logging/redaction standard","Audit rules are safe for Sprint 1 sensitive actions.","Sensitive actions unaudited or sensitive data logged.","Audit standard missing blocks Sprint 1.","sprint-0; day-5b; security; backend; permission-audit; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-007","QA evidence and Sprint 1 test gate","Verify QA strategy, evidence template, test plan, permission matrix, and tenant tests.","Day 5B","QA","QA Lead / Security Architect","P0","Gate","QA tasks","QA evidence template and Sprint 1 test plan","QA evidence and Sprint 1 test plan are approved.","Sprint 1 cannot prove acceptance.","QA evidence or test plan missing blocks Sprint 1.","sprint-0; day-5b; qa; security; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-008","Email provider or invite fallback gate","Verify invite testing can proceed through provider or approved fallback.","Day 5B","DevOps","DevOps Architect / Product Operations","P0","Gate","Invite-only standard and email decision","Email provider path or invite fallback","Invitation testing can proceed in Sprint 1.","Invite-only flow cannot be tested.","Invite testing path missing blocks Sprint 1.","sprint-0; day-5b; devops; decision; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"
"S0-D5B-009","Hotfix and rollback gate","Verify hotfix classification, approvers, minimum tests, rollback, audit, and communication rules.","Day 5B","Release","Release Manager / CTO","P0","Gate","Release governance","Hotfix/rollback baseline","Production fix governance is safe before implementation starts.","Unsafe production fixes later.","Hotfix/rollback missing blocks Sprint 0 closure.","sprint-0; day-5b; release; hotfix; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 0 closure and Sprint 1 governance"
"S0-D5B-010","Sprint 1 readiness decision","Record final Go/No-Go with approvers, unresolved risks, Conditional Go decisions, and handoff notes.","Day 5B","Release","Technical Program Manager / CTO","P0","Gate","All blocking Sprint 0 items","Sprint 1 readiness decision","Go/No-Go decision documented with required approvers.","Premature Sprint 1 start.","No readiness decision by Day 5B blocks Sprint 1.","sprint-0; day-5b; release; go-no-go; blocking; sprint-1-gate","Ready","Sprint 0","Sprint 1 gate"

---

## 6. Import Validation Checklist

| Validation Check | Result |
|---|---|
| Total tasks = 73 | Pass (73) |
| All Task IDs unique | Pass (73 unique) |
| All required fields present | Pass (0 incomplete rows) |
| No special view duplicates | Pass (only primary S0-D rows are included) |
| All P0 tasks have escalation trigger | Pass (0 missing) |
| All sprint-1-gate tasks have Gate Impact | Pass (0 missing) |
| All Day 5A P2 tasks remain assigned-forward/non-blocking | Pass (0 exceptions) |
| Ready for import | Yes |

---

## 7. Recommended Jira Mapping

| CSV Field | Jira Field |
|---|---|
| Task ID | External ID or custom field |
| Title | Summary |
| Description | Description |
| Day | Component, custom field, or label |
| Workstream | Component |
| Owner Role | Assignee placeholder or custom field |
| Priority | Priority |
| Blocking Status | Blocker custom field or label |
| Dependency | Linked Issue / Blocks / Is blocked by |
| Required Output | Acceptance section in Description or custom field |
| Acceptance Criteria | Acceptance Criteria custom field or Description |
| Risk If Missed | Risk custom field or Description |
| Escalation Trigger | Escalation custom field or Description |
| Labels | Labels |
| Suggested Status | Status |
| Sprint | Sprint |
| Gate Impact | Fix Version, custom field, or Description |

Jira import note: map P0 to Highest or Blocker, P1 to High, and P2 to Medium unless the workspace uses a different priority scheme.

---

## 8. Recommended Linear Mapping

| CSV Field | Linear Field |
|---|---|
| Task ID | Identifier custom field or title prefix |
| Title | Issue title |
| Description | Issue description |
| Day | Label |
| Workstream | Team or label |
| Owner Role | Custom field or description line |
| Priority | Priority |
| Blocking Status | Label or custom field |
| Dependency | Related issue / blocked-by relation |
| Required Output | Description |
| Acceptance Criteria | Description checklist |
| Risk If Missed | Description or risk label |
| Escalation Trigger | Description |
| Labels | Labels |
| Suggested Status | Workflow status |
| Sprint | Cycle or project |
| Gate Impact | Project milestone or description |

Linear import note: use labels such as sprint-1-gate, blocking, tenant-isolation, and permission-audit to recreate the special gate views.

---

## 9. Recommended ClickUp Mapping

| CSV Field | ClickUp Field |
|---|---|
| Task ID | Custom ID or custom field |
| Title | Task name |
| Description | Description |
| Day | Custom field or tag |
| Workstream | List, custom field, or tag |
| Owner Role | Custom field |
| Priority | Priority |
| Blocking Status | Custom field or tag |
| Dependency | Dependency relation |
| Required Output | Description or custom field |
| Acceptance Criteria | Checklist or custom field |
| Risk If Missed | Custom field or Description |
| Escalation Trigger | Custom field or Description |
| Labels | Tags |
| Suggested Status | Status |
| Sprint | Sprint folder/list/custom field |
| Gate Impact | Custom field |

ClickUp import note: use one List for Sprint 0 and create views by Day, Workstream, Priority, and sprint-1-gate tag.

---

## 10. Recommended Notion Mapping

| CSV Field | Notion Property |
|---|---|
| Task ID | Text or unique ID |
| Title | Title |
| Description | Text |
| Day | Select |
| Workstream | Select |
| Owner Role | Select or Person placeholder |
| Priority | Select |
| Blocking Status | Select |
| Dependency | Relation or text |
| Required Output | Text |
| Acceptance Criteria | Text |
| Risk If Missed | Text |
| Escalation Trigger | Text |
| Labels | Multi-select |
| Suggested Status | Status |
| Sprint | Select |
| Gate Impact | Text |

Notion import note: split the semicolon-separated Labels field into multi-select values after import if needed.
