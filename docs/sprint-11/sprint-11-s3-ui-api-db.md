# Sprint 11 Execution Package — Section 3
## UI Specification · API Inventory · Database Changes · RLS · Audit Events

---

## UI Specification

### Owner Reporting Dashboard

**Route:** /reports/dashboard (internal workspace, OWNER only)

**Components:**
- `ReportsDashboardPage` — page wrapper with permission check, redirects non-Owner to /denied
- `ProjectSummaryCard` — active, completed, overdue project counts with drill-down link
- `TaskSummaryCard` — open, completed, overdue task counts with drill-down link
- `ContentSummaryCard` — posts by status counts
- `FilesSummaryCard` — upload count and storage estimate
- `ApprovalSummaryCard` — pending, approved, rejected, overdue counts
- `ChatSummaryCard` — message count last 30 days
- `VoiceSummaryCard` — voice note count
- `FinanceSummaryPlaceholder` — invoice outstanding + overdue (placeholder badge: "Full analytics in Sprint 12")
- `RecentActivityFeed` — last 10 audit events (entity type, action, actor, timestamp)
- `ReportsNavSidebar` — links to all report views; visible to OWNER only

---

### Report Views (9 individual report pages)

| View | Route | Key Components |
|---|---|---|
| Project Report | /reports/projects | ProjectReportTable, StatusFilter, ClientFilter, DateRangeFilter, OverdueToggle |
| Task Report | /reports/tasks | TaskReportTable, StatusFilter, ProjectFilter, AssigneeFilter, DateRangeFilter |
| Content Report | /reports/content | ContentReportTable, StatusFilter, TypeFilter, AuthorFilter, DateRangeFilter |
| File Report | /reports/files | FileReportTable, ProjectFilter, TypeFilter, DateRangeFilter, StorageUsageBar |
| Approval Report | /reports/approvals | ApprovalReportTable, StatusFilter, TypeFilter, ProjectFilter, DateRangeFilter |
| Chat Report | /reports/chat | ChatVolumeChart, ChannelFilter, DateRangeFilter |
| Voice Report | /reports/voice | VoiceReportTable, ProjectFilter, AuthorFilter, DateRangeFilter |
| Finance Report (Placeholder) | /reports/finance | FinancePlaceholderCard, InvoiceStatusSummary, PlaceholderMessage |
| Audit Report | /reports/audit | AuditEventTable, EntityTypeFilter, ActionFilter, ActorFilter, DateRangeFilter, IPFilter |

All report pages include:
- `ExportPlaceholderButton` — "Export" button that triggers export placeholder workflow (Owner-only)
- `IncludeArchivedToggle` — toggle to include archived records in aggregate (Owner-only)
- `ReportsPagination` — paginated results (50 per page default)

---

### Global Search Bar

**Component:** `GlobalSearchBar` — rendered in the workspace header on all authenticated pages
- Appears for all authenticated roles (internal and client portal)
- Client portal shows a simplified search bar limited to client-visible entities
- Input: debounced (300ms), minimum 2 characters to trigger
- Keyboard shortcut: Cmd/Ctrl + K

**Route:** /search?q={query}&type={entityType}&status={status}&page={n}

**Components:**
- `SearchResultsPage` — full results page
- `SearchResultCard` — entity-type-aware card: icon, title, snippet, status badge, entity type label, link to entity
- `SearchEntityFilter` — filter by entity type (shows only types the user has access to)
- `SearchStatusFilter` — filter by status
- `SearchDateFilter` — filter by creation date range
- `SearchPagination` — permission-scoped (total from scoped result set only)
- `SearchEmptyState` — shown when no results; no indication of hidden results
- `SearchAccessDenied` — shown if user role has no search permission

**Client Portal Search:**
- Simplified bar in client portal header
- Scope: CLIENT_VISIBLE entities only for the requesting client
- No entity type filter for invoice/internal content
- No finance filters beyond client's own invoice search

---

### Governance Views

**Route:** /reports/governance (Owner-only section)

**Components:**
- `GovernanceDashboardPage` — overview of active archive policies, retention policies, export requests
- `ArchivePolicyListPage` (/reports/governance/archive) — create/view archive policies
- `RetentionPolicyListPage` (/reports/governance/retention) — create/view retention policies (all inactive in Sprint 11)
- `ExportRequestListPage` (/reports/governance/exports) — view past export requests and their placeholder status

---

## API Endpoint Inventory (Sprint 11 New Endpoints)

### Reporting Endpoints (Owner-only — require report.read)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /api/reports/dashboard | report.read | Owner reporting dashboard summary |
| GET | /api/reports/projects | report.read | Project report (filterable) |
| GET | /api/reports/tasks | report.read | Task report (filterable) |
| GET | /api/reports/content | report.read | Content report (filterable) |
| GET | /api/reports/files | report.read | File report (filterable) |
| GET | /api/reports/approvals | report.read | Approval report (filterable) |
| GET | /api/reports/chat | report.read | Chat volume report |
| GET | /api/reports/voice | report.read | Voice note report |
| GET | /api/reports/finance | report.read + finance.read | Finance reporting placeholder |
| GET | /api/reports/audit | report.read | Audit event report (filterable) |
| GET | /api/reports/activity | report.read | Activity feed report |

### Search Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /api/search | search.query | Global permission-aware search |
| GET | /api/search/client | client.search | Client-safe search (client portal) |
| GET | /api/search/suggestions | search.query | Typeahead suggestions (title prefix only) |

### Governance Endpoints (Owner-only — require governance.manage)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /api/governance/archive-policies | governance.manage | List archive policies |
| POST | /api/governance/archive-policies | governance.manage | Create archive policy |
| GET | /api/governance/archive-policies/:id | governance.manage | Get archive policy detail |
| PATCH | /api/governance/archive-policies/:id | governance.manage | Update archive policy |
| GET | /api/governance/retention-policies | governance.manage | List retention policies |
| POST | /api/governance/retention-policies | governance.manage | Create retention policy (isActive=false) |
| GET | /api/governance/retention-policies/:id | governance.manage | Get retention policy detail |
| PATCH | /api/governance/retention-policies/:id | governance.manage | Update retention policy |
| POST | /api/governance/exports | export.request | Create export request (placeholder) |
| GET | /api/governance/exports | export.request | List export requests |
| GET | /api/governance/exports/:id | export.request | Get export request status |
| POST | /api/governance/entities/:id/archive | governance.manage | Manually archive an entity |
| POST | /api/governance/entities/:id/recover | governance.manage | Placeholder soft-delete recovery |

**Cumulative API total through Sprint 11: approximately 315 endpoints**

---

## Frontend Route Inventory (Sprint 11 New Routes)

### Internal Routes (OWNER only)

| Route | Component | Permission |
|---|---|---|
| /reports | redirect to /reports/dashboard | report.read |
| /reports/dashboard | ReportsDashboardPage | report.read |
| /reports/projects | ProjectReportPage | report.read |
| /reports/tasks | TaskReportPage | report.read |
| /reports/content | ContentReportPage | report.read |
| /reports/files | FileReportPage | report.read |
| /reports/approvals | ApprovalReportPage | report.read |
| /reports/chat | ChatReportPage | report.read |
| /reports/voice | VoiceReportPage | report.read |
| /reports/finance | FinanceReportPlaceholderPage | report.read + finance.read |
| /reports/audit | AuditReportPage | report.read |
| /reports/activity | ActivityReportPage | report.read |
| /reports/governance | GovernanceDashboardPage | governance.manage |
| /reports/governance/archive | ArchivePolicyListPage | governance.manage |
| /reports/governance/retention | RetentionPolicyListPage | governance.manage |
| /reports/governance/exports | ExportRequestListPage | export.request |

### Global Search Route (All authenticated roles)

| Route | Component | Permission |
|---|---|---|
| /search | SearchResultsPage | search.query |

### Client Portal Search (CLIENT only)

| Route | Component | Permission |
|---|---|---|
| /client/search | ClientSearchResultsPage | client.search |

---

## Database Change List (Sprint 11)

### New Tables

| Table | Columns | Description |
|---|---|---|
| SearchIndex | 14 columns | Search index for all entity types |
| ArchivePolicy | 10 columns | Archive policy definitions |
| RetentionPolicy | 9 columns | Retention policy definitions (all inactive in Sprint 11) |
| ExportRequest | 11 columns | Export request placeholder records |

### New Enums

- `SearchEntityType`: PROJECT, TASK, CONTENT_POST, FILE, APPROVAL, CHAT_MESSAGE, VOICE_NOTE, INVOICE, PAYMENT
- `SearchVisibility`: PUBLIC_INTERNAL, CLIENT_VISIBLE, OWNER_ONLY
- `ExportFormat`: CSV, JSON, PDF
- `ExportStatus`: PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED

### New Indexes

| Table | Index Columns | Type |
|---|---|---|
| SearchIndex | (tenantId, entityType) | B-tree |
| SearchIndex | (tenantId, entityId) | Unique |
| SearchIndex | (tenantId, clientUserId) | B-tree |
| SearchIndex | (tenantId, visibility) | B-tree |
| SearchIndex | (tenantId, isDeleted) | B-tree |
| SearchIndex | (tenantId, projectId) | B-tree |
| ArchivePolicy | (tenantId, entityType) | B-tree |
| ArchivePolicy | (tenantId, isActive) | B-tree |
| RetentionPolicy | (tenantId, entityType) | B-tree |
| ExportRequest | (tenantId, requestedByUserId) | B-tree |
| ExportRequest | (tenantId, status) | B-tree |

**Total new indexes: 11**

### No Modifications to Existing Tables
Sprint 11 adds new tables only. No existing tables are modified.

---

## RLS Policy List (Sprint 11)

| Policy | Table | Rule | Role |
|---|---|---|---|
| search_index_tenant | SearchIndex | tenant_id = current_tenant_id() | ALL |
| search_index_owner_full | SearchIndex | membership.role = OWNER | SELECT, INSERT, UPDATE |
| search_index_internal_roles | SearchIndex | visibility IN (PUBLIC_INTERNAL) AND assignment-scoped | SELECT (MANAGER, EMPLOYEE, CONTRACTOR) |
| search_index_client_read | SearchIndex | client_user_id = current_user_id() AND visibility = CLIENT_VISIBLE | SELECT (CLIENT only) |
| search_index_deleted_filter | SearchIndex | is_deleted = false | SELECT (default; override with explicit filter for OWNER) |
| archive_policy_tenant | ArchivePolicy | tenant_id = current_tenant_id() | ALL |
| archive_policy_owner | ArchivePolicy | membership.role = OWNER | SELECT, INSERT, UPDATE |
| retention_policy_tenant | RetentionPolicy | tenant_id = current_tenant_id() | ALL |
| retention_policy_owner | RetentionPolicy | membership.role = OWNER | SELECT, INSERT, UPDATE |
| export_request_tenant | ExportRequest | tenant_id = current_tenant_id() | ALL |
| export_request_owner | ExportRequest | membership.role = OWNER | SELECT, INSERT |
| export_request_owner_read | ExportRequest | requested_by_user_id = current_user_id() | SELECT |

**Total Sprint 11 RLS policies: 12**

---

## Finance Navigation (Sprint 11 Addition)

- "Reports" menu item (owner-only) added to workspace navigation, linking to /reports/dashboard
- "Search" icon in global header for all roles, linking to /search (role-scoped)
- Client portal: search icon links to /client/search (client-scoped)

---

## Seed Data Requirements (Sprint 11)

### Seed Search Index Entries
On seed run, SearchIndexService.rebuildForTenant(tenantId) is called after seeding demo-agency tenant. This creates SearchIndex entries for all existing seed entities (projects, tasks, invoices, content posts, files).

### Seed Archive Policies (2 example policies — inactive)
| entityType | archiveAfterDays | archiveOnStatus | isActive |
|---|---|---|---|
| PROJECT | 365 | COMPLETED | false |
| INVOICE | 730 | PAID | false |

### Seed Retention Policies (2 example policies — inactive)
| entityType | retainForDays | purgeBehavior | isActive |
|---|---|---|---|
| CHAT_MESSAGE | 730 | SOFT_DELETE_ONLY | false |
| VOICE_NOTE | 365 | SOFT_DELETE_ONLY | false |

---

## Finance Audit Event List (Sprint 11 — New Events)

| Event | Trigger | Actor | Metadata |
|---|---|---|---|
| report.dashboard.viewed | Owner loads report dashboard | Owner | — |
| report.projects.viewed | Owner views project report | Owner | filters applied |
| report.tasks.viewed | Owner views task report | Owner | filters applied |
| report.content.viewed | Owner views content report | Owner | filters applied |
| report.files.viewed | Owner views file report | Owner | filters applied |
| report.approvals.viewed | Owner views approval report | Owner | filters applied |
| report.chat.viewed | Owner views chat report | Owner | filters applied |
| report.voice.viewed | Owner views voice report | Owner | filters applied |
| report.finance.placeholder.viewed | Owner views finance placeholder report | Owner | — |
| report.audit.viewed | Owner views audit report | Owner | filters applied |
| report.activity.viewed | Owner views activity report | Owner | — |
| report.access.denied | Unauthorized access to report route | Any | userId, role, requestedPath |
| search.query.executed | Any user submits a search query | Any | query (hashed), entityTypes, resultCount |
| search.client.query.executed | Client submits a search query | Client | clientUserId, resultCount |
| search.access.denied | Unauthorized search access | Any | userId, role, attemptedScope |
| search.index.updated | Search index entry updated | System | entityType, entityId, operation |
| governance.entity.soft_deleted | Entity soft-deleted | Owner/authorized | entityType, entityId |
| governance.entity.archived | Entity manually archived | Owner | entityType, entityId |
| governance.entity.recover_placeholder | Soft-delete recovery attempted | Owner | entityType, entityId |
| governance.archive_policy.created | Archive policy created | Owner | entityType, policyId |
| governance.archive_policy.updated | Archive policy updated | Owner | policyId, changedFields |
| governance.retention_policy.created | Retention policy created | Owner | entityType, policyId |
| governance.retention_policy.updated | Retention policy updated | Owner | policyId, changedFields |
| governance.export.requested | Export request created | Owner | entityType, format, requestId |

**Total new Sprint 11 audit events: 24**
