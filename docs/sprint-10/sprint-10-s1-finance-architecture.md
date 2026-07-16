# Sprint 10 Execution Package — Section 1
## Finance Portal Architecture · Access Rules · Entity Specifications

---

## Finance Portal Architecture Overview

The Sprint 10 finance portal has two distinct surfaces:

**1. Owner Finance Workspace (internal)**
Accessible only by the `OWNER` role. Displays all tenant finance data: revenue records, invoice list, payment list, overdue invoices, profitability summary (from Sprint 9), and finance dashboard. Located under the internal workspace navigation.

**2. Client Finance Portal (client-facing)**
Accessible by `CLIENT` role users for their own data only. Displays: own invoices, own payment history, own outstanding balance, and overdue badge. Located under the client portal navigation. Never displays costs, payroll, margins, profitability, or other clients' data.

### Finance Module Components

| Component | Location | Role Access |
|---|---|---|
| FinanceModule | apps/api/src/modules/finance | OWNER only |
| InvoicesModule | apps/api/src/modules/invoices | OWNER (full) · CLIENT (own, read-only) |
| PaymentsModule | apps/api/src/modules/payments | OWNER (full) · CLIENT (own, read-only) |
| OverdueDetectionJob | apps/api/src/modules/finance/jobs | Background (no user role) |
| FinanceNotificationService | apps/api/src/modules/finance/notifications | Internal only |
| BalanceService | apps/api/src/modules/finance/balance | OWNER · CLIENT (own) |
| ClientFinanceService | apps/api/src/modules/finance/client | CLIENT (own only) |

### Finance Data Flow — Owner Path

```
Owner request
→ JwtAuthGuard (validates session)
→ PermissionGuard (requires finance.read or finance.write)
→ TenantContextGuard (scopes to tenantId from JWT)
→ InvoiceService / PaymentService
→ Database (tenantId-scoped query)
→ Response (full finance DTO)
```

### Finance Data Flow — Client Path

```
Client request
→ JwtAuthGuard (validates session)
→ PermissionGuard (requires client.invoice.read)
→ ClientScopeGuard (scopes to client's own records only)
→ ClientInvoiceService / ClientPaymentService
→ Database (tenantId + clientUserId-scoped query, client-safe columns only)
→ Response (client-safe DTO — no costs, margins, or internal fields)
```

---

## Owner-Only Finance Access Specification

### Rule FIN-OWN-01
Finance data (revenue, costs, profitability, payroll, invoice internal details including margin) is restricted to the `OWNER` role. No other internal role (MANAGER, EMPLOYEE, CONTRACTOR) may access finance data in Sprint 10.

### Rule FIN-OWN-02
The `PermissionGuard` must require `finance.read` permission for all internal finance routes. This permission is granted only to the `OWNER` role in the default permission map.

### Rule FIN-OWN-03
Finance navigation (dashboard, invoice list, cost list, revenue list) is rendered only when the authenticated user has `finance.read` permission. The frontend permission check is supplementary — the backend permission check is mandatory and cannot be bypassed by UI manipulation.

### Rule FIN-OWN-04
Owner finance responses include: invoice amount, line item amounts, tax amounts, payment amounts, balance_due, costs, margins, and profitability fields. These fields must never appear in client-facing DTOs.

### Rule FIN-OWN-05
If an OWNER is the requesting user, the `OwnerFinanceGuard` short-circuits the per-client scope requirement. The owner sees all invoices and payments across all clients within the tenant.

---

## Finance Exclusion Rules Specification

### Manager Finance Exclusion

**Rule FIN-EXCL-MGR-01:** Managers must not access `/api/finance/*`, `/api/invoices/*`, or `/api/payments/*` internal routes. Attempting access returns HTTP 403.

**Rule FIN-EXCL-MGR-02:** Manager navigation must not include finance links. The frontend navigation config must not render finance items for the MANAGER role.

**Rule FIN-EXCL-MGR-03:** Manager role is not included in the `finance.read` or `finance.write` permission grants in Sprint 10.

### Employee Finance Exclusion

**Rule FIN-EXCL-EMP-01:** Employees must not access internal finance routes. HTTP 403 on any attempt.

**Rule FIN-EXCL-EMP-02:** Employee navigation must not include finance items.

### Contractor Finance Exclusion

**Rule FIN-EXCL-CON-01:** Contractors must not access internal finance routes. HTTP 403 on any attempt.

**Rule FIN-EXCL-CON-02:** Contractor navigation must not include finance items.

### Client Finance Exclusion Rules

**Rule FIN-EXCL-CLI-01:** Clients must not access internal finance routes (`/api/finance/*`). HTTP 403.

**Rule FIN-EXCL-CLI-02:** Clients must not see invoice totals that include internal cost breakdown, margin, or profitability fields.

**Rule FIN-EXCL-CLI-03:** Clients must not see other clients' invoices. Client invoice queries must filter by `client_user_id = requestingUserId`.

**Rule FIN-EXCL-CLI-04:** Clients must not see agency revenue summaries, cost records, or payroll records.

**Rule FIN-EXCL-CLI-05:** Client balance calculations must include only the requesting client's outstanding invoices.

**Rule FIN-EXCL-CLI-06:** Hidden counts, totals, badge numbers, and pagination metadata must be calculated from client-scoped data only. Never calculate a count from all tenant invoices and return it to a client.

---

## Invoice Entity Specification

### Table: `Invoice`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | String | PK, cuid() | Unique invoice identifier |
| tenantId | String | FK → Tenant, NOT NULL | Tenant scope |
| clientUserId | String | FK → User, NOT NULL | Client the invoice is issued to |
| projectId | String | FK → Project, nullable | Associated project (optional) |
| invoiceNumber | String | UNIQUE per tenant, NOT NULL | Human-readable invoice number (e.g. INV-2024-001) |
| status | InvoiceStatus | NOT NULL, DEFAULT DRAFT | Invoice lifecycle status |
| title | String | NOT NULL | Invoice title/description |
| issuedAt | DateTime | nullable | Date invoice was sent to client |
| dueAt | DateTime | nullable | Payment due date |
| paidAt | DateTime | nullable | Date fully paid |
| subtotal | Decimal(12,2) | NOT NULL, DEFAULT 0 | Sum of line item amounts before tax |
| taxAmount | Decimal(12,2) | NOT NULL, DEFAULT 0 | Tax total |
| total | Decimal(12,2) | NOT NULL, DEFAULT 0 | subtotal + taxAmount |
| amountPaid | Decimal(12,2) | NOT NULL, DEFAULT 0 | Sum of confirmed payments |
| balanceDue | Decimal(12,2) | NOT NULL, DEFAULT 0 | total - amountPaid |
| currency | String | NOT NULL, DEFAULT 'USD' | ISO 4217 currency code |
| notes | String | nullable | Internal notes (never sent to client) |
| clientNotes | String | nullable | Notes visible to client |
| deletedAt | DateTime | nullable | Soft delete timestamp |
| createdAt | DateTime | NOT NULL | Creation timestamp |
| updatedAt | DateTime | NOT NULL | Last update timestamp |

**Indexes:** (tenantId, status) · (tenantId, clientUserId) · (tenantId, dueAt) · (tenantId, deletedAt)

**Reconciliation Rule INV-REC-01:** `subtotal` = SUM of all active InvoiceLine.amount values. Enforced on every line item add/edit/remove.

**Reconciliation Rule INV-REC-02:** `total` = `subtotal` + `taxAmount`. Enforced on every subtotal or taxAmount change.

**Reconciliation Rule INV-REC-03:** `balanceDue` = `total` - `amountPaid`. Enforced on every payment confirmation.

---

## Invoice Line Item Specification

### Table: `InvoiceLine`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | String | PK, cuid() | Unique line item identifier |
| invoiceId | String | FK → Invoice, NOT NULL | Parent invoice |
| tenantId | String | FK → Tenant, NOT NULL | Tenant scope (denormalized for RLS) |
| description | String | NOT NULL | Line item description |
| quantity | Decimal(10,3) | NOT NULL, DEFAULT 1 | Quantity |
| unitPrice | Decimal(12,2) | NOT NULL | Price per unit |
| amount | Decimal(12,2) | NOT NULL | quantity × unitPrice |
| taxRate | Decimal(5,4) | nullable | Tax rate (e.g. 0.2000 for 20%) |
| taxAmount | Decimal(12,2) | nullable | Calculated tax on this line |
| sortOrder | Int | NOT NULL, DEFAULT 0 | Display order |
| deletedAt | DateTime | nullable | Soft delete |
| createdAt | DateTime | NOT NULL | Creation timestamp |

**Validation Rule INV-LINE-01:** `amount` = `quantity` × `unitPrice`. Recalculated on every save.

**Validation Rule INV-LINE-02:** Line items can only be added, edited, or removed when the invoice status is DRAFT. SENT and later statuses lock line items.

---

## Invoice Status Model

### Enum: `InvoiceStatus`

| Value | Description |
|---|---|
| DRAFT | Created but not sent to client |
| SENT | Sent to client (client can see it) |
| VIEWED | Client has viewed the invoice |
| PARTIALLY_PAID | One or more payments received, balance_due > 0 |
| PAID | balance_due = 0, fully settled |
| OVERDUE | dueAt has passed and balance_due > 0 |
| VOID | Cancelled (no further payments) |

### Invoice Lifecycle Transitions

| From | To | Trigger | Actor |
|---|---|---|---|
| DRAFT | SENT | Owner sends invoice | Owner |
| SENT | VIEWED | Client first views the invoice | System (auto on first view) |
| SENT / VIEWED | PARTIALLY_PAID | Payment recorded, balance_due > 0 | Owner (manual confirmation) |
| PARTIALLY_PAID | PAID | Payment recorded, balance_due = 0 | Owner (manual confirmation) |
| SENT / VIEWED | PAID | Full payment recorded | Owner (manual confirmation) |
| SENT / VIEWED / PARTIALLY_PAID | OVERDUE | Scheduled job, dueAt < now, balance_due > 0 | System (OverdueDetectionJob) |
| OVERDUE | PARTIALLY_PAID | Payment recorded, balance_due > 0 | Owner |
| OVERDUE | PAID | Payment recorded, balance_due = 0 | Owner |
| Any except VOID/PAID | VOID | Owner voids invoice | Owner |

**Rule INV-STATUS-01:** VOID invoices cannot be modified, paid, or un-voided.

**Rule INV-STATUS-02:** PAID invoices cannot receive additional payments unless a credit note or refund flow is initiated (placeholder in Sprint 10).

---

## Payment Entity Specification

### Table: `Payment`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | String | PK, cuid() | Unique payment identifier |
| tenantId | String | FK → Tenant, NOT NULL | Tenant scope |
| invoiceId | String | FK → Invoice, NOT NULL | Associated invoice |
| clientUserId | String | FK → User, NOT NULL | Paying client (denormalized) |
| amount | Decimal(12,2) | NOT NULL | Payment amount |
| currency | String | NOT NULL | Must match invoice currency |
| method | PaymentMethod | NOT NULL | How payment was made |
| status | PaymentStatus | NOT NULL, DEFAULT PENDING | Payment lifecycle status |
| reference | String | nullable | Bank reference, cheque number, etc. |
| confirmedAt | DateTime | nullable | When Owner confirmed the payment |
| confirmedByUserId | String | nullable | FK → User (Owner who confirmed) |
| notes | String | nullable | Internal payment notes |
| providerPaymentId | String | nullable | Reserved for future payment provider |
| deletedAt | DateTime | nullable | Soft delete |
| createdAt | DateTime | NOT NULL | Creation timestamp |
| updatedAt | DateTime | NOT NULL | Last update timestamp |

**Indexes:** (tenantId, invoiceId) · (tenantId, clientUserId) · (tenantId, status)

### Enum: `PaymentMethod`
`BANK_TRANSFER` · `CASH` · `CHEQUE` · `CARD_MANUAL` · `OTHER`

### Enum: `PaymentStatus`
`PENDING` · `CONFIRMED` · `FAILED` · `REFUNDED` · `VOID`

---

## Partial Payment Foundation Specification

**Rule PAY-PART-01:** Multiple payment records may exist for a single invoice. The sum of CONFIRMED payment amounts determines `amountPaid` on the invoice.

**Rule PAY-PART-02:** After each payment confirmation, the system recalculates `amountPaid` and `balanceDue` on the parent invoice and updates the invoice status accordingly.

**Rule PAY-PART-03:** Partial payment history is visible to both Owner (full detail) and Client (amount, date, method — no internal notes or references).

**Rule PAY-PART-04:** Partial payments are traceable: each payment record links to the specific invoice and carries a creation timestamp and confirming user reference.

---

## Client Balance Model

**Rule BAL-01:** Client balance = SUM of `balanceDue` across all non-void, non-deleted invoices for `clientUserId` within the tenant.

**Rule BAL-02:** The balance calculation query must be scoped to `tenantId = requestingTenantId AND clientUserId = requestingUserId`.

**Rule BAL-03:** The balance card displayed to the client shows: total outstanding amount, number of open invoices, number of overdue invoices.

**Rule BAL-04:** The balance card must never include revenue totals, cost totals, or cross-client aggregates.

---

## Overdue Invoice Model

**Rule OVER-01:** An invoice becomes OVERDUE when: `dueAt < NOW()` AND `status IN (SENT, VIEWED, PARTIALLY_PAID)` AND `balanceDue > 0`.

**Rule OVER-02:** Overdue detection runs as a scheduled background job (`OverdueDetectionJob`) at a configurable interval (default: daily at 00:00 UTC).

**Rule OVER-03:** The job updates matching invoice records to `status = OVERDUE` and creates an audit event `invoice.overdue.detected` for each updated invoice.

**Rule OVER-04:** Overdue status is displayed to both Owner (in invoice list and dashboard) and Client (in their invoice list with an OVERDUE badge).

---

## Placeholder Entities

### CreditNote (Placeholder)

| Column | Type | Description |
|---|---|---|
| id | String | PK |
| tenantId | String | Tenant scope |
| invoiceId | String | FK → Invoice |
| amount | Decimal(12,2) | Credit amount |
| reason | String | Credit reason |
| status | String | DRAFT, ISSUED, APPLIED, VOID |
| deletedAt | DateTime | Soft delete |
| createdAt | DateTime | Creation timestamp |

Credit note workflow logic is deferred. The entity exists for data model completeness only.

### PaymentReminder (Placeholder)

| Column | Type | Description |
|---|---|---|
| id | String | PK |
| tenantId | String | Tenant scope |
| invoiceId | String | FK → Invoice |
| scheduledAt | DateTime | Scheduled reminder time |
| sentAt | DateTime | null until sent |
| channel | String | EMAIL, IN_APP (deferred) |
| status | String | PENDING, SENT, FAILED, CANCELLED |
| createdAt | DateTime | Creation timestamp |

Reminder delivery is deferred. Entity exists as placeholder.

---

## Finance Notification Placeholder Specification

**Rule FIN-NOTIF-01:** Finance notifications (invoice sent, payment received, invoice overdue) create records in the existing `Notification` table using the Sprint 8 notification model.

**Rule FIN-NOTIF-02:** Notification payloads for finance events use reference-only structure: `{ type, invoiceId, invoiceNumber, amount, currency }`. Internal cost or margin fields must never appear in notification payloads.

**Rule FIN-NOTIF-03:** Finance notifications are delivered to the Owner for all finance events. Clients receive in-app notifications for: invoice sent, payment confirmed, invoice overdue.

**Rule FIN-NOTIF-04:** Email delivery of finance notifications is deferred (CS-01 resolution — see Deferred Scope Register).

**Rule FIN-NOTIF-05:** Notification payloads visible to clients must not include internal notes, margin, or cost fields.
