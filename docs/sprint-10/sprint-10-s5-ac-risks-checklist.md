# Sprint 10 Execution Package — Section 5
## Acceptance Criteria · Risk Register · Deferred Scope Register · Seed Data · Approval Checklist

---

## Acceptance Criteria

### Data Model Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| DM-S10-01 | Invoice table exists with all 17 required columns | Schema validated, migration applied |
| DM-S10-02 | InvoiceLine table exists with all 10 required columns | Schema validated |
| DM-S10-03 | Payment table exists with all 15 required columns | Schema validated |
| DM-S10-04 | CreditNote placeholder table exists | Schema validated |
| DM-S10-05 | PaymentReminder placeholder table exists | Schema validated |
| DM-S10-06 | All 4 enums defined correctly | InvoiceStatus, PaymentStatus, PaymentMethod, CreditNoteStatus |
| DM-S10-07 | All 10 new indexes created | Index list verified |
| DM-S10-08 | Invoice.invoiceNumber is unique per tenant | Unique constraint enforced |
| DM-S10-09 | All finance tables include tenantId | Schema confirmed |
| DM-S10-10 | Soft-delete pattern applied to Invoice, InvoiceLine, Payment | deletedAt column present |

### Permission & Security Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| PS-S10-01 | OWNER can access all /api/invoices and /api/payments routes | All 21 owner endpoints return 200 |
| PS-S10-02 | MANAGER cannot access any finance route | All return 403 |
| PS-S10-03 | EMPLOYEE cannot access any finance route | All return 403 |
| PS-S10-04 | CONTRACTOR cannot access any finance route | All return 403 |
| PS-S10-05 | CLIENT cannot access internal finance routes | All return 403 |
| PS-S10-06 | CLIENT can access own /api/client/invoices | Returns client-safe list |
| PS-S10-07 | CLIENT cannot access another client's invoice | Returns 404 |
| PS-S10-08 | Client invoice response excludes internal notes, margin, cost | Field audit passed |
| PS-S10-09 | Client payment response excludes internal reference, confirmedByUser | Field audit passed |
| PS-S10-10 | Finance access denied events audit logged | Audit log confirms |
| PS-S10-11 | 11 RLS policies applied to finance tables | RLS verified |
| PS-S10-12 | tenantId enforced on all finance queries | Cross-tenant test passed |
| PS-S10-13 | ClientScopeGuard applied to all /api/client/finance routes | Guard applied |
| PS-S10-14 | Soft-deleted invoices not returned in any query | Soft delete test passed |
| PS-S10-15 | Finance navigation hidden for non-OWNER internal roles | Frontend verified |
| PS-S10-16 | Client navigation shows invoices/payments to CLIENT only | Frontend verified |

### Invoice Lifecycle Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| INV-S10-01 | Invoice created as DRAFT | Status = DRAFT on creation |
| INV-S10-02 | Line items locked when status ≠ DRAFT | HTTP 409 on edit attempt |
| INV-S10-03 | DRAFT → SENT sets issuedAt | issuedAt = timestamp of send action |
| INV-S10-04 | Client first view: SENT → VIEWED | Status updated on first client access |
| INV-S10-05 | Partial payment: status → PARTIALLY_PAID | Confirmed by IT-S10-12 |
| INV-S10-06 | Full payment: status → PAID, paidAt set | Confirmed by IT-S10-11 |
| INV-S10-07 | Overdue job marks qualifying invoices OVERDUE | Confirmed by IT-S10-16 |
| INV-S10-08 | VOID status blocks all mutations | Confirmed by IT-S10-15 |
| INV-S10-09 | Invoice totals always reconcile | subtotal + taxAmount = total verified |
| INV-S10-10 | balanceDue never negative | Validation enforced |

### UI Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| UI-S10-01 | Finance dashboard renders revenue, outstanding, overdue cards | Dashboard test passed |
| UI-S10-02 | Invoice list renders all 7 status badges correctly | Visual test passed |
| UI-S10-03 | Overdue badge shows on overdue rows | Badge test passed |
| UI-S10-04 | Client invoice list shows only own invoices | Client UI test passed |
| UI-S10-05 | Client balance card shows correct 3 metrics | Balance test passed |
| UI-S10-06 | Finance navigation: OWNER sees finance menu | Nav test passed |
| UI-S10-07 | Finance navigation: MANAGER/EMPLOYEE/CONTRACTOR see no finance menu | Nav test passed |
| UI-S10-08 | Client portal navigation: CLIENT sees invoices and payments | Nav test passed |
| UI-S10-09 | Invoice detail shows status timeline | Timeline rendered |
| UI-S10-10 | Invoice PDF button shows placeholder message | Placeholder confirmed |

### Placeholder Acceptance Criteria

| ID | Criterion | Pass Condition |
|---|---|---|
| PH-S10-01 | PDF endpoint returns 501 with descriptive message | Endpoint exists, returns 501 |
| PH-S10-02 | Payment reminder creates PaymentReminder record | Record created, no email sent |
| PH-S10-03 | Credit note creates CreditNote record in DRAFT | Record created, no balance change |
| PH-S10-04 | Refund creates record, no external processing | Record created, no provider call |
| PH-S10-05 | Payment provider status returns not_configured | Endpoint returns placeholder |

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R10-01 | Client seeing another client's invoice via race condition or misconfigured query | Low | Critical | ClientScopeGuard + double-scoped query (tenantId + clientUserId) in service layer; integration test NFV-S10-08 |
| R10-02 | Invoice total reconciliation drift (subtotal ≠ sum of lines) | Medium | High | Recalculate on every line item mutation; SEC-S10 reconciliation tests; DB constraint attempted |
| R10-03 | OverdueDetectionJob runs during DB maintenance, creates inconsistent state | Low | Medium | Job is idempotent; retry-safe; bounded query (only qualifying statuses) |
| R10-04 | Finance notification payload leaks internal notes or cost fields | Low | High | Explicit DTO allow-list for notification payloads; IT-S10-45 tests this |
| R10-05 | Manager-role employee gains finance access via direct URL | Medium | High | Backend PermissionGuard blocks at API level regardless of frontend navigation; SEC-S10-01 tests this |
| R10-06 | InvoiceNumber sequence collision under concurrent creation | Low | Medium | Atomic sequence generation using DB sequence or UUID fallback; IT-S10-02 and IT-S10-35 |
| R10-07 | Payment amount overpayment not blocked | Low | High | Validation: amount ≤ balanceDue enforced in PaymentService before creation; IT-S10-14 |
| R10-08 | Currency mismatch between invoice and payment | Low | Medium | Payment service validates currency match; IT-S10-36 |
| R10-09 | Soft-deleted invoices counted in client balance | Low | High | Balance query always includes deletedAt IS NULL; IT-S10-23 and IT-S10-29 |
| R10-10 | Sprint 10 finance tables added without RLS migration running | Low | Critical | CI pipeline runs prisma migrate before tests; RLS policies verified in security matrix |

---

## Deferred Scope Register (Sprint 10 — Resolves CS-01, CS-02, CS-03)

### CS-01 Resolution — SMTP Email Delivery

**Status:** Formally Deferred
**Target Sprint:** Sprint 13 (Notifications & Communications)
**Scope Boundary:** SMTP email delivery of finance notifications (invoice sent, payment confirmed, overdue reminder) is deferred until Sprint 13. In-app notifications are delivered in Sprint 10. No email credentials are accepted or stored in Sprint 10. The SMTP_HOST, SMTP_USER, SMTP_PASS environment variables remain in .env.example as placeholders.

### CS-02 Resolution — Presence Indicators

**Status:** Formally Deferred — Not in Sprint 10 scope
**Target Sprint:** Unassigned (post-Block 2, likely Sprint 14+)
**Scope Boundary:** Online/offline/typing presence indicators for workspace users are not implemented in any sprint through Sprint 10. This feature requires WebSocket infrastructure improvements beyond the placeholder realtime gateway in Sprint 8. Presence indicators are logged as a known deferred feature for the product backlog.

### CS-03 Resolution — Typing Indicators

**Status:** Formally Deferred — Not in Sprint 10 scope
**Target Sprint:** Unassigned (post-Block 2, likely Sprint 14+)
**Scope Boundary:** Typing indicators in chat channels are not implemented in Sprint 10. The Sprint 8 placeholder implementation does not include real-time typing event broadcasting. This requires production WebSocket infrastructure. Logged in backlog.

### Block 1 Low Findings Carried to Sprint 10 Backlog

| ID | Finding | Action in Sprint 10 |
|---|---|---|
| CS-04 | No RTL-specific test for voice recording UI | Added to Sprint 10 test backlog (out of active scope) |
| CS-05 | No test for message attachment permission change after attachment | Added to Sprint 10 regression test backlog |
| CS-06 | AI context 50,000-character truncation boundary test missing | Added to Sprint 11 AI test backlog |
| CS-07 | No test for voice-to-task confirmed task created_from_draft_id immutability | Added to Sprint 11 voice test backlog |

### Additional Deferred Items (Sprint 10)

| Item | Target |
|---|---|
| Real payment provider integration | Sprint 15+ (Payments milestone) |
| External payment processing (Stripe, PayPal) | Sprint 15+ |
| Tax and VAT automation | Sprint 16+ |
| Accounting integration (Xero, QuickBooks) | Sprint 17+ |
| Invoice PDF generation (real) | Sprint 12 (Reports milestone) |
| Recurring invoice automation | Sprint 14+ |
| Multi-currency conversion | Sprint 13+ |
| Revenue forecasting | Sprint 16+ |
| Manager finance access | Future sprint (needs product decision) |
| Invoice approval workflow | Sprint 11+ |
| Wallet / credit / deposit system | Sprint 15+ |
| Finance BI dashboards | Sprint 12 (Reports) |

---

## Seed Data Requirements

### Seed Invoices (for development and testing)

| invoiceNumber | Client | Status | Total | balanceDue |
|---|---|---|---|---|
| INV-2024-001 | client@example.com | PAID | 2500.00 | 0.00 |
| INV-2024-002 | client@example.com | PARTIALLY_PAID | 5000.00 | 2000.00 |
| INV-2024-003 | client@example.com | OVERDUE | 1800.00 | 1800.00 |
| INV-2024-004 | client@example.com | SENT | 3200.00 | 3200.00 |
| INV-2024-005 | client@example.com | DRAFT | 750.00 | 750.00 |

### Seed Payments

| Invoice | Amount | Method | Status |
|---|---|---|---|
| INV-2024-001 | 2500.00 | BANK_TRANSFER | CONFIRMED |
| INV-2024-002 | 3000.00 | BANK_TRANSFER | CONFIRMED |

---

## Sprint 10 Approval Checklist

### Backend (12 checks)
- [ ] Invoice CRUD endpoints operational (create, read, update, soft-delete)
- [ ] Invoice line item add/edit/remove with reconciliation
- [ ] Invoice status transitions enforced
- [ ] Payment CRUD endpoints operational
- [ ] Manual payment confirmation flow working
- [ ] Partial payment balance recalculation verified
- [ ] Client finance scope enforced (ClientScopeGuard applied)
- [ ] Owner-only finance guard applied to all internal routes
- [ ] OverdueDetectionJob runs and marks invoices correctly
- [ ] Finance notification placeholder creates Notification records
- [ ] All placeholder endpoints return correct placeholder responses
- [ ] 23 finance audit events defined and logging correctly

### Frontend (10 checks)
- [ ] Owner finance dashboard renders correctly
- [ ] Invoice list with status badges and filters working
- [ ] Invoice detail with line items, payments, and timeline
- [ ] Invoice create and line item forms working
- [ ] Client invoice list shows own invoices only
- [ ] Client invoice detail correct (no internal fields)
- [ ] Client payment history correct (no internal fields)
- [ ] Client balance card showing correct metrics
- [ ] Finance navigation: owner sees, non-owner doesn't
- [ ] Client nav: client sees invoices/payments links

### Security (7 checks)
- [ ] All 14 security tests passing
- [ ] All 30 negative finance visibility tests passing
- [ ] All 20 client finance visibility tests passing
- [ ] 11 RLS policies applied and verified
- [ ] Cross-tenant isolation confirmed
- [ ] Audit events for all denied access attempts
- [ ] Finance notification payloads field-audited (no internal data)

### QA (8 checks)
- [ ] All 48 integration tests passing
- [ ] All 10 accessibility tests passing
- [ ] Seed data loads correctly in development
- [ ] Invoice total reconciliation always correct
- [ ] balanceDue cannot go negative
- [ ] Soft delete filter confirmed on all list queries
- [ ] OverdueDetectionJob idempotency confirmed
- [ ] CS-01, CS-02, CS-03 documentation verified complete

### Deferred Scope (3 checks)
- [ ] CS-01 (SMTP): Target sprint documented (Sprint 13)
- [ ] CS-02 (Presence indicators): Formally confirmed deferred
- [ ] CS-03 (Typing indicators): Formally confirmed deferred

---

## Final Sprint 10 Verdict

Sprint 10 may be closed and Sprint 11 may begin when all 40 checklist items are checked and no Critical or High findings remain open.

**Sprint 11 Preview:** Dashboards, Reports Foundation & Analytics Baseline

---

*Document path: `/Users/jihadhilal/Documents/claude/docs/sprint-10/`*
*Sections: s0 (Cover/Scope/Plan) · s1 (Architecture/Entities) · s2 (Workflows) · s3 (UI/API/DB) · s4 (Tests) · s5 (AC/Risks/Checklist)*
