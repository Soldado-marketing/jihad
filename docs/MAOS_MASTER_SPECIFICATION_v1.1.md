# Marketing Agency Operating System (MAOS)

## Master Specification Document

**Version:** 1.1  
**Status:** Approved Master Specification  
**Document Role:** Single source of truth for product, architecture, modules, access model, localization, billing, AI, analytics, database design, and development planning  
**Platform Name:** Marketing Agency Operating System  
**Short Name:** MAOS  
**Access Model:** Invite only. No public registration.  
**Supported Languages:** Arabic RTL, English LTR, German LTR  
**Supported Currencies:** EUR, USD, AED, SAR  
**Supported Timezones:** User timezone and client timezone  
**Approved Phase Documents:** Phase 1 Enterprise Architecture, Phase 2 Enterprise Database Design  

---

## Version History

| Version | Status | Change Summary |
| --- | --- | --- |
| 1.0 | Approved Foundation Specification | Initial product, module, SaaS, localization, AI, finance, reporting, and governance specification |
| 1.1 | Approved Master Specification | Merges approved Phase 1 Enterprise Architecture and approved Phase 2 Enterprise Database Design into the master source of truth |

---

## 1. Executive Summary

MAOS is a SaaS, white-label operating system for marketing agencies. It centralizes agency operations across CRM, leads, clients, projects, tasks, approvals, team management, payroll, finance, invoices, payments, files, chat, reporting, business intelligence, executive dashboards, AI assistance, AI copilots, AI analytics, automations, and voice-to-task workflows.

The platform must support agencies that manage multiple clients, teams, services, projects, campaigns, approvals, financial workflows, and performance reporting from one secure multi-tenant system. MAOS must be built as a scalable, modular, localized SaaS product with white-label capabilities for agency branding and client-facing portals.

Version 1.1 incorporates the approved enterprise architecture and enterprise database foundation. All future implementation must align with the approved multi-tenant architecture, environment architecture, security architecture, AI architecture, billing architecture, file architecture, notification architecture, and logical database design.

---

## 2. Product Vision

MAOS exists to become the command center for marketing agencies.

The platform must allow an agency to:

- Capture, qualify, and convert leads.
- Manage clients, contacts, projects, tasks, files, approvals, and communications.
- Operate internal teams, roles, payroll, and workloads.
- Issue invoices, track payments, monitor revenue, and manage financial performance.
- Provide clients with a branded portal for approvals, reports, files, communication, and visibility.
- Use AI to assist, analyze, automate, summarize, recommend, and generate tasks.
- Provide executives with high-level operational, financial, client, sales, and delivery dashboards.

---

## 3. Scope Of Version 1.1

Version 1.1 defines the complete product, architecture, and database foundation. It does not require every advanced feature to be shipped in the first development milestone, but all future development must align with this specification and its approved phase documents.

### 3.1 In Scope

- SaaS multi-tenant architecture.
- White-label agency architecture.
- Invite-only access model.
- Role-based access control.
- CRM and lead management.
- Client portal.
- Project and task management.
- Team management and payroll foundation.
- Finance, invoices, payments, and currency support.
- AI Assistant, AI Copilot, AI Analytics, and Voice To Task.
- Approvals, chat, files, reporting, BI, automations, and executive dashboards.
- Arabic RTL, English LTR, and German LTR localization.
- User and client timezone handling.
- Auditability, security, and operational governance.
- Approved Phase 1 enterprise architecture.
- Approved Phase 2 enterprise database design.

### 3.2 Out Of Scope For Initial MVP Unless Explicitly Approved

- Public self-service registration.
- Marketplace for third-party public app listings.
- Native mobile apps.
- Full accounting replacement for enterprise ERP systems.
- Automated tax filing.
- Full HR compliance suite.
- Public community/social network features.

### 3.3 Approved Phase Documents

The following phase documents are merged into the master specification by approval:

| Phase | Document | Status | Role |
| --- | --- | --- | --- |
| Phase 1 | `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md` | Approved | Enterprise architecture foundation |
| Phase 2 | `MAOS_ENTERPRISE_DATABASE_PHASE_2.md` | Approved | Logical enterprise database foundation |

These phase documents remain controlled detailed references. Version 1.1 of the master specification incorporates their decisions, boundaries, and implementation requirements.

---

## 4. Core Platform Principles

1. **Invite Only:** Users can only access MAOS after being invited by an authorized administrator.
2. **Tenant Isolation:** Each agency tenant must be logically isolated from every other tenant.
3. **White Label First:** The system must support agency branding, custom domains, and branded client experiences.
4. **Localization By Design:** Language direction, translations, currency, dates, numbers, and timezones must be first-class platform concerns.
5. **AI With Human Control:** AI can assist, suggest, summarize, generate, and automate, but sensitive or irreversible actions require permission, audit logs, and configurable approval rules.
6. **Operational Traceability:** Important actions must be logged and attributable to a user, automation, or AI action.
7. **Modular Growth:** Features must be separable into modules that can evolve independently while sharing a common data, identity, and permission layer.

---

## 5. SaaS Architecture

### 5.1 Architecture Model

MAOS must use a multi-tenant SaaS architecture.

Recommended baseline:

- One shared application codebase.
- Shared database with tenant-scoped records, or isolated databases for enterprise tenants if required later.
- Every tenant-owned record must include a tenant identifier.
- Every request must resolve tenant context before accessing protected data.
- Background jobs, automations, AI jobs, and file operations must preserve tenant context.

### 5.2 Core SaaS Components

- Web application frontend.
- API layer.
- Authentication and authorization service.
- Tenant management service.
- User and invitation service.
- Module services for CRM, projects, finance, reporting, AI, files, and chat.
- Background worker system.
- Notification service.
- File storage service.
- Search/indexing service.
- Audit log service.
- Analytics and BI data layer.

### 5.3 Tenant Model

Each tenant represents one agency workspace.

Tenant properties:

- Tenant ID.
- Agency name.
- Legal name.
- Brand settings.
- Locale defaults.
- Currency defaults.
- Timezone defaults.
- Billing settings.
- Enabled modules.
- Subscription/package settings.
- Custom domain settings.
- Security settings.

### 5.4 Scalability Requirements

The architecture must support:

- Multiple agencies.
- Multiple clients per agency.
- Multiple users per tenant.
- High-volume tasks, files, comments, messages, events, and reports.
- Background AI processing.
- Scheduled automations.
- Analytics aggregation.
- Future enterprise isolation.

### 5.5 Availability And Reliability

The system must support:

- Graceful failure handling.
- Retryable jobs.
- Idempotent payment and invoice operations.
- Durable audit logs.
- Backups and restore procedures.
- Monitoring for API, job, database, storage, and AI service health.

---

## 6. White Label Architecture

### 6.1 Purpose

White labeling allows each agency to present MAOS as its own branded client portal and internal operating system.

### 6.2 Brand Customization

Each tenant must be able to configure:

- Agency logo.
- Favicon.
- Primary color.
- Secondary color.
- Accent color.
- Portal name.
- Email sender identity.
- Custom login screen branding.
- Client portal branding.
- Invoice branding.
- Report branding.
- PDF/export branding.

### 6.3 Custom Domains

The platform must support custom domains such as:

- `portal.agency.com`
- `clients.agency.com`
- `app.agency.com`

Custom domain requirements:

- Domain verification.
- TLS/SSL certificate management.
- Tenant-domain mapping.
- Safe fallback domain.
- Protection against domain hijacking.

### 6.4 Branded Communications

Tenant-branded communications must include:

- Invitations.
- Password setup links.
- Approval requests.
- Invoice emails.
- Payment reminders.
- Report delivery emails.
- Task notifications.
- Client portal updates.

### 6.5 White Label Constraints

System-level legal, security, and compliance notices may still reference the platform owner where required. Tenant admins must not be able to remove required legal or security disclosures.

---

## 7. Identity, Access, And Invitations

### 7.1 Access Model

MAOS is invite only.

Rules:

- No public registration page.
- No anonymous workspace creation.
- A user must be invited by an authorized user.
- Invitation links must expire.
- Invitations must be single-use unless explicitly reissued.
- Revoked invitations must become invalid immediately.
- All invitation actions must be audited.

### 7.2 Authentication

Required:

- Email/password authentication or passwordless authentication.
- Secure password reset flow if passwords are used.
- Session management.
- Logout.
- Account lockout or throttling after suspicious attempts.

Recommended:

- Multi-factor authentication.
- SSO/SAML/OIDC for enterprise tenants.
- Device/session management.

### 7.3 Roles

Default roles:

- Platform Super Admin.
- Agency Owner.
- Agency Admin.
- Manager.
- Team Member.
- Finance Manager.
- Sales Manager.
- Project Manager.
- Client Admin.
- Client User.
- External Collaborator.
- AI Service Actor.
- Automation Actor.

### 7.4 Permission Model

MAOS must use role-based access control with optional fine-grained permissions.

Permission categories:

- Tenant administration.
- User and invitation management.
- CRM access.
- Lead access.
- Client access.
- Project access.
- Task access.
- File access.
- Finance access.
- Invoice access.
- Payment access.
- Payroll access.
- Reporting access.
- AI feature access.
- Automation management.
- White-label configuration.

### 7.5 Audit Requirements

Audit logs must track:

- Login events.
- Invitation creation, acceptance, expiry, revocation.
- Role and permission changes.
- Client data changes.
- Project and task changes.
- File uploads/downloads/deletions.
- Invoice and payment actions.
- Payroll changes.
- AI-generated actions.
- Automation runs.
- Approval decisions.

---

## 8. Localization, Currency, And Timezones

### 8.1 Supported Languages

MAOS must support:

- Arabic with right-to-left layout.
- English with left-to-right layout.
- German with left-to-right layout.

### 8.2 Localization Requirements

The UI must support:

- Runtime language switching where permitted.
- Tenant default language.
- User preferred language.
- Client preferred language.
- Translated system messages.
- Translated email templates.
- Translated invoice labels.
- Translated reports.
- Locale-aware dates.
- Locale-aware number formatting.

### 8.3 RTL Requirements

Arabic support must include:

- RTL page direction.
- Mirrored navigation and layouts.
- Correct alignment for tables, forms, modals, and dashboards.
- Bidirectional text handling for mixed Arabic and English content.
- RTL-safe icons where direction matters.

### 8.4 Supported Currencies

Supported currencies:

- EUR.
- USD.
- AED.
- SAR.

Currency requirements:

- Tenant default currency.
- Client billing currency.
- Invoice currency.
- Payment currency.
- Exchange-rate support for reporting if multiple currencies are used.
- Currency-specific formatting.
- Financial reports must clearly show source currency and converted reporting currency where applicable.

### 8.5 Timezones

MAOS must support:

- User timezone.
- Client timezone.

Rules:

- Store timestamps in UTC.
- Display timestamps in the viewer's preferred timezone by default.
- For client-facing views, allow display in client timezone where relevant.
- Tasks, meetings, approvals, automations, and reports must preserve intended timezone context.
- Reports must state the timezone used for date ranges.

---

## 9. Core Data Model

### 9.1 Primary Entities

Core entities:

- Tenant.
- User.
- Role.
- Permission.
- Invitation.
- Client.
- Contact.
- Lead.
- Opportunity.
- Project.
- Task.
- Subtask.
- Comment.
- Approval.
- File.
- Chat channel.
- Chat message.
- Team.
- Department.
- Payroll profile.
- Timesheet.
- Expense.
- Invoice.
- Invoice line item.
- Payment.
- Subscription/package.
- Report.
- Dashboard.
- Automation.
- AI interaction.
- Audit log.
- Notification.

### 9.2 Shared Entity Fields

Most tenant-owned entities should include:

- ID.
- Tenant ID.
- Created by.
- Created at.
- Updated by.
- Updated at.
- Deleted at for soft deletion where appropriate.
- Status.
- Source.
- Tags where relevant.

### 9.3 Client Relationship Model

A client may have:

- Multiple contacts.
- Multiple projects.
- Multiple invoices.
- Multiple payment records.
- Multiple files.
- Multiple approvals.
- Multiple portal users.
- Multiple reports.
- Multiple chat channels.

---

## 10. CRM

### 10.1 Purpose

The CRM module manages prospects, clients, contacts, communication history, sales opportunities, and relationship context.

### 10.2 CRM Features

Required:

- Client records.
- Contact records.
- Lead-to-client conversion.
- Opportunity pipeline.
- Sales stages.
- Notes and activity timeline.
- Assigned account owner.
- Tags and segmentation.
- Source tracking.
- Client status.
- Client health indicators.

### 10.3 CRM Fields

Client:

- Name.
- Legal name.
- Industry.
- Website.
- Billing address.
- Country.
- Preferred language.
- Preferred currency.
- Timezone.
- Account owner.
- Status.
- Tags.

Contact:

- Name.
- Email.
- Phone.
- Role/title.
- Client.
- Preferred language.
- Portal access status.
- Communication preference.

### 10.4 CRM Permissions

CRM data must be restricted by role and tenant. Client portal users may only access their own client organization data.

---

## 11. Leads

### 11.1 Purpose

The leads module captures, qualifies, tracks, and converts potential customers.

### 11.2 Lead Sources

Supported lead sources:

- Manual entry.
- Website forms.
- Email intake.
- Imported CSV.
- Campaign source.
- Referral.
- API integration.
- Automation.
- AI-created lead from conversation or document where permitted.

### 11.3 Lead Pipeline

Default statuses:

- New.
- Contacted.
- Qualified.
- Proposal Sent.
- Negotiation.
- Won.
- Lost.
- Disqualified.

### 11.4 Lead Features

Required:

- Lead owner.
- Lead source.
- Lead score.
- Qualification notes.
- Expected value.
- Expected close date.
- Follow-up reminders.
- Conversion to client.
- Conversion to project.
- Activity timeline.

---

## 12. Client Portal

### 12.1 Purpose

The client portal provides a branded, restricted, client-facing workspace.

### 12.2 Client Portal Features

Client users must be able to:

- View assigned projects.
- View project progress.
- View assigned tasks where exposed.
- Submit requests.
- Review files.
- Upload files.
- Approve or reject deliverables.
- View invoices.
- Pay invoices where payment integration is enabled.
- View reports.
- Use chat.
- Receive notifications.

### 12.3 Client Portal Restrictions

Client users must not see:

- Internal agency notes unless shared.
- Internal team payroll.
- Internal profitability unless explicitly exposed.
- Other clients.
- Internal-only tasks.
- Internal files not shared with them.

### 12.4 Portal Branding

The client portal must inherit tenant white-label settings.

---

## 13. Projects

### 13.1 Purpose

The projects module manages agency delivery work across clients, services, teams, timelines, budgets, files, approvals, and reporting.

### 13.2 Project Fields

Required:

- Project name.
- Client.
- Project owner.
- Status.
- Start date.
- Due date.
- Budget.
- Currency.
- Description.
- Tags.
- Visibility: internal, client-visible, restricted.

### 13.3 Project Statuses

Default statuses:

- Draft.
- Active.
- On Hold.
- Waiting For Client.
- At Risk.
- Completed.
- Cancelled.

### 13.4 Project Features

Required:

- Task list.
- Milestones.
- Files.
- Approvals.
- Comments.
- Chat link.
- Budget tracking.
- Time tracking linkage.
- Client visibility controls.
- Project health indicator.
- Project report generation.

---

## 14. Tasks

### 14.1 Purpose

The tasks module manages work execution across internal teams and client-facing workflows.

### 14.2 Task Fields

Required:

- Title.
- Description.
- Project.
- Client.
- Assignee.
- Reporter.
- Priority.
- Status.
- Due date.
- Time estimate.
- Actual time.
- Tags.
- Visibility.
- Dependencies.

### 14.3 Task Statuses

Default statuses:

- Backlog.
- To Do.
- In Progress.
- In Review.
- Waiting For Client.
- Approved.
- Done.
- Blocked.
- Cancelled.

### 14.4 Task Features

Required:

- Subtasks.
- Comments.
- Attachments.
- Mentions.
- Watchers.
- Due date reminders.
- Recurring tasks.
- Voice-to-task creation.
- AI task summary.
- AI suggested next steps.
- Client-visible toggle.

---

## 15. Team Management

### 15.1 Purpose

The team management module manages internal users, roles, departments, capacity, workload, and access.

### 15.2 Features

Required:

- Team member profiles.
- Departments.
- Roles.
- Workload view.
- Capacity planning.
- Availability status.
- Assigned projects.
- Assigned tasks.
- Time tracking connection.
- Performance indicators.

### 15.3 Team Member Fields

Required:

- Name.
- Email.
- Role.
- Department.
- Employment type.
- Default hourly cost.
- Default hourly bill rate.
- Timezone.
- Language.
- Status.

---

## 16. Payroll

### 16.1 Purpose

The payroll module provides payroll tracking and compensation visibility for agency operations. It is not a full statutory payroll filing system in Version 1.0 unless extended later.

### 16.2 Payroll Features

Required:

- Payroll profiles.
- Salary or hourly compensation model.
- Contractor payment model.
- Timesheet linkage.
- Approved payable hours.
- Payroll period tracking.
- Payroll export.
- Payroll status.

### 16.3 Payroll Statuses

Default statuses:

- Draft.
- Pending Review.
- Approved.
- Paid.
- Cancelled.

### 16.4 Payroll Permissions

Payroll data is sensitive. Access must be limited to authorized owners, admins, and finance roles.

---

## 17. Finance

### 17.1 Purpose

The finance module tracks revenue, expenses, profitability, invoices, payments, budgets, and financial performance.

### 17.2 Finance Features

Required:

- Revenue tracking.
- Expense tracking.
- Project budget tracking.
- Client profitability.
- Agency profitability.
- Currency support.
- Invoice linkage.
- Payment linkage.
- Payroll linkage.
- Financial dashboards.

### 17.3 Financial Reporting

Required reports:

- Revenue by period.
- Revenue by client.
- Revenue by project.
- Outstanding invoices.
- Paid invoices.
- Overdue invoices.
- Expenses by category.
- Payroll cost.
- Project profitability.
- Client profitability.

---

## 18. Invoices

### 18.1 Purpose

The invoice module creates, sends, tracks, and manages invoices for clients.

### 18.2 Invoice Fields

Required:

- Invoice number.
- Client.
- Issue date.
- Due date.
- Currency.
- Line items.
- Subtotal.
- Tax.
- Discount.
- Total.
- Amount paid.
- Amount due.
- Status.
- Payment link where enabled.

### 18.3 Invoice Statuses

Default statuses:

- Draft.
- Sent.
- Viewed.
- Partially Paid.
- Paid.
- Overdue.
- Void.
- Refunded.

### 18.4 Invoice Features

Required:

- Branded invoice templates.
- PDF export.
- Client portal visibility.
- Payment status tracking.
- Email sending.
- Payment reminders.
- Multi-currency support.
- Audit log.

---

## 19. Payments

### 19.1 Purpose

The payments module records and optionally processes payments against invoices.

### 19.2 Payment Features

Required:

- Manual payment recording.
- Payment status tracking.
- Payment method tracking.
- Invoice reconciliation.
- Partial payments.
- Refund tracking.
- Payment receipts.

Recommended integrations:

- Stripe.
- PayPal.
- Bank transfer metadata.

### 19.3 Payment Statuses

Default statuses:

- Pending.
- Processing.
- Succeeded.
- Failed.
- Refunded.
- Partially Refunded.
- Cancelled.

### 19.4 Payment Security

MAOS must not store raw card data. Payment processing must rely on compliant payment providers.

---

## 20. AI Assistant

### 20.1 Purpose

The AI Assistant helps users search, summarize, draft, analyze, and navigate agency data.

### 20.2 AI Assistant Features

Required:

- Natural language Q&A over permitted tenant data.
- Summarize clients, projects, tasks, chats, and files.
- Draft emails, messages, reports, tasks, and project updates.
- Explain project status.
- Suggest follow-ups.
- Translate supported content between Arabic, English, and German.
- Respect permissions.

### 20.3 AI Safety Rules

The AI Assistant must:

- Use tenant-scoped data only.
- Respect user permissions.
- Identify AI-generated content where relevant.
- Ask confirmation before sensitive actions.
- Log AI interactions.
- Avoid exposing hidden internal notes to client users.

---

## 21. AI Copilot

### 21.1 Purpose

The AI Copilot assists users inside workflows by recommending next actions, filling forms, creating tasks, drafting responses, and identifying risks.

### 21.2 AI Copilot Features

Required:

- Lead qualification suggestions.
- Project risk detection.
- Task breakdown generation.
- Meeting or chat summary to tasks.
- Approval response drafting.
- Invoice reminder drafting.
- Client update drafting.
- Workload recommendations.
- Automation suggestions.

### 21.3 Human Approval

The copilot may suggest actions. It must not perform sensitive operations without permission, including:

- Sending invoices.
- Recording payments.
- Approving payroll.
- Inviting users.
- Changing permissions.
- Deleting records.
- Sending client-facing messages.

---

## 22. AI Analytics

### 22.1 Purpose

AI Analytics provides predictive and explanatory insights across sales, delivery, finance, clients, and teams.

### 22.2 AI Analytics Features

Required:

- Client health analysis.
- Churn risk indicators.
- Project delay risk.
- Budget overrun risk.
- Lead conversion likelihood.
- Revenue trend explanation.
- Workload imbalance detection.
- Invoice collection risk.
- Executive summaries.

### 22.3 AI Analytics Outputs

AI insights must include:

- Insight title.
- Explanation.
- Confidence indicator where feasible.
- Supporting data references.
- Suggested action.
- Impact area.
- Timestamp.

---

## 23. Voice To Task

### 23.1 Purpose

Voice To Task allows users to dictate work items and convert speech into structured tasks.

### 23.2 Voice To Task Features

Required:

- Record or upload voice input.
- Transcribe speech.
- Detect task title.
- Detect description.
- Detect due date where spoken.
- Detect assignee where spoken and authorized.
- Detect project/client context where spoken.
- Confirm before creation.
- Support Arabic, English, and German speech where provider capability allows.

### 23.3 Output Rules

Voice-created tasks must be marked with source `voice_to_task` and include the transcription for audit and review where permitted.

---

## 24. Approvals

### 24.1 Purpose

The approvals module manages structured review and decision workflows for deliverables, files, invoices, budgets, campaign assets, and internal requests.

### 24.2 Approval Features

Required:

- Approval request creation.
- Assigned approvers.
- Due dates.
- Approve/reject/request changes.
- Comments.
- File attachments.
- Version history.
- Client portal approvals.
- Internal approvals.
- Approval reminders.
- Approval audit trail.

### 24.3 Approval Statuses

Default statuses:

- Draft.
- Pending.
- Approved.
- Rejected.
- Changes Requested.
- Cancelled.
- Expired.

---

## 25. Chat

### 25.1 Purpose

Chat supports internal and client communication linked to tenants, clients, projects, tasks, and approvals.

### 25.2 Chat Features

Required:

- Internal channels.
- Client channels.
- Project channels.
- Direct messages where enabled.
- Mentions.
- Attachments.
- Message search.
- Read receipts where appropriate.
- AI summaries.
- Task creation from message.

### 25.3 Chat Visibility

Messages must respect channel membership, tenant boundaries, client boundaries, and internal/client visibility rules.

---

## 26. Files

### 26.1 Purpose

The files module stores and manages agency and client documents, assets, reports, invoices, contracts, creative files, and deliverables.

### 26.2 File Features

Required:

- Upload.
- Download.
- Preview where supported.
- Folder organization.
- Project association.
- Client association.
- Task association.
- Approval association.
- Versioning.
- Access control.
- Client sharing.
- Audit log.

### 26.3 File Security

Requirements:

- Tenant-scoped storage paths or metadata.
- Signed URLs or protected downloads.
- Malware scanning where available.
- File type restrictions.
- File size limits by plan.
- Deletion and retention policies.

---

## 27. Reporting

### 27.1 Purpose

Reporting gives agencies and clients structured visibility into work, outcomes, finances, performance, and operations.

### 27.2 Report Types

Required:

- Client reports.
- Project reports.
- Task reports.
- Team workload reports.
- Finance reports.
- Invoice reports.
- Payment reports.
- Lead reports.
- CRM reports.
- Executive reports.

### 27.3 Report Features

Required:

- Date filters.
- Client filters.
- Project filters.
- Currency display.
- Timezone disclosure.
- Export to PDF.
- Export to CSV where relevant.
- Scheduled delivery.
- White-label branding.
- Client portal publishing.

---

## 28. Business Intelligence

### 28.1 Purpose

BI transforms operational data into strategic metrics and trend analysis.

### 28.2 BI Metrics

Required:

- Monthly recurring revenue where applicable.
- Total revenue.
- Gross margin.
- Project profitability.
- Client profitability.
- Lead conversion rate.
- Sales pipeline value.
- Average invoice collection time.
- Overdue invoice amount.
- Team utilization.
- Task completion rate.
- Project delivery health.
- Client health score.

### 28.3 BI Architecture

BI should use:

- Operational database for current state.
- Aggregated metrics tables or warehouse-ready model for analytics.
- Scheduled metric refresh.
- Permission-filtered dashboards.
- Exportable datasets.

---

## 29. Automations

### 29.1 Purpose

Automations reduce manual work by triggering actions from events, schedules, or conditions.

### 29.2 Automation Triggers

Supported triggers:

- New lead created.
- Lead status changed.
- Client created.
- Project created.
- Task due soon.
- Task overdue.
- Approval requested.
- Approval completed.
- Invoice sent.
- Invoice overdue.
- Payment received.
- File uploaded.
- Chat mention.
- Scheduled time.

### 29.3 Automation Actions

Supported actions:

- Create task.
- Assign user.
- Send notification.
- Send email.
- Request approval.
- Update status.
- Generate report.
- Send report.
- Create invoice reminder.
- Run AI summary.
- Add tag.

### 29.4 Automation Governance

Automations must include:

- Owner.
- Status.
- Trigger.
- Conditions.
- Actions.
- Last run time.
- Run history.
- Error logs.
- Permission checks.

---

## 30. Executive Dashboards

### 30.1 Purpose

Executive dashboards provide leadership-level visibility into the health of the agency.

### 30.2 Dashboard Areas

Required:

- Revenue.
- Profitability.
- Cash collection.
- Sales pipeline.
- Client health.
- Project health.
- Team utilization.
- Delivery risks.
- AI insights.
- Upcoming approvals.
- Overdue tasks.
- Overdue invoices.

### 30.3 Executive KPI Examples

Required KPIs:

- Total revenue.
- Revenue by currency.
- Revenue by client.
- Gross margin.
- Outstanding invoices.
- Overdue invoice amount.
- Pipeline value.
- Win rate.
- Active projects.
- At-risk projects.
- Overdue tasks.
- Team utilization.
- Client health score.

---

## 31. Notifications

### 31.1 Notification Channels

Supported:

- In-app notifications.
- Email notifications.
- Future optional push notifications.

### 31.2 Notification Events

Required:

- Invitation received.
- Task assigned.
- Task due soon.
- Task overdue.
- Mention.
- Approval requested.
- Approval completed.
- File shared.
- Invoice sent.
- Payment received.
- Report published.
- Automation failed.

### 31.3 Notification Preferences

Users should be able to configure notification preferences where business rules allow.

---

## 32. Search

### 32.1 Purpose

Search allows users to quickly find records they are permitted to access.

### 32.2 Search Scope

Search should include:

- Clients.
- Contacts.
- Leads.
- Projects.
- Tasks.
- Files.
- Invoices.
- Payments.
- Reports.
- Chat messages where permitted.

### 32.3 Search Rules

Search results must be permission-filtered and tenant-filtered.

---

## 33. Security Requirements

### 33.1 Baseline Security

Required:

- Tenant isolation.
- Role-based access control.
- Secure authentication.
- Encrypted transport via HTTPS.
- Secrets stored outside source code.
- Input validation.
- Output escaping.
- CSRF protection where applicable.
- Rate limiting.
- Audit logging.
- Protected file access.

### 33.2 Data Protection

Required:

- Backups.
- Restore procedure.
- Data retention rules.
- Soft deletion for key business records.
- Permanent deletion controls for authorized admins.
- Privacy-conscious AI logging.

### 33.3 Sensitive Areas

Extra protection required for:

- Payroll.
- Payments.
- Finance.
- Permissions.
- Invitations.
- Client confidential files.
- AI access to private data.

---

## 34. Compliance And Governance

MAOS must be designed to support future compliance needs, including:

- GDPR-aligned data practices.
- Data export.
- Data deletion workflows.
- Audit trails.
- Consent-aware communication where applicable.
- Payment provider compliance through third-party processors.

Version 1.0 is a product specification, not a legal compliance certification.

---

## 35. Integration Requirements

### 35.1 Initial Integration Categories

Recommended:

- Email provider.
- Calendar provider.
- Payment processor.
- File storage.
- AI provider.
- Analytics/BI export.
- Webhooks.

### 35.2 API Requirements

The platform should expose internal APIs and future external APIs with:

- Authentication.
- Tenant scoping.
- Rate limits.
- Audit logs.
- Versioning.
- Webhook event delivery.

---

## 36. Data Import And Export

### 36.1 Import

Supported import types:

- Clients.
- Contacts.
- Leads.
- Tasks.
- Invoices.
- Payments.

Supported formats:

- CSV.
- Future XLSX support.
- API import.

### 36.2 Export

Supported exports:

- Reports to PDF.
- Tables to CSV.
- Invoices to PDF.
- Financial exports.
- Audit exports for authorized admins.

---

## 37. Module-Level MVP Priority

### 37.1 MVP Foundation

The first build milestone should prioritize:

- Tenant model.
- Invite-only authentication.
- Roles and permissions.
- White-label settings foundation.
- CRM.
- Leads.
- Clients.
- Projects.
- Tasks.
- Files.
- Approvals.
- Basic reporting.
- Basic executive dashboard.

### 37.2 Second Milestone

Recommended:

- Client portal.
- Invoices.
- Payments.
- Finance dashboards.
- Chat.
- Automations.
- AI Assistant.

### 37.3 Third Milestone

Recommended:

- Payroll.
- AI Copilot.
- AI Analytics.
- Voice To Task.
- Advanced BI.
- Advanced executive dashboards.
- Custom domains.
- Advanced white-label email.

---

## 38. Acceptance Criteria

Version 1.0 foundation is accepted when:

- The platform supports invite-only access.
- A tenant can manage users, roles, and permissions.
- Tenant data is isolated.
- White-label settings exist at tenant level.
- CRM, leads, clients, projects, and tasks are functional.
- Client portal access is restricted to client-specific data.
- Invoices and payments support EUR, USD, AED, and SAR.
- Arabic RTL, English LTR, and German LTR are supported at the UI architecture level.
- User and client timezone display rules are implemented.
- AI features are permission-aware and audited.
- Reports and executive dashboards expose key operational and financial metrics.
- Critical user actions are logged.

---

## 39. Non-Functional Requirements

### 39.1 Performance

Expected:

- Common dashboard pages should load quickly under normal tenant data volume.
- Long-running reporting, AI, import, export, and automation work should run in background jobs.
- Search should remain responsive with growing data volume.

### 39.2 Maintainability

Required:

- Modular code organization.
- Clear service boundaries.
- Database migrations.
- Automated tests for critical workflows.
- Type-safe interfaces where the stack supports them.
- Documentation for architecture and deployment.

### 39.3 Observability

Required:

- Error logging.
- Request logging.
- Background job monitoring.
- Automation run logs.
- AI interaction logs.
- Payment event logs.
- Security event logs.

---

## 40. Key Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tenant data leakage | Critical | Strict tenant scoping, permission tests, audit logs |
| AI exposes unauthorized data | Critical | Permission-filtered retrieval, AI audit logs, role checks |
| Multi-currency reporting errors | High | Store source currency, conversion rate, reporting currency |
| RTL layout defects | Medium | RTL design system testing from the beginning |
| Payment reconciliation errors | High | Idempotent payment events and provider webhooks |
| Payroll data exposure | High | Strict finance/payroll permissions |
| Automation misfires | Medium | Run history, dry-run mode, permissions, rollback where possible |

---

## 41. Glossary

| Term | Definition |
| --- | --- |
| Tenant | One agency workspace inside MAOS |
| Client | A company or organization served by an agency |
| Client Portal | Branded client-facing workspace |
| White Label | Tenant-specific branding and domain presentation |
| AI Assistant | Conversational AI helper |
| AI Copilot | Contextual AI workflow assistant |
| AI Analytics | AI-generated insights from operational data |
| Voice To Task | Speech-to-structured-task workflow |
| BI | Business intelligence metrics, trends, and dashboards |
| RBAC | Role-based access control |

---

## 42. Approved Phase 1 Enterprise Architecture Merge

Phase 1 Enterprise Architecture is approved and merged into the master specification.

### 42.1 Phase 1 Source Document

| Item | Value |
| --- | --- |
| Document | `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md` |
| Status | Approved |
| Master Version | Merged into Version 1.1 |
| Role | Enterprise architecture foundation |

### 42.2 Approved Phase 1 Architecture Areas

The following architecture areas are approved as part of MAOS Version 1.1:

- Multi Tenant Architecture.
- SaaS Architecture.
- White Label Architecture.
- Deployment Architecture.
- AI Architecture.
- Security Architecture.
- Notification Architecture.
- File Architecture.
- Billing Architecture.
- Sandbox Architecture.
- Staging Architecture.
- Production Architecture.

### 42.3 Binding Phase 1 Architecture Decisions

Approved decisions:

- MAOS is a multi-tenant SaaS platform where each agency is represented as a tenant.
- Tenant context is mandatory for every tenant-owned record, request, file, notification, report, AI interaction, automation, and background job.
- The default architecture uses one shared application codebase with tenant-scoped operational data.
- Future enterprise options may include dedicated databases, storage buckets, encryption keys, or deployment regions for selected tenants.
- MAOS must support white-label branding, tenant domain mapping, branded client portals, branded emails, branded invoices, and branded reports.
- Sandbox, staging, and production environments must be separated by database, storage, secrets, integrations, and operational policies.
- Production requires WAF/TLS, monitoring, alerting, backups, restore procedures, audit logging, payment monitoring, AI usage monitoring, and release controls.
- AI must be tenant-aware, permission-aware, auditable, and gated for sensitive actions.
- Notifications must be event-driven, tenant-branded, localized, preference-aware, and permission-filtered.
- Files must be tenant-scoped, access-controlled, versioned, auditable, and protected by secure storage access patterns.
- Billing must support subscription plans, tenant entitlements, usage limits, payment provider integration, webhook verification, and billing status controls.

### 42.4 Approved Phase 1 Delivery Order

The approved enterprise architecture delivery order is:

1. Environment separation: sandbox, staging, production.
2. Tenant model and tenant resolution.
3. Invite-only identity and RBAC.
4. Core SaaS module shell.
5. White-label tenant settings.
6. File architecture foundation.
7. Notification event foundation.
8. Billing entitlement foundation.
9. Security, audit, and observability.
10. AI orchestration foundation.

---

## 43. Approved Phase 2 Enterprise Database Merge

Phase 2 Enterprise Database Design is approved and merged into the master specification.

### 43.1 Phase 2 Source Document

| Item | Value |
| --- | --- |
| Document | `MAOS_ENTERPRISE_DATABASE_PHASE_2.md` |
| Status | Approved |
| Master Version | Merged into Version 1.1 |
| Role | Logical enterprise database foundation |

### 43.2 Binding Phase 2 Database Principles

Approved database principles:

- All primary business records use stable unique identifiers.
- Every tenant-owned table must include tenant scope.
- Parent and child records must belong to the same tenant.
- Cross-tenant references are prohibited except controlled platform administration references.
- Client portal users may only access records linked to their client membership.
- Business records should use soft deletion where deletion could affect auditability, billing, reporting, or legal traceability.
- Audit logs are append-only.
- Financial records must not be destructively deleted after issuance, payment, refund, voiding, or reconciliation.
- Money records must store amount, currency, and conversion metadata where reporting requires conversion.
- Timestamps must be stored in UTC.
- Scheduled business events must preserve timezone context.
- User timezone and client timezone must both be supported.

### 43.3 Approved Phase 2 Database Domains

The approved database design covers:

- Users.
- Roles.
- Permissions.
- Invitations.
- Clients.
- Leads.
- Opportunities.
- Meetings.
- Contracts.
- Projects.
- Tasks.
- Subtasks.
- Files.
- Voice Notes.
- Chat.
- Approvals.
- Templates.
- Automations.
- Notifications.
- Time Tracking.
- Payroll.
- Employee Costs.
- Revenue.
- Profitability.
- Invoices.
- Payments.
- Wallets.
- AI Logs.
- Audit Logs.
- Activity Logs.
- Devices.
- Sessions.
- Languages.
- Currencies.
- Timezones.

### 43.4 Approved Database Table Catalog

The following logical tables are approved for MAOS Version 1.1:

| Domain | Approved Tables |
| --- | --- |
| Core Platform | `tenants`, `tenant_domains` |
| Localization | `languages`, `currencies`, `timezones` |
| Identity And Access | `users`, `tenant_memberships`, `roles`, `permissions`, `role_permissions`, `membership_roles`, `invitations`, `sessions`, `devices` |
| CRM And Sales | `clients`, `client_contacts`, `leads`, `opportunities`, `meetings`, `meeting_participants`, `contracts` |
| Delivery Operations | `projects`, `tasks`, `subtasks`, `task_dependencies`, `time_entries`, `timesheets` |
| Files And Collaboration | `files`, `file_versions`, `file_shares`, `voice_notes`, `chat_channels`, `chat_channel_members`, `chat_messages`, `approvals`, `approval_approvers` |
| Templates And Automations | `templates`, `template_versions`, `automations`, `automation_steps`, `automation_runs` |
| Notifications | `notifications`, `notification_deliveries`, `notification_preferences` |
| Payroll And Profitability | `employee_profiles`, `employee_costs`, `payroll_runs`, `payroll_items`, `revenue_records`, `profitability_records` |
| Billing And Finance | `invoices`, `invoice_line_items`, `payments`, `payment_allocations`, `wallets`, `wallet_transactions` |
| Logs | `ai_logs`, `audit_logs`, `activity_logs` |

### 43.5 Approved Database Relationship Rules

Approved relationship rules:

- A tenant has many memberships, clients, leads, projects, files, invoices, payments, automations, notifications, and logs.
- A user may belong to multiple tenants through tenant memberships.
- Roles are assigned to memberships, not directly to global users.
- Roles receive permissions through role-permission mappings.
- Clients own contacts, projects, meetings, contracts, invoices, payments, wallets, files, approvals, reports, and client portal access.
- Leads may convert into clients and opportunities.
- Opportunities may connect to clients, contracts, projects, revenue records, and invoices.
- Projects own tasks, files, approvals, time entries, revenue, costs, invoices, and chat channels.
- Tasks may have subtasks, dependencies, files, approvals, comments, time entries, voice notes, and activity records.
- Files may have versions and explicit sharing rules.
- Voice notes may create tasks after transcription and confirmation.
- Chat channels contain members and messages and may be linked to clients, projects, or tasks.
- Approvals contain approvers and decision states.
- Automations contain ordered trigger, condition, and action steps and produce execution runs.
- Notifications may produce multiple delivery attempts.
- Time entries feed timesheets, payroll, invoices, and profitability.
- Employee costs, payroll items, revenue records, and time entries feed profitability records.
- Payments may allocate to invoices or wallets.
- Wallets use ledger transactions to preserve balance history.
- AI logs track AI usage and may reference business resources.
- Audit logs track critical actions and must remain append-only.
- Activity logs provide user-facing timelines with visibility controls.

### 43.6 Approved Database Constraint Rules

Approved constraint rules:

- Tenant-owned records require tenant identity.
- User email must be globally unique after normalization.
- Active tenant membership must be unique per user, tenant, and client scope.
- Invitations must be single-use, expiring, revocable, and token-hash based.
- Session tokens must be hashed and revocable.
- Devices must be unique per user by fingerprint hash.
- Role keys must be unique within tenant and scope.
- Permission keys must be globally unique.
- Invoice numbers must be unique per tenant.
- Contract numbers must be unique per tenant.
- Project codes must be unique per tenant where provided.
- Payment provider IDs must be unique per provider where provided.
- Wallet balances must be maintained through ledger transactions.
- Approved payroll requires approval actor and approval timestamp.
- Paid payroll requires paid timestamp.
- Financial amounts must be non-negative unless explicitly modeled as credit, refund, reversal, or adjustment.
- Date ranges must have an end date after start date.
- Meeting end time must be after meeting start time.
- Completed workflow entities should store completion timestamps.
- Client-visible records must have client context.
- AI logs must not store sensitive raw prompts unless policy explicitly permits.
- Audit logs are append-only and must be redacted where required.

### 43.7 Approved Indexing Strategy

Approved index strategy:

- Index `tenant_id` on every tenant-owned table.
- Index foreign keys used in relationships.
- Index workflow tables by `tenant_id` and `status`.
- Index timeline and reporting tables by `tenant_id` and `created_at`.
- Index due-date and scheduling fields for tasks, meetings, invoices, automations, and notifications.
- Use unique indexes for tenant-scoped numbers, slugs, codes, and active membership rules.
- Use reporting indexes for invoices, payments, time entries, revenue records, profitability records, payroll records, and activity logs.
- Use permission-filtered search indexes for clients, contacts, leads, opportunities, projects, tasks, files, invoices, and chat messages.

### 43.8 Approved Phase 2 Acceptance Criteria

Phase 2 is accepted as merged when:

- All requested database domains are represented.
- Every tenant-owned table has tenant scope.
- Identity, access, invitations, devices, and sessions are modeled.
- CRM, sales, meetings, contracts, delivery, collaboration, finance, payroll, AI, and logs are modeled.
- Languages, currencies, and timezones are modeled as reference data.
- Fields, relations, constraints, and indexes are defined in the approved Phase 2 database document.

---

## 44. Master Specification Governance

### 44.1 Versioning Rule

MAOS master specification versions are cumulative. A later approved version supersedes prior versions while preserving historical documents.

Version 1.1 supersedes Version 1.0.

### 44.2 Approved Document Hierarchy

Approved hierarchy:

1. `MAOS_MASTER_SPECIFICATION_v1.1.md`
2. `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md`
3. `MAOS_ENTERPRISE_DATABASE_PHASE_2.md`

The master document is the top-level source of truth. Approved phase documents provide binding implementation-level detail for their domain.

### 44.3 Change Control

Future changes must:

- State the affected master version.
- Identify the affected phase or domain.
- Preserve tenant isolation, invite-only access, localization, currency, timezone, audit, and security requirements.
- Update affected acceptance criteria.
- Create a new master version when a phase is approved or a foundational decision changes.

---

## 45. Final Version 1.1 Statement

This Master Specification Document Version 1.1 is the approved source of truth for the Marketing Agency Operating System (MAOS).

Version 1.1 supersedes Version 1.0 and merges the approved Phase 1 Enterprise Architecture and Phase 2 Enterprise Database Design into the master platform foundation.

All future product planning, UI design, database design, backend architecture, infrastructure setup, AI workflows, reporting models, security controls, billing workflows, and development tasks must align with this document and its approved phase documents unless a later approved version supersedes it.
