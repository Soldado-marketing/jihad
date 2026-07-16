# Sprint 10 Execution Package — Section 3
## Finance UI Specification · API Inventory · Database Changes · RLS · Audit Events

---

## Finance UI Specification

### Owner Finance Dashboard

**Route:** /finance/dashboard (internal workspace, OWNER only)

**Components:**
- `FinanceDashboardPage` — page wrapper with permission check
- `RevenueCard` — total confirmed payments received (current month / all time toggle)
- `OutstandingCard` — total balanceDue across open invoices
- `OverdueAlert` — count and total of OVERDUE invoices, shown only when count > 0, with red highlight
- `InvoiceStatusSummary` — bar chart or count grid: DRAFT, SENT, VIEWED, PARTIALLY_PAID, PAID, OVERDUE counts
- `RecentInvoiceTable` — 5 most recent invoices: invoiceNumber, clientName, status badge, total, balanceDue, dueAt
- `QuickActions` — "New Invoice" button, "View All Invoices" link

**Rules:**
- Rendered only for OWNER role. Non-owner internal users are redirected to /denied.
- No cost, payroll, margin, or profitability summary visible to non-OWNER.

---

### Owner Invoice List View

**Route:** /finance/invoices

**Components:**
- `InvoiceListPage` — with permission guard
- `InvoiceFilterBar` — filters: status (multi-select), client (dropdown), date range, overdue toggle
- `InvoiceTable` — columns: invoiceNumber, clientName, status badge, total, balanceDue, dueAt, issuedAt, actions
- `OverdueBadge` — red badge on OVERDUE rows
- `NewInvoiceButton` — opens invoice creation form
- `InvoicePagination` — paginated results (25 per page default)

**Status Badges:** DRAFT (grey) · SENT (blue) · VIEWED (teal) · PARTIALLY_PAID (amber) · PAID (green) · OVERDUE (red) · VOID (grey strikethrough)

---

### Owner Invoice Detail View

**Route:** /finance/invoices/:id

**Components:**
- `InvoiceDetailPage`
- `InvoiceHeader` — invoiceNumber, status badge, client name, project (if linked), issuedAt, dueAt
- `InvoiceLineItemTable` — description, quantity, unitPrice, amount, taxRate, taxAmount — editable when DRAFT
- `InvoiceTotalsPanel` — subtotal, taxAmount, total, amountPaid, balanceDue
- `InvoiceStatusTimeline` — visual timeline of status transitions
- `PaymentHistoryPanel` — list of payments: amount, method, confirmedAt, reference (internal), confirmedBy
- `InvoiceNotesPanel` — internal notes (never shown to client), clientNotes
- `InvoiceActionBar` — Send (if DRAFT/SENT), Record Payment (if SENT/VIEWED/PARTIALLY_PAID/OVERDUE), Mark Void (if not PAID/VOID)
- `InvoicePdfButton` — placeholder, returns notice that PDF is not yet available

---

### Invoice Creation Form

**Route:** /finance/invoices/new

**Components:**
- `InvoiceCreateForm` — client selector (CLIENT role members only), project selector (optional), title, currency
- On submit: creates DRAFT invoice, redirects to invoice detail for line item entry

---

### Client Invoice List View

**Route:** /client/invoices (client portal, CLIENT role only)

**Components:**
- `ClientInvoiceListPage`
- `ClientBalanceCard` — totalOutstanding, openInvoiceCount, overdueInvoiceCount
- `ClientInvoiceTable` — invoiceNumber, status badge, total, balanceDue, dueAt, issuedAt
- `OverdueBadge` — on overdue rows
- No DRAFT or VOID invoices shown

**Visibility rules:** Only requesting client's invoices. No internal notes, margin, cost, or other-client data.

---

### Client Invoice Detail View

**Route:** /client/invoices/:id

**Components:**
- `ClientInvoiceDetailPage`
- `ClientInvoiceHeader` — invoiceNumber, status badge, issuedAt, dueAt
- `ClientLineItemTable` — description, quantity, unitPrice, amount (read-only)
- `ClientTotalsPanel` — subtotal, taxAmount, total, amountPaid, balanceDue
- `ClientPaymentInstructions` — placeholder panel ("Contact your agency to arrange payment")
- `ClientNotesPanel` — clientNotes only (no internal notes)
- `ClientPdfPlaceholder` — "Invoice PDF available soon"
- No action controls (client cannot change invoice status)

---

### Client Payment History View

**Route:** /client/payments

**Components:**
- `ClientPaymentHistoryPage`
- `ClientPaymentTable` — invoiceNumber, amount, currency, method (display name), confirmedAt
- No internal reference, no confirmedByUser, no internal notes
- Sorted: most recent first

---

### Client Balance Card

**Component:** `ClientBalanceCard` (used in invoice list and portal dashboard)
- totalOutstanding: formatted currency amount
- openInvoiceCount: integer
- overdueInvoiceCount: integer (red if > 0)

---

### Finance Navigation Rules

**Internal Workspace Navigation:**
- Finance menu item (dashboard, invoices, costs, revenue) — visible to OWNER only
- Hidden from MANAGER, EMPLOYEE, CONTRACTOR, CLIENT
- Navigation guard redirects non-OWNER attempts to /denied

**Client Portal Navigation:**
- "Invoices" → /client/invoices — visible to CLIENT only
- "Payments" → /client/payments — visible to CLIENT only
- Hidden from all internal roles

---

## API Endpoint Inventory (Sprint 10 New Endpoints)

### Owner Finance Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /api/finance/dashboard | finance.read | Owner finance dashboard summary |
| GET | /api/invoices | finance.read | List all tenant invoices (paginated, filterable) |
| POST | /api/invoices | finance.write | Create invoice draft |
| GET | /api/invoices/:id | finance.read | Invoice detail (full, with line items + payments) |
| PATCH | /api/invoices/:id | finance.write | Update invoice (DRAFT only for line items) |
| DELETE | /api/invoices/:id | finance.write | Soft-delete invoice (DRAFT or VOID only) |
| POST | /api/invoices/:id/send | finance.write | Transition DRAFT → SENT |
| POST | /api/invoices/:id/void | finance.write | Transition to VOID |
| POST | /api/invoices/:id/lines | finance.write | Add line item (DRAFT only) |
| PUT | /api/invoices/:id/lines/:lineId | finance.write | Edit line item (DRAFT only) |
| DELETE | /api/invoices/:id/lines/:lineId | finance.write | Remove line item (DRAFT only) |
| GET | /api/payments | finance.read | List all tenant payments |
| POST | /api/payments | finance.write | Record a payment (creates PENDING) |
| GET | /api/payments/:id | finance.read | Payment detail |
| POST | /api/payments/:id/confirm | finance.write | Confirm a PENDING payment |
| GET | /api/invoices/:id/pdf | finance.read | Placeholder — returns 501 with message |
| POST | /api/invoices/:id/reminder | finance.write | Placeholder payment reminder |
| POST | /api/credit-notes | finance.write | Placeholder credit note creation |
| POST | /api/payments/:id/refund | finance.write | Placeholder refund |
| GET | /api/finance/balance | finance.read | Tenant-wide outstanding balance summary |
| GET | /api/finance/provider/status | finance.read | Payment provider status (placeholder) |

### Client Finance Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /api/client/invoices | client.invoice.read | Client's own invoices (client-safe) |
| GET | /api/client/invoices/:id | client.invoice.read | Client's own invoice detail |
| GET | /api/client/payments | client.payment.read | Client's own payment history |
| GET | /api/client/balance | client.invoice.read | Client's own outstanding balance |
| GET | /api/client/invoices/:id/pdf | client.invoice.read | Placeholder PDF |

**Cumulative API total through Sprint 10: ~290 endpoints**

---

## Frontend Route Inventory (Sprint 10 New Routes)

### Internal Routes (OWNER only)
| Route | Component | Permission |
|---|---|---|
| /finance | redirect to /finance/dashboard | finance.read |
| /finance/dashboard | FinanceDashboardPage | finance.read |
| /finance/invoices | InvoiceListPage | finance.read |
| /finance/invoices/new | InvoiceCreatePage | finance.write |
| /finance/invoices/:id | InvoiceDetailPage | finance.read |
| /finance/payments | PaymentListPage | finance.read |

### Client Portal Routes (CLIENT only)
| Route | Component | Permission |
|---|---|---|
| /client/invoices | ClientInvoiceListPage | client.invoice.read |
| /client/invoices/:id | ClientInvoiceDetailPage | client.invoice.read |
| /client/payments | ClientPaymentHistoryPage | client.payment.read |

---

## Database Change List (Sprint 10)

### New Tables
- `Invoice` (17 columns — see Section 1)
- `InvoiceLine` (10 columns — see Section 1)
- `Payment` (15 columns — see Section 1)
- `CreditNote` (8 columns — placeholder)
- `PaymentReminder` (7 columns — placeholder)

### New Enums
- `InvoiceStatus`: DRAFT, SENT, VIEWED, PARTIALLY_PAID, PAID, OVERDUE, VOID
- `PaymentStatus`: PENDING, CONFIRMED, FAILED, REFUNDED, VOID
- `PaymentMethod`: BANK_TRANSFER, CASH, CHEQUE, CARD_MANUAL, OTHER
- `CreditNoteStatus`: DRAFT, ISSUED, APPLIED, VOID

### New Indexes
| Table | Index Columns | Type |
|---|---|---|
| Invoice | (tenantId, status) | B-tree |
| Invoice | (tenantId, clientUserId) | B-tree |
| Invoice | (tenantId, dueAt) | B-tree |
| Invoice | (tenantId, deletedAt) | B-tree |
| Invoice | (tenantId, invoiceNumber) | Unique |
| InvoiceLine | (invoiceId, deletedAt) | B-tree |
| InvoiceLine | (tenantId) | B-tree |
| Payment | (tenantId, invoiceId) | B-tree |
| Payment | (tenantId, clientUserId) | B-tree |
| Payment | (tenantId, status) | B-tree |

### No Modifications to Existing Tables
Sprint 10 adds new tables only. No existing tables are modified.

---

## RLS Policy List (Sprint 10)

| Policy | Table | Rule | Role |
|---|---|---|---|
| invoice_tenant_isolation | Invoice | tenant_id = current_tenant_id() | ALL |
| invoice_owner_access | Invoice | membership.role = OWNER | SELECT, INSERT, UPDATE |
| invoice_client_read | Invoice | client_user_id = current_user_id() AND status IN (SENT, VIEWED, PARTIALLY_PAID, PAID, OVERDUE) | SELECT (CLIENT role only) |
| invoice_soft_delete_filter | Invoice | deleted_at IS NULL | SELECT (all roles) |
| invoice_line_tenant | InvoiceLine | tenant_id = current_tenant_id() | ALL |
| invoice_line_owner | InvoiceLine | invoice.owner_accessible | SELECT, INSERT, UPDATE, DELETE |
| invoice_line_soft_delete | InvoiceLine | deleted_at IS NULL | SELECT |
| payment_tenant | Payment | tenant_id = current_tenant_id() | ALL |
| payment_owner_access | Payment | membership.role = OWNER | SELECT, INSERT, UPDATE |
| payment_client_read | Payment | client_user_id = current_user_id() AND status = CONFIRMED | SELECT (CLIENT role only) |
| payment_soft_delete | Payment | deleted_at IS NULL | SELECT |

Total Sprint 10 RLS policies: 11

---

## Finance Audit Event List (Sprint 10)

| Event | Trigger | Actor | Metadata |
|---|---|---|---|
| finance.dashboard.viewed | Owner loads dashboard | Owner | — |
| finance.invoice.list.viewed | Owner views invoice list | Owner | filters applied |
| finance.invoice.created | Invoice created | Owner | invoiceId, clientUserId |
| finance.invoice.viewed | Owner views invoice detail | Owner | invoiceId |
| finance.invoice.updated | Invoice fields updated | Owner | invoiceId, changedFields |
| finance.invoice.status_changed | Status transition | Owner/System | invoiceId, fromStatus, toStatus |
| finance.invoice.sent | Invoice sent to client | Owner | invoiceId, clientUserId, issuedAt |
| finance.invoice.voided | Invoice voided | Owner | invoiceId |
| finance.invoice.deleted | Invoice soft-deleted | Owner | invoiceId |
| finance.invoice.viewed_by_client | Client first views invoice | Client | invoiceId, clientUserId |
| finance.invoice.overdue.detected | Overdue job fires | System | invoiceId, dueAt, balanceDue |
| finance.invoice.line_item.updated | Line item add/edit/remove | Owner | invoiceId, lineId, action |
| finance.payment.created | Payment record created | Owner | paymentId, invoiceId, amount |
| finance.payment.confirmed | Payment confirmed | Owner | paymentId, invoiceId, amount, confirmedByUserId |
| finance.payment.failed | Payment failed | System | paymentId, reason |
| finance.payment.refund.placeholder | Refund placeholder | Owner | paymentId |
| finance.credit_note.placeholder | Credit note placeholder | Owner | invoiceId |
| finance.payment.reminder.placeholder | Reminder placeholder | Owner | invoiceId |
| finance.provider.status_checked | Provider status checked | Owner | — |
| finance.access.denied | Unauthorized access attempt | Any | userId, role, requestedPath |
| finance.client.invoice.list.viewed | Client views own invoice list | Client | clientUserId |
| finance.client.payment.history.viewed | Client views payment history | Client | clientUserId |
| finance.notification.created | Finance notification created | System | type, recipientUserId, invoiceId |

Total finance audit events in Sprint 10: 23
