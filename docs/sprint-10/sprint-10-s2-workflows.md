# Sprint 10 Execution Package — Section 2
## Workflow Specifications (22 Workflows)

---

## Workflow 1 — Owner Finance Dashboard Load

**Actor:** Owner
**Trigger:** Owner navigates to /finance/dashboard
**Pre-condition:** User is authenticated with OWNER role and finance.read permission

1. JwtAuthGuard validates token; TenantContextGuard sets tenantId.
2. PermissionGuard checks finance.read — if denied, redirect to /denied.
3. FinanceService.getDashboardSummary(tenantId) executes:
   - Total revenue (sum of confirmed payments, current period)
   - Total outstanding (sum of balanceDue across non-void invoices)
   - Overdue count and total (invoices with status OVERDUE)
   - Invoice status breakdown (count per status)
   - Recent invoices (5 most recent, any status)
4. Dashboard renders: revenue card, outstanding card, overdue alert, invoice summary table, recent invoices list.
5. Audit event: finance.dashboard.viewed

**Security:** Owner-only. Manager/Employee/Contractor receive HTTP 403. No finance data in response for non-owner.

---

## Workflow 2 — Owner Invoice List

**Actor:** Owner
**Trigger:** Owner navigates to /finance/invoices
**Pre-condition:** OWNER role, finance.read permission

1. InvoiceService.findAll(tenantId, filters) with optional filters: status, clientUserId, dateRange, overdue flag.
2. Returns paginated list: invoiceNumber, client displayName, status, total, balanceDue, dueAt, issuedAt.
3. Overdue invoices display OVERDUE badge.
4. Soft-deleted invoices excluded from normal view.
5. Audit event: finance.invoice.list.viewed

---

## Workflow 3 — Owner Invoice Detail

**Actor:** Owner
**Trigger:** Owner clicks invoice in list
**Pre-condition:** OWNER role, finance.read permission

1. InvoiceService.findById(tenantId, invoiceId) — returns full invoice with line items, payment history, notes, clientNotes.
2. Full payment history displayed including internal reference and confirming user.
3. Status timeline shown (DRAFT → SENT → VIEWED → etc.).
4. Action buttons rendered based on current status (Send, Record Payment, Void).
5. Audit event: finance.invoice.viewed

---

## Workflow 4 — Invoice Creation Draft

**Actor:** Owner
**Trigger:** Owner clicks "New Invoice"
**Pre-condition:** OWNER role, finance.write permission

1. Owner selects client user from tenant membership (CLIENT role only, active).
2. Owner optionally links to a project.
3. System generates next invoiceNumber in sequence (INV-{YYYY}-{sequence}, tenant-scoped).
4. Invoice created with status DRAFT, subtotal=0, total=0, balanceDue=0.
5. Owner redirected to invoice detail for line item entry.
6. Audit event: finance.invoice.created

**Validation:** Client user must be ACTIVE CLIENT member of the same tenant.

---

## Workflow 5 — Invoice Line Item Add/Edit

**Actor:** Owner
**Trigger:** Owner adds or edits a line item on a DRAFT invoice
**Pre-condition:** Invoice status = DRAFT, OWNER role, finance.write permission

1. Owner enters: description, quantity, unitPrice, taxRate (optional).
2. System calculates: amount = quantity × unitPrice, taxAmount = amount × taxRate.
3. InvoiceLineService.upsert(tenantId, invoiceId, lineData) saves the record.
4. InvoiceService.recalculate(invoiceId) updates: subtotal = SUM(lines.amount), taxAmount = SUM(lines.taxAmount), total = subtotal + taxAmount, balanceDue = total - amountPaid.
5. UI refreshes invoice totals.
6. Audit event: finance.invoice.line_item.updated

**Guard:** Line item mutation blocked if invoice status ≠ DRAFT. Returns HTTP 409 with message "Invoice is locked."

---

## Workflow 6 — Invoice Status Change

**Actor:** Owner
**Trigger:** Owner clicks status action button (Send, Mark Void)
**Pre-condition:** OWNER role, finance.write permission, valid status transition

1. Owner selects action.
2. InvoiceService.transition(tenantId, invoiceId, targetStatus) validates the transition is permitted from current status.
3. If SENT: sets issuedAt = NOW(), makes invoice visible to client.
4. If VOID: sets status = VOID, no further mutations allowed.
5. Audit event: finance.invoice.status_changed (includes fromStatus, toStatus, actorId)

---

## Workflow 7 — Invoice Sent To Client

**Actor:** Owner (manual action) / System (auto after status = SENT)
**Trigger:** Invoice status changes to SENT
**Pre-condition:** Invoice in DRAFT or SENT status, OWNER role

1. InvoiceService.transition sets status = SENT, issuedAt = NOW().
2. FinanceNotificationService creates in-app Notification for client: type=INVOICE_SENT, payload={ invoiceId, invoiceNumber, amount, currency, dueAt }.
3. Notification payload must not include internal notes, margin, or cost fields.
4. Email delivery deferred (CS-01).
5. Audit event: finance.invoice.sent

---

## Workflow 8 — Client Invoice List

**Actor:** Client
**Trigger:** Client navigates to /client/invoices
**Pre-condition:** CLIENT role, client.invoice.read permission

1. ClientScopeGuard confirms requestingUserId = clientUserId.
2. ClientInvoiceService.findAll(tenantId, clientUserId) returns: invoiceNumber, status, total, balanceDue, dueAt, issuedAt.
3. Client-safe DTO: excludes notes, internal references, margin, cost fields.
4. OVERDUE badge shown on overdue invoices.
5. Only SENT, VIEWED, PARTIALLY_PAID, PAID, OVERDUE invoices shown to client. DRAFT and VOID excluded.
6. Audit event: finance.client.invoice.list.viewed

**Security:** Client receives only own invoices. Cross-client data blocked at service layer. HTTP 403 on any attempt to access another client's invoiceId.

---

## Workflow 9 — Client Invoice Detail

**Actor:** Client
**Trigger:** Client clicks on an invoice
**Pre-condition:** CLIENT role, client.invoice.read permission, invoice belongs to requesting client

1. ClientInvoiceService.findById(tenantId, invoiceId, clientUserId) — confirms invoice.clientUserId = requestingUserId.
2. Returns: invoiceNumber, status, line items (description, quantity, unitPrice, amount), subtotal, taxAmount, total, balanceDue, dueAt, clientNotes, payment history (client-safe).
3. Line items are read-only for client.
4. Internal notes not included in response.
5. Auto-transition: if status = SENT, update to VIEWED. Audit event: finance.invoice.viewed_by_client.
6. PDF download placeholder shown (endpoint returns placeholder response in Sprint 10).

---

## Workflow 10 — Client Payment History

**Actor:** Client
**Trigger:** Client navigates to /client/payments or views payment section
**Pre-condition:** CLIENT role, client.payment.read permission

1. ClientPaymentService.findAll(tenantId, clientUserId) returns confirmed payments for requesting client.
2. Client-safe DTO: amount, currency, method (display name only), confirmedAt, invoiceNumber.
3. Internal reference, confirmerUser, internal notes excluded.
4. Sorted: most recent first.
5. Audit event: finance.client.payment.history.viewed

---

## Workflow 11 — Client Balance Display

**Actor:** Client
**Trigger:** Client loads finance portal or balance card
**Pre-condition:** CLIENT role

1. BalanceService.getClientBalance(tenantId, clientUserId):
   - SUM(balanceDue) WHERE clientUserId = requestingUserId AND status NOT IN (VOID, PAID, DRAFT) AND deletedAt IS NULL.
   - COUNT of open invoices.
   - COUNT of overdue invoices.
2. Returns: totalOutstanding, openInvoiceCount, overdueInvoiceCount, currency.
3. Client balance card renders these three values.
4. Audit event: not logged (read-only aggregate, low sensitivity).

**Security:** Balance query is always double-scoped: tenantId + clientUserId. No cross-client aggregation.

---

## Workflow 12 — Partial Payment Recording

**Actor:** Owner
**Trigger:** Owner records a payment against an invoice
**Pre-condition:** OWNER role, finance.write permission, invoice status in SENT/VIEWED/PARTIALLY_PAID/OVERDUE

1. Owner selects invoice, enters: amount, method, reference (optional), notes (optional).
2. Validation: amount > 0, amount ≤ invoice.balanceDue (partial payment allowed, overpayment blocked).
3. PaymentService.create(tenantId, invoiceId, paymentData) creates Payment with status = PENDING.
4. Returned to Owner for confirmation step.
5. Audit event: finance.payment.created

---

## Workflow 13 — Manual Payment Confirmation

**Actor:** Owner
**Trigger:** Owner confirms a PENDING payment
**Pre-condition:** OWNER role, finance.write permission, payment status = PENDING

1. Owner reviews payment details and confirms.
2. PaymentService.confirm(tenantId, paymentId, confirmedByUserId):
   - Sets status = CONFIRMED, confirmedAt = NOW(), confirmedByUserId = owner.id.
   - Updates invoice.amountPaid += payment.amount.
   - Recalculates invoice.balanceDue.
   - If balanceDue = 0 → invoice.status = PAID, paidAt = NOW().
   - If balanceDue > 0 → invoice.status = PARTIALLY_PAID.
3. FinanceNotificationService creates client notification: type=PAYMENT_CONFIRMED, payload={ invoiceId, invoiceNumber, amount, currency }.
4. Audit event: finance.payment.confirmed (includes paymentId, invoiceId, amount, confirmedByUserId).

---

## Workflow 14 — Overdue Invoice Detection

**Actor:** System (OverdueDetectionJob)
**Trigger:** Scheduled job runs (daily at 00:00 UTC by default)
**Pre-condition:** Job has database access (no user session)

1. OverdueDetectionJob.run():
   - Query: invoices WHERE dueAt < NOW() AND status IN (SENT, VIEWED, PARTIALLY_PAID) AND balanceDue > 0 AND deletedAt IS NULL.
   - For each matching invoice: update status = OVERDUE.
   - Create audit event: finance.invoice.overdue.detected for each.
   - Create in-app notification for Owner: type=INVOICE_OVERDUE, payload={ invoiceId, invoiceNumber, clientDisplayName, balanceDue, currency }.
2. Job is idempotent: running twice does not create duplicate OVERDUE records or duplicate audit events.

---

## Workflow 15 — Payment Reminder Placeholder

**Actor:** Owner (manual trigger only in Sprint 10)
**Trigger:** Owner clicks "Send Reminder" on an overdue invoice
**Pre-condition:** OWNER role, invoice status = OVERDUE

1. PaymentReminderService.createPlaceholder(tenantId, invoiceId):
   - Creates PaymentReminder record with status = PENDING, channel = EMAIL, scheduledAt = NOW().
   - Does NOT send email (SMTP deferred — CS-01).
   - Returns placeholder response: { message: "Reminder queued. Email delivery is not yet enabled." }.
2. Audit event: finance.payment.reminder.placeholder_created.

---

## Workflow 16 — Credit Note Placeholder

**Actor:** Owner
**Trigger:** Owner initiates a credit note on a PAID or PARTIALLY_PAID invoice
**Pre-condition:** OWNER role, finance.write permission

1. CreditNoteService.createPlaceholder(tenantId, invoiceId, amount, reason):
   - Creates CreditNote record with status = DRAFT.
   - Does NOT modify invoice balance (credit application deferred).
   - Returns placeholder: { message: "Credit note created. Application workflow not yet enabled." }.
2. Audit event: finance.credit_note.placeholder_created.

---

## Workflow 17 — Refund Placeholder

**Actor:** Owner
**Trigger:** Owner initiates a refund on a CONFIRMED payment
**Pre-condition:** OWNER role, finance.write permission

1. RefundService.createPlaceholder(tenantId, paymentId, amount, reason):
   - Records refund intent in Payment.status (sets to REFUNDED if full refund).
   - Does NOT process external refund (payment provider integration deferred).
   - Returns placeholder: { message: "Refund recorded. External processing not yet enabled." }.
2. Audit event: finance.refund.placeholder_created.

---

## Workflow 18 — Payment Provider Placeholder

**Actor:** Owner (setup) / Client (future checkout flow)
**Trigger:** Owner attempts to configure payment provider
**Pre-condition:** OWNER role

1. PaymentProviderService.getStatus():
   - Returns: { provider: null, status: "not_configured", message: "Payment provider integration not yet enabled." }.
2. No real provider credentials are accepted or stored in Sprint 10.
3. Audit event: finance.provider.status_checked.

---

## Workflow 19 — Client Finance Unauthorized Access

**Actor:** Any non-CLIENT user attempting client finance routes, OR a CLIENT attempting another client's data
**Trigger:** Unauthorized request to /api/client/invoices or /api/client/payments

**Scenario A — Non-client accessing client routes:**
1. PermissionGuard checks client.invoice.read — denied for non-CLIENT roles. Returns HTTP 403.

**Scenario B — Client accessing another client's invoice:**
1. ClientScopeGuard checks invoice.clientUserId = requestingUserId. Mismatch → HTTP 404 (not 403, to prevent disclosure).

**Scenario C — Client accessing internal finance routes:**
1. PermissionGuard checks finance.read — denied for CLIENT role. Returns HTTP 403.

---

## Workflow 20 — Internal Finance Unauthorized Access

**Actor:** MANAGER, EMPLOYEE, or CONTRACTOR attempting internal finance routes
**Trigger:** Unauthorized request to /api/finance/*, /api/invoices/*, /api/payments/*

1. PermissionGuard checks finance.read — denied for MANAGER, EMPLOYEE, CONTRACTOR. Returns HTTP 403.
2. No partial data is returned. No leakage of invoice count or total.
3. Frontend: finance navigation not rendered for these roles. Navigation guard also blocks direct URL access and redirects to /denied.
4. Audit event: finance.access.denied (includes userId, role, requestedPath).

---

## Workflow 21 — Finance Audit Logging

**Actor:** System (triggered on every finance mutation)
**Trigger:** Any invoice or payment create/update/delete/status-change action

Audit events are written to the `AuditEvent` table (Sprint 2 foundation) for every finance action. Each audit event includes: tenantId, userId, action, entityType, entityId, metadata (JSON), ipAddress, userAgent, timestamp.

Finance audit events never include: invoice clientNotes content, payment reference in plain text if sensitive, or other client-readable sensitive fields in the metadata.

---

## Workflow 22 — Finance Notification Placeholder

**Actor:** System
**Trigger:** Invoice sent, payment confirmed, invoice overdue

1. FinanceNotificationService.notify(type, payload, recipientUserId):
   - Creates Notification record via Sprint 8 NotificationsModule.
   - Payload: client-safe fields only (invoiceId, invoiceNumber, amount, currency, dueAt).
   - No internal cost/margin/note fields in payload.
2. In-app notification appears in NotificationBell for recipient.
3. Email delivery: NOT sent. Placeholder logged: finance_notification_email_deferred.
4. Audit event: finance.notification.created.
