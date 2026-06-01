# MAOS Phase 13 MVP Roadmap & Implementation Plan

**Version:** 1.0  
**Phase:** Phase 13  
**Status:** MVP Roadmap Draft For Approval  
**Primary Reference:** `MAOS_MASTER_SPECIFICATION_v1.0.md`  
**Supporting References:** Approved Phase 1 through Phase 12 documents where deeper detail is required  
**Document Role:** Convert the approved Master Specification into a realistic phased MVP and post-MVP implementation roadmap  
**Code Policy:** No code, SQL, migrations, or implementation scripts are included in this document.

---

## 1. MVP Definition

The MAOS MVP is the smallest production-ready version that proves the core operating system value for a marketing agency: invite users, manage roles, run internal and client workspaces, manage clients/projects/tasks, collaborate through chat/files/approvals/voice notes, track a basic CRM pipeline, create basic invoices and partial payments, show basic dashboards/reports, and preserve audit/security controls for sensitive actions.

The MVP must be useful for a real agency team with real clients, but it must avoid advanced systems that require mature operational data, advanced AI governance, or complex automation maturity.

MVP success means:

- Owners, managers, employees, and clients can use the platform safely.
- Invite-only access, tenant isolation, core RBAC, and audit logs are functional.
- Projects, tasks, subtasks, files, chat, approvals, and client portal workflows are usable.
- Basic CRM lead-to-opportunity workflows are usable.
- Basic invoices, partial payments, and owner-only revenue visibility are usable.
- Basic voice notes and voice-to-task drafting are usable.
- Basic dashboards and reports reflect data from MVP modules.
- QA, UAT, security, permission, and rollback gates are complete before launch.

### 1.1 MVP First-User Target And Pilot Tenant Profile

The first MAOS MVP pilot should target one small to mid-sized marketing agency with real client delivery work, not an enterprise group with complex governance needs.

| Profile Area | MVP Pilot Definition |
|---|---|
| First target company type | Small to mid-sized marketing agency delivering content, design, social media, video editing, campaign support, and client approvals |
| Team size | 5 to 20 internal team members |
| Number of internal users | 5 to 20 invited users across Owner, Manager, Employee roles |
| Number of client users | 3 to 10 active clients, with 1 to 3 invited users per client where needed |
| Countries/languages | Distributed team across multiple countries; Arabic, English, and German support required from the start |
| Main roles | Owner, Manager, Video Editor, Graphic Designer, Script Writer, Client |
| Main pain points | Work scattered across chat/files/tasks, unclear client approvals, missed follow-ups, weak project visibility, slow conversion from voice/chat to tasks, basic invoice/payment tracking outside delivery workflows |
| Required first workflows | Projects, tasks, subtasks, internal chat, files, file versions, basic approvals, voice notes, voice-to-task, CRM pipeline, invoices, partial payments, basic dashboards |
| Required client-facing workflows | Client portal login, client project view, client chat, file review, approval/revision decision, own invoice/payment view, client-safe report view |
| Pilot success | Pilot agency can manage active client work for at least one complete delivery cycle without using separate tools for core tasks, approvals, files, client chat, basic CRM, and basic invoice/payment visibility |
| Intentionally excluded from pilot | Advanced AI Analyst, full automation builder, full payroll automation, advanced BI forecasting, complex recurring projects, integration marketplace, full mobile app, white-label customization, advanced wallet flows |

### 1.2 MVP Assumptions And Operating Constraints

| Assumption / Constraint | Rule |
|---|---|
| Web-first delivery | MVP is a responsive web app, not a full native mobile app |
| Invite-only access | MVP is invite-only and does not include public registration |
| Pilot tenant count | MVP starts with one tenant or a small number of controlled pilot tenants |
| Language support | MVP supports Arabic, English, and German from the start, including RTL/LTR validation |
| AI scope | MVP includes basic AI only, focused on voice-to-task and bounded task/follow-up drafts, not full AI Analyst |
| Finance scope | MVP includes basic finance, invoices, partial payments, and revenue visibility, not full payroll automation |
| Workflow maturity | MVP prioritizes manual workflows before advanced automations |
| Reporting scope | MVP includes basic reports and dashboards, not advanced BI forecasting |
| Security dependency | Permissions and audit logs must be implemented before client portal and finance workflows are released |
| Source of truth | MVP uses approved `MAOS_MASTER_SPECIFICATION_v1.0.md` as the source of truth |
| Open decisions | Open implementation decisions must be resolved before Milestone 0 exits or explicitly assigned within Milestone 0 |

---

## 2. MVP Scope

### 2.1 Included In MVP

| Area | MVP Scope |
|---|---|
| Workspaces | Owner workspace, Manager workspace, Employee workspace, Client portal |
| Access | Invite-only access, no public registration, tenant membership, sessions, devices, login history basics |
| Permissions | Core RBAC, custom permission foundation, resource scope, client-visible flags |
| Audit | Audit logs for sensitive actions, financial visibility, client portal publication, role/permission changes |
| Projects | Projects, statuses, project members, client linkage, basic project detail |
| Tasks | Tasks, subtasks, statuses, priority, assignee, due date, dependencies basic |
| Approvals | Basic approval request, approve, reject, revision requested |
| Files | Upload, download, metadata, file versioning, client visibility flag |
| Chat | Internal chat and client chat basics |
| Voice | Voice notes, uploads, transcription placeholder/process state, basic voice-to-task extraction and confirmation |
| CRM | Basic pipeline, leads, opportunities, meetings, follow-ups |
| Finance | Basic invoices, basic partial payments, basic revenue tracking, Owner-only finance visibility |
| Dashboards | Basic role dashboard, project/task summary, CRM summary, finance summary for Owner only |
| Reports | Basic project, task, CRM, invoice/payment, and client-safe reports |
| AI | Basic AI helper for voice-to-task and simple task/report drafts after files/tasks/voice exist |
| Automation | Minimal system automations only: notifications, reminders, status events, audit events |
| QA | MVP acceptance criteria, permission tests, client-safe tests, finance tests, AI safety tests, release rollback |

### 2.2 MVP Non-Negotiable Rules

- Invite-only access.
- No public registration.
- Tenant isolation.
- RBAC and custom permission foundation.
- Owner sees everything within tenant.
- Managers see assigned/granted data only.
- Employees see own/assigned work only.
- Clients see only their own client-visible data.
- Owner Only Financial Access.
- Payroll is not automated in MVP.
- AI must respect permissions.
- Client-facing outputs must be client-safe.
- Reports must suppress hidden counts and hidden totals where applicable.
- Exports require permission and audit logging if included.
- Every sensitive action must be logged.
- No MVP release without acceptance criteria and rollback plan.

---

## 3. Non-MVP Scope

The following capabilities are intentionally excluded from MVP unless later reclassified as critical:

| Capability | Reason For Exclusion | Target Version |
|---|---|---|
| Advanced AI Analyst | Requires mature data quality, permissions, and analytics validation | 1.2 or 2.0 |
| Advanced BI forecasting | Requires historical data and validated KPI definitions | 1.2 |
| Full payroll automation | High financial/security risk; time tracking must mature first | 1.2 or 2.0 |
| Advanced wallet system | Basic payment tracking is enough for MVP | 1.1 |
| Complex recurring projects | Adds scheduling and dependency complexity | 1.2 |
| Full automation builder | Manual workflows must stabilize first | 1.2 or 2.0 |
| Advanced profitability analytics | Requires mature cost, revenue, time, and payroll data | 1.2 |
| Advanced anomaly detection | Requires BI maturity and historical baselines | 2.0 |
| Complex integration marketplace | Not needed to validate core operating system value | 2.0 |
| White-label tenant customization | Valuable but not needed for first operational validation | 1.1 |
| Advanced data warehouse | Premature before validated reporting needs | 2.0 |
| Full mobile app | Responsive web is sufficient for MVP | 2.0 |

### 3.1 MVP Scope Control Rules

- No advanced AI Analyst in MVP.
- No full automation builder in MVP.
- No full payroll automation in MVP.
- No advanced BI forecasting in MVP.
- No complex recurring projects in MVP.
- No integration marketplace in MVP.
- No full mobile app in MVP.
- No advanced wallet system in MVP.
- No white-label customization in MVP.
- Any MVP scope expansion must include business justification, dependency check, security review, and schedule impact review.
- Any MVP scope expansion touching client data, finance, AI, reports, files, permissions, or audit logs requires explicit Owner/Product approval and QA impact review.

---

## 4. Phase-By-Phase Implementation Roadmap

### 4.1 MVP Release

| Category | Details |
|---|---|
| Included modules | Auth, tenants, roles, permissions, audit logs, core workspace UI, client portal, projects, tasks, subtasks, basic dependencies, basic approvals, files/versioning, internal/client chat, voice notes, voice-to-task basic, CRM basic, invoices basic, partial payments basic, basic revenue tracking, dashboards/reports basic, QA/release governance |
| Excluded modules | Full automation builder, advanced AI Analyst, full payroll automation, advanced wallet, complex recurring projects, advanced BI forecasting, advanced profitability, marketplace, full white-label customization, mobile app |
| Business reason | Deliver usable agency operations and client-facing value with strong security foundations |
| Technical dependencies | Tenant model, permission engine, audit logs, project/task data, client portal visibility, file storage, notification foundation |
| Risks | Permission leakage, client portal exposure, finance access exposure, immature AI results, incomplete QA coverage |
| Acceptance criteria | MVP workflows pass role-based, client visibility, finance visibility, AI safety, audit, UAT, and rollback tests |

### 4.2 Version 1.1

| Category | Details |
|---|---|
| Included modules | White-label tenant branding basics, enhanced client portal, wallet basic, invoice reminders, proposal/quotation improvements, scheduled basic reports, richer dashboard filters, recurring task basics, file preview improvements |
| Excluded modules | Full automation builder, advanced forecasting, payroll automation, advanced AI Analyst, marketplace |
| Business reason | Improve client experience and billing operations after MVP adoption |
| Technical dependencies | Stable MVP client portal, invoice/payment records, reporting foundation, branding configuration |
| Risks | Branding complexity, report delivery leakage, wallet visibility errors |
| Acceptance criteria | Client-safe branding, scheduled report permission checks, wallet audit logs, and invoice reminder workflows pass QA |

### 4.3 Version 1.2

| Category | Details |
|---|---|
| Included modules | Advanced profitability analytics, payroll approval workflow, employee cost management, recurring projects, workload balancer, skill matching, AI reporting, AI search, automation rule templates, KPI library expansion |
| Excluded modules | Full public marketplace, advanced anomaly engine, full data warehouse, native mobile app |
| Business reason | Add operational intelligence once enough trustworthy MVP/1.1 data exists |
| Technical dependencies | Mature time tracking, finance records, project history, team assignments, report definitions |
| Risks | Payroll exposure, profitability leakage, AI inference risk, inaccurate workload data |
| Acceptance criteria | Owner-only finance/payroll tests, aggregate suppression, AI source/reference checks, and payroll approval tests pass |

### 4.4 Version 2.0

| Category | Details |
|---|---|
| Included modules | Full automation builder, advanced BI forecasting, anomaly detection, advanced AI Analyst, enterprise data warehouse, integration marketplace, native mobile app, enterprise tenant isolation options |
| Excluded modules | Anything not validated by business demand or compliance readiness |
| Business reason | Scale from agency operating system to enterprise-grade operating platform |
| Technical dependencies | Mature domain events, analytics store, automation safety model, AI governance, integration framework |
| Risks | Automation abuse, AI leakage, BI inference risk, integration security, data residency complexity |
| Acceptance criteria | Enterprise security review, automation safety testing, BI privacy testing, AI incident response testing, and disaster recovery drills pass |

---

## 5. Module Priority Ranking

| Priority | Module | Reason |
|---|---|---|
| P0 | Tenants, auth, invitations, roles, permissions | Required before any sensitive or client-facing feature |
| P0 | Audit logs | Required before finance, client portal, permissions, AI, and sensitive actions |
| P0 | Core workspace UI | Required for all user roles to operate |
| P0 | Projects, tasks, subtasks | Central agency delivery workflow |
| P0 | Client portal | Early client-facing value and validation |
| P1 | Files, file versioning, basic approvals | Core deliverable review workflow |
| P1 | Internal chat and client chat | Core collaboration and client communication |
| P1 | CRM basic | Pipeline and sales visibility |
| P1 | Finance basic | Basic owner-only revenue/invoice/payment visibility |
| P1 | Basic dashboards/reports | Operational visibility from MVP data |
| P2 | Voice notes and voice-to-task basic | High-value productivity feature after tasks/files exist |
| P2 | Basic AI helper | Must wait for permission-safe data sources |
| P3 | Advanced automation | Deferred until manual workflows stabilize |
| P3 | Advanced BI/forecasting/profitability | Deferred until reliable data exists |
| P3 | Full payroll automation | Deferred due to financial and compliance risk |

---

## 6. Feature Priority Matrix

| Feature | Business Value | Risk | MVP Decision | Reason |
|---|---:|---:|---|---|
| Invite-only access | High | High if missing | Build MVP | Required foundation |
| Tenant isolation | High | Critical if missing | Build MVP | Required architecture rule |
| Core RBAC | High | Critical if missing | Build MVP | Required before client/finance |
| Audit logs | High | High if missing | Build MVP | Required for sensitive actions |
| Projects/tasks/subtasks | High | Medium | Build MVP | Core agency work |
| Client portal | High | High | Build MVP | Client-facing value; requires strict visibility |
| Basic approvals | High | Medium | Build MVP | Required for deliverables |
| File uploads/versioning | High | Medium | Build MVP | Required for client deliverables |
| Internal/client chat | Medium | Medium | Build MVP | Collaboration core |
| Voice notes | Medium | Medium | Build MVP | Useful differentiator |
| Voice-to-task basic | Medium | High | Build MVP after tasks/files | AI-adjacent but bounded |
| CRM basic pipeline | High | Medium | Build MVP | Sales foundation |
| Proposal/quotation advanced | Medium | Medium | Later | CRM basic first |
| Invoices basic | High | High | Build MVP | Owner finance visibility |
| Partial payments basic | Medium | Medium | Build MVP | Common client billing need |
| Wallet advanced | Medium | High | Later | Not needed for MVP validation |
| Payroll automation | High | Critical | Later | Requires mature time approval |
| Basic dashboard/reporting | High | Medium | Build MVP | Needed for operational visibility |
| Advanced BI forecasting | Medium | High | Later | Requires history and data quality |
| Full automation builder | High | Critical | Later | Manual workflows first |
| White-label customization | Medium | Medium | Later | Useful but not core MVP |

---

## 7. MVP User Roles

| Role | MVP Capabilities |
|---|---|
| Owner | Full tenant access, invite/manage users, configure roles, view all projects/CRM/client data, access owner-only finance, review dashboards/reports, view audit logs |
| Manager | Manage assigned clients/projects/tasks/CRM records, approve assigned deliverables, view assigned operational reports, use internal/client chat |
| Employee | View and update assigned projects/tasks/subtasks, upload files, participate in internal/client scoped chat, submit voice notes, create task drafts |
| Client | Access invited client portal, view client-visible projects/files/tasks/reports/invoices/payments, participate in client chat, approve/reject deliverables |

---

## 8. MVP User Journeys

| Journey | Steps | Success Outcome |
|---|---|---|
| Owner onboarding | Tenant created, Owner invited, password/session created, workspace opened | Owner can configure roles and invite team |
| Team onboarding | Owner invites manager/employee, role assigned, user accepts invite | User accesses only permitted workspace data |
| Client onboarding | Manager/Owner invites client, client accepts, portal opens | Client sees only own client-visible data |
| Project delivery | Manager creates project, tasks, assignees, files, approvals | Team can deliver work and client can approve |
| Task execution | Employee opens task, updates status, adds file/comment/voice note | Work progress is visible to authorized users |
| Client approval | File/task sent for approval, client approves/rejects/revisions | Approval decision is logged and visible |
| CRM pipeline | Lead created, contacted, meeting scheduled, opportunity updated | Sales pipeline reflects current state |
| Invoice/payment | Owner creates invoice, records partial payment, sees revenue | Finance data visible only to Owner |
| Voice-to-task | User uploads voice note, system extracts task draft, user confirms | Task is created only after confirmation |
| Basic reporting | User opens dashboard/report | Report shows only permitted data |

---

## 9. MVP Core Workflows

| Workflow | MVP Scope |
|---|---|
| Invitation workflow | Owner/authorized manager invites user, role/scope assigned, invite accepted, audit logged |
| Permission workflow | Tenant, session, role, custom permission, resource scope, client visibility checked |
| Project creation workflow | Manager/Owner creates project, links client, assigns members |
| Task workflow | Create, assign, update status, add subtasks, attach files, comment |
| Approval workflow | Request approval, approve, reject, request revision, audit decision |
| File workflow | Upload, version upload, set visibility, download if permitted |
| Chat workflow | Internal channel or client channel, scoped membership, safe file links |
| Voice-to-task workflow | Upload/record, transcript/extract, review draft, confirm task creation |
| CRM workflow | Lead, contacted, meeting, opportunity stage, follow-up |
| Invoice/payment workflow | Invoice draft/basic approval, partial payment record, owner-only revenue update |
| Dashboard/report workflow | Permission-safe query, render allowed metrics, suppress hidden data |
| MVP release workflow | QA plan, test execution, UAT, release gate, rollback validation, launch |

---

## 10. MVP Data Objects

| Domain | MVP Data Objects |
|---|---|
| Tenant/Auth | tenants, tenant_memberships, users, invitations, sessions, devices |
| Permissions | roles, permissions, role_permissions, membership_roles, resource scopes |
| Audit | audit_logs, activity_logs, login history events |
| Clients | clients, client_contacts |
| Projects | projects, project_members |
| Tasks | tasks, subtasks, basic task_dependencies |
| Collaboration | chat_channels, chat_members, chat_messages |
| Files | files, file_versions, file_shares/basic visibility |
| Approvals | approvals, approval_approvers/basic decisions |
| Voice | voice_notes, transcripts/basic extraction result |
| CRM | leads, opportunities, meetings, follow_ups |
| Finance | invoices, invoice_line_items, payments, payment_allocations/basic partial payment, revenue_records/basic |
| Reports | dashboard widgets/basic report definitions |
| QA | test_cases, test_runs, test_evidence, defects, release_checklists |

---

## 11. MVP Permissions

| Permission Area | MVP Permissions |
|---|---|
| Access | login, accept_invite, logout, revoke_session |
| Users | invite_user, view_users, assign_role, deactivate_user |
| Roles | view_roles, manage_roles_owner_only, grant_permission_owner_only |
| Clients | create_client, view_client, update_client, invite_client_user |
| Projects | create_project, view_project, update_project, assign_project_member |
| Tasks | create_task, update_task, assign_task, view_task, comment_task |
| Subtasks | create_subtask, update_subtask, complete_subtask |
| Files | upload_file, view_file, download_file, upload_file_version, publish_client_visible_file |
| Chat | view_channel, send_message, manage_channel_members |
| Approvals | request_approval, decide_approval, view_approval |
| Voice | create_voice_note, view_voice_note, create_task_from_voice |
| CRM | create_lead, update_lead, create_opportunity, update_opportunity, manage_follow_up |
| Finance | owner_view_finance, create_invoice, record_payment, view_client_invoice |
| Reports | view_dashboard, view_basic_report, export_report_if_enabled |
| Audit | view_audit_owner, create_audit_event_system |

---

## 12. MVP UI Screens

| Screen | MVP Requirement |
|---|---|
| Login/invite acceptance | Invite token validation, password setup, language-aware layout |
| Owner dashboard | Tenant overview, projects, tasks, CRM, finance summary, audit alerts |
| Manager dashboard | Assigned clients, projects, tasks, approvals, CRM follow-ups |
| Employee dashboard | Assigned tasks, due work, files, chat, voice notes |
| Client dashboard | Client-visible projects, approvals, files, invoices/payments |
| Users and roles | Invite users, assign roles, view access scopes |
| Projects list/detail | Project status, members, client link, tasks, files, approvals |
| Task detail | Fields, subtasks, status, comments, files, voice note link |
| Client portal project | Client-safe project summary, deliverables, approvals |
| CRM board | Lead/opportunity pipeline, follow-ups, meetings |
| Lead/opportunity detail | Record details, activity, follow-ups, meeting links |
| Chat | Internal and client channel views |
| File library | Upload, version, visibility, download |
| Approval center | Pending approvals, decisions, revisions |
| Voice notes | Record/upload, transcript state, task draft confirmation |
| Finance basic | Owner-only invoices, payments, partial payments, revenue |
| Reports basic | Project, task, CRM, invoice/payment, client-safe reports |
| Settings | Tenant basics, language, roles, permissions |

---

## 13. MVP Dashboard Scope

| Dashboard | MVP Widgets |
|---|---|
| Owner dashboard | Active projects, overdue tasks, pending approvals, open leads/opportunities, unpaid invoices, partial payments, basic revenue |
| Manager dashboard | Assigned projects, team task load, pending approvals, CRM follow-ups, client activity |
| Employee dashboard | My tasks, due soon, approvals assigned to me, recent files, mentions |
| Client dashboard | My projects, pending approvals, recent files, invoices/payment status |
| Basic CRM dashboard | Leads by stage, follow-ups due, opportunities by stage |
| Basic finance dashboard | Owner-only invoices, payments, partial payments, revenue total |

MVP dashboards must not include advanced forecasting, advanced profitability, payroll analytics, anomaly detection, or cross-client benchmarking.

---

## 14. MVP Reports Scope

| Report | MVP Scope |
|---|---|
| Project status report | Project status, task counts, overdue tasks, approval status |
| Task report | Tasks by status, assignee, due date, priority |
| Client-safe project report | Approved client-visible project progress and deliverables |
| CRM basic report | Leads, opportunities, stages, follow-ups, meetings |
| Invoice/payment report | Owner-only invoice status, partial payments, outstanding amount |
| Client invoice/payment report | Client sees own approved invoices and payment status |
| Audit report basic | Owner views sensitive actions and permission changes |

Exporting sensitive reports is optional for MVP. If enabled, permission and audit logging are mandatory.

---

## 15. MVP AI Scope

| AI Capability | MVP Decision |
|---|---|
| Voice-to-task basic | Included after tasks, files, and voice notes exist |
| AI task draft | Included only with user confirmation |
| AI meeting-to-task | Not MVP unless simple text notes only |
| AI Assistant Q&A | Limited to navigation/help and permission-safe summaries if data sources are ready |
| AI Copilot | Limited to task/follow-up draft suggestions |
| AI Analyst | Not MVP |
| AI Search | Not MVP; basic keyword search may exist without AI |
| AI Reporting/Analytics | Not MVP |

MVP AI rules:

- AI must respect permissions.
- AI must not expose hidden data.
- AI-generated task creation requires human confirmation.
- AI source context must be shown where possible.
- AI logs must record prompt/output/action metadata where sensitive.
- Prompt injection protection must apply to file/chat/voice-derived content.

---

## 16. MVP Automation Scope

| Automation Capability | MVP Decision |
|---|---|
| Notification automation | Included for invites, tasks, approvals, comments, follow-ups, invoices |
| Audit event automation | Included for sensitive actions |
| Reminder automation | Included for due tasks, follow-ups, approvals, invoice reminders if configured |
| Full workflow builder | Not MVP |
| AI-powered automations | Not MVP except voice-to-task draft support |
| Finance automations | Limited to status notifications and audit logs |
| Payroll automations | Not MVP |
| Client-facing automations | Limited, client-safe, auditable |

MVP automations must be system-defined, not tenant-built through a full builder.

---

## 17. MVP Finance/Payroll Scope

### 17.1 MVP Finance

Included:

- Basic invoices.
- Invoice line items.
- Basic invoice statuses.
- Basic partial payment records.
- Payment status tracking.
- Basic revenue tracking.
- Owner-only finance dashboard.
- Client visibility into own approved invoices and payments.
- Audit logs for invoice/payment/revenue actions.

Excluded:

- Payroll automation.
- Employee cost management.
- Advanced profitability analytics.
- Advanced wallet system.
- Refund/credit note advanced workflows unless needed for compliance.
- Automated tax/accounting logic.

### 17.2 MVP Payroll

Payroll is not automated in MVP. MVP must preserve payroll rules for future implementation:

- No Start = No Time.
- No Time = No Payroll.
- Approved Time Only Payroll.
- Payroll data restricted to Owner or explicit grants.

If time tracking is included in MVP, it must be treated as operational time tracking only unless payroll approval is explicitly implemented later.

---

## 18. MVP QA Scope

MVP QA must include:

- Acceptance criteria for every MVP feature.
- Role-based permission testing.
- Tenant isolation testing.
- Client portal visibility testing.
- Owner-only finance visibility testing.
- Audit log validation for sensitive actions.
- File access and file versioning testing.
- Chat scope testing.
- Voice-to-task safety testing.
- AI prompt injection and hidden data leakage tests for MVP AI features.
- Basic dashboard/report hidden data tests.
- Accessibility and RTL/LTR smoke tests for Arabic, English, and German.
- UAT with Owner, Manager, Employee, and Client roles.
- Release rollback plan.
- Post-launch monitoring plan.

---

## 19. Technical Dependencies

| Dependency | Required By | Notes |
|---|---|---|
| Tenant resolver | All modules | Must exist before protected data access |
| Auth and invite service | All users | No public registration |
| Permission engine | All modules | Must run server-side |
| Audit log service | Permissions, finance, client portal, AI, reports | Build before sensitive features |
| File storage | Files, approvals, chat, voice | Tenant and visibility metadata required |
| Notification service | Invites, tasks, approvals, CRM, finance | Must be permission-safe |
| Background workers | Voice processing, notifications, reports | Must preserve tenant/effective actor context |
| Search basics | CRM/projects/tasks/files | AI search can wait |
| Report query layer | Dashboards/reports | Must suppress unauthorized data |
| QA evidence process | Release governance | Required before MVP launch |

---

## 20. Product Dependencies

| Dependency | Required By | Notes |
|---|---|---|
| Role definitions | Permissions, UI, QA | Owner, Manager, Employee, Client |
| Client visibility rules | Client portal, files, chat, reports | Must be decided before client portal |
| Task status model | Projects, dashboards, reports | Keep simple for MVP |
| Approval statuses | Files, tasks, client portal | Approve, reject, revision requested |
| CRM stage model | CRM board, reports | Lead, Contacted, Meeting, Proposal, Negotiation, Won, Lost |
| Invoice status model | Finance basic | Draft, sent, partially paid, paid, overdue, void |
| Language defaults | UI and notifications | Arabic RTL, English LTR, German LTR |
| Report definitions | Dashboard/report MVP | Keep to basic operational reports |
| UAT users | MVP launch | Must cover all roles |

---

## 21. Risk-Based Prioritization

| Risk | Priority Response |
|---|---|
| Tenant/client data leakage | Build tenant and permission engine first; run permission/client visibility tests every milestone |
| Finance exposure | Build audit logs before finance; Owner-only finance by default |
| Client portal leakage | Build client visibility flags before portal publishing |
| AI hidden data exposure | Limit MVP AI to bounded voice-to-task/task drafts and test prompt injection |
| Automation abuse | Avoid full automation builder in MVP |
| Reporting hidden totals | Keep reports basic and permission-safe |
| Scope creep | Enforce Non-MVP list and version roadmap |
| Poor data quality | Build manual workflows and basic reports before advanced BI |
| Release instability | Use milestone exit criteria and rollback plan |

### 21.1 Risk-Based Prioritization Taxonomy

| Risk Category | Definition | Examples In MAOS | Severity Scale | Mitigation Strategy | Responsible Owner |
|---|---|---|---|---|---|
| Product risk | Risk that MVP does not solve the pilot agency's highest-value workflows | MVP lacks client approvals, project/task usability, or CRM basics | Low: minor workflow gap; Medium: workaround needed; High: pilot adoption blocked; Critical: MVP value unproven | Validate against pilot tenant profile, prioritize client-facing and delivery workflows, defer non-core scope | Product Strategy Lead |
| Technical risk | Risk from architecture, data model, infrastructure, integrations, or implementation complexity | Tenant resolver flaws, file storage gaps, weak report query layer, unstable voice processing | Low: localized fix; Medium: milestone delay; High: cross-module rework; Critical: launch blocker | Architecture validation, dependency sequencing, technical spikes, milestone exit criteria | CTO / Engineering Lead |
| Security risk | Risk of unauthorized access or weak access enforcement | Broken RBAC, missing session/device checks, public registration exposure, unprotected audit logs | Low: internal-only defect; Medium: role leak; High: client/finance exposure; Critical: tenant isolation failure | Build permissions first, deny by default, run security tests, audit sensitive actions | Security Auditor |
| Operational risk | Risk that users cannot run daily workflows reliably | Missed notifications, unclear approvals, weak support process, incomplete incident workflow | Low: usability issue; Medium: manual workaround; High: support burden; Critical: pilot operations fail | UAT, support readiness, incident runbooks, post-launch monitoring | Technical Program Manager |
| Financial risk | Risk of exposing or misrepresenting invoice, payment, revenue, or future payroll data | Manager sees global finance, client sees another invoice, partial payment mismatch | Low: display issue; Medium: owner review needed; High: unauthorized finance exposure; Critical: financial data breach | Owner-only defaults, finance denial tests, audit logs, reconciliation checks | Finance Owner / Security Auditor |
| Client-facing risk | Risk that external client users see incorrect or internal information | Internal notes exposed, unapproved file visible, wrong client project visible | Low: cosmetic issue; Medium: confusing client view; High: client trust impact; Critical: cross-client leak | Client visibility flags, client-safe preview, own-client-only tests | Product Lead / QA Lead |
| AI risk | Risk from incorrect, unsafe, or unauthorized AI output | Voice-to-task creates wrong task, prompt injection, hidden data leakage | Low: low-impact suggestion error; Medium: manual correction; High: sensitive suggestion leak; Critical: unauthorized data exposure | Limit AI scope, human approval, prompt injection tests, AI audit logs | AI Reviewer / Security Auditor |
| Data/privacy risk | Risk that private, tenant, client, file, chat, voice, or report data is exposed or retained incorrectly | Hidden totals in reports, transcript visibility leak, file access leak | Low: internal mislabel; Medium: restricted user sees metadata; High: sensitive object leak; Critical: tenant/client breach | Permission-safe queries, retention rules, redaction, hidden count/total suppression | Security Auditor / Data Owner |
| Delivery risk | Risk that MVP cannot be delivered within planned milestones | Scope creep, unresolved open decisions, too many parallel modules | Low: minor slip; Medium: milestone slip; High: release date risk; Critical: MVP cannot launch | Scope control rules, go/no-go gates, dependency sequencing, weekly risk review | Technical Program Manager |

---

## 22. Build Vs Later Decision Matrix

| Capability | Build In MVP | Build Later | Decision Reason |
|---|---|---|---|
| Invite-only access | Yes | No | Required security foundation |
| Full tenant white-label customization | No | Yes | Not needed for first operating value |
| Projects/tasks/subtasks | Yes | No | Core delivery system |
| Complex recurring projects | No | Yes | Too much workflow complexity for MVP |
| Basic client portal | Yes | No | Core client-facing value |
| Advanced client BI | No | Yes | Needs mature reporting |
| Basic CRM pipeline | Yes | No | Sales foundation |
| Advanced proposals/quotations | No | Yes | Can follow CRM adoption |
| Basic invoices/payments | Yes | No | Required owner/client billing value |
| Full payroll automation | No | Yes | High-risk and dependent on approved time maturity |
| Voice-to-task basic | Yes | No | High-value, bounded AI workflow |
| AI Analyst | No | Yes | Requires mature data and governance |
| System notifications | Yes | No | Operational requirement |
| Full automation builder | No | Yes | Requires stable manual workflows |
| Basic dashboards/reports | Yes | No | Required operational visibility |
| Advanced forecasting/anomaly detection | No | Yes | Requires historical data |

---

## 23. Implementation Milestones

### Milestone 0: Project Setup & Architecture Validation

| Item | Details |
|---|---|
| Objective | Establish validated architecture, environments, repo/process setup, and implementation standards |
| Risk level | Medium |
| Risk category | Technical / Operational |
| Risk reason | Weak setup decisions can create later rework, but no live tenant/client data is exposed yet |
| Mitigation | Complete architecture decision log, environment plan, security baseline, and MVP scope lock before build starts |
| Go/no-go condition | No-go if architecture boundaries, environments, release governance, or MVP scope are unresolved |
| Included features | Architecture validation, environment plan, module boundaries, QA/release process, logging strategy |
| Required data objects | Tenant placeholder, environment config records, release checklist records |
| Required permissions | None beyond setup admin assumptions |
| Required screens | None or internal prototype only |
| Required tests | Architecture review, environment readiness, security baseline review |
| Dependencies | Approved Master Specification |
| Exit criteria | Architecture decision log completed; MVP scope locked; release governance accepted |

### Milestone 1: Auth, Tenants, Roles, Permissions

| Item | Details |
|---|---|
| Objective | Build secure access foundation |
| Risk level | Critical |
| Risk category | Security / Data Privacy |
| Risk reason | Auth, tenant isolation, roles, permissions, sessions, devices, and audit logs control every later sensitive feature |
| Mitigation | Implement deny-by-default permissions, invite-only flow, tenant checks, session/device logs, and security tests before feature modules |
| Go/no-go condition | No-go if public registration is possible, tenant isolation fails, or roles can access unauthorized data |
| Included features | Tenants, invitations, login, sessions, devices, roles, permissions, memberships, audit basics |
| Required data objects | tenants, users, tenant_memberships, invitations, sessions, devices, roles, permissions, audit_logs |
| Required permissions | invite_user, assign_role, view_users, manage_roles_owner_only |
| Required screens | Invite acceptance, login, users, roles/permissions basics |
| Required tests | Invite-only, no public registration, RBAC, custom permission foundation, session/device/login history |
| Dependencies | Milestone 0 |
| Exit criteria | All roles can log in only by invitation and see only permitted shell workspace |

### Milestone 2: Core Workspace UI

| Item | Details |
|---|---|
| Objective | Provide role-aware application shell and navigation |
| Risk level | Medium |
| Risk category | Product / Security |
| Risk reason | Navigation and empty states can expose unavailable modules or imply access to restricted data |
| Mitigation | Use role-aware navigation, permission-denied states, RTL/LTR smoke tests, and no sensitive widgets until modules are secured |
| Go/no-go condition | No-go if a role can navigate to unauthorized screens or language direction breaks core workflows |
| Included features | Owner/Manager/Employee workspace shell, client portal shell, settings shell, empty states, RTL/LTR foundation |
| Required data objects | user preferences, tenant settings, role navigation metadata |
| Required permissions | view_workspace, view_settings_by_role |
| Required screens | Main dashboards shell, navigation, settings shell, client portal shell |
| Required tests | Role navigation, language direction, responsive smoke test, permission-denied states |
| Dependencies | Milestone 1 |
| Exit criteria | All roles reach correct workspace shell with no unauthorized navigation |

### Milestone 3: Projects, Tasks, Subtasks

| Item | Details |
|---|---|
| Objective | Enable core agency delivery work |
| Risk level | High |
| Risk category | Product / Security / Operational |
| Risk reason | Projects and tasks become the main data source for client portal, files, reports, finance, and AI |
| Mitigation | Enforce assigned scope, project membership checks, task ownership rules, dependency tests, and activity logging |
| Go/no-go condition | No-go if managers/employees can access unassigned projects/tasks or task data is not stable enough for later modules |
| Included features | Projects, tasks, subtasks, basic dependencies, statuses, assignments, comments |
| Required data objects | clients basic, projects, project_members, tasks, subtasks, task_dependencies, activity_logs |
| Required permissions | create_project, view_project, update_project, create_task, assign_task, update_task |
| Required screens | Projects list/detail, task detail, subtask controls |
| Required tests | Project/task CRUD, assignment scope, dependency basics, role access |
| Dependencies | Milestone 1, Milestone 2 |
| Exit criteria | Managers can run assigned projects and employees can execute assigned tasks |

### Milestone 4: Client Portal

| Item | Details |
|---|---|
| Objective | Deliver early client-facing value safely |
| Risk level | Critical |
| Risk category | Client-facing / Security / Data Privacy |
| Risk reason | Client portal is externally visible and can leak internal notes, other-client data, or unapproved files if scope is wrong |
| Mitigation | Require client-visible flags, own-client-only tests, client-safe previews, and audit logs for publication actions |
| Go/no-go condition | No-go if a client can see internal data, another client's data, unapproved files, hidden reports, or global finance |
| Included features | Client user invitation, client dashboard, client-visible projects/tasks/files/approvals placeholders |
| Required data objects | clients, client_contacts, client memberships, client visibility flags |
| Required permissions | invite_client_user, view_client_portal, publish_client_visible_record |
| Required screens | Client dashboard, client project page |
| Required tests | Client own-client-only access, hidden internal data, client-safe visibility |
| Dependencies | Milestone 1, Milestone 2, Milestone 3 |
| Exit criteria | Client can access only own visible project data |

### Milestone 5: CRM Basic

| Item | Details |
|---|---|
| Objective | Enable simple lead and opportunity management |
| Risk level | Medium |
| Risk category | Product / Operational |
| Risk reason | CRM errors affect sales workflow but are lower risk than client portal or finance if financial values remain restricted |
| Mitigation | Keep pipeline simple, test assigned CRM visibility, require follow-up activity logs, and defer advanced proposal/forecasting |
| Go/no-go condition | No-go if Lead to Won/Lost flow fails or assigned sales users can access unauthorized CRM records |
| Included features | Leads, opportunities, CRM stages, meetings, follow-ups |
| Required data objects | leads, opportunities, meetings, follow_ups, activity_logs |
| Required permissions | create_lead, update_lead, create_opportunity, update_opportunity, manage_follow_up |
| Required screens | CRM board, lead detail, opportunity detail, meeting/follow-up views |
| Required tests | Pipeline stage transitions, assigned CRM visibility, follow-up reminders |
| Dependencies | Milestone 1, Milestone 2 |
| Exit criteria | CRM pipeline supports Lead to Won/Lost basics |

### Milestone 6: Collaboration, Chat, Files

| Item | Details |
|---|---|
| Objective | Support daily collaboration and deliverable exchange |
| Risk level | High |
| Risk category | Client-facing / Data Privacy / Operational |
| Risk reason | Chat, files, versions, and approvals mix internal and client-visible collaboration in the same delivery context |
| Mitigation | Separate internal/client channels, enforce file visibility, test file version history, and audit approval decisions |
| Go/no-go condition | No-go if internal chat/files appear in client contexts or approval decisions are not auditable |
| Included features | Internal chat, client chat, file upload/download, file versioning, basic approvals |
| Required data objects | chat_channels, chat_members, chat_messages, files, file_versions, file_shares, approvals |
| Required permissions | view_channel, send_message, upload_file, download_file, upload_file_version, request_approval, decide_approval |
| Required screens | Chat, client chat, file library, approval center |
| Required tests | Internal/client chat separation, file visibility, file versioning, approval decisions |
| Dependencies | Milestone 3, Milestone 4 |
| Exit criteria | Team and clients can collaborate without internal data leakage |

### Milestone 7: Voice Notes & Voice-To-Task Basic

| Item | Details |
|---|---|
| Objective | Add voice capture and bounded AI-assisted task drafting |
| Risk level | High |
| Risk category | AI / Data Privacy / Product |
| Risk reason | Voice notes and transcription can contain sensitive client data and AI extraction can create incorrect tasks |
| Mitigation | Require consent/visibility checks, permission-scoped transcript access, prompt injection tests, and human confirmation before task creation |
| Go/no-go condition | No-go if AI can create tasks without confirmation, expose hidden data, or use unauthorized transcript content |
| Included features | Voice note upload/record, transcript status, task extraction draft, human confirmation |
| Required data objects | voice_notes, transcripts, AI extraction result, linked task draft |
| Required permissions | create_voice_note, view_voice_note, create_task_from_voice |
| Required screens | Voice notes page, task draft confirmation modal |
| Required tests | Consent/visibility, language handling, task draft review, AI hidden data/prompt injection test |
| Dependencies | Milestone 3, Milestone 6 |
| Exit criteria | Voice note can become a task only after authorized human confirmation |

### Milestone 8: Finance Basic

| Item | Details |
|---|---|
| Objective | Add owner-only basic billing and revenue visibility |
| Risk level | Critical |
| Risk category | Financial / Security / Data Privacy |
| Risk reason | Invoices, payments, and revenue are sensitive and must not be exposed to managers, employees, or unrelated clients |
| Mitigation | Enforce Owner-only finance defaults, client-own invoice visibility, audit logs, and denial tests for non-owner roles |
| Go/no-go condition | No-go if any non-owner can see global finance or any client can see another client's invoices/payments |
| Included features | Basic invoices, invoice line items, partial payment records, payment status, revenue records |
| Required data objects | invoices, invoice_line_items, payments, payment_allocations, revenue_records |
| Required permissions | owner_view_finance, create_invoice, record_payment, view_client_invoice |
| Required screens | Finance basic, invoice detail, client invoice/payment view |
| Required tests | Owner-only finance, manager/employee denial, client own invoice/payment only, audit logs |
| Dependencies | Milestone 4, Milestone 5 or client/project data |
| Exit criteria | Owner can create invoice and record partial payment; unauthorized roles cannot view global finance |

### Milestone 9: Dashboards & Reports Basic

| Item | Details |
|---|---|
| Objective | Provide permission-safe operational visibility |
| Risk level | High |
| Risk category | Data Privacy / Reporting / Security |
| Risk reason | Dashboards and reports can leak hidden totals, hidden counts, finance values, or client aggregates |
| Mitigation | Keep reports basic, enforce permission-safe queries, suppress hidden counts/totals, and test client-safe reports |
| Go/no-go condition | No-go if dashboards or reports expose unauthorized totals, counts, clients, finance, or internal data |
| Included features | Role dashboards, basic project/task/CRM/finance/client reports |
| Required data objects | report definitions basic, dashboard widgets, report access logs |
| Required permissions | view_dashboard, view_basic_report, export_report_if_enabled |
| Required screens | Owner/Manager/Employee/Client dashboards, reports page |
| Required tests | Dashboard permissions, hidden count/total suppression, client-safe reports, finance report restriction |
| Dependencies | Milestones 3, 4, 5, 8 |
| Exit criteria | Reports render only permitted data and pass privacy tests |

### Milestone 10: QA, UAT, Security Testing

| Item | Details |
|---|---|
| Objective | Validate MVP release readiness |
| Risk level | Critical |
| Risk category | Operational / Security / Delivery |
| Risk reason | This milestone decides whether security, permission, client-safe, finance, AI, and rollback controls are release-ready |
| Mitigation | Execute full MVP regression, UAT, evidence capture, security tests, client visibility tests, rollback validation, and launch checklist |
| Go/no-go condition | No-go if critical defects remain, UAT is unsigned, rollback is untested, or audit/security tests fail |
| Included features | Test execution, evidence capture, UAT, security review, release checklist, rollback plan |
| Required data objects | qa_test_cases, qa_test_runs, qa_test_evidence, defects, release_checklists |
| Required permissions | qa.evidence.review, release.approve, rollback.approve |
| Required screens | QA dashboard/checklist may be internal/manual for MVP |
| Required tests | Functional, permission, client-safe, finance, AI, report privacy, accessibility, RTL/LTR, regression |
| Dependencies | All MVP feature milestones |
| Exit criteria | UAT signed off, critical defects closed, rollback tested, launch approved |

### Milestone 11: MVP Launch

| Item | Details |
|---|---|
| Objective | Release MVP to first production tenants |
| Risk level | Critical |
| Risk category | Operational / Client-facing / Delivery |
| Risk reason | Production launch exposes real users, client data, support expectations, incident response, and rollback readiness |
| Mitigation | Launch to limited pilot tenant(s), monitor closely, keep rollback path ready, and run post-launch support and incident procedures |
| Go/no-go condition | No-go if monitoring, support, incident response, smoke tests, or rollback readiness are incomplete |
| Included features | Production deployment, monitoring, support process, incident response, post-launch reporting |
| Required data objects | release records, incident records, monitoring events |
| Required permissions | release.approve, incident.manage |
| Required screens | Production app and support/admin views |
| Required tests | Smoke test, rollback readiness, monitoring alerts, audit validation |
| Dependencies | Milestone 10 |
| Exit criteria | MVP live, monitored, support-ready, rollback-ready |

---

## 24. Epics

| Epic | Scope |
|---|---|
| E1 Identity and Tenant Foundation | Tenants, invitations, users, sessions, devices, roles, permissions |
| E2 Workspace Shell and Navigation | Role-specific shell, navigation, settings, language direction |
| E3 Project Delivery Core | Projects, tasks, subtasks, dependencies, comments |
| E4 Client Portal Core | Client invitations, client dashboard, client project visibility |
| E5 CRM Basic | Leads, opportunities, meetings, follow-ups, pipeline |
| E6 Collaboration Core | Internal chat, client chat, files, versions, approvals |
| E7 Voice and Basic AI | Voice notes, transcripts, voice-to-task draft, human approval |
| E8 Finance Basic | Invoices, partial payments, revenue tracking, Owner-only finance |
| E9 Dashboards and Reports Basic | Role dashboards, basic reports, privacy-safe rendering |
| E10 QA and Release Governance | Test plans, evidence, UAT, release gates, rollback, launch |

### 24.1 Epic-Level Acceptance Criteria

| Epic | Functional Acceptance Criteria | Permission Acceptance Criteria | Security Acceptance Criteria | Client Visibility Acceptance Criteria | QA Acceptance Criteria | Exit Criteria |
|---|---|---|---|---|---|---|
| Auth, Tenants, Roles, Permissions | Invited users can accept invitations, log in, and access tenant workspace | Owner can assign roles; non-owners cannot grant elevated access unless explicitly permitted | No public registration; sessions/devices/login history are recorded | Client users map only to their client scope | Invite-only, RBAC, session, device, and denied access tests pass | All roles can enter only by invite and see only permitted shell |
| Core Workspace UI | Role-specific shell, navigation, settings, language direction, and empty states work | Navigation hides unauthorized areas and denies direct unauthorized access | Permission-denied states do not leak object names or counts | Client portal shell shows only client-safe navigation | RTL/LTR, responsive, role navigation, and permission-denied tests pass | All roles can use correct shell without unauthorized links |
| Projects | Managers can create assigned projects and link clients | Users see only assigned/granted projects | Project APIs enforce tenant and resource scope | Client sees only client-visible project summary | Project CRUD, role scope, and client visibility tests pass | Projects can support task/client workflows |
| Tasks | Managers can create/assign/update tasks and employees can update assigned tasks | Assignees and managers have scoped access only | Task access enforces tenant, project, assignee, and client visibility | Client sees only explicitly visible task/milestone data | Task CRUD, assignment, status, and denial tests pass | Tasks are stable enough for files, voice, dashboards |
| Subtasks | Users can create/update subtasks under permitted tasks | Subtasks inherit parent task permissions | Parent-child access cannot bypass task scope | Client visibility inherits approved parent visibility | Subtask creation, update, complete, and inheritance tests pass | Subtasks work without leaking hidden parent data |
| Client Portal | Client can log in and view approved client workspace | Client cannot access internal workspace or other clients | Own-client-only checks enforced server-side | Only approved projects, files, approvals, invoices, and reports appear | Client-safe, cross-client denial, and hidden data tests pass | Client portal is safe for pilot clients |
| CRM Basic | Leads, opportunities, meetings, follow-ups, and stages work | Sales users see assigned/granted CRM records | CRM records remain tenant-scoped and activity logged | Client-visible CRM data is not exposed by default | Pipeline, follow-up, meeting, and role-scope tests pass | Basic Lead to Won/Lost flow works |
| Collaboration | Users can collaborate through scoped comments/chat/files/approvals | Collaboration objects inherit project/client/channel permissions | Internal/client separation enforced | Client collaboration is client-safe only | Collaboration workflow and visibility tests pass | Team and clients can collaborate safely |
| Chat | Internal and client chat channels support messages and membership | Channel membership controls visibility | Internal chat cannot be accessed by clients | Client chat is own-client scoped | Internal/client channel separation tests pass | Chat usable without cross-scope leakage |
| Files and File Versioning | Users can upload files and versions and view version history | File access follows tenant, project, client, and visibility rules | File links/downloads enforce permissions | Client sees approved/client-visible files only | Upload, version, download, visibility, and denial tests pass | File delivery workflow is safe |
| Approvals Basic | Approval request, approve, reject, and revision requested work | Only assigned approvers can decide approvals | Decisions are auditable and immutable enough for MVP | Clients decide only own client-visible approvals | Approval decision and audit tests pass | Approval workflow supports client deliverables |
| Voice Notes | Users can record/upload voice notes and view allowed transcript status | Voice notes follow project/task/channel permissions | Voice content cannot be accessed outside scope | Client voice notes remain client-context limited | Voice upload, access, consent/visibility tests pass | Voice notes usable for task drafting |
| Voice-To-Task Basic | Voice note can generate task draft for review | Task draft uses user's permitted project/task scope | AI output cannot create tasks automatically | Client-created voice-to-task cannot expose internal projects | Prompt injection, hidden data, and confirmation tests pass | Task created only after human confirmation |
| Finance Basic | Owner can view basic finance and revenue records | Non-owner finance access denied unless explicitly granted | Finance APIs enforce Owner-only default | Client sees only own approved invoices/payments | Owner-only, denial, client-own invoice, and audit tests pass | Basic finance ready for pilot billing |
| Invoices Basic | Owner can create invoice and line items | Invoice creation restricted to Owner/finance grant | Invoice actions are audited | Client sees only own approved invoice | Invoice create/view/status tests pass | Invoice workflow supports payment tracking |
| Partial Payments Basic | Owner can record partial payment and update invoice status | Payment recording restricted to Owner/finance grant | Payment actions are audited and tenant-scoped | Client sees only own payment status | Partial payment allocation/status tests pass | Partial payment records are accurate enough for MVP |
| Basic Dashboards | Role dashboards show MVP metrics | Widgets render only permitted data | Hidden counts/totals are suppressed where needed | Client dashboard is client-safe only | Dashboard permission and privacy tests pass | Dashboards provide safe operational visibility |
| Basic Reports | Basic project/task/CRM/finance/client reports render | Report access follows role/resource/finance/client rules | Sensitive reports require audit logs | Client-safe reports exclude internal data | Report permission, hidden data, and finance tests pass | Reports support MVP operations |
| Audit Logs | Sensitive actions create audit records | Audit viewing is Owner/security-grant scoped | Audit logs cannot be tampered with through UI/API | Clients cannot view audit logs | Audit creation, access, and denial tests pass | Sensitive MVP workflows are traceable |
| QA/UAT/Security Testing | Test plans, evidence, UAT, release gates, rollback all exist | QA/release permissions are enforced | Security tests cover sensitive and client-facing workflows | Client UAT confirms client-safe behavior | Critical test suites pass and evidence is reviewed | MVP can enter launch decision |
| MVP Launch | Production launch runs for limited pilot tenants | Launch controls restricted to authorized release roles | Smoke, monitoring, incident, rollback readiness pass | Pilot clients only receive approved access | Launch checklist completed and signed | MVP is live, monitored, and rollback-ready |

---

## 25. User Stories

| ID | User Story | Priority |
|---|---|---|
| US-001 | As an Owner, I can invite managers, employees, and clients so access remains invite-only | MVP |
| US-002 | As an Owner, I can assign roles and permissions so users only access allowed data | MVP |
| US-003 | As a Manager, I can create projects and assign team members so delivery work is organized | MVP |
| US-004 | As an Employee, I can view and update assigned tasks and subtasks so I can execute work | MVP |
| US-005 | As a Client, I can log into a portal and see only my approved project data | MVP |
| US-006 | As a Manager, I can request client approval on a deliverable so decisions are tracked | MVP |
| US-007 | As a Client, I can approve, reject, or request revision on an item so delivery moves forward | MVP |
| US-008 | As a user, I can upload files and new versions so deliverables are managed centrally | MVP |
| US-009 | As a team member, I can use internal chat so project communication stays in context | MVP |
| US-010 | As a client-facing team member, I can use client chat without exposing internal messages | MVP |
| US-011 | As a sales user, I can manage leads and opportunities through the basic pipeline | MVP |
| US-012 | As a sales user, I can schedule meetings and follow-ups so sales activity is tracked | MVP |
| US-013 | As an Owner, I can create invoices and record partial payments so revenue is visible | MVP |
| US-014 | As a Client, I can view my own approved invoices and payments | MVP |
| US-015 | As a user, I can create a voice note and confirm an extracted task draft | MVP |
| US-016 | As an Owner, I can view a basic dashboard with operational and finance summary | MVP |
| US-017 | As a Manager, I can view assigned project/task/CRM reports | MVP |
| US-018 | As an Employee, I can view my own assigned work dashboard | MVP |
| US-019 | As a Client, I can view client-safe project and invoice reports | MVP |
| US-020 | As an auditor/Owner, I can view sensitive action audit logs | MVP |

### 25.1 Critical User Story Acceptance Criteria

| Story | Given / When / Then Acceptance Criteria | Permission Rule | Audit / Log Requirement | Negative Test Case |
|---|---|---|---|---|
| Owner invites user | Given an Owner in an active tenant, when they invite a user with role and scope, then the invite is created and sent | Only Owner or explicitly granted admin can invite | Invitation created/accepted/expired/revoked logged | Non-granted employee cannot invite users |
| Manager assigns task | Given a Manager with project scope, when they assign a task to an employee, then assignee sees the task | Manager must have project/task manage permission | Task assignment activity logged | Manager cannot assign tasks in unassigned project |
| Employee updates task | Given an assigned Employee, when they update status/comment, then task history updates | Employee must be assignee or granted contributor | Task update activity logged | Employee cannot update unassigned task |
| Client views project | Given an invited Client, when they open portal project, then only client-visible project data appears | Client can access own client-visible records only | Client portal access logged where sensitive | Client cannot access internal notes or other client project |
| Client approves file/content | Given a client-visible approval request, when Client approves/rejects/revisions, then decision is saved | Client must be assigned approver for own client item | Approval decision audit logged | Client cannot decide internal approval or other-client approval |
| User uploads file version | Given permitted file access, when user uploads new version, then version history updates | User needs upload/version permission on resource | File version upload logged | User cannot version file outside permitted project/client |
| User sends internal chat message | Given internal channel membership, when user sends message, then members can view it | User must be internal channel member | Message activity logged according to retention rules | Client cannot view or post to internal channel |
| User sends client chat message | Given client channel membership, when user sends message, then client-safe channel updates | User must be member of that client channel | Message activity logged according to retention rules | User cannot send to unrelated client channel |
| User records voice note | Given permitted context, when user records/uploads voice note, then voice note is stored with context | User needs voice note permission in project/task/channel | Voice note creation logged | User cannot view voice note outside scope |
| AI creates task draft from voice note | Given permitted voice note, when AI extracts task draft, then user reviews before save | User must access voice note and target project/task scope | AI extraction and confirmation logged where sensitive | AI cannot create task automatically or use unauthorized transcript |
| Owner creates invoice | Given Owner finance access, when Owner creates invoice, then invoice is created for selected client/project | Owner or explicit finance grantee only | Invoice creation audit logged | Manager/Employee cannot create global finance invoice without grant |
| Client views invoice | Given approved invoice for client, when Client opens billing view, then only own invoice appears | Client sees own approved invoices only | Client invoice view logged where sensitive | Client cannot view another client's invoice or internal revenue |
| Client makes partial payment record or payment status is updated | Given permitted payment update flow, when payment status/partial payment is recorded, then invoice balance updates | Owner/finance grantee records; Client sees own status only | Payment update audit logged | Client cannot alter unauthorized payment or view other payment |
| Owner views basic revenue dashboard | Given Owner opens dashboard, when finance widget loads, then revenue summary appears | Owner-only finance visibility | Sensitive dashboard access logged | Manager/Employee denied global revenue dashboard |
| Manager views assigned project dashboard | Given Manager with assigned projects, when dashboard loads, then assigned project metrics appear | Manager sees assigned/granted data only | Dashboard view logged if sensitive | Manager cannot see unassigned project metrics |
| Employee views personal dashboard | Given Employee logs in, when dashboard loads, then own assigned tasks appear | Employee sees own/assigned work only | Dashboard access logged if sensitive | Employee cannot see team/global finance or hidden counts |
| Client views client dashboard | Given Client logs in, when dashboard loads, then own client-safe widgets appear | Client sees own client-visible data only | Client dashboard access logged if sensitive | Client cannot see internal workload, payroll, other clients, or unapproved files |

---

## 26. Acceptance Criteria

### 26.1 Global MVP Acceptance Criteria

- Invite-only access works and public registration is unavailable.
- Tenant isolation is enforced for every MVP module.
- Owner, Manager, Employee, and Client roles pass role-based access tests.
- Managers see only assigned/granted data.
- Employees see only own/assigned work.
- Clients see only own client-visible data.
- Owner-only finance visibility is enforced.
- Sensitive actions create audit logs.
- Client-facing outputs are client-safe.
- Basic reports suppress unauthorized data.
- MVP AI task creation requires human confirmation.
- MVP has rollback plan and UAT approval before launch.

### 26.2 Module Acceptance Criteria

| Module | Acceptance Criteria |
|---|---|
| Auth/permissions | All users enter by invitation; denied users cannot access protected pages or APIs |
| Projects/tasks | Authorized users can create/update assigned work; unauthorized users are denied |
| Client portal | Client cannot see internal notes, other clients, global finance, payroll, or unapproved files |
| Files/approvals | File versions and approval decisions preserve history and audit |
| Chat | Internal and client chat scopes are separated |
| Voice-to-task | Draft task is not created until user confirms; AI output is logged where required |
| CRM | Lead-to-Won/Lost pipeline works with meetings and follow-ups |
| Finance | Owner can manage invoices/payments; non-owner roles denied unless explicitly granted |
| Dashboards/reports | Role dashboards display only permitted data |
| QA/release | Critical defects closed; UAT signed; rollback validated |

---

## 27. Release Plan

| Release Stage | Scope | Gate |
|---|---|---|
| Internal Alpha | Owner/Manager/Employee workflows with test data | Core auth, projects/tasks, CRM, files pass internal QA |
| Client Portal Beta | Client portal, client chat, approvals, client reports | Client visibility and client-safe tests pass |
| Finance Beta | Invoice/payment/revenue tracking for Owner | Owner-only finance and audit tests pass |
| MVP Release Candidate | Full MVP scope | Regression, UAT, security, rollback, monitoring pass |
| MVP Production Launch | First production tenant(s) | Launch approval, support readiness, post-launch monitoring active |

Release controls:

- No launch without rollback plan.
- No sensitive feature without audit validation.
- No client-facing feature without client-safe visibility tests.
- No finance feature without Owner-only access tests.
- No AI feature without hidden data and prompt injection tests.

---

## 28. Post-MVP Roadmap

### Version 1.1

- White-label branding basics.
- Enhanced client portal.
- Advanced file previews.
- Wallet basic.
- Invoice reminders.
- Scheduled basic reports.
- Proposal/quotation improvements.
- Recurring task basics.

### Version 1.2

- Payroll approval workflow.
- Employee cost management.
- Advanced profitability analytics.
- Workload balancer.
- Skill matching.
- Recurring projects.
- AI reporting and AI search.
- KPI library expansion.
- Automation templates.

### Version 2.0

- Full automation builder.
- Advanced AI Analyst.
- Advanced BI forecasting.
- Anomaly detection.
- Enterprise data warehouse.
- Complex integration marketplace.
- Native mobile app.
- Enterprise tenant isolation options.

---

## 29. Open Decisions

| Decision | Required Before |
|---|---|
| Exact MVP technology stack | Milestone 0 exit |
| Tenant isolation implementation detail | Milestone 1 build |
| Initial supported payment provider | Milestone 8 build |
| Voice transcription provider | Milestone 7 build |
| MVP AI provider and retention policy | Milestone 7 build |
| Whether report export is MVP or 1.1 | Milestone 9 build |
| Whether time tracking is operational-only in MVP | Milestone 3 build |
| MVP notification channels | Milestone 6 build |
| UAT tenant/user selection | Milestone 10 |
| Production launch tenant strategy | Milestone 11 |

---

## 30. Final MVP Checklist

| Checklist Item | Required Status |
|---|---|
| MVP scope approved | Required |
| Non-MVP scope locked | Required |
| Milestones accepted | Required |
| Auth, tenant, permission foundation built | Required |
| Audit logs active before finance/client portal | Required |
| Projects/tasks/subtasks usable | Required |
| Client portal client-safe tests passed | Required |
| CRM basic pipeline usable | Required |
| Chat/files/approvals usable | Required |
| Voice-to-task basic confirmed by human approval | Required |
| Finance basic owner-only tests passed | Required |
| Dashboards/reports permission tests passed | Required |
| AI MVP safety tests passed | Required if AI enabled in MVP |
| Accessibility and RTL/LTR smoke tests passed | Required |
| UAT signed off | Required |
| Critical defects closed | Required |
| Rollback plan validated | Required |
| Monitoring and incident process ready | Required |
| MVP launch approved | Required |

### 30.1 MVP Approval Checklist

| Approval Item | Required Result |
|---|---|
| First-user target defined | Required before Phase 13 approval |
| Assumptions defined | Required before Phase 13 approval |
| Milestone risks defined | Every milestone 0-11 must include risk level, category, reason, mitigation, and go/no-go condition |
| Epics have acceptance criteria | Every major MVP epic must include functional, permission, security, client visibility where relevant, QA, and exit criteria |
| Critical stories have acceptance criteria | Highest-risk stories must include Given/When/Then, permission rule, audit/log requirement, and negative test |
| MVP exclusions are explicit | Advanced AI Analyst, full automation builder, full payroll automation, advanced BI forecasting, complex recurring projects, marketplace, full mobile app, advanced wallet, and white-label customization excluded |
| Security-critical milestones identified | Milestones 1, 4, 8, 9, 10, and 11 must be treated as high/critical security or privacy gates |
| Client-facing risks identified | Client portal, client chat, files, approvals, client reports, and invoices require client-safe tests |
| Finance risks identified | Finance basic and invoices/partial payments require Owner-only access and audit validation |
| AI scope limited | MVP AI limited to bounded voice-to-task/task drafts with human approval |
| QA/UAT gate defined | Milestone 10 must pass before launch |
| Launch go/no-go criteria defined | Milestone 11 requires smoke tests, monitoring, support readiness, incident response, and rollback readiness |

**Final Phase 13 Statement:** The MAOS MVP must prioritize secure, client-facing operational value over advanced intelligence and automation. The first release should prove the core agency operating system: invite-only access, role-safe workspaces, projects/tasks, client portal, collaboration, basic CRM, basic finance, dashboards/reports, basic voice-to-task, audit logs, and release governance. Advanced AI, automation, payroll, BI, white-labeling, marketplace, and mobile capabilities should be delivered only after the MVP data and manual workflows are stable.
