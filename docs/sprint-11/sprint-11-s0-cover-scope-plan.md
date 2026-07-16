# Sprint 11 Execution Package — Section 0
## Cover · Scope · Execution Plan · Owner Matrix

**Sprint Title:** Reporting, Search, Data Governance & Deferred Collaboration Items
**Sprint Number:** 11
**Block:** Block 2 — Finance & Reporting Foundation (Sprints 10–12)
**Duration:** 10 working days
**Version:** 1.0
**Prepared:** 2026-06-10
**Depends On:** Sprint 10 (Finance Portal) · Block 1 Close-Out Review v1.0

---

## Sprint Goal

Build the reporting, global search, data governance, retention, archive, export-control, and deferred collaboration foundation for MAOS. This sprint defines owner-safe reporting across all entity types, permission-aware global search with strict client-safe boundaries, data governance rules (soft-delete, archive, retention, export), audit report views, and role-based report visibility — without exposing internal finance, payroll, costs, margins, profitability, internal notes, internal chat, or voice transcripts to unauthorized users.

---

## Sprint 11 Scope

### Backend
- Reporting service foundation (ReportingModule, ReportingService, ReportQueryBuilder)
- Owner reporting dashboard (aggregates across projects, tasks, content, files, approvals, chat, voice, invoices)
- Project reporting (open count, completed count, overdue count, by status, by client)
- Task reporting (open, completed, overdue, by project, by assignee)
- Content reporting (posts by status, by type, by author, by date)
- File reporting (upload count, storage used, by project, by type)
- Approval reporting (pending, approved, rejected, overdue, by type)
- Chat reporting (message count by channel and date range)
- Voice note reporting (recording count, total duration, by project)
- Finance reporting placeholder (invoice count by status, revenue total, outstanding total — Owner-only)
- Audit reporting view (audit events by entity, actor, date range — Owner-only)
- Activity reporting view (recent activity stream by tenant, entity, user)
- Global search service (SearchModule, SearchService, SearchQueryParser)
- Search index model (SearchIndex table, per-entity indexing strategy)
- Permission-aware search query execution (tenant-scoped, role-scoped, status-filtered)
- Client-safe search scope (client sees only client-visible entities)
- Search result redaction (snippet suppression for unauthorized field exposure)
- Hidden count suppression (pagination metadata scoped to permitted results only)
- Search index update hooks (create/update/delete triggers per entity)
- Data governance foundation (GovernanceModule, GovernanceService)
- Soft-delete governance rules (enforcement, audit, recovery placeholder)
- Archive policy foundation (ArchivePolicy table, entity-level archive rules)
- Retention policy foundation (RetentionPolicy table, policy definition — enforcement deferred)
- Export control foundation (ExportRequest table, export access Owner-only, execution placeholder)
- Role-based report visibility enforcement (PermissionGuard on all report routes)
- Client-safe data exclusion (ClientScopeGuard on all client-facing search routes)
- Governance audit logging (all governance actions audit logged)

### Frontend
- Owner reporting dashboard page (/reports/dashboard)
- Project report view (/reports/projects)
- Task report view (/reports/tasks)
- Content report view (/reports/content)
- File report view (/reports/files)
- Approval report view (/reports/approvals)
- Chat report view (/reports/chat)
- Voice report view (/reports/voice)
- Finance report placeholder view (/reports/finance — Owner-only)
- Audit report view (/reports/audit — Owner-only)
- Activity report view (/reports/activity)
- Global search bar (header-level, all pages)
- Search results page (/search?q=)
- Search result cards (entity-type aware: project, task, content, file, message, voice, invoice)
- Search filters (entity type, date range, status, author/assignee)
- Search pagination (permission-scoped)
- Reports navigation (Owner-only section in workspace nav)
- Search access denied view
- Reports access denied view
- Export placeholder button (Owner-only, displays "Export not yet available" message)

### Database
- `SearchIndex` table (12 columns)
- `ArchivePolicy` table (10 columns)
- `RetentionPolicy` table (9 columns)
- `ExportRequest` table (11 columns)
- New indexes on SearchIndex (tenantId, entityType, status, deletedAt)
- New indexes on ArchivePolicy and RetentionPolicy
- RLS policies for all 4 new tables

---

## Sprint 11 Non-Scope

The following items are explicitly excluded from Sprint 11:

- Full-text search with relevance ranking (foundation indexing only)
- Elasticsearch or external search engine integration
- Real export execution (CSV, PDF, Excel — placeholder endpoint only)
- Advanced BI dashboards or analytics beyond reporting foundation
- Finance reports beyond placeholder aggregates (Sprint 12 scope)
- Client-facing reporting pages (client has no report views in Sprint 11)
- Retention policy enforcement (policy definition only, enforcement deferred)
- Automated archive execution (rules defined, execution deferred)
- Data purge or GDPR erasure workflows (deferred)
- Real-time reporting (async/scheduled only)
- Report scheduling or email delivery (deferred to Sprint 13)
- Manager, Employee, or Contractor reporting access
- Internal note search for non-Owner roles
- Voice transcript full-text search
- Cross-tenant reporting
- SMTP email delivery (CS-01 — remains deferred to Sprint 13)
- Presence indicators (CS-02 — remains deferred to Sprint 14+)
- Typing indicators (CS-03 — remains deferred to Sprint 14+)
- Payroll reports
- Cost reports visible to non-Owner roles
- Multi-tenant report aggregation
- AI-generated report summaries

---

## Day-by-Day Execution Plan

| Day | Focus | Deliverables |
|---|---|---|
| 1 | Database foundation | SearchIndex, ArchivePolicy, RetentionPolicy, ExportRequest schemas · Enums · Migrations · RLS policies |
| 2 | Search backend core | SearchModule · SearchService · SearchQueryParser · Permission-aware query execution · Tenant scoping |
| 3 | Search scoping + redaction | ClientScopeGuard on search · Snippet redaction · Hidden count suppression · Search index hooks |
| 4 | Reporting backend core | ReportingModule · ReportingService · ReportQueryBuilder · Project + Task + Content reports |
| 5 | Reporting backend extended | File + Approval + Chat + Voice + Finance placeholder + Audit + Activity reports |
| 6 | Data governance backend | GovernanceModule · Soft-delete governance · ArchivePolicy foundation · RetentionPolicy foundation · ExportRequest placeholder |
| 7 | Search frontend | Global search bar · Search results page · Search result cards · Filters · Pagination |
| 8 | Reporting frontend | Owner reporting dashboard · All report views (9) · Finance placeholder · Audit view |
| 9 | Security + QA | Permission tests · Negative visibility tests · Client-safe search tests · Governance tests · RLS verification |
| 10 | Final validation | Acceptance criteria review · Deferred scope documentation · Approval checklist |

---

## Engineering Owner Matrix

| Area | Owner | Reviewer |
|---|---|---|
| SearchIndex schema + migrations | Backend Lead | Engineering Manager |
| SearchService + QueryParser | Backend Lead | Security Architect |
| Permission-aware search scoping | Security Architect | Backend Lead |
| Client-safe search scope | Backend Lead | Security Architect |
| Search snippet redaction | Backend Engineer | Security Architect |
| Hidden count suppression | Backend Engineer | Backend Lead |
| Search index update hooks | Backend Engineer | Backend Lead |
| ReportingModule + ReportingService | Backend Lead | Engineering Manager |
| Project / Task / Content reports | Backend Engineer | Backend Lead |
| File / Approval / Chat / Voice reports | Backend Engineer | Backend Lead |
| Finance reporting placeholder | Backend Lead | Engineering Manager |
| Audit reporting view | Backend Lead | Security Architect |
| Activity reporting view | Backend Engineer | Backend Lead |
| GovernanceModule (soft-delete, archive, retention, export) | Backend Lead | Security Architect |
| Global search bar + results page (frontend) | Frontend Lead | Product Owner |
| Search result cards + filters (frontend) | Frontend Engineer | Frontend Lead |
| Owner reporting dashboard (frontend) | Frontend Lead | Product Owner |
| Report views — 9 views (frontend) | Frontend Engineer | Frontend Lead |
| Database schema + migrations | Backend Lead | Engineering Manager |
| RLS policies | Security Architect | Backend Lead |
| Governance audit events | Backend Engineer | Security Architect |
| QA test matrix | QA Lead | Engineering Manager |
| Security + negative tests | Security Architect + QA Lead | CTO |
| Deferred scope register | Product Owner | Engineering Manager |
| Approval checklist | Engineering Manager | CTO |
