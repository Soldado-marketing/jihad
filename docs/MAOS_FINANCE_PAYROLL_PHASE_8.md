# Marketing Agency Operating System (MAOS)

## Phase 8 Finance & Payroll System Specification

**Version:** 1.0  
**Phase:** Phase 8  
**Status:** Finance & Payroll Specification  
**Parent Documents:** `MAOS_MASTER_SPECIFICATION_v1.1.md`, `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md`, `MAOS_ENTERPRISE_DATABASE_PHASE_2.md`, `MAOS_SECURITY_PERMISSIONS_PHASE_3.md`, `MAOS_CRM_SALES_PHASE_4.md`, `MAOS_UI_UX_DESIGN_SYSTEM_PHASE_5.md`, `MAOS_PROJECT_MANAGEMENT_PHASE_6.md`, `MAOS_COLLABORATION_PHASE_7.md`  
**Document Role:** Complete finance and payroll system specification for MAOS  
**Code Policy:** No code, SQL, implementation scripts, database migrations, or pseudocode are included in this document. Diagrams are written as business flow diagrams only.

---

## 1. Product Context

MAOS is a Marketing Agency Operating System for distributed marketing teams working with clients, projects, content production, design, video editing, approvals, files, chat, voice notes, AI assistant, CRM, finance, and payroll.

The Finance & Payroll System must connect sales revenue, project delivery, tracked time, employee costs, invoices, payments, wallets, payroll approval, and profitability analytics into one secure operating layer.

Finance and payroll are high-sensitivity modules. Default access is Owner only.

---

## 2. Non-Negotiable Business Rules

### 2.1 Time And Payroll Rules

| Rule | Required Enforcement |
| --- | --- |
| No Start = No Time | Time cannot exist without a valid start event or start timestamp |
| No Time = No Payroll | Payroll cannot be calculated without approved tracked time |
| Active Work Only | Time tracking must be linked to active tasks or active projects only |
| Approved Time Only | Payroll must be calculated only from approved tracked time |
| No Unapproved Payroll | Draft, rejected, running, or unapproved time entries cannot create payable payroll |

### 2.2 Financial Access Rules

| Rule | Required Enforcement |
| --- | --- |
| Owner Only Financial Access | Owner is the only role with default access to global finance, payroll, costs, profit, revenue, wallets, and financial dashboards |
| Explicit Grant Required | Managers and employees must not access financial data unless explicitly granted by Owner |
| Payroll Strictness | Payroll data is visible only to Owner unless explicitly granted |
| Client Boundary | Clients can only see their own invoices, payments, wallet balance, and approved financial documents |
| AI Financial Security | AI must respect financial permissions and must never expose financial data to unauthorized users |

### 2.3 Financial Data Safety Rules

- Financial records must be tenant-scoped.
- Financial records must not be destructively deleted after issuance, payment, approval, refund, voiding, or reconciliation.
- All money records must include currency.
- Multi-currency reports must show source currency and reporting currency where converted.
- Payment and wallet records must preserve ledger history.
- Sensitive financial actions must create audit logs.

---

## 3. Approved Foundation

### 3.1 Approved Database Objects

Phase 8 uses the approved Phase 2 database objects:

| Domain | Objects |
| --- | --- |
| Time Tracking | `time_entries`, `timesheets` |
| Payroll | `employee_profiles`, `employee_costs`, `payroll_runs`, `payroll_items` |
| Revenue And Profitability | `revenue_records`, `profitability_records` |
| Invoices | `invoices`, `invoice_line_items` |
| Payments | `payments`, `payment_allocations` |
| Wallets | `wallets`, `wallet_transactions` |
| Context | `clients`, `projects`, `tasks`, `contracts`, `opportunities` |
| Security And Logs | `roles`, `permissions`, `audit_logs`, `activity_logs`, `ai_logs` |
| Collaboration | `files`, `approvals`, `notifications` |

### 3.2 Required UI Alignment

Phase 8 uses the approved Finance Center and Reports concepts from Phase 5:

- Finance Center.
- Invoices tab.
- Payments tab.
- Wallets tab.
- Revenue tab.
- Payroll tab.
- Profitability tab.
- Reports.
- Client Portal finance section.

### 3.3 Required Security Alignment

Phase 8 follows Phase 3:

- Deny by default.
- Tenant isolation.
- Owner default access.
- Explicit permission grants for non-Owner financial access.
- Client access limited to own financial documents.
- AI constrained by user permissions.
- Audit logs for sensitive actions.

---

## 4. Required Diagrams

### 4.1 Finance System Overview Diagram

| Flow | Diagram |
| --- | --- |
| Sales to revenue | CRM opportunity -> Contract/project -> Revenue record -> Invoice -> Payment -> Profitability |
| Delivery to payroll | Active project/task -> Time tracking -> Timesheet approval -> Payroll run -> Payroll item |
| Cost to profit | Employee cost + tracked time cost + project cost -> Cost totals -> Profitability record |
| Client billing | Client -> Invoice -> Partial payment or full payment -> Wallet allocation if applicable -> Client portal view |
| Audit | Every sensitive financial action -> Audit log -> Owner review |

### 4.2 Payroll Calculation Diagram

| Step | Diagram |
| --- | --- |
| 1 | Active task/project confirmed |
| 2 | Time entry started |
| 3 | Time entry ended |
| 4 | Time entry submitted in timesheet |
| 5 | Timesheet approved |
| 6 | Approved payable minutes calculated |
| 7 | Employee cost rate applied |
| 8 | Payroll item created |
| 9 | Payroll run reviewed |
| 10 | Owner approves payroll |

### 4.3 Time Tracking To Payroll Diagram

| Flow | Diagram |
| --- | --- |
| Required path | Active task/project -> Start time -> End time -> Time entry -> Timesheet -> Approval -> Payroll |
| Blocked path | No start -> No time entry -> No timesheet payable time -> No payroll |
| Blocked path | Unapproved time -> Excluded from payroll |
| Blocked path | Inactive task/project -> Time tracking denied |

### 4.4 Invoice And Payment Lifecycle Diagram

| Step | Diagram |
| --- | --- |
| 1 | Draft invoice |
| 2 | Internal invoice approval if required |
| 3 | Sent invoice |
| 4 | Client views invoice |
| 5 | Payment pending |
| 6 | Partial or full payment received |
| 7 | Payment allocated |
| 8 | Invoice becomes partially paid or paid |
| 9 | Revenue and reports update |

### 4.5 Partial Payment Diagram

| Flow | Diagram |
| --- | --- |
| Invoice total | Invoice total amount |
| Payment event | Client pays less than total |
| Allocation | Payment allocated to invoice |
| Result | Amount paid increases and amount due remains |
| Status | Invoice becomes partially paid |
| Next step | Reminder or additional payment |

### 4.6 Wallet Transaction Diagram

| Flow | Diagram |
| --- | --- |
| Credit | Payment or adjustment -> Wallet credit -> Balance increases |
| Debit | Invoice allocation or adjustment -> Wallet debit -> Balance decreases |
| Refund | Refund transaction -> Balance adjusted |
| Ledger | Every wallet movement -> Wallet transaction -> Balance after amount |

### 4.7 Profitability Analytics Diagram

| Flow | Diagram |
| --- | --- |
| Revenue | Invoice revenue + recognized revenue + received payment |
| Costs | Payroll cost + employee cost + project cost |
| Calculation | Revenue minus cost equals gross profit |
| Margin | Gross profit divided by revenue |
| Output | Project profitability + client profitability + tenant profitability |

### 4.8 Financial Permissions Diagram

| Actor | Diagram |
| --- | --- |
| Owner | Full finance, payroll, cost, profit, invoice, payment, wallet, reports |
| Manager | No global financial access unless Owner explicitly grants |
| Employee | No global financial access; own time only unless explicitly granted |
| Client | Own invoices, own payments, own wallet, approved documents only |
| AI | Same permissions as requesting user; never bypasses financial permissions |

### 4.9 Client Billing Diagram

| Flow | Diagram |
| --- | --- |
| Billing source | Contract/project/revenue record |
| Invoice | Draft invoice created |
| Approval | Internal approval if required |
| Client portal | Approved invoice published |
| Payment | Full, partial, or wallet payment |
| Status | Invoice and wallet update |
| Visibility | Client sees only own billing data |

### 4.10 Employee Payroll Diagram

| Flow | Diagram |
| --- | --- |
| Employee work | Employee works on active task/project |
| Time | Employee starts and stops time |
| Timesheet | Employee submits timesheet |
| Approval | Owner or granted payroll approver approves time |
| Payroll | Payroll run includes approved time only |
| Payment status | Payroll item moves to approved or paid |

---

## 5. Financial Security Model

### 5.1 Default Access

| Role | Default Financial Access |
| --- | --- |
| Owner | Full global access |
| Manager | None |
| Employee | None, except own time entry submission |
| Client | Own invoices, own payments, own wallet balance, approved financial documents |

### 5.2 Explicit Grants

Non-Owner access requires explicit Owner grant.

Allowed explicit grants:

- Finance Manager.
- Payroll Manager.
- Invoice Manager.
- Payment Recorder.
- Revenue Analyst.
- Project Profitability Viewer.
- Client Billing Support.

Explicit grants must:

- Be tenant-scoped.
- Be permission-scoped.
- Be auditable.
- Be revocable.
- Never give client users cross-client access.

### 5.3 Recommended Financial Permissions

| Permission | Purpose | Default Holder |
| --- | --- | --- |
| `finance.read` | View financial summaries | Owner |
| `finance.manage` | Manage global finance settings | Owner |
| `revenue.read` | View revenue records | Owner |
| `revenue.manage` | Create/update revenue records | Owner |
| `costs.read` | View costs | Owner |
| `costs.manage` | Manage costs | Owner |
| `profitability.read` | View profitability | Owner |
| `payroll.read` | View payroll | Owner |
| `payroll.manage` | Manage payroll | Owner |
| `payroll.approve` | Approve payroll | Owner |
| `invoices.read` | View invoices | Owner, client for own invoices |
| `invoices.create` | Create invoices | Owner |
| `invoices.approve` | Approve invoices | Owner |
| `invoices.send` | Send invoices | Owner |
| `payments.read` | View payments | Owner, client for own payments |
| `payments.record` | Record payments | Owner |
| `wallets.read` | View wallets | Owner, client for own wallet |
| `wallets.manage` | Manage wallet adjustments | Owner |
| `financial_reports.export` | Export financial reports | Owner |

---

## 6. Module Specification: Revenue Tracking

### 6.1 Purpose

Revenue Tracking records forecasted, contracted, invoiced, recognized, and received revenue by tenant, client, project, opportunity, invoice, currency, and reporting period.

### 6.2 Data Objects

- `revenue_records`
- `opportunities`
- `contracts`
- `projects`
- `clients`
- `invoices`
- `payments`
- `currencies`
- `audit_logs`

### 6.3 Required Fields

- Tenant.
- Client.
- Revenue type.
- Amount.
- Currency.
- Project where applicable.
- Invoice where applicable.
- Opportunity where applicable.
- Recognized date where applicable.
- Period start and period end where applicable.
- Status.

### 6.4 Statuses

- Draft.
- Active.
- Recognized.
- Received.
- Reversed.
- Archived.

### 6.5 User Actions

- Create revenue record.
- Link revenue to opportunity, project, contract, invoice, or payment.
- Update recognition date.
- Reverse revenue record.
- Archive revenue record.
- View revenue dashboard.
- Export revenue report.

### 6.6 Permissions

Default: Owner only.

Non-Owner access requires explicit grant:

- `revenue.read`
- `revenue.manage`
- `financial_reports.export`

Clients cannot access internal revenue records.

### 6.7 Workflows

Revenue Tracking Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Opportunity, contract, project, invoice, or payment creates revenue context | Revenue candidate |
| 2 | Owner reviews amount, currency, client, project, and period | Validated revenue data |
| 3 | Revenue record is created or updated | Revenue tracked |
| 4 | Revenue status changes based on lifecycle | Forecasted, invoiced, recognized, or received |
| 5 | Reports and dashboards refresh | Updated financial visibility |
| 6 | Sensitive changes are audited | Traceability |

### 6.8 Notifications

- Revenue record created above threshold.
- Revenue recognition date changed.
- Revenue reversal created.
- Forecasted revenue slipped.

### 6.9 Audit Log Requirements

Audit required for:

- Creating revenue record.
- Changing amount.
- Changing currency.
- Changing recognized date.
- Reversing revenue.
- Exporting revenue report.

### 6.10 Reports

- Revenue by period.
- Revenue by client.
- Revenue by project.
- Revenue by currency.
- Forecast vs recognized revenue.
- Received revenue.

### 6.11 KPIs

- Total revenue.
- Recognized revenue.
- Received revenue.
- Forecasted revenue.
- Revenue by currency.
- Revenue growth.

### 6.12 Edge Cases

- Invoice voided after revenue recognition.
- Payment received in different currency.
- Revenue record duplicated from invoice and payment.
- Client archived after revenue record exists.
- Opportunity lost after forecasted revenue exists.

### 6.13 Acceptance Criteria

- Revenue is tenant-scoped.
- Revenue requires client and currency.
- Revenue changes are Owner-only unless explicitly granted.
- Revenue reports do not expose data to Managers, Employees, Clients, or AI without permission.

---

## 7. Module Specification: Cost Tracking

### 7.1 Purpose

Cost Tracking records labor, employee, contractor, project, and operational costs that affect project, client, and tenant profitability.

### 7.2 Data Objects

- `employee_costs`
- `employee_profiles`
- `time_entries`
- `payroll_items`
- `projects`
- `clients`
- `currencies`
- `audit_logs`

### 7.3 Required Fields

- Tenant.
- User or employee profile.
- Cost type.
- Amount.
- Currency.
- Period start.
- Period end.
- Project where allocated.
- Client where allocated.
- Status.

### 7.4 Statuses

- Planned.
- Approved.
- Paid.
- Cancelled.
- Reversed.

### 7.5 User Actions

- Create planned cost.
- Allocate cost to client or project.
- Approve cost.
- Mark cost paid.
- Reverse or cancel cost.
- Export cost report.

### 7.6 Permissions

Default: Owner only.

Explicit grants:

- `costs.read`
- `costs.manage`
- `payroll.read`
- `payroll.manage`

Managers and employees must not see global costs by default.

### 7.7 Workflows

Cost Tracking Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Cost source is identified | Employee, contractor, payroll, or project cost |
| 2 | Owner validates amount, currency, period, and allocation | Cost ready |
| 3 | Cost record is created | Cost tracked |
| 4 | Cost is allocated to project, client, or tenant | Profitability input |
| 5 | Cost is approved or cancelled | Status updated |
| 6 | Profitability recalculates | Updated margin |

### 7.8 Notifications

- Cost awaiting approval.
- Cost exceeds threshold.
- Cost allocation missing.
- Cost reversal created.

### 7.9 Audit Log Requirements

Audit required for:

- Creating cost.
- Updating amount.
- Changing allocation.
- Approving cost.
- Marking cost paid.
- Reversing cost.

### 7.10 Reports

- Costs by period.
- Costs by employee.
- Costs by project.
- Costs by client.
- Payroll costs.
- Contractor costs.

### 7.11 KPIs

- Total costs.
- Labor cost.
- Project cost.
- Client cost.
- Cost per billable hour.
- Cost variance.

### 7.12 Edge Cases

- Cost without project allocation.
- Cost period overlaps payroll period.
- Cost recorded in unsupported currency.
- Employee archived after cost exists.
- Duplicate cost from payroll and employee cost record.

### 7.13 Acceptance Criteria

- Costs are Owner-only by default.
- Costs require amount and currency.
- Cost changes are audited.
- Costs feed profitability only after valid status.

---

## 8. Module Specification: Profit Tracking

### 8.1 Purpose

Profit Tracking calculates gross profit and margin by project, client, period, and tenant using revenue and cost data.

### 8.2 Data Objects

- `profitability_records`
- `revenue_records`
- `employee_costs`
- `payroll_items`
- `time_entries`
- `projects`
- `clients`
- `currencies`

### 8.3 Required Fields

- Tenant.
- Period start.
- Period end.
- Revenue amount.
- Cost amount.
- Gross profit amount.
- Gross margin percent.
- Currency.
- Client or project scope.
- Calculation status.
- Calculated timestamp.

### 8.4 Statuses

- Pending.
- Calculated.
- Stale.
- Failed.
- Archived.

### 8.5 User Actions

- View profit dashboard.
- Recalculate profitability.
- Filter by project, client, period, and currency.
- Export profitability report.
- Mark calculation stale when source data changes.

### 8.6 Permissions

Default: Owner only.

Explicit grants:

- `profitability.read`
- `financial_reports.export`

Clients must not see internal profit or margin.

### 8.7 Workflows

Profit Calculation Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Revenue records are collected | Revenue total |
| 2 | Cost records are collected | Cost total |
| 3 | Payroll/time costs are included when approved | Labor cost total |
| 4 | Gross profit is calculated | Revenue minus cost |
| 5 | Margin is calculated | Gross profit divided by revenue |
| 6 | Profitability record is saved | Analytics output |
| 7 | Source changes mark record stale | Recalculation needed |

### 8.8 Notifications

- Project profitability below threshold.
- Client profitability below threshold.
- Profitability calculation failed.
- Profitability data stale.

### 8.9 Audit Log Requirements

Audit required for:

- Exporting profitability reports.
- Manual profitability recalculation.
- Manual override of cost or revenue inputs.

### 8.10 Reports

- Project profitability.
- Client profitability.
- Tenant profitability.
- Profit by period.
- Margin by project.
- Margin by client.

### 8.11 KPIs

- Gross profit.
- Gross margin.
- Profit per client.
- Profit per project.
- Cost-to-revenue ratio.
- Unprofitable projects count.

### 8.12 Edge Cases

- Revenue is zero and cost exists.
- Cost is zero and revenue exists.
- Multi-currency revenue and cost.
- Source data changes after calculation.
- Project completed before all costs are approved.

### 8.13 Acceptance Criteria

- Profitability is Owner-only by default.
- Clients cannot see profit or margin.
- Profit calculations use approved and valid source data only.
- AI cannot expose profitability unless user has permission.

---

## 9. Module Specification: Payroll

### 9.1 Purpose

Payroll calculates payable work from approved tracked time and approved employee cost rules.

### 9.2 Data Objects

- `time_entries`
- `timesheets`
- `employee_profiles`
- `employee_costs`
- `payroll_runs`
- `payroll_items`
- `users`
- `currencies`
- `audit_logs`

### 9.3 Required Fields

- Payroll period start.
- Payroll period end.
- Currency.
- User.
- Approved timesheet or approved payable time.
- Gross amount.
- Payroll status.
- Created by.
- Approved by.
- Paid timestamp where paid.

### 9.4 Statuses

- Draft.
- Pending Review.
- Approved.
- Paid.
- Cancelled.

### 9.5 User Actions

- Create payroll run.
- Review included timesheets.
- Exclude invalid time.
- Add approved employee cost item.
- Approve payroll.
- Mark payroll paid.
- Export payroll report.

### 9.6 Permissions

Default: Owner only.

Explicit grants:

- `payroll.read`
- `payroll.manage`
- `payroll.approve`

Employees may submit time but cannot see payroll calculations by default.

### 9.7 Workflows

Time-To-Payroll Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Employee starts time on active task/project | Valid running time |
| 2 | Employee stops time | Completed time entry |
| 3 | Time entry enters timesheet | Timesheet draft |
| 4 | Timesheet submitted | Pending approval |
| 5 | Approved time becomes payroll-eligible | Payable time |
| 6 | Payroll run collects approved payable time | Payroll draft |
| 7 | Owner reviews payroll | Pending or approved payroll |
| 8 | Payroll marked paid | Payroll completed |

### 9.8 Notifications

- Timesheet submitted.
- Timesheet rejected.
- Payroll run ready for review.
- Payroll approved.
- Payroll marked paid.

### 9.9 Audit Log Requirements

Audit required for:

- Payroll run creation.
- Payroll item adjustment.
- Payroll approval.
- Payroll cancellation.
- Payroll marked paid.
- Payroll export.

### 9.10 Reports

- Payroll by period.
- Payroll by employee.
- Approved hours by employee.
- Paid payroll.
- Pending payroll.

### 9.11 KPIs

- Total payroll cost.
- Approved payable hours.
- Payroll cost per project.
- Payroll cost per client.
- Payroll approval cycle time.

### 9.12 Edge Cases

- Time entry has no start.
- Time entry is still running.
- Task/project is inactive.
- Timesheet rejected.
- Employee has no cost rate.
- Employee profile currency differs from payroll currency.
- Duplicate payroll item for same approved time.

### 9.13 Acceptance Criteria

- No Start = No Time is enforced.
- No Time = No Payroll is enforced.
- Payroll uses approved tracked time only.
- Payroll is Owner-only by default.
- Payroll changes are audited.

---

## 10. Module Specification: Employee Cost Management

### 10.1 Purpose

Employee Cost Management defines salary, hourly cost, contractor cost, benefits, taxes, bonuses, and other employee-related costs used for payroll and profitability.

### 10.2 Data Objects

- `employee_profiles`
- `employee_costs`
- `users`
- `time_entries`
- `payroll_items`
- `projects`
- `clients`
- `currencies`

### 10.3 Required Fields

- User.
- Employment type.
- Cost type.
- Amount.
- Currency.
- Period start.
- Period end.
- Status.

### 10.4 Statuses

- Planned.
- Approved.
- Paid.
- Cancelled.
- Archived.

### 10.5 User Actions

- Create employee profile.
- Set hourly cost or salary cost.
- Add contractor fee.
- Allocate cost to project or client.
- Approve cost.
- Mark cost paid.
- Archive cost.

### 10.6 Permissions

Default: Owner only.

Explicit grant required for all non-Owner access:

- `costs.read`
- `costs.manage`
- `payroll.manage`

Employees cannot see internal cost rates unless explicitly allowed.

### 10.7 Workflows

Employee Cost Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Owner creates or updates employee profile | Cost basis defined |
| 2 | Owner enters cost amount and currency | Cost record |
| 3 | Cost is assigned to period | Cost period |
| 4 | Cost is approved | Approved cost |
| 5 | Cost feeds payroll or profitability | Financial calculation |
| 6 | Sensitive changes are audited | Traceability |

### 10.8 Notifications

- Employee cost missing for payroll.
- Cost rate changed.
- Cost awaiting approval.
- Cost period ending.

### 10.9 Audit Log Requirements

Audit required for:

- Creating or changing employee cost.
- Changing employee cost currency.
- Approving cost.
- Deleting or archiving cost.
- Exporting employee cost report.

### 10.10 Reports

- Employee costs by period.
- Employee costs by user.
- Employee costs by project.
- Contractor costs.
- Cost rates by role where permitted.

### 10.11 KPIs

- Average hourly cost.
- Total employee cost.
- Contractor cost.
- Cost per billable hour.
- Cost allocation completeness.

### 10.12 Edge Cases

- Missing employee profile.
- Missing currency.
- Overlapping cost periods.
- Employee archived.
- Cost period does not match payroll period.

### 10.13 Acceptance Criteria

- Employee cost access is Owner-only by default.
- Cost rate changes are audited.
- Costs can feed payroll and profitability only when approved.

---

## 11. Module Specification: Invoice Management

### 11.1 Purpose

Invoice Management creates, approves, sends, tracks, exports, and reconciles invoices for client billing.

### 11.2 Data Objects

- `invoices`
- `invoice_line_items`
- `clients`
- `projects`
- `contracts`
- `payments`
- `payment_allocations`
- `files`
- `approvals`
- `currencies`

### 11.3 Required Fields

- Invoice number.
- Client.
- Issue date.
- Due date.
- Currency.
- Line items.
- Subtotal.
- Discount.
- Tax.
- Total.
- Amount paid.
- Amount due.
- Status.

### 11.4 Statuses

- Draft.
- Pending Approval.
- Approved.
- Sent.
- Viewed.
- Partially Paid.
- Paid.
- Overdue.
- Void.
- Refunded.

### 11.5 User Actions

- Create invoice.
- Add line items.
- Link project or contract.
- Request approval.
- Approve invoice.
- Send invoice.
- Void invoice.
- Export invoice.
- Publish to client portal.

### 11.6 Permissions

Default: Owner only.

Explicit grants:

- `invoices.read`
- `invoices.create`
- `invoices.approve`
- `invoices.send`

Clients can view own approved/sent invoices only.

### 11.7 Workflows

Invoice Creation Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Owner creates draft invoice | Draft invoice |
| 2 | Owner adds client, project, currency, and line items | Complete draft |
| 3 | System validates totals and due date | Valid invoice |
| 4 | Invoice enters approval if required | Pending approval |
| 5 | Owner approves invoice | Approved invoice |
| 6 | Invoice is sent or published | Client-visible invoice |
| 7 | Payment tracking begins | Receivable |

### 11.8 Notifications

- Invoice approval requested.
- Invoice approved.
- Invoice sent.
- Invoice viewed.
- Invoice due soon.
- Invoice overdue.
- Invoice paid.

### 11.9 Audit Log Requirements

Audit required for:

- Invoice creation.
- Invoice approval.
- Invoice sent.
- Invoice amount changed.
- Invoice voided.
- Invoice exported.

### 11.10 Reports

- Invoice aging.
- Outstanding invoices.
- Paid invoices.
- Overdue invoices.
- Invoice revenue by client.

### 11.11 KPIs

- Total invoiced.
- Amount outstanding.
- Amount overdue.
- Average collection time.
- Invoice payment rate.

### 11.12 Edge Cases

- Invoice due date before issue date.
- Invoice sent with zero total.
- Invoice currency differs from client currency.
- Invoice partially paid before void request.
- Duplicate invoice number.

### 11.13 Acceptance Criteria

- Only Owner or explicit grantee can create/send invoices.
- Client sees own invoices only.
- Invoice changes are audited.
- Payments update invoice status accurately.

---

## 12. Module Specification: Partial Payment Management

### 12.1 Purpose

Partial Payment Management tracks payments that cover only part of an invoice and maintains accurate amount paid, amount due, allocations, reminders, and invoice status.

### 12.2 Data Objects

- `payments`
- `payment_allocations`
- `invoices`
- `clients`
- `wallets`
- `wallet_transactions`
- `currencies`

### 12.3 Required Fields

- Payment.
- Invoice.
- Allocation amount.
- Currency.
- Payment status.
- Invoice amount paid.
- Invoice amount due.

### 12.4 Statuses

Payment statuses:

- Pending.
- Processing.
- Succeeded.
- Failed.
- Refunded.
- Partially Refunded.
- Cancelled.

Invoice status after partial payment:

- Partially Paid.
- Paid when amount due reaches zero.

### 12.5 User Actions

- Record partial payment.
- Allocate payment to invoice.
- Split payment across invoices.
- Apply wallet balance.
- Send remaining balance reminder.
- Refund payment where permitted.

### 12.6 Permissions

Default: Owner only.

Explicit grants:

- `payments.record`
- `payments.read`
- `invoices.read`

Client can view own partial payments and remaining amount due.

### 12.7 Workflows

Partial Payment Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Payment received below invoice total | Partial payment candidate |
| 2 | Owner records or provider confirms payment | Payment record |
| 3 | Payment allocation is created | Invoice amount paid updates |
| 4 | Invoice amount due recalculates | Remaining balance |
| 5 | Invoice status becomes Partially Paid | Correct status |
| 6 | Reminder can be scheduled for balance | Collection follow-up |

### 12.8 Notifications

- Partial payment received.
- Remaining balance due.
- Payment allocation failed.
- Invoice fully paid after final partial payment.

### 12.9 Audit Log Requirements

Audit required for:

- Recording payment.
- Allocating payment.
- Reallocating payment.
- Refunding payment.
- Manually changing amount paid.

### 12.10 Reports

- Partial payments by invoice.
- Remaining balances.
- Payment allocation report.
- Collection report.

### 12.11 KPIs

- Partial payment volume.
- Remaining invoice balance.
- Average partial payment amount.
- Days from partial payment to full payment.

### 12.12 Edge Cases

- Payment exceeds invoice amount.
- Payment currency differs from invoice currency.
- Payment applied to wrong invoice.
- Payment provider sends duplicate webhook.
- Invoice is voided after partial payment.

### 12.13 Acceptance Criteria

- Partial payments preserve allocation history.
- Invoice amount due is always accurate.
- Payment allocation is Owner-only unless explicitly granted.
- Client sees own remaining balance only.

---

## 13. Module Specification: Wallet System

### 13.1 Purpose

The Wallet System tracks prepaid balances, credits, adjustments, refunds, and client account balances by client and currency.

### 13.2 Data Objects

- `wallets`
- `wallet_transactions`
- `payments`
- `payment_allocations`
- `invoices`
- `clients`
- `currencies`

### 13.3 Required Fields

- Client.
- Currency.
- Wallet type.
- Balance amount.
- Status.
- Transaction type.
- Transaction amount.
- Balance after transaction.

### 13.4 Statuses

Wallet statuses:

- Active.
- Suspended.
- Closed.

Transaction types:

- Credit.
- Debit.
- Refund.
- Adjustment.

### 13.5 User Actions

- Create wallet.
- Credit wallet.
- Debit wallet.
- Apply wallet balance to invoice.
- Refund wallet balance.
- Adjust wallet.
- Suspend wallet.
- Close wallet.

### 13.6 Permissions

Default: Owner only.

Explicit grants:

- `wallets.read`
- `wallets.manage`

Clients can view own wallet balance and own wallet transactions if enabled.

### 13.7 Workflows

Wallet Credit/Debit Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Payment, refund, invoice allocation, or adjustment occurs | Wallet transaction candidate |
| 2 | Owner or system validates client and currency | Valid wallet action |
| 3 | Wallet transaction is created | Ledger entry |
| 4 | Balance after amount is recorded | Ledger integrity |
| 5 | Wallet balance updates | Current balance |
| 6 | Client view updates if enabled | Client transparency |

### 13.8 Notifications

- Wallet credited.
- Wallet debited.
- Wallet balance low.
- Wallet adjustment made.
- Wallet suspended.

### 13.9 Audit Log Requirements

Audit required for:

- Manual wallet credit.
- Manual wallet debit.
- Adjustment.
- Refund.
- Wallet closure.
- Wallet export.

### 13.10 Reports

- Wallet balances.
- Wallet transactions.
- Wallet credits by period.
- Wallet debits by period.
- Wallet adjustments.

### 13.11 KPIs

- Total wallet balance.
- Wallet credits.
- Wallet debits.
- Unapplied client credit.
- Wallet utilization rate.

### 13.12 Edge Cases

- Debit exceeds balance.
- Currency mismatch.
- Duplicate wallet transaction.
- Wallet closed with balance.
- Refund requested after wallet debit.

### 13.13 Acceptance Criteria

- Wallet ledger history is preserved.
- Wallet balance is never changed without a transaction.
- Owner-only global wallet access is enforced.
- Clients see only their own wallet.

---

## 14. Module Specification: Profitability Analytics

### 14.1 Purpose

Profitability Analytics explains project, client, and tenant profitability from revenue, payroll, employee costs, time, invoices, and payments.

### 14.2 Data Objects

- `profitability_records`
- `revenue_records`
- `employee_costs`
- `payroll_items`
- `time_entries`
- `invoices`
- `payments`
- `projects`
- `clients`
- `currencies`

### 14.3 Required Fields

- Scope: tenant, client, or project.
- Period.
- Revenue.
- Costs.
- Gross profit.
- Margin.
- Currency.
- Calculation status.
- Calculated timestamp.

### 14.4 Statuses

- Pending.
- Calculated.
- Stale.
- Failed.

### 14.5 User Actions

- View profitability dashboard.
- Filter by client/project/period/currency.
- Recalculate profitability.
- Export profitability report.
- Ask AI to explain profitability if permitted.

### 14.6 Permissions

Default: Owner only.

Explicit grants:

- `profitability.read`
- `financial_reports.export`

Clients cannot view internal profitability.

### 14.7 Workflows

Project Profitability Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Project revenue is collected | Revenue input |
| 2 | Project time and employee costs are collected | Cost input |
| 3 | Approved payroll costs are included | Labor cost |
| 4 | Profit and margin are calculated | Profitability result |
| 5 | Owner reviews result | Financial insight |
| 6 | Low-margin projects are flagged | Action needed |

### 14.8 Notifications

- Project margin below threshold.
- Client profitability below threshold.
- Profitability calculation stale.
- Profitability calculation failed.

### 14.9 Audit Log Requirements

Audit required for:

- Exporting profitability.
- Manually recalculating profitability.
- Changing source records affecting profitability.

### 14.10 Reports

- Project profitability.
- Client profitability.
- Tenant profitability.
- Margin trend.
- Unprofitable projects.

### 14.11 KPIs

- Gross profit.
- Gross margin.
- Revenue per payroll cost.
- Profit per client.
- Profit per project.

### 14.12 Edge Cases

- Revenue exists but no costs.
- Costs exist but no revenue.
- Payroll not yet approved.
- Multi-currency mismatch.
- Project closed before final payment.

### 14.13 Acceptance Criteria

- Profitability is Owner-only by default.
- Only approved source data is used where required.
- Profit calculations are auditable.
- AI cannot expose profitability without permission.

---

## 15. Module Specification: Financial Permissions

### 15.1 Purpose

Financial Permissions enforce strict financial data isolation and Owner Only Financial Access across finance, payroll, invoices, payments, wallets, costs, revenue, and profit.

### 15.2 Data Objects

- `roles`
- `permissions`
- `role_permissions`
- `membership_roles`
- `tenant_memberships`
- `audit_logs`

### 15.3 Required Fields

- User.
- Tenant.
- Role.
- Permission.
- Assigned by.
- Assigned timestamp.
- Revoked timestamp where applicable.

### 15.4 Statuses

- Active.
- Revoked.
- Expired where temporary grant is supported.

### 15.5 User Actions

- Grant financial permission.
- Revoke financial permission.
- Review financial access.
- Export permission audit.

### 15.6 Permissions

Only Owner can grant or revoke financial permissions.

Managers and employees have no financial permissions by default.

Clients cannot receive global financial permissions.

### 15.7 Workflows

Financial Permission Grant Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Owner selects user | Candidate |
| 2 | Owner selects financial permission | Permission scope |
| 3 | System warns about sensitivity | Risk review |
| 4 | Owner confirms | Permission granted |
| 5 | Audit log is created | Traceability |
| 6 | User access refreshes | Updated access |

### 15.8 Notifications

- Financial permission granted.
- Financial permission revoked.
- Sensitive financial access used.

### 15.9 Audit Log Requirements

Audit required for:

- Granting financial permission.
- Revoking financial permission.
- Viewing payroll if not Owner.
- Exporting financial data.

### 15.10 Reports

- Financial access report.
- Payroll access report.
- Permission grant history.

### 15.11 KPIs

- Users with financial access.
- Users with payroll access.
- Financial access changes.
- Sensitive access events.

### 15.12 Edge Cases

- Last Owner removed.
- Manager attempts payroll access without grant.
- AI request made by unauthorized user.
- Client attempts cross-client invoice access.

### 15.13 Acceptance Criteria

- Owner Only Financial Access is enforced.
- Explicit grants are audited.
- Clients cannot access global finance.
- AI cannot bypass permissions.

---

## 16. Module Specification: Financial Dashboards

### 16.1 Purpose

Financial Dashboards provide Owner-only visibility into revenue, costs, payroll, invoices, payments, wallets, and profitability.

### 16.2 Data Objects

- `revenue_records`
- `employee_costs`
- `payroll_runs`
- `payroll_items`
- `invoices`
- `payments`
- `wallets`
- `wallet_transactions`
- `profitability_records`

### 16.3 Required Fields

- Tenant.
- Date range.
- Currency.
- Revenue totals.
- Cost totals.
- Profit totals.
- Invoice totals.
- Payment totals.
- Payroll totals.

### 16.4 Statuses

Dashboard data states:

- Current.
- Stale.
- Loading.
- Failed.
- No permission.

### 16.5 User Actions

- View dashboard.
- Filter by period.
- Filter by currency.
- Filter by client/project.
- Export dashboard.
- Open source records.

### 16.6 Permissions

Default: Owner only.

Explicit grant:

- `finance.read`
- `profitability.read`
- `financial_reports.export`

### 16.7 Workflows

Owner Financial Review Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Owner opens Finance Center | Financial dashboard |
| 2 | Owner selects period and currency | Filtered view |
| 3 | Dashboard loads revenue, cost, payroll, invoice, payment, wallet, and profit metrics | Financial overview |
| 4 | Owner drills into exceptions | Review queue |
| 5 | Owner exports or acts on records | Controlled action |
| 6 | Sensitive actions are audited | Traceability |

### 16.8 Notifications

- Dashboard data stale.
- Financial metric threshold breached.
- Payroll pending approval.
- Invoices overdue.
- Profitability below threshold.

### 16.9 Audit Log Requirements

Audit required for:

- Exporting dashboard data.
- Viewing payroll dashboard by non-Owner explicit grantee.
- Changing dashboard-sensitive thresholds.

### 16.10 Reports

- Owner executive finance dashboard.
- Revenue dashboard.
- Cost dashboard.
- Payroll dashboard.
- Profitability dashboard.

### 16.11 KPIs

- Revenue.
- Costs.
- Gross profit.
- Gross margin.
- Outstanding invoices.
- Overdue invoices.
- Payroll cost.
- Wallet balances.

### 16.12 Edge Cases

- No financial data yet.
- Multi-currency dashboard.
- Stale profitability.
- Missing payroll approval.
- Unauthorized access attempt.

### 16.13 Acceptance Criteria

- Dashboard is Owner-only by default.
- Data is tenant-scoped.
- Client financial data is never mixed.
- Exports are audited.

---

## 17. Module Specification: Financial Reports

### 17.1 Purpose

Financial Reports provide structured exports and views for revenue, costs, payroll, invoices, payments, wallets, and profitability.

### 17.2 Data Objects

- All finance and payroll objects.
- `files` for generated reports.
- `notifications`.
- `audit_logs`.

### 17.3 Required Fields

- Report type.
- Tenant.
- Period.
- Currency.
- Filters.
- Generated by.
- Generated timestamp.
- Export format where applicable.

### 17.4 Statuses

- Draft.
- Generated.
- Scheduled.
- Sent.
- Failed.
- Archived.

### 17.5 User Actions

- Generate report.
- Save report.
- Schedule report.
- Export report.
- Publish approved client financial report.

### 17.6 Permissions

Default: Owner only.

Explicit grant:

- `financial_reports.export`
- `finance.read`

Clients can only view approved reports about their own invoices, payments, wallet, or approved financial documents.

### 17.7 Workflows

Financial Report Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Owner selects report | Report type |
| 2 | Owner sets filters | Report scope |
| 3 | System validates permissions | Safe report |
| 4 | Report is generated | Output |
| 5 | Owner exports or saves | Report artifact |
| 6 | Audit log is created | Traceability |

### 17.8 Notifications

- Scheduled report generated.
- Report generation failed.
- Report exported.
- Client report published.

### 17.9 Audit Log Requirements

Audit required for:

- Report generation.
- Report export.
- Client report publishing.
- Scheduled financial report changes.

### 17.10 Reports

Report module outputs:

- Revenue report.
- Cost report.
- Payroll report.
- Invoice report.
- Payment report.
- Wallet report.
- Profitability report.
- Financial access report.

### 17.11 KPIs

- Reports generated.
- Reports exported.
- Scheduled report failures.
- Client financial reports published.

### 17.12 Edge Cases

- Unauthorized export.
- Report includes no data.
- Multi-currency report.
- Client report accidentally includes internal margin.
- Scheduled report fails.

### 17.13 Acceptance Criteria

- Reports are permission-filtered.
- Financial report export is audited.
- Client reports never include internal payroll, cost, or profit unless explicitly approved and permitted.

---

## 18. Module Specification: Audit Logs For Financial Actions

### 18.1 Purpose

Financial Audit Logs preserve traceability for sensitive finance, payroll, invoice, payment, wallet, and permission actions.

### 18.2 Data Objects

- `audit_logs`
- `activity_logs`
- All finance and payroll objects.

### 18.3 Required Fields

- Tenant.
- Actor.
- Actor type.
- Action.
- Resource type.
- Resource ID.
- Timestamp.
- Result.
- Redacted before/after snapshot where permitted.
- IP/session metadata where available.

### 18.4 Statuses

Audit result statuses:

- Success.
- Failure.
- Blocked.

### 18.5 User Actions

- View audit logs.
- Filter audit logs.
- Export audit logs.
- Review sensitive action history.

### 18.6 Permissions

Default: Owner only.

Explicit grant:

- `audit.read`

Client users cannot view internal financial audit logs.

### 18.7 Workflows

Financial Audit Workflow:

| Step | Action | Output |
| --- | --- | --- |
| 1 | Sensitive financial action requested | Audit candidate |
| 2 | System checks permission | Allowed or blocked |
| 3 | Action result is recorded | Audit log |
| 4 | Owner can review audit event | Traceability |
| 5 | Export requires audit permission | Controlled audit access |

### 18.8 Notifications

- Sensitive financial action performed.
- Financial permission granted.
- Payroll approved.
- Payment refunded.
- Export performed.

### 18.9 Audit Log Requirements

Financial audit logging is mandatory for:

- Permission grant/revocation.
- Revenue changes.
- Cost changes.
- Payroll approval/payment.
- Invoice approval/send/void.
- Payment record/allocation/refund.
- Wallet credit/debit/adjustment.
- Report export.
- AI financial query by explicit grantee.

### 18.10 Reports

- Financial audit report.
- Payroll audit report.
- Payment audit report.
- Permission audit report.

### 18.11 KPIs

- Sensitive actions count.
- Blocked access attempts.
- Financial exports.
- Permission changes.
- Payroll approval events.

### 18.12 Edge Cases

- Failed action still needs audit record.
- AI blocked from financial response.
- User permission revoked after action.
- Export requested by unauthorized user.

### 18.13 Acceptance Criteria

- Every sensitive financial action creates an audit log.
- Audit logs are append-only.
- Audit logs redact sensitive data where required.
- Audit access is Owner-only by default.

---

## 19. Required Workflow Specifications

### 19.1 Revenue Tracking Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Revenue source is identified from opportunity, contract, invoice, payment, or manual Owner entry |
| 2 | System validates tenant, client, currency, and amount |
| 3 | Owner confirms revenue type and period |
| 4 | Revenue record is created or updated |
| 5 | Forecast, recognized, or received status is applied |
| 6 | Dashboard and reports update |
| 7 | Audit log is created for sensitive changes |

### 19.2 Cost Tracking Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Cost source is identified from employee profile, payroll item, time entry, or manual Owner entry |
| 2 | System validates currency, period, amount, and allocation |
| 3 | Owner approves cost where required |
| 4 | Cost feeds project/client/tenant profitability |
| 5 | Cost reports update |
| 6 | Audit log is created |

### 19.3 Profit Calculation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | System collects valid revenue |
| 2 | System collects approved costs |
| 3 | System includes approved payroll and approved time-derived labor cost |
| 4 | System calculates gross profit |
| 5 | System calculates gross margin |
| 6 | Profitability record is saved |
| 7 | Low margin is flagged |

### 19.4 Time-To-Payroll Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Employee starts time on active task/project |
| 2 | System blocks time if project/task is inactive |
| 3 | Employee stops time |
| 4 | Time entry enters timesheet |
| 5 | Timesheet is submitted |
| 6 | Approved time becomes payroll eligible |
| 7 | Payroll run includes approved time only |

### 19.5 Payroll Approval Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Payroll run is created from approved time |
| 2 | Owner reviews payroll items |
| 3 | Owner resolves missing cost rates or invalid entries |
| 4 | Owner approves payroll |
| 5 | Payroll status becomes Approved |
| 6 | Payroll may be marked Paid |
| 7 | Audit log records approval and payment |

### 19.6 Invoice Creation Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Owner creates invoice draft |
| 2 | Client, project, contract, currency, issue date, and due date are selected |
| 3 | Line items are added |
| 4 | Totals are validated |
| 5 | Invoice approval is completed if required |
| 6 | Invoice is sent or published to client |
| 7 | Payment tracking begins |

### 19.7 Partial Payment Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Payment below invoice total is received |
| 2 | Payment record is created |
| 3 | Payment allocation is linked to invoice |
| 4 | Invoice amount paid and due are recalculated |
| 5 | Invoice status becomes Partially Paid |
| 6 | Remaining balance reminder may be triggered |

### 19.8 Wallet Credit/Debit Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Wallet action is initiated by payment, refund, invoice allocation, or adjustment |
| 2 | System validates Owner permission and currency |
| 3 | Wallet transaction is created |
| 4 | Balance after transaction is recorded |
| 5 | Wallet balance updates |
| 6 | Audit log is created |

### 19.9 Employee Cost Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Owner creates employee profile or cost record |
| 2 | Cost rate, salary, contractor fee, or benefit is entered |
| 3 | Currency and period are validated |
| 4 | Cost is approved |
| 5 | Cost feeds payroll or profitability |
| 6 | Changes are audited |

### 19.10 Project Profitability Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Project revenue is gathered |
| 2 | Project costs are gathered |
| 3 | Approved payroll and time costs are included |
| 4 | Profit and margin are calculated |
| 5 | Project profitability status updates |
| 6 | Low margin warning is generated |

### 19.11 Client Billing Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Billing source is identified from contract, project, or approved revenue |
| 2 | Invoice draft is created |
| 3 | Owner approves and sends invoice |
| 4 | Client views invoice in portal |
| 5 | Client pays full, partial, or wallet-based amount |
| 6 | Payment and invoice status update |
| 7 | Client sees only own billing records |

### 19.12 Owner Financial Review Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Owner opens Finance Center |
| 2 | Owner reviews revenue, costs, payroll, invoices, payments, wallets, and profit |
| 3 | Owner reviews exceptions |
| 4 | Owner approves payroll or invoices where pending |
| 5 | Owner exports reports if needed |
| 6 | Sensitive actions are audited |

---

## 20. Invoice Approval Workflow

### 20.1 Purpose

Invoice Approval ensures invoices are reviewed before client visibility or sending.

### 20.2 Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Invoice is created as Draft |
| 2 | Invoice totals and client details are validated |
| 3 | Invoice enters Pending Approval when approval is required |
| 4 | Owner reviews invoice |
| 5 | Owner approves or rejects |
| 6 | Approved invoice can be sent |
| 7 | Rejected invoice returns to Draft |

### 20.3 Audit Requirements

Audit required for:

- Approval.
- Rejection.
- Amount change after approval.
- Sending invoice.

### 20.4 Acceptance Criteria

- Invoice cannot be sent before approval when approval is required.
- Approval is Owner-only unless explicitly granted.
- Client sees only approved/sent invoices.

---

## 21. Payment Tracking Workflow

### 21.1 Purpose

Payment Tracking records manual and provider-confirmed payments and reconciles them with invoices and wallets.

### 21.2 Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Payment is received or manually recorded |
| 2 | System validates client, amount, currency, and invoice/wallet target |
| 3 | Payment status is set |
| 4 | Payment allocation is created |
| 5 | Invoice or wallet updates |
| 6 | Receipt or notification is generated |
| 7 | Audit log is created |

### 21.3 Edge Cases

- Duplicate payment provider event.
- Failed payment.
- Overpayment.
- Refund.
- Wrong invoice allocation.

### 21.4 Acceptance Criteria

- Payments are tenant-scoped and client-scoped.
- Payment provider IDs are unique where provided.
- Manual payment recording is Owner-only unless explicitly granted.

---

## 22. Wallet Transaction Workflow

### 22.1 Purpose

Wallet Transaction Workflow maintains a reliable ledger for credits, debits, adjustments, refunds, and invoice applications.

### 22.2 Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Wallet transaction request starts |
| 2 | System validates wallet, client, tenant, currency, and permission |
| 3 | Transaction type is selected |
| 4 | Amount is validated |
| 5 | Balance after amount is calculated |
| 6 | Transaction is recorded |
| 7 | Wallet balance updates |
| 8 | Audit log is created |

### 22.3 Acceptance Criteria

- Wallet balance changes only through wallet transactions.
- Wallet transactions are immutable except correction through reversing transaction.
- Clients see only own wallet transactions where enabled.

---

## 23. Project Profitability Workflow

### 23.1 Purpose

Project Profitability Workflow connects delivery time, payroll, employee costs, project revenue, invoices, payments, and costs into a project margin view.

### 23.2 Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Project has revenue source |
| 2 | Project has tracked time and approved payroll cost |
| 3 | Project has employee or allocated costs |
| 4 | System calculates revenue and cost |
| 5 | System calculates gross profit and margin |
| 6 | Owner reviews margin |
| 7 | Low margin triggers notification |

### 23.3 Acceptance Criteria

- Profitability excludes unapproved time from payroll cost.
- Project profitability is Owner-only by default.
- Clients cannot view project margin.

---

## 24. Client Billing Workflow

### 24.1 Purpose

Client Billing Workflow manages invoice visibility, payment tracking, wallet balance, and approved financial documents in the client portal.

### 24.2 Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Owner approves invoice |
| 2 | Invoice is published to client portal |
| 3 | Client views invoice |
| 4 | Client makes payment or uses wallet where enabled |
| 5 | Payment is recorded and allocated |
| 6 | Invoice status updates |
| 7 | Client receives receipt or confirmation |

### 24.3 Client Visibility

Clients can see:

- Own invoices.
- Own payments.
- Own wallet balance.
- Own wallet transactions where enabled.
- Approved financial documents.

Clients cannot see:

- Agency revenue records.
- Profitability.
- Payroll.
- Employee costs.
- Other clients.
- Internal audit logs.

### 24.4 Acceptance Criteria

- Client sees only own financial records.
- Client portal never exposes payroll, cost, or margin.
- Client billing actions are logged.

---

## 25. Employee Timesheet Workflow

### 25.1 Purpose

Employee Timesheet Workflow converts valid time entries into submitted, reviewed, and approved payable time.

### 25.2 Workflow

| Step | Required Behavior |
| --- | --- |
| 1 | Employee starts time on active task/project |
| 2 | Employee stops time |
| 3 | Time entry appears in timesheet |
| 4 | Employee submits timesheet |
| 5 | Owner or explicit approver reviews timesheet |
| 6 | Approved entries become payroll eligible |
| 7 | Rejected entries are excluded from payroll |

### 25.3 Business Rules

- No Start = No Time.
- No Time = No Payroll.
- Running time is not payroll eligible.
- Unapproved time is not payroll eligible.
- Inactive task/project time is invalid.

### 25.4 Acceptance Criteria

- Timesheets include valid tracked time only.
- Payroll excludes rejected and unapproved time.
- Time and timesheet changes are auditable.

---

## 26. AI Financial Security

### 26.1 Purpose

AI may assist with financial summaries, explanations, anomaly detection, and drafting reminders, but must never bypass financial permissions.

### 26.2 Allowed AI Actions

Owner only by default:

- Explain revenue trends.
- Explain profitability.
- Summarize payroll.
- Identify overdue invoices.
- Draft payment reminder.
- Explain wallet balance.
- Summarize financial reports.

Client-safe AI:

- Explain client-owned invoice.
- Explain client-owned payment.
- Explain client-owned wallet balance.

### 26.3 Prohibited AI Actions

AI must not:

- Reveal payroll to unauthorized users.
- Reveal employee costs to unauthorized users.
- Reveal profitability to clients.
- Reveal another client's financial data.
- Create payment, refund, payroll, or wallet transaction without confirmation and permission.
- Export financial reports without permission.

### 26.4 Audit Requirements

Audit required for:

- AI financial answer to explicit financial grantee.
- AI-assisted financial export.
- AI-assisted payment reminder.
- AI-assisted payroll summary.
- Blocked AI financial access attempt.

### 26.5 Acceptance Criteria

- AI follows exact user permissions.
- Blocked AI requests do not reveal financial existence or values.
- AI financial actions are logged.

---

## 27. Financial Edge Case Register

| Edge Case | Required Handling |
| --- | --- |
| No start time | Block time entry and payroll eligibility |
| Running time entry | Exclude from payroll |
| Inactive project/task | Block time tracking |
| Unapproved time | Exclude from payroll |
| Missing employee cost rate | Flag payroll item for Owner review |
| Multi-currency invoice/payment | Preserve source currency and conversion metadata |
| Overpayment | Allocate to wallet or refund with Owner approval |
| Underpayment | Mark invoice partially paid |
| Duplicate payment event | Prevent duplicate allocation |
| Voided invoice with payment | Require refund or wallet allocation decision |
| Client archived | Preserve financial history |
| Employee archived | Preserve payroll and cost history |
| Unauthorized manager access | Deny and audit where sensitive |
| AI unauthorized financial query | Deny and log blocked attempt |

---

## 28. Financial Notifications

Required notifications:

- Timesheet submitted.
- Timesheet approved.
- Timesheet rejected.
- Payroll ready for review.
- Payroll approved.
- Payroll marked paid.
- Invoice approval requested.
- Invoice approved.
- Invoice sent.
- Invoice viewed.
- Invoice overdue.
- Partial payment received.
- Invoice fully paid.
- Wallet credited.
- Wallet debited.
- Profitability below threshold.
- Financial permission granted or revoked.
- Financial report generated.

Notification visibility must follow financial permissions.

---

## 29. Financial Reports Catalog

Required reports:

- Revenue report.
- Cost report.
- Profit report.
- Payroll report.
- Employee cost report.
- Invoice aging report.
- Payment report.
- Partial payment report.
- Wallet report.
- Project profitability report.
- Client profitability report.
- Financial audit report.
- Financial permission report.

---

## 30. Financial KPIs Catalog

Required KPIs:

- Total revenue.
- Recognized revenue.
- Received revenue.
- Total cost.
- Payroll cost.
- Employee cost.
- Gross profit.
- Gross margin.
- Outstanding invoices.
- Overdue invoices.
- Partial payment balance.
- Wallet balance.
- Average collection time.
- Project profitability.
- Client profitability.
- Approved payable hours.
- Payroll approval cycle time.

---

## 31. Phase 8 Acceptance Criteria

Phase 8 is accepted when:

- Revenue Tracking is fully specified.
- Cost Tracking is fully specified.
- Profit Tracking is fully specified.
- Payroll is fully specified.
- Employee Cost Management is fully specified.
- Invoice Management is fully specified.
- Partial Payment Management is fully specified.
- Wallet System is fully specified.
- Profitability Analytics is fully specified.
- Financial Permissions are fully specified.
- Financial Dashboards are fully specified.
- Financial Reports are fully specified.
- Payroll Approval Workflow is defined.
- Invoice Approval Workflow is defined.
- Payment Tracking Workflow is defined.
- Wallet Transaction Workflow is defined.
- Project Profitability Workflow is defined.
- Client Billing Workflow is defined.
- Employee Timesheet Workflow is defined.
- Audit Logs for financial actions are defined.
- All required diagrams are included as business flow diagrams.
- Owner Only Financial Access is enforced throughout.
- AI financial security is defined and strict.
- No code, SQL, implementation scripts, or migrations are included.

---

## 32. Implementation Checklist

This is a specification checklist, not implementation code.

Required before implementation handoff:

- Confirm financial permission keys with Phase 3.
- Confirm whether Finance Manager and Payroll Manager are predefined roles or custom roles.
- Confirm payroll approval authority when Owner delegates access.
- Confirm timesheet approval roles.
- Confirm employee cost rate policy.
- Confirm multi-currency conversion policy.
- Confirm wallet overpayment policy.
- Confirm invoice approval thresholds.
- Confirm client portal financial visibility.
- Confirm AI financial access policy.
- Confirm audit retention policy for financial records.
- Confirm report export permissions.

---

## 33. Final Phase 8 Statement

This Phase 8 Finance & Payroll System Specification defines the complete financial operating model for MAOS. It governs revenue tracking, cost tracking, profit tracking, payroll, employee costs, invoices, partial payments, wallets, profitability analytics, financial permissions, dashboards, reports, approval workflows, payment workflows, wallet workflows, project profitability, client billing, employee timesheets, AI financial security, and audit logs.

All implementation must enforce Owner Only Financial Access by default, preserve tenant isolation, protect payroll and employee cost data, restrict client visibility to client-owned financial records, use approved time only for payroll, and ensure AI never exposes financial data to unauthorized users.

