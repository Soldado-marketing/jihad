# MAOS Phase 11 Executive Dashboards, Reports & Business Intelligence Specification

**Platform:** Marketing Agency Operating System (MAOS)  
**Document:** Phase 11 Executive Dashboards, Reports & Business Intelligence Specification  
**Version:** 1.0  
**Status:** Reporting, Dashboard, Analytics, and BI Specification  
**Document Type:** Product, security, analytics, reporting, and governance specification  
**Code Policy:** No code, no SQL, no implementation scripts, no database migrations  

---

## 1. Product Context

MAOS is a multi-tenant, invite-only SaaS operating system for distributed marketing agencies and their clients. Phase 11 defines the dashboards, reports, KPI library, analytics, forecasting, anomaly detection, risk indicators, scheduled reporting, export controls, and business intelligence layer for Owners, Managers, Employees, and Clients.

The BI layer must convert operational, financial, sales, project, collaboration, AI, and automation data into permission-safe insight without exposing hidden records, hidden counts, hidden totals, hidden team data, payroll data, financial data, or cross-client data.

---

## 2. Approved Reference Foundation

| Reference | Required BI Alignment |
| --- | --- |
| Phase 1 Enterprise Architecture | Tenant-scoped analytics, reporting service, analytics store, event-driven reports, dashboard aggregation only over authorized data |
| Phase 2 Enterprise Database | Reports use existing CRM, project, task, collaboration, finance, payroll, AI, automation, audit, activity, notification, language, currency, and timezone objects |
| Phase 3 Security & Permissions | RBAC, custom permissions, tenant isolation, client boundaries, export permissions, AI security, audit logs |
| Phase 4 CRM & Sales | CRM dashboards, sales pipeline, forecasting, proposals, quotations, revenue forecast |
| Phase 5 UI/UX Design System | Role-specific dashboards, Reports page, Finance Center, AI panel, no-permission states, client-safe UI |
| Phase 6 Project Management | Project health, task productivity, workload, dependencies, recurring work, templates, delivery risk |
| Phase 7 Collaboration | Chat, client chat, files, approvals, voice notes, revision tracking, collaboration reports |
| Phase 8 Finance & Payroll | Owner Only Financial Access, payroll restrictions, profitability, invoices, payments, wallets, audit logs |
| Phase 9 AI Ecosystem | AI reporting, AI analytics, source references, permission-safe AI, multilingual behavior, prompt/data safety |
| Phase 10 Automations | Scheduled reports, automation-triggered reports, automation logs, execution context, approval gates, export safety |

---

## 3. Critical Reporting And BI Rules

| Rule | Required Behavior |
| --- | --- |
| Permission-safe dashboards | Dashboards must only aggregate records the user can access |
| Tenant isolation | Reports and dashboards must never mix tenants |
| Client boundary | Clients can only see client-owned, client-visible, approved report data |
| Manager scope | Managers see only assigned teams, projects, clients, and allowed operational data |
| Employee scope | Employees see only their own work and assigned work data |
| Owner scope | Owners can access global business dashboards within tenant |
| Financial restriction | Financial reports are Owner-only unless explicitly granted |
| Payroll restriction | Payroll reports are Owner-only unless explicitly granted |
| AI report safety | AI-generated reports must follow Phase 9 AI security and hardening rules |
| Automation report safety | Scheduled and automation-triggered reports must follow Phase 10 execution context and approval rules |
| Hidden data protection | Reports must not expose hidden counts, hidden totals, hidden teams, hidden clients, or hidden financial values |
| Export control | Sensitive report exports require permission and audit logging |
| Client publishing | Client-facing reports require approval before publishing |
| Sensitive access logging | Every sensitive dashboard/report access must be logged |
| Freshness transparency | Reports must show data freshness, refresh status, and stale-data warnings where relevant |

---

## 4. BI Access Model

| User Type | Default Dashboard Scope | Financial Scope | Payroll Scope | Client-Safe Scope |
| --- | --- | --- | --- | --- |
| Owner | Global tenant business data | Full by default | Full by default | Can publish approved client-safe reports |
| Manager | Assigned teams, projects, clients, operational reports | None unless explicitly granted | None unless explicitly granted | Assigned client-safe reports if granted |
| Employee | Own work, assigned tasks/projects, personal productivity | None | None | No client publishing unless granted |
| Client | Own client-visible projects, approvals, files, invoices/payments where enabled, approved reports | Own approved billing records only | None | Client portal only |

Access model rules:

- Role hierarchy does not override explicit financial, payroll, audit, file, AI, or client visibility restrictions.
- Report query scope must be calculated before aggregation.
- Filters must not allow users to infer hidden data.
- Empty results must not reveal whether hidden records exist.
- Drill-down must use the same or stricter permissions than the summary tile.

---

## 5. Required Diagrams

### 5.1 BI System Overview Diagram

| Layer | Flow |
| --- | --- |
| Source layer | CRM, sales, projects, tasks, collaboration, files, approvals, finance, payroll, AI, automations |
| Governance layer | Tenant, role, permission, resource, client, finance, payroll, file, AI, automation checks |
| BI query layer | Permission-safe filters, freshness checks, KPI calculations, aggregation rules |
| Intelligence layer | Forecasting, anomaly detection, risk indicators, AI explanations |
| Presentation layer | Role dashboards, reports, custom builder, exports, scheduled reports |
| Observability layer | Report access logs, audit logs, export logs, scheduled report logs |

### 5.2 Dashboard Permission Enforcement Diagram

| Step | Flow |
| --- | --- |
| 1 | User opens dashboard |
| 2 | Tenant and active membership are resolved |
| 3 | Role, permissions, client scope, and assigned resources are resolved |
| 4 | Finance/payroll permissions are checked separately |
| 5 | Dashboard widgets load only allowed KPI queries |
| 6 | Restricted widgets show no-permission state without hidden values |
| 7 | Sensitive dashboard access is logged |

### 5.3 Report Generation Workflow Diagram

| Step | Flow |
| --- | --- |
| 1 | User selects report type |
| 2 | System validates permission and scope |
| 3 | User applies filters |
| 4 | Query layer applies permission-safe filters |
| 5 | Metrics and KPIs are calculated |
| 6 | Report displays freshness and source limits |
| 7 | Sensitive access/export is logged |

### 5.4 Client-Safe Reporting Diagram

| Step | Flow |
| --- | --- |
| 1 | Internal user prepares client report |
| 2 | Report is filtered to client-owned and client-visible data |
| 3 | Internal-only fields, payroll, costs, profitability, audit logs, and hidden records are removed |
| 4 | Client-safe preview is generated |
| 5 | Human approval is required before publishing |
| 6 | Client can view approved report in portal |
| 7 | Publication is audited |

### 5.5 Scheduled Reports Diagram

| Step | Flow |
| --- | --- |
| 1 | User schedules report |
| 2 | Phase 10 automation execution context is validated |
| 3 | Runtime permissions are revalidated before each run |
| 4 | Report is generated with current allowed scope |
| 5 | Sensitive exports/publishing require approval unless explicitly configured |
| 6 | Delivery and failures are logged |

### 5.6 Custom Report Builder Diagram

| Step | Flow |
| --- | --- |
| 1 | User selects dataset |
| 2 | System shows only permitted fields |
| 3 | User selects metrics, dimensions, filters, and chart/table view |
| 4 | System validates hidden-data and aggregation safety |
| 5 | Preview is generated |
| 6 | Save/export/schedule/publish follows permissions and audit rules |

### 5.7 KPI Calculation Diagram

| Step | Flow |
| --- | --- |
| 1 | KPI definition is selected |
| 2 | Source data is permission-filtered |
| 3 | Timezone and currency rules are applied |
| 4 | Formula is calculated |
| 5 | Freshness status is attached |
| 6 | KPI is displayed or blocked safely |

### 5.8 Forecasting Diagram

| Step | Flow |
| --- | --- |
| 1 | User requests forecast |
| 2 | Historical data scope is permission-filtered |
| 3 | Model/forecast policy is applied |
| 4 | Confidence and assumptions are shown |
| 5 | Forecast is labeled as prediction, not confirmed fact |
| 6 | Financial forecasts require financial permission |

### 5.9 Anomaly Detection Diagram

| Step | Flow |
| --- | --- |
| 1 | Metrics are monitored |
| 2 | Baseline is calculated from allowed data |
| 3 | Anomaly is detected |
| 4 | User permission is checked before display |
| 5 | Explanation and source references are shown where possible |
| 6 | Sensitive anomaly access is logged |

### 5.10 Report Export Approval Diagram

| Step | Flow |
| --- | --- |
| 1 | User requests export |
| 2 | Export permission is checked |
| 3 | Sensitivity is classified |
| 4 | Finance/payroll/client-facing exports require approval where required |
| 5 | Export artifact is generated with redaction |
| 6 | Export access and download are audited |

### 5.11 Financial Reporting Safety Diagram

| Step | Flow |
| --- | --- |
| 1 | Financial report is requested |
| 2 | Owner Only Financial Access or explicit grant is checked |
| 3 | Payroll scope is checked separately |
| 4 | Client users are limited to own approved billing records |
| 5 | Financial data is aggregated and redacted according to scope |
| 6 | Access/export is audited |

### 5.12 Report Audit Logging Diagram

| Step | Flow |
| --- | --- |
| 1 | Dashboard/report request starts |
| 2 | Sensitivity is classified |
| 3 | Access result is logged where sensitive |
| 4 | Export, schedule, publish, AI generation, and automation run are logged |
| 5 | Redaction status and data freshness are recorded |
| 6 | Logs are visible only to authorized auditors |

---

## 6. Required Dashboard Catalog

| Dashboard | Primary Users | Purpose | Sensitive Data Rules |
| --- | --- | --- | --- |
| Executive Overview Dashboard | Owner | Global business overview | Owner-only by default |
| Owner Business Dashboard | Owner | Revenue, profitability, pipeline, workload, risk | Includes finance/payroll only for Owner |
| Manager Operations Dashboard | Manager | Assigned operations, delivery, workload, approvals | Assigned scope only |
| Employee Personal Dashboard | Employee | Own tasks, calendar, productivity, mentions | Own/assigned work only |
| Client Portal Dashboard | Client | Client-visible projects, approvals, files, invoices, messages | Own client data only |
| CRM & Sales Dashboard | Owner, Manager | Pipeline, leads, opportunities, forecasting | CRM scope and finance grants where needed |
| Project Delivery Dashboard | Owner, Manager, Employee scoped | Project status, milestones, delivery risk | Client visibility respected |
| Task Productivity Dashboard | Owner, Manager, Employee scoped | Task completion, overdue tasks, blockers | Own/assigned/team scope |
| Team Workload Dashboard | Owner, Manager | Capacity, workload, utilization | Manager assigned team only |
| Finance Dashboard | Owner, finance grantee | Revenue, invoices, payments, wallets | Owner-only unless granted |
| Payroll Dashboard | Owner, payroll grantee | Approved time, payroll runs, payroll exceptions | Owner-only unless granted |
| Profitability Dashboard | Owner, finance grantee | Project/client/tenant margins | Owner-only unless granted |
| AI Usage Dashboard | Owner, AI admin | AI usage, quality, blocked requests, cost | Redacted sensitive prompts |
| Automation Health Dashboard | Owner, automation admin | Runs, failures, dead letters, abuse, loops | Sensitive run data redacted |
| Approval Center Dashboard | Owner, Manager, assigned users, Client scoped | Pending, overdue, approved/rejected approvals | Approval visibility respected |
| Client Health Dashboard | Owner, Manager scoped | Client risk, satisfaction, delivery, billing status where permitted | No internal finance/payroll to clients |

---

## 7. Module Specification: Dashboard Architecture

| Required Area | Specification |
| --- | --- |
| Purpose | Define role-specific, permission-safe dashboards over MAOS operational and business data |
| Users | Owner, Manager, Employee, Client |
| Data sources | All approved tenant-scoped modules subject to permission and visibility |
| Required permissions | Dashboard access plus underlying module permissions |
| Metrics | KPIs, trends, counts, totals, rates, cycle times, freshness indicators |
| KPIs | Role-specific KPI library values filtered by access scope |
| Filters | Date range, timezone, client, project, owner, team, status, currency, module |
| Views | KPI tiles, tables, charts, timelines, cards, drill-down drawers, no-permission states |
| Drill-down behavior | Drill-down rechecks permission and never reveals hidden records behind summary |
| Export rules | Dashboard exports require export permission and audit for sensitive data |
| Client visibility rules | Client dashboards show only client-owned, client-visible, approved data |
| AI usage rules | AI explanations follow Phase 9 and cite accessible sources only |
| Automation usage rules | Scheduled dashboard snapshots follow Phase 10 execution context |
| Notifications | Stale dashboard, risk threshold, anomaly, scheduled dashboard ready |
| Audit log requirements | Sensitive dashboard access, finance/payroll views, exports, AI explanations |
| Edge cases | Empty accessible scope, stale data, partial permission, hidden widgets |
| Acceptance criteria | Dashboards render only permission-safe data and never expose hidden counts or totals |

---

## 8. Module Specification: Executive Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Provide executive-level business status across revenue, delivery, sales, risk, workload, finance, AI, and automation |
| Users | Owner by default; explicit executive grantee where allowed |
| Data sources | CRM, projects, tasks, finance, payroll, profitability, approvals, AI, automations |
| Required permissions | Owner or explicit executive dashboard permission plus finance/payroll grants for sensitive widgets |
| Metrics | Revenue, margin, pipeline value, project health, workload, overdue approvals, AI usage, automation failures |
| KPIs | Gross revenue, gross margin, active projects, at-risk projects, pipeline value, overdue invoices, payroll cost |
| Filters | Period, currency, client, project, service, team, risk level |
| Views | Executive KPI row, trends, exception queues, risk heatmap, forecast panel |
| Drill-down behavior | Owner can drill into global data; grantees only into permitted modules |
| Export rules | Executive export requires sensitive export permission and audit |
| Client visibility rules | Not visible to clients |
| AI usage rules | AI executive summary must respect finance/payroll grants and cite sources |
| Automation usage rules | Scheduled executive digest requires Owner-approved automation context |
| Notifications | Executive digest ready, critical risk, revenue/profit anomaly, automation failure |
| Audit log requirements | Access and export logged due to sensitive business data |
| Edge cases | Missing financial grant, stale profitability, partial data refresh |
| Acceptance criteria | Executive dashboard is Owner-safe and blocks unauthorized finance/payroll widgets |

---

## 9. Module Specification: Owner Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Give Owner full tenant operating and financial command center |
| Users | Owner |
| Data sources | All tenant modules, including finance, payroll, audit summaries, AI, automation health |
| Required permissions | Owner role |
| Metrics | Revenue, costs, payroll, profit, pipeline, delivery, workload, approvals, client health |
| KPIs | MRR/recognized revenue where applicable, cash collected, payroll due, net margin, team utilization |
| Filters | Date, currency, client, team, project, department, status, risk |
| Views | Business overview, finance panel, operations panel, risk panel, system health panel |
| Drill-down behavior | Full tenant drill-down except platform-level restricted admin data |
| Export rules | Sensitive exports require Owner confirmation and audit |
| Client visibility rules | Owner may prepare client-safe exports but must approve before publishing |
| AI usage rules | AI can summarize global data, including finance/payroll, under Owner permission |
| Automation usage rules | Owner can schedule reports and approve sensitive report automations |
| Notifications | Critical business risks, finance/payroll deadlines, data freshness warnings |
| Audit log requirements | Sensitive finance/payroll/audit/export dashboard actions logged |
| Edge cases | Last Owner access, module disabled, data refresh failure |
| Acceptance criteria | Owner dashboard provides full tenant visibility with audited sensitive access |

---

## 10. Module Specification: Manager Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Show assigned operational performance for managers without exposing global sensitive data |
| Users | Manager |
| Data sources | Assigned projects, tasks, team workload, approvals, client health, CRM if granted |
| Required permissions | Manager role plus assigned scopes and module permissions |
| Metrics | Task throughput, overdue tasks, team workload, project health, approval bottlenecks |
| KPIs | Assigned project health, team utilization, overdue work, blocked tasks, approval cycle time |
| Filters | Assigned client, assigned project, team, assignee, priority, status, date |
| Views | Operations dashboard, workload view, project risk list, approval queue |
| Drill-down behavior | Drill-down limited to assigned records and granted modules |
| Export rules | Operational export requires module export permission; finance/payroll excluded unless granted |
| Client visibility rules | Manager can prepare client-safe reports for assigned clients if granted |
| AI usage rules | AI summaries use assigned scope only and exclude restricted financial/payroll data |
| Automation usage rules | Scheduled manager reports use assigned scope and runtime revalidation |
| Notifications | Team overload, overdue work, at-risk project, approval escalation |
| Audit log requirements | Exports, client-safe publishing, sensitive operational views |
| Edge cases | Manager removed from project, reassigned team, client hidden |
| Acceptance criteria | Manager dashboard never exposes unassigned teams, global finance, payroll, or hidden clients |

---

## 11. Module Specification: Employee Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Give employees a personal execution dashboard for assigned work |
| Users | Employee |
| Data sources | Own assigned tasks, subtasks, calendar items, mentions, files, approvals, time entries where permitted |
| Required permissions | Employee membership and resource access |
| Metrics | Assigned tasks, overdue tasks, personal completion, time tracked, pending approvals |
| KPIs | Tasks due today, overdue assigned work, personal completion rate, open blockers |
| Filters | Date, project, client if visible, task status, priority |
| Views | My work, calendar, mentions, approvals, personal productivity |
| Drill-down behavior | Own/assigned resource drill-down only |
| Export rules | Personal export only; no team/global financial data |
| Client visibility rules | Client-visible context shown only where employee has access |
| AI usage rules | AI can summarize own/assigned work only |
| Automation usage rules | Personal scheduled summaries require user-context automation |
| Notifications | Daily work summary, overdue assigned work, mention, approval requested |
| Audit log requirements | Exports and sensitive assigned-file/report access |
| Edge cases | Assignment removed, client visibility changed, project archived |
| Acceptance criteria | Employee dashboard excludes global team, finance, payroll, and hidden client data |

---

## 12. Module Specification: Client Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Provide client portal visibility into approved client-owned work and billing data |
| Users | Client |
| Data sources | Client-visible projects, tasks, approvals, files, chat, invoices/payments/wallet where enabled, published reports |
| Required permissions | Client portal membership and client scope |
| Metrics | Active projects, pending approvals, shared files, unread messages, own invoices/payments |
| KPIs | Project progress, pending approvals, open client actions, invoice due status |
| Filters | Project, approval status, file type, date, invoice status |
| Views | Client overview, project status, approvals, files, billing, published reports |
| Drill-down behavior | Drill-down only into own client-visible records |
| Export rules | Client exports limited to approved client-owned reports/files |
| Client visibility rules | Strict own-client data only |
| AI usage rules | Client AI follows Phase 9 client-facing rules and excludes internal data |
| Automation usage rules | Client scheduled reports require approved client-safe automation |
| Notifications | New report, approval needed, file shared, invoice due, payment confirmation |
| Audit log requirements | Client report access, exports, billing report access |
| Edge cases | Client user belongs to multiple client scopes, report unpublished, internal file linked |
| Acceptance criteria | Client dashboard never exposes other clients, internal agency data, payroll, costs, profitability, or audit logs |

---

## 13. Module Specification: CRM Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report lead, opportunity, contact, meeting, follow-up, proposal, quotation, and pipeline activity |
| Users | Owner, Sales Manager, assigned users |
| Data sources | Leads, opportunities, meetings, contacts, proposals/quotation files, tasks, activity logs |
| Required permissions | CRM read/report permission and assigned scope |
| Metrics | Lead volume, conversion rate, opportunity count, stage aging, follow-up completion |
| KPIs | Lead-to-opportunity rate, opportunity win rate, stale opportunities, meeting conversion |
| Filters | Date, owner, source, stage, client/prospect, currency, status |
| Views | Pipeline report, lead report, opportunity report, activity report |
| Drill-down behavior | Drill into permitted leads/opportunities only |
| Export rules | Export requires CRM export permission; client/prospect confidential fields redacted where needed |
| Client visibility rules | Not client-visible unless explicitly published as client-safe summary |
| AI usage rules | AI may summarize CRM trends within user scope only |
| Automation usage rules | Scheduled CRM reports follow Phase 10 permissions and scope |
| Notifications | Scheduled CRM report ready, stale pipeline risk, missing follow-up |
| Audit log requirements | Export and AI-generated CRM report access |
| Edge cases | Lead converted, duplicate lead, hidden opportunity owner |
| Acceptance criteria | CRM reports respect assigned sales scope and never leak hidden pipeline totals |

---

## 14. Module Specification: Sales Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report sales pipeline, forecasting, won/lost deals, revenue projections, proposals, and quotations |
| Users | Owner, Sales Manager, authorized sales users |
| Data sources | Opportunities, revenue records, proposals, quotations, contracts, meetings, invoices where permitted |
| Required permissions | Sales/CRM reports plus finance permission for revenue/invoice details |
| Metrics | Pipeline value, forecast revenue, stage probability, won/lost value, proposal acceptance |
| KPIs | Forecasted revenue, weighted pipeline, close rate, average deal size, sales cycle length |
| Filters | Period, owner, stage, probability, source, currency, client/prospect |
| Views | Forecast dashboard, sales activity, won/lost report, proposal/quotation report |
| Drill-down behavior | Drill into permitted opportunity and forecast components |
| Export rules | Export requires sales export; financial fields require finance grant |
| Client visibility rules | Not client-visible except approved client-facing proposal/quotation summaries |
| AI usage rules | AI forecasts must label assumptions and separate facts from predictions |
| Automation usage rules | Scheduled sales forecast follows runtime permission revalidation |
| Notifications | Forecast changed, large deal risk, proposal overdue |
| Audit log requirements | Forecast export, AI forecast generation, financial report access |
| Edge cases | Multi-currency pipeline, stale probability, lost opportunity with invoice |
| Acceptance criteria | Sales reports never expose invoice/revenue details without finance permission |

---

## 15. Module Specification: Project Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report project delivery, health, milestones, status, risk, scope, and client delivery progress |
| Users | Owner, Manager, assigned Employees, Clients for approved client-safe reports |
| Data sources | Projects, tasks, subtasks, dependencies, files, approvals, time entries, activity logs |
| Required permissions | Project report permission and resource access |
| Metrics | Project status, completion, overdue items, blockers, milestone progress, approval delays |
| KPIs | On-time delivery, at-risk projects, completion percent, blocked tasks, milestone adherence |
| Filters | Client, project, owner, status, date, risk, team |
| Views | Project list, health chart, milestone timeline, risk report, client-safe progress report |
| Drill-down behavior | Drill into accessible project/tasks/approvals only |
| Export rules | Internal export requires project export; client export requires client-safe approval |
| Client visibility rules | Clients see only client-visible project data |
| AI usage rules | AI may summarize project health using accessible records |
| Automation usage rules | Scheduled project reports follow Phase 10 client-safe rules |
| Notifications | Project report ready, at-risk project, overdue milestone |
| Audit log requirements | Client publishing and sensitive project export |
| Edge cases | Archived project, hidden internal tasks, mixed internal/client-visible milestones |
| Acceptance criteria | Project reports preserve internal/client visibility separation |

---

## 16. Module Specification: Task Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report task execution, status, priorities, overdue work, blockers, and throughput |
| Users | Owner, Manager, assigned Employees, Clients for client-visible tasks |
| Data sources | Tasks, subtasks, dependencies, time entries, activity logs, approvals |
| Required permissions | Task report permission and resource access |
| Metrics | Tasks by status, overdue tasks, completed tasks, blockers, reassignment count |
| KPIs | Completion rate, overdue rate, blocker rate, task cycle time |
| Filters | Assignee, project, client, status, priority, due date, tag |
| Views | Task table, status chart, overdue report, blocker report, assignee report |
| Drill-down behavior | Drill into accessible tasks only |
| Export rules | Export requires task export permission |
| Client visibility rules | Clients see only client-visible tasks tied to their client |
| AI usage rules | AI can summarize task trends within permitted scope |
| Automation usage rules | Scheduled task reports follow assigned scope and auto-pause rules |
| Notifications | Task report ready, overdue spike, blocker spike |
| Audit log requirements | Exports and client-facing task report publication |
| Edge cases | Deleted task, dependency cycle, hidden subtask |
| Acceptance criteria | Task reports do not reveal hidden tasks through counts or drill-downs |

---

## 17. Module Specification: Productivity Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Measure execution productivity for individuals, teams, and operations without exposing unauthorized data |
| Users | Owner, Manager assigned scope, Employee personal scope |
| Data sources | Tasks, subtasks, time entries, approvals, activity logs |
| Required permissions | Productivity report permission and resource/team scope |
| Metrics | Completed work, cycle time, focus time, overdue work, approval response |
| KPIs | Personal completion, team throughput, average cycle time, rework rate |
| Filters | User, team, project, period, task type, priority |
| Views | Personal productivity, team productivity, trend charts |
| Drill-down behavior | Employees drill into own records; managers drill into assigned team only |
| Export rules | Team exports require manager/owner report export permission |
| Client visibility rules | Not client-visible by default |
| AI usage rules | AI productivity insights cannot shame or expose hidden employee data |
| Automation usage rules | Scheduled productivity digests follow user/team scope |
| Notifications | Productivity report ready, workload imbalance, overdue trend |
| Audit log requirements | Team productivity exports and sensitive personnel insights |
| Edge cases | Part-time worker, archived employee, incomplete time data |
| Acceptance criteria | Productivity reports respect personal/team scope and avoid unauthorized team comparison |

---

## 18. Module Specification: Workload Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Show workload, capacity, utilization, overload risk, and assignment balance |
| Users | Owner, Manager, authorized project leads |
| Data sources | Tasks, projects, workload settings, employee profiles, time entries, calendars where available |
| Required permissions | Workload read permission and team/resource scope |
| Metrics | Assigned workload, capacity, utilization, overdue load, future load |
| KPIs | Utilization percent, overloaded users, unassigned tasks, workload imbalance |
| Filters | Team, user, project, client, period, skill, priority |
| Views | Workload heatmap, capacity table, timeline, overload list |
| Drill-down behavior | Drill into assigned users/tasks only |
| Export rules | Export requires workload export permission |
| Client visibility rules | Not client-visible |
| AI usage rules | AI may suggest workload risks but cannot assign without approval |
| Automation usage rules | Scheduled workload alerts follow Phase 10 assignment and permission rules |
| Notifications | Overload risk, unassigned critical task, capacity warning |
| Audit log requirements | Workload exports and AI-assisted assignment reports |
| Edge cases | User unavailable, missing capacity, hidden project load |
| Acceptance criteria | Workload reports do not expose hidden project/team assignments |

---

## 19. Module Specification: Team Performance Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report operational performance for teams with safe access boundaries |
| Users | Owner, Manager assigned teams |
| Data sources | Tasks, projects, approvals, time entries, workload, activity logs |
| Required permissions | Team performance report permission and team scope |
| Metrics | Throughput, quality signals, approval delays, overdue work, delivery reliability |
| KPIs | Team completion rate, on-time rate, approval response, rework rate, overload rate |
| Filters | Team, user, period, project, task type, client |
| Views | Team dashboard, trend charts, team comparison where permitted |
| Drill-down behavior | Managers drill into assigned team only |
| Export rules | Export requires team report export permission |
| Client visibility rules | Not client-visible |
| AI usage rules | AI must avoid unsupported performance judgments and cite data |
| Automation usage rules | Scheduled team reports require manager scope revalidation |
| Notifications | Performance report ready, delivery risk, workload imbalance |
| Audit log requirements | Team report export and sensitive performance access |
| Edge cases | Team membership changed, hidden employee data, incomplete time tracking |
| Acceptance criteria | Team performance reports do not expose unauthorized employee or team data |

---

## 20. Module Specification: Client Performance Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report client delivery, engagement, approvals, billing status where permitted, and client health |
| Users | Owner, Manager assigned clients, Client for approved client-safe version |
| Data sources | Clients, projects, tasks, approvals, files, chat, invoices/payments where permitted |
| Required permissions | Client report permission and client scope; finance grant for billing internals |
| Metrics | Project progress, approval response, client communication, overdue client actions, billing status |
| KPIs | Client health score, approval turnaround, project completion, client blockers |
| Filters | Client, project, period, status, approval type, billing status where permitted |
| Views | Internal client health, client-safe progress, client action report |
| Drill-down behavior | Internal users by assigned scope; clients own client-visible records only |
| Export rules | Client report export/publish requires client-safe approval |
| Client visibility rules | Client sees approved client-owned data only |
| AI usage rules | AI client summaries follow Phase 9 client-facing rules |
| Automation usage rules | Scheduled client reports follow Phase 10 client-safe publishing |
| Notifications | Client health risk, report ready, client report published |
| Audit log requirements | Client report publishing and billing visibility access |
| Edge cases | Client archived, mixed internal/client data, hidden billing fields |
| Acceptance criteria | Client performance reports never expose internal profitability, payroll, costs, audit logs, or other clients |

---

## 21. Module Specification: Finance Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report revenue, costs, invoices, payments, wallets, cash collection, financial health |
| Users | Owner, explicit finance grantee |
| Data sources | Revenue records, invoices, payments, wallets, profitability records, employee costs where permitted |
| Required permissions | Owner or explicit finance report permission |
| Metrics | Revenue, recognized revenue, collected payments, outstanding balance, costs, cash status |
| KPIs | Total revenue, received revenue, overdue invoices, collection time, cost-to-revenue ratio |
| Filters | Period, currency, client, project, invoice status, payment status |
| Views | Finance dashboard, revenue report, collections report, cash overview |
| Drill-down behavior | Owner/full finance grantee only; client-specific billing drill-down if permitted |
| Export rules | Export requires financial export permission and audit |
| Client visibility rules | Clients never see internal finance reports; only own approved billing reports |
| AI usage rules | AI financial summaries follow Phase 9 and Phase 8 restrictions |
| Automation usage rules | Scheduled finance reports require Owner-approved automation context |
| Notifications | Finance report ready, overdue threshold, collection anomaly |
| Audit log requirements | All access/export/scheduled finance reports logged |
| Edge cases | Multi-currency, stale revenue, missing payment allocation |
| Acceptance criteria | Finance reports enforce Owner Only Financial Access by default |

---

## 22. Module Specification: Payroll Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report approved time, payroll runs, payroll costs, payroll exceptions, and payroll readiness |
| Users | Owner, explicit payroll grantee |
| Data sources | Timesheets, time entries, employee profiles, employee costs, payroll runs, payroll items |
| Required permissions | Owner or explicit payroll report permission |
| Metrics | Approved payable hours, payroll cost, pending payroll, missing rates, rejected time |
| KPIs | Payroll total, approved hours, payroll approval cycle time, blocked payroll items |
| Filters | Period, employee, project, client where permitted, payroll status |
| Views | Payroll dashboard, payroll run report, timesheet readiness, exception report |
| Drill-down behavior | Payroll drill-down only for Owner/payroll grantee |
| Export rules | Payroll exports require payroll export permission and audit |
| Client visibility rules | Never client-visible |
| AI usage rules | AI payroll summaries require Owner or payroll grant |
| Automation usage rules | Scheduled payroll reports follow Phase 10 payroll safety and revalidation |
| Notifications | Payroll report ready, payroll exception, missing approved time |
| Audit log requirements | Every payroll report access/export logged |
| Edge cases | No approved time, running timers, rejected timesheets, missing cost rate |
| Acceptance criteria | Payroll reports enforce No Start = No Time, No Time = No Payroll, Approved Time Only Payroll visibility |

---

## 23. Module Specification: Profitability Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report tenant, client, project, and service profitability where modeled and permitted |
| Users | Owner, explicit profitability grantee |
| Data sources | Revenue records, costs, payroll items, employee costs, invoices, payments, profitability records |
| Required permissions | Owner or explicit profitability report permission |
| Metrics | Revenue, cost, gross profit, margin, cost ratio, low-margin flags |
| KPIs | Gross profit, gross margin, profit per client, profit per project, unprofitable projects |
| Filters | Period, currency, client, project, service, profitability status |
| Views | Profitability dashboard, margin report, low-margin exceptions, trend report |
| Drill-down behavior | Drill-down restricted to profitability permission and source record access |
| Export rules | Export requires profitability/finance export permission and audit |
| Client visibility rules | Clients cannot see internal margin/profitability |
| AI usage rules | AI profitability explanation requires permission and source references |
| Automation usage rules | Scheduled profitability reports require Owner-approved finance automation |
| Notifications | Low margin, stale profitability, report ready |
| Audit log requirements | Access/export/recalculation reports logged |
| Edge cases | Zero revenue, missing cost, stale payroll, multi-currency |
| Acceptance criteria | Profitability reports never expose internal margins to clients or unauthorized users |

---

## 24. Module Specification: Invoice Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report invoice aging, invoice status, due dates, paid/unpaid totals, and client billing status |
| Users | Owner, finance grantee, Client for own approved invoices |
| Data sources | Invoices, invoice line items, clients, projects, contracts, payment allocations |
| Required permissions | Invoice report permission; finance permission for global internal reports |
| Metrics | Total invoiced, amount paid, amount due, overdue count, invoice aging |
| KPIs | Outstanding amount, overdue amount, average collection time, paid invoice rate |
| Filters | Client, status, due date, currency, project, period |
| Views | Aging report, invoice table, status summary, client invoice view |
| Drill-down behavior | Internal users by permission; clients only own invoices |
| Export rules | Export requires invoice export permission; client export own invoices only |
| Client visibility rules | Own approved/sent invoices only |
| AI usage rules | AI can explain invoice only within user/client visibility |
| Automation usage rules | Scheduled invoice reports follow finance/client-safe automation rules |
| Notifications | Invoice report ready, overdue invoice threshold, invoice aging alert |
| Audit log requirements | Global invoice report access/export and client invoice export |
| Edge cases | Partially paid invoice, voided invoice, multi-currency invoice |
| Acceptance criteria | Invoice reports never reveal other clients or internal finance beyond permission |

---

## 25. Module Specification: Payment Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report payment activity, partial payments, failed payments, refunds, allocations, and collection status |
| Users | Owner, finance grantee, Client for own approved payments |
| Data sources | Payments, payment allocations, invoices, wallets, clients |
| Required permissions | Payment report permission and finance/client scope |
| Metrics | Payments received, failed payments, partial payments, refunds, allocations |
| KPIs | Collection rate, payment success rate, partial payment balance, failed payment count |
| Filters | Client, payment status, method, invoice, wallet, period, currency |
| Views | Payment report, allocation report, failed payments, partial payments |
| Drill-down behavior | Finance users by scope; clients own payments only |
| Export rules | Export requires payment export permission and audit |
| Client visibility rules | Clients see own payments only |
| AI usage rules | AI payment explanations follow financial permissions |
| Automation usage rules | Scheduled payment reports follow Phase 10 idempotency and finance safety |
| Notifications | Payment report ready, payment anomaly, failed payment spike |
| Audit log requirements | Payment report access/export logged where sensitive |
| Edge cases | Duplicate provider event, wrong allocation, refund pending |
| Acceptance criteria | Payment reports do not expose cross-client payments or hidden payment totals |

---

## 26. Module Specification: Wallet Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report wallet balances, credits, debits, adjustments, refunds, and wallet transaction history |
| Users | Owner, finance grantee, Client for own wallet where enabled |
| Data sources | Wallets, wallet transactions, payments, invoices, payment allocations |
| Required permissions | Wallet report permission and finance/client scope |
| Metrics | Wallet balance, credits, debits, adjustments, refunds, utilization |
| KPIs | Total wallet balance, unapplied credit, wallet utilization, adjustment count |
| Filters | Client, wallet type, currency, transaction type, period |
| Views | Wallet balances, wallet ledger, adjustments, client wallet view |
| Drill-down behavior | Finance users by scope; clients own wallet only if enabled |
| Export rules | Export requires wallet export permission and audit |
| Client visibility rules | Clients see own wallet balance/transactions only where enabled |
| AI usage rules | AI wallet explanation must respect client/finance scope |
| Automation usage rules | Scheduled wallet reports follow Phase 10 finance safety |
| Notifications | Wallet report ready, low balance, large adjustment |
| Audit log requirements | Wallet access/export and client wallet report activity |
| Edge cases | Closed wallet with balance, currency mismatch, reversal transaction |
| Acceptance criteria | Wallet reports never expose global wallet data to clients or unauthorized users |

---

## 27. Module Specification: AI Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report AI usage, quality, cost, blocked requests, approvals, hallucination reports, and multilingual performance |
| Users | Owner, AI admin, security auditor where granted |
| Data sources | AI logs, audit logs, approval decisions, usage metrics, feedback |
| Required permissions | AI admin/report permission and audit permission for sensitive records |
| Metrics | Requests, failures, blocked requests, cost estimate, language usage, source citation coverage |
| KPIs | AI usage, blocked financial requests, response usefulness, hallucination reports, latency |
| Filters | Feature, role, language, user, period, sensitivity, status |
| Views | AI usage dashboard, quality report, safety report, multilingual report |
| Drill-down behavior | Sensitive prompts/responses redacted unless permitted |
| Export rules | Export requires AI report export and redaction/audit |
| Client visibility rules | Not client-visible |
| AI usage rules | AI may summarize AI reports but cannot reveal hidden prompts or sensitive data |
| Automation usage rules | Scheduled AI reports follow Phase 10 AI automation safety |
| Notifications | AI quality degradation, blocked request spike, cost spike |
| Audit log requirements | AI report access/export and sensitive log views |
| Edge cases | Redacted prompt, provider failure, deleted user |
| Acceptance criteria | AI reports preserve Phase 9 retention, redaction, and permission rules |

---

## 28. Module Specification: Automation Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report automation health, runs, failures, dead letters, loops, abuse, and automation impact |
| Users | Owner, automation admin, security auditor where granted |
| Data sources | Automations, automation versions, run steps, dead letters, audit logs, abuse events |
| Required permissions | Automation analytics/report permission |
| Metrics | Run count, success/failure, retries, dead letters, auto-paused automations, loops prevented |
| KPIs | Automation success rate, failure rate, dead-letter count, time saved, abuse events |
| Filters | Automation, version, module, action type, status, severity, period |
| Views | Automation health dashboard, failure report, abuse report, version report |
| Drill-down behavior | Sensitive run details redacted by permission |
| Export rules | Export requires automation report export and audit |
| Client visibility rules | Not client-visible |
| AI usage rules | AI automation insights follow Phase 9 and Phase 10 log redaction |
| Automation usage rules | Scheduled automation health reports use Owner-approved context |
| Notifications | Failure spike, dead-letter spike, abuse event, auto-pause event |
| Audit log requirements | Automation report export and sensitive run detail access |
| Edge cases | Deleted automation version, redacted run, emergency kill switch event |
| Acceptance criteria | Automation reports expose failures to authorized admins without leaking sensitive payloads |

---

## 29. Module Specification: Approval Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report approval requests, decisions, overdue approvals, revision cycles, and approval bottlenecks |
| Users | Owner, Manager, assigned approvers/requesters, Client for own approvals |
| Data sources | Approvals, approval approvers, files, tasks, invoices where permitted, activity logs |
| Required permissions | Approval report permission and target resource access |
| Metrics | Pending approvals, overdue approvals, decisions, average approval time, revision count |
| KPIs | Approval cycle time, overdue approval rate, revision rounds, pending client approvals |
| Filters | Approver, requester, client, project, status, due date, approval type |
| Views | Approval center dashboard, overdue report, decision report, revision report |
| Drill-down behavior | Drill into approvals user can access |
| Export rules | Export requires approval export permission |
| Client visibility rules | Clients see own client-visible approvals only |
| AI usage rules | AI can summarize approval bottlenecks within access scope |
| Automation usage rules | Scheduled approval reports follow Phase 10 approval automation rules |
| Notifications | Approval report ready, overdue approval spike |
| Audit log requirements | Client-facing approval report publication and export |
| Edge cases | Approver removed, file hidden, invoice approval requiring finance permission |
| Acceptance criteria | Approval reports respect target visibility and approver/requester scope |

---

## 30. Module Specification: File Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report file storage, versions, shares, locks, downloads, quarantine, and approval-linked files |
| Users | Owner, Manager, assigned users, Client for own shared files |
| Data sources | Files, file versions, file shares, approvals, activity logs, audit logs |
| Required permissions | File report permission and file/resource access |
| Metrics | File count, storage usage, versions, locked files, client-shared files, quarantined files |
| KPIs | Storage usage, version count, shared files, sensitive downloads, quarantined files |
| Filters | Client, project, file type, visibility, status, owner, date |
| Views | File inventory, storage report, sharing report, version report, quarantine report |
| Drill-down behavior | Drill into accessible file metadata and versions only |
| Export rules | Export requires file export permission; sensitive downloads audited |
| Client visibility rules | Clients see own shared/client-visible files only |
| AI usage rules | AI file summaries require file access and Phase 9 file rules |
| Automation usage rules | Scheduled file reports follow Phase 10 file automation safety |
| Notifications | Storage threshold, quarantine, sharing report ready |
| Audit log requirements | Sensitive file report exports and restricted file access |
| Edge cases | Quarantined file, locked file, hidden version, revoked share |
| Acceptance criteria | File reports do not expose restricted file names, versions, or shares to unauthorized users |

---

## 31. Module Specification: Voice Note Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Report voice note usage, transcription status, task extraction, meeting summaries, failures, and consent-sensitive processing |
| Users | Owner, Manager scoped, Employee own/assigned, Client where enabled |
| Data sources | Voice notes, files, transcripts, tasks, meetings, AI logs |
| Required permissions | Voice note report permission and source access |
| Metrics | Voice notes recorded, uploaded, transcribed, failed, converted to tasks |
| KPIs | Transcription success rate, task conversion rate, average transcription time, low-confidence rate |
| Filters | User, client, project, meeting, language, transcription status, date |
| Views | Voice usage report, transcription report, voice-to-task report |
| Drill-down behavior | Drill into accessible voice notes/transcripts only |
| Export rules | Export requires voice/file export permission and consent-aware redaction |
| Client visibility rules | Clients see only own client-visible voice notes/transcripts where enabled |
| AI usage rules | AI summaries follow Phase 9 and consent/visibility rules |
| Automation usage rules | Scheduled voice reports follow Phase 10 voice automation safety |
| Notifications | Transcription failure spike, low confidence, report ready |
| Audit log requirements | Client-visible voice report export and sensitive transcript access |
| Edge cases | Missing consent, deleted audio, transcript hidden, multilingual audio |
| Acceptance criteria | Voice reports preserve transcript visibility and consent restrictions |

---

## 32. Module Specification: Custom Report Builder

| Required Area | Specification |
| --- | --- |
| Purpose | Let authorized users build custom reports from permitted datasets and fields |
| Users | Owner, Manager/analyst with report builder permission |
| Data sources | Permission-filtered datasets across MAOS modules |
| Required permissions | Custom report builder permission plus source data permissions |
| Metrics | User-selected measures, dimensions, calculated fields, grouped values |
| KPIs | User-selected KPIs from KPI library |
| Filters | Dataset-specific fields, date range, currency, client/project/team scope |
| Views | Table, chart, KPI cards, pivot-like summaries, saved views |
| Drill-down behavior | Drill-down constrained to selected and accessible dataset |
| Export rules | Export requires report export permission and sensitivity approval |
| Client visibility rules | Client-safe report mode must exclude internal fields and require approval |
| AI usage rules | AI can suggest report layout and summaries using accessible fields only |
| Automation usage rules | Scheduled custom reports use Phase 10 execution context |
| Notifications | Custom report saved, scheduled, failed, approved for publishing |
| Audit log requirements | Sensitive field selection, export, schedule, client publishing |
| Edge cases | Field permission revoked, dataset schema changed, hidden aggregate |
| Acceptance criteria | Builder shows only permitted datasets/fields and prevents hidden-data inference |

---

## 33. Module Specification: Scheduled Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Generate and deliver reports on configured schedules with runtime permission revalidation |
| Users | Owner, authorized report scheduler |
| Data sources | Saved reports, report definitions, automation rules, notification deliveries |
| Required permissions | Schedule report permission, report access, export/delivery permission |
| Metrics | Scheduled runs, delivery success, failures, runtime permission blocks |
| KPIs | Scheduled report success rate, missed reports, failed deliveries |
| Filters | Schedule, report type, recipient, status, period |
| Views | Scheduled report list, run history, delivery history |
| Drill-down behavior | Drill into scheduled report runs by permission |
| Export rules | Scheduled export requires export permission and sensitive approval where needed |
| Client visibility rules | Client delivery requires approved client-safe report |
| AI usage rules | AI-generated scheduled reports follow Phase 9 safety |
| Automation usage rules | Must follow Phase 10 versioning, execution context, revalidation, idempotency |
| Notifications | Report generated, delivery failed, permission revoked, schedule paused |
| Audit log requirements | Schedule creation, run, delivery, export, client publish |
| Edge cases | Scheduler loses permission, recipient removed, report becomes sensitive |
| Acceptance criteria | Scheduled reports revalidate permissions before every run and auto-pause on invalid scope |

---

## 34. Module Specification: Exportable Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Govern report exports, downloads, formats, redaction, approval, and auditability |
| Users | Owner, authorized exporters, Clients for own approved reports |
| Data sources | Generated report result, files/export artifacts, audit logs |
| Required permissions | Report export permission and source data permission |
| Metrics | Export count, sensitive export count, failed export, download count |
| KPIs | Export approval time, blocked export attempts, export volume |
| Filters | Report type, sensitivity, user, period, export status |
| Views | Export request, approval state, download history |
| Drill-down behavior | Export details permission-filtered and redacted |
| Export rules | Sensitive exports require approval and audit; payroll/finance exports require explicit grants |
| Client visibility rules | Clients export only approved client-owned reports |
| AI usage rules | AI-generated exports require same export controls and source references |
| Automation usage rules | Automated exports require Phase 10 approved execution context |
| Notifications | Export ready, export denied, approval needed, download expired |
| Audit log requirements | Export request, approval, generation, download, failure |
| Edge cases | Export includes hidden field, permission revoked after request, expired download |
| Acceptance criteria | Exportable reports are redacted, permission-checked, approval-gated, and audited |

---

## 35. Module Specification: Client-Safe Reports

| Required Area | Specification |
| --- | --- |
| Purpose | Define reports that can be safely published to clients without internal leakage |
| Users | Owner, Manager assigned client, Client |
| Data sources | Client-visible projects, tasks, approvals, files, invoices/payments where enabled, approved summaries |
| Required permissions | Client report publish permission and client scope |
| Metrics | Client project progress, approvals, shared files, open actions, own billing status |
| KPIs | Client action count, project progress, pending approvals, invoice due status |
| Filters | Client, project, period, approval status, report type |
| Views | Client report preview, published report, approval screen, portal report |
| Drill-down behavior | Client drill-down only into client-owned visible records |
| Export rules | Client report export limited to approved client-safe artifact |
| Client visibility rules | Strict own client data only; no internal finance, payroll, costs, profitability, audit logs |
| AI usage rules | AI client report summaries follow Phase 9 client-facing rules |
| Automation usage rules | Scheduled client reports require Phase 10 client-safe automation and approval policy |
| Notifications | Client report awaiting approval, report published, client viewed report |
| Audit log requirements | Preview, approval, publication, client access, export |
| Edge cases | Internal field accidentally selected, cross-client file, unpublished report |
| Acceptance criteria | Client-safe reports cannot expose internal agency or other-client data |

---

## 36. Module Specification: KPI Library

| Required Area | Specification |
| --- | --- |
| Purpose | Define standard KPI formulas, permissions, freshness rules, dimensions, and display behavior |
| Users | Owner, Manager, Employee, Client where KPI is client-safe |
| Data sources | KPI definitions and source modules |
| Required permissions | KPI read plus source data permission |
| Metrics | KPI value, numerator, denominator, period, trend, freshness |
| KPIs | Revenue, pipeline, profitability, payroll, tasks, projects, workload, approvals, AI, automation |
| Filters | Period, currency, client, project, team, status, owner |
| Views | KPI card, trend, comparison, drill-down, tooltip definition |
| Drill-down behavior | Only into permitted source records |
| Export rules | KPI export inherits source sensitivity |
| Client visibility rules | Client KPIs use client-safe definitions only |
| AI usage rules | AI can explain KPI formula and sources if permitted |
| Automation usage rules | KPI alerts use Phase 10 conditions and thresholds |
| Notifications | KPI threshold breached, stale KPI, KPI report ready |
| Audit log requirements | Sensitive KPI access/export and formula changes |
| Edge cases | Division by zero, missing data, multi-currency, stale source |
| Acceptance criteria | KPI values are formula-governed, permission-filtered, and freshness-labeled |

---

## 37. Module Specification: BI Analytics

| Required Area | Specification |
| --- | --- |
| Purpose | Provide analytical models, trends, segmentation, comparisons, and insight generation |
| Users | Owner, authorized Manager, analyst, Client for approved analytics |
| Data sources | Aggregated permission-safe datasets across MAOS |
| Required permissions | BI analytics permission plus source permissions |
| Metrics | Trends, comparisons, correlations, segments, distributions, cohorts |
| KPIs | Role-specific and module-specific KPI library values |
| Filters | Dataset, period, dimension, segment, currency, timezone |
| Views | Analytics workbench, chart explorer, insight panel, source table |
| Drill-down behavior | Permission-safe drill-down and aggregate suppression for small/hidden groups |
| Export rules | Export requires BI export permission and sensitivity approval |
| Client visibility rules | Client analytics only over own approved data |
| AI usage rules | AI analytics follows Phase 9 and must label suggestions |
| Automation usage rules | Scheduled analytics follow Phase 10 execution context |
| Notifications | Insight ready, anomaly/risk detected, stale data |
| Audit log requirements | Sensitive analytics access/export and AI-generated analysis |
| Edge cases | Small sample, hidden segment, stale source, conflicting metrics |
| Acceptance criteria | BI analytics never allows inference of hidden records through aggregation |

---

## 38. Module Specification: Forecasting

| Required Area | Specification |
| --- | --- |
| Purpose | Forecast sales, revenue, delivery risk, workload, collections, profitability, and operational demand |
| Users | Owner, authorized Manager, finance grantee for financial forecasts |
| Data sources | Historical CRM, sales, project, task, finance, payment, workload, automation data |
| Required permissions | Forecast permission plus source data permissions |
| Metrics | Forecast value, confidence, range, assumptions, historical baseline |
| KPIs | Forecasted revenue, projected workload, projected overdue invoices, delivery risk forecast |
| Filters | Period, client, project, team, currency, forecast type |
| Views | Forecast chart, confidence bands, assumptions, source drivers |
| Drill-down behavior | Drill into permitted source drivers only |
| Export rules | Forecast export inherits source sensitivity |
| Client visibility rules | Clients see only approved client-safe forecasts if enabled |
| AI usage rules | AI forecast explanations must separate prediction from confirmed data |
| Automation usage rules | Scheduled forecasts follow Phase 10 and revalidate permissions |
| Notifications | Forecast ready, forecast changed, confidence low |
| Audit log requirements | Sensitive/financial forecast access and export |
| Edge cases | Insufficient history, seasonality, missing data, outlier distortion |
| Acceptance criteria | Forecasts show assumptions, confidence, freshness, and permission-filtered sources |

---

## 39. Module Specification: Anomaly Detection

| Required Area | Specification |
| --- | --- |
| Purpose | Detect unusual patterns in operations, finance, payroll, AI, automations, workload, approvals, and client activity |
| Users | Owner, authorized Manager, security/admin roles, Client only for approved client-safe anomalies |
| Data sources | Metrics, logs, reports, finance, payroll, AI, automation, projects, tasks, approvals |
| Required permissions | Anomaly report permission plus source data permissions |
| Metrics | Baseline, deviation, severity, anomaly type, confidence, source references |
| KPIs | Anomaly count, high-severity anomalies, false positive rate, resolved anomalies |
| Filters | Module, severity, client/project/team, period, status |
| Views | Anomaly feed, severity dashboard, module anomaly report |
| Drill-down behavior | Drill into permitted anomaly sources only |
| Export rules | Export requires sensitivity approval where needed |
| Client visibility rules | Clients see only own approved client-safe anomalies |
| AI usage rules | AI anomaly explanation follows Phase 9 and cannot invent causes |
| Automation usage rules | Automation-triggered anomaly alerts follow Phase 10 safety |
| Notifications | High-severity anomaly, repeated anomaly, anomaly resolved |
| Audit log requirements | Sensitive anomaly access, finance/payroll anomaly view/export |
| Edge cases | Seasonal spikes, low data volume, hidden source driver |
| Acceptance criteria | Anomaly detection does not reveal hidden records, counts, or source values |

---

## 40. Module Specification: Risk Indicators

| Required Area | Specification |
| --- | --- |
| Purpose | Define risk signals across clients, projects, delivery, finance, payroll, workload, approvals, AI, and automations |
| Users | Owner, Manager scoped, Client for approved client-safe risks |
| Data sources | Projects, tasks, approvals, workload, finance, payroll, AI logs, automation logs, client activity |
| Required permissions | Risk indicator permission plus source data permissions |
| Metrics | Risk score, risk reason, severity, trend, source references, recommended action |
| KPIs | At-risk projects, at-risk clients, overdue approvals, workload risk, collection risk |
| Filters | Risk type, severity, client, project, team, period, owner |
| Views | Risk dashboard, risk list, heatmap, source drill-down |
| Drill-down behavior | Drill into allowed sources only; hidden drivers omitted safely |
| Export rules | Export requires risk report export permission and redaction |
| Client visibility rules | Clients see only approved client-safe delivery risks |
| AI usage rules | AI can recommend actions but must label as suggestion and require approval for critical actions |
| Automation usage rules | Risk alerts use Phase 10 automation safety and rate limits |
| Notifications | High risk, risk increased, risk resolved |
| Audit log requirements | Sensitive risk access/export, financial/payroll risk access |
| Edge cases | Conflicting signals, stale data, hidden source driver |
| Acceptance criteria | Risk indicators are explainable, source-linked, permission-safe, and never final business decisions |

---

## 41. Module Specification: Report Permissions

| Required Area | Specification |
| --- | --- |
| Purpose | Govern access, generation, viewing, drill-down, scheduling, exporting, publishing, and deleting reports |
| Users | Owner, Manager, Employee, Client |
| Data sources | Roles, permissions, memberships, report definitions, source resources |
| Required permissions | Report read/create/update/export/schedule/publish plus source data permissions |
| Metrics | Permission grants, denied attempts, exports, sensitive views |
| KPIs | Permission-denied report runs, sensitive export count, users with report access |
| Filters | Role, user, module, sensitivity, report type |
| Views | Permission matrix, access report, denied access report |
| Drill-down behavior | Only authorized users can inspect report access details |
| Export rules | Permission reports require Owner/security permission |
| Client visibility rules | Clients cannot see internal permission reports |
| AI usage rules | AI cannot bypass report permissions or summarize denied records |
| Automation usage rules | Scheduled reports revalidate permissions at runtime |
| Notifications | Report permission granted/revoked, schedule paused due to permission loss |
| Audit log requirements | Permission grant/revoke, denied access, sensitive export |
| Edge cases | Permission revoked mid-generation, role changed, client scope changed |
| Acceptance criteria | Report permissions are checked before query, drill-down, export, schedule, and publish |

---

## 42. Module Specification: Report Audit Logs

| Required Area | Specification |
| --- | --- |
| Purpose | Track sensitive dashboard/report access, generation, export, scheduling, publishing, AI generation, and automation delivery |
| Users | Owner, authorized auditor/security admin |
| Data sources | Audit logs, activity logs, report access events, export/download records |
| Required permissions | Audit read or report audit permission |
| Metrics | Sensitive access, exports, downloads, publishes, denied attempts |
| KPIs | Sensitive report views, export count, blocked attempts, audit completeness |
| Filters | User, report type, sensitivity, event type, client, period |
| Views | Report audit trail, export audit, client publication audit |
| Drill-down behavior | Auditor drill-down only within audit permission scope |
| Export rules | Audit export requires audit export permission and redaction |
| Client visibility rules | Clients cannot see internal report audit logs |
| AI usage rules | AI audit summaries require audit permission and redaction |
| Automation usage rules | Scheduled report audit events generated by Phase 10 automation logs |
| Notifications | Suspicious report access, export spike, failed scheduled report |
| Audit log requirements | This module defines report audit requirements |
| Edge cases | Log redaction, deleted user, client report viewed externally |
| Acceptance criteria | Every sensitive report access/export/publish/schedule event is auditable |

---

## 43. Module Specification: Report Notifications

| Required Area | Specification |
| --- | --- |
| Purpose | Notify users about report readiness, failures, approvals, anomalies, risks, freshness, and scheduled deliveries |
| Users | Owner, Manager, Employee, Client where permitted |
| Data sources | Reports, notifications, scheduled reports, anomalies, risks, automation runs |
| Required permissions | Recipient must have access to the report/source |
| Metrics | Notifications sent, failed, read, suppressed, approval pending |
| KPIs | Report delivery success, read rate, suppressed unsafe notifications |
| Filters | Report type, recipient, channel, status, sensitivity |
| Views | Notification history, delivery state, approval queue |
| Drill-down behavior | Notification opens only permitted report |
| Export rules | Notification export follows report access and audit rules |
| Client visibility rules | Client notifications must contain client-safe content only |
| AI usage rules | AI-generated notification text follows Phase 9 safety |
| Automation usage rules | Scheduled/delivery notifications follow Phase 10 notification automation rules |
| Notifications | Report ready, export ready, approval needed, schedule failed, anomaly detected |
| Audit log requirements | Sensitive/client/finance/payroll report notifications logged |
| Edge cases | Recipient loses permission, unsafe subject line, delivery failure |
| Acceptance criteria | Report notifications never reveal unauthorized report content or hidden metrics |

---

## 44. Module Specification: Report Data Freshness Rules

| Required Area | Specification |
| --- | --- |
| Purpose | Define freshness, refresh timing, stale warnings, snapshot behavior, and source update handling |
| Users | All report users |
| Data sources | Source records, analytics aggregates, report snapshots, automation runs |
| Required permissions | Same as report; freshness metadata may be visible only when report is visible |
| Metrics | Last refresh, next refresh, stale age, source update count, refresh status |
| KPIs | Freshness SLA, stale report count, refresh failure rate |
| Filters | Report type, source, freshness status, period |
| Views | Freshness badge, stale warning, refresh history |
| Drill-down behavior | Refresh details restricted to allowed report/source scope |
| Export rules | Export must include freshness timestamp and stale warning where applicable |
| Client visibility rules | Client reports show freshness without revealing hidden source updates |
| AI usage rules | AI report summaries must mention stale or partial data limitations |
| Automation usage rules | Scheduled reports refresh according to Phase 10 schedule and failure handling |
| Notifications | Report stale, refresh failed, source changed after report generation |
| Audit log requirements | Refresh failures for sensitive reports and stale export events |
| Edge cases | Source updated during generation, partial refresh, disabled module |
| Acceptance criteria | Reports clearly show freshness and never present stale forecasts or KPIs as confirmed current data |

---

## 45. Required Workflow Specifications

### 45.1 Dashboard Access Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User opens dashboard |
| 2 | Tenant, role, permissions, client scope, assigned resources are resolved |
| 3 | Widgets are filtered by allowed data |
| 4 | Restricted widgets display no-permission state without hidden counts |
| 5 | Sensitive dashboard access is logged |

### 45.2 Report Generation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User selects report |
| 2 | Report permission and source permissions are checked |
| 3 | Query scope is built |
| 4 | Metrics and KPIs calculate from allowed data |
| 5 | Report displays freshness and limitations |
| 6 | Sensitive report access is logged |

### 45.3 Permission-Safe Report Query Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Query request starts |
| 2 | Source datasets are permission-filtered |
| 3 | Hidden records are excluded before aggregation |
| 4 | Small/hidden groups are suppressed where needed |
| 5 | Results return without hidden-count leakage |

### 45.4 Client-Safe Report Publishing Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Internal user prepares client report |
| 2 | Client-safe filter removes internal data |
| 3 | Client-safe preview is reviewed |
| 4 | Human approval is captured |
| 5 | Report is published to client portal |
| 6 | Publication is audited |

### 45.5 Report Export Approval Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User requests export |
| 2 | Export permission is checked |
| 3 | Sensitivity is classified |
| 4 | Approval is requested if sensitive |
| 5 | Export is generated with redaction |
| 6 | Export/download is audited |

### 45.6 Scheduled Report Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User creates schedule |
| 2 | Report and export/delivery permissions are checked |
| 3 | Phase 10 execution context is saved |
| 4 | Runtime permissions are revalidated before each run |
| 5 | Report is generated and delivered where permitted |
| 6 | Failures are logged and visible to authorized admins |

### 45.7 Custom Report Builder Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User opens builder |
| 2 | System shows permitted datasets and fields |
| 3 | User selects dimensions, metrics, filters, and view |
| 4 | Preview query applies permission-safe aggregation |
| 5 | User saves, exports, schedules, or publishes according to permissions |

### 45.8 KPI Calculation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | KPI definition is selected |
| 2 | Source data is permission-filtered |
| 3 | Currency/timezone/freshness rules apply |
| 4 | KPI formula calculates |
| 5 | Drill-down links are permission-filtered |

### 45.9 Forecasting Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User requests forecast |
| 2 | Historical data is permission-filtered |
| 3 | Forecast is calculated |
| 4 | Assumptions and confidence are shown |
| 5 | Forecast is labeled as prediction |
| 6 | Sensitive forecast access is logged |

### 45.10 Anomaly Detection Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Metric baseline is calculated from allowed data |
| 2 | Current metric is compared to baseline |
| 3 | Anomaly is classified |
| 4 | Permission is checked before display |
| 5 | User sees explanation and allowed sources |
| 6 | Sensitive anomaly access is logged |

### 45.11 Risk Indicator Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Risk signals are collected from allowed data |
| 2 | Risk score and severity are calculated |
| 3 | Hidden drivers are excluded |
| 4 | Risk is shown with sources and suggested action |
| 5 | Critical action requires approval |

### 45.12 AI-Generated Report Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User requests AI report |
| 2 | AI and source permissions are checked |
| 3 | Phase 9 redaction and prompt safety apply |
| 4 | AI drafts report with source references |
| 5 | Export/publish requires permission and approval if sensitive |
| 6 | AI log and audit log are created where required |

### 45.13 Automation-Triggered Report Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Automation trigger occurs |
| 2 | Phase 10 execution context and version are validated |
| 3 | Runtime permissions are revalidated |
| 4 | Report is generated from allowed data |
| 5 | Delivery/export/publish follows approval rules |
| 6 | Automation run and report audit logs are created |

### 45.14 Report Audit Logging Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Report/dashboard event occurs |
| 2 | Sensitivity is classified |
| 3 | Access/export/publish/schedule/AI/automation event is logged |
| 4 | Redaction and freshness metadata are stored |
| 5 | Logs are visible only to authorized auditors |

---

## 46. KPI Library Catalog

| KPI Category | KPI Examples | Sensitive Rules |
| --- | --- | --- |
| Executive | Revenue, margin, pipeline, at-risk projects, overdue invoices | Owner-only where finance/profit/payroll involved |
| CRM/Sales | Leads, conversion rate, weighted pipeline, win rate, forecast | Sales scope; financial fields require finance grants |
| Project | On-time delivery, completion, blockers, milestone progress | Project/client visibility respected |
| Task | Completion rate, overdue rate, cycle time, blocked tasks | Own/assigned/team scope |
| Productivity | Throughput, cycle time, rework, focus indicators | Employee/team privacy respected |
| Workload | Utilization, overload, capacity, unassigned work | Team scope respected |
| Client | Client health, approvals, open actions, project progress | Own client only for clients |
| Finance | Revenue, collected cash, outstanding, overdue, costs | Owner-only unless granted |
| Payroll | Approved hours, payroll cost, payroll readiness | Owner-only unless granted |
| Profitability | Gross profit, margin, low-margin projects | Owner-only unless granted |
| AI | Usage, blocked requests, latency, hallucination reports | AI admin/security scope |
| Automation | Success rate, failures, dead letters, loops prevented | Automation admin scope |
| Approval | Pending, overdue, cycle time, revisions | Approval visibility respected |
| Files | Storage, versions, shared files, quarantined files | File visibility respected |
| Voice | Transcription success, task conversion, low confidence | Voice/transcript visibility respected |

---

## 47. BI Security And Anti-Leakage Rules

Mandatory rules:

- Aggregation must occur after permission filtering.
- Hidden records must not contribute to visible counts, totals, averages, rates, forecasts, risks, or anomalies.
- Hidden group labels must not be displayed.
- Report filters must not reveal hidden users, clients, projects, teams, invoices, payroll runs, or financial categories.
- Drill-down must never have broader access than the summary.
- Exported reports must include only the same data visible in the report view.
- Client reports must pass client-safe publishing review.
- AI report explanations must cite accessible sources only.
- Scheduled reports must revalidate permissions on every run.

---

## 48. Phase 11 Acceptance Criteria

Phase 11 is accepted when:

- All 38 required modules are specified.
- All 16 required dashboards are defined.
- All 14 required workflows are included.
- All 12 required diagrams are included.
- Reports and dashboards enforce tenant isolation.
- Clients see only client-safe and client-owned data.
- Managers see only assigned and allowed operational data.
- Employees see only own and assigned work data.
- Owner has global tenant dashboards.
- Financial and payroll reports are Owner-only unless explicitly granted.
- AI-generated reports follow Phase 9.
- Scheduled reports follow Phase 10.
- Sensitive dashboard/report access is logged.
- Sensitive exports require permission and audit logging.
- Client-facing reports require approval before publishing.
- Hidden counts, hidden totals, hidden team data, payroll data, financial data, and cross-client data are not exposed.
- No code, SQL, implementation scripts, or migrations are included.

---

## 49. Implementation Checklist

This is a specification checklist only.

Before implementation handoff, confirm:

- Final report permission keys.
- Final dashboard permission keys.
- KPI formula governance.
- BI aggregate suppression thresholds.
- Client-safe report approval policy.
- Sensitive export approval policy.
- Scheduled report execution context policy.
- AI-generated report source citation policy.
- Financial/payroll report grant policy.
- Report retention and export artifact retention.
- Audit log retention for sensitive report access.
- Data freshness SLAs by report type.

---

## 50. Final Phase 11 Statement

This Phase 11 Executive Dashboards, Reports & Business Intelligence Specification defines MAOS dashboards, reports, analytics, KPI library, forecasting, anomaly detection, risk indicators, client-safe reporting, scheduled reports, exports, report permissions, audit logs, notifications, and data freshness rules.

All reporting and BI implementation must preserve tenant isolation, RBAC, custom permissions, client boundaries, file security, AI hardening, automation execution safety, Owner Only Financial Access, payroll restrictions, export approval, client-safe publishing, hidden-data protection, freshness transparency, and full auditability.

---

## 51. Phase 11 Critical Fix Addendum

**Purpose:** This addendum closes the critical Phase 11 audit gaps without rewriting or removing existing sections. It is part of the Phase 11 specification and is mandatory for implementation.

**Scope:** Specialized dashboards, saved custom reports, hardened KPI definitions, BI analytics safety, permission matrices, client-safe reporting, export security, financial/payroll reporting safety, AI and automation reporting alignment, audit event schema, data governance, database addendum, security addendum, workflows, and diagrams.

**Non-Code Rule:** This addendum is specification only. It contains no code, no SQL, no implementation scripts, and no database migrations.

---

### 51.1 Specialized Dashboard Specifications

#### 51.1.1 Finance Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Provide Owner and explicitly authorized finance users with controlled visibility into revenue, collections, invoices, payments, wallets, costs, and cash health |
| Users | Owner; explicit finance grantee |
| Required permissions | `dashboard.finance.view`, source finance permissions, export permission for exports, explicit grant for non-Owner users |
| Data sources | Revenue records, invoices, payments, wallets, payment allocations, approved financial documents, audit logs |
| Widgets | Revenue summary, outstanding invoices, overdue invoices, payment collections, wallet balances, cost summary where permitted, currency exposure, finance alerts |
| KPIs | Total revenue, collected cash, outstanding balance, overdue amount, collection rate, cost-to-revenue ratio, wallet balance |
| Filters | Period, currency, client, project, invoice status, payment status, wallet type |
| Drill-down behavior | Drill-down revalidates finance permission and source object access before showing records |
| Export rules | Export requires finance export permission, sensitivity classification, audit log, and Owner approval when global finance is included |
| Client visibility rules | Not client-visible; clients only see their own approved invoices, payments, wallet records, and approved financial documents in client views |
| Financial/payroll safety rules | Payroll and employee cost widgets are hidden unless payroll or employee cost grants exist |
| Refresh cadence | Near-real-time for payment events; scheduled refresh for recognized revenue and cost summaries |
| Data freshness warnings | Show stale warning when payment, invoice, wallet, or revenue sync is delayed |
| Audit log requirements | Log view, drill-down, export, AI summary, scheduled snapshot, denied access |
| Edge cases | Multi-currency totals, partially paid invoices, reversed payments, stale payment provider sync, revoked finance grant |
| Acceptance criteria | Finance dashboard exposes no global finance, cost, payroll, or profitability data to unauthorized users |

#### 51.1.2 Payroll Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Provide controlled visibility into approved time, payroll readiness, payroll runs, payroll exceptions, and payroll costs |
| Users | Owner; explicit payroll grantee |
| Required permissions | `dashboard.payroll.view`, payroll report permission, timesheet permission, explicit payroll grant |
| Data sources | Approved time entries, timesheets, payroll runs, payroll items, employee costs, payroll adjustments, payroll audit logs |
| Widgets | Payroll readiness, approved hours, blocked payroll items, missing time, unapproved time, payroll exception queue, payroll run summary |
| KPIs | Approved payable hours, payroll total, blocked payroll count, payroll approval cycle time, missing time count |
| Filters | Pay period, employee, team, project, client where permitted, payroll status, exception type |
| Drill-down behavior | Drill-down requires payroll permission and employee payroll visibility; no client drill-down |
| Export rules | Payroll export requires explicit payroll export permission and audit; scheduled payroll export requires Owner-approved context |
| Client visibility rules | Never client-visible |
| Financial/payroll safety rules | Enforce No Start = No Time, No Time = No Payroll, Approved Time Only Payroll |
| Refresh cadence | Refresh after time approval, payroll adjustment, payroll run creation, and payroll status changes |
| Data freshness warnings | Warn when time approvals, running timers, or payroll calculations are stale |
| Audit log requirements | Log all payroll dashboard views, drill-downs, exports, AI summaries, schedule deliveries, denied attempts |
| Edge cases | No approved time, rejected timesheet, employee missing cost rate, payroll grant revoked mid-session |
| Acceptance criteria | Payroll dashboard is Owner-only by default and never exposes payroll or employee costs to clients, managers, or employees without explicit grant |

#### 51.1.3 Profitability Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Show tenant, client, project, and service profitability with strict margin confidentiality |
| Users | Owner; explicit profitability grantee |
| Required permissions | `dashboard.profitability.view`, profitability report permission, finance permission, payroll/employee cost permission where included |
| Data sources | Revenue, costs, employee costs, payroll items, invoices, payments, profitability records, project records |
| Widgets | Gross margin, project profitability, client profitability, service profitability, low-margin alerts, cost breakdown where permitted |
| KPIs | Gross profit, gross margin, profit per project, profit per client, low-margin project count, cost ratio |
| Filters | Period, currency, client, project, service, profitability status, team where permitted |
| Drill-down behavior | Drill-down requires profitability permission and source finance/payroll access |
| Export rules | Export requires profitability export permission, sensitivity approval, watermark, and audit |
| Client visibility rules | Clients never see internal margins, employee costs, payroll, or profitability unless a separate explicitly approved client-safe financial summary is created without internal cost detail |
| Financial/payroll safety rules | Aggregated cost/profit/payroll values must be suppressed unless user has explicit grants |
| Refresh cadence | Scheduled refresh after revenue, cost, payroll, payment, and project status changes |
| Data freshness warnings | Warn when revenue recognition, cost allocation, payroll, or currency rates are stale |
| Audit log requirements | Log view, drill-down, export, AI explanation, recalculation trigger, denied access |
| Edge cases | Zero revenue, missing cost, stale payroll, partial payments, currency mismatch |
| Acceptance criteria | Profitability dashboard never leaks internal cost, payroll, or margin data through widgets, aggregates, exports, AI summaries, or scheduled reports |

#### 51.1.4 AI Usage Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Monitor AI usage, cost, quality, safety, language behavior, blocked requests, and permission enforcement |
| Users | Owner, AI admin, security auditor where granted |
| Required permissions | `dashboard.ai_usage.view`, AI report permission, audit permission for sensitive logs |
| Data sources | AI logs, AI audit logs, AI approvals, usage counters, feedback, incident records |
| Widgets | Usage by feature, cost estimate, blocked requests, redaction events, hallucination reports, language quality, provider failures |
| KPIs | AI requests, blocked financial requests, citation coverage, latency, quality score, hallucination report rate, cost by tenant |
| Filters | Period, feature, role, user, language, sensitivity, model/provider, status |
| Drill-down behavior | Sensitive prompt/response details are redacted unless the user has explicit AI audit permission |
| Export rules | Export requires AI report export permission, redaction, and audit |
| Client visibility rules | Not client-visible |
| Financial/payroll safety rules | AI finance/payroll request metrics may be shown as counts to AI admins only if no protected content is exposed |
| Refresh cadence | Near-real-time for usage and blocked requests; scheduled for quality review metrics |
| Data freshness warnings | Warn when provider logs, cost estimates, or quality reviews are delayed |
| Audit log requirements | Log sensitive AI dashboard access, prompt detail views, exports, denied attempts |
| Edge cases | Redacted prompt, deleted user, provider outage, retained anonymized log |
| Acceptance criteria | AI Usage Dashboard supports operational oversight without exposing hidden prompts, client data, financial data, payroll data, or restricted source content |

#### 51.1.5 Automation Health Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Monitor automation execution health, failures, dead letters, auto-pauses, abuse events, loop prevention, and business impact |
| Users | Owner, automation admin, security auditor where granted |
| Required permissions | `dashboard.automation_health.view`, automation report permission, sensitive run permission for payload details |
| Data sources | Automation rules, versions, run steps, dead letters, idempotency records, abuse events, audit logs |
| Widgets | Run success rate, failure rate, dead-letter queue, auto-paused automations, loop prevention events, permission-denied runs, sensitive failures |
| KPIs | Success rate, failure rate, retry rate, dead-letter count, loop prevention events, abuse detection events, average execution time |
| Filters | Period, automation, version, module, status, severity, execution context |
| Drill-down behavior | Sensitive run payloads are redacted unless explicit permission exists |
| Export rules | Export requires automation report export permission and redaction audit |
| Client visibility rules | Not client-visible |
| Financial/payroll safety rules | Finance/payroll automation details are redacted unless user has matching finance/payroll grants |
| Refresh cadence | Near-real-time for failures and dead letters; scheduled for analytics |
| Data freshness warnings | Warn when automation run ingestion is delayed |
| Audit log requirements | Log dashboard access, sensitive run drill-down, export, dead-letter review |
| Edge cases | Deleted automation version, emergency kill switch, revoked actor permission, redacted failure |
| Acceptance criteria | Automation Health Dashboard exposes operational failures to authorized admins without leaking sensitive payloads or unauthorized financial/payroll data |

#### 51.1.6 Approval Center Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Provide visibility into approval queues, pending decisions, overdue approvals, revision loops, and approval bottlenecks |
| Users | Owner, Manager, assigned approvers/requesters, Client for own client-visible approvals |
| Required permissions | Approval dashboard permission plus target resource access |
| Data sources | Approvals, approval decisions, files, tasks, invoices where permitted, revision records, activity logs |
| Widgets | Pending approvals, overdue approvals, approval aging, revision rounds, client approval queue, finance approval queue where permitted |
| KPIs | Pending approvals, overdue rate, average approval time, revision count, approval SLA breach count |
| Filters | Approval type, approver, requester, client, project, status, due date |
| Drill-down behavior | Drill-down requires access to the approval and underlying object |
| Export rules | Export requires approval export permission; finance/invoice approvals require finance grant |
| Client visibility rules | Clients see only their own client-visible approval requests and approved decision history |
| Financial/payroll safety rules | Invoice, payment, or financial approval details are hidden without finance grant |
| Refresh cadence | Near-real-time after approval creation, decision, comment, revision, or expiration |
| Data freshness warnings | Warn when approval index is stale or linked file/report is unavailable |
| Audit log requirements | Log dashboard view, decision drill-down, client publication, export, denied access |
| Edge cases | Approver removed, linked file hidden, invoice approval restricted, report revoked |
| Acceptance criteria | Approval Center Dashboard never exposes approvals whose target resource is inaccessible |

#### 51.1.7 Client Health Dashboard

| Required Area | Specification |
| --- | --- |
| Purpose | Track client delivery health, engagement, approval behavior, communication risk, billing state where permitted, and retention risk |
| Users | Owner, Manager assigned clients, Client only for approved client-safe version if enabled |
| Required permissions | Client health dashboard permission and client scope; finance grant for billing internals |
| Data sources | Clients, projects, tasks, approvals, files, chat, voice notes, invoices/payments where permitted, satisfaction signals |
| Widgets | Client health score, project progress, approval delays, communication gaps, open client actions, billing status where permitted, risk indicators |
| KPIs | Client health score, approval turnaround, overdue client actions, active project progress, billing risk where permitted |
| Filters | Client, project, period, health status, risk type, manager |
| Drill-down behavior | Internal drill-down by assigned client scope; client drill-down only into own approved client-visible records |
| Export rules | Client-safe export requires approval; internal export requires client report export permission |
| Client visibility rules | Client-facing version excludes internal notes, internal chat, employee costs, payroll, profitability, margins, audit logs, and other clients |
| Financial/payroll safety rules | Billing status shown to managers only where granted; no cost, margin, payroll, or employee cost leakage |
| Refresh cadence | Scheduled refresh with near-real-time updates for approvals/messages where enabled |
| Data freshness warnings | Warn when project, approval, or billing data is stale or partially unavailable |
| Audit log requirements | Log access, client-safe preview, publication, export, client view, revocation |
| Edge cases | Client has multiple workspaces, archived client, mixed internal/client-visible data, revoked report |
| Acceptance criteria | Client Health Dashboard supports internal risk monitoring and client-safe reporting without exposing internal agency data |

---

### 51.2 Saved Custom Reports Specification

Saved Custom Reports are distinct from the Custom Report Builder. The builder is the creation interface; the saved custom report is a governed report object that can be viewed, versioned, exported, scheduled, approved, archived, or revoked.

| Required Area | Specification |
| --- | --- |
| Saved report definition | Stores report name, description, dataset selection, metrics, dimensions, filters, columns, widgets, chart/table configuration, sensitivity level, and data source scope |
| Report owner | User who owns the report definition; ownership transfer requires Owner or report admin permission |
| Report visibility | Private, team-scoped, role-scoped, client-safe draft, published client-safe, or Owner-only |
| Report filters | Saved filters must be permission-safe and revalidated at runtime |
| Report columns | Only permitted fields may be stored; sensitive fields require explicit report definition permission |
| Report widgets | KPI cards, tables, charts, trend panels, filters, and drill-down links with sensitivity metadata |
| Report schedule settings | Schedule frequency, timezone, recipients, delivery channel, execution context, approval requirements |
| Export settings | Allowed formats, watermark requirement, redaction policy, expiration, retention, approval status |
| Client-safe status | Not client-safe, client-safe draft, pending approval, approved, published, revoked, archived |
| Approval status | Draft, pending approval, approved, rejected, expired approval, revoked approval |
| Version | Version number, author, change summary, previous version link, activation date, rollback status |
| Data source scope | Tenant, role, user, team, project, client, finance, payroll, profitability, AI, automation, file, approval scope |
| Last run status | Never run, success, partial success, failed, permission denied, stale data, delivery failed |
| Retention policy | Defines report definition retention, snapshot retention, export retention, audit retention, and deletion eligibility |
| Archive status | Active, paused, archived, deprecated, deleted pending retention, permanently deleted according to policy |
| Acceptance criteria | Saved reports can never store or later reveal fields, filters, widgets, or aggregates beyond the viewer's permissions |

Saved report constraints:

- Saved report execution must re-check source permissions at every view, export, schedule run, AI summary, and publication.
- Saved filters cannot preserve access to fields after permission revocation.
- Client-safe reports require approval before publication.
- Archived reports cannot run schedules or generate new exports.
- Report versions must preserve audit history and support rollback where allowed.

---

### 51.3 KPI Library Hardening

Formal KPI definitions must use governed formulas, source references, permissions, thresholds, warning levels, critical levels, drill-down rules, edge-case handling, and acceptance criteria.

| KPI Category | KPI Name | Formula | Numerator | Denominator | Data Source | Owner | Refresh Cadence | Thresholds | Warning Level | Critical Level | Visibility Rules | Drill-down Rules | Edge Cases | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CRM KPIs | Lead conversion rate | Converted leads divided by eligible leads | Converted leads | Eligible leads | Leads, opportunities | Sales owner | Hourly or on CRM event | Tenant-defined | Below target | Severe drop or stale follow-up | Owner and scoped sales users | Permitted leads only | Duplicate leads, hidden owners | No hidden pipeline totals leak |
| Sales KPIs | Weighted pipeline value | Sum opportunity value multiplied by stage probability | Weighted opportunity values | Not applicable | Opportunities, stages | Sales owner | Hourly or opportunity event | Forecast target | Below forecast | Major forecast variance | Sales scope; finance grant for revenue details | Permitted opportunities only | Multi-currency, stale probability | Forecast shows assumptions and currency |
| Project KPIs | On-time delivery rate | On-time milestones divided by completed milestones | On-time milestones | Completed milestones | Projects, milestones, tasks | Operations owner | Daily or project event | SLA target | Below SLA | Repeated SLA breach | Project scope; client-safe if approved | Permitted projects only | Archived projects, hidden milestones | Client reports exclude internal milestones |
| Task KPIs | Task completion rate | Completed tasks divided by eligible tasks | Completed tasks | Eligible tasks | Tasks, subtasks | Operations owner | Near-real-time | Team target | Below target | Severe throughput drop | Own/assigned/team scope | Permitted tasks only | Deleted tasks, hidden subtasks | No hidden task count leakage |
| Productivity KPIs | Average cycle time | Total cycle time divided by completed work items | Total cycle time | Completed work items | Tasks, activity logs | Operations owner | Daily | Team baseline | Above baseline | Severe delay | Personal or assigned team only | Permitted work items only | Incomplete timestamps | Avoid unauthorized comparisons |
| Workload KPIs | Utilization percentage | Assigned capacity used divided by available capacity | Assigned workload | Available capacity | Workload, tasks, calendars | Operations owner | Daily or assignment event | Capacity policy | Over target | Overload threshold | Owner, assigned manager | Permitted users/tasks only | Missing capacity, leave | Hidden team load suppressed |
| Team Performance KPIs | Team on-time rate | On-time completed team work divided by completed team work | On-time work | Completed work | Tasks, projects | Operations owner | Daily | Team SLA | Below SLA | Sustained breach | Owner or assigned manager | Assigned team only | Membership changed | No unauthorized team comparison |
| Client Performance KPIs | Client health score | Weighted delivery, approval, engagement, and billing-safe signals | Weighted client signals | Total configured weight | Clients, projects, approvals, messages | Client success owner | Daily | Health policy | At-risk | Critical health risk | Assigned client scope; client-safe version approved only | Client-owned records only | Missing engagement data | Internal finance and margin excluded |
| Finance KPIs | Collection rate | Collected amount divided by invoiced amount | Collected amount | Invoiced amount | Invoices, payments | Finance owner | Payment event or daily | Finance target | Below target | Collection risk | Owner or finance grantee | Finance source records only | Partial payment, refund | Owner-only by default |
| Payroll KPIs | Approved payable hours | Sum of approved payable time | Approved payable time | Not applicable | Timesheets, time entries | Payroll owner | Time approval event | Payroll readiness target | Missing approvals | Payroll blocked | Owner or payroll grantee | Payroll records only | Running timers, rejected time | Approved Time Only Payroll enforced |
| Profitability KPIs | Gross margin | Gross profit divided by recognized revenue | Revenue minus cost | Recognized revenue | Revenue, costs, payroll | Finance owner | Daily after finance refresh | Margin policy | Low margin | Negative margin | Owner or profitability grantee | Profitability source records only | Missing cost, zero revenue | No internal margin leakage |
| Invoice KPIs | Overdue invoice amount | Sum amount due where past due | Overdue due amount | Not applicable | Invoices, allocations | Finance owner | Invoice/payment event | Aging policy | Aging warning | Severe overdue | Owner/finance; client own invoices | Permitted invoices only | Partial payment, disputed invoice | No cross-client invoice totals |
| Payment KPIs | Payment success rate | Successful payments divided by attempted payments | Successful payments | Payment attempts | Payments, provider events | Finance owner | Payment event | Provider baseline | Failure increase | Severe failure spike | Owner/finance; client own payments | Permitted payments only | Duplicate webhook, reversal | No hidden payment totals |
| Wallet KPIs | Unapplied wallet credit | Sum wallet credit not allocated | Unapplied credits | Not applicable | Wallets, transactions | Finance owner | Wallet event | Client policy | High unused credit | Credit mismatch | Owner/finance; client own wallet if enabled | Permitted wallet ledger only | Currency mismatch, closed wallet | Client sees own wallet only |
| AI KPIs | AI blocked request rate | Blocked AI requests divided by AI requests | Blocked AI requests | AI requests | AI logs | AI admin | Hourly | Safety baseline | Increase in blocked rate | Safety incident threshold | Owner, AI admin, security auditor | Redacted AI logs only | Redacted prompt, provider outage | Sensitive prompts remain protected |
| Automation KPIs | Automation success rate | Successful runs divided by total runs | Successful runs | Total automation runs | Automation run logs | Automation admin | Near-real-time | Reliability target | Below target | Failure spike | Owner, automation admin | Redacted run details | Dead letters, retries | Sensitive payloads redacted |
| Approval KPIs | Approval cycle time | Total approval duration divided by completed approvals | Total duration | Completed approvals | Approvals, decisions | Operations owner | Approval event | SLA target | Above SLA | Severe bottleneck | Approval visibility scope | Permitted approvals only | Removed approver, hidden file | Target resource visibility enforced |
| File KPIs | Sensitive download count | Count of sensitive file downloads | Sensitive downloads | Not applicable | Files, downloads, audit logs | File/security owner | Near-real-time | Security baseline | Spike | Suspicious spike | File/security permission | Permitted file events only | Revoked share, quarantined file | Restricted file names hidden |
| Voice Note KPIs | Transcription success rate | Successful transcriptions divided by transcription attempts | Successful transcriptions | Transcription attempts | Voice notes, transcripts, AI logs | Collaboration owner | Voice processing event | Quality target | Low success | Severe transcription failure | Source voice/transcript scope | Permitted notes only | Missing consent, multilingual audio | Consent and visibility enforced |

KPI hardening rules:

- Every KPI must have a formula owner and source owner.
- KPI formulas must be versioned and auditable.
- KPI drill-down must never reveal records that did not contribute to the visible KPI.
- Warning and critical thresholds must be configurable per tenant where appropriate.
- KPI values must show freshness status and confidence where calculated or forecasted.
- KPI exports inherit the sensitivity of their source data.

---

### 51.4 BI Analytics Hardening

| Analytics Area | Required Specification |
| --- | --- |
| Trend analysis | Trends must be calculated only from permission-filtered data and must suppress hidden trend lines, hidden categories, hidden users, hidden clients, and hidden financial groups |
| Cross-module analytics | Cross-module joins must require permission for every source module; missing permission removes that module from the result rather than showing partial hidden totals |
| Data quality rules | Reports must show warnings for missing values, duplicate records, stale sources, inconsistent currencies, incomplete time data, and failed source syncs |
| Confidence indicators | Forecasts, anomaly scores, AI analysis, and risk scores must show confidence level, data sufficiency, source freshness, and limitation notes |
| Data freshness indicators | Every dashboard/report must show last refresh, source refresh state, stale warning, and partial refresh warning where relevant |
| Forecast accuracy monitoring | Forecasts must track actual vs forecast, error rate, confidence drift, stale model inputs, and accuracy by module |
| Anomaly scoring | Anomalies must include severity, confidence, baseline period, deviation amount, source scope, and hidden-data suppression result |
| Risk scoring | Risk scores must include contributing visible drivers, omitted hidden drivers indicator without counts, severity, owner, and suggested action |
| Comparative analytics | Comparisons across teams, clients, projects, users, services, or periods require permission for every compared group |
| Drill-down analytics | Drill-down must re-check permission and must not expose suppressed components of a summary |
| Aggregate suppression rules | Suppress aggregates when source group is too small, hidden contributors exist, cross-client leakage is possible, or sensitivity threshold is exceeded |
| Hidden total suppression | Totals must be recalculated only from visible records; never show true total minus visible total or any implied residual |
| Hidden count suppression | Counts must be calculated only from visible records and must not reveal the presence or number of hidden records |

Critical BI anti-leakage rule:

- BI must never reveal hidden counts, hidden totals, hidden trends, hidden anomalies, hidden drivers, hidden source labels, hidden residuals, or cross-client aggregates to unauthorized users.

Acceptance criteria:

- All analytics outputs include permission-safe source scope.
- Forecasts and anomalies identify assumptions and confidence.
- Hidden contributors are omitted without numeric residuals.
- Client, financial, payroll, and employee performance analytics apply the strictest source sensitivity.

---

### 51.5 Report Permission Matrix

Legend:

| Marker | Meaning |
| --- | --- |
| Allowed | Default allowed if source object is accessible |
| Denied | Not allowed |
| Explicit grant required | Requires named permission/grant beyond role |
| Client-safe only | Allowed only through approved client-safe artifact |
| Own/assigned only | Limited to own work or assigned scope |
| Audit required | Access/export/schedule/publish must be audited |

#### 51.5.1 Dashboard Permission Matrix

| Dashboard | Owner | Manager | Employee | Client | Audit |
| --- | --- | --- | --- | --- | --- |
| Executive Dashboard | Allowed | Explicit grant required | Denied | Denied | Audit required |
| Owner Dashboard | Allowed | Denied | Denied | Denied | Audit required |
| Manager Dashboard | Allowed | Own/assigned only | Denied | Denied | Audit required for exports |
| Employee Dashboard | Allowed | Own/assigned team only | Own/assigned only | Denied | Audit required for exports |
| Client Dashboard | Owner view by client scope | Assigned client only | Denied unless granted | Client-safe only | Audit required |
| CRM & Sales Dashboard | Allowed | Own/assigned only | Explicit grant required | Denied | Audit required for exports |
| Project Delivery Dashboard | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Audit required for client publish |
| Task Productivity Dashboard | Allowed | Own/assigned team only | Own/assigned only | Client-safe only | Audit required for team views |
| Team Workload Dashboard | Allowed | Own/assigned team only | Denied | Denied | Audit required |
| Finance Dashboard | Allowed | Explicit grant required | Denied | Denied | Audit required |
| Payroll Dashboard | Allowed | Explicit grant required | Denied | Denied | Audit required |
| Profitability Dashboard | Allowed | Explicit grant required | Denied | Denied | Audit required |
| AI Usage Dashboard | Allowed | Explicit AI admin grant required | Denied | Denied | Audit required |
| Automation Health Dashboard | Allowed | Explicit automation admin grant required | Denied | Denied | Audit required |
| Approval Center Dashboard | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Audit required |
| Client Health Dashboard | Allowed | Own/assigned client only | Denied unless granted | Client-safe only | Audit required |

#### 51.5.2 Report Category Permission Matrix

| Report Category | Owner | Manager | Employee | Client | Export | Scheduled Delivery | Client Publishing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CRM Reports | Allowed | Own/assigned only | Explicit grant required | Denied | Audit required | Runtime revalidation | Client-safe only if approved |
| Sales Reports | Allowed | Own/assigned only | Explicit grant required | Denied | Audit required | Runtime revalidation | Client-safe summary only |
| Project Reports | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Audit required | Runtime revalidation | Approval required |
| Task Reports | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Audit required | Runtime revalidation | Approval required |
| Productivity Reports | Allowed | Own/assigned team only | Own only | Denied | Audit required | Runtime revalidation | Denied |
| Workload Reports | Allowed | Own/assigned team only | Denied | Denied | Audit required | Runtime revalidation | Denied |
| Team Performance Reports | Allowed | Own/assigned team only | Denied | Denied | Audit required | Runtime revalidation | Denied |
| Client Performance Reports | Allowed | Own/assigned client only | Denied unless granted | Client-safe only | Audit required | Runtime revalidation | Approval required |
| Finance Reports | Allowed | Explicit grant required | Denied | Own approved billing only | Audit required | Runtime revalidation | Approved billing only |
| Payroll Reports | Allowed | Explicit grant required | Denied | Denied | Audit required | Runtime revalidation | Denied |
| Profitability Reports | Allowed | Explicit grant required | Denied | Denied | Audit required | Runtime revalidation | Denied unless explicitly approved summary without internal cost |
| Invoice Reports | Allowed | Explicit finance or invoice grant required | Denied unless assigned billing role | Own approved invoices only | Audit required | Runtime revalidation | Approved invoices only |
| Payment Reports | Allowed | Explicit finance or payment grant required | Denied unless assigned billing role | Own approved payments only | Audit required | Runtime revalidation | Approved payments only |
| Wallet Reports | Allowed | Explicit finance or wallet grant required | Denied | Own wallet if enabled | Audit required | Runtime revalidation | Approved wallet records only |
| AI Reports | Allowed | Explicit AI admin grant required | Denied | Denied | Audit required | Runtime revalidation | Denied |
| Automation Reports | Allowed | Explicit automation admin grant required | Denied | Denied | Audit required | Runtime revalidation | Denied |
| Approval Reports | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Audit required | Runtime revalidation | Approval required |
| File Reports | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Audit required | Runtime revalidation | Approval required |
| Voice Note Reports | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Audit required | Runtime revalidation | Approval required |
| Client-Safe Reports | Allowed | Own/assigned client only | Denied unless granted | Client-safe only | Audit required | Runtime revalidation | Approval required |
| Custom Reports | Allowed | Explicit builder/report grant plus source scope | Explicit grant plus own/assigned source scope | Client-safe only | Audit required | Runtime revalidation | Approval required |
| Scheduled Reports | Allowed | Explicit schedule grant plus source scope | Explicit schedule grant plus own/assigned scope | Client-safe only | Audit required | Runtime recipient revalidation | Approval required |
| Exportable Reports | Allowed | Explicit export grant plus source scope | Explicit export grant plus own/assigned scope | Client-safe only | Audit required | Runtime revalidation | Approval required |

#### 51.5.3 KPI Category Permission Matrix

| KPI Category | Owner | Manager | Employee | Client | Drill-down | Export |
| --- | --- | --- | --- | --- | --- | --- |
| CRM KPIs | Allowed | Own/assigned only | Explicit grant required | Denied | Source-scope only | Audit required |
| Sales KPIs | Allowed | Own/assigned only | Explicit grant required | Denied | Source-scope only | Audit required |
| Project KPIs | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Source-scope only | Audit required |
| Task KPIs | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Source-scope only | Audit required if exported |
| Productivity KPIs | Allowed | Own/assigned team only | Own only | Denied | Source-scope only | Audit required |
| Workload KPIs | Allowed | Own/assigned team only | Denied | Denied | Source-scope only | Audit required |
| Team Performance KPIs | Allowed | Own/assigned team only | Denied | Denied | Source-scope only | Audit required |
| Client Performance KPIs | Allowed | Own/assigned client only | Denied unless granted | Client-safe only | Source-scope only | Audit required |
| Finance KPIs | Allowed | Explicit grant required | Denied | Own approved billing only | Source-scope only | Audit required |
| Payroll KPIs | Allowed | Explicit grant required | Denied | Denied | Source-scope only | Audit required |
| Profitability KPIs | Allowed | Explicit grant required | Denied | Denied | Source-scope only | Audit required |
| Invoice KPIs | Allowed | Explicit grant required | Denied unless billing role | Own approved invoices only | Source-scope only | Audit required |
| Payment KPIs | Allowed | Explicit grant required | Denied unless billing role | Own approved payments only | Source-scope only | Audit required |
| Wallet KPIs | Allowed | Explicit grant required | Denied | Own wallet if enabled | Source-scope only | Audit required |
| AI KPIs | Allowed | Explicit AI admin grant required | Denied | Denied | Redacted source only | Audit required |
| Automation KPIs | Allowed | Explicit automation admin grant required | Denied | Denied | Redacted source only | Audit required |
| Approval KPIs | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Source-scope only | Audit required |
| File KPIs | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Source-scope only | Audit required |
| Voice Note KPIs | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Source-scope only | Audit required |

#### 51.5.4 Action Permission Matrix

| Action | Owner | Manager | Employee | Client | Notes |
| --- | --- | --- | --- | --- | --- |
| Report view | Allowed | Own/assigned or explicit grant | Own/assigned or explicit grant | Client-safe only | Source permission required |
| Report drill-down | Allowed | Own/assigned only | Own/assigned only | Client-safe only | Revalidate every request |
| Report export | Allowed with audit | Explicit grant required | Explicit grant required | Own approved client-safe only | Sensitive export approval required |
| Scheduled delivery | Allowed with audit | Explicit schedule grant | Explicit schedule grant | Client-safe only | Recipient revalidation required |
| Client publishing | Allowed | Assigned client plus publish grant | Denied unless granted | Denied | Human approval required |
| Financial data visibility | Allowed | Explicit grant required | Denied | Own approved billing only | No global finance for clients |
| Payroll data visibility | Allowed | Explicit grant required | Denied | Denied | Payroll allowlist required |
| Profitability visibility | Allowed | Explicit grant required | Denied | Denied by default | No internal margin leakage |
| Team performance visibility | Allowed | Assigned team only | Denied | Denied | Avoid unauthorized employee comparison |
| Employee performance visibility | Allowed | Assigned employee/team only | Own only | Denied | Sensitive personnel insights audited |

---

### 51.6 Client-Safe Reporting Hardening

Client-safe reports must explicitly exclude:

- Internal notes.
- Draft/private comments.
- Internal chat.
- Employee costs.
- Payroll.
- Profitability.
- Internal margins.
- Cross-client data.
- Other client names.
- Internal workload details.
- Internal AI/admin logs.
- Audit logs.
- Unapproved files.
- Unapproved report sections.
- Hidden internal task metadata.
- Internal risk reasons that reveal staff, cost, margin, or other clients.

#### 51.6.1 Client Report Approval Matrix

| Report Content | Owner Approval | Manager Approval | Client Visibility | Notes |
| --- | --- | --- | --- | --- |
| Project progress | Required for first publication or material change | Allowed for assigned client if granted | Client-safe only | Internal tasks removed |
| Approval status | Required if linked to sensitive files | Allowed for assigned approval scope | Own approvals only | File visibility rechecked |
| Files and versions | Required if sensitive or external-facing | Allowed if file share permission exists | Approved shared files only | Unapproved files excluded |
| Invoice/payment summary | Required for global templates | Finance grant required | Own approved billing only | No internal finance |
| Wallet summary | Required if enabled | Finance grant required | Own wallet only | No global wallet totals |
| AI-generated summary | Required if client-facing | Allowed only after review | Approved text only | Sources must be client-visible |
| Risk summary | Required | Manager may draft | Approved client-safe risks only | Internal drivers removed |

#### 51.6.2 Client-Safe Redaction Rules

| Sensitive Source | Required Client-Safe Handling |
| --- | --- |
| Internal notes/private comments | Remove entirely |
| Internal chat | Remove entirely |
| Employee costs/payroll | Remove entirely |
| Profitability/margins | Remove entirely unless explicitly approved as non-cost summary |
| Other client names/data | Remove entirely |
| Internal workload | Remove user/team details; show only approved delivery status |
| AI/admin logs | Remove entirely |
| Audit logs | Remove entirely |
| Unapproved files/sections | Remove entirely |
| Financial documents | Include only own approved invoices, payments, wallet records, or approved documents |

#### 51.6.3 Client-Safe Preview And Publishing Rules

- Client-safe preview must show exactly what the client will see.
- Preview must identify removed sensitive sections without revealing removed values.
- Human approval is required before publication.
- Publication must create an immutable publication audit event.
- Revocation must immediately remove client portal access and invalidate export links.
- Published reports must preserve version and approval history.

#### 51.6.4 Client-Safe Export Rules

- Export can include only approved client-safe content.
- Export must include report version, freshness timestamp, and watermark where configured.
- Export links must expire.
- Export access must be audited.
- Revoked client reports must invalidate associated exports unless retention policy requires internal archival.

---

### 51.7 Export And Scheduled Report Security

| Security Area | Required Specification |
| --- | --- |
| Export approval workflow | Classify sensitivity, validate permission, request approval for sensitive exports, generate redacted artifact, audit request/generation/download |
| Sensitive export restrictions | Finance, payroll, profitability, employee performance, audit, AI log, automation payload, and client-facing exports require explicit permission and approval |
| Recipient permission validation | Validate every recipient has permission to view the report and source scope before delivery |
| Runtime recipient revalidation | Revalidate recipient permissions immediately before generating delivery payload |
| Scheduled report recipient revalidation | Revalidate schedule owner, execution context, report definition, recipients, client scope, finance/payroll grants, and export permissions before every run |
| Expiring signed links | Export links must be time-limited, scoped to recipient, report version, export artifact, and sensitivity level |
| Link revocation rules | Revocation must invalidate active links, prevent future downloads, and log revocation reason |
| Export watermarking | Sensitive exports must include watermark identifier, recipient, timestamp, tenant, report/export id, and confidentiality label where format allows |
| Export redaction | Redaction must apply before artifact generation and must be recorded in audit logs |
| Export retention rules | Retention depends on sensitivity, tenant policy, legal hold, client publication status, and audit requirements |
| Export deletion rules | Deletion must remove downloadable artifact while preserving required audit metadata |
| Export archive rules | Archived exports are inaccessible by default and visible only to authorized auditors |
| Download audit logs | Log recipient, user, session, device, link, export, report version, outcome, and timestamp |
| Failed delivery handling | Failed delivery must log reason, suppress sensitive error details, notify authorized owner/admin, and avoid retrying to unauthorized recipients |
| External email delivery safety | External email must use client-safe or approved export only; no sensitive content in subject or preview text |
| Client delivery safety | Client deliveries require approved client-safe report, client recipient validation, expiring link, and audit |
| Owner notification for sensitive exports | Owner or configured security admin must be notified for high-sensitivity exports and export failures |

Acceptance criteria:

- No scheduled report is delivered unless recipient permissions pass at runtime.
- Sensitive export links expire and can be revoked.
- All downloads are audited.
- External delivery never includes sensitive content in unsafe channels.

---

### 51.8 Financial And Payroll Reporting Safety

| Reporting Area | Required Visibility Rule |
| --- | --- |
| Revenue report visibility | Owner can view global revenue; managers require explicit finance grant; clients can view only own approved billing documents where enabled |
| Cost report visibility | Owner only by default; managers require explicit cost grant; employees and clients denied |
| Profit report visibility | Owner only by default; managers require explicit profitability grant; employees and clients denied |
| Profitability report visibility | Owner or explicit profitability grantee only; no client margin exposure |
| Employee cost visibility | Owner only by default; explicit employee cost grant required for non-Owner; clients denied |
| Payroll visibility | Owner or explicit payroll grantee only; clients denied |
| Wallet report visibility | Owner/global finance grantee globally; clients only own wallet where enabled |
| Invoice visibility | Owner/global finance grantee globally; clients own approved/sent invoices only |
| Payment visibility | Owner/global finance grantee globally; clients own approved payment records only |
| Partial payment visibility | Owner/global finance grantee globally; clients only partial payments applied to own invoices |
| Client invoice/payment visibility | Client sees only own approved invoices, payments, wallet records, and approved financial documents |
| Owner-only financial dashboard rules | Owner has full tenant finance, payroll, cost, and profitability visibility subject to audit |
| Explicit finance grant rules | Grant must define modules, clients/projects, export rights, schedule rights, and expiration where applicable |
| Explicit payroll grant rules | Grant must define payroll reports, employee scope, export rights, schedule rights, and expiration where applicable |
| Manager financial limitations | Managers cannot access global finance, cost, profitability, employee cost, or payroll unless explicitly granted |
| Employee financial limitations | Employees cannot access global finance, cost, profitability, employee cost, or payroll |
| Client financial limitations | Clients cannot access agency internal finance, costs, margins, payroll, employee costs, or other clients |

Critical rules:

- Owner can access global finance, payroll, cost, and profitability reports.
- Managers cannot access global finance, payroll, employee costs, or profitability unless explicitly granted.
- Employees cannot access global finance, payroll, employee costs, or profitability.
- Clients can only access their own approved invoices, payments, wallet records, and approved financial documents.
- Aggregated cost, profit, payroll, and employee cost data must not be exposed through dashboards, exports, scheduled reports, AI reports, automation reports, client-safe reports, widgets, KPIs, forecasts, anomalies, or risk indicators unless the user has permission.

Acceptance criteria:

- All financial/payroll report queries are filtered before aggregation.
- Unauthorized users receive safe no-permission states.
- No hidden finance, cost, profit, payroll, or employee cost totals are inferable.

---

### 51.9 AI And Automation Reporting Alignment

| Alignment Area | Required Specification |
| --- | --- |
| AI hidden data inference | AI-generated reports cannot infer, estimate, mention, compare, or summarize hidden data |
| AI unauthorized aggregates | AI cannot summarize unauthorized aggregates, hidden totals, hidden counts, hidden trends, hidden anomalies, or hidden residuals |
| AI suppression compliance | AI-generated reports must follow hidden count and hidden total suppression rules |
| Automation runtime checks | Automation-triggered reports must re-check report permissions, source permissions, execution context, and recipient permissions at runtime |
| Scheduled recipient checks | Scheduled reports must re-check recipient permission before every delivery |
| AI source references | AI reports require source references where possible and those sources must be accessible to the viewer |
| Sensitive AI report approval | Sensitive AI-generated reports require approval before export, scheduled delivery, or client publication |
| Failed scheduled reports | Failed scheduled reports must be logged safely with sensitive details redacted |

Acceptance criteria:

- AI summaries never become a side channel for hidden report data.
- Automations never deliver reports after permission or scope changes.
- AI report exports and publications follow the same approval rules as manual reports.

---

### 51.10 Audit Event Schema

All sensitive report and dashboard events must create audit events with the following schema-level fields.

| Field | Purpose |
| --- | --- |
| audit_event_id | Unique audit event identifier |
| tenant_id | Tenant boundary for event |
| user_id | Acting user |
| role | Acting user's role at event time |
| session_id | Session used for access or action |
| device_id | Device used for access or action |
| dashboard_id | Dashboard involved, if applicable |
| report_id | Report involved, if applicable |
| widget_id | Widget involved, if applicable |
| kpi_id | KPI involved, if applicable |
| export_id | Export involved, if applicable |
| scheduled_report_id | Scheduled report involved, if applicable |
| recipient_id | Delivery recipient, if applicable |
| client_id | Client scope, if applicable |
| action_type | View, drill-down, export, download, schedule, publish, revoke, AI-generate, automation-run, deny |
| sensitivity_level | Public internal, client-safe, confidential, financial, payroll, profitability, audit, security |
| permission_result | Allowed, denied, partially allowed, redacted, suppressed |
| data_scope | Tenant, user, team, project, client, finance, payroll, custom scope |
| redaction_applied | Whether redaction was applied |
| aggregate_suppression_applied | Whether hidden count/total suppression was applied |
| export_watermark_id | Watermark identifier for export |
| link_id | Expiring link identifier |
| timestamp | Event timestamp in tenant/user timezone context |
| outcome | Success, denied, failed, revoked, expired, partial |
| failure_reason | Redacted failure reason safe for audit viewers |

Redacted audit detail rules:

- Audit logs must not store raw payroll, financial, AI prompt, file, or client confidential content unless explicitly required and protected.
- Sensitive payloads must be summarized with redaction flags.
- Audit viewers see details only within audit permission scope.
- Client users cannot view internal audit logs.
- Export/download audit details must preserve watermark and link identifiers.

---

### 51.11 Data Governance Addendum

| Governance Area | Required Rule |
| --- | --- |
| Data lineage | Every report, dashboard widget, KPI, forecast, anomaly, risk indicator, snapshot, and export must reference source modules and source scope |
| Source references | AI-generated and analytical reports must include accessible source references where possible |
| Data freshness | Every report must show last refresh, source freshness, and partial refresh status |
| Data quality warnings | Show missing data, duplicate source, stale sync, currency mismatch, incomplete time, failed import, and calculation limitation warnings |
| Stale data warnings | Stale reports must be labeled and must not present stale KPIs or forecasts as current facts |
| Snapshot reports | Snapshot reports preserve the result, source scope, permission snapshot, report version, freshness, and generation time |
| Live reports | Live reports recalculate at view time using current permissions and current source state |
| Snapshot vs live rules | Sensitive exports should use approved snapshots; live reports require current runtime permission checks |
| Report versioning | Report definitions must version changes to filters, columns, widgets, data sources, visibility, client-safe status, and export settings |
| Dashboard versioning | Dashboard layouts and widget definitions must be versioned for auditability and rollback |
| KPI versioning | KPI formulas, thresholds, source mappings, visibility rules, and owners must be versioned |
| Report retention policy | Retention depends on tenant policy, sensitivity, client publication, legal hold, and audit requirements |
| Export retention policy | Export retention must be shorter or equal to report retention unless legal hold applies |
| Report deletion policy | Deletion must respect retention, legal hold, archive state, and audit preservation |
| Export deletion policy | Export artifacts may be deleted while audit metadata remains |
| Report archive policy | Archived reports cannot run schedules, publish, or generate new exports |
| Client report revocation policy | Revoked reports must be removed from client portal, links invalidated, deliveries stopped, and audit retained |

Acceptance criteria:

- Every report output is traceable to source modules, report version, user scope, and freshness state.
- Report lifecycle decisions are auditable.
- Deletion and archival do not destroy required audit evidence.

---

### 51.12 Non-SQL Database Addendum

This database addendum defines required BI/reporting objects at the specification level only.

| Object | Purpose | Key Fields | Relationships | Constraints | Indexing Needs | Audit Requirements |
| --- | --- | --- | --- | --- | --- | --- |
| report_definitions | Store saved report definitions | report_id, tenant_id, owner_id, name, description, visibility, data_scope, sensitivity, client_safe_status, archive_status | Users, tenants, clients, report_versions | Tenant required; owner required; visibility constrained by permission | tenant_id, owner_id, visibility, sensitivity | Create/update/archive/delete logged |
| report_versions | Track report definition versions | version_id, report_id, version_number, author_id, change_summary, status, activation_date | report_definitions, users | Immutable after activation | report_id, version_number, status | Version creation, approval, rollback logged |
| dashboard_definitions | Store dashboard layouts | dashboard_id, tenant_id, dashboard_type, role_scope, sensitivity, version | Tenants, roles, users | Dashboard type required | tenant_id, dashboard_type, role_scope | Layout/version changes logged |
| dashboard_widgets | Store dashboard widgets | widget_id, dashboard_id, kpi_id, report_id, position, sensitivity, visibility_rule | dashboard_definitions, kpi_definitions, report_definitions | Widget visibility cannot exceed dashboard scope | dashboard_id, kpi_id, sensitivity | Widget access/change logged |
| kpi_definitions | Store governed KPI formulas | kpi_id, category, name, formula_text, owner_id, cadence, thresholds, visibility_rule, version | Users, reports, widgets | Formula owner required; version required | category, owner_id, sensitivity | Formula/threshold changes logged |
| report_snapshots | Store generated report snapshots | snapshot_id, report_id, version_id, generated_by, generated_at, freshness_status, data_scope, sensitivity | report_definitions, report_versions, users | Snapshot scope immutable | report_id, version_id, generated_at | Snapshot generation/access logged |
| report_exports | Store export artifacts metadata | export_id, report_id, snapshot_id, requested_by, sensitivity, redaction_status, watermark_id, retention_until, status | report_definitions, report_snapshots, report_watermarks | Export must have permission record | report_id, requested_by, status | Request/generate/download/delete logged |
| scheduled_reports | Store schedules | scheduled_report_id, report_id, owner_id, cadence, timezone, execution_context, status, approval_required | report_definitions, users, report_recipients | Runtime revalidation required | owner_id, status, next_run_at | Create/update/pause/delete logged |
| scheduled_report_runs | Store scheduled run outcomes | run_id, scheduled_report_id, report_id, version_id, started_at, completed_at, status, failure_reason | scheduled_reports, report_definitions | Failure reason redacted | scheduled_report_id, status, started_at | Run/delivery/failure logged |
| report_recipients | Store report recipients | recipient_id, scheduled_report_id, user_id, client_id, email, delivery_channel, permission_status | scheduled_reports, users, clients | Recipient revalidation required | scheduled_report_id, user_id, client_id | Add/remove/revalidation logged |
| client_report_publications | Store client publications | publication_id, report_id, version_id, client_id, approved_by, published_at, revoked_at, status | report_definitions, report_versions, clients, users | Approval required before published | client_id, report_id, status | Preview/approve/publish/revoke logged |
| report_access_logs | Store report access events | access_log_id, tenant_id, user_id, report_id, dashboard_id, action_type, sensitivity, outcome | Users, reports, dashboards | Tenant required | tenant_id, user_id, action_type, timestamp | Access log is audit source |
| report_data_lineage | Store lineage references | lineage_id, report_id, snapshot_id, source_module, source_scope, freshness_status | report_definitions, report_snapshots | Source scope required | report_id, source_module | Lineage changes logged |
| report_retention_policies | Store retention rules | policy_id, tenant_id, sensitivity, report_retention_days, export_retention_days, audit_retention_days, legal_hold | Tenants, reports, exports | Sensitivity unique per tenant where configured | tenant_id, sensitivity | Policy changes logged |
| report_export_links | Store expiring links | link_id, export_id, recipient_id, expires_at, revoked_at, status, download_count | report_exports, report_recipients | Expiration required; revocation supported | export_id, recipient_id, status | Link create/download/revoke logged |
| report_watermarks | Store watermark metadata | watermark_id, export_id, tenant_id, recipient_id, created_at, label, confidentiality_level | report_exports, tenants, recipients | Watermark required for sensitive exports | export_id, watermark_id | Watermark creation logged |

---

### 51.13 Security Addendum

| Security Control | Required Rule |
| --- | --- |
| Field-level sensitivity classification | Every reportable field must carry sensitivity classification before inclusion in dashboards, reports, KPIs, exports, AI summaries, and schedules |
| Aggregate suppression thresholds | Configurable tenant thresholds must suppress small groups and hidden contributor groups |
| Hidden count suppression | Counts must include visible records only and must not imply hidden counts |
| Hidden total suppression | Totals must include visible records only and must not expose residual hidden totals |
| Cross-client aggregation prevention | Client-facing reports cannot aggregate across clients; internal cross-client aggregation requires appropriate role and scope |
| Export watermarking | Sensitive exports must include watermark metadata and visible watermark where format allows |
| Expiring signed links | Export delivery links must expire and be scoped to recipient/export/report version |
| Link revocation | Links must be revocable immediately and revocation must be audited |
| Runtime recipient permission revalidation | Recipient permission must be revalidated before each scheduled delivery and export download where applicable |
| Scheduled report permission revalidation | Schedule owner, execution context, report, source scope, recipients, and export permission must be revalidated every run |
| Client-safe publishing approval | Client-facing reports require approval before first publication and after material changes |
| Financial report allowlists | Finance reports must use explicit allowlists of fields, widgets, exports, schedules, recipients, and AI summaries |
| Payroll report allowlists | Payroll reports must use explicit allowlists and deny all client visibility |
| Report export allowlists | Exportable report types, formats, recipients, and delivery channels must be configured by permission |
| Sensitive dashboard access logging | Finance, payroll, profitability, AI, automation, audit, security, and executive dashboards require access logs |

Acceptance criteria:

- Report security is enforced before query, before aggregation, before AI generation, before export, before delivery, and before drill-down.
- No hidden financial, payroll, profitability, employee performance, client, or cross-tenant data can be inferred.

---

### 51.14 Required New Workflows

| Workflow | Required Steps |
| --- | --- |
| Specialized dashboard access workflow | User opens dashboard; tenant and role resolved; dashboard permission checked; source permissions checked; widgets filtered; sensitive access logged |
| KPI calculation and threshold workflow | KPI version selected; source data filtered; formula applied; threshold evaluated; warning/critical state assigned; freshness displayed |
| Permission-safe drill-down workflow | User clicks drill-down; permission revalidated; source scope recalculated; hidden contributors suppressed; drill-down logged if sensitive |
| Aggregate suppression workflow | Candidate aggregate calculated from visible scope; hidden/small group rules evaluated; aggregate shown, redacted, or suppressed; suppression flag logged |
| Client-safe report preview workflow | Internal report drafted; client-safe filters applied; excluded sections removed; preview generated; preview audit event created |
| Client-safe report approval workflow | Reviewer checks preview; approval decision captured; approved version locked; rejected version returned to draft |
| Client report publication workflow | Approved report published to portal; recipients validated; client notification sent safely; publication audited |
| Client report revocation workflow | Revocation requested; portal access removed; links invalidated; future deliveries stopped; revocation audited |
| Sensitive report export workflow | Export requested; permission and sensitivity checked; approval captured; redaction/watermark applied; link generated; download audited |
| Scheduled report recipient revalidation workflow | Schedule run starts; execution context checked; recipients revalidated; unauthorized recipients removed; delivery proceeds or pauses |
| Expiring export link workflow | Export link created; recipient opens link; permission and expiry checked; download allowed or denied; event audited |
| Export revocation workflow | Revocation requested; export/link status changed; active downloads blocked; notification sent where required; audit retained |
| Report versioning workflow | User edits report; draft version created; changes reviewed; approved version activated; previous version retained |
| Snapshot report workflow | Report generated from approved version; permission snapshot captured; result stored with freshness and lineage; access controlled |
| Live report workflow | Report opened; current permissions checked; current source data queried; live freshness shown; sensitive access logged |
| Data freshness warning workflow | Source refresh state checked; stale or partial data detected; warning shown; export includes freshness notice |
| Data quality warning workflow | Quality checks run; missing/duplicate/inconsistent data detected; warning shown; AI summary notes limitation |
| Financial report access workflow | User requests financial report; finance allowlist and grants checked; data filtered; access/export audited |
| Payroll report access workflow | User requests payroll report; payroll allowlist and grants checked; approved-time rules enforced; access/export audited |

---

### 51.15 Required New Diagrams

#### 51.15.1 Specialized Dashboard Permission Diagram

| Step | Flow |
| --- | --- |
| 1 | User opens specialized dashboard |
| 2 | Tenant, role, membership, and client/team scope are resolved |
| 3 | Dashboard permission is checked |
| 4 | Source permissions and sensitivity allowlists are checked |
| 5 | Widgets are loaded, redacted, suppressed, or blocked |
| 6 | Sensitive dashboard access is logged |

#### 51.15.2 KPI Calculation And Threshold Diagram

| Step | Flow |
| --- | --- |
| 1 | KPI definition and version are selected |
| 2 | Source data is permission-filtered |
| 3 | Formula, currency, timezone, and freshness rules are applied |
| 4 | Warning and critical thresholds are evaluated |
| 5 | KPI, state, confidence, and drill-down availability are displayed |

#### 51.15.3 Aggregate Suppression Diagram

| Step | Flow |
| --- | --- |
| 1 | Report requests aggregate |
| 2 | Source records are filtered by permission |
| 3 | Hidden contributors, small groups, and cross-client risk are evaluated |
| 4 | Aggregate is displayed only if safe |
| 5 | Suppressed result shows safe no-data/no-permission state |
| 6 | Suppression flag is logged for sensitive reports |

#### 51.15.4 Client-Safe Reporting Lifecycle Diagram

| Step | Flow |
| --- | --- |
| 1 | Internal report is drafted |
| 2 | Client-safe redaction removes unsafe content |
| 3 | Preview is generated |
| 4 | Human approval is captured |
| 5 | Report is published to client portal |
| 6 | Client views or exports approved report |
| 7 | Report can be revoked and links invalidated |

#### 51.15.5 Sensitive Report Export Diagram

| Step | Flow |
| --- | --- |
| 1 | User requests export |
| 2 | Export permission and source permission are checked |
| 3 | Sensitivity is classified |
| 4 | Approval is required where sensitive |
| 5 | Redaction and watermark are applied |
| 6 | Expiring link is generated |
| 7 | Download is audited |

#### 51.15.6 Scheduled Report Recipient Revalidation Diagram

| Step | Flow |
| --- | --- |
| 1 | Scheduled report run starts |
| 2 | Schedule owner and execution context are validated |
| 3 | Report version and source permissions are checked |
| 4 | Each recipient is revalidated |
| 5 | Unauthorized recipients are removed or delivery is paused |
| 6 | Delivery results and failures are logged |

#### 51.15.7 Expiring Link And Revocation Diagram

| Step | Flow |
| --- | --- |
| 1 | Export link is created for recipient |
| 2 | Link receives expiration and sensitivity rules |
| 3 | Recipient requests download |
| 4 | Expiry, revocation, recipient, and permission are checked |
| 5 | Download is allowed or denied |
| 6 | Revocation invalidates future access and is audited |

#### 51.15.8 Financial/Payroll Report Safety Diagram

| Step | Flow |
| --- | --- |
| 1 | User requests finance/payroll/profitability report |
| 2 | Owner role or explicit grant is checked |
| 3 | Financial, payroll, employee cost, and profitability allowlists are applied |
| 4 | Unauthorized fields/widgets/KPIs are blocked |
| 5 | Export/schedule/AI summary requires separate approval where sensitive |
| 6 | Access and denial are audited |

#### 51.15.9 Report Versioning And Snapshot Diagram

| Step | Flow |
| --- | --- |
| 1 | Report definition is edited |
| 2 | Draft version is created |
| 3 | Approval is captured if required |
| 4 | Version is activated |
| 5 | Snapshot is generated from active version |
| 6 | Snapshot preserves version, scope, freshness, and lineage |

#### 51.15.10 BI Data Governance Diagram

| Step | Flow |
| --- | --- |
| 1 | Source modules produce reportable records |
| 2 | Field sensitivity and data quality are classified |
| 3 | Lineage and freshness metadata are attached |
| 4 | Report/KPI/dashboard version is selected |
| 5 | Output is generated with permission and suppression rules |
| 6 | Retention, archive, deletion, and audit policies govern lifecycle |

---

### 51.16 Phase 11 Post-Fix Acceptance Criteria

Phase 11 is approved only when:

- Specialized dashboard specifications exist for Finance, Payroll, Profitability, AI Usage, Automation Health, Approval Center, and Client Health.
- Saved custom reports are defined separately from the Custom Report Builder.
- KPI categories include formal definitions, formulas, thresholds, visibility, drill-down, and edge cases.
- BI analytics include trend analysis, cross-module analytics, data quality, confidence, suppression, hidden count, and hidden total controls.
- Permission matrices cover dashboards, report categories, KPI categories, and report actions for Owner, Manager, Employee, and Client.
- Client-safe reports explicitly exclude internal notes, private comments, internal chat, employee costs, payroll, profitability, internal margins, cross-client data, other client names, internal workload, AI/admin logs, audit logs, unapproved files, and unapproved sections.
- Export and scheduled report security include recipient revalidation, expiring links, revocation, watermarking, retention, deletion, archive, failed delivery handling, and external delivery safety.
- Financial and payroll reporting rules enforce Owner-only access by default and explicit grants for exceptions.
- AI and automation reporting cannot infer hidden data and must re-check permissions at runtime.
- Audit event schema includes report, dashboard, KPI, export, scheduled report, recipient, sensitivity, permission, redaction, suppression, watermark, link, outcome, and failure fields.
- Data governance covers lineage, freshness, quality, snapshots, live reports, versioning, retention, deletion, archival, and revocation.
- Database and security addenda define the required non-SQL reporting objects and security controls.
- All required new workflows and diagrams are included.

**Phase 11 Critical Gap Status:** Fixed by this addendum.
