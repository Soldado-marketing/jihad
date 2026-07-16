# Sprint 11 Execution Package — Section 4
## QA Test Matrix · Security Test Matrix · Negative Visibility Tests · Client-Safe Search Tests · Data Governance Tests · Accessibility Tests

---

## QA Integration Test Matrix (50 Tests)

| ID | Test | Category | Priority |
|---|---|---|---|
| IT-S11-01 | Owner reporting dashboard loads with correct aggregate counts | Dashboard | P0 |
| IT-S11-02 | Project report returns correct count by status | Reporting | P0 |
| IT-S11-03 | Task report returns correct count by project and assignee | Reporting | P0 |
| IT-S11-04 | Content report returns correct count by status and type | Reporting | P0 |
| IT-S11-05 | File report returns correct count and storage estimate | Reporting | P0 |
| IT-S11-06 | Approval report returns correct pending/approved/rejected counts | Reporting | P0 |
| IT-S11-07 | Chat report returns message count by channel and date range | Reporting | P0 |
| IT-S11-08 | Voice report returns note count and duration by project | Reporting | P0 |
| IT-S11-09 | Finance report placeholder returns invoice counts and revenue total | Reporting | P0 |
| IT-S11-10 | Audit report returns filterable audit events | Reporting | P0 |
| IT-S11-11 | Activity report returns recent activity stream | Reporting | P1 |
| IT-S11-12 | Search returns correct results for query matching project title | Search | P0 |
| IT-S11-13 | Search returns correct results for query matching task title | Search | P0 |
| IT-S11-14 | Search returns correct results for query matching content post title | Search | P0 |
| IT-S11-15 | Search returns correct results for query matching file name | Search | P0 |
| IT-S11-16 | Search results do not include soft-deleted entities | Search | P0 |
| IT-S11-17 | Search results do not include archived entities (default filter) | Search | P0 |
| IT-S11-18 | Search includes archived entities when Owner uses include-archived filter | Search | P1 |
| IT-S11-19 | Search pagination total reflects only permission-scoped result count | Search | P0 |
| IT-S11-20 | Client search returns only own CLIENT_VISIBLE entities | Search | P0 |
| IT-S11-21 | Client search does not include DRAFT or VOID invoices | Search | P0 |
| IT-S11-22 | Search index updated when entity is created | Index | P0 |
| IT-S11-23 | Search index updated when entity title is changed | Index | P0 |
| IT-S11-24 | Search index isDeleted = true when entity is soft-deleted | Index | P0 |
| IT-S11-25 | Search index isArchived = true when entity is archived | Index | P0 |
| IT-S11-26 | SearchIndex entry is unique per (tenantId, entityId) | Index | P0 |
| IT-S11-27 | Soft-deleted entity not returned in any report aggregate | Governance | P0 |
| IT-S11-28 | Soft-delete audit event created on entity soft-delete | Governance | P0 |
| IT-S11-29 | Manual archive sets isArchived = true and updates SearchIndex | Governance | P0 |
| IT-S11-30 | Archive audit event created on manual archive | Governance | P0 |
| IT-S11-31 | Retention policy created with isActive = false | Governance | P0 |
| IT-S11-32 | Retention policy enforcement does not execute in Sprint 11 | Governance | P0 |
| IT-S11-33 | Export request created with status = PENDING | Export | P0 |
| IT-S11-34 | Export placeholder returns correct placeholder message | Export | P0 |
| IT-S11-35 | Export audit event created on export request | Export | P0 |
| IT-S11-36 | Report aggregates exclude soft-deleted records | Reporting | P0 |
| IT-S11-37 | Report aggregates include archived records only when Owner uses filter | Reporting | P1 |
| IT-S11-38 | Finance report placeholder requires both report.read and finance.read | Reporting | P0 |
| IT-S11-39 | Audit report event sensitive fields (token hashes) stripped from response | Reporting | P0 |
| IT-S11-40 | Search snippet contains no internal note content | Search | P0 |
| IT-S11-41 | Search facet counts reflect only scoped result set | Search | P0 |
| IT-S11-42 | Owner search returns OWNER_ONLY entities (invoices, audit data) | Search | P0 |
| IT-S11-43 | Internal role search does not return OWNER_ONLY entities | Search | P0 |
| IT-S11-44 | Search typeahead suggestions limited to accessible entity titles | Search | P1 |
| IT-S11-45 | Report dashboard correctly shows zero-count cards for empty data | Dashboard | P1 |
| IT-S11-46 | Governance dashboard shows active archive policy count | Governance | P1 |
| IT-S11-47 | Export request list shows only requesting user exports | Export | P0 |
| IT-S11-48 | tenantId enforced on all reporting queries | Tenant | P0 |
| IT-S11-49 | tenantId enforced on all search queries | Tenant | P0 |
| IT-S11-50 | tenantId enforced on all governance queries | Tenant | P0 |

---

## Security Test Matrix (16 Tests)

| ID | Test | Threat | Priority |
|---|---|---|---|
| SEC-S11-01 | MANAGER GET /api/reports/dashboard: HTTP 403 | Role escalation | P0 |
| SEC-S11-02 | EMPLOYEE GET /api/reports/projects: HTTP 403 | Role escalation | P0 |
| SEC-S11-03 | CONTRACTOR GET /api/reports/tasks: HTTP 403 | Role escalation | P0 |
| SEC-S11-04 | CLIENT GET /api/reports/dashboard: HTTP 403 | Internal data exposure | P0 |
| SEC-S11-05 | CLIENT GET /api/reports/finance: HTTP 403 | Finance data exposure | P0 |
| SEC-S11-06 | MANAGER GET /api/search returns only assigned records | Search scope | P0 |
| SEC-S11-07 | CLIENT GET /api/search returns HTTP 403; must use /api/search/client | Search isolation | P0 |
| SEC-S11-08 | JWT with tampered tenantId rejected on all report and search routes | Token manipulation | P0 |
| SEC-S11-09 | OWNER from tenant A cannot access tenant B reports | Cross-tenant leak | P0 |
| SEC-S11-10 | Export request by MANAGER: HTTP 403 | Privilege escalation | P0 |
| SEC-S11-11 | Finance export request by EMPLOYEE: HTTP 403 | Finance data exposure | P0 |
| SEC-S11-12 | Audit report sensitive fields (token hashes) not exposed to Owner UI | Audit safety | P0 |
| SEC-S11-13 | Search snippet for CLIENT contains no internal note markers | Client data safety | P0 |
| SEC-S11-14 | GovernanceModule archive action by EMPLOYEE: HTTP 403 | Privilege escalation | P0 |
| SEC-S11-15 | RetentionPolicy creation by CONTRACTOR: HTTP 403 | Privilege escalation | P0 |
| SEC-S11-16 | Search for internal chat messages by CLIENT returns zero results | Chat privacy | P0 |

---

## Negative Visibility Test Matrix (32 Tests)

| ID | Test | Expected Result |
|---|---|---|
| NVT-S11-01 | MANAGER navigates to /reports: redirected to /denied | 403 / redirect |
| NVT-S11-02 | EMPLOYEE navigates to /reports: redirected to /denied | 403 / redirect |
| NVT-S11-03 | CONTRACTOR navigates to /reports: redirected to /denied | 403 / redirect |
| NVT-S11-04 | CLIENT accesses /api/reports/dashboard: 403 | 403 |
| NVT-S11-05 | CLIENT accesses /api/reports/finance: 403 | 403 |
| NVT-S11-06 | CLIENT accesses /api/reports/audit: 403 | 403 |
| NVT-S11-07 | MANAGER search does not return invoices | No invoice results |
| NVT-S11-08 | EMPLOYEE search does not return voice note transcripts | No transcript content |
| NVT-S11-09 | CONTRACTOR search does not return internal notes | No internal notes |
| NVT-S11-10 | CLIENT search does not return internal chat messages | No internal chat |
| NVT-S11-11 | CLIENT search does not return OWNER_ONLY records | No restricted records |
| NVT-S11-12 | CLIENT search snippet contains no cost or margin data | Safe snippet |
| NVT-S11-13 | CLIENT search snippet contains no internal note content | Safe snippet |
| NVT-S11-14 | CLIENT search pagination total reflects only client-scoped records | Scoped count |
| NVT-S11-15 | CLIENT search facets show only accessible entity types | Scoped facets |
| NVT-S11-16 | MANAGER report aggregate does not include finance totals | No finance data |
| NVT-S11-17 | EMPLOYEE report aggregate not accessible | 403 |
| NVT-S11-18 | CLIENT report aggregate not accessible | 403 |
| NVT-S11-19 | Soft-deleted project not counted in project report aggregate | Excluded |
| NVT-S11-20 | Soft-deleted task not returned in task report | Excluded |
| NVT-S11-21 | Soft-deleted invoice not counted in finance placeholder aggregate | Excluded |
| NVT-S11-22 | Archived project not returned in default project report | Excluded by default |
| NVT-S11-23 | Search for soft-deleted entity returns no results | Not found |
| NVT-S11-24 | Search for archived entity returns no results (default filter) | Not found |
| NVT-S11-25 | Finance report placeholder shows no cost breakdown | No cost data |
| NVT-S11-26 | Finance report requires finance.read in addition to report.read | 403 without finance.read |
| NVT-S11-27 | Payroll data not present in any report or search result | Never exposed |
| NVT-S11-28 | Margin and profitability not present in any non-Owner view | Never exposed |
| NVT-S11-29 | Internal notes count not revealed in content report response body | No note content |
| NVT-S11-30 | Voice transcript not indexed in SearchIndex snippet field | Not in snippet |
| NVT-S11-31 | Report access.denied audit event created for every blocked attempt | Audit confirms |
| NVT-S11-32 | Cross-tenant Owner cannot access another tenant search index | Tenant isolated |

---

## Client-Safe Search Test Matrix (20 Tests)

| ID | Test | Expected |
|---|---|---|
| CSST-S11-01 | Client can search own SENT invoices by invoiceNumber | Pass |
| CSST-S11-02 | Client can search own OVERDUE invoices | Pass |
| CSST-S11-03 | Client cannot search DRAFT invoices | Pass (excluded) |
| CSST-S11-04 | Client cannot search VOID invoices | Pass (excluded) |
| CSST-S11-05 | Client can search client-visible content posts | Pass |
| CSST-S11-06 | Client cannot search internal content posts (draft/internal) | Pass (excluded) |
| CSST-S11-07 | Client can search client-visible project files | Pass |
| CSST-S11-08 | Client cannot search internal project files | Pass (excluded) |
| CSST-S11-09 | Client can search own approvals | Pass |
| CSST-S11-10 | Client cannot search another client invoices by ID | 404 |
| CSST-S11-11 | Client search snippet does not include internal notes | Pass |
| CSST-S11-12 | Client search snippet does not include payment reference numbers | Pass |
| CSST-S11-13 | Client search snippet does not include confirmedByUser | Pass |
| CSST-S11-14 | Client search snippet does not include agency cost figures | Pass |
| CSST-S11-15 | Client search result for invoice shows: invoiceNumber, status, total, dueAt | Pass |
| CSST-S11-16 | Client search pagination total = client-scoped result count only | Pass |
| CSST-S11-17 | Client search with no results returns empty result (not 404) | Pass |
| CSST-S11-18 | Client search does not expose existence of non-client entities | Pass |
| CSST-S11-19 | Client search for voice note returns no results | Pass (excluded) |
| CSST-S11-20 | Client search typeahead shows only accessible entity titles | Pass |

---

## Data Governance Test Matrix (20 Tests)

| ID | Test | Expected |
|---|---|---|
| DGT-S11-01 | ArchivePolicy can be created with isActive = false | Pass |
| DGT-S11-02 | RetentionPolicy created with isActive = false by default | Pass |
| DGT-S11-03 | Retention policy enforcement does not run in Sprint 11 | No enforcement |
| DGT-S11-04 | Hard delete not executed regardless of purgeBehavior setting | No hard delete |
| DGT-S11-05 | ExportRequest created with status = PENDING | Pass |
| DGT-S11-06 | Export response is placeholder message, no file generated | Placeholder |
| DGT-S11-07 | Soft-delete sets entity deletedAt and SearchIndex.isDeleted | Both updated |
| DGT-S11-08 | Soft-delete audit event contains entityType and entityId | Audit confirms |
| DGT-S11-09 | Archive sets entity archived flag and SearchIndex.isArchived | Both updated |
| DGT-S11-10 | Archive audit event created | Audit confirms |
| DGT-S11-11 | Recovery endpoint returns placeholder response | Placeholder |
| DGT-S11-12 | Legal hold prevents retention policy from applying (if set) | Policy ignored |
| DGT-S11-13 | Export request scoped to requesting Owner only | Own records |
| DGT-S11-14 | ExportRequest for finance entity blocked for non-Owner | 403 |
| DGT-S11-15 | ArchivePolicy CRUD blocked for non-Owner | 403 |
| DGT-S11-16 | RetentionPolicy CRUD blocked for non-Owner | 403 |
| DGT-S11-17 | Governance module tenantId enforced on all operations | Tenant isolated |
| DGT-S11-18 | Governance audit events visible in Owner audit report | Pass |
| DGT-S11-19 | Export request audit event contains format and entityType | Audit confirms |
| DGT-S11-20 | Governance dashboard shows correct policy and export request counts | Pass |

---

## Accessibility Test Matrix (10 Tests)

| ID | Test | Standard |
|---|---|---|
| ACC-S11-01 | Reports dashboard keyboard navigable without mouse | WCAG 2.1 AA |
| ACC-S11-02 | Report filter controls have proper label associations | WCAG 1.3.1 |
| ACC-S11-03 | Search bar has accessible label ("Search MAOS") | WCAG 1.3.1 |
| ACC-S11-04 | Search results list is keyboard navigable | WCAG 2.1 AA |
| ACC-S11-05 | Search result cards announce entity type to screen reader | WCAG 1.3.1 |
| ACC-S11-06 | Empty search state has clear accessible message | WCAG 2.4.6 |
| ACC-S11-07 | Report tables have accessible column headers | WCAG 1.3.1 |
| ACC-S11-08 | Export placeholder button announces "not yet available" to screen reader | WCAG 4.1.2 |
| ACC-S11-09 | Reports access denied page has clear heading and description | WCAG 2.4.6 |
| ACC-S11-10 | Search filters are screen-reader accessible with aria roles | WCAG 4.1.2 |
