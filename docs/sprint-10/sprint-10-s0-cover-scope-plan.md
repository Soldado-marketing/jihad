# Sprint 10 Execution Package — Section 0
## Cover · Scope · Execution Plan · Owner Matrix

**Sprint Title:** Finance Portal, Client Invoices & Payment Visibility
**Sprint Number:** 10
**Block:** Block 2 — Finance & Reporting Foundation (Sprints 10–12)
**Duration:** 10 working days
**Version:** 1.0
**Prepared:** 2026-06-08
**Depends On:** Sprint 9 (Voice Notes) · Block 1 Close-Out Review v1.0

---

## Sprint Goal

Build the finance portal foundation for MAOS. This sprint defines Owner-only internal finance access, client-safe invoice and payment views, invoice lifecycle foundation, payment visibility, client balance display, overdue invoice indicators, and finance notification placeholders — without exposing internal costs, payroll, margins, profitability, or employee/contractor cost data to any unauthorized user.

---

## Sprint 10 Scope

### Backend
- Invoice entity (create, read, update, soft-delete)
- Invoice line item model (add, edit, remove)
- Invoice status lifecycle (DRAFT → SENT → VIEWED → PARTIALLY_PAID → PAID → OVERDUE → VOID)
- Payment entity (record, read, soft-delete)
- Payment method model (BANK_TRANSFER, CASH, CHEQUE, CARD_MANUAL, OTHER)
- Payment status model (PENDING, CONFIRMED, FAILED, REFUNDED, VOID)
- Partial payment tracking (amount_paid, amount_due, balance_due)
- Manual payment confirmation flow
- Overdue detection service (scheduled job, mark OVERDUE when due_date passes unpaid)
- Client invoice visibility scoping (client sees own invoices only)
- Client payment history scoping (client sees own payments only)
- Client balance calculation (balance_due per client)
- Owner-only finance access enforcement
- Manager/Employee/Contractor finance exclusion enforcement
- Finance audit event logging (all invoice and payment mutations)
- Finance notification placeholder (notification record, no SMTP delivery)
- Payment provider placeholder (provider abstraction, no real integration)
- Credit note placeholder (entity exists, no workflow logic)
- Refund placeholder (entity exists, no workflow logic)
- Client invoice PDF placeholder (endpoint exists, returns placeholder response)
- Finance module RLS policies

### Frontend
- Owner finance dashboard (revenue summary, invoice summary, payment summary, overdue count)
- Owner invoice list view (filterable, sortable, with status badges)
- Owner invoice detail view (line items, payment history, status timeline)
- Invoice creation draft form
- Invoice line item add/edit form
- Invoice status action controls (Send, Mark Paid, Mark Void)
- Client invoice list view (own invoices only, with status, amount due)
- Client invoice detail view (line items, amounts, payment instructions placeholder)
- Client payment history view (own payment records)
- Client balance card (total outstanding balance)
- Overdue invoice badge (badge on invoice list and dashboard)
- Finance navigation (Owner only in workspace nav; client invoice/payment in portal nav)
- Finance access denied view for unauthorized internal roles

### Database
- `Invoice` table (17 columns)
- `InvoiceLine` table (10 columns)
- `Payment` table (15 columns)
- `CreditNote` table (placeholder, 8 columns)
- `PaymentReminder` table (placeholder, 7 columns)
- Finance enums (InvoiceStatus, PaymentStatus, PaymentMethod, CreditNoteStatus)
- Indexes and RLS policies

---

## Sprint 10 Non-Scope

The following items are explicitly excluded from Sprint 10:

- Real payment provider integration (Stripe, PayPal, etc.)
- External payment processing (card, ACH, wire)
- Tax and VAT automation
- Accounting system integration (QuickBooks, Xero, etc.)
- Advanced profitability analytics
- Payroll automation
- Manager finance access (deferred to a later sprint)
- Employee finance access
- Contractor finance access
- Client-facing cost or margin data
- Invoice PDF generation (placeholder endpoint only)
- Recurring invoice automation
- Multi-currency support
- Invoice approval workflow (separate from finance)
- Revenue forecasting
- SMTP email delivery of invoices (CS-01 — documented as deferred below)
- Finance reports and BI dashboards (Sprint 12 scope)
- Wallet or credit system
- Deposit or retainer tracking

---

## Day-by-Day Execution Plan

| Day | Focus | Deliverables |
|---|---|---|
| 1 | Database foundation | Invoice, InvoiceLine, Payment, CreditNote, PaymentReminder schemas · Enums · Migrations |
| 2 | Invoice backend | InvoiceModule · InvoiceService · InvoiceRepository · CRUD endpoints · Owner-only guard |
| 3 | Invoice line items + status | InvoiceLineService · Status transitions · Validation rules · Reconciliation checks |
| 4 | Payment backend | PaymentModule · PaymentService · PaymentRepository · Manual confirmation · Partial payment |
| 5 | Client finance scope | ClientInvoiceService · ClientPaymentService · BalanceService · Client-safe response DTOs |
| 6 | Overdue + notifications | OverdueDetectionJob · FinanceNotificationPlaceholder · Finance audit events |
| 7 | Owner frontend | Finance dashboard · Invoice list · Invoice detail · Invoice create form · Status actions |
| 8 | Client frontend | Client invoice list · Client invoice detail · Payment history · Balance card · Overdue badge |
| 9 | Security + QA | Permission tests · Negative visibility tests · Client visibility tests · RLS verification |
| 10 | Final validation | Acceptance criteria review · Deferred scope documentation · Approval checklist |

---

## Engineering Owner Matrix

| Area | Owner | Reviewer |
|---|---|---|
| Invoice entity (backend) | Backend Lead | Engineering Manager |
| Invoice line items (backend) | Backend Engineer | Backend Lead |
| Payment entity (backend) | Backend Lead | Engineering Manager |
| Partial payment logic | Backend Engineer | Backend Lead |
| Client finance scope | Backend Lead | Security Architect |
| Overdue detection job | Backend Engineer | Engineering Manager |
| Finance notification placeholder | Backend Engineer | Backend Lead |
| Owner finance dashboard (frontend) | Frontend Lead | Product Owner |
| Owner invoice views (frontend) | Frontend Engineer | Frontend Lead |
| Client invoice/payment views (frontend) | Frontend Engineer | Frontend Lead |
| Database schema + migrations | Backend Lead | Engineering Manager |
| RLS policies | Security Architect | Backend Lead |
| Finance audit events | Backend Engineer | Security Architect |
| QA test matrix | QA Lead | Engineering Manager |
| Security + negative tests | Security Architect + QA Lead | CTO |
| Deferred scope register | Product Owner | Engineering Manager |
| Approval checklist | Engineering Manager | CTO |
