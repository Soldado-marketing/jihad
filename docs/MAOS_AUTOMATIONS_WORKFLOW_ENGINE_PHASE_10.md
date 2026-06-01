# MAOS Phase 10 Automations & Workflow Engine Specification

**Platform:** Marketing Agency Operating System (MAOS)  
**Document:** Phase 10 Automations & Workflow Engine Specification  
**Version:** 1.0  
**Status:** Automation Engine Specification  
**Document Type:** Product, workflow, safety, security, and governance specification  
**Code Policy:** No code, no SQL, no implementation scripts, no database migrations  

---

## 1. Product Context

MAOS is a multi-tenant, invite-only SaaS operating system for distributed marketing agencies and their clients. The Automations & Workflow Engine connects CRM, projects, tasks, subtasks, approvals, files, chat, voice notes, AI, finance, payroll, notifications, and client portal workflows into a controlled automation layer.

The automation engine must reduce repetitive work without bypassing permissions, tenant isolation, client boundaries, financial restrictions, payroll rules, approval workflows, audit logs, or human review requirements.

---

## 2. Approved Reference Foundation

| Reference | Required Automation Alignment |
| --- | --- |
| Phase 1 Enterprise Architecture | Tenant-scoped background jobs, event-driven architecture, audit logging, notification architecture, AI action safety |
| Phase 2 Enterprise Database | `automations`, `automation_steps`, `automation_runs`, notifications, audit logs, activity logs, AI logs, tasks, approvals, files, finance, payroll |
| Phase 3 Security & Permissions | RBAC, custom permissions, invite-only access, tenant isolation, client boundaries, API security, file security, AI security |
| Phase 4 CRM & Sales | Lead, opportunity, meeting, follow-up, proposal, quotation, won/lost, revenue forecasting automations |
| Phase 5 UI/UX Design System | Workflow Builder, automation settings, no-permission states, client-safe UI, notifications, approval surfaces |
| Phase 6 Project Management | Projects, tasks, subtasks, dependencies, recurring tasks/projects, workload, skill matching, templates |
| Phase 7 Collaboration | Chat, client chat, voice notes, files, file versions, file locks, approval center, revisions |
| Phase 8 Finance & Payroll | Owner Only Financial Access, payroll rules, invoices, payments, wallets, profitability, financial audit logs |
| Phase 9 AI Ecosystem | AI permission checks, prompt injection protection, human approval, AI logs, AI incident response, multilingual safety |

---

## 3. Core Automation Model

The automation engine uses one strict model:

**Trigger -> Conditions -> Actions -> Logs**

| Stage | Required Behavior |
| --- | --- |
| Trigger | Starts evaluation from an event, schedule, recurring rule, manual run, system event, AI proposal, or external integration event |
| Conditions | Validate tenant, permissions, resource state, client scope, financial sensitivity, data values, time windows, and safety constraints |
| Actions | Execute only allowed, scoped, non-destructive actions or create human approval requests for sensitive actions |
| Logs | Every run records trigger, evaluated conditions, action outcomes, permission checks, errors, retries, and audit references |

---

## 4. Critical Automation Safety Rules

These rules apply to every automation rule, workflow, trigger, condition, action, schedule, AI automation, and background run.

| Rule | Required Behavior |
| --- | --- |
| Permission equivalence | Automations can only do what the configured actor or system policy is authorized to do |
| Tenant isolation | Automation definitions, runs, inputs, outputs, logs, and side effects must stay inside one tenant |
| Client boundaries | Client-visible automations must only operate on client-safe records for the correct client |
| Owner Only Financial Access | Finance automations require Owner access or explicit financial automation grant |
| Payroll protection | Payroll automations must enforce No Start = No Time, No Time = No Payroll, and Approved Time Only Payroll |
| AI safety | AI-powered automations must follow Phase 9 AI security, hardening, retention, redaction, and approval rules |
| Human approval | Destructive, external-facing, client-visible, financial, payroll, export, approval, or sensitive actions require approval unless explicitly configured by Owner policy |
| No hidden data exposure | Automation outputs, notifications, logs, and client portal messages must not expose unauthorized data |
| Full run logging | Every automation run must be logged, including skipped and failed runs |
| Admin visibility | Failed automation runs must be visible to authorized admins |
| Loop prevention | Automations must detect and stop recursive or runaway loops |
| Rate limits | Tenant, user, feature, and action-level limits must prevent abuse and cost spikes |
| Idempotency | Replayed triggers must not duplicate tasks, invoices, payments, messages, approvals, files, payroll items, or notifications |
| Safe failure | Failed automations must stop safely and preserve traceability |

---

## 5. Automation Data Foundation

Phase 10 uses these approved Phase 2 objects and related records:

| Area | Data Objects |
| --- | --- |
| Automation definitions | `automations`, `automation_steps` |
| Automation execution | `automation_runs`, `audit_logs`, `activity_logs` |
| Notifications | `notifications`, `notification_deliveries`, `notification_preferences` |
| AI | `ai_logs` |
| Users and permissions | `users`, `tenant_memberships`, `roles`, `permissions`, `role_permissions`, `membership_roles` |
| CRM | `leads`, `opportunities`, `meetings`, `contracts`, `clients`, `client_contacts` |
| Projects and tasks | `projects`, `tasks`, `subtasks`, `task_dependencies`, `time_entries`, `timesheets` |
| Collaboration | `chat_channels`, `chat_messages`, `voice_notes`, `files`, `file_versions`, `file_shares`, `approvals`, `approval_approvers` |
| Finance and payroll | `invoices`, `payments`, `payment_allocations`, `wallets`, `wallet_transactions`, `revenue_records`, `profitability_records`, `employee_profiles`, `employee_costs`, `payroll_runs`, `payroll_items` |

---

## 6. Required Diagrams

### 6.1 Automation Engine Overview Diagram

| Layer | Flow |
| --- | --- |
| Event layer | CRM, projects, tasks, files, chat, voice notes, approvals, AI, finance, payroll, schedules |
| Rule layer | Automation rules and workflow builder definitions |
| Evaluation layer | Trigger validation, conditions, permission checks, safety checks, loop checks |
| Execution layer | Actions, human approval requests, notifications, AI jobs, background jobs |
| Governance layer | Tenant isolation, RBAC, client boundaries, finance/payroll controls, rate limits |
| Observability layer | Automation runs, audit logs, activity logs, notifications, analytics |

### 6.2 Trigger-Condition-Action Diagram

| Stage | Input | Output |
| --- | --- | --- |
| Trigger | Event, schedule, manual run, AI proposal | Candidate automation run |
| Conditions | Rule filters, resource state, permissions, tenant/client scope | Eligible or skipped run |
| Actions | Allowed action list and action policy | Executed action or approval request |
| Logs | Run metadata, condition result, action result | Automation run history and audit trace |

### 6.3 Workflow Builder Diagram

| Step | Flow |
| --- | --- |
| 1 | User opens Workflow Builder |
| 2 | User selects trigger |
| 3 | User configures conditions |
| 4 | User selects actions |
| 5 | System validates permissions, safety, loop risk, and required approvals |
| 6 | User tests automation with safe preview |
| 7 | Automation is saved as draft or submitted for approval |
| 8 | Active automation begins listening for triggers |

### 6.4 Automation Execution Lifecycle Diagram

| Stage | Flow |
| --- | --- |
| 1 | Trigger event received |
| 2 | Automation rule matched |
| 3 | Run record created |
| 4 | Tenant, role, resource, client, finance, payroll, AI, and file checks run |
| 5 | Conditions evaluated |
| 6 | Actions executed or approval request created |
| 7 | Notifications emitted where permitted |
| 8 | Logs and analytics updated |

### 6.5 Automation Permission Enforcement Diagram

| Gate | Required Check |
| --- | --- |
| Tenant gate | Automation and target records belong to same active tenant |
| Actor gate | Creator, owner, or configured actor has permission |
| Module gate | Target module permission exists |
| Resource gate | Target record is accessible under role and scope |
| Client gate | Client-visible actions are scoped to correct client |
| Finance gate | Owner Only Financial Access or explicit grant |
| Payroll gate | Approved time only and payroll permission |
| AI gate | Phase 9 AI security and prompt injection rules |
| Approval gate | Sensitive actions require approval |

### 6.6 AI-Powered Automation Diagram

| Step | Flow |
| --- | --- |
| 1 | Trigger proposes AI automation |
| 2 | AI permissions and data access are checked |
| 3 | Prompt injection and redaction policies are applied |
| 4 | AI generates draft, classification, summary, or recommendation |
| 5 | Sensitive output enters human approval |
| 6 | Approved action executes under user/system permission |
| 7 | AI logs, automation logs, and audit logs are created |

### 6.7 Approval Automation Diagram

| Step | Flow |
| --- | --- |
| 1 | Approval trigger occurs |
| 2 | Approval target and approvers are resolved |
| 3 | Client/internal visibility is checked |
| 4 | Approval request is created |
| 5 | Notifications are sent to permitted approvers |
| 6 | Decision updates target record |
| 7 | Activity and audit logs are recorded |

### 6.8 Notification Automation Diagram

| Step | Flow |
| --- | --- |
| 1 | Notification trigger occurs |
| 2 | Recipient list is resolved |
| 3 | Permission and preference checks run |
| 4 | Sensitive content is redacted |
| 5 | Notification is created and delivered |
| 6 | Delivery status is tracked |
| 7 | Failed deliveries are logged |

### 6.9 CRM Automation Diagram

| Step | Flow |
| --- | --- |
| 1 | Lead, opportunity, meeting, proposal, quotation, or stage event occurs |
| 2 | CRM conditions evaluate |
| 3 | Follow-up, reminder, task, approval, or notification action is proposed |
| 4 | External-facing action requires approval |
| 5 | CRM record, task, notification, or document state updates |
| 6 | Audit/activity logs are created |

### 6.10 Project/Task Automation Diagram

| Step | Flow |
| --- | --- |
| 1 | Project/task/subtask/dependency/status event occurs |
| 2 | Project/task conditions evaluate |
| 3 | Recurring work, assignment, notification, approval, or workload action is proposed |
| 4 | Client visibility and workload permissions are checked |
| 5 | Action executes or approval is requested |
| 6 | Logs and notifications update |

### 6.11 Finance/Payroll Automation Diagram

| Step | Flow |
| --- | --- |
| 1 | Invoice, payment, wallet, revenue, cost, timesheet, or payroll event occurs |
| 2 | Owner Only Financial Access and payroll rules are checked |
| 3 | Finance/payroll conditions evaluate |
| 4 | Sensitive action enters approval |
| 5 | Allowed action executes |
| 6 | Financial/payroll audit logs are created |

### 6.12 Automation Logging And Error Handling Diagram

| Step | Flow |
| --- | --- |
| 1 | Run starts and log is created |
| 2 | Trigger, conditions, permissions, actions, and approvals are recorded |
| 3 | Failure class is assigned if error occurs |
| 4 | Retry policy is applied where safe |
| 5 | Irrecoverable failure is surfaced to authorized admin |
| 6 | Sensitive failures create audit events |
| 7 | Analytics update failure rates and trends |

---

## 7. Module Specification: Automation Rule Model

| Required Area | Specification |
| --- | --- |
| Purpose | Define the core automation rule structure using Trigger -> Conditions -> Actions -> Logs |
| Data objects | `automations`, `automation_steps`, `automation_runs`, `audit_logs`, `activity_logs` |
| Required fields | Tenant, name, description, owner, status, trigger type, step list, execution actor, safety level, created by, updated by, next run where scheduled |
| Statuses | Draft, Pending Approval, Active, Paused, Failed, Disabled, Archived |
| Triggers | Event, schedule, recurring, manual, system, AI proposal |
| Conditions | Permission, resource state, client scope, module status, date/time, currency, priority, visibility, safety class |
| Actions | Create, update, notify, assign, request approval, generate report, call AI, create log, schedule follow-up |
| Permissions | `automations.read`, `automations.create`, `automations.update`, `automations.manage`, target module permissions |
| Workflow | Create rule, configure trigger, add conditions, add actions, validate safety, test, approve, activate |
| Notifications | Rule approved, rule paused, rule failed, rule disabled, approval required |
| Audit log requirements | Rule creation, activation, sensitive update, permission change, deletion/archive, failed sensitive run |
| Error handling | Invalid steps block activation; unsafe actions require approval; failed runs are logged |
| Edge cases | Missing action, inactive target module, creator loses permission, target object deleted, duplicate trigger |
| KPIs | Active rules, failed rules, runs per rule, average run duration, action success rate |
| Acceptance criteria | Active automation has valid trigger, conditions, actions, permissions, safety checks, and run logs |

---

## 8. Module Specification: Workflow Builder

| Required Area | Specification |
| --- | --- |
| Purpose | Provide a UI and governance model for creating, testing, approving, and managing automations |
| Data objects | `automations`, `automation_steps`, `templates`, `permissions`, `audit_logs` |
| Required fields | Builder mode, selected module, trigger, conditions, actions, preview result, validation result, approval status |
| Statuses | Editing, Validating, Preview Ready, Needs Approval, Approved, Active, Invalid |
| Triggers | User creates or edits automation |
| Conditions | User permission, feature availability, module enabled, safety score, loop risk, approval requirement |
| Actions | Add step, remove step, reorder step, preview, test, submit approval, activate, pause |
| Permissions | Owner or explicit automation admin; target module permissions required for action selection |
| Workflow | User builds rule, system validates, user previews, sensitive rule submits for approval, approved rule activates |
| Notifications | Approval requested, validation failed, test run completed, automation activated |
| Audit log requirements | Sensitive rule configuration, approval, activation, rule ownership changes |
| Error handling | Show invalid configuration, block unsafe activation, preserve draft |
| Edge cases | Step references removed field, user lacks target action permission, draft conflicts with changed module |
| KPIs | Rules created, preview pass rate, validation failure rate, approval cycle time |
| Acceptance criteria | Builder prevents unsafe, invalid, cross-tenant, unauthorized, and loop-prone automations from activation |

---

## 9. Module Specification: Trigger System

| Required Area | Specification |
| --- | --- |
| Purpose | Detect events, schedules, manual runs, recurring schedules, system events, and AI proposals that start automations |
| Data objects | `automations`, `automation_steps`, `automation_runs`, source module objects |
| Required fields | Trigger type, source module, event name, resource type, resource ID, actor, timestamp, payload metadata |
| Statuses | Listening, Triggered, Ignored, Blocked, Disabled |
| Triggers | CRM event, project event, task event, approval event, file event, chat event, voice event, finance event, payroll event, schedule |
| Conditions | Automation active, tenant active, source visible, trigger payload valid, idempotency key unique |
| Actions | Create candidate run, pass payload to condition system, log trigger |
| Permissions | Trigger can start only tenant-scoped rules; action permissions evaluated later before action execution |
| Workflow | Event received, matching rules found, trigger validated, run created, conditions evaluated |
| Notifications | Trigger failure only to admins where configured |
| Audit log requirements | Sensitive triggers involving finance, payroll, client publishing, file sharing, AI, or external communication |
| Error handling | Invalid payload skipped and logged; duplicate event ignored; disabled rule not executed |
| Edge cases | Duplicate webhook, delayed event, deleted source record, timezone shift, tenant disabled |
| KPIs | Trigger volume, trigger-to-run conversion, ignored triggers, duplicate trigger rate |
| Acceptance criteria | Triggers never execute actions directly; they only create permission-checked candidate runs |

---

## 10. Module Specification: Condition System

| Required Area | Specification |
| --- | --- |
| Purpose | Evaluate rule filters and safety requirements before any action executes |
| Data objects | `automation_steps`, `automation_runs`, target module records, permissions |
| Required fields | Condition type, operator, expected value, actual value metadata, result, failure reason |
| Statuses | Pending, Passed, Failed, Skipped, Error |
| Triggers | Candidate automation run enters evaluation |
| Conditions | Field value, status, role, permission, client scope, date/time, workload, priority, financial access, payroll eligibility |
| Actions | Allow run, skip run, require approval, block run, record reason |
| Permissions | Condition evaluation must not reveal hidden field values to unauthorized users |
| Workflow | Load allowed metadata, evaluate conditions, record results, pass eligible run to actions |
| Notifications | Optional admin alert for repeated condition errors |
| Audit log requirements | Sensitive condition failures for unauthorized finance/payroll/client attempts |
| Error handling | Missing fields fail safely; inaccessible data blocks or skips without leakage |
| Edge cases | Null values, stale values, permission revoked mid-run, hidden client record, currency mismatch |
| KPIs | Condition pass rate, skip rate, blocked rate, condition error rate |
| Acceptance criteria | Conditions never expose hidden values and always fail safely when access is uncertain |

---

## 11. Module Specification: Action System

| Required Area | Specification |
| --- | --- |
| Purpose | Execute approved and permission-safe automation actions after triggers and conditions pass |
| Data objects | `automation_steps`, `automation_runs`, target objects, `audit_logs`, `activity_logs`, `notifications` |
| Required fields | Action type, target module, target record, input values, execution actor, approval state, result |
| Statuses | Pending, Waiting Approval, Running, Succeeded, Failed, Skipped, Reversed where supported |
| Triggers | Conditions passed and action queue starts |
| Conditions | Permission check, idempotency check, safety check, rate limit, approval requirement |
| Actions | Create task, update status, send notification, request approval, create follow-up, generate report, call AI, lock file, create invoice draft |
| Permissions | Target module permission required; destructive and external-facing actions require approval unless explicitly configured |
| Workflow | Prepare action, validate permission, request approval if needed, execute, log result |
| Notifications | Action succeeded, action failed, action waiting approval |
| Audit log requirements | Sensitive action execution, external sending, financial/payroll action, client-visible action, destructive action |
| Error handling | Partial failure stops dependent actions; safe retries only where idempotent |
| Edge cases | Target record locked, approval pending, duplicate action, external delivery failure, action no longer valid |
| KPIs | Action success rate, approval-required actions, retries, failed actions |
| Acceptance criteria | Actions execute only after permission, safety, idempotency, and approval checks pass |

---

## 12. Module Specification: Scheduled Automation System

| Required Area | Specification |
| --- | --- |
| Purpose | Run automations at configured one-time or date-based schedules |
| Data objects | `automations`, `automation_steps`, `automation_runs`, `notifications` |
| Required fields | Schedule datetime, timezone, next run, last run, schedule owner, status |
| Statuses | Scheduled, Due, Running, Completed, Missed, Paused, Failed |
| Triggers | Date/time reaches schedule in configured timezone |
| Conditions | Tenant active, rule active, schedule not expired, actor permission still valid |
| Actions | Run configured actions, update next run where needed, notify on failure |
| Permissions | Schedule creation requires automation permission and target action permissions |
| Workflow | Schedule created, due time reached, run created, conditions/actions evaluated, result logged |
| Notifications | Scheduled run succeeded/failed, missed run, approval required |
| Audit log requirements | Sensitive scheduled finance/payroll/client-facing runs |
| Error handling | Missed schedules logged; safe retry policy defined; no duplicate execution |
| Edge cases | Timezone change, daylight saving change, tenant paused, actor deactivated |
| KPIs | Scheduled runs, missed runs, schedule reliability, average delay |
| Acceptance criteria | Scheduled automations run once at intended time and respect timezone, permissions, and safety rules |

---

## 13. Module Specification: Recurring Automation System

| Required Area | Specification |
| --- | --- |
| Purpose | Run automations repeatedly for recurring tasks, projects, reminders, reports, approvals, and checks |
| Data objects | `automations`, `automation_steps`, `automation_runs`, recurring project/task objects |
| Required fields | Recurrence pattern, timezone, interval, start date, end date, next run, max occurrences |
| Statuses | Active, Paused, Completed, Expired, Failed |
| Triggers | Recurrence interval reaches next run |
| Conditions | Recurrence still valid, tenant active, target module enabled, loop/rate limits respected |
| Actions | Create recurring task/project, send recurring notification, generate report, request recurring approval |
| Permissions | Requires recurring automation permission and target create/update permission |
| Workflow | Recurrence configured, next run calculated, run executes, next run recalculated, logs updated |
| Notifications | Recurring run created, recurring run failed, recurrence ended |
| Audit log requirements | Recurring client-facing, financial, payroll, or sensitive runs |
| Error handling | Failed occurrence does not duplicate next occurrence; repeated failures pause rule where configured |
| Edge cases | Month-end date, daylight saving, deleted template, changed assignee, inactive project |
| KPIs | Recurring run success, failure streaks, generated records, paused recurring rules |
| Acceptance criteria | Recurring automations prevent duplicates, respect timezones, and can be paused or ended safely |

---

## 14. Module Specification: AI-Powered Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Use AI to summarize, classify, draft, recommend, extract, analyze, and propose actions within strict Phase 9 safety rules |
| Data objects | `automations`, `automation_steps`, `automation_runs`, `ai_logs`, `audit_logs`, source module objects |
| Required fields | AI feature, prompt template, data scope, language, approval requirement, output type, source references |
| Statuses | Draft, Waiting AI, AI Generated, Waiting Approval, Approved, Rejected, Failed |
| Triggers | New chat, voice transcript, meeting transcript, file upload, report request, CRM update, project risk |
| Conditions | AI enabled, user/source permissions, prompt injection checks, redaction, cost limits, approval gates |
| Actions | Summarize, classify, extract tasks, draft response, draft report, suggest actions, create approval request |
| Permissions | `ai.use` or `ai.manage` plus source and target module permissions |
| Workflow | Trigger starts AI job, data filtered, AI output generated, human approval applied where required, action logged |
| Notifications | AI draft ready, AI action needs approval, AI job failed, safety block |
| Audit log requirements | Sensitive AI actions, client-facing output, financial AI, payroll AI, blocked prompt injection |
| Error handling | Provider failure safe; unsafe output blocked; no hidden data revealed |
| Edge cases | Prompt injection, inaccessible source, multilingual output, stale source, high-cost request |
| KPIs | AI automation runs, approval rate, blocked output rate, AI failure rate, cost per feature |
| Acceptance criteria | AI automations follow Phase 9 hardening and never execute critical actions without approval |

---

## 15. Module Specification: Approval Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate creation, routing, escalation, reminders, and status updates for approval workflows |
| Data objects | `approvals`, `approval_approvers`, `automation_runs`, `notifications`, `files`, `tasks`, `invoices` |
| Required fields | Target type, target ID, approvers, due date, visibility, client scope, status |
| Statuses | Draft, Pending, Approved, Rejected, Changes Requested, Cancelled, Overdue |
| Triggers | File uploaded, task ready for review, proposal ready, invoice approval needed, approval overdue |
| Conditions | Target visibility, approver permission, client context, file lock status, finance approval scope |
| Actions | Create approval, assign approvers, send reminder, escalate overdue approval, lock file, update status |
| Permissions | `approvals.create`, `approvals.manage`, target module permission |
| Workflow | Trigger identifies target, approvers resolved, approval created, notifications sent, decisions logged |
| Notifications | Approval requested, reminder, overdue, decision made, changes requested |
| Audit log requirements | Client-facing approval, finance approval, cancellation, approver changes |
| Error handling | Missing approver blocks creation; invalid visibility blocks client approval |
| Edge cases | Approver inactive, target file locked, client approval missing client scope, duplicate request |
| KPIs | Approval cycle time, overdue approvals, escalation count, approval automation success |
| Acceptance criteria | Approval automations respect visibility, client context, approver permissions, and audit requirements |

---

## 16. Module Specification: Notification Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate permission-safe in-app and email notifications for workflow events |
| Data objects | `notifications`, `notification_deliveries`, `notification_preferences`, `automation_runs` |
| Required fields | Recipient, tenant, notification type, source object, channel, visibility, delivery status |
| Statuses | Pending, Sent, Delivered, Failed, Read, Suppressed |
| Triggers | Task assigned, approval requested, invoice overdue, file shared, chat mention, automation failed |
| Conditions | Recipient access, preference enabled, channel enabled, sensitive content redacted |
| Actions | Create notification, deliver notification, retry safe failures, suppress unsafe content |
| Permissions | Sender/system must have source visibility; recipient must have access to source |
| Workflow | Event occurs, recipient resolved, permission checked, content redacted, delivery attempted, logs updated |
| Notifications | This module creates notifications and delivery status updates |
| Audit log requirements | Sensitive client, finance, payroll, external, and security notifications |
| Error handling | Delivery failure logged; sensitive content not sent through unsafe channel |
| Edge cases | Recipient removed, preference disabled, client-safe wording needed, email bounce |
| KPIs | Delivery success, failed deliveries, read rate, suppressed notifications |
| Acceptance criteria | Notifications never reveal inaccessible data and always respect recipient permissions and preferences |

---

## 17. Module Specification: CRM Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate lead, opportunity, meeting, follow-up, proposal, quotation, stage, and sales reminder workflows |
| Data objects | `leads`, `opportunities`, `meetings`, `clients`, `tasks`, `files`, `approvals`, `notifications`, `revenue_records` |
| Required fields | CRM source, stage, owner, client/prospect, due date, follow-up type, automation result |
| Statuses | Active, Paused, Waiting Approval, Failed, Completed |
| Triggers | Lead created, stage changed, meeting scheduled/completed, proposal sent, quotation accepted, no follow-up |
| Conditions | CRM permission, owner assignment, stage, probability, client/prospect scope, external approval |
| Actions | Create follow-up task, notify owner, request proposal approval, update stage, create draft project/invoice |
| Permissions | CRM permissions plus task/project/invoice permissions for target actions |
| Workflow | CRM event triggers rule, conditions evaluate, follow-up or approval action executes, logs update |
| Notifications | New lead, follow-up due, proposal approval, stale opportunity, won conversion needed |
| Audit log requirements | Stage automation, proposal/quotation external action, won/lost changes, invoice/project creation draft |
| Error handling | Missing owner or invalid stage blocks action and logs failure |
| Edge cases | Duplicate lead, converted lead, opportunity closed, external sending requires approval |
| KPIs | Follow-up creation, stale opportunities reduced, conversion automation success, failed CRM runs |
| Acceptance criteria | CRM automations preserve sales permissions and never send client-facing documents without approval |

---

## 18. Module Specification: Project Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate project status, health, templates, recurring projects, workload, approvals, reminders, and client updates |
| Data objects | `projects`, `tasks`, `subtasks`, `task_dependencies`, `templates`, `approvals`, `notifications`, `automation_runs` |
| Required fields | Project, client, owner, status, template, due date, visibility, health, automation result |
| Statuses | Active, Paused, Waiting Approval, Failed, Completed |
| Triggers | Project created, status changed, due date near, project at risk, template applied, recurring schedule |
| Conditions | Project permission, client visibility, project status, dependency status, workload capacity |
| Actions | Create task set, notify team, update health, request approval, create recurring project, escalate risk |
| Permissions | Project permissions and client visibility permissions |
| Workflow | Project event triggers rule, conditions validate, actions create/update project work, logs update |
| Notifications | Project at risk, project overdue, task set created, client update pending |
| Audit log requirements | Client-visible project update, bulk creation, recurring project configuration |
| Error handling | Template missing, client visibility invalid, workload unavailable, dependencies unresolved |
| Edge cases | Project archived, client archived, duplicate recurring project, inactive owner |
| KPIs | Project automation success, at-risk escalations, recurring projects generated, overdue reduction |
| Acceptance criteria | Project automations respect client boundaries and never expose internal status to clients unless approved |

---

## 19. Module Specification: Task Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate task creation, assignment, subtasks, recurring tasks, reminders, dependencies, status updates, and escalations |
| Data objects | `tasks`, `subtasks`, `task_dependencies`, `time_entries`, `notifications`, `automation_runs` |
| Required fields | Task, project/client, assignee, status, priority, due date, visibility, dependency state |
| Statuses | Active, Paused, Waiting Approval, Failed, Completed |
| Triggers | Task created, assigned, overdue, status changed, dependency completed, recurring due date |
| Conditions | Task permission, project status, assignee availability, dependency state, client visibility |
| Actions | Create task/subtask, assign, notify, escalate, update status, create recurring task, block dependent task |
| Permissions | Task create/update/assign permissions and project access |
| Workflow | Task event triggers rule, conditions evaluate, safe action executes, logs update |
| Notifications | Task assigned, task overdue, dependency unblocked, recurring task created |
| Audit log requirements | Bulk assignment, client-visible task changes, AI-assisted assignment, recurring configuration |
| Error handling | Inactive assignee, locked/completed task, invalid dependency, duplicate recurring task |
| Edge cases | Circular dependency, task in inactive project, client-visible mismatch, assignee lacks access |
| KPIs | Automated tasks created, overdue reduction, dependency unblock time, assignment success |
| Acceptance criteria | Task automations cannot create inaccessible, duplicate, circular, or client-unsafe tasks |

---

## 20. Module Specification: Client Portal Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate client-safe portal updates, approvals, file sharing, invoice notices, project updates, and client notifications |
| Data objects | `clients`, `tenant_memberships`, `projects`, `tasks`, `files`, `approvals`, `invoices`, `payments`, `notifications` |
| Required fields | Client, portal user, source record, visibility, message, approval state, financial scope |
| Statuses | Draft, Waiting Approval, Active, Sent, Failed, Suppressed |
| Triggers | Client-visible file shared, approval requested, invoice sent, project milestone reached, client message |
| Conditions | Client scope, client-visible flag, approved content, financial visibility, portal access enabled |
| Actions | Notify client, publish update, request approval, share file, show invoice/payment reminder |
| Permissions | Client portal permissions plus target module permissions |
| Workflow | Client event triggers rule, content safety checked, approval if needed, client-safe action executes |
| Notifications | Client approval requested, file shared, invoice due, project update published |
| Audit log requirements | Client-facing automation, file share, invoice notification, external message |
| Error handling | Suppress unsafe message; block cross-client output; notify authorized admin |
| Edge cases | Client membership revoked, internal file selected, payroll/profit data included, wrong client context |
| KPIs | Client notifications sent, approval response time, suppressed unsafe actions, client portal engagement |
| Acceptance criteria | Client portal automations expose only client-owned, approved, client-visible data |

---

## 21. Module Specification: Finance Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate invoice reminders, payment follow-ups, wallet updates, revenue status, financial reports, and finance review queues |
| Data objects | `invoices`, `payments`, `payment_allocations`, `wallets`, `wallet_transactions`, `revenue_records`, `profitability_records`, `notifications`, `audit_logs` |
| Required fields | Financial object, client, currency, amount metadata, status, due date, owner approval, audit result |
| Statuses | Draft, Waiting Approval, Active, Failed, Completed, Suppressed |
| Triggers | Invoice due, invoice overdue, payment received, partial payment, wallet changed, report scheduled |
| Conditions | Owner Only Financial Access, explicit finance grant, client scope, currency, invoice/payment status |
| Actions | Notify Owner, draft reminder, update non-sensitive status, create review item, generate report draft |
| Permissions | Owner or explicit finance automation grant; client output limited to own approved billing data |
| Workflow | Finance trigger occurs, financial permission checked, safe action executes or approval requested, audit logs created |
| Notifications | Invoice overdue, payment received, partial payment, wallet credited, financial report ready |
| Audit log requirements | Every sensitive financial automation action, report export, payment/wallet action, blocked access |
| Error handling | Unauthorized run blocked; financial details redacted from unsafe notifications |
| Edge cases | Multi-currency mismatch, voided invoice, duplicate payment event, client archived, overpayment |
| KPIs | Overdue reduction, payment follow-up success, finance automation failures, blocked financial attempts |
| Acceptance criteria | Finance automations enforce Owner Only Financial Access and never expose financial data to unauthorized users |

---

## 22. Module Specification: Payroll Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate timesheet reminders, approved time checks, payroll review queues, payroll notifications, and payroll status safeguards |
| Data objects | `time_entries`, `timesheets`, `employee_profiles`, `employee_costs`, `payroll_runs`, `payroll_items`, `notifications`, `audit_logs` |
| Required fields | Employee, time period, approved time, payroll run, payroll item, approval status, payroll permission |
| Statuses | Draft, Waiting Approval, Active, Blocked, Failed, Completed |
| Triggers | Timesheet due, timesheet submitted, time approved, payroll period ended, payroll review needed |
| Conditions | No Start = No Time, No Time = No Payroll, Approved Time Only Payroll, Owner/explicit payroll permission |
| Actions | Remind employee, notify Owner, create payroll review queue, flag missing cost rate, mark payroll-ready draft |
| Permissions | Owner or explicit payroll grant; employees can receive own timesheet reminders only |
| Workflow | Payroll-related trigger occurs, time and payroll rules validated, action executes or approval requested, audit logs created |
| Notifications | Timesheet due, timesheet approved/rejected, payroll ready, missing rate, payroll blocked |
| Audit log requirements | Payroll run creation, payroll approval, payroll-ready automation, blocked unauthorized payroll access |
| Error handling | Unapproved or invalid time excluded; missing cost rate flagged; unauthorized access blocked |
| Edge cases | Running timer, inactive task/project, rejected timesheet, duplicate payroll item, employee archived |
| KPIs | Timesheet submission rate, payroll readiness, blocked invalid payroll, payroll automation failures |
| Acceptance criteria | Payroll automations never create payroll from missing, running, inactive, rejected, or unapproved time |

---

## 23. Module Specification: File Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate file processing, version notifications, file locks, approval triggers, client sharing, and retention reminders |
| Data objects | `files`, `file_versions`, `file_shares`, `approvals`, `notifications`, `automation_runs` |
| Required fields | File, version, owner, visibility, client scope, status, lock state, share target |
| Statuses | Active, Waiting Approval, Processing, Failed, Suppressed, Completed |
| Triggers | File uploaded, new version, file approved, file locked/unlocked, file shared, retention due |
| Conditions | File permission, file status, quarantine status, client visibility, lock state, share policy |
| Actions | Notify reviewers, create approval, lock file, share approved file, generate preview, flag retention |
| Permissions | File read/upload/share/version/lock permissions and client visibility permission |
| Workflow | File event triggers rule, safety checks run, action executes or approval requested, logs update |
| Notifications | File uploaded, version added, approval requested, file shared, file blocked |
| Audit log requirements | Client-visible sharing, restricted access changes, forced unlock, final file replacement |
| Error handling | Quarantined file blocks automation; missing visibility suppresses client action |
| Edge cases | Infected/quarantined file, wrong client share, locked file version, deleted file |
| KPIs | File automation success, approval creation rate, blocked unsafe shares, processing failures |
| Acceptance criteria | File automations never share internal, restricted, quarantined, or wrong-client files |

---

## 24. Module Specification: Chat Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate chat mentions, task creation from messages, reminders, summaries, client-safe messages, and escalation |
| Data objects | `chat_channels`, `chat_channel_members`, `chat_messages`, `tasks`, `notifications`, `ai_logs` |
| Required fields | Channel, message, sender, recipient/member, visibility, client scope, action type |
| Statuses | Active, Waiting Approval, Failed, Suppressed, Completed |
| Triggers | New message, mention, keyword, client message, unanswered message, message converted to task |
| Conditions | Channel membership, client scope, message visibility, AI permission where summarizing, safety review |
| Actions | Notify, create task draft, summarize thread, escalate unanswered message, request approval for client message |
| Permissions | Chat/channel permissions, task create permission, AI permission for summaries |
| Workflow | Chat event triggers rule, visibility checked, action executes or approval requested, logs update |
| Notifications | Mention, unanswered message, task draft ready, client message needs review |
| Audit log requirements | AI-assisted client message, exported chat, client-visible automation, sensitive escalation |
| Error handling | Suppress internal content in client channels; block non-member access |
| Edge cases | User removed from channel, internal note in client channel, message deleted, prompt injection in chat |
| KPIs | Chat response time, task creation from chat, suppressed unsafe messages, automation failures |
| Acceptance criteria | Chat automations respect channel membership and never expose internal chat to clients |

---

## 25. Module Specification: Voice Note Automations

| Required Area | Specification |
| --- | --- |
| Purpose | Automate voice transcription, task extraction, meeting note creation, notifications, and follow-up drafts |
| Data objects | `voice_notes`, `files`, `tasks`, `meetings`, `ai_logs`, `automation_runs`, `notifications` |
| Required fields | Voice note, audio file, language, transcript status, visibility, project/client/task context, extraction result |
| Statuses | Uploaded, Transcribing, Transcribed, Extraction Ready, Waiting Approval, Failed |
| Triggers | Voice note recorded, audio uploaded, transcription completed, extraction completed |
| Conditions | Voice note access, file safety, consent where meeting, AI permission, task creation permission |
| Actions | Transcribe, summarize, extract task draft, notify user, create approval request, link source |
| Permissions | Voice note permission, file access, AI permission, task create permission |
| Workflow | Voice trigger occurs, consent/access checked, transcript generated, extraction proposed, human approval required |
| Notifications | Transcription completed/failed, task draft ready, approval needed |
| Audit log requirements | AI task extraction, client-visible voice output, consent-sensitive meeting transcript |
| Error handling | Poor audio marks low confidence; unsafe transcript blocked; task not created without approval |
| Edge cases | Multi-language audio, missing consent, inaccessible project, client-visible voice note risk |
| KPIs | Transcription success, extraction acceptance, task conversion rate, failure rate |
| Acceptance criteria | Voice automations never create tasks or publish summaries without confirmation and permission checks |

---

## 26. Module Specification: Automation Logs

| Required Area | Specification |
| --- | --- |
| Purpose | Record every automation run, skipped run, failed run, approval path, permission result, and action outcome |
| Data objects | `automation_runs`, `audit_logs`, `activity_logs`, `ai_logs`, `notifications` |
| Required fields | Tenant, automation, run ID, trigger, actor, source object, condition result, action results, status, timestamps, error |
| Statuses | Queued, Running, Succeeded, Partially Succeeded, Failed, Skipped, Blocked, Cancelled |
| Triggers | Automation run starts, step completes, action fails, approval decision occurs, run ends |
| Conditions | Sensitive actions require audit log; client-visible activity requires client-safe visibility |
| Actions | Create run log, update run status, create audit/activity log, notify admin on failure |
| Permissions | Owners/admins can view automation logs; sensitive logs require audit/security permissions |
| Workflow | Run log created at start, step results appended, final status recorded, analytics updated |
| Notifications | Failed run, repeated failures, blocked sensitive run, high failure rate |
| Audit log requirements | Sensitive automation actions, permission changes, financial/payroll/client-facing/external actions |
| Error handling | Logging failure escalates to system/admin alert and must not hide action failure |
| Edge cases | Partial run, log redaction needed, target deleted after run, actor deactivated |
| KPIs | Run volume, success rate, failure rate, blocked runs, partial runs |
| Acceptance criteria | Every automation run has a durable log visible to authorized users |

---

## 27. Module Specification: Automation Error Handling

| Required Area | Specification |
| --- | --- |
| Purpose | Define safe failure, retry, escalation, pausing, and recovery behavior for automation runs |
| Data objects | `automation_runs`, `notifications`, `audit_logs`, `activity_logs` |
| Required fields | Error type, error message, failed step, retry count, retry policy, severity, admin visibility |
| Statuses | Failed, Retrying, Paused, Blocked, Resolved, Ignored |
| Triggers | Step failure, permission failure, provider failure, rate limit, loop detection, unsafe output |
| Conditions | Retry allowed only if idempotent and safe; sensitive failures require audit/admin visibility |
| Actions | Retry, skip, pause rule, notify admin, create incident, require human review |
| Permissions | Authorized admins can view and resolve failures; sensitive errors require audit permission |
| Workflow | Error detected, classified, retry evaluated, admin notified, run resolved or paused |
| Notifications | Run failed, retry exhausted, rule paused, incident created |
| Audit log requirements | Sensitive failures, blocked finance/payroll/client actions, repeated unauthorized attempts |
| Error handling | This module defines handling; no unsafe retry for destructive or external actions |
| Edge cases | Partial action success, duplicate retry, external service timeout, permission revoked during retry |
| KPIs | Failure rate, retry success, paused rules, mean time to resolution |
| Acceptance criteria | Automation failures are visible, classified, recoverable where safe, and never silently ignored |

---

## 28. Module Specification: Automation Permissions

| Required Area | Specification |
| --- | --- |
| Purpose | Govern who can create, edit, approve, activate, run, pause, view, and audit automations |
| Data objects | `roles`, `permissions`, `role_permissions`, `membership_roles`, `automations`, `audit_logs` |
| Required fields | User, role, permission, automation scope, target module, approval authority |
| Statuses | Granted, Revoked, Pending, Expired |
| Triggers | Permission grant, rule creation, activation request, run request, sensitive action |
| Conditions | Owner approval, target module permission, client scope, finance/payroll restriction, AI policy |
| Actions | Grant/revoke permission, approve activation, deny unsafe action, audit access |
| Permissions | `automations.read`, `automations.create`, `automations.update`, `automations.manage`, `automations.approve`, target module permissions |
| Workflow | User requests automation action, permissions evaluated, action allowed/denied, audit created where sensitive |
| Notifications | Permission granted/revoked, activation denied, sensitive rule approval requested |
| Audit log requirements | Permission grant/revocation, activation, sensitive automation changes, financial/payroll automation access |
| Error handling | Deny by default if permission cannot be resolved |
| Edge cases | Last Owner removed, user loses permission after activation, client user attempts global automation |
| KPIs | Users with automation access, permission changes, denied attempts, sensitive approvals |
| Acceptance criteria | Automation permissions cannot override tenant isolation, client boundaries, finance/payroll rules, or target module permissions |

---

## 29. Module Specification: Automation Safety Rules

| Required Area | Specification |
| --- | --- |
| Purpose | Define cross-cutting safety controls for loops, destructive actions, external actions, abuse, rate limits, and idempotency |
| Data objects | `automations`, `automation_runs`, `audit_logs`, `notifications`, safety policy metadata |
| Required fields | Safety class, approval requirement, rate limit, loop key, idempotency key, retry policy |
| Statuses | Safe, Needs Approval, Blocked, Rate Limited, Loop Detected, Disabled |
| Triggers | Rule validation, run start, action execution, repeated failures, loop detection |
| Conditions | Safety class, action risk, target sensitivity, external exposure, client visibility, financial/payroll scope |
| Actions | Require approval, block action, rate limit, pause rule, notify admin, create incident |
| Permissions | Owner/admin controls safety settings; users cannot weaken mandatory safety |
| Workflow | Safety evaluated at build time and run time; unsafe actions blocked or routed to approval |
| Notifications | Safety block, loop detected, rate limit reached, automation disabled |
| Audit log requirements | Safety policy changes, destructive action approvals, external action approvals, blocked sensitive runs |
| Error handling | Unsafe automation fails closed and preserves logs |
| Edge cases | Automation triggers itself, circular chain across rules, bulk update cascade, abuse via repeated manual run |
| KPIs | Loops prevented, rate limits hit, approvals required, blocked unsafe actions |
| Acceptance criteria | Automation safety prevents loops, abuse, unauthorized exposure, and unapproved destructive/external actions |

---

## 30. Module Specification: Automation Analytics

| Required Area | Specification |
| --- | --- |
| Purpose | Measure automation performance, usage, failures, safety events, cost impact, time savings, and admin workload |
| Data objects | `automation_runs`, `automations`, `audit_logs`, `activity_logs`, `notifications`, `ai_logs` |
| Required fields | Tenant, rule, module, run count, success/failure, duration, action count, approval count, error class |
| Statuses | Current, Stale, Failed, No Permission |
| Triggers | Run completed, run failed, rule changed, analytics refresh scheduled |
| Conditions | User has analytics permission and target module visibility |
| Actions | Generate dashboards, reports, trend summaries, failure insights, safety metrics |
| Permissions | Owner/admin by default; module owners can view scoped analytics if granted |
| Workflow | Runs aggregate into analytics, dashboards update, admins review trends and failures |
| Notifications | High failure rate, cost spike, loop risk, repeated blocked attempts |
| Audit log requirements | Exporting automation analytics, viewing sensitive finance/payroll automation analytics |
| Error handling | Stale analytics marked; missing data does not fabricate metrics |
| Edge cases | Low volume rules, deleted automation, sensitive data redaction, cross-module aggregation |
| KPIs | Run success rate, failure rate, average duration, time saved, approvals, loops prevented, cost estimate |
| Acceptance criteria | Automation analytics are permission-safe, tenant-scoped, and actionable for authorized admins |

---

## 31. Required Workflow Specifications

### 31.1 Automation Creation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Authorized user opens Workflow Builder |
| 2 | User selects module and trigger |
| 3 | User configures conditions |
| 4 | User configures actions |
| 5 | System validates tenant, permissions, client scope, safety, loop risk, and approval needs |
| 6 | User previews test result |
| 7 | Rule is saved as draft or submitted for approval |
| 8 | Logs record creation and validation result |

### 31.2 Automation Approval Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Automation requiring approval is submitted |
| 2 | Owner or authorized automation approver reviews trigger, conditions, actions, and safety |
| 3 | Financial/payroll/client-facing/destructive/external actions receive stricter review |
| 4 | Approver approves, rejects, or requests changes |
| 5 | Approved automation can be activated |
| 6 | Decision is audited |

### 31.3 Automation Execution Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Trigger event occurs |
| 2 | Matching active automation is found |
| 3 | Automation run log is created |
| 4 | Permission and safety checks run |
| 5 | Conditions evaluate |
| 6 | Actions execute or create approval request |
| 7 | Notifications are sent where permitted |
| 8 | Run log and audit/activity logs are finalized |

### 31.4 Trigger Evaluation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Event, schedule, recurring rule, manual run, or AI proposal is received |
| 2 | Tenant context is resolved |
| 3 | Candidate automations are matched |
| 4 | Duplicate/idempotency checks run |
| 5 | Invalid or duplicate triggers are skipped and logged |
| 6 | Valid trigger creates candidate run |

### 31.5 Condition Evaluation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Candidate run enters condition evaluation |
| 2 | Conditions load only allowed metadata |
| 3 | Role, resource, client, financial, payroll, file, and AI conditions are checked |
| 4 | Failed condition skips or blocks run safely |
| 5 | Passed conditions allow action evaluation |
| 6 | Results are recorded in automation run log |

### 31.6 Action Execution Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Action receives passed condition context |
| 2 | Target permission is checked again |
| 3 | Safety and idempotency checks run |
| 4 | Human approval is requested if required |
| 5 | Approved action executes |
| 6 | Action result is logged |
| 7 | Dependent actions continue only if previous action succeeded or safe continuation is configured |

### 31.7 Scheduled Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Scheduled time is reached in configured timezone |
| 2 | Rule and tenant are confirmed active |
| 3 | Candidate run is created |
| 4 | Conditions and permissions evaluate |
| 5 | Actions execute or approval is requested |
| 6 | Missed or failed schedule is logged |

### 31.8 Recurring Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Recurrence interval reaches next run |
| 2 | Recurrence validity is checked |
| 3 | Duplicate occurrence is prevented |
| 4 | Candidate run executes through standard lifecycle |
| 5 | Next run is calculated |
| 6 | Expired recurrence is completed or archived |

### 31.9 AI-Powered Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Trigger identifies AI-eligible action |
| 2 | AI permissions and source access are checked |
| 3 | Prompt injection protection and redaction apply |
| 4 | AI generates draft, classification, summary, or recommendation |
| 5 | Sensitive output enters human approval |
| 6 | Approved output executes under target permissions |
| 7 | AI log, automation run log, and audit log are created |

### 31.10 Approval Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Approval trigger occurs |
| 2 | Target object and visibility are validated |
| 3 | Approvers are resolved |
| 4 | Approval request is created |
| 5 | Notifications are sent to permitted approvers |
| 6 | Decision updates target record |
| 7 | Decision is logged |

### 31.11 Notification Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Notification event occurs |
| 2 | Recipients are resolved |
| 3 | Recipient permissions and preferences are checked |
| 4 | Sensitive content is redacted |
| 5 | Notification is delivered |
| 6 | Delivery result is logged |

### 31.12 CRM Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | CRM event occurs |
| 2 | CRM permissions and stage conditions are checked |
| 3 | Follow-up, reminder, approval, or draft action is created |
| 4 | External-facing actions require approval |
| 5 | CRM activity is logged |

### 31.13 Project Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Project event occurs |
| 2 | Project status, client scope, and permissions are checked |
| 3 | Project action executes or approval is requested |
| 4 | Notifications are sent where permitted |
| 5 | Activity and audit logs update |

### 31.14 Task Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Task/subtask/dependency event occurs |
| 2 | Task/project permissions and dependency conditions are checked |
| 3 | Task action executes or waits for approval |
| 4 | Assignee and watchers are notified |
| 5 | Run and activity logs update |

### 31.15 Client Portal Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Client portal event or client-visible trigger occurs |
| 2 | Client scope and visibility are checked |
| 3 | Content is reviewed for client-safe output |
| 4 | Approval is required for external-facing actions unless explicitly configured |
| 5 | Client-safe action executes |
| 6 | Client-facing event is logged |

### 31.16 Finance Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Finance event occurs |
| 2 | Owner Only Financial Access or explicit finance grant is checked |
| 3 | Financial conditions evaluate |
| 4 | Sensitive action requires approval |
| 5 | Action executes or safe draft is created |
| 6 | Financial audit log is created |

### 31.17 Payroll Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Payroll or timesheet event occurs |
| 2 | Payroll permission is checked |
| 3 | No Start = No Time is enforced |
| 4 | No Time = No Payroll is enforced |
| 5 | Approved Time Only Payroll is enforced |
| 6 | Payroll action executes or review queue is created |
| 7 | Payroll audit log is created |

### 31.18 File Automation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | File event occurs |
| 2 | File status, permission, visibility, lock state, and client scope are checked |
| 3 | Quarantined or unsafe files are blocked |
| 4 | Approval/share/lock/notification action executes or approval is requested |
| 5 | File activity and audit logs update |

### 31.19 Error Handling Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Automation error occurs |
| 2 | Error is classified by severity and type |
| 3 | Retry is evaluated only for safe idempotent actions |
| 4 | Failed sensitive run is logged and surfaced to authorized admin |
| 5 | Repeated failures may pause automation |
| 6 | Resolution is logged |

### 31.20 Automation Audit Logging Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Automation run starts |
| 2 | Run log captures trigger, actor, tenant, source, and automation |
| 3 | Permission, condition, action, and safety results are recorded |
| 4 | Sensitive actions create audit logs |
| 5 | Client-visible actions create activity logs where appropriate |
| 6 | Final run status is stored |
| 7 | Logs are available only to authorized users |

---

## 32. Automation Permissions Catalog

Recommended permission keys:

- `automations.read`
- `automations.create`
- `automations.update`
- `automations.manage`
- `automations.approve`
- `automations.run`
- `automations.pause`
- `automations.logs.read`
- `automations.analytics.read`
- `automations.finance.manage`
- `automations.payroll.manage`
- `automations.ai.manage`
- `automations.client_portal.manage`

Permission rules:

- Owner has full automation authority by default.
- Managers may manage operational automations only when explicitly granted.
- Employees may not manage global automations by default.
- Clients cannot create tenant-wide automations.
- Client-triggered automations must be scoped to the client's own portal records.
- Finance automation permissions do not imply payroll automation permissions.
- AI automation permissions do not bypass Phase 9 AI permissions.

---

## 33. Automation Reports And KPI Catalog

Required reports:

- Automation rule inventory.
- Automation run history.
- Failed automation report.
- Automation audit report.
- Automation permission report.
- Automation usage by module.
- AI automation report.
- Finance/payroll automation report.
- Client-facing automation report.
- Automation safety report.
- Automation cost and workload impact report.

Required KPIs:

- Total active automations.
- Runs per automation.
- Run success rate.
- Run failure rate.
- Average run duration.
- Skipped runs.
- Blocked runs.
- Approval-required actions.
- Destructive actions blocked.
- External-facing approvals.
- Automation loops prevented.
- Rate limits triggered.
- AI automation cost.
- Time saved estimate.
- Failed runs by module.
- Admin resolution time.

---

## 34. Automation Edge Case Register

| Edge Case | Required Handling |
| --- | --- |
| Automation triggers itself | Detect loop and block recursive run |
| Multiple automations update same record | Apply conflict handling and log order |
| Source record deleted mid-run | Stop safely and log skipped action |
| User loses permission after activation | Re-check permission at run time and block if invalid |
| Client record becomes hidden | Suppress client-visible action |
| Finance automation requested by Manager without grant | Block and audit |
| Payroll run includes unapproved time | Block and audit |
| AI-generated action contains unsafe output | Block or require approval |
| External provider fails | Stop safely, retry only if idempotent |
| Duplicate payment webhook | Prevent duplicate allocation/action |
| File quarantined after upload trigger | Block file automation |
| Notification recipient removed | Suppress delivery and log |
| Recurring rule crosses daylight saving | Use configured timezone and log next run |
| Automation chain exceeds depth limit | Stop chain and notify admin |

---

## 35. Phase 10 Acceptance Criteria

Phase 10 is accepted when:

- Automation Rule Model is fully specified.
- Workflow Builder is fully specified.
- Trigger System is fully specified.
- Condition System is fully specified.
- Action System is fully specified.
- Scheduled Automation System is fully specified.
- Recurring Automation System is fully specified.
- AI-Powered Automations are fully specified.
- Approval Automations are fully specified.
- Notification Automations are fully specified.
- CRM Automations are fully specified.
- Project Automations are fully specified.
- Task Automations are fully specified.
- Client Portal Automations are fully specified.
- Finance Automations are fully specified.
- Payroll Automations are fully specified.
- File Automations are fully specified.
- Chat Automations are fully specified.
- Voice Note Automations are fully specified.
- Automation Logs are fully specified.
- Automation Error Handling is fully specified.
- Automation Permissions are fully specified.
- Automation Safety Rules are fully specified.
- Automation Analytics are fully specified.
- All required workflows are included.
- All required diagrams are included.
- Automations respect tenant isolation, permissions, client boundaries, file security, AI rules, finance restrictions, and payroll rules.
- Destructive and external-facing actions require human approval unless explicitly configured by Owner policy.
- Every automation run is logged.
- Failed runs are visible to authorized admins.
- Automation loops, abuse, and unsafe retries are prevented.
- No code, SQL, implementation scripts, or migrations are included.

---

## 36. Implementation Checklist

This is a specification checklist only.

Before implementation handoff, confirm:

- Final automation permission keys.
- Automation feature entitlements by tenant plan.
- Workflow Builder UI states.
- Approval policy for sensitive automation categories.
- Finance and payroll automation owner/grant rules.
- Client-facing automation policy.
- Automation run retention policy.
- Automation rate limits.
- Automation loop detection thresholds.
- Retry and idempotency policy.
- AI automation cost limits.
- Notification delivery safety policy.
- Automation audit retention policy.
- Admin failure visibility requirements.

---

## 37. Final Phase 10 Statement

This Phase 10 Automations & Workflow Engine Specification defines the MAOS automation model, workflow builder, triggers, conditions, actions, scheduled and recurring automations, AI-powered automations, approval automations, notification automations, CRM automations, project automations, task automations, client portal automations, finance automations, payroll automations, file automations, chat automations, voice note automations, logs, error handling, permissions, safety rules, and analytics.

All automation implementation must preserve tenant isolation, RBAC, custom permissions, client boundaries, file security, AI hardening, Owner Only Financial Access, payroll restrictions, human approval requirements, full run logging, loop prevention, rate limits, and auditability.

---

## 38. Phase 10 Critical Fix Addendum

This addendum closes the critical gaps found in the strict Phase 10 audit. It extends the existing Phase 10 specification without replacing prior sections. All rules below are mandatory for implementation and override any weaker interpretation in earlier Phase 10 sections.

### 38.1 Automation Versioning Model

Purpose:

- Preserve safe automation lifecycle changes.
- Allow draft editing without changing the active published rule.
- Support approval, activation, rollback, auditability, and version-safe testing.

Version concepts:

| Version Concept | Required Meaning |
| --- | --- |
| Rule version history | Complete ordered history of all saved automation versions |
| Draft version | Editable unpublished version used for configuration and testing |
| Published version | Approved version eligible for activation |
| Current active version | Version currently used for execution |
| Previous active version | Last active version before current activation |
| Rollback version | Version selected to restore after failure or unsafe release |
| Version diff summary | Human-readable summary of changes from prior version |
| Version author | User who created or edited the version |
| Version approval | Approval decision and approver before activation where required |
| Version activation date | Timestamp when version became active |

Required fields:

- Automation rule.
- Version number.
- Version status.
- Version author.
- Version owner.
- Base version.
- Draft created timestamp.
- Approval status.
- Approved by.
- Approved timestamp.
- Diff summary.
- Safety classification.
- Trigger changes.
- Condition changes.
- Action changes.
- Permission changes.
- Execution context changes.
- Test result.
- Activation timestamp.
- Deactivation timestamp.
- Rollback source version where applicable.
- Rollback reason where applicable.

Version statuses:

- Draft.
- Pending Approval.
- Approved.
- Published.
- Active.
- Previous Active.
- Deprecated.
- Rolled Back.
- Rejected.
- Archived.

Version-safe editing rules:

- Editing an active automation must create a new draft version.
- Active version must remain unchanged while a draft is edited.
- Draft version must not execute production runs.
- Draft version may only run against preview/test context.
- Draft version must be permission-checked against the current editor and target modules.
- Draft version must show diff summary before approval.

Version-safe testing rules:

- Test runs must not create production side effects unless explicitly using a safe preview mode.
- Test runs must use redacted, permission-safe sample payloads.
- Test runs must validate trigger, condition, action, permission, loop, rate limit, idempotency, and approval rules.
- Test results must be stored with the version.
- Failed tests block approval unless an Owner explicitly overrides for non-production use.

Version-safe approval rules:

- Approval applies to a specific version, not the automation rule in general.
- Any change after approval invalidates the approval and returns the version to Draft.
- Sensitive versions require Owner or authorized automation approver.
- Finance, payroll, AI, client-facing, destructive, export, and external-facing changes require stricter approval.

Version rollback workflow:

| Step | Required Behavior |
| --- | --- |
| 1 | Authorized user selects rollback candidate |
| 2 | System verifies selected version belongs to same tenant and same automation rule |
| 3 | System validates version safety and current permissions |
| 4 | System compares current active version to rollback version |
| 5 | Owner or authorized approver confirms rollback |
| 6 | Current active version becomes Previous Active or Rolled Back |
| 7 | Rollback version becomes Active |
| 8 | Rollback reason, approver, timestamp, and diff are audited |

Acceptance criteria:

- Active automations cannot be edited in place.
- Every change creates a new version.
- Every active version has a version history.
- Rollback restores a known approved version.
- Version activation, rollback, approval, and rejection are audited.

### 38.2 Workflow Builder Lifecycle States

| State | Purpose | Entry Conditions | Allowed Actions | Exit Conditions | Required Permissions | Audit Log Requirements |
| --- | --- | --- | --- | --- | --- | --- |
| Draft | Editable automation version | New rule or active rule edited into new version | Edit trigger, conditions, actions, execution context, test, submit | Submit for approval, archive, discard | Automation create/update plus target module permissions | Draft creation and sensitive edits |
| Pending Approval | Awaiting review | User submits version requiring approval | Review, comment, approve, reject, request changes | Approved, Rejected, Draft | Automation approve; Owner for sensitive rules | Approval request and reviewer actions |
| Approved | Approved but not active | Approver approves version | Activate, schedule activation, archive | Active, Published, Archived | Automation manage/activate | Approval decision and activation request |
| Active | Production executable | Approved version activated | Pause, rollback, create draft from active, view logs | Paused, Rolled Back, Deprecated, Failed | Automation manage/pause/rollback | Activation, pause, rollback |
| Paused | Temporarily disabled | User pauses or system auto-pauses | Resume if valid, edit as new draft, archive | Active, Draft, Archived | Automation manage | Pause/resume reason |
| Failed | Rule or active version failed safety/runtime checks | Repeated run failures, invalid dependency, revoked permission | Review errors, create fix draft, pause, rollback | Draft, Paused, Rolled Back, Archived | Automation manage and logs read | Failure reason and admin review |
| Archived | Retained but inactive | User archives or lifecycle policy archives | View, clone as draft where permitted | Draft clone only | Automation manage | Archive and restore/clone |
| Deprecated | Replaced by newer version | New active version supersedes current | View, rollback if allowed, archive | Rolled Back, Archived | Automation manage/rollback | Deprecation record |
| Rolled Back | Version removed from active use through rollback | Rollback executed | View, audit, clone as draft | Draft clone, Archived | Automation manage/rollback | Rollback source, target, reason |

State rules:

- Archived and Deprecated versions must not execute.
- Failed versions must not resume automatically.
- Paused versions must revalidate permissions before reactivation.
- Rolled Back versions require a new approval if edited again.
- State transitions involving sensitive automations must be audited.

### 38.3 Complete Typed Trigger Catalog

| Trigger Category | Examples | Permission Requirements |
| --- | --- | --- |
| CRM triggers | CRM record created, CRM owner changed, CRM stale activity detected | CRM read plus target automation permission |
| Lead triggers | Lead created, lead status changed, lead converted, lead inactive for period | Leads read/manage where action updates lead |
| Opportunity triggers | Opportunity stage changed, expected close date near, opportunity won/lost, probability changed | Opportunities read/manage |
| Meeting triggers | Meeting scheduled, meeting completed, meeting transcript added, meeting follow-up overdue | Meetings read/manage and linked record access |
| Proposal triggers | Proposal draft created, proposal approved, proposal sent, proposal accepted/rejected | Proposal/file/approval permissions |
| Quotation triggers | Quotation draft created, quotation approved, quotation sent, quotation accepted/rejected | Quotation/file/approval permissions |
| Project triggers | Project created, project status changed, project due date near, project at risk | Project read/manage |
| Task triggers | Task created, task assigned, task status changed, task overdue, task priority changed | Task read/update/assign as needed |
| Subtask triggers | Subtask created, subtask completed, subtask overdue, subtask blocked | Parent task access and subtask manage |
| Dependency triggers | Dependency created, dependency completed, dependency blocked, dependency violated | Task dependency permission and both task scopes |
| Approval triggers | Approval requested, approved, rejected, changes requested, overdue | Approval read/manage and target access |
| File triggers | File uploaded, file shared, file deleted, file quarantined, file metadata changed | File access and target action permission |
| File version triggers | New version uploaded, version approved, version rejected, version restored | File version permission |
| File lock triggers | File locked, unlocked, force-unlocked, lock expired | File lock/unlock permission |
| Chat triggers | New internal message, mention, unanswered message, keyword detected | Channel membership and chat permission |
| Client chat triggers | New client message, client mention, unanswered client question | Client chat membership and client scope |
| Voice note triggers | Voice note recorded, voice uploaded, voice linked to task/client/project | Voice note access and file access |
| Voice transcription triggers | Transcript completed, transcript failed, transcript low confidence | Voice note/transcription permission |
| AI triggers | AI suggestion created, AI draft ready, AI risk detected, AI job failed | AI permission plus source access |
| AI confidence triggers | AI confidence below threshold, high confidence classification, low confidence extraction | AI logs access and AI admin/feature permission |
| Finance triggers | Financial report ready, revenue record changed, profitability threshold breached | Owner or explicit finance grant |
| Invoice triggers | Invoice draft created, invoice approved, invoice sent, invoice overdue, invoice paid | Invoice permission; Owner/global finance for internal finance data |
| Payment triggers | Payment recorded, payment failed, partial payment, refund requested, provider duplicate event | Payment permission and financial scope |
| Wallet triggers | Wallet credited, debited, adjusted, low balance, refund requested | Wallet permission and client/finance scope |
| Payroll triggers | Payroll period ended, payroll ready, payroll approved, payroll blocked, payroll exception | Owner or explicit payroll grant |
| Timesheet triggers | Timesheet submitted, approved, rejected, overdue, missing time detected | Timesheet permission and employee scope |
| Client portal triggers | Client logs in, client views invoice, client approves file, client sends message | Client scope and client-visible source access |
| Notification triggers | Notification failed, unread notification threshold, delivery bounced | Notification admin or source-owner permission |
| Scheduled triggers | One-time scheduled date/time, scheduled report, scheduled reminder | Automation schedule permission and target permission |
| Recurring triggers | Daily/weekly/monthly recurrence, recurring task, recurring project, recurring reminder | Recurring automation permission and target create/update permission |

Trigger acceptance criteria:

- Every trigger is tenant-scoped.
- Every trigger carries source object type and source object ID where applicable.
- Triggers never execute actions directly.
- Trigger payloads must include idempotency and replay metadata where external or repeatable.

### 38.4 Complete Condition Taxonomy

| Condition Type | Input Data | Evaluation Result | Failure Behavior | Security Notes |
| --- | --- | --- | --- | --- |
| Role conditions | User role, membership, tenant | Passed, failed, blocked | Block if role invalid | Role hierarchy does not bypass explicit restrictions |
| Permission conditions | Required permission and target module | Passed, failed, blocked | Block action | Evaluate at creation and runtime |
| Tenant conditions | Tenant ID, tenant status, environment | Passed, failed | Block run | Cross-tenant references prohibited |
| Client scope conditions | Client ID, membership client scope, visibility | Passed, failed, blocked | Suppress client action | Never reveal other-client data |
| Project scope conditions | Project ID, project status, user access | Passed, failed | Skip or block | Client-visible projects require client context |
| Task status conditions | Task ID, status, assignee, visibility | Passed, failed | Skip action | Hidden task status must not leak |
| Subtask status conditions | Subtask ID, parent task, status | Passed, failed | Skip action | Parent task access required |
| Dependency conditions | Dependency status, source task, target task | Passed, failed, blocked | Block unsafe update | Prevent circular dependencies |
| Date/time conditions | Current time, timezone, schedule | Passed, failed | Skip run | Use user/client timezone rules |
| Due date conditions | Due date, overdue state, reminder window | Passed, failed | Skip notification/action | No unauthorized overdue summaries |
| SLA conditions | SLA target, elapsed time, status | Passed, failed | Trigger escalation or skip | Client-facing SLA data must be approved |
| Approval status conditions | Approval state, approvers, target | Passed, failed | Block next action | Approval visibility must match target |
| File status conditions | File status, quarantine, lock, visibility | Passed, failed, blocked | Block file action | Quarantined or restricted files cannot be shared |
| Chat/channel conditions | Channel membership, channel visibility | Passed, failed, blocked | Suppress message/action | Internal chat never exposed to clients |
| Voice/transcription status conditions | Transcript status, confidence, consent | Passed, failed | Hold draft or block | Consent and visibility required |
| AI confidence conditions | Confidence score/class, source quality | Passed, failed | Require approval or block | Low confidence cannot auto-save |
| AI risk level conditions | Risk class, sensitive output class | Passed, failed, blocked | Human approval required | Follow Phase 9 hardening |
| Financial conditions | Finance permission, financial scope, currency | Passed, failed, blocked | Block and audit | Owner Only Financial Access applies |
| Invoice conditions | Invoice status, due date, amount due, client | Passed, failed | Draft only or block | Client sees own approved invoice data only |
| Payment conditions | Payment status, allocation, provider event | Passed, failed, blocked | Prevent duplicate/unsafe update | Duplicate provider events must be idempotent |
| Wallet conditions | Wallet status, balance, currency, client | Passed, failed, blocked | Block or require approval | Wallet transactions require audit |
| Payroll conditions | Payroll permission, time approval, payroll status | Passed, failed, blocked | Block payroll action | No Start = No Time; No Time = No Payroll |
| Timesheet approval conditions | Timesheet status, approver, approved time | Passed, failed | Exclude from payroll | Approved Time Only Payroll |

Condition acceptance criteria:

- Conditions must fail closed when source data is missing or inaccessible.
- Conditions must not disclose hidden values in failure messages.
- Conditions must be logged at summary level for normal runs and with audit detail for sensitive blocked runs.

### 38.5 Complete Action Catalog

Sensitivity levels:

- Low: internal non-sensitive draft or notification.
- Medium: internal workflow update affecting assigned work.
- High: client-visible, external-facing, AI-generated, bulk, file-share, approval, or operationally sensitive action.
- Critical: financial, payroll, destructive, export, cross-module, permission-changing, or irreversible action.

| Action | Required Permissions | Sensitivity | Human Approval | Execution Context | Audit Log Requirement | Failure Behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Create task | Tasks create and project/client access | Medium | Required if AI-generated or client-visible | User or approved system | Activity log; audit if sensitive | Keep draft if blocked |
| Update task | Tasks update and task access | Medium | Required for bulk/client-visible sensitive updates | User or approved system | Activity log | Skip if stale/locked |
| Assign task | Tasks assign and assignee visibility | Medium | Required if AI-selected unless configured | User or approved system | Audit for bulk/AI assignment | Block if assignee lacks access |
| Reassign task | Tasks assign/manage | Medium | Required for bulk or client-visible tasks | User or approved system | Audit for bulk reassignment | Preserve existing assignee |
| Change task status | Tasks update | Medium | Required for client-visible final status where configured | User or approved system | Activity log | Block if dependency invalid |
| Change task priority | Tasks update | Low/Medium | Not required unless bulk/client-visible | User or approved system | Activity log | Skip if no access |
| Create subtask | Subtasks manage and parent task access | Medium | Required if AI-generated | User or approved system | Activity log | Keep draft if parent inaccessible |
| Update subtask | Subtasks manage | Medium | Required for sensitive/bulk | User or approved system | Activity log | Skip if stale |
| Link dependency | Task dependency permission and both task scopes | High | Required if dependency blocks work | User or approved system | Audit for dependency changes | Block circular dependency |
| Request review | Task/project/file approval permission | Medium | No, if internal and permitted | User or approved system | Activity log | Notify requester of failure |
| Request approval | Approval create/manage and target access | High | Approval request itself may be automated if permitted | User or approved system | Audit if client/finance/file-sensitive | Block if approver invalid |
| Create lead follow-up | CRM and task create | Medium | No unless client-facing | User or approved system | Activity log | Keep follow-up draft |
| Move CRM stage | Opportunity/lead manage | High | Required for won/lost or external impact | User only unless Owner-approved system | Audit stage movement | Block if stage invalid |
| Assign salesperson | CRM manage and user visibility | Medium | Required for bulk reassignment | User or approved system | Audit for assignment changes | Block if salesperson inactive |
| Create meeting reminder | Meeting read/manage and notification permission | Low | No unless external | User or approved system | Activity log | Suppress unsafe recipients |
| Create proposal draft | Proposal/file permission | High | Required before sending | User or approved system | Audit if client-facing | Save draft only |
| Create quotation draft | Quotation/file permission | High | Required before sending | User or approved system | Audit if client-facing | Save draft only |
| Send internal notification | Source visibility and notification permission | Low | No | System permitted | Delivery log | Suppress if recipient lacks access |
| Send client-safe notification | Client scope and source visibility | High | Required unless approved client-safe automation | Approved system | Audit if external/client-facing | Suppress unsafe content |
| Create chat reminder | Chat channel membership and notification permission | Low/Medium | No unless client-facing | User or approved system | Activity log | Suppress if channel access lost |
| Create file review request | File access and approval create | High | Required if client-facing | User or approved system | Audit for restricted/client files | Block if file quarantined |
| Lock file | File lock permission | High | Required for final/legal locks | User or approved system | Audit lock event | Block if already locked |
| Unlock file | File unlock permission | High | Required for force unlock | User only or Owner-approved system | Audit unlock event | Block if no override |
| Create revision request | Approval/file/task permission | High | Required for client-facing revisions | User or approved system | Activity/audit log | Block if approval closed |
| Generate summary draft | AI permission and source access | Medium/High | Required before publishing | AI under user/system scope | AI log; audit if sensitive | Mark failed/low confidence |
| Generate task draft | AI permission and task create target permission | Medium | Required before saving | AI under user/system scope | AI log | Keep draft only |
| Generate report draft | Report permission and source permissions | High/Critical | Required before export/publish | AI under user/system scope | AI log and audit if sensitive | Redact inaccessible data |
| Analyze risk | AI analytics permission and source access | Medium/High | Required before action | AI under user/system scope | AI log; audit for sensitive | Show low confidence/blocked |
| Extract action items | AI permission and source access | Medium | Required before task creation | AI under user/system scope | AI log | Draft only |
| Create AI suggestion | AI permission and source access | Medium | Required before action conversion | AI under user/system scope | AI log | Suppress unsafe suggestion |
| Create invoice draft | Invoice create and finance permission | Critical | Required before send/approve | User or Owner-approved system | Financial audit | Draft only if blocked |
| Update invoice status | Invoice manage and finance permission | Critical | Required for void/sent/approved status | User or Owner-approved system | Financial audit | Block unsafe transition |
| Record payment draft | Payment record and finance permission | Critical | Required before posting final payment | User or Owner-approved system | Financial audit | Draft only |
| Update payment status | Payment manage and finance permission | Critical | Required for succeeded/refunded/failed manual change | User or Owner-approved system | Financial audit | Block duplicate/replay |
| Create partial payment record | Payment allocation permission | Critical | Required unless provider-confirmed and configured | User or Owner-approved system | Financial audit | Prevent over-allocation |
| Create wallet credit draft | Wallet manage and finance permission | Critical | Required before posting | User or Owner-approved system | Financial audit | Draft only |
| Create wallet debit draft | Wallet manage and finance permission | Critical | Required before posting | User or Owner-approved system | Financial audit | Block insufficient balance |
| Create refund request | Payment/refund permission | Critical | Required | User only or Owner-approved system | Financial audit | Request only, not final refund |
| Generate financial report draft | Finance report permission | Critical | Required before export/publish | User or Owner-approved system | Financial audit | Redact or block |
| Generate timesheet review | Timesheet/payroll permission | High | Required for payroll action | User or approved system | Payroll audit if sensitive | Exclude invalid time |
| Flag missing time | Timesheet/project access | Medium | No for internal reminder | User or approved system | Activity log | Notify allowed user only |
| Flag unapproved time | Timesheet/payroll access | High | No for Owner review queue | Approved system | Payroll audit | Exclude from payroll |
| Prepare payroll draft | Payroll permission | Critical | Required before payroll approval | Owner or explicit payroll system context | Payroll audit | Block if no approved time |
| Block payroll when no approved time exists | Payroll rule enforcement | Critical | No; mandatory safety block | System safety context | Payroll audit | Stop payroll automation |
| Notify Owner of payroll exception | Payroll notification permission | High | No for Owner-only notification | System permitted | Payroll audit if sensitive | Redact for non-Owner |
| Send client-safe update | Client portal manage and source visibility | High | Required unless preapproved | Approved system | Client-facing audit | Suppress unsafe content |
| Request client approval | Approval create and client scope | High | Required if external-facing policy requires | User or approved system | Audit | Block if wrong client |
| Publish approved client report | Reports publish and client scope | Critical | Required | User or approved system | Audit | Block if report contains internal data |
| Notify client about invoice/payment where permitted | Client billing visibility and finance rules | High/Critical | Required unless approved reminder policy | Approved system | Financial/client audit | Send only own billing data |

Action acceptance criteria:

- Every action has explicit permission, sensitivity, approval, context, audit, and failure behavior.
- Critical actions never execute without approved context.
- Client-facing, financial, payroll, AI-generated, and destructive actions fail closed.

### 38.6 Execution Context Model

Execution context types:

| Context | Required Meaning | Allowed Use |
| --- | --- | --- |
| User-context execution | Automation executes using the permissions of the user who triggered or owns the action | User-initiated automations, manual runs, user-owned workflow helpers |
| System-context execution | Automation executes under a constrained system identity with explicit allowed actions | Scheduled/recurring/background automations approved by Owner policy |
| Owner-approved system automation | System-context automation explicitly approved by Owner for sensitive or cross-user workflows | Finance drafts, payroll review queues, client-safe reminders, recurring operational rules |

Execution fields:

- Configured execution context.
- Creator user.
- Runtime actor.
- Effective actor.
- Approved system actor where applicable.
- Permission snapshot.
- Snapshot timestamp.
- Required permission list.
- Resource scope.
- Client scope.
- Financial scope.
- Payroll scope.
- Approval policy.
- Last revalidation timestamp.
- Auto-pause reason where applicable.

Strict execution rules:

- Automations must never execute with broader permissions than the configured and approved execution context.
- User-context execution must re-check the user's current permissions at runtime.
- System-context execution must be explicitly scoped to allowed modules, resources, actions, clients, and sensitivity levels.
- Owner-approved system automation must record approval, scope, allowed actions, and expiry/review period where applicable.
- Permission snapshots are evidence only; they do not replace runtime permission checks.

Runtime permission revalidation:

- Revalidate before each run.
- Revalidate before each sensitive action.
- Revalidate after role changes.
- Revalidate after permission changes.
- Revalidate after client scope changes.
- Revalidate after project/client visibility changes.
- Revalidate after financial permission changes.
- Revalidate after payroll permission changes.
- Revalidate after AI policy changes.

Auto-pause rules:

- Auto-pause when creator or configured actor loses required permission.
- Auto-pause when referenced project becomes inaccessible.
- Auto-pause when referenced client becomes inaccessible.
- Auto-pause when financial permission is revoked.
- Auto-pause when payroll permission is revoked.
- Auto-pause when AI feature or provider policy is disabled.
- Auto-pause when client-facing visibility becomes invalid.
- Auto-pause when target module is disabled for tenant.

Acceptance criteria:

- Execution context is explicit for every automation.
- Runtime permissions are revalidated before execution.
- Role/client/financial/payroll changes can pause affected automations.
- System context is constrained, approved, audited, and never unlimited.

### 38.7 Safety And Abuse Prevention Expansion

Replay protection:

- Every external, scheduled, recurring, webhook, and retryable trigger must carry or derive a replay key.
- Replayed events must be detected before action execution.
- Replayed events may update logs but must not duplicate side effects.

Idempotency:

- Idempotency keys are required for task creation, invoice drafts, payment actions, wallet drafts, payroll drafts, notifications, file sharing, approvals, and external-facing actions.
- Idempotency key scope must include tenant, automation, version, trigger event, action, and target resource.

Duplicate prevention:

- Duplicate tasks, subtasks, invoices, payments, wallet actions, approvals, notifications, and reports must be blocked or merged according to action policy.
- Duplicate provider events must not create duplicate financial side effects.

Loop and recursion prevention:

- Every automation chain must track chain ID and chain depth.
- Max chain depth must be configurable by tenant policy within platform limits.
- Max automation loop count must stop repeated runs from the same source chain.
- Automations triggered by automation-created changes must carry origin metadata.
- Rules must not recursively trigger themselves without explicit safe design and bounded limits.

Rate limits and abuse detection:

- Track rate limit counters by tenant, user, automation, action type, target module, AI feature, and client portal.
- Detect repeated manual runs, repeated denied attempts, repeated AI prompt injection attempts, repeated failed financial/payroll access, and notification flooding.
- Abuse detection may pause automation, throttle execution, or require Owner/security review.

Stale source invalidation:

- If a source record changes after trigger evaluation and before action execution, the action must revalidate.
- AI-generated drafts become stale when source data changes.
- Approval decisions expire or require re-review when sensitive source data changes.

Conflict handling:

- Concurrent automations acting on the same target must use conflict policy.
- Conflict policies include skip, queue, merge, latest-safe-write, require review, or block.
- Financial, payroll, file lock, approval, and client-facing conflicts must prefer block or human review.

Manual override policy:

- Owner or authorized admin may manually pause, cancel, retry, or override safe non-critical automation states.
- Critical finance, payroll, external-facing, destructive, and client-visible overrides require audit and reason.
- Manual override must not bypass mandatory permissions.

Emergency kill switch:

- Owner/security admin must be able to disable one automation, a module category, AI-powered automations, client-facing automations, finance/payroll automations, or all tenant automations.
- Emergency disablement must stop new runs and prevent queued unsafe actions.
- In-progress runs must be stopped where safe or allowed to finish only if stopping would create greater risk.
- Emergency kill switch use must be audited.

Acceptance criteria:

- Replay, duplicate, recursive, abusive, stale, and conflicting automation behavior is controlled.
- Sensitive automations fail closed.
- Emergency disablement is available and audited.

### 38.8 Dead-Letter And Compensation Model

Purpose:

- Preserve failed automation work for review without unsafe retries or silent loss.
- Define what happens after retry exhaustion, partial failure, non-rollbackable side effects, and sensitive failures.

Dead-letter concepts:

| Concept | Required Meaning |
| --- | --- |
| Dead-letter queue | Review queue for failed automation runs that cannot safely continue |
| Failed run capture | Stores failed run, failed step, error category, source event, version, context, and retry history |
| Retry exhaustion | State reached when retry limit is exceeded or retry is unsafe |
| Admin review queue | Authorized admin view for dead-lettered runs |
| Sensitive failure notification | Owner/security notification for finance, payroll, client-facing, AI, file-sharing, or external failures |

Partial failure handling:

- Independent actions may complete while dependent actions stop.
- Dependent actions must not continue after prerequisite failure unless explicitly safe.
- Partial success must be visible in run logs.
- Sensitive partial failures must be audited.

Compensation actions:

- A compensation action is a safe corrective action that offsets or reconciles a completed side effect.
- Compensation must be explicitly defined per action type.
- Compensation must require permission and approval when sensitive.
- Compensation must be logged as a new action, not as deletion of history.

Rollback-safe actions:

- Draft creation.
- Internal notification suppression before delivery.
- Approval request cancellation before reviewer action.
- AI draft discard.
- Scheduled run cancellation before execution.

Non-rollbackable actions:

- External message already sent.
- Client notification already delivered.
- Financial record posted.
- Payment provider event processed.
- Wallet transaction posted.
- Payroll approval or paid state.
- File shared/downloaded externally.

Non-rollbackable action handling:

- Create correction, reversal, cancellation, refund request, wallet reversal, or follow-up notice where permitted.
- Preserve original event history.
- Require Owner/security review for sensitive failures.

User-facing error visibility:

- End users see only permission-safe error messages.
- Admins see operational details within their permissions.
- Sensitive errors are redacted unless recipient has required permission.

Acceptance criteria:

- Retry exhaustion creates a reviewable dead-letter record.
- Partial failures are explicit.
- Non-rollbackable actions have compensation policy.
- Sensitive failure details are redacted and audited.

### 38.9 Logs And Audit Enhancements

Step-level automation run schema:

| Field | Required Purpose |
| --- | --- |
| Run ID | Unique automation run identity |
| Automation rule ID | Parent automation rule |
| Version ID | Exact rule version executed |
| Trigger event ID | Source trigger event or derived scheduled event |
| Tenant ID | Tenant isolation and filtering |
| Execution context | User, system, or Owner-approved system |
| Effective actor | Actor whose permissions are applied |
| Permission snapshot | Permissions captured at run start for traceability |
| Trigger evaluation result | Trigger accepted, ignored, duplicate, blocked, failed |
| Condition evaluation result | Passed, failed, skipped, blocked, error |
| Action execution result | Succeeded, failed, skipped, waiting approval, compensated |
| Retry count | Number of retry attempts |
| Idempotency key | Duplicate prevention key |
| Replay key | Replay detection key |
| Error category | Permission, validation, provider, safety, timeout, conflict, stale, unknown |
| Sensitive data redaction flag | Whether logs are redacted |
| Final run status | Succeeded, partially succeeded, failed, blocked, dead-lettered, cancelled |

Sensitive log redaction rules:

- Payroll, employee costs, profitability, financial amounts, wallet balances, payment details, audit payloads, internal notes, and client confidential content must be redacted unless viewer has required permission.
- Client-facing log views must never include internal automation details.
- Admin logs must show enough detail for resolution without exposing unnecessary sensitive content.
- AI prompt and response logs must follow Phase 9 retention and redaction rules.
- External provider errors must not expose secrets, tokens, provider credentials, or hidden payloads.

Audit enhancements:

- Version activation and rollback.
- Execution context approval.
- Runtime permission failure.
- Auto-pause due to permission loss.
- Dead-letter creation and resolution.
- Compensation action.
- Sensitive log export.
- Emergency kill switch use.
- Abuse detection event.

Acceptance criteria:

- Every run includes version, context, permission, trigger, condition, action, retry, idempotency, replay, error, redaction, and final status metadata.
- Sensitive logs are permission-filtered and redacted.

### 38.10 Automation Analytics And Monitoring Metric Catalog

| Metric | Required Scope |
| --- | --- |
| Automation success rate | Tenant, automation, version, module, action type |
| Failure rate | Tenant, automation, version, module, error category |
| Retry rate | Automation, action, provider, module |
| Dead-letter count | Tenant, module, automation, severity |
| Time saved | Estimated by action type and module |
| Tasks created | Task/project/client/user scope |
| Subtasks created | Parent task/project scope |
| Notifications sent | Channel, recipient type, module |
| Client notifications sent | Client, portal, notification type |
| Approval requests created | Approval type, client/internal, module |
| AI automation usage | AI feature, model/provider class, tenant, user role |
| AI confidence distribution | Feature, language, source type, automation |
| Finance automation usage | Invoice/payment/wallet/report actions by tenant and permission scope |
| Payroll automation blocked count | Missing time, unapproved time, permission block, missing cost rate |
| Wallet action attempts | Credit/debit/refund/adjustment draft attempts and blocked attempts |
| Payment status updates | Draft, provider-confirmed, manual, failed, duplicate prevented |
| Loop prevention events | Automation, chain depth, source event |
| Abuse detection events | Tenant, user, automation, action type |
| Permission-denied automation runs | Role, module, target sensitivity |
| Auto-paused automations | Pause reason, module, actor, tenant |
| Average execution time | Automation, version, trigger, action type |

Monitoring rules:

- Critical failure spikes must notify authorized admins.
- Repeated finance/payroll failures must notify Owner/security.
- Abuse detection events must be reviewable.
- AI automation cost and confidence trends must be visible to authorized admins.
- Analytics views must be permission-filtered and tenant-scoped.

Acceptance criteria:

- Monitoring covers success, failure, retries, dead letters, productivity, AI, finance, payroll, loops, abuse, permission denial, auto-pause, and execution time.

### 38.11 Database Addendum

This is a non-SQL database addendum. It defines required data objects and fields only.

#### `automation_rule_versions`

| Area | Specification |
| --- | --- |
| Purpose | Store immutable version history for automation rules |
| Key fields | Tenant, automation rule, version number, status, author, base version, diff summary, safety class, approval status, approved by, activation timestamp, rollback metadata |
| Relationships | Belongs to automation rule; referenced by automation runs and approvals |
| Constraints | Unique version number per automation rule; active version must be unique per automation rule |
| Indexing needs | Tenant and automation rule; status; activation timestamp |
| Audit requirements | Create, approve, activate, rollback, archive, reject |

#### `automation_run_steps`

| Area | Specification |
| --- | --- |
| Purpose | Store step-level execution detail for each automation run |
| Key fields | Tenant, automation run, version, step ID, step type, step status, input metadata, output metadata, error category, redaction flag |
| Relationships | Belongs to automation run; references automation step/version |
| Constraints | Step order must be stable per run; sensitive payloads must be redacted |
| Indexing needs | Run and step order; tenant and status; error category |
| Audit requirements | Sensitive step results and blocked sensitive actions |

#### `automation_dead_letters`

| Area | Specification |
| --- | --- |
| Purpose | Store failed automation runs requiring admin review |
| Key fields | Tenant, automation run, version, failed step, error category, retry count, severity, review status, assigned reviewer, resolution |
| Relationships | References automation run, run step, automation version |
| Constraints | Dead-letter record required after retry exhaustion or unsafe retry block |
| Indexing needs | Tenant and status; severity; assigned reviewer; created timestamp |
| Audit requirements | Creation, assignment, resolution, reopening |

#### `automation_idempotency_keys`

| Area | Specification |
| --- | --- |
| Purpose | Prevent duplicate side effects from repeated events or retries |
| Key fields | Tenant, automation, version, action type, target resource, idempotency key, first seen timestamp, result reference |
| Relationships | References automation run/action result where available |
| Constraints | Unique active key by tenant, automation, version, action, and target scope |
| Indexing needs | Idempotency key; tenant and target resource; expiration timestamp |
| Audit requirements | Duplicate prevented for sensitive actions |

#### `automation_execution_contexts`

| Area | Specification |
| --- | --- |
| Purpose | Store approved execution context definitions |
| Key fields | Tenant, automation, version, context type, creator, effective actor, approved system actor, permission scope, client scope, financial scope, payroll scope, approval metadata |
| Relationships | Belongs to automation version; referenced by automation runs |
| Constraints | System context must have explicit scope; sensitive context requires approval |
| Indexing needs | Tenant and context type; effective actor; approval status |
| Audit requirements | Create, approve, update, revoke, auto-pause |

#### `automation_replay_keys`

| Area | Specification |
| --- | --- |
| Purpose | Detect replayed external/scheduled/recurring/manual events |
| Key fields | Tenant, trigger event, automation, replay key, source system, first seen timestamp, replay count, last seen timestamp |
| Relationships | References automation runs triggered by the event |
| Constraints | Replay key uniqueness per tenant and source scope |
| Indexing needs | Replay key; tenant and source system; first seen timestamp |
| Audit requirements | Sensitive replay prevention and repeated replay attempts |

#### `automation_compensation_records`

| Area | Specification |
| --- | --- |
| Purpose | Track corrective actions for partial or non-rollbackable failures |
| Key fields | Tenant, original run, original action, compensation type, compensation status, approver, reason, result |
| Relationships | References automation run, run step, target resource |
| Constraints | Compensation must preserve original action history |
| Indexing needs | Tenant and status; original run; compensation type |
| Audit requirements | Compensation requested, approved, executed, failed |

#### `automation_rate_limit_counters`

| Area | Specification |
| --- | --- |
| Purpose | Track tenant/user/rule/action usage for throttling and abuse prevention |
| Key fields | Tenant, user, automation, action type, feature, window start, window end, count, limit, exceeded flag |
| Relationships | References automation rule and user where applicable |
| Constraints | Counter scope must match configured rate-limit policy |
| Indexing needs | Tenant and window; user and feature; exceeded flag |
| Audit requirements | Sensitive rate-limit bypass attempts and abuse-related limits |

#### `automation_abuse_events`

| Area | Specification |
| --- | --- |
| Purpose | Store suspicious automation usage, loops, repeated denials, and abuse patterns |
| Key fields | Tenant, user, automation, event type, severity, source, detection reason, status, reviewed by |
| Relationships | References automation runs, users, and audit logs |
| Constraints | High-severity abuse events must be reviewable by authorized admins |
| Indexing needs | Tenant and severity; user; automation; status |
| Audit requirements | Creation, review, resolution, escalation |

Database addendum acceptance criteria:

- Required objects support versioning, step logs, dead letters, idempotency, execution context, replay protection, compensation, rate limits, and abuse detection.
- All objects are tenant-scoped.
- Sensitive data is redacted according to security rules.

### 38.12 Security Addendum

Mandatory security rules:

- User-context execution must use current user permissions at runtime.
- System-context execution must be explicitly scoped and approved.
- Runtime permission revalidation is required before every run and sensitive action.
- Permission snapshot invalidation must occur after role, permission, client scope, financial permission, payroll permission, or tenant status changes.
- Sensitive action allowlists must define exactly which actions can run under system context.
- Financial actions require Owner Only Financial Access or explicit finance automation grant.
- Payroll actions require Owner or explicit payroll automation grant and must enforce approved time rules.
- Client-facing output must be content-safe, client-scoped, and permission-filtered.
- AI-powered automation must follow Phase 9 hardening, prompt injection protection, redaction, retention, confidence, approval, and audit rules.
- Redacted admin logs must hide sensitive payloads while preserving enough diagnostics.
- Automation abuse detection must monitor repeated denied attempts, loops, notification flooding, AI abuse, financial probes, and manual-run abuse.
- Emergency automation disablement must be available to Owner/security admins.

Security acceptance criteria:

- Automations cannot broaden user permissions.
- Automations cannot use system context without approved scope.
- Runtime revalidation prevents stale permission execution.
- Sensitive actions are allowlisted, audited, and approval-gated.

### 38.13 Required New Workflows

#### Automation Versioning Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User edits automation |
| 2 | System creates draft version |
| 3 | User changes trigger, conditions, actions, or context |
| 4 | System generates diff summary |
| 5 | User tests draft version safely |
| 6 | Version is submitted for approval |
| 7 | Approved version becomes eligible for activation |

#### Automation Rollback Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Authorized user selects previous approved version |
| 2 | System validates tenant, rule, version, permissions, and safety |
| 3 | Approver confirms rollback reason |
| 4 | Current version is deactivated |
| 5 | Rollback version becomes active |
| 6 | Rollback is audited and notifications are sent where required |

#### Execution Context Validation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Automation run starts |
| 2 | Execution context is loaded |
| 3 | Runtime actor and effective actor are resolved |
| 4 | Scope and allowed actions are verified |
| 5 | Invalid context blocks run |
| 6 | Result is logged |

#### Runtime Permission Revalidation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Run or sensitive action begins |
| 2 | Current roles and permissions are loaded |
| 3 | Client/project/resource scope is rechecked |
| 4 | Finance/payroll/AI/file restrictions are rechecked |
| 5 | Permission mismatch blocks or pauses run |
| 6 | Revalidation result is logged |

#### Auto-Pause On Permission Loss Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Role, permission, client scope, financial grant, payroll grant, or target access changes |
| 2 | System identifies affected automations |
| 3 | Affected automations are revalidated |
| 4 | Invalid automations move to Paused or Failed |
| 5 | Owner/admin receives notification |
| 6 | Auto-pause event is audited |

#### Replay Protection Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Trigger event is received |
| 2 | Replay key is derived or read |
| 3 | Existing replay key is checked |
| 4 | Duplicate replay is blocked from side effects |
| 5 | New event proceeds to idempotency checks |
| 6 | Replay result is logged |

#### Idempotent Execution Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Action prepares side effect |
| 2 | Idempotency key is generated |
| 3 | Existing key is checked |
| 4 | Duplicate action returns prior result or is skipped |
| 5 | New action executes once |
| 6 | Idempotency result is stored |

#### Dead-Letter Handling Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Run fails and retry is unsafe or exhausted |
| 2 | Dead-letter record is created |
| 3 | Failed step, context, error, and sensitivity are captured |
| 4 | Authorized admin is notified |
| 5 | Admin reviews and resolves, retries safely, compensates, or archives |
| 6 | Resolution is audited |

#### Compensation Action Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Partial or non-rollbackable failure is detected |
| 2 | Compensation policy is identified |
| 3 | Sensitive compensation requires approval |
| 4 | Compensation action executes where permitted |
| 5 | Original history is preserved |
| 6 | Compensation result is audited |

#### Stale Data Invalidation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Source data changes after trigger or AI draft |
| 2 | Pending run/draft is marked stale |
| 3 | Conditions and permissions are re-evaluated |
| 4 | Action is regenerated, reapproved, or cancelled |
| 5 | Stale invalidation is logged |

#### Conflict Handling Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Concurrent automation targets same record |
| 2 | Conflict policy is loaded |
| 3 | System queues, skips, merges, blocks, or requires review |
| 4 | Sensitive conflicts default to block/review |
| 5 | Conflict outcome is logged |

#### Automation Abuse Detection Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Usage pattern exceeds safety threshold |
| 2 | Abuse event is created |
| 3 | System applies rate limit, pause, or block |
| 4 | Owner/security admin is notified for high severity |
| 5 | Admin reviews and resolves event |
| 6 | Resolution is audited |

### 38.14 Required New Diagrams

#### Automation Versioning Diagram

| Stage | Flow |
| --- | --- |
| Edit | Active version -> New draft version |
| Test | Draft version -> Safe test result |
| Approve | Draft version -> Pending Approval -> Approved |
| Activate | Approved version -> Active |
| Supersede | Previous active version -> Deprecated or Previous Active |
| Rollback | Approved prior version -> Active after rollback approval |

#### Execution Context Diagram

| Gate | Flow |
| --- | --- |
| Rule | Automation version selects execution context |
| Actor | Runtime actor and effective actor resolved |
| Scope | Tenant, client, project, module, financial, payroll, AI scope checked |
| Approval | System-context and sensitive context require approval |
| Execute | Action runs only within approved context |
| Log | Context and permission snapshot recorded |

#### Runtime Permission Revalidation Diagram

| Step | Flow |
| --- | --- |
| Start | Run or sensitive action begins |
| Load | Current roles, permissions, scopes, grants loaded |
| Compare | Current permissions compared with required permissions |
| Decide | Allow, block, require approval, or auto-pause |
| Record | Revalidation result stored in run step |

#### Dead-Letter And Retry Diagram

| Stage | Flow |
| --- | --- |
| Error | Step fails |
| Classify | Error category and sensitivity assigned |
| Retry | Safe idempotent retry attempted within limit |
| Exhaust | Retry exhausted or unsafe |
| Dead-letter | Run enters admin review queue |
| Resolve | Retry, compensate, archive, or cancel with audit |

#### Compensation And Rollback Diagram

| Stage | Flow |
| --- | --- |
| Detect | Partial or unsafe failure found |
| Classify | Rollback-safe or non-rollbackable action classified |
| Rollback | Safe rollback applied where possible |
| Compensate | Corrective action requested for non-rollbackable effect |
| Approve | Sensitive compensation approved |
| Audit | Original and compensation records preserved |

#### Replay And Idempotency Diagram

| Stage | Flow |
| --- | --- |
| Event | Trigger received |
| Replay | Replay key checked |
| Idempotency | Action idempotency key checked |
| Execute | New action executes once |
| Duplicate | Duplicate returns prior result or skips side effect |
| Log | Replay/idempotency result recorded |

#### Automation Abuse Prevention Diagram

| Stage | Flow |
| --- | --- |
| Monitor | Runs, manual starts, failed permissions, loops, notifications, AI calls tracked |
| Detect | Threshold or abnormal pattern detected |
| Respond | Rate limit, pause, block, or require review |
| Notify | Owner/security notified for high severity |
| Review | Admin reviews and resolves |
| Audit | Abuse event and resolution logged |

#### Sensitive Financial/Payroll Automation Safety Diagram

| Gate | Flow |
| --- | --- |
| Trigger | Finance/payroll event detected |
| Permission | Owner Only Financial Access or explicit payroll/finance grant checked |
| Payroll rules | No Start, No Time, Approved Time Only rules enforced |
| Approval | Critical financial/payroll action requires approval |
| Execute | Draft or approved action only |
| Audit | Financial/payroll audit log created |

### 38.15 Critical Fix Acceptance Criteria

The Phase 10 critical fix is complete when:

- Automation versioning is fully specified.
- Builder lifecycle states are explicit and auditable.
- Trigger catalog covers all requested trigger categories.
- Condition taxonomy covers security, scope, AI, finance, payroll, and workflow conditions.
- Action catalog covers task, project, CRM, collaboration, AI, finance, payroll, and client portal actions.
- Execution context model prevents permission expansion.
- Safety and abuse controls cover replay, idempotency, loops, recursion, rate limits, stale data, conflicts, manual override, and kill switch.
- Dead-letter and compensation model is defined.
- Step-level run log schema is defined.
- Sensitive log redaction rules are defined.
- Automation analytics metric catalog is complete.
- Non-SQL database addendum defines required objects and relationships.
- Security addendum defines runtime revalidation, system context, sensitive allowlists, and emergency disablement.
- Required new workflows are included.
- Required new diagrams are included.

**PHASE 10 CRITICAL FIX COMPLETE**
