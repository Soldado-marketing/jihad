# Sprint 12 Execution Package — Section 0
## Cover · Scope · Numbering Discrepancy Note · Execution Plan · Owner Matrix

**Sprint Title:** Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation
**Sprint Number:** 12
**Block:** Block 2 — Finance & Reporting Foundation (Sprints 10–12) — CLOSING SPRINT
**Duration:** 10 working days
**Version:** 1.0
**Prepared:** 2026-06-11
**Depends On:** Sprint 11 (Reporting/Search/Governance/QA) · Sprint 10 (Finance Portal) · Block 1 Close-Out Review v1.0
**Amendment Reference:** MAOS_EP_Active_Roadmap_Amendment_v1.0.md
**Audit Reference:** MAOS_Full_Roadmap_Sprint_Consistency_Audit_v1.0.docx

---

## ⚠ Numbering Discrepancy Note

Phase 15 Implementation Roadmap v1.0 defined Sprint 12 as **"MVP Release Candidate."** That definition has been formally retired by the **EP Active Roadmap Amendment v1.0** (`docs/MAOS_EP_Active_Roadmap_Amendment_v1.0.md`).

In the active Execution Package Series, Sprint 12 is the **Block 2 closing feature sprint**: Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation.

The Phase 15 Sprint 12 RC artifacts that exist in `docs/sprint-12/` (release-candidate-checklist.md, rc-version-manifest.md, etc.) were generated in a prior session following the Phase 15 path and are **no longer the active Sprint 12 definition**. They will be addressed under a later Block 3 sprint. This EP Sprint 12 document supersedes them.

**Automation Engine is NOT Sprint 12** — deferred to Sprint 16 (Block 3) per Amendment v1.0.

---

## EP Active Roadmap Amendment Reference

| Reference | Value |
|---|---|
| Amendment File | docs/MAOS_EP_Active_Roadmap_Amendment_v1.0.md |
| Amendment Decision | Phase 15 Sprints 10–13 retired; EP Series is sole active roadmap |
| Audit File | docs/MAOS_Full_Roadmap_Sprint_Consistency_Audit_v1.0.docx |
| Audit Verdict | C — Roadmap Amendment Required Before Sprint 12 (resolved by amendment) |
| Sprint 12 Active Title | Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation |
| Phase 15 Sprint 12 Status | RETIRED — not active in EP Series |

---

## Sprint Goal

Close Block 2 by extending Sprint 10 finance data and Sprint 11 reporting/search/governance foundations into finance BI reporting, advanced analytics baseline, invoice PDF generation, export execution foundation, client-safe invoice document access, owner-only finance analytics, and controlled export/audit workflows. Every finance BI route is Owner-only. Clients see only their own invoice PDFs with client-safe field sets. Export jobs are tenant-scoped, file-based, queue-backed, signed-URL-gated, and fully audit-logged.

---

## Sprint 12 Scope

### Backend
- FinanceBIModule, FinanceBIController, FinanceBIService, FinanceBIGuard
- RevenueReportService: total revenue, by period, by client, by project
- InvoiceAnalyticsService: count by status, overdue count, average value, top clients
- PaymentAnalyticsService: total collected, method breakdown, period comparison
- AgingReportService: 0–30, 31–60, 61–90, 90+ day buckets
- CashflowReportService: expected inflows vs actual payments by period
- OutstandingInvoiceService: paginated unpaid invoice list with aging, client, amount
- ClientBalanceService: per-client total invoiced, paid, outstanding — Owner-only
- InvoicePDFModule, InvoicePDFService, InvoicePDFController, InvoicePDFTemplate
- Object storage upload, InvoicePDFRecord table, objectKey, status tracking
- Pre-signed URL generation for Owner download and Client download
- Client-scoped PDF endpoint: clientId ownership check, field redaction
- ExportModule, ExportService, ExportController, ExportQueueService
- ExportJob table: tenantId, requestedBy, exportType, status, retryCount, timestamps
- ExportFile table: exportJobId, objectKey, fileName, fileSize, format, expiresAt
- ExportJobStatus: PENDING → PROCESSING → COMPLETED | FAILED → FAILED_FINAL | CANCELLED
- ExportAuditEvent table: jobId, userId, tenantId, eventType, timestamp
- CsvExportStrategy: invoices, payments, projects, tasks, clients
- PdfExportStrategy: finance summary PDF, invoice list PDF
- XlsxExportStrategy: stub placeholder (real XLSX Sprint 14)
- BullMQ ExportQueue: job creation, processing, retry with exponential backoff
- ExportRetentionService: stub — enforcement deferred to Sprint 15
- All finance BI, PDF generation, export create/download events audit-logged

### Frontend
- /finance/bi: Owner-only BI Dashboard with KPI cards
- /finance/bi/invoices: Invoice analytics view
- /finance/bi/payments: Payment analytics view
- /finance/bi/cashflow: Cashflow report view
- /finance/bi/outstanding: Outstanding invoice paginated table
- /finance/bi/aging: Aging bucket summary
- /invoices/:id/pdf-preview: Owner PDF preview + download
- /exports: Export Center (create, list, status, download)
- /client/invoices/:id/document: Client-safe invoice document

### Database
- New tables: InvoicePDFRecord, ExportJob, ExportFile, ExportAuditEvent
- New enums: InvoicePDFStatus, ExportJobStatus, ExportFileFormat, ExportType
- New indices: ExportJob(tenantId,status), ExportJob(tenantId,requestedBy), InvoicePDFRecord(invoiceId), InvoicePDFRecord(tenantId,status)
- Prisma migration: add_sprint12_finance_bi_pdf_export

---

## Sprint Non-Scope

- SMTP email delivery — CS-01, Sprint 15
- Real payment provider (Stripe/PayPal) — post-MVP
- Tax / accounting automation — post-MVP
- Payroll automation — post-MVP
- Automation Engine / Workflow Rules — Sprint 16 (Block 3)
- Presence / typing indicators (CS-02, CS-03) — Sprint 17+
- Full-text search engine (Elasticsearch) — Sprint 17+
- MVP regression / RC hardening / production launch — Block 3 per Amendment v1.0
- XLSX export real file — Sprint 14 (placeholder only in Sprint 12)
- Manager / employee finance BI access — Owner-only in Sprint 12

---

## Day-by-Day Execution Plan

| Day | Focus | Deliverables |
|---|---|---|
| 1 | Finance BI Module scaffold, DB migration, enums | FinanceBIModule, all 4 new tables, Prisma migration, enums |
| 2 | Revenue + Invoice Analytics backend | RevenueReportService, InvoiceAnalyticsService, /finance/bi/revenue, /finance/bi/invoices/analytics |
| 3 | Payment + Aging + Cashflow + Outstanding backend | PaymentAnalyticsService, AgingReportService, CashflowReportService, OutstandingInvoiceService |
| 4 | Invoice PDF Module: generation + storage + signed URL | InvoicePDFService, storage upload, InvoicePDFRecord CRUD, POST /invoices/:id/pdf/generate |
| 5 | Client-safe Invoice PDF + client PDF download route | ClientScopeGuard on PDF route, client-safe field set, GET /client/invoices/:id/pdf/download |
| 6 | Export Module: ExportJob + queue + CSV strategy | ExportModule, BullMQ ExportQueue, CsvExportStrategy, POST /exports |
| 7 | Export: processing worker + signed URL + retry logic | ExportQueueService worker, ExportFile creation, signed URL endpoint, retry/backoff |
| 8 | Finance BI Dashboard + Invoice Analytics UI | Frontend BI routes, KPI cards, invoice/payment analytics, outstanding table, aging table |
| 9 | Invoice PDF Preview + Export Center + Client Invoice Doc UI | PDF preview embed, Export Center UI, client invoice document page |
| 10 | QA: all test matrices, security tests, AC sign-off, Block 2 Close-Out checklist | All test suites; sign off all ACs; prepare Block 2 Close-Out checklist |

---

## Engineering Owner Matrix

| Area | Owner Role | Sprint 12 Responsibility |
|---|---|---|
| Finance BI Module (backend) | Backend Lead | FinanceBIModule, all analytics services, route guards |
| Invoice PDF Module (backend) | Backend Lead | InvoicePDFService, storage integration, signed URLs |
| Export Module (backend) | Backend Lead | ExportModule, ExportQueueService, CSV/PDF strategies |
| Database | Database Architect | Prisma schema, migration, indices, seed data |
| Finance BI UI | Frontend Lead | BI dashboard, analytics views, charts |
| Invoice PDF UI | Frontend Lead | PDF preview, download flow, client invoice document |
| Export Center UI | Frontend Lead | Export creation form, job list, download flow |
| Security / Guard layer | Security Architect | PermissionGuard, ClientScopeGuard, TenantContextGuard on all Sprint 12 routes |
| QA | QA Lead | All test matrices, negative tests, export security, client PDF isolation |
| DevOps | DevOps Architect | Minio/object storage bucket policy, queue config, env vars |
| Audit Logging | Backend Lead + Security Architect | All finance BI, PDF, export audit events |
