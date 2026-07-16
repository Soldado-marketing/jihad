# Sprint 11 Execution Package — Section 1
## Architecture Specifications · Search · Reporting · Data Governance

---

## Reporting Architecture Overview

The Sprint 11 reporting layer provides aggregated, permission-scoped views of MAOS entity data for the Owner role. No client-facing reporting pages exist in Sprint 11.

### Reporting Module Components

| Component | Location | Role Access |
|---|---|---|
| ReportingModule | apps/api/src/modules/reporting | OWNER only |
| ReportingService | apps/api/src/modules/reporting | OWNER only |
| ReportQueryBuilder | apps/api/src/modules/reporting/query-builder | Internal |
| ProjectReportService | apps/api/src/modules/reporting/reports | OWNER only |
| TaskReportService | apps/api/src/modules/reporting/reports | OWNER only |
| ContentReportService | apps/api/src/modules/reporting/reports | OWNER only |
| FileReportService | apps/api/src/modules/reporting/reports | OWNER only |
| ApprovalReportService | apps/api/src/modules/reporting/reports | OWNER only |
| ChatReportService | apps/api/src/modules/reporting/reports | OWNER only |
| VoiceReportService | apps/api/src/modules/reporting/reports | OWNER only |
| FinanceReportPlaceholder | apps/api/src/modules/reporting/reports | OWNER only |
| AuditReportService | apps/api/src/modules/reporting/reports | OWNER only |
| ActivityReportService | apps/api/src/modules/reporting/reports | OWNER only |

### Reporting Data Flow

```
Owner request
→ JwtAuthGuard (validates session)
→ PermissionGuard (requires report.read)
→ TenantContextGuard (scopes to tenantId from JWT)
→ ReportingService.getReport(type, tenantId, filters)
→ ReportQueryBuilder (constructs tenant-scoped aggregate query)
→ Database (tenantId-scoped aggregate, deletedAt IS NULL)
→ Response (report DTO — no cost/margin/internal fields except for Owner finance placeholder)
```

---

## Owner Reporting Access Specification

### Rule RPT-OWN-01
All /api/reports/* routes require the `report.read` permission. This permission is granted only to the OWNER role in Sprint 11. MANAGER, EMPLOYEE, CONTRACTOR, and CLIENT cannot access reporting routes.

### Rule RPT-OWN-02
Report queries are always tenant-scoped. No cross-tenant aggregation is permitted. The tenantId in every report query is derived from the authenticated user's JWT payload and cannot be overridden by request parameters.

### Rule RPT-OWN-03
Soft-deleted records (deletedAt IS NOT NULL) are excluded from all report aggregates by default. A separate "include archived" filter may be applied by the Owner to include archived records.

### Rule RPT-OWN-04
Client-safe fields are applied to all entity responses in report views. No internal notes, no payroll fields, no cost or margin fields appear in any non-finance report aggregate.

### Rule RPT-OWN-05
Finance reporting in Sprint 11 is a placeholder aggregate (invoice count by status, revenue total, outstanding total). Full finance BI reporting is Sprint 12 scope.

### Rule RPT-OWN-06
The audit report view displays AuditEvent records filtered by entity type, actor, date range, and action. The audit report does not expose sensitive payload fields (e.g., token hashes, raw credentials, full clientNotes) to the UI layer.

---

## Role-Based Report Visibility Specification

| Role | Report Access | Scope |
|---|---|---|
| OWNER | Full access to all report views | Tenant-wide |
| MANAGER | No access to any report view | HTTP 403 |
| EMPLOYEE | No access to any report view | HTTP 403 |
| CONTRACTOR | No access to any report view | HTTP 403 |
| CLIENT | No access to any report view | HTTP 403 |

**Rule RPT-ROLE-01:** Report navigation is rendered only for the OWNER role. Non-owner users who access /reports/* directly receive HTTP 403 from the backend PermissionGuard.

**Rule RPT-ROLE-02:** UI visibility rules for report navigation are supplementary. The backend permission check is the authoritative gate and cannot be bypassed.

**Rule RPT-ROLE-03:** Client-safe data exclusion remains active even when an Owner views report data for a client entity. Internal fields (notes, cost, margin, confirmedByUser, payroll) are always excluded from report response payloads.

---

## Hidden Totals and Count Suppression Specification

**Rule HID-01:** Aggregated counts (total records, filtered counts, pagination totals) in report responses are always calculated from the permission-scoped dataset. No record outside the authenticated user's permission scope contributes to any count.

**Rule HID-02:** Finance totals (revenue, outstanding balance, payment amounts) are returned only to OWNER role. MANAGER, EMPLOYEE, CONTRACTOR, and CLIENT receive HTTP 403 if they attempt to access these aggregates directly.

**Rule HID-03:** Client-facing search pagination metadata (total results, page count) is calculated only from the client-safe result set. Internal records excluded from client search do not contribute to any count returned to the client.

**Rule HID-04:** Search facet counts (e.g., "5 projects matching") respect the same permission scope as the main result set. A client searching for content does not receive a count that includes internal-only records.

---

## Global Search Architecture Specification

The Sprint 11 global search layer provides permission-aware, tenant-scoped search across all searchable entity types: projects, tasks, content posts, files, approvals, chat messages (permitted), voice notes (title only), and invoices (Owner-only).

### Search Module Components

| Component | Location | Role Access |
|---|---|---|
| SearchModule | apps/api/src/modules/search | Role-dependent (see model) |
| SearchService | apps/api/src/modules/search | Role-dependent |
| SearchQueryParser | apps/api/src/modules/search/parser | Internal |
| SearchPermissionResolver | apps/api/src/modules/search/permissions | Internal |
| SearchIndexService | apps/api/src/modules/search/index | Background |
| ClientSearchService | apps/api/src/modules/search/client | CLIENT role only |

### Search Data Flow — Owner/Internal Path

```
Search request (authenticated user)
→ JwtAuthGuard
→ TenantContextGuard (scopes tenantId)
→ SearchPermissionResolver (resolves allowed entity types and field visibility for role)
→ SearchService.query(tenantId, query, filters, resolvedPermissions)
→ SearchIndex table (tenantId-scoped, entityType-filtered, status-filtered)
→ Permission-scoped result set
→ SnippetRedactor (strips unauthorized field content from snippets)
→ Response (result cards, scoped pagination)
→ Audit event: search.query.executed
```

### Search Data Flow — Client Path

```
Client search request
→ JwtAuthGuard
→ ClientScopeGuard (scopes to clientUserId)
→ ClientSearchService.query(tenantId, clientUserId, query, filters)
→ SearchIndex table (tenantId + clientUserId-scoped, client-visible statuses only)
→ Client-safe result set (no internal notes, no internal messages, no internal voice content)
→ SnippetRedactor (enforces client-safe field restrictions)
→ Response (client-safe result cards, client-scoped pagination)
→ Audit event: search.client.query.executed
```

---

## Permission-Aware Search Model

### Search Permission Matrix

| Entity Type | OWNER | MANAGER | EMPLOYEE | CONTRACTOR | CLIENT |
|---|---|---|---|---|---|
| Projects | All tenant projects | Assigned only | Assigned only | Assigned only | Own-project (if client-visible) |
| Tasks | All tenant tasks | Assigned + managed | Assigned only | Assigned only | Own-project tasks (client-visible) |
| Content Posts | All statuses | Published only | Published only | Published only | Published only (client-visible) |
| Files | All tenant files | Project-assigned only | Project-assigned only | Project-assigned only | Client-visible only |
| Approvals | All | Assigned | Assigned | Assigned | Own project approvals |
| Chat Messages | All channels | Permitted channels | Permitted channels | Permitted channels | Client channels only |
| Voice Notes | All | Assigned project | Assigned project | No access | No access |
| Invoices | All | No access | No access | No access | Own invoices only |
| Internal Notes | All | No access | No access | No access | No access |
| Payroll / Cost / Margin | All (Owner-only) | No access | No access | No access | No access |
| Audit Events | All | No access | No access | No access | No access |

**Rule SRCH-PERM-01:** SearchPermissionResolver constructs a per-request permission matrix from the authenticated user's role, tenant membership, project assignments, and channel memberships. The resolved matrix determines which entity types and which records are included in the search index query.

**Rule SRCH-PERM-02:** Records outside the permission scope are not included in search results, not counted in pagination totals, and not included in any facet count.

**Rule SRCH-PERM-03:** Internal notes (type = INTERNAL_NOTE) are excluded from all search results for non-Owner roles. The exclusion is enforced at the query level, not the UI level.

**Rule SRCH-PERM-04:** Voice note transcript content is NOT indexed for search in Sprint 11. Only voice note title and project association are indexed.

**Rule SRCH-PERM-05:** Finance records (Invoice, Payment) are indexed but only accessible by OWNER role. Client can search their own invoices via ClientSearchService, scoped to their clientUserId.

---

## Search Indexing Model

### Table: `SearchIndex`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | String | PK, cuid() | Unique index entry identifier |
| tenantId | String | FK Tenant, NOT NULL | Tenant scope |
| entityType | SearchEntityType | NOT NULL | Type of entity indexed |
| entityId | String | NOT NULL | ID of the indexed entity |
| title | String | NOT NULL | Searchable title/name |
| snippet | String | nullable | Short text excerpt (public fields only) |
| status | String | nullable | Entity status (for filter-time exclusion) |
| clientUserId | String | nullable | Set for client-scoped entities (invoices, approvals) |
| projectId | String | nullable | Associated project (for project-scoped search) |
| visibility | SearchVisibility | NOT NULL | PUBLIC_INTERNAL / CLIENT_VISIBLE / OWNER_ONLY |
| isDeleted | Boolean | NOT NULL, DEFAULT false | Mirrors entity deletedAt state |
| isArchived | Boolean | NOT NULL, DEFAULT false | Mirrors entity archive state |
| indexedAt | DateTime | NOT NULL | When this entry was last indexed |
| createdAt | DateTime | NOT NULL | Creation timestamp |

**Indexes:** (tenantId, entityType) · (tenantId, entityId) UNIQUE · (tenantId, clientUserId) · (tenantId, visibility) · (tenantId, isDeleted) · (tenantId, projectId)

### Enum: `SearchEntityType`
`PROJECT` · `TASK` · `CONTENT_POST` · `FILE` · `APPROVAL` · `CHAT_MESSAGE` · `VOICE_NOTE` · `INVOICE` · `PAYMENT`

### Enum: `SearchVisibility`
`PUBLIC_INTERNAL` — visible to all internal roles per assignment
`CLIENT_VISIBLE` — visible to the assigned clientUserId and Owner
`OWNER_ONLY` — visible to Owner only (finance, audit, costs)

### Search Index Update Rules

**Rule IDX-01:** A SearchIndex entry is created/updated when an entity is created, updated, or status-changed.

**Rule IDX-02:** When an entity is soft-deleted, its SearchIndex entry is updated: isDeleted = true. Soft-deleted entries are excluded from normal search results.

**Rule IDX-03:** The snippet field contains only client-safe, public fields. Internal notes, cost fields, payroll fields, and sensitive metadata are never stored in the snippet field.

**Rule IDX-04:** Voice note entries in SearchIndex contain only: title, projectId, visibility = PUBLIC_INTERNAL (or OWNER_ONLY if internal). Transcript content is not stored.

**Rule IDX-05:** Invoice entries in SearchIndex have visibility = CLIENT_VISIBLE for client-addressable invoices (status != DRAFT/VOID), and OWNER_ONLY for internal finance records. The snippet contains only: invoiceNumber, status, total, dueAt.

---

## Search Result Visibility and Redaction Rules

**Rule SRCH-VIS-01:** Search results for CLIENT role include only entities where: `visibility = CLIENT_VISIBLE` AND `clientUserId = requestingUserId` AND `isDeleted = false`.

**Rule SRCH-VIS-02:** Search results for internal roles (OWNER, MANAGER, EMPLOYEE, CONTRACTOR) are filtered by SearchPermissionResolver output. Records not in the resolved scope are excluded.

**Rule SRCH-VIS-03:** The snippet field returned in search results is always the pre-redacted snippet stored in SearchIndex. No additional on-the-fly snippet generation from raw entity fields is performed in Sprint 11 for non-Owner roles.

**Rule SRCH-VIS-04:** For OWNER role, the full entity can be retrieved by following the search result link. The search result card itself shows only the indexed title, snippet, entity type, and status.

**Rule SRCH-VIS-05:** Deleted and archived records do not appear in default search results. The Owner may use explicit "include deleted" or "include archived" filters to surface these records.

**Rule SRCH-VIS-06:** Search must never reveal the existence of a hidden record through any signal: no "1 result hidden", no count discrepancy, no filter option for entity types the user cannot access.

---

## Data Governance Foundation Specification

### Governance Module Components

| Component | Location | Description |
|---|---|---|
| GovernanceModule | apps/api/src/modules/governance | Root governance module |
| GovernanceService | apps/api/src/modules/governance | Service facade |
| SoftDeleteGovernanceService | apps/api/src/modules/governance/soft-delete | Soft-delete rules enforcement |
| ArchivePolicyService | apps/api/src/modules/governance/archive | Archive policy management |
| RetentionPolicyService | apps/api/src/modules/governance/retention | Retention policy management |
| ExportRequestService | apps/api/src/modules/governance/export | Export placeholder |

---

## Soft-Delete Governance Rules

**Rule GOV-SD-01:** All entity types with a `deletedAt` column are governed by soft-delete rules. Hard delete is not permitted through the API in Sprint 11.

**Rule GOV-SD-02:** Soft-deleted records are excluded from all list queries, report aggregates, and search results unless an explicit filter is applied by an authorized user.

**Rule GOV-SD-03:** Only OWNER role may view soft-deleted records with explicit archive/deleted filters. MANAGER, EMPLOYEE, CONTRACTOR, and CLIENT cannot access soft-deleted records through any API path.

**Rule GOV-SD-04:** A soft-delete action creates an audit event: `governance.entity.soft_deleted` with entityType, entityId, actorId, and timestamp.

**Rule GOV-SD-05:** Recovery (un-delete) of soft-deleted records is a placeholder in Sprint 11. The endpoint exists and creates an audit event but does not execute recovery logic.

---

## Archive Policy Foundation Specification

### Table: `ArchivePolicy`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | String | PK, cuid() | Unique policy identifier |
| tenantId | String | FK Tenant, NOT NULL | Tenant scope |
| entityType | String | NOT NULL | Entity type this policy applies to |
| archiveAfterDays | Int | nullable | Archive entity after N days of inactivity |
| archiveOnStatus | String | nullable | Archive when entity reaches this status |
| isActive | Boolean | NOT NULL, DEFAULT true | Whether this policy is enforced |
| appliesTo | String | NOT NULL | ALL / PER_PROJECT / PER_CLIENT |
| notes | String | nullable | Policy description |
| createdByUserId | String | FK User, NOT NULL | Owner who created the policy |
| createdAt | DateTime | NOT NULL | Creation timestamp |

**Rule GOV-ARC-01:** Archive policy execution (automated archiving of entity records) is deferred. The policy definition and management API exists in Sprint 11. Automated enforcement is Sprint 12+.

**Rule GOV-ARC-02:** Manual archive of individual records by Owner is supported in Sprint 11 via `POST /api/governance/entities/:id/archive`. This sets the entity's archived state and updates the SearchIndex.isArchived flag.

**Rule GOV-ARC-03:** Archived records are excluded from default list and report queries. Owner may use an explicit "include archived" filter. CLIENT cannot see archived records under any filter.

---

## Retention Policy Foundation Specification

### Table: `RetentionPolicy`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | String | PK, cuid() | Unique policy identifier |
| tenantId | String | FK Tenant, NOT NULL | Tenant scope |
| entityType | String | NOT NULL | Entity type this policy applies to |
| retainForDays | Int | NOT NULL | Retain for N days after creation or last activity |
| purgeBehavior | String | NOT NULL | SOFT_DELETE_ONLY / HARD_DELETE (hard delete deferred) |
| isActive | Boolean | NOT NULL, DEFAULT false | Disabled by default — not enforced in Sprint 11 |
| legalHoldEnabled | Boolean | NOT NULL, DEFAULT false | If true, retention cannot expire |
| notes | String | nullable | Policy description |
| createdByUserId | String | FK User, NOT NULL | Owner who created the policy |
| createdAt | DateTime | NOT NULL | Creation timestamp |

**Rule GOV-RET-01:** Retention policy enforcement (automated purge) is deferred. All policies are created with `isActive = false` by default in Sprint 11. The policy management UI and API are available.

**Rule GOV-RET-02:** Legal hold flag (`legalHoldEnabled = true`) prevents retention policy from applying to an entity. Legal hold is a manual override set by the Owner.

**Rule GOV-RET-03:** Hard delete (purgeBehavior = HARD_DELETE) is not executed in Sprint 11 regardless of policy configuration.

---

## Export Control Foundation Specification

### Table: `ExportRequest`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | String | PK, cuid() | Unique export request identifier |
| tenantId | String | FK Tenant, NOT NULL | Tenant scope |
| requestedByUserId | String | FK User, NOT NULL | Owner who requested the export |
| entityType | String | NOT NULL | Entity type to export |
| format | ExportFormat | NOT NULL | CSV / JSON / PDF (all placeholder) |
| status | ExportStatus | NOT NULL, DEFAULT PENDING | Export lifecycle status |
| filters | JSON | nullable | Applied filters (date range, status, etc.) |
| fileUrl | String | nullable | Reserved for future export file delivery |
| expiresAt | DateTime | nullable | Reserved for future export link expiry |
| notes | String | nullable | Export purpose notes |
| createdAt | DateTime | NOT NULL | Creation timestamp |

### Enum: `ExportFormat`
`CSV` · `JSON` · `PDF`

### Enum: `ExportStatus`
`PENDING` · `PROCESSING` · `COMPLETED` · `FAILED` · `EXPIRED`

**Rule GOV-EXP-01:** Export access is Owner-only in Sprint 11. MANAGER, EMPLOYEE, CONTRACTOR, and CLIENT cannot create export requests.

**Rule GOV-EXP-02:** Export execution is a placeholder in Sprint 11. The `POST /api/governance/exports` endpoint creates an ExportRequest record with status = PENDING and returns a placeholder response: `{ message: "Export queued. Export file delivery is not yet available." }`

**Rule GOV-EXP-03:** Finance data export (invoices, payments) is only available to OWNER role. The ExportRequest for finance entity types is rejected with HTTP 403 for non-Owner roles.

**Rule GOV-EXP-04:** All export request creation events are audit logged: `governance.export.requested` with entityType, format, requestedByUserId, and filters.

---

## Client-Safe Data Exclusion Rules (Search and Reports)

**Rule CSR-01:** Client search results never include records with `visibility = OWNER_ONLY` or `visibility = PUBLIC_INTERNAL`.

**Rule CSR-02:** Client search snippets never include: internal notes content, payment reference numbers, confirmedByUser identifiers, agency cost figures, margin percentages, or payroll data.

**Rule CSR-03:** Client search result cards for invoices show: invoiceNumber, status, total, balanceDue, dueAt. No internal notes, no confirmedByUser, no payment reference.

**Rule CSR-04:** Client search does not surface DRAFT invoices or VOID invoices.

**Rule CSR-05:** Client search does not surface internal chat messages from workspace channels.

**Rule CSR-06:** Client search does not surface voice note content or transcripts.

**Rule CSR-07:** Client search pagination totals are always derived from the client-scoped result set. The total count never reflects internal records excluded from the client scope.

**Rule CSR-08:** The ClientSearchService applies a compound query scope: `tenantId = requestingTenantId AND (clientUserId = requestingUserId OR visibility = CLIENT_VISIBLE where clientUserId matches)`.
