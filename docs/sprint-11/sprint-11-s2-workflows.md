# Sprint 11 Execution Package — Section 2
## Workflow Specifications (23 Workflows)

---

## Workflow 1 — Owner Reporting Dashboard Load

**Actor:** Owner
**Trigger:** Owner navigates to /reports/dashboard
**Pre-condition:** User authenticated with OWNER role and report.read permission

1. JwtAuthGuard validates token; TenantContextGuard sets tenantId.
2. PermissionGuard checks report.read — if denied, HTTP 403 and redirect to /denied.
3. ReportingService.getDashboardSummary(tenantId) executes parallel aggregates:
   - Active projects count, completed projects count, overdue projects count.
   - Open tasks count, completed tasks count, overdue tasks count.
   - Content posts by status (draft, published, archived).
   - Pending approvals count.
   - Files uploaded (count and storage estimate).
   - Chat message count (last 30 days).
   - Voice notes count.
   - Invoice summary placeholder (total outstanding, overdue count).
   - Recent activity (last 10 audit events).
4. All aggregates are tenant-scoped; deletedAt IS NULL filter applied by default.
5. Dashboard renders summary cards per entity type with drill-down links to detail report views.
6. Audit event: `report.dashboard.viewed`

**Security:** Owner-only. All other roles return HTTP 403. No finance line-item data, no payroll, no cost data exposed on the general dashboard.

---

## Workflow 2 — Project Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/projects
**Pre-condition:** OWNER role, report.read permission

1. ProjectReportService.getReport(tenantId, filters) applies optional filters: status, clientId, dateRange, overdue.
2. Returns: total project count by status, overdue project list, average project duration, project count by client, recent project activity.
3. Soft-deleted projects excluded by default; Owner may toggle "include archived" filter.
4. Report renders tabular view with drill-down to individual project detail.
5. Audit event: `report.projects.viewed`

---

## Workflow 3 — Task Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/tasks
**Pre-condition:** OWNER role, report.read permission

1. TaskReportService.getReport(tenantId, filters) applies optional filters: status, projectId, assigneeId, dateRange, overdue.
2. Returns: total task count by status, overdue task list, task count by project, task count by assignee, average completion time.
3. Soft-deleted tasks excluded. Owner may filter by project or assignee.
4. Audit event: `report.tasks.viewed`

---

## Workflow 4 — Content Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/content
**Pre-condition:** OWNER role, report.read permission

1. ContentReportService.getReport(tenantId, filters) returns: posts by status (draft, published, archived), posts by type, posts by author, posts by date range.
2. Soft-deleted content excluded.
3. Internal note content is not surfaced in report aggregates — counts only.
4. Audit event: `report.content.viewed`

---

## Workflow 5 — File Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/files
**Pre-condition:** OWNER role, report.read permission

1. FileReportService.getReport(tenantId, filters) returns: total file count, storage used estimate, files by project, files by type (MIME category), files uploaded by date range.
2. Soft-deleted files excluded.
3. Audit event: `report.files.viewed`

---

## Workflow 6 — Approval Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/approvals
**Pre-condition:** OWNER role, report.read permission

1. ApprovalReportService.getReport(tenantId, filters) returns: pending count, approved count, rejected count, overdue count, approvals by project, approvals by type, average resolution time.
2. Soft-deleted approvals excluded.
3. Audit event: `report.approvals.viewed`

---

## Workflow 7 — Chat Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/chat
**Pre-condition:** OWNER role, report.read permission

1. ChatReportService.getReport(tenantId, filters) returns: message count by channel (last 7/30/90 days), active channel count, message volume trend by date.
2. Message content is not exposed in the report — counts and channel names only.
3. Soft-deleted messages excluded.
4. Audit event: `report.chat.viewed`

---

## Workflow 8 — Voice Note Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/voice
**Pre-condition:** OWNER role, report.read permission

1. VoiceReportService.getReport(tenantId, filters) returns: total voice note count, total estimated duration, voice notes by project, voice notes by author, voice notes by date range.
2. Transcript content is never surfaced in report view — counts and metadata only.
3. Soft-deleted voice notes excluded.
4. Audit event: `report.voice.viewed`

---

## Workflow 9 — Finance Reporting Placeholder Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/finance
**Pre-condition:** OWNER role, report.read AND finance.read permissions

1. FinanceReportPlaceholder.getSummary(tenantId) returns: invoice count by status, total revenue (confirmed payments), total outstanding (balanceDue), overdue invoice count.
2. No line-item detail, no cost breakdown, no profitability — placeholder aggregates only.
3. Full finance BI reports are Sprint 12 scope.
4. Placeholder note rendered in UI: "Detailed finance analytics available in Sprint 12."
5. Audit event: `report.finance.placeholder.viewed`

**Security:** Requires BOTH report.read AND finance.read permissions. Absence of either returns HTTP 403.

---

## Workflow 10 — Audit Reporting Workflow

**Actor:** Owner
**Trigger:** Owner navigates to /reports/audit
**Pre-condition:** OWNER role, report.read permission

1. AuditReportService.getReport(tenantId, filters) returns: audit events filterable by entity type, action, actor, date range, IP address.
2. Pagination: 50 events per page.
3. Sensitive payload fields (token hashes, raw passwords, full clientNotes) are stripped from the audit report response. Only non-sensitive metadata is surfaced.
4. Soft-deleted audit events are not returned (audit events are immutable — no soft delete).
5. Audit event: `report.audit.viewed`

**Security:** Owner-only. Audit data is never exposed to MANAGER, EMPLOYEE, CONTRACTOR, or CLIENT roles.

---

## Workflow 11 — Global Search Query Workflow

**Actor:** Any authenticated user
**Trigger:** User submits a search query from the global search bar
**Pre-condition:** User is authenticated, search.query permission for their role

1. SearchService.query(tenantId, userId, role, query, filters) is called.
2. SearchPermissionResolver resolves: allowed entity types, visibility scope, project/channel/client scope for the requesting user.
3. SearchIndex table queried: WHERE tenantId = ? AND entityType IN (resolvedTypes) AND visibility IN (resolvedVisibility) AND isDeleted = false AND isArchived = false AND (title ILIKE '%query%' OR snippet ILIKE '%query%').
4. Results ranked by: exact title match first, then snippet match.
5. SnippetRedactor applies: confirms snippet contains no unauthorized fields.
6. Results paginated (20 per page). Total count from permission-scoped result set only.
7. Response: result cards (entityType, title, snippet, status, entityId, projectId if applicable).
8. Audit event: `search.query.executed` (includes query, entityTypes queried, resultCount)

**Security:** No result from outside the permission-resolved scope is included. Pagination total reflects only the scoped result set.

---

## Workflow 12 — Permission-Aware Search Result Workflow

**Actor:** Internal user (MANAGER, EMPLOYEE, CONTRACTOR)
**Trigger:** Non-Owner internal user submits a search query
**Pre-condition:** User is authenticated with an internal non-Owner role

1. SearchPermissionResolver resolves for the user's role:
   - Projects: assigned projects only.
   - Tasks: assigned tasks only.
   - Content: published content only.
   - Files: project-assigned files only.
   - Approvals: assigned approvals only.
   - Chat: permitted channels only.
   - Voice: assigned project voice notes only.
   - Invoices: excluded (no access).
   - Internal notes: excluded.
   - Audit events: excluded.
2. SearchIndex query is restricted to the resolved scope.
3. Any entity not in the resolved scope is excluded from results and from all counts.
4. Snippet content is pre-vetted (no internal note content in snippet field for these entity types).
5. Audit event: `search.query.executed`

---

## Workflow 13 — Client-Safe Search Workflow

**Actor:** Client
**Trigger:** Client submits a search query from the client portal search bar
**Pre-condition:** CLIENT role, client.search permission

1. ClientSearchService.query(tenantId, clientUserId, query, filters) is called.
2. Query scope: SearchIndex WHERE tenantId = ? AND clientUserId = requestingUserId AND visibility = CLIENT_VISIBLE AND isDeleted = false AND isArchived = false.
3. Allowed entity types for client: INVOICE (own), APPROVAL (own), FILE (client-visible), CONTENT_POST (published, client-visible).
4. Excluded entity types: CHAT_MESSAGE (internal channels), VOICE_NOTE, internal notes, AUDIT events, OWNER_ONLY records.
5. Client-safe result cards: no internal notes, no cost fields, no payment references, no internal user identifiers.
6. Pagination total derived from client-scoped result set only.
7. Audit event: `search.client.query.executed`

**Security:** ClientScopeGuard enforces clientUserId matching. HTTP 404 if client attempts to access search results for another client's records.

---

## Workflow 14 — Search Snippet Redaction Workflow

**Actor:** System (SnippetRedactor)
**Trigger:** Any search query producing results
**Pre-condition:** SearchService has retrieved raw result set from SearchIndex

1. For each result in the raw set, SnippetRedactor applies:
   - If requestingRole = CLIENT: verify snippet does not contain internal note markers, cost fields, or payment reference patterns.
   - If requestingRole = EMPLOYEE/CONTRACTOR/MANAGER: verify snippet does not contain internal note content or finance data.
   - For all roles: verify snippet does not contain hashed tokens, raw credentials, or system-internal IDs not intended for user display.
2. Any snippet that fails redaction check is replaced with a safe fallback: "[Content not available]".
3. The raw entity data is never returned in the search response — only the indexed snippet.
4. Redaction events are not individually audit logged (too high frequency); aggregate redaction counts are recorded in search audit metadata.

---

## Workflow 15 — Hidden Count Suppression Workflow

**Actor:** System (SearchService / ReportQueryBuilder)
**Trigger:** Any search or report query returning paginated results
**Pre-condition:** Query scope has been resolved by SearchPermissionResolver or PermissionGuard

1. After query execution, the result count is derived from the permission-scoped result set.
2. The response `total` field reflects only records the requesting user is permitted to see.
3. No "X results hidden" indicator is included in the response.
4. Facet counts (entity type breakdown) reflect only permitted results per facet.
5. If a user has zero results for a given entity type, the facet is omitted from the response entirely (not shown as "0 projects").

---

## Workflow 16 — Search Index Update Workflow

**Actor:** System (SearchIndexService hooks)
**Trigger:** Entity create, update, status-change, soft-delete, archive

1. On entity create: SearchIndexService.upsert(entity) creates a new SearchIndex entry with title, snippet (safe fields only), entityType, visibility, tenantId, clientUserId (if applicable), projectId (if applicable).
2. On entity update: SearchIndexService.upsert(entity) updates the existing SearchIndex entry. Title and snippet are regenerated.
3. On entity soft-delete: SearchIndexService.markDeleted(entityId) sets isDeleted = true.
4. On entity archive: SearchIndexService.markArchived(entityId) sets isArchived = true.
5. On entity status change: SearchIndexService.updateStatus(entityId, newStatus) updates status and re-evaluates visibility.
6. Index updates are synchronous for P0 entity types (projects, tasks, invoices). Background job for lower-priority types (files, chat messages, voice notes).

---

## Workflow 17 — Soft Delete Governance Workflow

**Actor:** Owner (via entity-specific delete actions)
**Trigger:** Any soft-delete action on a governed entity
**Pre-condition:** OWNER role (or authorized role per entity type), entity exists

1. Entity-specific service (e.g., InvoiceService.softDelete) sets deletedAt = NOW().
2. SoftDeleteGovernanceService.onSoftDelete(entityType, entityId) is called:
   - Verifies the entity is not under legal hold (if RetentionPolicy applies).
   - Updates SearchIndex.isDeleted = true.
   - Creates audit event: `governance.entity.soft_deleted` with entityType, entityId, actorId, tenantId.
3. Entity is excluded from all list queries, report aggregates, and search results with default filter.
4. Recovery is placeholder: POST /api/governance/entities/:id/recover creates audit event but does not restore the entity in Sprint 11.

---

## Workflow 18 — Archive Governance Workflow

**Actor:** Owner (manual) or System (future automated enforcement)
**Trigger:** Owner manually archives an entity, or ArchivePolicy rule triggers (automated deferred)
**Pre-condition:** OWNER role, entity is not already archived or soft-deleted

1. Owner calls POST /api/governance/entities/:id/archive.
2. ArchivePolicyService.archive(entityId): sets entity's archived flag, updates SearchIndex.isArchived = true.
3. Archived entity is excluded from default list and search results.
4. Owner may retrieve archived records with explicit "include archived" filter.
5. Audit event: `governance.entity.archived`

---

## Workflow 19 — Retention Policy Foundation Workflow

**Actor:** Owner
**Trigger:** Owner creates or views a retention policy via /reports/governance/retention
**Pre-condition:** OWNER role, governance.manage permission

1. Owner creates a RetentionPolicy record via POST /api/governance/retention-policies: entityType, retainForDays, purgeBehavior.
2. Policy is saved with isActive = false (enforcement deferred).
3. Policy management UI shows existing policies and their active/inactive state.
4. No automated enforcement occurs in Sprint 11. Policy records are read-only data structures.
5. Audit event: `governance.retention_policy.created`

---

## Workflow 20 — Export Control Placeholder Workflow

**Actor:** Owner
**Trigger:** Owner clicks "Export" button on any report view
**Pre-condition:** OWNER role, export.request permission

1. Owner selects entity type, format (CSV/JSON/PDF), and optional filters.
2. ExportRequestService.create(tenantId, requestedByUserId, entityType, format, filters) creates ExportRequest with status = PENDING.
3. Returns placeholder response: `{ message: "Export queued. Export file delivery is not yet available.", requestId: "..." }`.
4. No file is generated. No download link is provided.
5. Audit event: `governance.export.requested` with entityType, format, filters.

**Security:** Only OWNER role can create export requests. All other roles receive HTTP 403.

---

## Workflow 21 — Unauthorized Report Access Workflow

**Actor:** MANAGER, EMPLOYEE, CONTRACTOR, or CLIENT attempting to access report routes
**Trigger:** Unauthorized request to /api/reports/*

1. PermissionGuard checks report.read — denied for all non-Owner roles. Returns HTTP 403.
2. No partial report data is returned. No aggregate counts are leaked.
3. Frontend report navigation is not rendered for non-Owner roles. Navigation guard also blocks direct URL access and redirects to /denied.
4. Audit event: `report.access.denied` (includes userId, role, requestedPath)

---

## Workflow 22 — Unauthorized Search Access Workflow

**Actor:** Unauthenticated user or user attempting to search outside their permission scope
**Trigger:** Search query with missing or invalid JWT, or query attempting to access restricted entity types

**Scenario A — Unauthenticated request:**
1. JwtAuthGuard rejects. HTTP 401.

**Scenario B — Client attempting to search internal records:**
1. SearchPermissionResolver resolves CLIENT scope. Internal records excluded from query.
2. Client receives only their own client-scoped results. No indication that internal records exist.

**Scenario C — Internal user attempting to search outside assignment scope:**
1. SearchPermissionResolver resolves assignment-scoped records only.
2. Non-assigned records excluded. No disclosure of excluded record existence.

**Scenario D — Tenant boundary violation:**
1. TenantContextGuard rejects cross-tenant query. HTTP 403. Audit event: `search.access.denied`

---

## Workflow 23 — Governance Audit Logging Workflow

**Actor:** System
**Trigger:** Any governance action (soft-delete, archive, retention policy create/update, export request)

1. GovernanceService emits audit event via the AuditModule (Sprint 2 foundation) for every governance action.
2. Each governance audit event includes: tenantId, userId, action (governance event type), entityType, entityId, metadata (JSON), ipAddress, userAgent, timestamp.
3. Governance audit events do not include sensitive payload content (e.g., full filter parameters that may contain PII).
4. Audit events for governance actions are searchable in the Owner's audit report view (/reports/audit).
5. Governance audit events are immutable — they cannot be soft-deleted or modified.
