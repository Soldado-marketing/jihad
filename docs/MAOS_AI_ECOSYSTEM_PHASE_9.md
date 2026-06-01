# MAOS Phase 9 AI Ecosystem Specification

**Platform:** Marketing Agency Operating System (MAOS)  
**Document:** Phase 9 AI Ecosystem Specification  
**Version:** 1.0  
**Status:** AI Ecosystem Specification  
**Document Type:** Product, security, workflow, and governance specification  
**Code Policy:** No code, no SQL, no implementation scripts, no database migrations  

---

## 1. Product Context

MAOS is a multi-tenant, invite-only SaaS operating system for distributed marketing agencies and their clients. The AI Ecosystem must support agency owners, managers, employees, and client portal users across CRM, projects, tasks, collaboration, files, voice notes, meetings, approvals, reports, finance, payroll, dashboards, and business intelligence.

AI in MAOS must act as a permission-aware assistant, copilot, analyst, search layer, reporting layer, workflow helper, and multilingual productivity layer. AI must never become a bypass around RBAC, client boundaries, tenant isolation, file visibility, financial restrictions, approval workflows, or audit obligations.

---

## 2. Approved Reference Foundation

Phase 9 inherits and must not weaken these approved platform rules:

| Reference | Required AI Alignment |
| --- | --- |
| Phase 1 Enterprise Architecture | Tenant-aware AI orchestration, permission-filtered retrieval, human review gates, AI audit logging |
| Phase 2 Enterprise Database | AI logs, audit logs, activity logs, tasks, voice notes, files, chat, meetings, reports, finance, payroll, and permissions objects |
| Phase 3 Security & Permissions | RBAC, custom permissions, invite-only access, tenant isolation, client boundaries, API security, file security, AI security |
| Phase 4 CRM & Sales | Leads, opportunities, meetings, proposals, quotations, follow-ups, forecasting |
| Phase 5 UI/UX Design System | AI page, right drawer AI panels, voice notes page, reports page, no-permission states, multilingual RTL/LTR behavior |
| Phase 6 Project Management | Projects, tasks, subtasks, dependencies, workload, skill matching, templates, recurring work |
| Phase 7 Collaboration | Chat, client chat, voice notes, files, file versions, approval center, revision tracking |
| Phase 8 Finance & Payroll | Owner Only Financial Access, payroll restrictions, financial report permissions, AI financial access restrictions |

---

## 3. Critical AI Security Rules

These rules apply to every AI capability, workflow, data source, report, recommendation, and generated action.

| Rule | Required Behavior |
| --- | --- |
| Permission equivalence | AI can only access data the requesting user can manually access |
| No hidden data | AI must never use inaccessible records as hidden context |
| Tenant isolation | AI must never retrieve, summarize, infer, or expose data from another tenant |
| Client boundary | Client users can only access their own client-visible data |
| Owner Only Financial Access | Global finance, profitability, costs, payroll, and employee cost data are Owner-only unless explicitly granted |
| Payroll protection | Payroll data is visible only to Owner or explicitly authorized roles |
| No unauthorized inference | AI must not reveal hidden records through counts, hints, suggestions, summaries, or anomalies |
| Human approval | Critical actions require explicit user approval before saving, sending, assigning, exporting, publishing, approving, or changing records |
| No destructive automation | AI must not delete, void, approve, send, archive, cancel, overwrite, or execute destructive actions automatically |
| Source references | AI-generated tasks, reports, summaries, and recommendations must show source references where possible |
| Fact versus suggestion | AI must clearly separate confirmed platform data from generated suggestions |
| Auditability | AI requests, responses, actions, blocked actions, and approvals must be logged according to sensitivity |
| Multilingual safety | Arabic, English, and German outputs must preserve permissions, meaning, directionality, and source context |

---

## 4. Supported Languages

| Language | Direction | Required AI Behavior |
| --- | --- | --- |
| Arabic | RTL | Detect Arabic, respond in Arabic when appropriate, support RTL layout labels, avoid mixing hidden LTR source fragments unless referenced safely |
| English | LTR | Default platform business language where user preference is English |
| German | LTR | Support German prompts, summaries, reports, tasks, meetings, and client-facing output |

Language behavior must use user preference first, then detected input language, then tenant default. Client-facing outputs must respect client language preference where available.

---

## 5. AI Capability Map

| Capability | Primary Users | Primary Output | Approval Required |
| --- | --- | --- | --- |
| AI Assistant | Owner, Manager, Employee, Client | Answers, summaries, navigation help | Required for action execution |
| AI Copilot | Owner, Manager, Employee | Draft tasks, plans, subtasks, follow-ups, proposals, reports | Required before saving important changes |
| AI Analyst | Owner, authorized Manager, Employee, Client | Insights, trends, risks, forecasts | Required for critical recommendations |
| Voice To Task | Owner, Manager, Employee | Transcript, task draft, subtasks | Required before task creation |
| Meeting To Tasks | Owner, Manager, Employee, Client where permitted | Summary, decisions, action items, tasks | Required before task creation |
| AI Search | All permitted users | Permission-safe results with sources | Not required for read-only search |
| AI Reporting | Owner, authorized users, Client where permitted | Reports and explanations | Required for publishing/exporting sensitive reports |
| AI Analytics | Owner, authorized users, Client where permitted | Metrics, anomalies, forecasts, recommendations | Required for critical decisions/actions |

---

## 6. Required Diagrams

### 6.1 AI Ecosystem Overview Diagram

| Layer | Flow |
| --- | --- |
| User layer | Owner, Manager, Employee, Client |
| Interface layer | AI Assistant, Copilot drawer, Voice Notes, Reports, Search, Dashboards |
| Governance layer | Tenant resolution, session validation, RBAC, custom permissions, client scope, financial scope |
| AI layer | AI orchestration, language detection, retrieval, generation, action proposal, human approval |
| Data layer | CRM, projects, tasks, chat, files, voice notes, meetings, approvals, reports, finance, payroll |
| Observability layer | AI logs, audit logs, activity logs, notifications, quality metrics |

### 6.2 AI Permission Enforcement Diagram

| Step | Gate | Result |
| --- | --- | --- |
| 1 | User identity and active session | Valid or denied |
| 2 | Tenant membership | Tenant scope resolved |
| 3 | Role and permissions | Capability allowed or blocked |
| 4 | Resource scope | Client/project/task/file/report visibility checked |
| 5 | Financial restriction | Owner-only or explicit financial grant checked |
| 6 | Retrieval filter | Only allowed records retrieved |
| 7 | Output filter | Response checked for unauthorized exposure |
| 8 | Audit decision | AI log and audit log created where required |

### 6.3 AI Assistant Workflow Diagram

| Step | Flow |
| --- | --- |
| 1 | User asks question |
| 2 | AI resolves language and intent |
| 3 | Permissions and scope are checked |
| 4 | Accessible context is retrieved |
| 5 | Response is generated with source references |
| 6 | Facts and suggestions are labeled |
| 7 | User receives answer or access-denied message |
| 8 | AI interaction is logged |

### 6.4 AI Copilot Workflow Diagram

| Step | Flow |
| --- | --- |
| 1 | User requests a draft or action |
| 2 | AI checks module permissions |
| 3 | AI retrieves permitted context |
| 4 | AI drafts task, subtask, follow-up, plan, proposal, report, or note |
| 5 | User reviews generated draft |
| 6 | Human approval is captured |
| 7 | Approved record is created or updated |
| 8 | AI and audit logs are created |

### 6.5 Voice-To-Task Diagram

| Step | Flow |
| --- | --- |
| 1 | Voice note is recorded or uploaded |
| 2 | Audio is stored under tenant and file permissions |
| 3 | Language is detected |
| 4 | Transcript is generated |
| 5 | AI extracts title, description, assignee suggestion, due date, priority, project/client, subtasks |
| 6 | User reviews extracted task |
| 7 | User confirms creation |
| 8 | Task links to original voice note, transcript, extraction, and approval |

### 6.6 Meeting-To-Tasks Diagram

| Step | Flow |
| --- | --- |
| 1 | Meeting note, transcript, or voice upload is submitted |
| 2 | Participant and resource permissions are checked |
| 3 | Summary, decisions, risks, follow-ups, and action items are generated |
| 4 | Suggested task owners and due dates are produced |
| 5 | User reviews and edits suggestions |
| 6 | Approved tasks are created |
| 7 | Tasks are linked to meeting, project, client, opportunity, and sources |
| 8 | Logs and notifications are created |

### 6.7 AI Search Diagram

| Step | Flow |
| --- | --- |
| 1 | User searches in natural language |
| 2 | Tenant, role, client, and module permissions are checked |
| 3 | Search retrieves only permitted records |
| 4 | Results are ranked and grouped by source type |
| 5 | Unauthorized records are excluded without hidden counts |
| 6 | Result list shows source type, title, snippet, and object link |
| 7 | Search event is logged where required |

### 6.8 AI Reporting Diagram

| Step | Flow |
| --- | --- |
| 1 | User requests report |
| 2 | Report type and scope are detected |
| 3 | Permissions are checked by module and data sensitivity |
| 4 | Data is gathered from allowed sources |
| 5 | Report draft is generated with facts, references, and limitations |
| 6 | Export/publish requires approval and permission |
| 7 | Report artifact is stored if approved |
| 8 | AI report activity is logged |

### 6.9 AI Analytics Diagram

| Step | Flow |
| --- | --- |
| 1 | User requests analysis or opens analytics view |
| 2 | Data scope is permission-filtered |
| 3 | Metrics, trends, risks, forecasts, and anomalies are calculated |
| 4 | AI explanation is generated |
| 5 | Confidence and source references are shown where appropriate |
| 6 | Recommendations are marked as suggestions |
| 7 | Critical recommendations require approval |
| 8 | Analytics access and sensitive outputs are logged |

### 6.10 AI Audit Logging Diagram

| Step | Flow |
| --- | --- |
| 1 | AI request starts |
| 2 | AI log records user, tenant, feature, language, intent, and scope |
| 3 | Permission check result is recorded |
| 4 | Retrieved source metadata is recorded without exposing hidden content |
| 5 | Output classification is recorded |
| 6 | Proposed actions are recorded |
| 7 | Approved actions create audit logs |
| 8 | Blocked or failed attempts are recorded |

### 6.11 AI Human Approval Diagram

| Step | Flow |
| --- | --- |
| 1 | AI proposes action |
| 2 | System classifies risk |
| 3 | Low-risk draft can remain suggestion-only |
| 4 | Critical action enters approval state |
| 5 | User reviews sources, fields, and impact |
| 6 | User approves, edits, rejects, or cancels |
| 7 | Approved action executes using user permissions |
| 8 | Decision is logged |

### 6.12 Multilingual AI Diagram

| Step | Flow |
| --- | --- |
| 1 | Input language is detected |
| 2 | User and client language preferences are checked |
| 3 | Permission-safe context is retrieved |
| 4 | Response language is selected |
| 5 | Arabic output uses RTL-compatible structure |
| 6 | Source titles remain faithful to original language where needed |
| 7 | User can request translation where permitted |
| 8 | Multilingual output is logged with language metadata |

---

## 7. AI Data Access Model

### 7.1 Allowed Data Sources By Permission

| Data Source | AI Access Condition |
| --- | --- |
| CRM leads and opportunities | User has CRM permission and resource scope |
| Clients and contacts | User has client access or client-scoped membership |
| Projects and tasks | User has assigned, managed, or client-visible access |
| Subtasks and dependencies | User can access parent task/project |
| Chat messages | User is channel member and channel visibility allows access |
| Client chat | User belongs to the client scope or agency side with permission |
| Files and versions | User has file access and file is not quarantined or restricted from AI |
| Voice notes and transcripts | User can access source voice note |
| Meetings | User can access meeting or linked client/project/opportunity |
| Approvals | User has approval visibility or reviewer/requester access |
| Reports | User has report access and report scope permission |
| Invoices and payments | Owner, explicit financial grantee, or client-owned approved records |
| Payroll and employee costs | Owner or explicit payroll/employee-cost grant only |
| Profitability and costs | Owner or explicit finance/profitability grant only |
| Audit logs | Owner or explicit audit permission only |

### 7.2 Forbidden AI Data Behaviors

AI must not:

- Use inaccessible records to shape an answer.
- Mention that hidden data exists.
- Reveal unauthorized counts, totals, exceptions, trends, or anomalies.
- Summarize internal notes for client users.
- Summarize payroll, employee costs, profitability, internal financial reports, or financial dashboards to unauthorized users.
- Use cross-tenant data for examples, recommendations, or benchmarks.
- Blend client-visible data with internal-only data in client-facing outputs.
- Execute destructive or external-facing actions without explicit approval.

---

## 8. AI Permission Matrix

| Role | Default AI Access | Financial AI Access | Client-Facing Limits |
| --- | --- | --- | --- |
| Owner | Full tenant AI access subject to enabled modules | Full global financial and payroll AI access | Can generate client-facing content but must approve publishing |
| Manager | Operational AI access for granted or assigned modules | No global financial/payroll access unless explicitly granted | Can generate client-safe content for assigned clients/projects |
| Employee | AI over own and assigned work only | No global financial/payroll access | Cannot expose internal-only content to clients |
| Client | Client-safe AI over own client-visible records only | Own invoices, payments, wallet balance, approved financial documents only | Cannot access internal agency records, payroll, costs, profitability, audit logs |

---

## 9. Module Specification: AI Assistant

| Required Area | Specification |
| --- | --- |
| Purpose | Answer questions, summarize accessible platform data, explain records, help navigation, and support multilingual assistance |
| Users | Owner, Manager, Employee, Client |
| Inputs | Natural language prompts, selected record context, user scope, language preference |
| Outputs | Answers, summaries, navigation guidance, source references, access-denied explanations |
| Data sources | Projects, tasks, clients, CRM, chat, files, voice transcripts, invoices, reports, approvals, finance where permitted |
| Required permissions | `ai.use` plus permission to each referenced resource |
| User actions | Ask question, choose scope, open source, request summary, request translation |
| AI actions | Retrieve allowed context, answer, summarize, cite sources, label facts and suggestions |
| Human approval requirements | Required before any create/update/send/export/publish action |
| Workflows | AI assistant question-answer workflow, multilingual response workflow, permission check workflow |
| Notifications | Optional notification when long-running answer or summary is ready |
| Audit log requirements | AI log for all interactions; audit log for sensitive financial, client-facing, export, or blocked access events |
| Reports | AI usage by feature, denied AI requests, assistant quality report |
| KPIs | Response usefulness, source coverage, access-denied rate, hallucination reports, average response time |
| Edge cases | No accessible data, ambiguous prompt, mixed-language prompt, hidden financial request, client asks about another client |
| Failure handling | Return safe denial or limitation; do not expose hidden records; log blocked request |
| Acceptance criteria | Assistant answers only from accessible data, supports Arabic/English/German, references sources where possible, and clearly states access denial or unavailable data |

---

## 10. Module Specification: AI Copilot

| Required Area | Specification |
| --- | --- |
| Purpose | Help draft tasks, subtasks, follow-ups, meeting notes, proposals, reports, project plans, and structured operational changes |
| Users | Owner, Manager, Employee; Client for client-safe drafts where enabled |
| Inputs | Prompt, selected record, chat message, voice note, meeting transcript, template, project/client context |
| Outputs | Draft tasks, subtasks, follow-ups, plans, notes, proposals, reports, recommendations |
| Data sources | Tasks, projects, CRM, meetings, chat, files, voice notes, templates, workload, skills, reports |
| Required permissions | `ai.use` plus target module create/update permission before saving |
| User actions | Generate draft, edit draft, approve creation, reject suggestion, change assignee, change visibility |
| AI actions | Draft structured output, suggest assignees, suggest due dates, identify subtasks, recommend improvements |
| Human approval requirements | Required before saving important changes, assigning work, publishing, sending, or creating client-visible records |
| Workflows | AI copilot task creation workflow, AI recommendation workflow, AI human approval workflow |
| Notifications | Notify assignee only after human-approved task creation |
| Audit log requirements | AI log for proposal; audit log for approved creation or sensitive action |
| Reports | Copilot suggestions report, accepted/rejected suggestions report |
| KPIs | Draft acceptance rate, edit distance, time saved, task creation accuracy, rejected-risk rate |
| Edge cases | Suggested assignee unavailable, project inactive, insufficient task permission, client-visible risk, conflicting due date |
| Failure handling | Keep output as draft only; show reason if creation is blocked |
| Acceptance criteria | Copilot never saves important changes without approval and never assigns users automatically unless admin policy explicitly allows it |

---

## 11. Module Specification: AI Analyst

| Required Area | Specification |
| --- | --- |
| Purpose | Analyze CRM, projects, productivity, profitability, payroll, invoices, payments, workload, client performance, and risks |
| Users | Owner, Manager with assigned scope, Employee for personal analytics, Client for approved client analytics |
| Inputs | Analytics request, date range, filters, dashboard context, report context |
| Outputs | Insights, trends, risks, forecasts, anomalies, explanations, recommendations, confidence level |
| Data sources | CRM, projects, tasks, timesheets, workload, approvals, invoices, payments, finance, payroll, reports, dashboards |
| Required permissions | `ai.analytics.read` plus underlying data permissions; finance/payroll grants required for financial analysis |
| User actions | Request analysis, filter scope, open sources, approve recommendation, export if permitted |
| AI actions | Analyze data, detect anomalies, forecast trends, explain metrics, recommend actions |
| Human approval requirements | Required for critical recommendations and any operational/financial action |
| Workflows | AI analytics workflow, AI financial data access workflow, AI recommendation workflow |
| Notifications | Risk detected, anomaly detected, low confidence, analytics ready |
| Audit log requirements | AI log for analytics; audit log for financial analytics, exports, sensitive insights, and approvals |
| Reports | AI analytics report, anomaly report, forecast accuracy report, financial analytics usage |
| KPIs | Forecast accuracy, anomaly precision, recommendation acceptance, insight usage, blocked unauthorized analytics |
| Edge cases | Sparse data, stale data, conflicting metrics, unapproved payroll, unauthorized financial scope |
| Failure handling | Mark confidence low, explain limitations, avoid unsupported conclusions |
| Acceptance criteria | Analyst applies role-specific visibility: Owner global, Manager assigned/granted, Employee personal, Client own approved data only |

---

## 12. Module Specification: Voice To Task

| Required Area | Specification |
| --- | --- |
| Purpose | Convert voice notes into structured task drafts while preserving original audio, transcript, extraction, and approval trail |
| Users | Owner, Manager, Employee; Client where client voice notes are enabled |
| Inputs | Recorded voice note, uploaded audio, selected project/client/task context |
| Outputs | Transcript, language, task title, description, assignee suggestion, due date, priority, project/client, subtasks, final approved task |
| Data sources | Voice notes, files, projects, tasks, clients, team workload, skills, templates |
| Required permissions | Voice note access, `ai.use`, task create permission for final creation |
| User actions | Record/upload audio, review transcript, edit extracted task, approve task creation |
| AI actions | Detect language, transcribe, summarize, extract task fields, suggest assignee and due date |
| Human approval requirements | Required before task or subtask creation |
| Workflows | Voice-to-task workflow, multilingual AI response workflow, human approval workflow |
| Notifications | Transcription completed, transcription failed, task created, assignee notified after approval |
| Audit log requirements | AI log for transcription/extraction; audit log for task creation from voice |
| Reports | Voice-to-task usage, transcription failure report, created tasks from voice |
| KPIs | Transcription accuracy, extraction acceptance rate, task creation conversion, language detection accuracy |
| Edge cases | Poor audio, multiple languages, missing assignee, inaccessible project, client-visible voice note risk |
| Failure handling | Preserve audio, mark transcription failed, allow manual transcript, block task creation if permission fails |
| Acceptance criteria | Original voice, transcript, extraction result, and final approved task are linked and logged |

---

## 13. Module Specification: Meeting To Tasks

| Required Area | Specification |
| --- | --- |
| Purpose | Convert meeting notes, transcripts, or voice uploads into summaries, decisions, action items, risks, follow-ups, and approved tasks |
| Users | Owner, Manager, Employee; Client participants where meeting is client-visible |
| Inputs | Meeting notes, transcript, voice upload, participant list, linked CRM/project/client/opportunity |
| Outputs | Summary, decisions, action items, owners, due dates, risks, follow-ups, task drafts |
| Data sources | Meetings, meeting participants, CRM, opportunities, projects, clients, tasks, voice notes, files, chat |
| Required permissions | Meeting access, participant/resource visibility, `ai.use`, task create permission for final tasks |
| User actions | Upload notes, generate summary, edit action items, approve tasks, publish client-safe summary |
| AI actions | Summarize meeting, extract decisions, extract action items, suggest owners and due dates, link records |
| Human approval requirements | Required before task creation or client-facing summary publication |
| Workflows | Meeting-to-tasks workflow, human approval workflow, client-facing assistant workflow |
| Notifications | Meeting summary ready, task approval pending, tasks created, follow-up reminder |
| Audit log requirements | AI log for summary; audit log for approved task creation or client publication |
| Reports | Meeting action item report, meeting-to-task conversion report |
| KPIs | Action item extraction accuracy, task approval rate, follow-up completion rate |
| Edge cases | Participant lacks access, client-visible meeting contains internal notes, unclear owner, conflicting dates |
| Failure handling | Produce draft only, flag sensitive content, block publication if visibility fails |
| Acceptance criteria | Generated tasks link to correct project/client/opportunity and respect participant permissions and client visibility |

---

## 14. Module Specification: AI Search

| Required Area | Specification |
| --- | --- |
| Purpose | Search across MAOS records using permission-safe natural language retrieval |
| Users | Owner, Manager, Employee, Client |
| Inputs | Search query, filters, language, selected scope |
| Outputs | Results grouped by source type with title, snippet, object link, source type, permission-safe explanation |
| Data sources | Projects, tasks, files, chat, voice transcripts, CRM, invoices, reports, approvals, meetings |
| Required permissions | `ai.search` or `ai.use` plus source object permissions |
| User actions | Search, filter, open result, refine query |
| AI actions | Interpret query, retrieve allowed records, rank results, generate safe snippets |
| Human approval requirements | Not required for read-only permitted search; required if converting result into action |
| Workflows | AI search workflow, AI permission check workflow |
| Notifications | None by default; optional saved-search alerts where permitted |
| Audit log requirements | AI log for searches; audit sensitive searches where finance, payroll, audit, or client data is involved |
| Reports | AI search usage, zero-result searches, blocked-search attempts |
| KPIs | Search success rate, click-through rate, denied result attempts, average retrieval time |
| Edge cases | Hidden results, ambiguous names across clients, financial query by unauthorized user, multilingual query |
| Failure handling | Return no permitted results without revealing hidden counts or existence |
| Acceptance criteria | Search never reveals unauthorized result count, hidden snippets, hidden titles, or inaccessible source hints |

---

## 15. Module Specification: AI Reporting

| Required Area | Specification |
| --- | --- |
| Purpose | Generate permission-safe reports and explanations for operations, CRM, projects, tasks, clients, finance, payroll, workload, approvals, and BI |
| Users | Owner, authorized Manager, Employee for own/assigned scope, Client for approved client reports |
| Inputs | Report type, filters, date range, language, audience, export/publish intent |
| Outputs | Draft report, summary, charts description, source references, limitations, export-ready artifact where approved |
| Data sources | Reports, dashboards, CRM, tasks, projects, finance, payroll, payments, approvals, workload |
| Required permissions | Report permission plus each underlying data permission; financial report permissions for finance/payroll |
| User actions | Generate, review, edit, save, export, schedule, publish to client |
| AI actions | Draft report, explain metrics, identify risks, format executive summary, translate report |
| Human approval requirements | Required for exports, scheduled delivery, client publication, financial reports, and sensitive reports |
| Workflows | AI reporting workflow, AI financial data access workflow, human approval workflow |
| Notifications | Report ready, scheduled report ready, approval required, client report published |
| Audit log requirements | AI log for generation; audit log for export, schedule, publish, financial report access |
| Reports | AI-generated report inventory, report export audit, client report publication report |
| KPIs | Report generation time, approval rate, export rate, client report safety incidents |
| Edge cases | Report includes mixed visibility data, financial data without permission, stale metrics, unsupported language |
| Failure handling | Remove inaccessible sections, show access limitations, block export/publication if permission fails |
| Acceptance criteria | Financial reports follow Owner Only Financial Access and client reports include only client-approved/client-visible data |

---

## 16. Module Specification: AI Analytics

| Required Area | Specification |
| --- | --- |
| Purpose | Generate insights, trends, risks, forecasts, anomalies, recommendations, and explanatory analytics |
| Users | Owner, authorized Manager, Employee for personal analytics, Client for own approved analytics |
| Inputs | Analytics request, dashboard context, report context, time period, comparison scope |
| Outputs | Insights, trends, anomalies, forecasts, confidence level, recommendations, source references |
| Data sources | CRM, projects, tasks, time tracking, workload, approvals, finance, payroll, invoices, payments, reports |
| Required permissions | `ai.analytics.read` and underlying data permissions; finance/payroll grants for financial analytics |
| User actions | Request insight, filter analytics, open sources, approve recommendation |
| AI actions | Detect trends, calculate risks, explain anomalies, generate forecasts, suggest actions |
| Human approval requirements | Required for critical recommendations or actions that affect work, client communication, finance, payroll, or reporting |
| Workflows | AI analytics workflow, AI recommendation workflow |
| Notifications | Risk alert, anomaly alert, forecast available, low confidence warning |
| Audit log requirements | AI analytics log; audit log for sensitive analytics, financial analytics, and approved recommendations |
| Reports | AI analytics usage, recommendation outcome report, anomaly tracking report |
| KPIs | Recommendation acceptance, anomaly precision, forecast error, confidence calibration |
| Edge cases | Insufficient data, biased sample, stale records, hidden financial source, unapproved payroll |
| Failure handling | Mark low confidence, avoid unsupported claims, request narrower scope, block unauthorized access |
| Acceptance criteria | Analytics separates facts from suggestions and never makes final business decisions automatically |

---

## 17. Module Specification: AI Permissions & Security

| Required Area | Specification |
| --- | --- |
| Purpose | Enforce AI access rules across tenant, role, permission, client scope, file visibility, financial restrictions, and action safety |
| Users | All users; Owner and authorized admin for configuration |
| Inputs | User identity, tenant, role, permission, client scope, resource scope, requested action |
| Outputs | Allow, deny, partial scope, approval required, audit required |
| Data sources | Users, tenant memberships, roles, permissions, resource metadata, visibility, finance permissions |
| Required permissions | Depends on AI feature and target module; `ai.manage` for configuration |
| User actions | Request AI use, configure AI permissions, review denied access, grant/revoke AI permissions |
| AI actions | None until permission gates pass |
| Human approval requirements | Required for sensitive permission grants and critical AI actions |
| Workflows | AI permission check workflow, AI financial data access workflow |
| Notifications | Sensitive AI permission granted/revoked, blocked access event where configured |
| Audit log requirements | Audit sensitive grants, revocations, blocked access, financial AI access, export attempts |
| Reports | AI permission report, blocked AI access report, financial AI access report |
| KPIs | Blocked unauthorized attempts, users with AI access, sensitive AI actions, permission changes |
| Edge cases | User has AI permission but not source permission, client asks cross-client question, revoked permission mid-session |
| Failure handling | Deny safely; do not reveal hidden data; invalidate stale context |
| Acceptance criteria | AI cannot bypass RBAC, client boundaries, tenant isolation, file rules, or financial restrictions |

---

## 18. Module Specification: AI Audit Logs

| Required Area | Specification |
| --- | --- |
| Purpose | Preserve traceability for AI requests, responses, retrieval scopes, proposed actions, approvals, failures, and blocked attempts |
| Users | Owner, authorized auditors, security admins where explicitly granted |
| Inputs | AI request metadata, user, tenant, feature, language, scope, permission result, action result |
| Outputs | AI log, audit log where sensitive, activity log where user-facing |
| Data sources | AI interactions, permissions, target records, approval decisions, outputs |
| Required permissions | `audit.read` or AI audit-specific permission |
| User actions | View logs, filter logs, export logs, investigate blocked attempts |
| AI actions | Generate metadata and classify sensitivity |
| Human approval requirements | Required before exporting audit data |
| Workflows | AI audit logging workflow |
| Notifications | Sensitive AI action, blocked financial AI attempt, failed critical action |
| Audit log requirements | AI logs for all AI use; audit logs for sensitive, financial, client-facing, approval, export, or blocked events |
| Reports | AI audit report, blocked action report, financial AI access report |
| KPIs | AI usage volume, blocked attempts, sensitive actions, audit completeness |
| Edge cases | Failed response generation, permission denied before retrieval, output rejected by safety filter |
| Failure handling | Log failure metadata without exposing hidden content |
| Acceptance criteria | Every AI interaction is traceable and every sensitive AI action creates an audit log |

---

## 19. Module Specification: AI Human Approval Layer

| Required Area | Specification |
| --- | --- |
| Purpose | Ensure AI-generated changes and high-risk recommendations are reviewed by humans before execution |
| Users | Owner, Manager, Employee, Client where client approval is required |
| Inputs | Proposed action, affected records, risk classification, sources, generated content |
| Outputs | Approved action, edited action, rejected action, cancelled action, approval log |
| Data sources | AI action proposals, approvals, target modules, audit logs |
| Required permissions | User must have permission to approve and execute target action |
| User actions | Review, edit, approve, reject, cancel |
| AI actions | Prepare proposal, show source references, classify risk, explain impact |
| Human approval requirements | Always required for critical, financial, external-facing, client-visible, destructive, assignment, export, send, approval, or payroll-related actions |
| Workflows | AI human approval workflow |
| Notifications | Approval requested, approval completed, action rejected |
| Audit log requirements | Approval decision, approver, timestamp, before/after proposed fields, action result |
| Reports | AI approval queue report, approval outcome report |
| KPIs | Approval rate, rejection rate, average approval time, edited-before-approval rate |
| Edge cases | Approver lacks permission, proposal expires, source record changes before approval |
| Failure handling | Block execution and require regeneration or review |
| Acceptance criteria | AI cannot execute critical actions without explicit human approval |

---

## 20. Module Specification: AI Data Access Rules

| Required Area | Specification |
| --- | --- |
| Purpose | Define what AI may retrieve, summarize, transform, cite, and use for suggestions |
| Users | All AI users; admins for policy configuration |
| Inputs | Request intent, resource scope, visibility labels, user permissions, client scope |
| Outputs | Allowed data scope, denied scope, redacted context, source list |
| Data sources | All platform modules subject to permission and visibility |
| Required permissions | Source-specific permissions plus AI capability permission |
| User actions | Select scope, request source explanation, request narrower analysis |
| AI actions | Filter retrieval, redact inaccessible fields, cite permitted sources |
| Human approval requirements | Required when broadening scope or using sensitive data in output/export |
| Workflows | AI permission check workflow, AI search workflow |
| Notifications | None by default; security alerts for repeated blocked attempts |
| Audit log requirements | Log sensitive retrieval, blocked retrieval, financial retrieval, audit-log retrieval |
| Reports | Data access policy report, blocked source report |
| KPIs | Retrieval precision, blocked retrieval count, redaction events |
| Edge cases | Source deleted, permission revoked mid-request, mixed internal/client-visible context |
| Failure handling | Exclude unsafe sources, explain only that accessible data is unavailable |
| Acceptance criteria | AI output is generated only from allowed sources and cannot leak hidden context |

---

## 21. Module Specification: AI Multilingual Behavior

| Required Area | Specification |
| --- | --- |
| Purpose | Support Arabic, English, and German AI interactions while preserving meaning, access control, and UI directionality |
| Users | All users |
| Inputs | Prompt language, user preference, client preference, tenant default, source language |
| Outputs | Response in selected language, translated summary where permitted, RTL Arabic output where relevant |
| Data sources | User preferences, client preferences, localization settings, source records |
| Required permissions | AI permission and source permissions; translation does not bypass access |
| User actions | Ask in Arabic/English/German, request translation, switch response language |
| AI actions | Detect language, translate accessible content, preserve source references |
| Human approval requirements | Required before publishing translated client-facing content |
| Workflows | Multilingual AI response workflow |
| Notifications | Translation ready where long-running |
| Audit log requirements | Log language metadata and client-facing translated outputs |
| Reports | Multilingual usage report, translation quality feedback |
| KPIs | Language detection accuracy, translation correction rate, RTL rendering issues |
| Edge cases | Mixed-language prompts, Arabic with English project names, German client output from English source |
| Failure handling | Ask for clarification or provide safe partial response in preferred language |
| Acceptance criteria | Arabic, English, and German are supported without permission leakage or directionality errors |

---

## 22. Module Specification: AI Notifications

| Required Area | Specification |
| --- | --- |
| Purpose | Notify users about AI-generated drafts, summaries, risks, approvals, reports, failed jobs, and completed long-running tasks |
| Users | Owner, Manager, Employee, Client where permitted |
| Inputs | AI job status, approval request, task creation, report generation, anomaly detection |
| Outputs | In-app notifications, email notifications where enabled, client-safe notifications |
| Data sources | Notifications, AI logs, approval records, task/report/job state |
| Required permissions | Notification recipient must have access to the underlying record |
| User actions | Open notification, approve/reject, mute, configure preference |
| AI actions | Trigger notification event after permission-safe output |
| Human approval requirements | Required before sending external or client-facing AI-generated messages |
| Workflows | AI reporting workflow, human approval workflow, recommendation workflow |
| Notifications | AI summary ready, AI report ready, AI approval needed, AI action failed, AI risk detected |
| Audit log requirements | Audit client-facing and sensitive notifications |
| Reports | AI notification delivery report, failed AI notification report |
| KPIs | Delivery success, open rate, approval response time |
| Edge cases | Recipient loses permission, client notification contains internal wording, failed delivery |
| Failure handling | Suppress unsafe notification, log failure, notify owner/admin when sensitive |
| Acceptance criteria | Notifications never include unauthorized content or sensitive hidden summaries |

---

## 23. Module Specification: AI Suggested Actions

| Required Area | Specification |
| --- | --- |
| Purpose | Produce safe, explainable suggestions for next steps, risks, follow-ups, task improvements, report actions, and operational decisions |
| Users | Owner, Manager, Employee, Client where client-safe suggestions are enabled |
| Inputs | Current record, workflow state, due dates, workload, CRM stage, approval status, report insight |
| Outputs | Suggested actions with rationale, confidence, source references, approval requirement |
| Data sources | CRM, projects, tasks, meetings, chat, approvals, reports, workload, finance where permitted |
| Required permissions | AI permission plus underlying data and action permission |
| User actions | Accept, edit, reject, dismiss, convert to task |
| AI actions | Recommend action, classify confidence, explain reason, identify source |
| Human approval requirements | Required before any action is saved, assigned, sent, exported, published, approved, or financially applied |
| Workflows | AI recommendation workflow, AI human approval workflow |
| Notifications | Suggested action available, approval required, suggestion accepted/rejected |
| Audit log requirements | AI log for suggestions; audit log for sensitive accepted actions |
| Reports | Recommendation outcome report, suggestion quality report |
| KPIs | Acceptance rate, completion rate, rejection reasons, false-positive rate |
| Edge cases | Suggestion based on stale data, conflicting recommendations, hidden source unavailable |
| Failure handling | Mark suggestion stale, request refresh, avoid action if source is unavailable |
| Acceptance criteria | Suggestions are clearly labeled as suggestions and never treated as confirmed decisions |

---

## 24. Module Specification: AI Task Creation

| Required Area | Specification |
| --- | --- |
| Purpose | Convert AI suggestions, chat messages, voice notes, meeting action items, and reports into structured tasks or subtasks |
| Users | Owner, Manager, Employee; Client where client task creation is enabled |
| Inputs | Draft content, selected source, project/client, title, description, priority, due date, assignee, subtasks |
| Outputs | Task draft, subtask draft, approved created task, source links |
| Data sources | Tasks, subtasks, projects, clients, chat messages, voice notes, meetings, reports, templates, skills, workload |
| Required permissions | `ai.use`, task create permission, project/task access, assignee visibility |
| User actions | Review draft, edit fields, choose assignee, choose visibility, approve creation |
| AI actions | Extract structured fields, suggest assignee by skills/workload, suggest subtasks, link sources |
| Human approval requirements | Required before task or subtask creation |
| Workflows | AI copilot task creation workflow, voice-to-task workflow, meeting-to-tasks workflow |
| Notifications | Task created, assignee notified, task creation failed |
| Audit log requirements | AI log for extraction; activity log and audit log where sensitive or client-visible |
| Reports | AI-created tasks report, task source report |
| KPIs | Task creation acceptance, field correction rate, completion rate of AI-created tasks |
| Edge cases | Inactive project, unavailable assignee, missing due date, client visibility mismatch |
| Failure handling | Keep as draft, show blocked reason, allow user correction |
| Acceptance criteria | AI-created tasks are never created without confirmation and always link to source where possible |

---

## 25. Module Specification: AI Meeting Summaries

| Required Area | Specification |
| --- | --- |
| Purpose | Summarize meetings and extract decisions, risks, action items, owners, due dates, and follow-ups |
| Users | Meeting participants with access, Owner, Manager, Employee, Client participants where permitted |
| Inputs | Meeting notes, transcript, voice recording, chat context, linked CRM/project/client |
| Outputs | Summary, decisions, risks, follow-ups, task drafts, client-safe version where approved |
| Data sources | Meetings, voice notes, files, chat, CRM, projects, tasks |
| Required permissions | Meeting access, voice/file access, AI permission |
| User actions | Generate summary, edit summary, approve sharing, create tasks |
| AI actions | Summarize, extract decisions, detect risks, draft follow-up, draft tasks |
| Human approval requirements | Required before sharing summary externally or creating tasks |
| Workflows | Meeting-to-tasks workflow, client-facing assistant workflow |
| Notifications | Summary ready, follow-up due, task drafts pending approval |
| Audit log requirements | AI log for summary; audit log for client publication or sensitive meeting summary |
| Reports | Meeting summary report, action item extraction report |
| KPIs | Summary acceptance, action item completion, client-safe publication rate |
| Edge cases | Transcript includes internal notes, client participant lacks access, multiple languages |
| Failure handling | Generate internal-only draft, block client sharing until reviewed |
| Acceptance criteria | Client-facing summaries contain only client-visible content and approved wording |

---

## 26. Module Specification: AI Client-Facing AI Rules

| Required Area | Specification |
| --- | --- |
| Purpose | Define strict client-safe AI behavior for client portal users and client-facing outputs |
| Users | Client users, agency users preparing client-facing content |
| Inputs | Client prompt, client portal context, client-visible records, approved documents |
| Outputs | Client-safe answers, summaries, reports, invoice/payment explanations, approved project updates |
| Data sources | Client-visible projects, tasks, files, approvals, chat, reports, invoices, payments, wallet balance where enabled |
| Required permissions | Client portal access and client-scoped resource visibility |
| User actions | Ask client assistant, request summary, open source, request clarification |
| AI actions | Answer from client-visible data only, explain approved records, avoid internal context |
| Human approval requirements | Required for agency-generated client-facing messages, reports, summaries, and recommendations |
| Workflows | AI client-facing assistant workflow |
| Notifications | Client-safe summary ready, client question answered, approval needed before publication |
| Audit log requirements | AI log for client requests; audit log for published client-facing AI output where sensitive |
| Reports | Client AI usage report, client-safe output review report |
| KPIs | Client assistant resolution rate, blocked unsafe request rate, client satisfaction feedback |
| Edge cases | Client asks about internal work, other clients, payroll, costs, profitability, audit logs |
| Failure handling | Return access-safe denial without revealing hidden data |
| Acceptance criteria | Client-facing AI never exposes internal agency data, payroll, employee costs, profitability, hidden files, other clients, or audit logs |

---

## 27. Module Specification: AI Admin Controls

| Required Area | Specification |
| --- | --- |
| Purpose | Allow Owners and authorized admins to configure AI availability, permissions, language behavior, approval rules, logging, and feature limits |
| Users | Owner, authorized AI admin |
| Inputs | Tenant AI settings, feature toggles, permissions, model/provider policy, retention policy, approval policy |
| Outputs | AI configuration, enabled/disabled modules, approval thresholds, audit settings |
| Data sources | Tenant settings, roles, permissions, AI logs, audit logs, billing entitlements |
| Required permissions | `ai.manage` and Owner approval for sensitive AI settings |
| User actions | Enable/disable AI feature, set retention, configure approval rules, manage language defaults, review usage |
| AI actions | None for configuration execution; AI may explain settings if permitted |
| Human approval requirements | Owner approval required for enabling sensitive AI over finance, payroll, client data, files, or reports |
| Workflows | AI permission check workflow, human approval workflow |
| Notifications | AI feature enabled/disabled, sensitive AI setting changed, usage limit reached |
| Audit log requirements | Audit all AI admin changes |
| Reports | AI admin settings report, AI usage and cost report, policy change history |
| KPIs | Enabled AI features, usage by module, blocked attempts, cost per tenant |
| Edge cases | Disabling AI with active jobs, changing retention, enabling client AI without client boundary policy |
| Failure handling | Preserve logs, cancel or pause jobs safely, notify Owner |
| Acceptance criteria | Admin controls cannot weaken tenant isolation, client boundaries, financial restrictions, or audit logging |

---

## 28. Module Specification: AI Performance & Quality Monitoring

| Required Area | Specification |
| --- | --- |
| Purpose | Monitor AI quality, latency, safety, usage, blocked attempts, model performance, and user feedback |
| Users | Owner, AI admin, security auditor, product/admin operators |
| Inputs | AI logs, feedback, error events, latency, approval outcomes, blocked attempts, report usage |
| Outputs | Quality dashboards, performance reports, safety reports, improvement backlog |
| Data sources | AI logs, audit logs, activity logs, notifications, user feedback, admin settings |
| Required permissions | `ai.manage`, `audit.read`, or explicit monitoring permission |
| User actions | Review quality, inspect failures, export safety report, tune settings |
| AI actions | Summarize quality trends and suggest improvements using permitted logs |
| Human approval requirements | Required before policy changes or model/provider changes |
| Workflows | AI audit logging workflow, AI recommendation workflow |
| Notifications | Quality degradation, high blocked-attempt rate, latency breach, failed AI job spike |
| Audit log requirements | Audit monitoring exports and AI policy changes |
| Reports | AI quality report, safety report, performance report, multilingual quality report |
| KPIs | Latency, failure rate, user satisfaction, hallucination reports, blocked attempt rate, source citation coverage |
| Edge cases | Missing feedback, high false-positive safety blocks, multilingual quality drift |
| Failure handling | Alert admin, degrade feature gracefully, disable unsafe capability if needed |
| Acceptance criteria | AI quality, safety, and performance are measurable and auditable |

---

## 29. Required Workflow Specifications

### 29.1 AI Assistant Question-Answer Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User submits question |
| 2 | System detects language and intent |
| 3 | System resolves tenant, membership, role, permissions, client scope, and resource scope |
| 4 | Retrieval includes only accessible sources |
| 5 | AI generates answer with source references where possible |
| 6 | Answer labels confirmed data and suggestions |
| 7 | Access-denied or unavailable data is stated safely |
| 8 | AI log is created |

### 29.2 AI Copilot Task Creation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User asks Copilot to create task or subtask |
| 2 | System checks AI and task creation permissions |
| 3 | AI extracts fields and source references |
| 4 | AI suggests assignee, due date, priority, and subtasks |
| 5 | User reviews and edits draft |
| 6 | User confirms creation |
| 7 | Task is created under user permissions |
| 8 | Logs and notifications are created |

### 29.3 Voice-To-Task Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User records or uploads voice |
| 2 | Audio is stored with tenant, file, and visibility metadata |
| 3 | AI detects Arabic, English, or German |
| 4 | Transcript is generated |
| 5 | AI extracts task fields and subtasks |
| 6 | User reviews transcript and task draft |
| 7 | User approves task creation |
| 8 | Task links to original voice note, transcript, extraction, and approval log |

### 29.4 Meeting-To-Tasks Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User provides meeting note, transcript, or voice upload |
| 2 | System checks meeting and linked resource permissions |
| 3 | AI generates summary, decisions, risks, action items, owners, due dates, and follow-ups |
| 4 | User reviews generated outputs |
| 5 | User edits or approves task drafts |
| 6 | Approved tasks link to meeting and source records |
| 7 | Client-visible summary requires client-safe review |
| 8 | Logs and notifications are created |

### 29.5 AI Search Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User submits search query |
| 2 | AI detects language and search intent |
| 3 | System checks permissions for each searchable source |
| 4 | Search retrieves only permitted results |
| 5 | Results show source type, title, safe snippet, and object link |
| 6 | Unauthorized result counts are not shown |
| 7 | User opens permitted result |
| 8 | Search event is logged where required |

### 29.6 AI Reporting Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User requests report |
| 2 | System detects report type and sensitivity |
| 3 | Permissions are checked across all included modules |
| 4 | AI drafts report with facts, sources, and limitations |
| 5 | Financial or client-facing report enters approval gate |
| 6 | User approves export, schedule, or publication |
| 7 | Report is saved/exported/published where permitted |
| 8 | AI and audit logs are created |

### 29.7 AI Analytics Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User requests analytics or opens AI analytics panel |
| 2 | System resolves user-visible metrics and records |
| 3 | AI analyzes trends, risks, forecasts, anomalies, and recommendations |
| 4 | Output includes confidence where appropriate |
| 5 | Facts and suggestions are separated |
| 6 | Critical recommendation requires approval |
| 7 | User accepts, rejects, or converts recommendation |
| 8 | Logs are created |

### 29.8 AI Permission Check Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | AI request is received |
| 2 | Tenant and session are validated |
| 3 | User role and permissions are evaluated |
| 4 | Resource visibility and client scope are evaluated |
| 5 | Financial/payroll rules are evaluated |
| 6 | Allowed retrieval scope is built |
| 7 | Denied scope is excluded silently |
| 8 | Permission result is logged where required |

### 29.9 AI Human Approval Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | AI produces proposed action |
| 2 | System classifies action risk |
| 3 | Critical action enters approval state |
| 4 | User reviews sources, fields, and impact |
| 5 | User edits, approves, rejects, or cancels |
| 6 | Approved action executes under user permissions |
| 7 | Rejected action remains draft or is discarded |
| 8 | Decision is logged |

### 29.10 AI Client-Facing Assistant Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Client asks question in portal |
| 2 | System resolves tenant and client membership |
| 3 | AI retrieves only client-visible records for that client |
| 4 | AI excludes internal notes, payroll, costs, profitability, audit logs, and other clients |
| 5 | AI answers with approved sources where possible |
| 6 | If access is unavailable, AI states limitation safely |
| 7 | Client can open permitted source links |
| 8 | AI log is created |

### 29.11 AI Financial Data Access Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | User asks about finance, payroll, costs, profit, invoices, payments, or wallets |
| 2 | System classifies financial sensitivity |
| 3 | Owner or explicit financial grant is required for global finance |
| 4 | Payroll requires Owner or explicit payroll authorization |
| 5 | Client users are limited to own invoices, payments, wallet balance, and approved financial documents |
| 6 | Unauthorized financial data is excluded without hidden hints |
| 7 | Permitted answer is generated with source references |
| 8 | Sensitive access or blocked attempt is logged |

### 29.12 AI Audit Logging Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | AI request starts |
| 2 | AI log captures tenant, user, feature, language, intent, and scope |
| 3 | Permission result is recorded |
| 4 | Retrieved source metadata is recorded safely |
| 5 | Output and proposed actions are classified |
| 6 | Sensitive allowed actions create audit logs |
| 7 | Blocked or failed actions are logged |
| 8 | Logs are available to authorized auditors only |

### 29.13 Multilingual AI Response Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | System detects input language |
| 2 | User preference and client preference are checked |
| 3 | AI retrieves permission-safe context |
| 4 | Response language is selected |
| 5 | Arabic responses are prepared for RTL display |
| 6 | Source references retain accurate source identity |
| 7 | Translation is provided only for accessible content |
| 8 | Language metadata is logged |

### 29.14 AI Recommendation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | AI detects possible recommendation from context |
| 2 | Source permissions are checked |
| 3 | AI generates recommendation with rationale and confidence |
| 4 | Recommendation is labeled as suggestion |
| 5 | Critical recommendation enters approval gate |
| 6 | User approves, edits, dismisses, or converts to task |
| 7 | Accepted action executes under user permissions |
| 8 | Outcome is logged for quality monitoring |

---

## 30. AI Reports Catalog

Required AI reports:

- AI usage report.
- AI feature adoption report.
- AI assistant quality report.
- AI copilot acceptance report.
- AI task creation report.
- Voice-to-task conversion report.
- Meeting summary report.
- AI search usage report.
- AI reporting report.
- AI analytics report.
- AI permission denial report.
- AI blocked financial access report.
- AI audit report.
- AI multilingual usage report.
- AI recommendation outcome report.
- AI performance and quality report.

---

## 31. AI KPI Catalog

Required AI KPIs:

- Total AI requests.
- Requests by role.
- Requests by language.
- Requests by feature.
- Permission-denied AI requests.
- Blocked financial AI requests.
- Source citation coverage.
- Answer usefulness score.
- Draft acceptance rate.
- Human approval rate.
- Rejection rate.
- Task creation conversion rate.
- Voice transcription accuracy.
- Meeting action item acceptance rate.
- AI search click-through rate.
- Report export approval rate.
- Analytics recommendation acceptance.
- Average AI response time.
- Failed AI job rate.
- Safety incident count.
- Hallucination report count.

---

## 32. AI Edge Case Register

| Edge Case | Required Handling |
| --- | --- |
| User asks for data outside permission | Deny safely and do not reveal hidden data |
| Client asks about another client | Deny safely and cite client boundary |
| Manager asks for payroll without grant | Deny and log blocked financial attempt |
| Employee asks for global finance | Deny and provide allowed personal/assigned scope only |
| AI source changed after draft | Mark draft stale and require refresh |
| Mixed internal and client-visible sources | Generate internal-only draft or require client-safe review |
| Missing source references | State that source references are unavailable and lower confidence where appropriate |
| Conflicting source data | Surface conflict and avoid final conclusion |
| Multilingual ambiguity | Ask clarification or respond in user preference |
| Poor voice audio | Preserve audio, mark transcription low-confidence, allow manual correction |
| Meeting participant lacks access | Exclude restricted content for that participant |
| Financial report includes payroll | Require Owner or explicit payroll grant |
| Hidden search results exist | Do not show hidden count or hints |
| AI provider failure | Return safe failure state and log failure |
| Permission revoked mid-session | Invalidate AI context and re-check permissions |

---

## 33. AI Failure Handling

AI failure handling must follow these rules:

- Prefer safe denial over risky partial disclosure.
- Never fabricate facts, source references, metrics, or approvals.
- State uncertainty when confidence is low.
- Separate unavailable data from access-denied data where doing so does not reveal hidden information.
- Mark stale drafts when source records change.
- Require regeneration when permissions, scope, or source records change.
- Log failed AI requests and blocked sensitive attempts.
- Notify users only with permission-safe failure details.

---

## 34. AI Acceptance Criteria

Phase 9 is accepted when:

- AI Assistant is fully specified.
- AI Copilot is fully specified.
- AI Analyst is fully specified.
- Voice To Task is fully specified.
- Meeting To Tasks is fully specified.
- AI Search is fully specified.
- AI Reporting is fully specified.
- AI Analytics is fully specified.
- AI Permissions & Security is fully specified.
- AI Audit Logs are fully specified.
- AI Human Approval Layer is fully specified.
- AI Data Access Rules are fully specified.
- AI Multilingual Behavior is fully specified.
- AI Notifications are fully specified.
- AI Suggested Actions are fully specified.
- AI Task Creation is fully specified.
- AI Meeting Summaries are fully specified.
- AI Client-Facing AI Rules are fully specified.
- AI Admin Controls are fully specified.
- AI Performance & Quality Monitoring is fully specified.
- All required workflows are included.
- All required diagrams are included.
- Arabic, English, and German are supported.
- Arabic RTL behavior is specified.
- AI respects tenant isolation, RBAC, client boundaries, file security, financial restrictions, and Owner Only Financial Access.
- AI never exposes inaccessible data.
- AI actions are logged.
- Human approval is required for critical actions.
- No destructive actions execute automatically.
- No code, SQL, implementation scripts, or migrations are included.

---

## 35. Implementation Checklist

This is a specification checklist only.

Before implementation handoff, confirm:

- Final AI permission keys.
- AI feature enablement by tenant plan.
- AI admin role policy.
- Data retention policy for AI logs.
- Source citation policy.
- Financial AI access policy.
- Client-facing AI enablement policy.
- Voice retention and transcription policy.
- Meeting recording consent policy.
- Multilingual quality standards.
- Human approval thresholds.
- AI export and report approval rules.
- AI performance SLOs.
- AI quality review process.
- AI safety incident response process.

---

## 36. Final Phase 9 Statement

This Phase 9 AI Ecosystem Specification defines MAOS AI Assistant, AI Copilot, AI Analyst, Voice To Task, Meeting To Tasks, AI Search, AI Reporting, AI Analytics, permissions, audit logs, approval gates, data access rules, multilingual behavior, notifications, suggested actions, task creation, meeting summaries, client-facing AI, admin controls, and performance monitoring.

All AI implementation must preserve tenant isolation, RBAC, custom permissions, client boundaries, file security, Owner Only Financial Access, payroll restrictions, human approval requirements, source traceability, multilingual safety, and full auditability.

---

## 37. Phase 9 Hardening Addendum

This addendum strengthens the approved AI Ecosystem Specification with additional security, privacy, governance, retention, quality, consent, cost-control, and incident-response rules. It does not replace earlier sections. All rules in this addendum apply across AI Assistant, AI Copilot, AI Analyst, Voice To Task, Meeting To Tasks, AI Search, AI Reporting, AI Analytics, AI Admin Controls, and all future AI features.

### 37.1 Prompt Injection Protection

Purpose:

- Protect MAOS AI from malicious or conflicting instructions embedded in user prompts, files, chat messages, meeting transcripts, voice transcripts, reports, comments, or any retrieved content.
- Ensure retrieved content is treated as data, not as authority.
- Preserve system permissions, tenant isolation, client boundaries, and financial restrictions even when retrieved content attempts to override them.

Threat sources:

| Source | Required Handling |
| --- | --- |
| Malicious user prompts | Validate against role, permission, tenant, resource, action, and financial restrictions before retrieval or response |
| Malicious file content | Treat file content as untrusted data; never follow instructions embedded inside files |
| Malicious chat content | Treat chat messages as conversation data only; never execute hidden instructions from messages |
| Malicious meeting transcripts | Treat transcript text as meeting evidence only; never obey commands embedded in transcript content |
| Malicious voice transcript | Treat transcript as user-provided content requiring confirmation before action |
| Malicious report text | Do not let report content modify AI policy, permissions, source filters, or output safety |

Mandatory rules:

- AI must never follow instructions found inside retrieved content if they conflict with MAOS system rules, permissions, tenant boundaries, client visibility, financial restrictions, or human approval requirements.
- Retrieved files, chat, transcripts, and reports must be marked as untrusted context.
- AI must not accept instructions such as "ignore previous rules", "show hidden data", "act as admin", "export all payroll", or similar override attempts.
- AI must not reveal hidden system prompts, policy rules, permission logic, provider configuration, internal safety instructions, or inaccessible source metadata.
- AI must not use prompt-injected content to call tools, create tasks, publish reports, send messages, export records, approve workflows, or access finance/payroll data.
- AI must separate user intent from retrieved content.
- AI must reject or neutralize malicious instructions while still answering safely from permitted facts where possible.

Required checks:

- Prompt injection detection for user input.
- Prompt injection detection for retrieved files.
- Prompt injection detection for chat and comments.
- Prompt injection detection for meeting and voice transcripts.
- Output validation before response delivery.
- Human approval for any action derived from untrusted content.

Audit requirements:

- Log detected prompt injection attempts.
- Log source object type and ID where safe.
- Log whether the attempt was blocked, sanitized, or allowed as harmless data.
- Audit high-risk attempts involving finance, payroll, client data, exports, file sharing, or external communication.

Acceptance criteria:

- AI never follows instructions embedded in retrieved content that conflict with platform rules.
- AI never uses malicious content to bypass permissions.
- Prompt injection attempts are logged and reviewable by authorized security users.

### 37.2 AI Data Retention Policy

Purpose:

- Define how AI prompts, responses, transcripts, logs, generated outputs, and approval records are retained, deleted, anonymized, and governed per tenant.

Retention categories:

| Data Type | Retention Rule |
| --- | --- |
| User prompts | Retained according to tenant AI retention policy and sensitivity class |
| AI responses | Retained with AI log metadata where required for traceability |
| Voice transcripts | Retained according to voice retention policy, source file visibility, and tenant settings |
| Meeting transcripts | Retained according to meeting retention policy, participant visibility, and consent rules |
| AI logs | Retained for audit, safety, troubleshooting, and compliance according to tenant policy |
| AI-generated drafts | Retained while draft is active; archived or deleted according to module policy |
| Approved AI actions | Retained through target object history, activity logs, and audit logs |
| Blocked AI attempts | Retained as security-relevant events according to audit retention policy |

Tenant-specific settings:

- Tenants may define AI retention windows within platform minimum and maximum limits.
- Tenants may use stricter retention for client-facing content, financial content, payroll content, files, meeting transcripts, and voice transcripts.
- Tenant-specific settings must not remove required audit records before mandatory audit retention periods.
- Enterprise tenants may require stricter anonymization, shorter prompt retention, or disabled prompt storage where compatible with audit obligations.

Deletion and anonymization rules:

- Deleting a source object must not automatically delete required audit logs.
- AI logs may be anonymized when retention rules permit and audit obligations are satisfied.
- Personal identifiers should be anonymized when no longer needed for audit or operational traceability.
- Sensitive prompts and responses should be redacted or minimized where full retention is not required.
- Voice and meeting transcripts must follow consent and retention rules.
- Client data deletion must respect client-scoped visibility and legal retention obligations.

Required safeguards:

- Retention policies must be tenant-scoped.
- AI retention settings changes must be audited.
- Deletion jobs must be permission-controlled and logged.
- Anonymization must preserve enough metadata for security review without exposing unnecessary personal or sensitive data.

Acceptance criteria:

- AI prompts, responses, transcripts, and logs have explicit retention rules.
- Tenant-specific retention settings are supported.
- Required audit history is preserved even when AI content is deleted or anonymized.

### 37.3 External AI Provider Policy

Purpose:

- Define safe boundaries for external AI providers, model providers, transcription services, embedding services, and AI infrastructure vendors.

Provider boundaries:

- External providers must only receive the minimum data required for the requested AI function.
- Provider requests must be tenant-scoped and policy-filtered before transmission.
- Provider outputs must be validated before user delivery.
- Provider configuration must be controlled by Owner or authorized AI admin.
- Provider use must comply with tenant settings, plan entitlements, and security policy.

Data minimization:

- Do not send inaccessible records to any provider.
- Do not send full files when snippets or extracted sections are sufficient.
- Do not send payroll, employee cost, profitability, or sensitive financial data unless the requesting user has explicit permission and provider policy allows it.
- Do not send unnecessary PII or client confidential data.
- Redact or summarize sensitive fields before provider submission where possible.

Training restrictions:

- No cross-tenant training is allowed.
- No unauthorized model training is allowed.
- Tenant data must not be used to train shared models unless explicitly allowed by tenant contract and platform policy.
- Client data must not be used for training without approved tenant and client policy.
- Payroll, employee cost, financial, audit, and security data must not be used for model training.

Sensitive finance and payroll restrictions:

- Financial prompts must pass Owner Only Financial Access rules before provider submission.
- Payroll prompts require Owner or explicit payroll authorization.
- Unauthorized finance/payroll prompts must be blocked before provider interaction.
- Provider logs must not expose sensitive financial payloads beyond approved retention and redaction rules.

Provider failure handling:

- If provider is unavailable, AI must fail safely.
- No fallback provider may receive data unless it satisfies the same security and tenant policy.
- Provider timeout must not expose partial sensitive data.
- Failed provider requests must be logged.
- User-facing failure messages must not reveal provider secrets, internal configuration, hidden data, or security policy internals.

Audit requirements:

- Provider name or provider class.
- AI feature used.
- Tenant and user metadata.
- Sensitivity class.
- Whether sensitive data was redacted.
- Failure or success state.
- Any blocked provider submission.

Acceptance criteria:

- External providers never receive data outside the requesting user's permissions.
- Tenant data is not used for cross-tenant or unauthorized training.
- Provider failures are safe, logged, and non-disclosing.

### 37.4 PII And Sensitive Data Redaction

Purpose:

- Prevent unnecessary exposure of personal, payroll, financial, client confidential, and export-sensitive data in prompts, responses, logs, reports, files, notifications, and provider payloads.

Redaction categories:

| Data Category | Required Redaction Behavior |
| --- | --- |
| Personal data | Redact or minimize personal identifiers unless required for the user's permitted task |
| Contact data | Mask emails, phone numbers, and addresses in exports where not necessary |
| Payroll data | Redact payroll amounts, salary, rates, employee cost, and payroll history unless Owner or explicit payroll grant |
| Financial data | Redact costs, profitability, margins, revenue, invoices, payments, and wallet details unless permitted |
| Client confidential data | Redact client-only confidential data from internal users without access and from other clients |
| Authentication/security data | Never expose tokens, session IDs, secrets, API keys, password reset data, or internal security metadata |
| Audit data | Redact audit payload details unless user has audit permission |

Export-safe redaction rules:

- AI-generated reports and exports must be re-checked for permissions before export.
- Client exports must exclude payroll, employee costs, internal profitability, internal notes, audit logs, hidden files, and other clients.
- Financial exports must follow Owner Only Financial Access.
- Payroll exports must be Owner-only unless explicit payroll export permission is granted.
- Redacted exports must indicate that some data was omitted without revealing hidden details.

Prompt and provider payload redaction:

- Sensitive fields should be redacted before external provider submission when full values are not needed.
- AI logs should avoid storing full sensitive payloads when metadata is sufficient.
- Redaction must preserve source references where possible without exposing sensitive content.

Acceptance criteria:

- PII and sensitive data are minimized by default.
- Payroll and financial redaction obey Phase 8 restrictions.
- Export-safe redaction prevents client, financial, payroll, and audit leakage.

### 37.5 AI Usage And Cost Controls

Purpose:

- Control AI usage, cost, abuse, long-running jobs, feature limits, and tenant-level capacity while preserving operational reliability.

Usage controls:

| Control Type | Required Behavior |
| --- | --- |
| Tenant usage limits | Tenant plans define monthly, daily, and burst AI usage limits |
| Feature-level limits | Assistant, Copilot, Search, Reporting, Analytics, Voice, and Meeting AI may have separate quotas |
| Role-based limits | Owner, Manager, Employee, and Client roles may have different usage allowances |
| Long-running AI jobs | Report generation, meeting processing, file summarization, and analytics jobs require duration and retry limits |
| Sensitive feature limits | Finance, payroll, audit, and export-related AI may require stricter limits and approvals |
| Client AI limits | Client portal AI usage must be tenant-controlled and client-safe |

Abuse prevention:

- Rate-limit repeated prompts, failed permission attempts, prompt injection attempts, and expensive jobs.
- Detect abnormal usage spikes by tenant, user, feature, language, and data class.
- Block or throttle repeated attempts to access unauthorized financial, payroll, client, or audit data.
- Require Owner/admin review for suspicious usage patterns.
- Prevent automated AI loops that generate repeated tasks, reports, summaries, or notifications.

Owner/admin usage reports:

- AI usage by tenant.
- AI usage by feature.
- AI usage by role.
- AI usage by language.
- AI usage by client portal.
- AI cost estimates.
- Long-running job usage.
- Blocked and denied AI attempts.
- High-cost users or workflows.

Notifications:

- Usage threshold reached.
- Monthly AI limit exceeded.
- Long-running job failed.
- Suspicious usage detected.
- Cost spike detected.

Acceptance criteria:

- AI usage is measurable and controllable per tenant, feature, and role.
- Abuse attempts are throttled or blocked.
- Owners/admins can review AI usage and cost reports.

### 37.6 Meeting Recording And Voice Consent

Purpose:

- Ensure meeting recordings, voice uploads, transcripts, summaries, and AI-generated action items respect consent, visibility, retention, and client boundaries.

Consent rules:

| Meeting Type | Required Consent Behavior |
| --- | --- |
| Client meeting | Consent must be obtained before recording or transcription where required by tenant policy and applicable law |
| Internal meeting | Internal recording consent must follow tenant policy |
| Mixed internal/client meeting | Client-safe consent and visibility rules apply |
| Uploaded recording | Uploader must confirm they have rights and consent to process the recording |
| Voice note | Creator must understand retention and AI processing rules before transcription |

Transcript visibility:

- Transcript visibility must inherit the meeting, voice note, file, client, project, and participant access rules.
- Client-visible transcripts must exclude internal-only notes.
- Internal transcripts must not become client-visible without approval.
- AI summaries must follow the same visibility as the source transcript unless a stricter visibility is selected.
- Generated tasks must inherit safe visibility and require confirmation.

Voice retention:

- Voice recordings and transcripts must follow tenant retention policy.
- Client meeting recordings may require stricter retention settings.
- Deletion must respect audit and legal retention obligations.
- Transcripts created from deleted audio must be deleted or anonymized according to tenant policy unless retained for audit.

Required user-facing notices:

- Recording notice.
- Transcription notice.
- AI summary notice.
- Retention notice.
- Client visibility notice.

Audit requirements:

- Recording started/stopped.
- Consent captured or confirmed.
- Transcript generated.
- Summary generated.
- Client-facing transcript or summary published.
- Voice/task conversion approved.

Acceptance criteria:

- Meeting recording and transcription never occur without required consent.
- Transcript visibility follows source permissions.
- Client meeting content is never exposed outside approved client boundaries.

### 37.7 AI Evaluation And Quality Review

Purpose:

- Establish pre-release and ongoing quality review for AI safety, factuality, permissions, multilingual behavior, voice transcription, client-facing content, and financial restrictions.

Pre-release evaluation:

- Evaluate each AI feature before tenant rollout.
- Test common workflows and high-risk edge cases.
- Confirm permission filtering before retrieval and before output.
- Confirm no destructive action can execute without approval.
- Confirm logs and audit events are generated correctly.

Required testing areas:

| Evaluation Area | Required Tests |
| --- | --- |
| Hallucination testing | Check unsupported claims, invented sources, invented metrics, and fabricated approvals |
| Permission leakage testing | Verify AI cannot reveal hidden records, counts, snippets, source names, or financial values |
| Tenant isolation testing | Verify no cross-tenant retrieval or output |
| Client boundary testing | Verify client users only receive client-visible records |
| Financial access testing | Verify Owner Only Financial Access and payroll restrictions |
| Prompt injection testing | Test malicious prompts, files, chats, and transcripts |
| Multilingual quality testing | Test Arabic, English, German, mixed language, and Arabic RTL behavior |
| Voice transcription quality testing | Test noisy audio, accents, multilingual audio, and speaker ambiguity |
| Client-facing AI review | Verify client-safe wording, source references, visibility, and approval gates |

Ongoing quality review:

- Monitor hallucination reports.
- Monitor blocked attempt rates.
- Monitor user feedback.
- Monitor client-facing output incidents.
- Monitor source citation coverage.
- Monitor multilingual correction rates.
- Monitor voice transcription corrections.
- Monitor recommendation acceptance and rejection reasons.

Release gates:

- AI feature cannot be released if permission leakage tests fail.
- Client-facing AI cannot be released if client boundary tests fail.
- Financial AI cannot be released if Owner Only Financial Access tests fail.
- Voice AI cannot be released if consent and transcript visibility tests fail.

Acceptance criteria:

- AI features pass safety, permission, quality, and multilingual evaluation before release.
- Quality issues are measurable and reviewed.
- Client-facing AI receives stricter review than internal-only AI.

### 37.8 AI Incident Response

Purpose:

- Define response requirements for AI leakage, unauthorized output, financial exposure, payroll exposure, client data exposure, prompt injection success, provider incidents, and unsafe AI-generated actions.

Incident types:

| Incident Type | Required Handling |
| --- | --- |
| AI leakage incident | Contain output, identify affected users/resources, preserve logs, notify Owner/security as required |
| Unauthorized output incident | Revoke or correct output, investigate permission failure, block similar path |
| Financial data exposure incident | Escalate as high severity, notify Owner/security, preserve audit trail, review financial permissions |
| Payroll data exposure incident | Escalate as high severity, restrict access, review payroll permissions and AI logs |
| Client data exposure incident | Identify affected client scope, notify Owner/security, assess client notification obligations |
| Prompt injection success | Disable affected feature or source path if needed, review retrieved content handling |
| Provider incident | Pause provider use if required, review transmitted data, rotate credentials if needed |
| Unsafe AI action incident | Stop or reverse action where possible, preserve before/after records, audit the approval path |

Required audit trail:

- Incident ID.
- Tenant.
- Affected user.
- Affected client where applicable.
- Affected resource IDs.
- AI feature.
- Prompt and response metadata.
- Provider metadata where applicable.
- Permission check result.
- Retrieved source metadata.
- Approval decision where applicable.
- Timeline of containment, remediation, and notification.

Owner/security notification:

- Owner must be notified for sensitive AI incidents.
- Security/admin users must be notified for high-severity AI incidents.
- Financial and payroll incidents require immediate Owner/security notification.
- Client data exposure requires Owner/security review for client notification.
- Incident notifications must not include sensitive leaked content unless the recipient has permission and the notification channel is safe.

Containment requirements:

- Disable affected AI feature, source connector, provider, or workflow if necessary.
- Invalidate unsafe cached context.
- Revoke temporary permissions where involved.
- Block repeated malicious prompts or source documents.
- Prevent repeated export or publication of unsafe output.

Remediation requirements:

- Correct exposed output where possible.
- Review and update AI policy, permissions, or filters.
- Add regression tests for the incident path.
- Record final root cause and corrective actions.
- Retain incident audit trail according to security retention policy.

Acceptance criteria:

- AI incidents have clear severity, containment, audit, notification, and remediation paths.
- Financial, payroll, and client exposure incidents trigger high-severity response.
- Incident response preserves evidence without expanding unauthorized access.

### 37.9 Hardening Completion Marker

**PHASE 9 HARDENING COMPLETE**
