# Marketing Agency Operating System (MAOS)

## Phase 5 UI/UX Design System Specification

**Version:** 1.0  
**Phase:** Phase 5  
**Status:** UI/UX Design System Specification  
**Parent Documents:** `MAOS_MASTER_SPECIFICATION_v1.1.md`, `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md`, `MAOS_ENTERPRISE_DATABASE_PHASE_2.md`, `MAOS_SECURITY_PERMISSIONS_PHASE_3.md`, `MAOS_CRM_SALES_PHASE_4.md`  
**Document Role:** Complete interface, interaction, wireframe, and page specification for MAOS  
**Code Policy:** No application code, CSS, SQL, migrations, or implementation snippets are included in this document.

---

## 1. UI/UX Objectives

The MAOS interface must feel like a serious agency operating system: fast, structured, collaborative, multilingual, and optimized for repeated daily work.

The design direction is inspired by:

- ClickUp: dense operational dashboards, task management, flexible views, and productivity workflows.
- Trello: clear kanban boards, visual pipeline movement, and simple card-based status tracking.
- Notion: calm document-like layouts, flexible pages, clean hierarchy, and readable workspace structure.

The product must not copy any third-party brand, layout, icons, or visual identity. Inspiration is limited to interaction principles and information organization.

---

## 2. Core UX Principles

1. **Work-first interface:** The first screen after login is an operational dashboard, not a marketing page.
2. **Dense but readable:** MAOS should support high information density without visual noise.
3. **Multiple work views:** Lists, boards, calendars, timelines, dashboards, and reports must coexist.
4. **Client-safe visibility:** Internal and client-facing information must be visually and functionally separated.
5. **AI as assistant, not replacement:** AI appears as contextual help, summaries, drafts, and recommendations.
6. **RTL/LTR parity:** Arabic RTL, English LTR, and German LTR must be first-class layouts.
7. **Fast action loops:** Create, assign, approve, comment, upload, invoice, and follow up should require minimal steps.
8. **Consistent patterns:** Filters, tables, cards, drawers, modals, and detail panels must behave consistently.

---

## 3. Supported Languages And Layout Direction

### 3.1 Supported Languages

| Language | Direction | UI Requirement |
| --- | --- | --- |
| Arabic | RTL | Fully mirrored layout, right-aligned reading flow |
| English | LTR | Default left-to-right layout |
| German | LTR | Longer labels must fit without truncation where practical |

### 3.2 RTL Requirements

Arabic RTL must include:

- Sidebar on the right by default.
- Page actions mirrored to the left where appropriate.
- Tables with first key column on the right.
- Kanban boards flowing right-to-left.
- Breadcrumbs mirrored.
- Chat bubbles mirrored by sender context.
- Calendar day/week grids localized.
- Form labels and text alignment set for RTL.
- Icons mirrored only when direction matters.

### 3.3 LTR Requirements

English and German LTR must include:

- Sidebar on the left.
- Primary content reading left-to-right.
- Tables with primary columns on the left.
- Kanban boards flowing left-to-right.
- German labels allowed more horizontal width.
- Buttons must adapt to longer German text.

---

## 4. Global App Shell

### 4.1 Desktop App Shell

| Region | Purpose | Contents |
| --- | --- | --- |
| Sidebar | Primary navigation | Dashboard, CRM, Projects, Tasks, Calendar, Chat, Voice Notes, AI, Finance, Reports, Settings |
| Top bar | Context and action area | Search, tenant switcher, create button, notifications, AI shortcut, profile |
| Content header | Page-specific command area | Title, breadcrumbs, filters, view switcher, primary action |
| Main content | Active workspace | Dashboard widgets, tables, boards, forms, reports |
| Right drawer | Contextual detail | AI summary, selected record detail, activity, comments |

### 4.2 Mobile App Shell

| Region | Purpose | Contents |
| --- | --- | --- |
| Top bar | Mobile context | Menu, page title, search, quick action |
| Bottom nav | Primary mobile navigation | Dashboard, Tasks, CRM, Chat, More |
| Main content | Active page | Single-column layout |
| Slide drawer | Detail and filters | Record detail, filters, AI assistant |

### 4.3 Global Navigation

Primary navigation:

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

Secondary navigation changes by module.

---

## 5. Visual Design System

### 5.1 Visual Style

MAOS should use:

- Neutral workspace background.
- Clear content surfaces.
- Subtle borders.
- Compact spacing.
- Strong information hierarchy.
- Status colors used sparingly.
- Agency white-label accent color.
- Cards with small radius, maximum 8px.
- No decorative gradients or ornamental backgrounds in operational screens.

### 5.2 Color Roles

| Role | Use |
| --- | --- |
| Background | Main workspace canvas |
| Surface | Panels, cards, drawers |
| Border | Dividers and containment |
| Primary | Main action, tenant brand accent |
| Success | Won, paid, completed, approved |
| Warning | At risk, overdue soon, pending |
| Danger | Lost, failed, overdue, rejected |
| Info | AI, insights, neutral highlights |
| Muted | Secondary labels and metadata |

### 5.3 Typography

Typography rules:

- Use a clean sans-serif family with Arabic, Latin, and German support.
- Page titles must be clear but not oversized.
- Tables and dashboards should prioritize scanability.
- Buttons must keep text readable in German.
- Arabic text must use proper line height for readability.
- Avoid negative letter spacing.

### 5.4 Spacing And Density

Density modes:

| Mode | Purpose |
| --- | --- |
| Comfortable | Default for dashboards and client portal |
| Compact | Tables, task lists, finance records |
| Focus | Writing, AI, proposal review, reports |

Spacing rules:

- Operational screens favor compact but readable spacing.
- Cards should be used for repeated items, not as nested page containers.
- Page sections should be full-width bands or structured panels.

---

## 6. Core Components

### 6.1 Navigation Components

Required:

- Sidebar.
- Top bar.
- Breadcrumbs.
- Tabs.
- View switcher.
- Command menu.
- Tenant switcher.
- Client context switcher.

### 6.2 Data Components

Required:

- Table.
- Kanban board.
- Calendar grid.
- Timeline.
- Activity feed.
- KPI tile.
- Chart panel.
- Record detail drawer.
- Empty state.
- Loading state.
- Error state.

### 6.3 Input Components

Required:

- Text field.
- Text area.
- Select.
- Multi-select.
- Date picker.
- Time picker.
- Currency amount input.
- File upload.
- Voice recorder.
- Search input.
- Filter builder.

### 6.4 Action Components

Required:

- Primary button.
- Secondary button.
- Icon button.
- Split button.
- Context menu.
- Bulk action bar.
- Confirmation modal.
- Approval action bar.

### 6.5 Collaboration Components

Required:

- Comment thread.
- Chat message.
- Mention picker.
- File preview.
- Approval panel.
- AI summary panel.
- Notification item.

---

## 7. Global Interaction Patterns

### 7.1 Create Pattern

Create actions should follow:

1. User selects Create.
2. System opens quick-create modal or full form.
3. Required fields are shown first.
4. Optional details are grouped.
5. User saves.
6. System confirms creation and offers next action.

### 7.2 Detail Pattern

Record detail should use:

- Header with name, status, owner, and primary actions.
- Details tab.
- Activity tab.
- Files tab where relevant.
- Comments or chat tab.
- AI summary where permitted.

### 7.3 Board Pattern

Kanban boards should include:

- Columns by status.
- Cards with title, owner, due date, client, priority, and flags.
- Drag and drop where permitted.
- Clear no-permission behavior.
- RTL column order for Arabic.

### 7.4 Table Pattern

Tables should include:

- Sort.
- Filter.
- Search.
- Saved views.
- Bulk select where permitted.
- Column customization.
- Export where permitted.

### 7.5 AI Pattern

AI should appear as:

- Global assistant.
- Contextual panel.
- Inline summary.
- Suggested actions.
- Draft generator.

AI actions that modify data must require confirmation.

---

## 8. Dashboard Page Specification

### 8.1 Purpose

The dashboard gives each user a role-specific operating overview.

### 8.2 Dashboard Wireframe

| Area | Desktop Layout |
| --- | --- |
| Top header | Workspace name, date range, create button, AI summary button |
| KPI row | Revenue, active projects, overdue tasks, open approvals, pipeline value |
| Main left | Today agenda, priority tasks, project health |
| Main center | Sales pipeline snapshot, finance snapshot, workload chart |
| Main right | AI insights, notifications, recent activity |
| Footer area | Reports shortcuts and saved views |

### 8.3 Key Components

- KPI tiles.
- Project health list.
- Task priority list.
- Sales pipeline mini-board.
- Revenue forecast chart.
- AI insight panel.
- Notification feed.
- Activity timeline.

### 8.4 Primary Actions

- Create task.
- Create lead.
- Start AI summary.
- Open report.
- Review approvals.
- View overdue items.

### 8.5 Role Variants

| Role | Dashboard Focus |
| --- | --- |
| Owner | Revenue, profitability, pipeline, risks, team workload |
| Manager | Projects, tasks, approvals, team workload, client health |
| Employee | My tasks, calendar, mentions, files, approvals |
| Client | Project progress, approvals, invoices, files, messages |

---

## 9. CRM Page Specification

### 9.1 Purpose

CRM manages leads, opportunities, contacts, clients, meetings, proposals, quotations, and revenue forecasting.

### 9.2 CRM Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | CRM title, pipeline selector, date filter, create lead |
| View tabs | Pipeline, Leads, Opportunities, Clients, Meetings, Forecast |
| Main view | Kanban pipeline or data table |
| Right drawer | Selected lead/opportunity detail |
| Bottom/side panel | Activity, follow-ups, proposal/quotation files |

### 9.3 Pipeline Board

Columns:

- Lead.
- Contacted.
- Meeting.
- Proposal.
- Negotiation.
- Won.
- Lost.

Card contents:

- Lead or opportunity name.
- Company/client.
- Owner.
- Value and currency.
- Expected close date.
- Next follow-up.
- Proposal/quotation status.

### 9.4 Primary Actions

- Create lead.
- Create opportunity.
- Schedule meeting.
- Create follow-up.
- Generate proposal.
- Generate quotation.
- Mark won.
- Mark lost.
- View forecast.

---

## 10. Client Portal Page Specification

### 10.1 Purpose

The client portal provides a branded, restricted, client-facing workspace.

### 10.2 Client Portal Wireframe

| Area | Client Layout |
| --- | --- |
| Header | Client logo, portal name, language switcher, notifications |
| Overview row | Active projects, pending approvals, invoices, unread messages |
| Projects section | Client-visible project cards |
| Approvals section | Pending files and deliverables |
| Files section | Shared folders and recent files |
| Finance section | Invoices and payment status |
| Chat section | Client communication channels |

### 10.3 Primary Actions

- Approve deliverable.
- Request changes.
- Upload file.
- Send message.
- View report.
- Pay invoice where enabled.

### 10.4 Client Safety Rules

The portal must hide:

- Internal tasks.
- Internal notes.
- Other clients.
- Employee costs.
- Payroll.
- Profitability.
- Internal audit logs.

---

## 11. Projects Page Specification

### 11.1 Purpose

Projects organize agency delivery by client, owner, timeline, budget, files, approvals, and tasks.

### 11.2 Projects Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | Projects title, client filter, status filter, create project |
| View switcher | List, Board, Timeline, Calendar |
| Main view | Project table or board |
| Right drawer | Project detail, health, files, approvals, activity |
| Footer panel | Workload and budget summary |

### 11.3 Project Card

Project card includes:

- Project name.
- Client.
- Owner.
- Status.
- Due date.
- Health indicator.
- Budget used.
- Open tasks.
- Pending approvals.

### 11.4 Primary Actions

- Create project.
- Assign owner.
- Add task.
- Upload file.
- Request approval.
- Open project report.

---

## 12. Tasks Page Specification

### 12.1 Purpose

Tasks manage agency execution across internal work and client-visible deliverables.

### 12.2 Tasks Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | Tasks title, my tasks toggle, filters, create task |
| View switcher | List, Board, Calendar, Timeline |
| Main view | Task list or kanban board |
| Right drawer | Task details, subtasks, comments, files, AI summary |
| Bulk bar | Assign, status change, due date, priority |

### 12.3 Task Views

Required views:

- My Tasks.
- Team Tasks.
- Project Tasks.
- Client-visible Tasks.
- Overdue Tasks.
- Waiting For Client.

### 12.4 Task Card

Task card includes:

- Title.
- Project.
- Client.
- Assignee.
- Priority.
- Due date.
- Status.
- Attachment count.
- Comment count.
- Client-visible badge.

---

## 13. Calendar Page Specification

### 13.1 Purpose

Calendar centralizes meetings, task due dates, follow-ups, approvals, payroll dates, invoice due dates, and planned work.

### 13.2 Calendar Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | Calendar title, today button, create event, timezone selector |
| View switcher | Day, Week, Month, Agenda |
| Left panel | Mini calendar, calendars list, filters |
| Main grid | Events, tasks, follow-ups, invoice dates |
| Right drawer | Selected event/task/meeting detail |

### 13.3 Calendar Item Types

- Meeting.
- Task due date.
- Follow-up.
- Approval deadline.
- Invoice due date.
- Payment reminder.
- Payroll period.
- Project milestone.

### 13.4 Timezone Behavior

- User timezone is default.
- Client timezone is shown for client-related meetings.
- Calendar must clearly show timezone context.

---

## 14. Chat Page Specification

### 14.1 Purpose

Chat supports internal and client communication linked to clients, projects, tasks, approvals, and files.

### 14.2 Chat Wireframe

| Area | Desktop Layout |
| --- | --- |
| Left panel | Channels, direct messages, client channels |
| Main panel | Message thread |
| Right panel | Channel details, files, tasks, AI summary |
| Composer | Text, attachments, mention, create task from message |

### 14.3 Channel Types

- Internal.
- Client.
- Project.
- Task.
- Direct.

### 14.4 Primary Actions

- Send message.
- Mention user.
- Attach file.
- Create task from message.
- Summarize thread with AI.
- Search messages.

---

## 15. Voice Notes Page Specification

### 15.1 Purpose

Voice Notes captures spoken input and converts it into transcripts, summaries, and tasks where confirmed.

### 15.2 Voice Notes Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | Voice Notes title, record button, upload audio |
| Left panel | Recent recordings, filters, status |
| Main panel | Selected recording waveform placeholder and transcript |
| Right panel | AI extracted tasks, linked project/client, actions |

### 15.3 Primary Actions

- Record voice note.
- Upload audio.
- Transcribe.
- Summarize.
- Create task.
- Link to project.
- Link to meeting.
- Delete or archive where permitted.

### 15.4 Voice To Task Confirmation

Before task creation, user must confirm:

- Task title.
- Description.
- Project.
- Client.
- Assignee.
- Due date.
- Visibility.

---

## 16. AI Assistant Page Specification

### 16.1 Purpose

AI Assistant helps users search, summarize, draft, analyze, translate, and create suggested actions across permitted workspace data.

### 16.2 AI Assistant Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | AI Assistant title, scope selector, safety label |
| Left panel | Prompt history and saved prompts |
| Main panel | Conversation |
| Right panel | Context sources, suggested actions, citations |
| Footer | Prompt composer, upload/context picker, action confirmation |

### 16.3 AI Modes

- Ask.
- Summarize.
- Draft.
- Translate.
- Analyze.
- Create task suggestion.
- Explain report.
- Meeting summary.

### 16.4 AI Safety UX

AI must show:

- Data scope.
- Source references where available.
- Permission limits.
- Confirmation before action.
- Warning for client-facing output.
- Audit notice for sensitive actions.

---

## 17. Finance Center Page Specification

### 17.1 Purpose

Finance Center manages invoices, payments, revenue, wallets, payroll summaries, expenses, and profitability views.

### 17.2 Finance Center Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | Finance Center title, currency selector, date range, create invoice |
| KPI row | Revenue, paid, overdue, outstanding, profitability |
| Tabs | Overview, Invoices, Payments, Wallets, Revenue, Payroll, Profitability |
| Main view | Table, dashboard, or chart based on tab |
| Right drawer | Selected invoice/payment/client finance details |

### 17.3 Primary Actions

- Create invoice.
- Record payment.
- Send payment reminder.
- View wallet.
- Export finance report.
- Review profitability.
- Approve payroll where permitted.

### 17.4 Finance Safety

Finance actions must show:

- Currency.
- Amount.
- Client.
- Invoice/payment status.
- Confirmation for sending, voiding, refunding, or recording payment.

---

## 18. Reports Page Specification

### 18.1 Purpose

Reports provide operational, financial, sales, project, client, AI, and executive insights.

### 18.2 Reports Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | Reports title, report type, date range, export |
| Left panel | Report library and saved reports |
| Main panel | Report canvas with charts/tables |
| Right panel | Filters, schedule delivery, AI explanation |

### 18.3 Report Categories

- Executive dashboard.
- CRM report.
- Sales forecast.
- Project health.
- Task performance.
- Client report.
- Finance report.
- Invoice report.
- Payment report.
- Team workload.
- AI insights.

### 18.4 Primary Actions

- Run report.
- Save report.
- Export PDF.
- Export CSV where permitted.
- Schedule delivery.
- Publish to client portal.
- Ask AI to explain report.

---

## 19. Settings Page Specification

### 19.1 Purpose

Settings manages tenant configuration, users, roles, permissions, white-label settings, localization, billing, security, integrations, and AI settings.

### 19.2 Settings Wireframe

| Area | Desktop Layout |
| --- | --- |
| Header | Settings title, tenant name |
| Left nav | Profile, Team, Roles, Branding, Localization, Billing, Security, Integrations, AI |
| Main panel | Selected settings form |
| Right panel | Help, audit summary, last changed by |

### 19.3 Settings Sections

- Workspace profile.
- Team and invitations.
- Roles and permissions.
- White-label branding.
- Custom domains.
- Languages.
- Currencies.
- Timezones.
- Billing.
- Security.
- Sessions and devices.
- Integrations.
- AI settings.
- Notification preferences.

### 19.4 Sensitive Settings UX

Sensitive changes require:

- Permission check.
- Confirmation.
- Recent authentication where appropriate.
- Audit log.
- Clear impact summary.

---

## 20. Responsive Behavior

### 20.1 Desktop

Desktop is the primary productivity layout.

Rules:

- Sidebar remains visible.
- Tables support horizontal density.
- Detail drawer opens on the side.
- Boards show multiple columns.
- Dashboards show multi-column widgets.

### 20.2 Tablet

Tablet behavior:

- Sidebar can collapse.
- Detail drawer overlays content.
- Boards scroll horizontally.
- Tables reduce columns.
- Primary actions remain visible.

### 20.3 Mobile

Mobile behavior:

- Bottom navigation is used.
- Pages become single-column.
- Filters open in drawer.
- Tables become cards.
- Boards show one or two columns at a time.
- Detail views become full-screen.

---

## 21. States And Feedback

### 21.1 Required States

Every page must define:

- Loading state.
- Empty state.
- Error state.
- No permission state.
- Offline or retry state where relevant.
- Saving state.
- Success confirmation.

### 21.2 Empty State Style

Empty states must be practical:

- State what is missing.
- Offer the next action.
- Avoid decorative illustrations as the primary content.
- Respect permissions.

### 21.3 Error State Style

Error states must:

- Explain what failed.
- Avoid leaking technical details.
- Offer retry or support action.
- Preserve unsaved user input where possible.

---

## 22. Accessibility Requirements

Required:

- Keyboard navigation.
- Visible focus states.
- Sufficient contrast.
- Screen reader labels.
- Form error messages tied to fields.
- No information conveyed by color only.
- RTL screen reader order must be logical.
- Tables and boards must remain navigable.
- Modal focus must be contained.

---

## 23. White Label UI Requirements

Tenant branding applies to:

- Logo.
- Favicon.
- Primary accent color.
- Client portal name.
- Login screen.
- Email templates.
- Invoices.
- Reports.

Guardrails:

- Brand color must not reduce accessibility.
- Platform-required security/legal notices remain visible.
- Client portal must clearly show client-safe content only.

---

## 24. Phase 5 Acceptance Criteria

Phase 5 is accepted when:

- A complete UI/UX design system is specified.
- The design direction is inspired by ClickUp, Trello, and Notion without copying them.
- Dashboard, CRM, Client Portal, Projects, Tasks, Calendar, Chat, Voice Notes, AI Assistant, Finance Center, Reports, and Settings are specified.
- Wireframes are included for all required pages.
- Arabic RTL, English LTR, and German LTR support is defined.
- Core components, interaction patterns, responsive behavior, accessibility, states, and white-label requirements are defined.
- No application code is included.

---

## 25. Final Phase 5 Statement

This Phase 5 UI/UX Design System Specification defines the complete user interface foundation for MAOS. It governs layout, navigation, visual style, components, interactions, responsive behavior, accessibility, localization, page wireframes, and page-level specifications.

All future UI design and frontend implementation must align with this document while preserving the approved architecture, database, security, CRM, localization, tenant isolation, white-label branding, and client visibility rules.

