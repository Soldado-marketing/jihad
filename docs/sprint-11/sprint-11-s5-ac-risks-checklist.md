# Sprint 11 Execution Package — Section 5
## Acceptance Criteria · Risk Register · Deferred Scope Register · Seed Data · Approval Checklist

---

## Acceptance Criteria

### Reporting Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| RPT-S11-01 | Owner reporting dashboard loads with aggregates for all entity types | Dashboard renders all 8+ summary cards correctly |
| RPT-S11-02 | Project report returns tenant-scoped results with status breakdown | Report verified |
| RPT-S11-03 | Task report returns results filterable by project, assignee, status | Report verified |
| RPT-S11-04 | Content report returns counts by status and type | Report verified |
| RPT-S11-05 | File report returns count and storage estimate | Report verified |
| RPT-S11-06 | Approval report returns counts by status | Report verified |
| RPT-S11-07 | Chat report returns message volume by date | Report verified |
| RPT-S11-08 | Voice report returns note count and duration by project | Report verified |
| RPT-S11-09 | Finance report placeholder shows invoice summary with placeholder message | Placeholder confirmed |
| RPT-S11-10 | Audit report shows filterable audit events with safe payloads | Sensitive fields stripped |
| RPT-S11-11 | All report views inaccessible to non-Owner roles | HTTP 403 confirmed |
| RPT-S11-12 | Soft-deleted records excluded from all report aggregates | Exclusion confirmed |
| RPT-S11-13 | Export placeholder button triggers ExportRequest creation and placeholder response | Placeholder confirmed |

### Search Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| SRCH-S11-01 | Global search returns results across projects, tasks, content, files, approvals | Results verified |
| SRCH-S11-02 | Search results are tenant-scoped | Cross-tenant isolation confirmed |
| SRCH-S11-03 | Search results exclude soft-deleted entities | Exclusion confirmed |
| SRCH-S11-04 | Search permission resolver applies correct scope per role | Permission matrix verified |
| SRCH-S11-05 | Search pagination total reflects only scoped result count | Count verified |
| SRCH-S11-06 | Search snippet contains no unauthorized field content | Snippet audit passed |
| SRCH-S11-07 | Client search limited to CLIENT_VISIBLE entities for requesting clientUserId | Scope confirmed |
| SRCH-S11-08 | Client search excludes DRAFT and VOID invoices | Exclusion confirmed |
| SRCH-S11-09 | Client search snippet excludes internal notes, cost fields, payment references | Field audit passed |
| SRCH-S11-10 | Search index updated on entity create/update/delete/archive | Index update confirmed |
| SRCH-S11-11 | SearchIndex unique constraint enforced per (tenantId, entityId) | Constraint confirmed |
| SRCH-S11-12 | Voice note transcript content not in SearchIndex snippet | Not indexed |

### Data Governance Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| DG-S11-01 | ArchivePolicy table exists with all required columns | Schema validated |
| DG-S11-02 | RetentionPolicy table exists with all required columns | Schema validated |
| DG-S11-03 | ExportRequest table exists with all required columns | Schema validated |
| DG-S11-04 | SearchIndex table exists with all required columns | Schema validated |
| DG-S11-05 | All 4 new enums defined correctly | SearchEntityType, SearchVisibility, ExportFormat, ExportStatus |
| DG-S11-06 | All 11 new indexes created | Index list verified |
| DG-S11-07 | 12 RLS policies applied to new tables | RLS verified |
| DG-S11-08 | Soft-delete governance: entity deletedAt + SearchIndex.isDeleted updated atomically | Atomic update confirmed |
| DG-S11-09 | Archive governance: entity archived + SearchIndex.isArchived updated | Update confirmed |
| DG-S11-10 | RetentionPolicy isActive = false by default (no enforcement in Sprint 11) | Default confirmed |
| DG-S11-11 | Export placeholder returns correct message, no file generated | Placeholder confirmed |
| DG-S11-12 | All 12 RLS policies applied to governance tables | RLS verified |
| DG-S11-13 | All 24 new audit events defined and logging correctly | Audit log confirmed |

### UI Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| UI-S11-01 | Reports dashboard renders all summary cards correctly | Visual test passed |
| UI-S11-02 | Reports navigation visible to OWNER only in workspace nav | Nav test passed |
| UI-S11-03 | Global search bar renders on all authenticated pages | Search bar confirmed |
| UI-S11-04 | Search results page renders entity-type-aware result cards | Visual test passed |
| UI-S11-05 | Client portal search bar renders in client header | Client search confirmed |
| UI-S11-06 | Export placeholder button renders on report pages with Owner role | Button confirmed |
| UI-S11-07 | Reports access denied page renders correctly for non-Owner | Denied page confirmed |
| UI-S11-08 | Governance dashboard renders active policy counts | Governance UI confirmed |

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R11-01 | Internal-only entity appearing in client search via misconfigured visibility field | Low | Critical | SearchVisibility enum enforced at query level; RLS policy search_index_client_read; integration test CSST-S11-10 |
| R11-02 | Search snippet containing internal note content indexed by accident | Medium | High | Snippet generation function uses explicit allow-list of safe fields only; IT-S11-40 validates; voice transcript excluded |
| R11-03 | Cross-tenant search result leakage via missing tenantId filter | Low | Critical | TenantContextGuard applied to all search routes; IT-S11-49 and SEC-S11-09 validate |
| R11-04 | Report aggregate count leaking existence of soft-deleted records | Low | Medium | All aggregate queries enforce deletedAt IS NULL by default; IT-S11-36 validates |
| R11-05 | Finance report placeholder exposing finance.read-only data to non-Owner via shared ReportingService cache | Low | High | Finance placeholder is a separate service method requiring BOTH report.read AND finance.read; IT-S11-38 tests dual permission |
| R11-06 | SearchIndex growing unbounded without cleanup on entity hard-delete | Low | Medium | Soft-delete hook updates isDeleted flag; hard delete not permitted in Sprint 11; background cleanup job planned for Sprint 12 |
| R11-07 | Export request created for restricted data type by indirect role escalation | Low | High | ExportRequest service validates entityType against requesting user role before creating record; IT-S11-47 and DGT-S11-14 |
| R11-08 | Hidden count suppression bypass via facet count endpoint | Medium | High | Facet count endpoint uses same permission-resolved query scope as main search; IT-S11-41 validates |
| R11-09 | Retention policy accidentally activated in Sprint 11 leading to premature data loss | Low | Critical | RetentionPolicy.isActive defaults to false; enforcement code not deployed in Sprint 11; DGT-S11-03 validates no enforcement |
| R11-10 | Audit report sensitive payloads (token hashes, session IDs) exposed to Owner UI | Low | High | AuditReportService.sanitize() strips fields from SENSITIVE_PAYLOAD_FIELDS list before returning events; IT-S11-39 validates |

---

## Deferred Scope Register

### CS-01 Resolution — SMTP Email Delivery
**Status:** Formally Deferred — carried from Sprint 10
**Target Sprint:** Sprint 13 (Notifications & Communications)
**Scope Boundary in Sprint 11:** No SMTP email delivery of report exports, governance notifications, or search alert emails. All delivery remains in-app only where applicable.

### CS-02 Resolution — Presence Indicators
**Status:** Formally Deferred — carried from Sprint 10
**Target Sprint:** Unassigned (post-Block 2, likely Sprint 14+)
**Scope Boundary in Sprint 11:** Presence indicators are not implemented. No change from Sprint 10 deferral.

### CS-03 Resolution — Typing Indicators
**Status:** Formally Deferred — carried from Sprint 10
**Target Sprint:** Unassigned (post-Block 2, likely Sprint 14+)
**Scope Boundary in Sprint 11:** Typing indicators are not implemented. No change from Sprint 10 deferral.

### Sprint 11 New Deferral Items

| Item | Target |
|---|---|
| Full-text search with relevance ranking (Elasticsearch/Typesense) | Sprint 14+ (Search Enhancement milestone) |
| Real export execution (CSV, PDF, Excel file generation) | Sprint 13+ (Export & Notifications milestone) |
| Retention policy enforcement (automated purge) | Sprint 13+ (Governance Enforcement milestone) |
| Automated archive execution (policy-driven) | Sprint 12+ |
| GDPR erasure / data purge workflows | Sprint 14+ |
| Real-time reporting (WebSocket push) | Sprint 14+ |
| Report scheduling and email delivery | Sprint 13 (Notifications scope) |
| Manager / Employee / Contractor reporting access | Future sprint (needs product decision) |
| Client-facing report views | Unassigned (post-Block 2) |
| AI-generated report summaries | Sprint 15+ (AI Enhancement scope) |
| Multi-tenant report aggregation | Not in roadmap |
| Voice transcript full-text search | Sprint 14+ (after transcript availability) |
| Advanced finance BI dashboards | Sprint 12 (Finance Reports milestone) |
| Payroll reports | Sprint 14+ (Payroll Enhancement) |
| Cross-tenant data exports | Not in roadmap |
| Soft-delete recovery (un-delete) execution | Sprint 12+ |

---

## Seed Data Requirements

### Seed Archive Policies (2 example policies — inactive)

| entityType | archiveAfterDays | isActive |
|---|---|---|
| PROJECT | 365 | false |
| INVOICE | 730 | false |

### Seed Retention Policies (2 example policies — inactive)

| entityType | retainForDays | purgeBehavior | isActive |
|---|---|---|---|
| CHAT_MESSAGE | 730 | SOFT_DELETE_ONLY | false |
| VOICE_NOTE | 365 | SOFT_DELETE_ONLY | false |

### Seed Search Index
`SearchIndexService.rebuildForTenant('demo-agency')` executed after all other seed data is loaded. Creates SearchIndex entries for:
- All demo projects (visibility = PUBLIC_INTERNAL)
- All demo tasks (visibility = PUBLIC_INTERNAL)
- All demo content posts — published only (visibility = CLIENT_VISIBLE for public posts)
- All demo invoices — SENT/VIEWED/PARTIALLY_PAID/PAID/OVERDUE (visibility = CLIENT_VISIBLE; DRAFT/VOID not indexed for client visibility)
- All demo files (visibility = PUBLIC_INTERNAL or CLIENT_VISIBLE per project settings)

---

## Sprint 11 Approval Checklist

### Backend (14 checks)
- [ ] ReportingModule operational with all 11 report endpoints
- [ ] All report endpoints return tenant-scoped, soft-delete-filtered results
- [ ] Finance report placeholder returns correct aggregates with dual permission requirement
- [ ] Audit report returns filterable events with sensitive field stripping
- [ ] SearchModule operational with permission-aware query execution
- [ ] SearchPermissionResolver applies correct scope per role
- [ ] ClientSearchService applies CLIENT_VISIBLE scope and clientUserId filter
- [ ] Search snippet redaction confirmed (no internal note content, no finance fields)
- [ ] Hidden count suppression confirmed (pagination total from scoped set only)
- [ ] Search index update hooks functional (create/update/delete/archive)
- [ ] GovernanceModule operational: soft-delete, archive, retention, export placeholder
- [ ] All retention policies created with isActive = false (no enforcement)
- [ ] Export placeholder returns correct message, no file generated
- [ ] All 24 governance and reporting audit events logging correctly

### Frontend (8 checks)
- [ ] Owner reporting dashboard renders all entity summary cards
- [ ] All 9 individual report views render with filter controls
- [ ] Finance report placeholder view shows placeholder message
- [ ] Global search bar renders on all authenticated pages
- [ ] Search results page renders entity-type-aware cards
- [ ] Client portal search bar renders and returns client-scoped results
- [ ] Reports navigation renders for OWNER only
- [ ] Governance dashboard renders with policy and export request views

### Security (8 checks)
- [ ] All 16 security tests passing
- [ ] All 32 negative visibility tests passing
- [ ] All 20 client-safe search tests passing
- [ ] All 20 data governance tests passing
- [ ] 12 RLS policies applied and verified on all 4 new tables
- [ ] Cross-tenant isolation confirmed for search and reports
- [ ] Finance report requires dual permission (report.read + finance.read)
- [ ] Audit events for all denied access attempts confirmed

### QA (8 checks)
- [ ] All 50 integration tests passing
- [ ] All 10 accessibility tests passing
- [ ] Seed data and search index rebuild run successfully
- [ ] SearchIndex unique constraint (tenantId, entityId) confirmed
- [ ] Soft-delete and archive governance workflows confirmed
- [ ] Retention policy isActive = false confirmed (no enforcement)
- [ ] Export placeholder confirmed (no file generated)
- [ ] CS-01, CS-02, CS-03 documentation verified complete

### Deferred Scope (4 checks)
- [ ] CS-01 (SMTP): Remains deferred to Sprint 13 — documented
- [ ] CS-02 (Presence indicators): Remains deferred to Sprint 14+ — documented
- [ ] CS-03 (Typing indicators): Remains deferred to Sprint 14+ — documented
- [ ] All Sprint 11 new deferral items documented in deferred scope register

---

## Final Sprint 11 Verdict

Sprint 11 may be closed and Sprint 12 may begin when all 42 checklist items are checked and no Critical or High findings remain open.

**Sprint 12 Preview:** Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation, Export Execution Foundation

---

*Document path: `/Users/jihadhilal/Documents/claude/docs/sprint-11/`*
*Sections: s0 (Cover/Scope/Plan) · s1 (Architecture) · s2 (Workflows) · s3 (UI/API/DB) · s4 (Tests) · s5 (AC/Risks/Checklist)*
