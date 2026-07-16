# Sprint 10 Execution Package — Section 4
## QA Test Matrix · Security Test Matrix · Negative Finance Visibility Tests · Client Visibility Tests · Accessibility Tests

---

## QA Integration Test Matrix

| ID | Test | Category | Priority |
|---|---|---|---|
| IT-S10-01 | Invoice created with DRAFT status | Invoice lifecycle | P0 |
| IT-S10-02 | InvoiceNumber generated uniquely per tenant | Invoice | P0 |
| IT-S10-03 | Line item added to DRAFT invoice, subtotal recalculated | Line items | P0 |
| IT-S10-04 | Line item edited on DRAFT invoice, amount recalculated | Line items | P0 |
| IT-S10-05 | Line item removal triggers subtotal and total recalculation | Line items | P0 |
| IT-S10-06 | Line item blocked when invoice status is SENT | Line items | P0 |
| IT-S10-07 | Invoice transitioned DRAFT → SENT, issuedAt set | Status | P0 |
| IT-S10-08 | Invoice viewed by client, status auto-transitions SENT → VIEWED | Status | P0 |
| IT-S10-09 | Payment recorded creates PENDING record | Payment | P0 |
| IT-S10-10 | Payment confirmed: amountPaid updated, balanceDue recalculated | Payment | P0 |
| IT-S10-11 | Full payment confirmed: invoice status → PAID, paidAt set | Payment | P0 |
| IT-S10-12 | Partial payment confirmed: invoice status → PARTIALLY_PAID | Payment | P0 |
| IT-S10-13 | Second partial payment: balanceDue decremented correctly | Payment | P0 |
| IT-S10-14 | Overpayment blocked (amount > balanceDue) | Payment | P0 |
| IT-S10-15 | Invoice voided: no further mutations allowed | Status | P0 |
| IT-S10-16 | Overdue detection job marks qualifying invoices OVERDUE | Overdue | P0 |
| IT-S10-17 | Overdue job is idempotent (second run does not duplicate events) | Overdue | P0 |
| IT-S10-18 | Client invoice list returns only own invoices | Client | P0 |
| IT-S10-19 | Client balance calculation matches sum of balanceDue across open invoices | Client | P0 |
| IT-S10-20 | Client payment history shows only own confirmed payments | Client | P0 |
| IT-S10-21 | Finance dashboard aggregates correct tenant totals | Dashboard | P1 |
| IT-S10-22 | Invoice totals reconcile: subtotal + taxAmount = total | Reconciliation | P0 |
| IT-S10-23 | Soft-deleted invoices excluded from all list and aggregate queries | Soft delete | P0 |
| IT-S10-24 | Finance notification created on invoice sent | Notification | P1 |
| IT-S10-25 | Finance notification created on payment confirmed | Notification | P1 |
| IT-S10-26 | Finance notification created on invoice overdue | Notification | P1 |
| IT-S10-27 | Credit note placeholder created without modifying invoice balance | Placeholder | P2 |
| IT-S10-28 | Payment reminder placeholder created without sending email | Placeholder | P2 |
| IT-S10-29 | Refund placeholder recorded on payment | Placeholder | P2 |
| IT-S10-30 | Payment provider status returns not_configured | Placeholder | P2 |
| IT-S10-31 | Invoice PDF endpoint returns 501 placeholder | Placeholder | P2 |
| IT-S10-32 | Finance audit event logged for every invoice mutation | Audit | P0 |
| IT-S10-33 | Finance audit event logged for every payment mutation | Audit | P0 |
| IT-S10-34 | Finance access denied event logged for unauthorized attempt | Audit | P0 |
| IT-S10-35 | invoiceNumber uniqueness enforced per tenant | Uniqueness | P0 |
| IT-S10-36 | Currency field must match between invoice and payment | Validation | P1 |
| IT-S10-37 | Invoice with no line items has subtotal = 0, total = 0 | Edge case | P1 |
| IT-S10-38 | Invoice balanceDue cannot go negative | Validation | P0 |
| IT-S10-39 | VOID invoice cannot receive new payments | Status guard | P0 |
| IT-S10-40 | PAID invoice cannot receive additional payments | Status guard | P0 |
| IT-S10-41 | Client balance card shows correct count of overdue invoices | Client | P1 |
| IT-S10-42 | Client sees OVERDUE badge on overdue invoices | Client UI | P1 |
| IT-S10-43 | Owner sees full payment detail including internal reference | Owner | P1 |
| IT-S10-44 | Client cannot see internal reference or confirming user in payment | Client | P0 |
| IT-S10-45 | Finance notification payload excludes internal fields | Notification | P0 |
| IT-S10-46 | Tenant isolation: tenantId enforced on all invoice queries | Tenant | P0 |
| IT-S10-47 | Tenant isolation: tenantId enforced on all payment queries | Tenant | P0 |
| IT-S10-48 | Invoice created by Owner for client user returns correct clientUserId | Owner | P0 |

---

## Security Test Matrix

| ID | Test | Threat | Priority |
|---|---|---|---|
| SEC-S10-01 | MANAGER GET /api/invoices → HTTP 403 | Role escalation | P0 |
| SEC-S10-02 | EMPLOYEE GET /api/invoices → HTTP 403 | Role escalation | P0 |
| SEC-S10-03 | CONTRACTOR GET /api/invoices → HTTP 403 | Role escalation | P0 |
| SEC-S10-04 | CLIENT GET /api/invoices → HTTP 403 | Role escalation | P0 |
| SEC-S10-05 | CLIENT GET /api/finance/dashboard → HTTP 403 | Internal data exposure | P0 |
| SEC-S10-06 | JWT with tampered tenantId → rejected by TenantContextGuard | Token manipulation | P0 |
| SEC-S10-07 | OWNER from tenant A cannot access tenant B invoices | Cross-tenant leak | P0 |
| SEC-S10-08 | Payment confirmation without finance.write → HTTP 403 | Privilege escalation | P0 |
| SEC-S10-09 | Invoice soft-delete without finance.write → HTTP 403 | Privilege escalation | P0 |
| SEC-S10-10 | Client balance endpoint requires valid client JWT | Auth | P0 |
| SEC-S10-11 | Invoice PDF placeholder endpoint: valid permission required | Auth | P0 |
| SEC-S10-12 | Finance audit events do not include client-sensitive fields in plaintext | Audit safety | P0 |
| SEC-S10-13 | Payment provider endpoint returns placeholder, no real credential prompt | Provider safety | P0 |
| SEC-S10-14 | OverdueDetectionJob does not expose tenant data in logs | Job safety | P1 |

---

## Negative Finance Visibility Test Matrix

| ID | Test | Expected Result |
|---|---|---|
| NFV-S10-01 | MANAGER navigates to /finance → redirected to /denied | 403 / redirect |
| NFV-S10-02 | EMPLOYEE navigates to /finance → redirected to /denied | 403 / redirect |
| NFV-S10-03 | CONTRACTOR navigates to /finance → redirected to /denied | 403 / redirect |
| NFV-S10-04 | CLIENT accesses /api/finance/dashboard → 403 | 403 |
| NFV-S10-05 | CLIENT accesses /api/invoices → 403 | 403 |
| NFV-S10-06 | CLIENT accesses /api/payments → 403 | 403 |
| NFV-S10-07 | CLIENT accesses /api/finance/balance (owner endpoint) → 403 | 403 |
| NFV-S10-08 | CLIENT accesses another client's /api/client/invoices/:id → 404 | 404 |
| NFV-S10-09 | CLIENT payment list includes only own confirmed payments | Own data only |
| NFV-S10-10 | CLIENT invoice response does not include `notes` field | No internal notes |
| NFV-S10-11 | CLIENT invoice response does not include margin or cost field | No internal finance |
| NFV-S10-12 | CLIENT balance = own invoices only (no cross-client aggregate) | Scoped balance |
| NFV-S10-13 | MANAGER finance nav not rendered in workspace nav | No nav item |
| NFV-S10-14 | EMPLOYEE finance nav not rendered | No nav item |
| NFV-S10-15 | CONTRACTOR finance nav not rendered | No nav item |
| NFV-S10-16 | DRAFT invoice not visible to client in /api/client/invoices | DRAFT hidden |
| NFV-S10-17 | VOID invoice not visible to client in /api/client/invoices | VOID hidden |
| NFV-S10-18 | Finance notification payload does not include agency revenue total | Safe payload |
| NFV-S10-19 | Finance notification payload does not include internal notes | Safe payload |
| NFV-S10-20 | Client payment history: confirmedByUser field absent | No internal user |
| NFV-S10-21 | Client payment history: payment reference field absent | No internal ref |
| NFV-S10-22 | Overdue count in client balance card = own overdue invoices only | Scoped count |
| NFV-S10-23 | Invoice pagination total = client-scoped count only | Scoped pagination |
| NFV-S10-24 | Finance dashboard shows zero cost/margin data to non-OWNER | Zero leakage |
| NFV-S10-25 | MANAGER POST /api/invoices → 403 | Role guard |
| NFV-S10-26 | Cross-tenant OWNER cannot POST payment against another tenant's invoice | Tenant guard |
| NFV-S10-27 | Soft-deleted invoice not returned in client invoice list | Soft delete guard |
| NFV-S10-28 | Soft-deleted invoice not returned in owner invoice list | Soft delete guard |
| NFV-S10-29 | Soft-deleted payment not counted in balanceDue | Soft delete guard |
| NFV-S10-30 | Finance access.denied audit event created for every blocked attempt | Audit |

---

## Client Finance Visibility Test Matrix

| ID | Test | Expected |
|---|---|---|
| CFV-S10-01 | Client sees all own SENT invoices in list | Pass |
| CFV-S10-02 | Client sees own VIEWED invoices | Pass |
| CFV-S10-03 | Client sees own PARTIALLY_PAID invoices | Pass |
| CFV-S10-04 | Client sees own PAID invoices | Pass |
| CFV-S10-05 | Client sees own OVERDUE invoices | Pass |
| CFV-S10-06 | Client does NOT see DRAFT invoices | Pass |
| CFV-S10-07 | Client does NOT see VOID invoices | Pass |
| CFV-S10-08 | Client sees correct line items on own invoice | Pass |
| CFV-S10-09 | Client sees correct total and balanceDue | Pass |
| CFV-S10-10 | Client sees clientNotes, not internal notes | Pass |
| CFV-S10-11 | Client sees OVERDUE badge on overdue invoices | Pass |
| CFV-S10-12 | Client balance card shows correct totalOutstanding | Pass |
| CFV-S10-13 | Client balance card shows correct openInvoiceCount | Pass |
| CFV-S10-14 | Client balance card shows correct overdueInvoiceCount | Pass |
| CFV-S10-15 | Client payment history shows amount, currency, method, date | Pass |
| CFV-S10-16 | Client payment history EXCLUDES internal reference | Pass |
| CFV-S10-17 | Client payment history EXCLUDES confirmedByUser | Pass |
| CFV-S10-18 | Client invoice viewed → status transitions to VIEWED | Pass |
| CFV-S10-19 | Invoice sent notification appears in client notification bell | Pass |
| CFV-S10-20 | Payment confirmed notification appears in client notification bell | Pass |

---

## Accessibility Test Matrix

| ID | Test | Standard |
|---|---|---|
| ACC-S10-01 | Finance dashboard keyboard navigable without mouse | WCAG 2.1 AA |
| ACC-S10-02 | Invoice list sortable via keyboard | WCAG 2.1 AA |
| ACC-S10-03 | Status badges use text label, not color alone | WCAG 1.4.1 |
| ACC-S10-04 | Overdue badge has aria-label="Overdue" | WCAG 1.3.1 |
| ACC-S10-05 | Invoice create form has proper label associations | WCAG 1.3.1 |
| ACC-S10-06 | Amount fields announce currency to screen reader | WCAG 1.3.1 |
| ACC-S10-07 | Invoice detail status timeline readable by screen reader | WCAG 4.1.2 |
| ACC-S10-08 | Client invoice list keyboard navigable | WCAG 2.1 AA |
| ACC-S10-09 | Client balance card amounts have aria-label | WCAG 1.3.1 |
| ACC-S10-10 | Finance denied page has clear heading and description | WCAG 2.4.6 |
