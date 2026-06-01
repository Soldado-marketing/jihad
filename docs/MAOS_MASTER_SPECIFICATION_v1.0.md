# Marketing Agency Operating System (MAOS)

## Master Specification Document

**Version:** 1.0  
**Status:** Approved Master Specification  
**Document Role:** Single source of truth for product scope, architecture, data model, permissions, modules, workflows, dashboards, reporting, QA, release governance, and implementation readiness  
**Platform Name:** Marketing Agency Operating System  
**Short Name:** MAOS  
**Product Context:** A SaaS operating system for distributed marketing agencies, internal teams, and clients  
**Access Model:** Invite only. No public registration.  
**Supported Languages:** Arabic RTL, English LTR, German LTR  
**Supported Currencies:** EUR, USD, AED, SAR  
**Supported Timezones:** User timezone and client timezone  
**Code Policy:** This document is specification-only. It contains no code, SQL, migrations, or implementation scripts.

---

## Source Phase Documents

This Master Specification consolidates and governs the approved Phase 1 through Phase 12 documents:

| Phase | Source Document | Scope |
|---|---|---|
| Phase 1 | `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md` | Enterprise architecture |
| Phase 2 | `MAOS_ENTERPRISE_DATABASE_PHASE_2.md` | Enterprise database design |
| Phase 3 | `MAOS_SECURITY_PERMISSIONS_PHASE_3.md` | Security and permissions |
| Phase 4 | `MAOS_CRM_SALES_PHASE_4.md` | CRM and sales |
| Phase 5 | `MAOS_UI_UX_DESIGN_SYSTEM_PHASE_5.md` | UI/UX design system |
| Phase 6 | `MAOS_PROJECT_MANAGEMENT_PHASE_6.md` | Project management |
| Phase 7 | `MAOS_COLLABORATION_PHASE_7.md` | Collaboration |
| Phase 8 | `MAOS_FINANCE_PAYROLL_PHASE_8.md` | Finance and payroll |
| Phase 9 | `MAOS_AI_ECOSYSTEM_PHASE_9.md` | AI ecosystem |
| Phase 10 | `MAOS_AUTOMATIONS_WORKFLOW_ENGINE_PHASE_10.md` | Automations and workflow engine |
| Phase 11 | `MAOS_EXECUTIVE_DASHBOARDS_REPORTS_BI_PHASE_11.md` | Dashboards, reports, and BI |
| Phase 12 | `MAOS_QA_TESTING_RELEASE_GOVERNANCE_PHASE_12.md` | QA, testing, release governance, and implementation readiness |

If a future implementation detail conflicts with this Master Specification, this Master Specification governs until a formally approved newer version supersedes it.

---

## 1. Executive Summary

MAOS is an invite-only, multi-tenant, white-label SaaS platform for marketing agencies that need one operating system for clients, sales, projects, tasks, approvals, communication, files, voice notes, AI assistance, automations, finance, payroll, reporting, dashboards, and release governance.

The platform must support distributed internal teams and external clients while strictly preserving tenant isolation, role-based permissions, client boundaries, financial restrictions, payroll restrictions, AI safety, automation safety, reporting privacy, auditability, and production release readiness.

MAOS is not a single-purpose project tracker or CRM. It is an agency operating system where the sales pipeline, delivery execution, collaboration, billing, payroll, AI, reports, and QA governance are connected through a shared enterprise architecture and database foundation.

---

## 2. Product Vision

MAOS exists to become the operational command center for marketing agencies.

The platform must allow an agency to:

- Capture, qualify, and convert leads into clients and projects.
- Manage clients, contacts, contracts, meetings, proposals, quotations, and sales follow-ups.
- Plan and execute projects, tasks, subtasks, dependencies, recurring work, and templates.
- Balance workload and recommend assignments using skills and availability.
- Collaborate internally and with clients through chat, files, voice notes, approvals, and revisions.
- Track time, costs, revenue, profitability, invoices, partial payments, wallets, and payroll.
- Use AI safely for assistance, task creation, meeting summaries, search, reporting, analytics, and recommendations.
- Automate operational workflows without bypassing permissions or human approval rules.
- Provide owners, managers, employees, and clients with role-safe dashboards and reports.
- Validate every feature through QA, security, permission, privacy, performance, and release governance.

---

## 3. Target Users

| User Type | Description | Primary Goal |
|---|---|---|
| Owner | Agency owner or executive administrator | Full business visibility, financial control, strategic decisions, release approval |
| Manager | Team lead, project manager, sales manager, operations manager | Manage assigned teams, clients, projects, delivery, and operational reporting |
| Employee | Internal contributor, designer, marketer, editor, developer, account executive | Execute assigned work, track time, collaborate, submit approvals, view personal productivity |
| Client | External client user invited into the client portal | Review approved client-visible work, approve deliverables, view own invoices/payments/reports |
| Security/QA/Release Roles | Explicitly granted specialist roles | Validate security, QA evidence, release gates, incidents, and compliance |
| AI/Automation Admin | Explicitly granted internal operator | Configure AI and automation rules within approved security boundaries |

---

## 4. Core Business Problems

MAOS solves these operational problems:

- Fragmented agency work across separate tools for CRM, project delivery, files, approvals, chat, billing, payroll, reporting, and AI.
- Weak visibility into project profitability, employee cost, revenue, payment status, and workload.
- Inconsistent client communication, deliverable approvals, revision tracking, and client reporting.
- Manual conversion of meetings, voice notes, and chats into tasks and follow-ups.
- Risky access patterns where managers, employees, clients, AI, reports, or automations may expose data they should not see.
- Lack of reliable audit logs for sensitive actions, financial actions, payroll actions, AI outputs, reports, exports, and automations.
- Incomplete QA and release governance before production deployment.

---

## 5. Platform Scope

### 5.1 In Scope

- Multi-tenant SaaS architecture.
- White-label agency branding and custom domains.
- Invite-only identity and access.
- RBAC, custom permissions, resource scopes, sessions, devices, and audit logs.
- CRM, leads, opportunities, meetings, follow-ups, proposals, quotations, and revenue forecasting.
- Client portal for approved client-visible work, files, messages, approvals, invoices, payments, wallet, and reports.
- Projects, tasks, subtasks, dependencies, workload balancing, skill matching, recurring tasks/projects, and templates.
- Internal chat, client chat, voice notes, voice uploads, file storage, versioning, locking, approvals, and revisions.
- Revenue, costs, profitability, invoices, partial payments, wallets, payroll, employee costs, and timesheets.
- AI Assistant, AI Copilot, AI Analyst, Voice To Task, Meeting To Tasks, AI Search, AI Reporting, and AI Analytics.
- Automation rules, workflow builder, triggers, conditions, actions, schedules, recurring runs, AI-powered automations, logs, and safety controls.
- Executive dashboards, BI, custom reports, scheduled reports, exports, KPIs, forecasting, anomaly detection, and risk indicators.
- QA strategy, test plans, test evidence, UAT, release gates, rollback planning, incident handling, and post-launch monitoring.

### 5.2 Out Of Scope Unless Separately Approved

- Public self-service registration.
- Public marketplace for third-party apps.
- Native mobile apps as a first-release requirement.
- Automated tax filing.
- Full accounting replacement for ERP systems.
- Full HR compliance suite beyond payroll cost and timesheet governance.
- Cross-tenant benchmarking unless anonymized, opt-in, legally approved, and technically isolated.

### 5.3 Localization And Regional Scope

| Area | Required Support |
|---|---|
| Languages | Arabic RTL, English LTR, German LTR |
| Direction | UI must switch layout direction based on language |
| Currencies | EUR, USD, AED, SAR |
| Timezones | User timezone and client timezone |
| Numbers/Dates | Localized formatting for UI, reports, invoices, dashboards, and exports |
| AI | AI must detect and respond in Arabic, English, or German when appropriate |

---

## 6. System Architecture Summary

### 6.1 Architecture Style

MAOS uses a modular SaaS architecture with shared platform services and domain modules. The preferred starting point is a modular monolith or service-oriented modular backend with clear boundaries. Services can be extracted later when scale or ownership requires it.

Core architectural principles:

- Tenant context is mandatory for every request, job, file, AI action, report, automation, and audit event.
- Identity, RBAC, audit, notifications, files, billing, and tenant services are shared platform capabilities.
- CRM, projects, collaboration, finance, payroll, AI, automations, reporting, and QA are domain modules.
- Background jobs are required for notifications, reports, automations, AI processing, file processing, exports, and scheduled tasks.
- Sandbox, staging, and production environments must be separated.

### 6.2 High-Level Architecture Diagram

Users and Clients
  -> Edge Layer: DNS, CDN, WAF, TLS
  -> Web App: Internal Workspace and Client Portal
  -> API Layer: Tenant Context, Identity, Permission Checks
  -> Domain Modules: CRM, Projects, Collaboration, Finance, Payroll, AI, Automations, Reports, QA
  -> Platform Services: Audit, Notifications, Files, Billing, Search
  -> Data Layer: Operational Database, Object Storage, Analytics Store, Vector Store
  -> Workers: AI Jobs, Automation Runs, Report Generation, Export Delivery, File Processing

### 6.3 Multi-Tenant Architecture

- Each agency is a tenant.
- Every tenant-owned record must be scoped to a tenant.
- Every API request must resolve tenant context before accessing protected resources.
- Every background job must include tenant context and effective actor context.
- Files must be stored with tenant, owner, visibility, and access metadata.
- AI retrieval must be permission-scoped and tenant-scoped.
- BI aggregates must be tenant-scoped and permission-filtered.
- Cross-tenant administrative operations are platform-only and must be audited.

Tenant lifecycle states:

| State | Meaning |
|---|---|
| Provisioning | Tenant is being created and configured |
| Active | Tenant can use enabled modules |
| Suspended | Access restricted due to billing, security, or administration |
| Pending Cancellation | Tenant is active during termination period |
| Archived | Tenant data retained but access limited |
| Deleted | Tenant removed according to retention and legal rules |

### 6.4 SaaS Architecture

SaaS capabilities:

- Shared application runtime.
- Shared operational database with tenant-scoped records by default.
- Optional future dedicated database/storage/key isolation for enterprise tenants.
- Subscription and entitlement controls.
- Module availability by plan and tenant configuration.
- Centralized monitoring, logging, backup, and recovery.

### 6.5 White Label Architecture

Each tenant can configure:

- Logo, favicon, brand colors, portal name, and UI theme.
- Custom domain and tenant-domain mapping.
- Branded login experience.
- Branded emails, invitations, approval messages, invoices, reports, and exports.
- Client portal branding.

White-label constraints:

- Required legal, security, and compliance disclosures cannot be removed.
- Custom domains require verification, TLS, and hijack protection.
- Branding must never override security notices or access-denied states.

### 6.6 Deployment Architecture

Required environments:

| Environment | Purpose | Data Rules |
|---|---|---|
| Local/Dev | Developer validation | No production client, finance, payroll, or sensitive data |
| QA | Controlled test execution | Test data only unless sanitized |
| Staging | Production-like release validation | Sanitized or approved controlled data |
| UAT | Business user acceptance | Approved UAT data and role test accounts |
| Sandbox Client | Safe client demos/trials | Isolated demo/test tenant data |
| Production | Live tenant operations | Full security, monitoring, backup, audit, and rollback rules |

### 6.7 AI Architecture

AI services must use:

- Permission-scoped retrieval.
- Tenant-scoped vector/search indexes.
- Prompt injection protection.
- PII, finance, payroll, and client confidential redaction where required.
- Human approval for critical actions.
- AI audit logs for prompts, outputs, sources, permission decisions, and actions.
- External AI provider boundaries with no cross-tenant training and no unauthorized model training.

### 6.8 Security Architecture

Security architecture includes:

- Invite-only access.
- Authentication, sessions, device tracking, and login history.
- RBAC plus custom permissions.
- Resource-level scope checks.
- Tenant and client boundary enforcement.
- Audit logs for sensitive actions.
- API security, file security, AI security, automation security, BI/reporting security, and financial security.

### 6.9 Notification Architecture

Notification channels:

- In-app.
- Email.
- Client portal notifications.
- System/admin alerts.
- Report delivery notifications.
- Automation failure notifications.

All notifications must be permission-safe. Notifications must not leak hidden object names, hidden counts, financial totals, payroll details, internal notes, or cross-client data.

### 6.10 File Architecture

File architecture includes:

- Tenant-scoped object storage.
- File metadata records.
- File versions.
- File shares.
- File locks.
- Approval/revision links.
- Client visibility flags.
- Virus/malware scanning requirements.
- Signed access links where applicable.
- Audit logs for upload, download, share, lock, unlock, delete, restore, export, and client publication.

### 6.11 Billing Architecture

Billing architecture supports:

- Tenant plans and entitlements.
- Invoice generation.
- Payment tracking.
- Partial payments.
- Wallet balances and transactions.
- Billing notifications.
- Finance permissions and owner-only controls.

Billing is distinct from internal project profitability and payroll but must integrate with revenue, invoices, payments, wallets, and client billing reports.

---

## 7. Database Summary

### 7.1 Database Principles

- Every tenant-owned table must include tenant scope.
- Every sensitive object must support auditability.
- Soft deletion must be used where recovery, audit, or legal retention is required.
- Money fields must use explicit currency and precision.
- Date/time fields must preserve UTC storage and user/client timezone presentation.
- Foreign relationships must enforce tenant consistency.
- Indexes must support tenant filtering, search, reporting, time ranges, status filters, and ownership/scope checks.

### 7.2 Core Data Domains

| Domain | Key Objects |
|---|---|
| Tenant | tenants, tenant domains, module entitlements, brand settings |
| Localization | languages, currencies, timezones |
| Identity | users, memberships, roles, permissions, invitations, sessions, devices |
| CRM/Sales | clients, contacts, leads, opportunities, meetings, contracts, proposals, quotations, follow-ups |
| Projects | projects, tasks, subtasks, dependencies, templates, recurring rules, time entries, timesheets |
| Collaboration | files, file versions, file shares, file locks, voice notes, chat channels, messages, approvals, revisions |
| Finance/Payroll | employee profiles, employee costs, revenue records, cost records, profitability records, payroll runs, payroll items |
| Invoicing/Payments | invoices, invoice line items, payments, payment allocations, partial payments, wallets, wallet transactions, refunds, credit notes |
| AI | AI logs, AI actions, transcripts, extraction results, source references, approval records, quality monitoring records |
| Automations | automation rules, rule versions, triggers, conditions, actions, runs, run steps, dead letters, idempotency keys, replay keys |
| BI/Reports | dashboards, widgets, KPI definitions, report definitions, versions, snapshots, exports, schedules, recipients, watermarks |
| QA/Release | test plans, test cases, test steps, evidence, environments, defects, incidents, release gates, rollback plans, DR drills |
| Logs | audit logs, activity logs, access logs, report logs, automation logs, AI logs, financial logs |

### 7.3 Relationship Summary

Tenant
  -> Users through tenant memberships
  -> Clients, leads, opportunities, projects, files, chats, invoices, reports
  -> Roles and permissions
  -> Automations, dashboards, AI logs, audit logs

Client
  -> Contacts, opportunities, contracts, projects, files, approvals, invoices, payments, wallet, client reports

Project
  -> Tasks, subtasks, dependencies, time entries, files, chat, approvals, revenue, costs, profitability

Task
  -> Subtasks, dependencies, time entries, files, voice notes, AI-generated drafts, automation events

Invoice
  -> Line items, payments, allocations, partial payments, client billing, financial reports

Payroll Run
  -> Approved timesheets, payroll items, employee costs, audit logs

Report
  -> Data sources, widgets, KPI definitions, snapshots, exports, schedules, recipients, audit logs

### 7.4 Database Constraints

- Tenant ID must match across related tenant-owned records.
- Public registration records are not allowed.
- Invitations must be unique by tenant, email, role/scope, and active token state.
- Client users must be linked to their client scope.
- Time entries must link to active tasks/projects.
- Payroll must only use approved tracked time.
- Financial and payroll records require explicit sensitivity classification.
- Client-visible records require explicit client visibility state.
- AI, automation, report, export, finance, payroll, and security-sensitive actions require audit logs.

### 7.5 Indexing Strategy

Required index patterns:

- Tenant plus status.
- Tenant plus owner/assignee.
- Tenant plus client.
- Tenant plus project.
- Tenant plus date/time range.
- Tenant plus visibility.
- Tenant plus sensitivity level.
- Tenant plus audit action type.
- Tenant plus report/dashboard/export/scheduled run.
- Tenant plus automation rule/version/run.

Search candidates:

- CRM names and contacts.
- Project/task titles and descriptions.
- File names and metadata.
- Chat messages and voice transcripts.
- Approved reports and client-safe content.
- AI-searchable data only after permission-safe indexing.

### 7.6 Approved Database Addenda

The master data model includes the Phase 10 automation addendum, Phase 11 BI/reporting addendum, and Phase 12 QA/release addendum. These addenda are part of the approved data foundation and must be reflected before implementation planning is finalized.

### 7.7 ERD Coverage And Database Addendum Preservation

The Master Specification preserves the approved Phase 2 enterprise database design as the governing logical data model, including ERD coverage, table groups, relationships, constraints, indexes, and later-phase database addendums. The Master is the unified implementation reference, while the detailed ERDs remain governed by Phase 2 and the approved Phase 10, Phase 11, and Phase 12 hardening/fix addendums.

ERD coverage summary:

- Core multi-tenant, identity, access, and localization ERD.
- CRM, leads, clients, opportunities, meetings, and contracts ERD.
- Projects, tasks, subtasks, dependencies, time tracking, and files ERD.
- Collaboration, chat, voice notes, file approvals, and revision ERD.
- AI, templates, automations, notifications, audit, and activity ERD.
- Payroll, employee costs, finance, invoices, payments, wallets, and profitability ERD.
- Later-phase extensions for AI logs, AI suggestions, automation versions, automation run steps, dead-letter records, BI reports, dashboard widgets, KPI definitions, report exports, scheduled reports, QA evidence, and release governance records.

Database preservation rules:

- Core table groups must preserve tenant ownership, membership, RBAC, custom permissions, invitations, sessions, devices, and localization references.
- Module table groups must preserve CRM, clients, projects, tasks, subtasks, dependencies, files, chat, voice, approvals, finance, payroll, AI, automation, BI/reporting, and QA/release records.
- Relationship summaries must preserve tenant-to-user, tenant-to-client, client-to-project, project-to-task, task-to-subtask, invoice-to-payment, payroll-to-timesheet, automation-to-version/run-step, report-to-widget/KPI/export, and QA-to-evidence/release relationships.
- Constraint summaries must preserve tenant consistency, invite-only identity, client scope, active task/project time tracking, approved-time payroll, financial sensitivity, client visibility, and audit requirements.
- Index summaries must preserve tenant-first indexing, status/date/scope indexes, search indexes, reporting indexes, automation run indexes, report/export indexes, and QA/release evidence indexes.
- Detailed ERDs, exact field lists, constraints, and indexing needs remain governed by Phase 2 and approved database addendums.

| Area | Preserved in Master | Source Phase | Notes |
|---|---|---|---|
| Tenants and memberships | Yes | Phase 2 | Preserved in tenant, identity, access, and relationship summaries |
| Users and roles | Yes | Phase 2, Phase 3 | Preserved in identity data objects and RBAC summaries |
| Permissions | Yes | Phase 2, Phase 3 | Preserves RBAC, custom permissions, role permissions, and grants |
| CRM | Yes | Phase 2, Phase 4 | Preserves leads, opportunities, meetings, proposals, quotations, and forecasts |
| Clients | Yes | Phase 2, Phase 7, Phase 11 | Preserves client scope, portal visibility, reports, invoices, wallet, and approvals |
| Projects | Yes | Phase 2, Phase 6 | Preserves project, client, task, file, time, and profitability relationships |
| Tasks | Yes | Phase 2, Phase 6 | Preserves task assignment, status, time, files, AI drafts, and automation events |
| Subtasks | Yes | Phase 2, Phase 6 | Preserves parent task inheritance and completion relationships |
| Dependencies | Yes | Phase 2, Phase 6 | Preserves task dependency and blocker relationships |
| Files | Yes | Phase 2, Phase 7 | Preserves tenant, client/project/task context, metadata, visibility, and audit |
| File versions | Yes | Phase 2, Phase 7 | Preserves version history, review, approval, and rollback/review links |
| File shares | Yes | Phase 2, Phase 7 | Preserves share scope, visibility, client safety, and audit |
| File previews | Yes | Phase 7, Phase 11 | Preserves file preview/report visibility as permission-sensitive metadata |
| Chat | Yes | Phase 2, Phase 7 | Preserves internal/client channels, members, messages, and visibility |
| Voice notes | Yes | Phase 2, Phase 7, Phase 9 | Preserves audio, transcript, language, source context, and AI extraction |
| AI logs | Yes | Phase 2, Phase 9 | Preserves prompt, response, permission, source, retention, and incident logging |
| AI suggestions | Yes | Phase 9 | Preserves suggested actions, human approval, and source references |
| AI analytics jobs | Yes | Phase 9, Phase 11 | Preserves analytics, reporting, confidence, quality, and permission scope |
| Payroll | Yes | Phase 2, Phase 8 | Preserves payroll runs, payroll items, approved time, and exceptions |
| Finance | Yes | Phase 2, Phase 8 | Preserves revenue, costs, profitability, employee costs, and Owner-only access |
| Invoices | Yes | Phase 2, Phase 8 | Preserves invoices, line items, status, approval, and client visibility |
| Payments | Yes | Phase 2, Phase 8 | Preserves payments, allocations, partial payments, refunds, and status |
| Wallets | Yes | Phase 2, Phase 8 | Preserves balances, credits, debits, refunds, and transaction history |
| Contracts | Yes | Phase 2, Phase 4 | Preserves client/opportunity contract relationships |
| Notifications | Yes | Phase 2, Phase 10 | Preserves notifications, deliveries, preferences, and permission-safe delivery |
| Audit logs | Yes | Phase 2, Phase 3, all later phases | Preserves sensitive, financial, payroll, AI, automation, report, and release audit logs |
| Automations | Yes | Phase 2, Phase 10 | Preserves rules, triggers, conditions, actions, runs, logs, and analytics |
| Automation versions | Yes | Phase 10 addendum | Preserves draft, published, rollback, approval, diff, and activation records |
| Automation run steps | Yes | Phase 10 addendum | Preserves step-level trigger, condition, action, retry, error, and final status |
| Dead-letter records | Yes | Phase 10 addendum | Preserves failed run capture, retry exhaustion, admin review, and redaction |
| Idempotency and replay records | Yes | Phase 10 addendum | Preserves replay protection, idempotency keys, duplicate prevention, and audit |
| BI reports | Yes | Phase 11 addendum | Preserves report definitions, versions, snapshots, lineage, and retention |
| Dashboards | Yes | Phase 11 addendum | Preserves dashboard definitions, widgets, roles, filters, and audit |
| KPI definitions | Yes | Phase 11 addendum | Preserves formulas, thresholds, owners, visibility, and drill-down rules |
| Report exports | Yes | Phase 11 addendum | Preserves export metadata, watermarking, signed links, revocation, and audit |
| Scheduled reports | Yes | Phase 11 addendum | Preserves schedules, recipients, runtime revalidation, failures, and delivery logs |
| QA test cases | Yes | Phase 12 addendum | Preserves test plans, test cases, steps, matrices, and execution records |
| QA evidence | Yes | Phase 12 addendum | Preserves evidence ID, run, tester, role, environment, screenshots/log references, and approval |
| Release governance records | Yes | Phase 12 addendum | Preserves release gates, exceptions, hotfixes, rollback, incidents, and DR drills |

---

## 8. Security & Permissions Summary

### 8.1 Security Principles

- Invite-only access.
- No public registration.
- Deny by default.
- Tenant isolation by default.
- RBAC plus custom permissions.
- Resource-level scope checks.
- Sensitive actions require audit logs.
- Client data boundaries are mandatory.
- Financial and payroll access is restricted.
- AI, automations, reports, and exports must never bypass manual permissions.

### 8.2 Standard Roles

| Role | Default Access |
|---|---|
| Owner | Full tenant access, including global finance, payroll, reports, security, settings, and release approval |
| Manager | Assigned/granted operational access to teams, clients, projects, CRM, reports, and workflows |
| Employee | Own/assigned work, personal productivity, assigned tasks, project collaboration, and permitted files |
| Client | Own client-visible portal data only |

### 8.3 Permission Evaluation Order

1. Validate tenant.
2. Validate user session and invitation/membership status.
3. Validate role.
4. Validate custom permissions.
5. Validate resource scope.
6. Validate client visibility.
7. Validate sensitivity classification.
8. Validate financial/payroll restrictions.
9. Validate AI/automation/report/export-specific rules.
10. Log sensitive decisions and denied attempts where required.

### 8.4 Session, Device, And Login Security

- Sessions must support creation, expiry, revocation, and audit.
- Device tracking must record trusted/untrusted device status.
- Login history must record successful, failed, blocked, and suspicious attempts.
- Permission-sensitive actions must include session and device references in audit events.

### 8.5 File Security

- File access must be tenant-scoped, role-scoped, resource-scoped, and client-visibility scoped.
- File links must not expose unauthorized data.
- Client-visible files require approval or explicit visibility state.
- File downloads, shares, locks, unlocks, version changes, deletes, restores, and exports require audit logs.

### 8.6 API Security

- APIs must enforce tenant and permission checks server-side.
- Client-side filtering is not sufficient.
- API keys and integrations must be scoped, rate-limited, revocable, and audited.
- Sensitive API responses must redact unauthorized fields and must not leak hidden counts or totals.

---

## 9. CRM & Sales Summary

### 9.1 CRM Scope

CRM and Sales include:

- Leads.
- Opportunities.
- Meetings.
- Follow-ups.
- Proposals.
- Quotations.
- Contracts.
- Revenue forecasting.

### 9.2 Sales Pipeline

Lead -> Contacted -> Meeting -> Proposal -> Negotiation -> Won or Lost

### 9.3 Core CRM Rules

- Leads must be tenant-scoped.
- Opportunities must be linked to a client or lead.
- Meetings must be linked to leads, opportunities, clients, or projects where applicable.
- Proposals and quotations require approval before client publication.
- Revenue forecasts must separate projected, weighted, committed, won, and lost revenue.
- Client-visible CRM data must be intentionally published.
- CRM AI and automations must respect CRM permissions and client boundaries.

### 9.4 CRM Workflows

- Lead capture and qualification.
- Lead assignment.
- Follow-up scheduling.
- Meeting planning and notes.
- Proposal and quotation drafting.
- Proposal approval and client delivery.
- Negotiation tracking.
- Opportunity win/loss closure.
- Revenue forecast update.

### 9.5 CRM Dashboards And KPI Preservation

The Master Specification preserves the Phase 4 CRM dashboard and KPI requirements as part of the approved sales operating model. Detailed dashboard layouts, workflow rules, and KPI formulas remain governed by Phase 4 and Phase 11 where CRM reporting overlaps with BI.

Required CRM dashboards:

| Dashboard | Purpose | Primary Users | Visibility Rule |
|---|---|---|---|
| CRM pipeline dashboard | Show opportunity stages, stage values, probability, and next actions | Owner, Manager, granted sales users | Owner global; managers assigned/granted; employees own/assigned |
| Salesperson dashboard | Track salesperson activity, revenue, conversion, and follow-up performance | Owner, Manager, sales user | Sales user own data unless granted team scope |
| Lead source dashboard | Compare lead volume, conversion, and revenue by source | Owner, Manager, sales operations | No unauthorized cross-team or financial leakage |
| Follow-up dashboard | Track due, overdue, completed, and missed follow-ups | Owner, Manager, assigned sales users | Assigned lead/opportunity scope only |
| Proposal/quotation dashboard | Track draft, sent, viewed, approved, rejected, and expired proposals/quotations | Owner, Manager, granted sales users | Client-visible only after approved publication |
| Revenue forecasting dashboard | Track projected, weighted, committed, won, and lost revenue | Owner, Manager with grant | Financial visibility rules apply |
| Lost deals dashboard | Analyze lost opportunities by reason, stage, source, owner, and client segment | Owner, Manager | Suppress unauthorized salesperson/client detail |
| CRM conversion dashboard | Track conversion across Lead, Contacted, Meeting, Proposal, Negotiation, Won, and Lost | Owner, Manager | Scope and aggregate suppression rules apply |

Required CRM KPI catalog:

| KPI | Purpose | Data Source | Owner | Visibility | Notes |
|---|---|---|---|---|---|
| New leads | Count newly created leads in a period | leads | Sales Manager | Owner global; Manager assigned; Employee own/assigned | Filter by source, owner, client scope, date |
| Contacted leads | Count leads moved to Contacted | leads, activity logs | Sales Manager | Same as lead scope | Requires stage transition audit |
| Lead-to-meeting conversion | Measure percent of leads that reach Meeting | leads, opportunities, meetings | Sales Manager | Scope-limited | Denominator excludes deleted/invalid leads |
| Meeting-to-proposal conversion | Measure percent of meetings that result in proposal | meetings, proposals | Sales Manager | Scope-limited | Must distinguish draft from approved proposal |
| Proposal-to-won conversion | Measure percent of proposals converted to won deals | proposals, opportunities | Owner/Sales Manager | Scope-limited; finance rules for value | Requires proposal linked to opportunity |
| Win rate | Measure won opportunities over closed opportunities | opportunities | Owner/Sales Manager | Scope-limited | Closed = Won plus Lost |
| Lost rate | Measure lost opportunities over closed opportunities | opportunities | Owner/Sales Manager | Scope-limited | Lost reason required for detailed views |
| Average deal size | Average value of won opportunities | opportunities, revenue records | Owner | Financial grant required for non-owner | Suppress if sample size exposes hidden values |
| Revenue forecast | Project expected future revenue | opportunities, forecast probabilities | Owner | Financial grant required for non-owner | Separates projected, weighted, committed |
| Weighted pipeline value | Pipeline value weighted by stage probability | opportunities, stage probabilities | Owner/Sales Manager | Financial grant may be required | Must honor forecast permission |
| Sales cycle length | Average days from lead/opportunity creation to won/lost | leads, opportunities, activity logs | Sales Manager | Scope-limited | Exclude archived invalid records |
| Follow-up compliance | Percent of required follow-ups completed on time | follow-ups, activity logs | Sales Manager | Assigned/team scope | Overdue follow-ups visible only within scope |
| Overdue follow-ups | Count follow-ups past due | follow-ups | Sales Manager | Assigned/team scope | Must trigger notifications where configured |
| Proposal response time | Time from proposal sent to response | proposals, approvals, activity logs | Sales Manager | Scope-limited | Client response timestamps required |
| Lost reason distribution | Distribution of lost reasons | opportunities | Owner/Sales Manager | Aggregate suppression applies | No hidden client/person leakage |
| Revenue by salesperson | Revenue attribution by salesperson | opportunities, revenue records | Owner | Manager requires explicit grant | Must not expose unauthorized employee performance |
| Revenue by source | Revenue attribution by lead source | leads, opportunities, revenue records | Owner | Manager requires explicit grant | Suppress small groups and hidden totals |
| CRM forecast accuracy | Compare forecasted vs actual revenue/outcomes | opportunities, forecasts, revenue records | Owner | Financial grant required | Requires snapshot/version history |

---

## 10. UI/UX Summary

### 10.1 Design Inspiration

MAOS UI/UX is inspired by ClickUp, Trello, and Notion, but must be tailored to agency operations rather than copied visually.

### 10.2 Required UI Areas

- Dashboard.
- CRM.
- Client Portal.
- Projects.
- Tasks.
- Calendar.
- Chat.
- Voice Notes.
- AI Assistant.
- Finance Center.
- Reports.
- Settings.

### 10.3 UI Principles

- Operational, dense, and scannable interfaces.
- Clear navigation between CRM, projects, tasks, approvals, chat, files, finance, reports, and settings.
- Kanban, list, calendar, table, and dashboard views where appropriate.
- Client portal must be simpler than internal workspace.
- Arabic RTL, English LTR, and German LTR must be supported throughout layout, forms, tables, dashboards, reports, and exports.
- Permission-denied, empty, loading, error, offline, audit-required, approval-required, and client-safe preview states must be designed.

### 10.4 Core Page Specifications

| Page | Required Capabilities |
|---|---|
| Dashboard | Role-specific widgets, KPIs, notifications, tasks, approvals, reports |
| CRM | Pipeline, lead list, opportunity detail, meetings, proposals, quotations, forecasts |
| Client Portal | Client-visible projects, files, approvals, reports, invoices, payments, wallet |
| Projects | Project overview, status, timeline, files, tasks, team, profitability where permitted |
| Tasks | List, board, calendar, dependencies, subtasks, time tracking, comments, approvals |
| Calendar | Meetings, deadlines, tasks, follow-ups, approvals, recurring work |
| Chat | Internal and client-safe channels, mentions, files, voice notes, AI summaries |
| Voice Notes | Recording/upload, transcription, AI extraction, task conversion |
| AI Assistant | Permission-safe Q&A, suggestions, summaries, task/report generation |
| Finance Center | Owner-only finance, invoices, payments, wallets, payroll, profitability |
| Reports | Dashboards, custom reports, exports, scheduled reports, client-safe reports |
| Settings | Tenant, brand, users, roles, permissions, integrations, AI, automations, QA |

### 10.5 Wireframe Coverage Index

The Master Specification preserves Phase 5 wireframe and page specification coverage. The detailed wireframes remain governed by Phase 5, while this Master index confirms every required interface is included in the implementation reference.

| Page | Page Purpose | Primary Users | Key UI Components | Directionality Support | Permission-Sensitive Areas | Source Phase |
|---|---|---|---|---|---|---|
| Main dashboard | Role-specific operational home | Owner, Manager, Employee, Client | KPI widgets, tasks, approvals, alerts, reports | Arabic RTL, English LTR, German LTR | Finance widgets, payroll widgets, hidden totals, client-safe content | Phase 5, Phase 11 |
| CRM board | Manage sales pipeline stages | Owner, Manager, sales users | Kanban stages, lead cards, opportunity values, filters | Full RTL/LTR board mirroring | Pipeline values, owner scope, client visibility | Phase 4, Phase 5 |
| Lead detail page | View and update a lead | Owner, Manager, assigned sales users | Lead profile, source, activity, follow-ups, notes | Full RTL/LTR form support | Lead ownership, internal notes, assignment controls | Phase 4, Phase 5 |
| Opportunity detail page | Manage deal progress | Owner, Manager, assigned sales users | Stage, value, probability, meetings, proposals, quotations | Full RTL/LTR form and timeline support | Revenue values, proposal approval, client publication | Phase 4, Phase 5 |
| Client portal | Client-safe external workspace | Client, Owner, Manager | Projects, approvals, files, reports, invoices, wallet | Arabic RTL and LTR client views | Approved client-visible data only | Phase 5, Phase 7, Phase 11 |
| Client project page | Show client-visible project progress | Client, Manager, assigned users | Milestones, deliverables, approvals, files, comments | Full RTL/LTR layout | Internal tasks, employee costs, private files hidden | Phase 5, Phase 6, Phase 7 |
| Projects list | Browse and filter projects | Owner, Manager, Employee | Table/list/cards, filters, status, client, owner | Full RTL/LTR list/table support | Assigned/granted project scope | Phase 5, Phase 6 |
| Project detail page | Manage project delivery | Owner, Manager, assigned team | Overview, tasks, timeline, files, chat, approvals | Full RTL/LTR layout | Profitability, client visibility, internal notes | Phase 5, Phase 6 |
| Task detail page | Execute and review work | Owner, Manager, assignee, client where visible | Task fields, subtasks, dependencies, timer, comments, files | Full RTL/LTR form support | Time tracking, assignment, internal comments, client visibility | Phase 5, Phase 6 |
| Calendar | Show meetings, deadlines, follow-ups, recurring work | Owner, Manager, Employee | Month/week/day views, event drawer, filters | Full RTL/LTR calendar support | Assigned events, client meetings, finance/payment reminders | Phase 5 |
| Chat | Internal collaboration | Owner, Manager, Employee | Channels, messages, mentions, files, voice notes | Full RTL/LTR messages | Internal-only channels, file permissions | Phase 5, Phase 7 |
| Client chat | Client-safe collaboration | Client, Manager, assigned team | Client channels, approval links, files, notifications | Full RTL/LTR messages | Client-owned channel only; no internal chat | Phase 5, Phase 7 |
| Voice notes | Record/upload and transcribe voice | Owner, Manager, Employee, Client where permitted | Recorder, upload, transcript, AI extraction, task draft | Arabic RTL transcript and LTR transcript support | Consent, transcript visibility, AI extraction approval | Phase 5, Phase 7, Phase 9 |
| AI assistant | Permission-safe AI interaction | Owner, Manager, Employee, Client | Prompt panel, sources, suggestions, approval prompts | Arabic RTL, English LTR, German LTR | Permission-scoped answers, finance/payroll restrictions | Phase 5, Phase 9 |
| Finance center | Manage finance operations | Owner, explicit finance grantees | Revenue, costs, invoices, payments, wallet, profitability | Full RTL/LTR financial tables | Owner-only finance, explicit grants, client financial visibility | Phase 5, Phase 8 |
| Payroll view | Review payroll and timesheets | Owner, explicit payroll grantees | Timesheets, approved time, payroll draft, exceptions | Full RTL/LTR payroll tables | Owner-only payroll, approved time only, employee cost visibility | Phase 5, Phase 8 |
| Reports | Generate and view reports | Owner, Manager, Employee, Client | Report library, filters, widgets, exports, schedules | Full RTL/LTR report rendering | Hidden counts/totals, export approval, client-safe reports | Phase 5, Phase 11 |
| Settings | Configure tenant and platform controls | Owner, explicit admins | Brand, users, roles, permissions, integrations, AI, automations, QA | Full RTL/LTR forms | Security settings, permission grants, AI/admin controls | Phase 5, Phase 3 |
| Approval center | Review decisions and revisions | Owner, Manager, Employee, Client where scoped | Queues, status, approvers, comments, files, revision history | Full RTL/LTR queues | Client-safe approvals, internal approvals, decision audit | Phase 5, Phase 7 |
| File library | Manage files and versions | Owner, Manager, Employee, Client where scoped | Folder/list, upload, versions, lock state, shares, previews | Full RTL/LTR file list | File visibility, shares, downloads, previews, locks | Phase 5, Phase 7 |
| Mobile responsive layout | Support small-screen workflows | All roles | Responsive nav, cards, tables, forms, drawers | Arabic RTL and LTR responsive behavior | Sensitive widgets hidden, exports limited, role-safe navigation | Phase 5 |
| Arabic RTL layout | Provide Arabic right-to-left experience | All roles | Mirrored nav, forms, tables, dashboards, reports | RTL required | No layout-driven data leakage; Arabic AI output supported | Phase 5, Phase 9 |
| English LTR layout | Provide English left-to-right experience | All roles | LTR nav, forms, tables, dashboards, reports | LTR required | Same permission states as other languages | Phase 5 |
| German LTR layout | Provide German left-to-right experience | All roles | LTR nav, forms, tables, dashboards, reports | LTR required | Same permission states as other languages | Phase 5 |

---

## 11. Project Management Summary

### 11.1 Project Scope

Project Management includes:

- Projects.
- Tasks.
- Subtasks.
- Dependencies.
- Workload Balancer.
- Skill Matching.
- Recurring Tasks.
- Recurring Projects.
- Templates.

### 11.2 Project Rules

- Projects must be linked to tenant and usually to a client.
- Tasks must belong to active projects unless explicitly configured as internal standalone tasks.
- Subtasks inherit task/project/client security boundaries.
- Dependencies must prevent invalid completion or hidden blocker leakage.
- Recurring work must generate only within configured scope and permissions.
- Templates must be versioned and governed.
- Client-visible project/task data requires explicit visibility status.

### 11.3 Time Tracking Rules

- No Start = No Time.
- Time tracking must be linked to an active task/project.
- No Time = No Payroll.
- Only approved tracked time can be used for payroll.

### 11.4 Project Workflows

- Project creation.
- Template-based project creation.
- Project status update.
- Task creation and assignment.
- Subtask creation and completion.
- Dependency linking and blocker resolution.
- Workload recommendation.
- Skill-based assignment.
- Recurring task generation.
- Recurring project generation.
- Client-visible project update.

---

## 12. Collaboration Summary

### 12.1 Collaboration Scope

Collaboration includes:

- Internal chat.
- Client chat.
- Voice notes.
- Voice uploads.
- File storage.
- File versioning.
- File locking.
- Approval Center.
- Revision tracking.

### 12.2 Collaboration Rules

- Internal chat is not visible to clients.
- Client chat must be client-safe and client-scoped.
- Files require tenant, client/project/task context, visibility, version, and access metadata.
- File versioning must preserve history and support rollback/review workflows.
- File locking must prevent conflicting edits and be auditable.
- Approval decisions must record approver, timestamp, decision, comments, and linked object.
- Revision cycles must preserve request, change, review, and approval history.
- Voice notes must preserve original audio, transcript, language, source context, and AI extraction results where applicable.

### 12.3 Collaboration Workflows

- Internal chat workflow.
- Client chat workflow.
- Voice note upload and transcription.
- Voice to collaboration/task workflow.
- File upload and versioning.
- File lock/unlock workflow.
- Approval request and decision workflow.
- Revision request and completion workflow.

---

## 13. Client Portal Summary

### 13.1 Client Portal Purpose

The Client Portal gives invited clients a branded, client-safe interface to access only their own approved information.

### 13.2 Client Portal Capabilities

- View client-visible projects.
- View approved tasks or milestones where enabled.
- Participate in client chat.
- Upload or download approved files.
- Review approvals and revisions.
- Approve deliverables.
- View own invoices, payment status, wallet balance, and approved financial documents.
- View approved client reports and dashboards.
- Receive client-safe notifications.

### 13.3 Client Portal Restrictions

Clients must never access:

- Internal notes.
- Internal chat.
- Other client data.
- Employee costs.
- Payroll.
- Internal workload details.
- Internal AI/admin logs.
- Audit logs.
- Draft/private comments.
- Unapproved files or report sections.
- Profitability or margin data unless explicitly approved and legally intended.

---

## 14. Finance & Payroll Summary

### 14.1 Finance Scope

Finance and Payroll include:

- Revenue tracking.
- Cost tracking.
- Profit tracking.
- Payroll.
- Employee costs.
- Invoices.
- Partial payments.
- Wallet system.
- Profitability analytics.
- Financial dashboards and reports.
- Payroll approval workflow.
- Invoice approval workflow.
- Payment tracking workflow.
- Wallet transaction workflow.

### 14.2 Critical Financial Rules

- Owner Only Financial Access is the default.
- Managers and employees must not access global financial data unless explicitly granted.
- Payroll data is visible only to Owner unless explicitly granted.
- Clients can only see their own invoices, payments, wallet balance, and approved financial documents.
- AI must never expose financial data to unauthorized users.
- Financial reports, exports, AI summaries, and automations must enforce financial permissions.

### 14.3 Payroll Rules

- No Start = No Time.
- No Time = No Payroll.
- Payroll must be calculated only from approved tracked time.
- Time tracking must be linked to active tasks/projects only.
- Missing or unapproved time must block or flag payroll according to payroll rules.
- Payroll exceptions must notify Owner or explicitly authorized payroll roles.

### 14.4 Finance And Payroll Workflows

- Revenue tracking.
- Cost tracking.
- Profit calculation.
- Time to payroll.
- Payroll approval.
- Invoice creation and approval.
- Partial payment handling.
- Wallet credit/debit/refund.
- Employee cost management.
- Project profitability review.
- Client billing.
- Owner financial review.

---

## 15. AI Ecosystem Summary

### 15.1 AI Scope

AI Ecosystem includes:

- AI Assistant.
- AI Copilot.
- AI Analyst.
- Voice To Task.
- Meeting To Tasks.
- AI Search.
- AI Reporting.
- AI Analytics.

### 15.2 AI Security Rules

- AI must respect all permissions.
- AI must never expose data the user cannot access manually.
- AI must respect tenant isolation.
- AI must respect client data boundaries.
- AI must respect Owner Only Financial Access.
- AI must not expose payroll data except to Owner or explicitly authorized roles.
- AI must not use hidden data from other clients, teams, tenants, projects, finance, or payroll modules.
- AI actions must be logged.
- AI-generated tasks, reports, summaries, and recommendations must show source references where possible.
- AI must distinguish confirmed data from suggestions.
- Human approval is required for critical actions.
- AI must not execute destructive actions automatically.

### 15.3 AI Hardening Rules

- AI must ignore malicious instructions found inside retrieved files, chats, meeting transcripts, or user prompts when those instructions conflict with system permissions.
- AI prompt, response, transcript, and log retention must follow tenant retention settings.
- External AI providers must follow data minimization, no cross-tenant training, no unauthorized training, and sensitive finance/payroll restrictions.
- PII, payroll, financial, and client confidential data must be redacted where required.
- AI usage limits must exist by tenant, feature, role, and job type.
- Meeting recording and voice processing require consent and visibility rules.
- AI quality review must include hallucination, permission leakage, multilingual, voice transcription, and client-facing tests.
- AI incidents require audit trail, owner/security notification, and containment.

### 15.4 AI Workflows

- AI assistant question-answer.
- AI copilot task creation.
- Voice-to-task.
- Meeting-to-tasks.
- AI search.
- AI reporting.
- AI analytics.
- AI permission check.
- AI human approval.
- AI client-facing assistant.
- AI financial data access.
- AI audit logging.
- Multilingual AI response.
- AI recommendation.

---

## 16. Automations & Workflow Engine Summary

### 16.1 Core Automation Model

Trigger -> Conditions -> Actions -> Logs

Each automation rule must define:

- Rule identity.
- Version.
- Trigger.
- Conditions.
- Actions.
- Execution context.
- Permissions.
- Safety requirements.
- Error handling.
- Logs.
- Analytics.

### 16.2 Automation Scope

Automations include:

- Automation rules.
- Workflow builder.
- Triggers.
- Conditions.
- Actions.
- Scheduled automations.
- Recurring automations.
- AI-powered automations.
- Approval automations.
- Notification automations.
- CRM, project, task, client portal, finance, payroll, file, chat, and voice note automations.
- Error handling.
- Automation logs.
- Automation permissions.
- Automation analytics.

### 16.3 Critical Automation Rules

- Automations must respect all permissions.
- Automations must respect tenant isolation.
- Automations must respect client boundaries.
- Automations must not expose financial or payroll data to unauthorized users.
- Owner Only Financial Access applies to finance automations.
- Payroll automations must follow No Start = No Time, No Time = No Payroll, and Approved Time Only Payroll.
- AI-powered automations must follow AI security rules.
- Destructive actions require human approval.
- External-facing actions require human approval unless explicitly configured.
- Client-visible automations must be client-safe.
- Every automation run must be logged.
- Failed runs must be visible to authorized admins.
- Loops, replay, recursion, duplicate execution, and abuse must be prevented.

### 16.4 Automation Hardening

Approved hardening includes:

- Automation versioning.
- Builder lifecycle states.
- Complete trigger catalog.
- Complete condition taxonomy.
- Complete action catalog.
- Execution context model.
- Runtime permission revalidation.
- Auto-pause on permission loss.
- Replay protection.
- Idempotency keys.
- Dead-letter and compensation model.
- Step-level run logs.
- Sensitive log redaction.
- Abuse detection.
- Emergency kill switch.

---

## 17. Executive Dashboards, Reports & BI Summary

### 17.1 BI Scope

Dashboards, Reports, and BI include:

- Executive Dashboard.
- Owner Dashboard.
- Manager Dashboard.
- Employee Dashboard.
- Client Dashboard.
- CRM, sales, project, task, productivity, workload, team, client, finance, payroll, profitability, invoice, payment, wallet, AI, automation, approval, file, and voice note reports.
- Custom report builder.
- Saved custom reports.
- Scheduled reports.
- Exportable reports.
- Client-safe reports.
- KPI library.
- BI analytics.
- Forecasting.
- Anomaly detection.
- Risk indicators.

### 17.2 Critical Reporting Rules

- Dashboards must respect all permissions.
- Reports must respect tenant isolation.
- Clients can only see client-safe and client-owned data.
- Managers can only see assigned/granted operational data.
- Employees can only see own/assigned work data.
- Owner can see global business dashboards.
- Financial and payroll reports are Owner-only unless explicitly granted.
- AI-generated reports must follow AI security rules.
- Scheduled reports must follow automation rules.
- Reports must not expose hidden counts, hidden totals, hidden trends, hidden anomalies, payroll data, financial data, or cross-client aggregates to unauthorized users.
- Exporting sensitive reports requires permission and audit logging.
- Client-facing reports require approval before publishing.
- Every sensitive dashboard/report access must be logged.

### 17.3 BI Hardening

Approved hardening includes:

- Specialized dashboard specifications.
- Saved custom report objects.
- Formal KPI definitions.
- Trend, cross-module, comparative, drill-down, data quality, confidence, and data freshness rules.
- Aggregate suppression.
- Hidden count and hidden total suppression.
- Report permission matrix.
- Client-safe redaction and approval workflows.
- Export approval, watermarking, signed links, revocation, retention, and deletion rules.
- Financial/payroll reporting safety.
- AI and automation reporting alignment.
- Detailed audit event schema.
- BI data governance and database addenda.

---

## 18. QA, Testing & Release Governance Summary

### 18.1 QA Scope

QA, Testing, Release Governance, and Implementation Readiness include:

- QA strategy.
- Test planning.
- Test case and test plan models.
- Acceptance criteria governance.
- Functional, security, permission, tenant isolation, client portal, CRM, project, collaboration, file, voice, AI, automation, finance, payroll, BI, integration, regression, performance, accessibility, multilingual, RTL/LTR, migration, backup, and recovery testing.
- UAT.
- Bug management.
- Incident management.
- Release governance.
- Rollback planning.
- Go-live readiness.
- Post-launch monitoring.
- QA dashboards and reports.
- QA roles and responsibilities.
- Test data management.
- Audit and compliance validation.

### 18.2 Critical QA/Release Rules

- No feature can be approved without acceptance criteria.
- No permission-sensitive feature can be released without permission tests.
- No client-facing feature can be released without client-safe visibility tests.
- No finance/payroll feature can be released without Owner-only and explicit grant validation.
- No AI feature can be released without permission, hallucination, source, and prompt-injection tests.
- No automation can be released without loop, replay, idempotency, and failure handling tests.
- No report/dashboard can be released without hidden count/total suppression tests.
- No release can go live without rollback plan.
- No production release can happen without audit logging validation.
- No migration can happen without backup and recovery validation.

### 18.3 QA Hardening

Approved hardening includes:

- QA evidence schema.
- QA RACI and approval matrix.
- Test environment matrix.
- Module-specific functional test matrix.
- Security permission test catalog.
- AI test matrix.
- Automation safety test matrix.
- BI export and privacy test suite.
- Finance and payroll test matrix.
- Performance scenario catalog.
- Migration and disaster recovery matrix.
- UAT, hotfix, known issue, and release exception policy.
- Bug assignment and incident management matrix.
- QA/release database addendum.
- Required workflows and diagrams.

---

## 19. Cross-Module Workflows

### 19.1 Lead To Client To Project

Lead captured
  -> Lead qualified
  -> Opportunity created
  -> Meeting held
  -> Proposal or quotation approved
  -> Opportunity won
  -> Client/project created
  -> Tasks/templates generated
  -> Client portal visibility configured
  -> Revenue forecast updated
  -> Audit and activity logs recorded

### 19.2 Project Delivery To Approval To Invoice

Project active
  -> Tasks assigned
  -> Time tracked against active work
  -> Files uploaded/versioned
  -> Internal review completed
  -> Client-safe approval requested
  -> Client approves deliverable
  -> Invoice draft created
  -> Invoice approved
  -> Payment or partial payment tracked
  -> Revenue and profitability updated
  -> Client report updated

### 19.3 Voice To Task To Payroll

Voice note uploaded
  -> Consent and visibility checked
  -> Transcription created
  -> AI extracts task draft
  -> Human approves task creation
  -> User starts task timer
  -> Time entry submitted
  -> Timesheet approved
  -> Payroll draft prepared
  -> Owner/payroll-authorized approval
  -> Payroll audit logs recorded

### 19.4 AI Reporting To Client Publication

User requests AI report
  -> Tenant and permissions checked
  -> Data retrieved only from authorized sources
  -> Hidden counts/totals suppressed
  -> AI generates draft with sources where possible
  -> Sensitive/client-safe review performed
  -> Approval required for client publication/export
  -> Report published or exported
  -> Audit logs recorded

### 19.5 Automation Execution

Trigger received
  -> Rule version loaded
  -> Execution context validated
  -> Runtime permissions revalidated
  -> Conditions evaluated
  -> Actions executed with idempotency and replay protection
  -> Sensitive actions require approval
  -> Run steps logged
  -> Failures retried or dead-lettered
  -> Admin/Owner notified where required

### 19.6 Release Governance

Feature completed
  -> Acceptance criteria reviewed
  -> Functional tests executed
  -> Permission/security tests executed
  -> AI/automation/BI/finance/payroll tests executed where applicable
  -> Evidence captured
  -> Defects triaged and resolved
  -> UAT completed
  -> Release gates approved
  -> Rollback plan validated
  -> Production release approved
  -> Post-launch monitoring active

---

## 20. Role-Based Access Summary

| Capability Area | Owner | Manager | Employee | Client |
|---|---|---|---|---|
| Tenant settings | Full | Limited if granted | Denied | Denied |
| Users/invitations | Full | Limited if granted | Denied | Denied |
| Roles/permissions | Full | Explicit grant only | Denied | Denied |
| CRM | Full | Assigned/granted | Assigned/own | Client-visible only if applicable |
| Projects | Full | Assigned/granted | Assigned/own | Client-visible only |
| Tasks | Full | Assigned/granted | Assigned/own | Client-visible only |
| Internal chat | Full internal | Assigned channels | Assigned channels | Denied |
| Client chat | Full | Assigned clients | Assigned clients | Own client channels |
| Files | Full | Assigned/granted | Assigned/own | Own approved files only |
| Approvals | Full | Assigned/granted | Assigned/own | Own client approvals |
| Finance | Full | Explicit grant only | Denied by default | Own approved invoice/payment/wallet docs only |
| Payroll | Full | Explicit grant only | Own visible timesheet/payroll info only if configured | Denied |
| AI | Permission-scoped | Permission-scoped | Permission-scoped | Client-safe permission-scoped |
| Automations | Full | Explicit/assigned | Limited personal/assigned if granted | Denied except client-safe interactions |
| Reports/BI | Full | Assigned/granted | Own/assigned | Client-safe own reports only |
| QA/Release | Full approval | Assigned/granted | Evidence/fix participation | UAT only if invited |

---

## 21. Owner, Manager, Employee, Client Capabilities

### 21.1 Owner

- Configure tenant, brand, modules, settings, roles, permissions, and security.
- Invite users and clients.
- Access all tenant operational, financial, payroll, BI, audit, AI, automation, and release data.
- Approve financial, payroll, sensitive AI, external-facing, destructive, report export, and release actions.
- Review executive dashboards, profitability, payroll, finance, automation health, AI usage, incidents, and release readiness.

### 21.2 Manager

- Manage assigned teams, projects, clients, CRM pipeline, tasks, approvals, workload, and operational reports.
- View only assigned/granted data.
- Cannot access global finance, payroll, employee costs, profitability, hidden counts, hidden totals, or cross-client aggregates without explicit grant.
- Can approve operational items only within granted scope.

### 21.3 Employee

- Work on assigned projects, tasks, subtasks, files, chats, approvals, and time entries.
- View own/assigned work and personal productivity.
- Submit time, comments, files, voice notes, and deliverables.
- Cannot access global finance, payroll, employee costs, profitability, hidden team data, or unauthorized reports.

### 21.4 Client

- Access only own client portal.
- View approved client-visible projects, deliverables, files, approvals, reports, invoices, payments, and wallet records.
- Participate in client-safe chat and approvals.
- Cannot access internal chat, notes, employee data, payroll, costs, profitability, other clients, audit logs, AI/admin logs, or unapproved content.

---

## 22. Critical Business Rules

- MAOS is invite-only.
- Public registration is not allowed.
- Every tenant is isolated.
- Every tenant-owned object must preserve tenant context.
- Every client-facing output must be client-safe.
- Every module must support audit logging for sensitive actions.
- Supported languages are Arabic RTL, English LTR, and German LTR.
- Supported currencies are EUR, USD, AED, and SAR.
- User timezone and client timezone must be handled distinctly.
- Acceptance criteria are required before feature approval.
- Release readiness requires QA evidence, security validation, rollback planning, and monitoring.

---

## 23. Critical Security Rules

- RBAC and custom permissions are mandatory.
- Owner sees everything within tenant.
- Managers see only assigned/granted data.
- Employees see only own/assigned work.
- Clients see only own client-visible data.
- Tenant isolation must apply to UI, API, workers, files, AI, automations, reports, exports, and logs.
- Client boundaries must be enforced server-side.
- Sensitive actions require audit logs.
- Sessions, devices, and login history must be tracked.
- API responses must not leak hidden names, counts, totals, or unauthorized fields.
- File access must be permission-safe.
- Audit logs must be protected from unauthorized viewing and tampering.

---

## 24. Critical Financial Rules

- Owner Only Financial Access is the default.
- Payroll data is restricted to Owner or explicitly granted roles.
- Managers cannot access global finance, payroll, employee costs, or profitability unless explicitly granted.
- Employees cannot access global finance, payroll, employee costs, or profitability.
- Clients can only access their own approved invoices, payments, wallet records, and approved financial documents.
- No Start = No Time.
- No Time = No Payroll.
- Approved Time Only Payroll.
- Time entries must link to active tasks/projects.
- Payroll must use approved tracked time only.
- Aggregated cost, profit, payroll, and margin data must not be exposed through dashboards, exports, scheduled reports, AI, automations, or client-safe reports unless permitted.
- Every financial action requires audit logging.

---

## 25. Critical AI Rules

- AI must respect all permissions.
- AI must not expose hidden data.
- AI must not infer or summarize unauthorized aggregates.
- AI must not reveal hidden counts, hidden totals, hidden financial data, hidden payroll data, or cross-client data.
- AI must clearly separate confirmed data from suggestions.
- AI-generated outputs must show source references where possible.
- Human approval is required for important saved changes, critical recommendations, destructive actions, external-facing actions, and sensitive report publishing.
- Prompt injection protection is required across prompts, files, chats, meeting transcripts, and retrieved content.
- AI provider use must follow data minimization and no unauthorized training.
- AI actions, permission decisions, outputs, and failures must be logged.

---

## 26. Critical Automation Rules

- Automations must respect permissions at creation time and runtime.
- Automations must never execute with broader permissions than their configured and approved execution context.
- Runtime permission revalidation is required.
- Automations must auto-pause when the creator/effective actor loses required permission or referenced client/project becomes inaccessible.
- Destructive actions require human approval.
- External-facing actions require human approval unless explicitly configured.
- Financial/payroll automations require Owner or explicit financial/payroll authorization.
- AI-powered automations must follow AI security rules.
- Client-facing automation outputs must be client-safe.
- Replay protection, idempotency, loop prevention, recursion prevention, duplicate prevention, rate limits, dead-letter handling, and compensation rules are required.
- Every automation run and step must be logged.

---

## 27. Critical Reporting Rules

- Reports and dashboards must respect tenant isolation, RBAC, custom permissions, resource scopes, client boundaries, and sensitivity classifications.
- Hidden counts, hidden totals, hidden trends, hidden anomalies, and cross-client aggregates must be suppressed for unauthorized users.
- Financial reports are Owner-only unless explicitly granted.
- Payroll reports are Owner-only unless explicitly granted.
- Client-safe reports must exclude internal notes, draft/private comments, internal chat, employee costs, payroll, profitability, internal margins, cross-client data, other client names, internal workload details, internal AI/admin logs, audit logs, unapproved files, and unapproved report sections.
- Scheduled reports must re-check recipient permissions before every delivery.
- Exports require permission and audit logging.
- Sensitive exports require approval, watermarking, retention rules, and revocation capability.
- Client report publication requires approval and client-safe preview.

---

## 28. Critical QA/Release Rules

- No feature can be approved without acceptance criteria.
- No permission-sensitive feature can be released without permission tests.
- No client-facing feature can be released without client-safe visibility tests.
- No finance/payroll feature can be released without Owner-only and explicit grant validation.
- No AI feature can be released without permission, hallucination, source reference, prompt injection, leakage, multilingual, and human approval tests.
- No automation can be released without trigger, condition, action, versioning, permission revalidation, loop, replay, idempotency, dead-letter, compensation, and failure handling tests.
- No report/dashboard can be released without hidden count/total suppression and cross-client aggregate prevention tests.
- No migration can happen without backup, restore, reconciliation, tenant isolation, and permission integrity validation.
- No release can go live without rollback plan.
- No production release can happen without audit logging validation.

---

## 29. Key Data Objects

| Category | Key Objects |
|---|---|
| Tenant | tenants, tenant_domains, brand_settings, module_entitlements |
| Localization | languages, currencies, timezones |
| Identity | users, tenant_memberships, roles, permissions, role_permissions, membership_roles, invitations, sessions, devices |
| CRM | clients, client_contacts, leads, opportunities, meetings, meeting_participants, contracts, proposals, quotations, follow_ups |
| Projects | projects, tasks, subtasks, task_dependencies, templates, template_versions, recurring_rules |
| Time/Payroll | time_entries, timesheets, employee_profiles, employee_costs, payroll_runs, payroll_items |
| Collaboration | files, file_versions, file_shares, file_locks, voice_notes, chat_channels, chat_members, chat_messages, approvals, approval_approvers, revisions |
| Finance | revenue_records, cost_records, profitability_records, invoices, invoice_line_items, payments, payment_allocations, partial_payments, wallets, wallet_transactions, refunds, credit_notes |
| AI | ai_logs, ai_actions, ai_source_references, transcripts, extraction_results, ai_approval_records, ai_quality_results |
| Automations | automation_rules, automation_rule_versions, automation_execution_contexts, automation_runs, automation_run_steps, automation_dead_letters, automation_idempotency_keys, automation_replay_keys, automation_compensation_records, automation_rate_limit_counters, automation_abuse_events |
| BI/Reports | dashboard_definitions, dashboard_widgets, kpi_definitions, report_definitions, report_versions, report_snapshots, report_exports, scheduled_reports, scheduled_report_runs, report_recipients, client_report_publications, report_access_logs, report_data_lineage, report_export_links, report_watermarks |
| QA/Release | qa_test_plans, qa_test_cases, qa_test_case_steps, qa_test_runs, qa_test_evidence, qa_test_environments, qa_permission_test_matrix, qa_ai_safety_results, qa_automation_safety_results, qa_bi_privacy_results, qa_finance_payroll_results, qa_performance_results, qa_migration_results, qa_hotfix_records, qa_known_issues, qa_release_exceptions, qa_incident_response_records, qa_disaster_recovery_drills |
| Logs | audit_logs, activity_logs, access_logs, financial_logs, payroll_logs, AI logs, automation logs, report logs, release logs |

---

## 30. Key Permissions

| Permission Area | Representative Permissions |
|---|---|
| Tenant/Admin | tenant.view, tenant.update, brand.update, module.configure |
| Users/Roles | user.invite, user.manage, role.manage, permission.grant, permission.revoke |
| CRM | crm.view, lead.create, lead.assign, opportunity.update, proposal.approve, quotation.publish |
| Projects/Tasks | project.view, project.manage, task.create, task.assign, task.update, dependency.manage |
| Time/Payroll | time.start, time.submit, timesheet.approve, payroll.view, payroll.prepare, payroll.approve |
| Collaboration | chat.view, chat.send, file.upload, file.share, file.lock, approval.request, approval.decide |
| Finance | finance.view, revenue.manage, cost.manage, profitability.view, invoice.create, invoice.approve, payment.record, wallet.manage |
| AI | ai.assistant.use, ai.copilot.use, ai.analyst.use, ai.report.generate, ai.admin.configure |
| Automations | automation.create, automation.test, automation.approve, automation.activate, automation.pause, automation.view_logs |
| BI/Reports | dashboard.view, report.view, report.create, report.export, scheduled_report.manage, client_report.publish |
| QA/Release | qa.plan.approve, qa.evidence.review, release.approve, rollback.approve, incident.close |
| Audit/Security | audit.view, security.manage, session.revoke, device.manage, sensitive_action.approve |

All permissions must be evaluated with tenant, role, custom permission, resource scope, client visibility, sensitivity, and explicit grant rules.

---

## 31. Key Dashboards

| Dashboard | Primary Users | Security Rule |
|---|---|---|
| Executive Overview Dashboard | Owner | Global tenant visibility |
| Owner Business Dashboard | Owner | Full operational, financial, payroll, BI access |
| Manager Operations Dashboard | Manager | Assigned/granted operational scope only |
| Employee Personal Dashboard | Employee | Own/assigned work only |
| Client Portal Dashboard | Client | Own client-safe data only |
| CRM & Sales Dashboard | Owner, Manager, granted users | CRM scope and forecast permission required |
| Project Delivery Dashboard | Owner, Manager, assigned employees | Project scope required |
| Task Productivity Dashboard | Owner, Manager, Employee | Own/assigned or granted team scope |
| Team Workload Dashboard | Owner, Manager | Team scope; no unauthorized employee leakage |
| Finance Dashboard | Owner, explicit finance grant | Owner-only by default |
| Payroll Dashboard | Owner, explicit payroll grant | Owner-only by default |
| Profitability Dashboard | Owner, explicit grant | Owner-only by default |
| AI Usage Dashboard | Owner, AI admin | No hidden prompt/output leakage |
| Automation Health Dashboard | Owner, automation admin | Permission-safe logs and redaction |
| Approval Center Dashboard | Owner, Manager, Employee, Client | Scope and client visibility required |
| Client Health Dashboard | Owner, Manager, Client-safe subset for client | No cross-client leakage |

---

## 32. Key Reports

| Report Category | Required Scope |
|---|---|
| CRM Reports | Leads, opportunities, stages, follow-ups, meetings, proposals, quotations |
| Sales Reports | Pipeline, conversion, forecast, won/lost, sales activity |
| Project Reports | Status, delivery, budget, milestones, risks, client health |
| Task Reports | Status, productivity, overdue, dependencies, assignees |
| Productivity Reports | Personal, team, workload, time, throughput |
| Finance Reports | Revenue, costs, invoices, payments, wallets, profitability |
| Payroll Reports | Approved time, payroll runs, exceptions, adjustments |
| Client Reports | Client-safe projects, deliverables, approvals, invoices, payments, reports |
| AI Reports | Usage, quality, source references, incidents, cost controls |
| Automation Reports | Success/failure, retry, dead-letter, blocked, auto-paused, abuse detection |
| Approval Reports | Pending, approved, rejected, revision cycles |
| File Reports | Uploads, downloads, versions, locks, shares, client visibility |
| Voice Note Reports | Transcription status, task conversion, language, consent |
| QA/Release Reports | Test coverage, defects, evidence, release gates, incidents, readiness |

---

## 33. Key Workflows

| Workflow | Governing Rules |
|---|---|
| Invitation and onboarding | Invite-only, no public registration, role/scope assignment |
| Tenant resolution | Domain/subdomain to tenant context before data access |
| Permission check | RBAC, custom permissions, resource scope, sensitivity, audit |
| Lead to revenue | CRM pipeline, proposal approval, won/lost, forecast update |
| Project delivery | Project, task, dependency, file, approval, client visibility |
| Time to payroll | Active task/project, start timer, approved time, payroll approval |
| Invoice to payment | Invoice approval, payment/partial payment, allocation, wallet update |
| Client approval | Client-safe file/report/task approval and revision tracking |
| Voice to task | Consent, transcript, AI extraction, human approval, task creation |
| Meeting to tasks | Transcript/notes, summary, action items, approval, linked tasks |
| AI answer/report | Permission-scoped retrieval, source references, hidden data suppression |
| Automation execution | Trigger, conditions, actions, runtime permission revalidation, logs |
| Report generation/export | Permission-safe query, suppression, approval, watermark, audit |
| Client report publication | Client-safe preview, approval, publication, revocation |
| QA evidence capture | Test execution, evidence, audit references, review, retention |
| Release approval | Gates, evidence, UAT, rollback, incident readiness, go-live |

---

## 34. Key Diagrams

### 34.1 Platform Context

Agency Team + Clients
  -> White-Labeled Web App
  -> Tenant-Aware API
  -> Identity and Permission Engine
  -> Domain Modules
  -> Database, Files, AI, Automations, Reports, Audit Logs

### 34.2 Permission Enforcement

Request
  -> Tenant Resolution
  -> Session Validation
  -> Role Check
  -> Custom Permission Check
  -> Resource Scope Check
  -> Client Visibility Check
  -> Sensitivity Check
  -> Finance/Payroll/AI/Automation/Report Rules
  -> Allow, Deny, Redact, Suppress, or Require Approval
  -> Audit If Required

### 34.3 Finance And Payroll Safety

Task Started
  -> Time Tracked
  -> Timesheet Submitted
  -> Manager/Owner Approval
  -> Approved Time Only
  -> Payroll Draft
  -> Owner or Explicit Payroll Approval
  -> Payroll Record
  -> Audit Log

### 34.4 AI Safety

User Prompt
  -> Permission Context
  -> Data Scope Resolver
  -> Prompt Injection Guard
  -> Permission-Scoped Retrieval
  -> Redaction and Suppression
  -> AI Output
  -> Source References
  -> Human Approval If Critical
  -> AI Audit Log

### 34.5 Automation Lifecycle

Draft Rule
  -> Version-Safe Test
  -> Approval
  -> Active Version
  -> Trigger Event
  -> Runtime Permission Revalidation
  -> Condition Evaluation
  -> Action Execution
  -> Step Logs
  -> Retry, Dead Letter, Compensation, or Complete

### 34.6 BI Reporting Safety

Report Request
  -> Permission-Safe Data Query
  -> Field Sensitivity Classification
  -> Hidden Count/Total Suppression
  -> Aggregate Suppression
  -> Report Render
  -> Export/Publish Approval If Sensitive
  -> Watermark or Signed Link
  -> Audit Log

### 34.7 QA And Release Governance

Feature Ready
  -> Acceptance Criteria
  -> Test Plan
  -> Test Execution
  -> Evidence
  -> Defect Triage
  -> Regression
  -> UAT
  -> Release Gates
  -> Rollback Validation
  -> Production Release
  -> Monitoring

---

## 35. Implementation Readiness Summary

MAOS is implementation-ready when:

- Architecture boundaries are mapped into implementation modules.
- Database objects and addenda are converted into migration plans only after review.
- Permission matrix is mapped to enforceable access checks.
- Client-safe visibility rules are implemented server-side.
- Finance/payroll restrictions are enforced across UI, API, AI, automation, reports, and exports.
- AI provider configuration, retention, redaction, prompt injection protection, and audit logging are designed.
- Automation engine safety controls are implemented before enabling tenant rules.
- Reporting suppression, export approval, signed link, revocation, and watermarking rules are implemented.
- QA test matrices are converted into executable test cases with evidence capture.
- Release governance gates are active before production launch.

---

## 36. Open Implementation Decisions

These decisions must be resolved before detailed build execution:

| Decision | Options | Required Before |
|---|---|---|
| Initial backend structure | Modular monolith or extracted services | Development architecture |
| Tenant isolation tiering | Shared DB only or optional enterprise isolation | Enterprise plan design |
| File storage provider | Cloud object storage provider and region strategy | File implementation |
| AI provider strategy | Primary provider, fallback provider, data residency controls | AI implementation |
| Payment provider | Supported payment gateway and refund/partial payment behavior | Finance implementation |
| Search architecture | Operational search, vector search, BI search separation | Search/AI implementation |
| Analytics store | Operational DB aggregates or dedicated analytics store | BI implementation |
| MFA policy | Required for all users or configurable by tenant/role | Security implementation |
| Data retention defaults | Global defaults plus tenant overrides | Compliance implementation |
| RPO/RTO targets | Baseline and enterprise targets | Production readiness |
| Export formats | PDF, spreadsheet, CSV, report snapshots | Reporting implementation |
| Release cadence | Scheduled releases, hotfix policy, emergency release path | Release governance |

---

## 37. Risks And Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Permission leakage across tenant/client boundaries | Critical | Central permission engine, tenant filters, resource scope checks, QA permission catalog |
| Financial/payroll exposure | Critical | Owner-only defaults, explicit grants, field sensitivity, audit logs, report/export restrictions |
| AI exposing hidden data | Critical | Permission-scoped retrieval, redaction, prompt injection protection, source controls, AI safety tests |
| Automation executing unauthorized actions | Critical | Execution context, runtime revalidation, human approval, auto-pause, run logs |
| BI reports leaking hidden counts/totals | Critical | Aggregate suppression, hidden count/total suppression, scheduled recipient revalidation |
| Client portal exposing internal content | Critical | Client-safe status, preview, approval workflow, visibility tests |
| Weak QA evidence before release | High | Evidence schema, RACI, release gates, test dashboards, UAT sign-off |
| Migration data corruption | High | Backup, restore, reconciliation, referential integrity, tenant/permission integrity tests |
| Performance degradation with reports/AI/files | Medium | Performance thresholds, queues, monitoring, caching, batch limits |
| Inconsistent localization | Medium | RTL/LTR test matrix, mixed-language testing, localized formatting tests |
| White-label domain misconfiguration | Medium | Domain verification, TLS automation, fallback domains, audit logs |

---

## 38. Acceptance Criteria

The Master Specification v1.0 is accepted only if:

- It preserves all approved Phase 1 through Phase 12 scope areas.
- It preserves invite-only access and no public registration.
- It preserves tenant isolation.
- It preserves RBAC and custom permissions.
- It preserves Owner, Manager, Employee, and Client access boundaries.
- It preserves Owner Only Financial Access.
- It preserves payroll restriction rules.
- It preserves No Start = No Time, No Time = No Payroll, and Approved Time Only Payroll.
- It preserves AI permission, safety, retention, provider, redaction, quality, and incident rules.
- It preserves automation execution context, versioning, safety, failure, logging, and abuse prevention rules.
- It preserves dashboard, report, BI, export, scheduled report, client-safe, hidden count, and hidden total suppression rules.
- It preserves QA, evidence, test matrix, UAT, release, rollback, incident, and post-launch monitoring rules.
- It includes key architecture, database, security, module, workflow, dashboard, report, data object, permission, diagram, risk, and checklist summaries.
- It contains no code, SQL, migration, or implementation script.

---

## 39. Final System Checklist

| Area | Required Before Build | Status |
|---|---|---|
| Enterprise architecture | Multi-tenant, SaaS, white label, deployment, AI, security, notifications, files, billing, environments | Specified |
| Database foundation | Core objects, relationships, constraints, indexes, addenda | Specified |
| Security | RBAC, custom permissions, invite-only, sessions, devices, audit, API/file/AI security | Specified |
| CRM/Sales | Leads, opportunities, meetings, follow-ups, proposals, quotations, forecasting | Specified |
| UI/UX | Internal workspace, client portal, core pages, RTL/LTR, states | Specified |
| Projects/Tasks | Projects, tasks, subtasks, dependencies, workload, skills, recurring work, templates | Specified |
| Collaboration | Chat, voice notes, files, versions, locks, approvals, revisions | Specified |
| Client Portal | Client-safe visibility, approvals, reports, invoices, payments, wallet | Specified |
| Finance/Payroll | Revenue, costs, profit, invoices, payments, wallet, payroll, approvals | Specified |
| AI | Assistant, Copilot, Analyst, Voice To Task, Meeting To Tasks, Search, Reporting, Analytics | Specified |
| Automations | Rule model, builder, triggers, conditions, actions, schedules, safety, logs, analytics | Specified |
| BI/Reports | Dashboards, reports, KPIs, exports, scheduled reports, suppression, governance | Specified |
| QA/Release | Test governance, evidence, matrices, UAT, bugs, incidents, release gates, rollback | Specified |
| Critical rules | Business, security, finance, AI, automation, reporting, QA/release rules | Preserved |
| Implementation readiness | Open decisions, risks, mitigations, acceptance criteria | Specified |

## 40. Master Traceability Appendix

The Master Specification is the unified executive and implementation reference. Detailed technical depth remains governed by the approved phase documents and their hardening/fix addendums. Where the Master summarizes a topic, the source phase document remains authoritative for detailed implementation.

| Phase | Phase Name | Master Sections Preserving It | Critical Requirements Preserved | Addendums Preserved | Status | Notes |
|---|---|---|---|---|---|---|
| Phase 1 | Enterprise Architecture | 6, 19, 34, 35, 36, 37, 39 | Multi-tenant architecture, invite-only access, modular design, internal workspace, client portal, AI-ready architecture, audit-ready architecture, scalability, platform boundaries | Not applicable | Preserved / Needs External Reference | Phase 1 remains authoritative for full architecture diagrams and environment detail |
| Phase 2 | Enterprise Database Design | 7, 29, 30, 34, 35, 38, 39, 40 | ERD coverage, table groups, relationships, constraints, indexes, all modules, AI/database extensions, automation extensions, BI/reporting extensions, QA/release extensions | Later-phase database addendums referenced and preserved | Preserved / Needs External Reference | Phase 2 remains authoritative for detailed ERDs, fields, constraints, and index planning |
| Phase 3 | Security & Permissions | 8, 20, 21, 23, 24, 25, 26, 27, 30, 34, 38, 39 | RBAC, custom permissions, invite-only access, sessions, devices, login history, audit logs, AI/API/file security, Owner/Manager/Employee/Client roles | Security rules from AI, automation, BI, and QA phases preserved | Preserved / Needs External Reference | Phase 3 remains authoritative for detailed permission evaluation and security matrices |
| Phase 4 | CRM & Sales | 9, 19, 31, 32, 33, 38, 39 | Leads, opportunities, meetings, follow-ups, proposals, quotations, forecasting, pipeline, workflows, dashboards, KPIs | BI/reporting overlap preserved in Phase 11 summaries | Preserved / Needs External Reference | Phase 4 remains authoritative for detailed CRM workflows and dashboard behavior |
| Phase 5 | UI/UX Design System | 10, 13, 20, 21, 31, 34, 38, 39 | Dashboard, CRM, client portal, projects, tasks, calendar, chat, voice notes, AI assistant, finance center, reports, settings, Arabic RTL, English LTR, German LTR, wireframes, page specifications | Not applicable | Preserved / Needs External Reference | Phase 5 remains authoritative for detailed wireframes, layouts, states, and components |
| Phase 6 | Project Management | 11, 19, 20, 21, 29, 31, 32, 33, 38, 39 | Projects, tasks, subtasks, dependencies, workload balancer, skill matching, recurring tasks/projects, templates, project workflows | Automation and BI/reporting overlaps preserved | Preserved / Needs External Reference | Phase 6 remains authoritative for detailed project/task workflow rules |
| Phase 7 | Collaboration | 12, 13, 19, 20, 21, 29, 31, 32, 33, 38, 39 | Internal chat, client chat, voice notes, voice uploads, files, versioning, locking, approval center, revision tracking, permissions | AI voice/task and BI/reporting overlaps preserved | Preserved / Needs External Reference | Phase 7 remains authoritative for detailed collaboration workflows and visibility rules |
| Phase 8 | Finance & Payroll | 14, 19, 20, 21, 24, 29, 31, 32, 33, 34, 38, 39 | Revenue, cost, profit, payroll, employee costs, invoices, partial payments, wallets, profitability, No Start = No Time, No Time = No Payroll, Approved Time Only Payroll, Owner Only Financial Access | BI/reporting, AI, automation, and QA finance/payroll safety preserved | Preserved / Needs External Reference | Phase 8 remains authoritative for detailed financial and payroll workflows |
| Phase 9 | AI Ecosystem | 15, 19, 21, 25, 29, 31, 32, 33, 34, 35, 37, 38, 39 | AI Assistant, Copilot, Analyst, Voice To Task, Meeting To Tasks, AI Search, AI Reporting, AI Analytics, Arabic/English/German, permission enforcement, prompt injection, retention, provider policy, PII redaction, incident response | Phase 9 hardening addendum preserved | Preserved / Needs External Reference | Phase 9 remains authoritative for detailed AI module behavior and governance |
| Phase 10 | Automations & Workflow Engine | 16, 19, 21, 26, 29, 30, 31, 32, 33, 34, 35, 37, 38, 39 | Rules, workflow builder, triggers, conditions, actions, logs, versioning, execution context, runtime revalidation, dead-letter, compensation, replay/idempotency, analytics, security | Phase 10 critical fix/security/database addendums preserved | Preserved / Needs External Reference | Phase 10 remains authoritative for detailed automation catalogs, contexts, and failure models |
| Phase 11 | Executive Dashboards, Reports & BI | 17, 19, 20, 21, 27, 29, 31, 32, 33, 34, 35, 37, 38, 39 | Executive/Owner/Manager/Employee/Client dashboards, CRM/project/finance/payroll/profitability reports, custom/scheduled/exportable reports, KPI library, BI analytics, hidden count/total suppression, watermarking, expiring links, revocation, lineage, versioning, security | Phase 11 critical fix/security/database addendums preserved | Preserved / Needs External Reference | Phase 11 remains authoritative for detailed BI governance, KPI formulas, and export controls |
| Phase 12 | QA, Testing, Release Governance | 18, 19, 21, 28, 29, 30, 32, 33, 34, 35, 37, 38, 39 | QA strategy, test planning, functional/security/permission/AI/automation/BI/finance/payroll/performance/accessibility/multilingual/migration testing, UAT, bugs, incidents, rollback, go-live, monitoring, QA evidence, RACI, environments, hotfix, known issues, release exception, DR testing | Phase 12 critical fix/database/workflow/diagram addendums preserved | Preserved / Needs External Reference | Phase 12 remains authoritative for detailed test matrices, evidence, release gates, and incident workflows |

**Final Master Specification Statement:** MAOS Master Specification v1.0 is the approved single source of truth for platform design and future development planning. All implementation, QA, release, and future specification updates must preserve the critical access, security, finance, AI, automation, reporting, and release governance rules defined here unless superseded by a formally approved later master version.
