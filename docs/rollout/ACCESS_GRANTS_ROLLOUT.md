# Rollout checklist — explicit access grants (PR #124), Dashboard (#122), Control Center (#123)

Status: **prepared, not executed.** Nothing here has been run against production.
No schema change and no migration in any of the three PRs.

## 1. What changes for whom when #124 is deployed

| Role | Today | After deploy, until the OWNER grants something |
|---|---|---|
| OWNER | Everything | Unchanged. Always decides approvals, sees finance |
| MANAGER | Reads/creates/sends invoices, records payments, decides approvals | **No invoices, no payments, no approval decisions.** Can still request approvals and read the queue |
| EMPLOYEE | Sees every task of the company | **Only tasks assigned to them and tasks of projects they are a member of.** Projects, files, CRM unchanged. Could not decide approvals before either (API refused); now the queue hides the button |
| CONTRACTOR | Sees and posts in every chat channel of the company | **Only channels they are a member of or that belong to their projects.** Today no channel has members or a project link, so contractors see **no channels** until added |
| CLIENT | Client portal | Unchanged |

## 2. Grants the OWNER can give (Company access page, per company)

| Grant | For | Gives |
|---|---|---|
| Decides approvals | MANAGER, EMPLOYEE | Approve / request changes / reject |
| Views invoices | MANAGER | Invoice list, detail, PDF, delivery history; "Invoices" appears in the navigation |
| Creates and sends invoices | MANAGER | Above + create, change status, send |
| Records payments | MANAGER | Invoice view + record a payment. The payment ledger and finance totals stay OWNER-only |
| Sees all tasks | EMPLOYEE | Every task of the company (today's behaviour) |

Chat: OWNER or MANAGER adds a contractor to a channel from the channel header (Members). Every grant and membership change is written to the audit log (`membership.grant_updated`, `chat.member_added`, `chat.member_removed`).

## 3. Before deploy (owner)

- [ ] Run the read-only impact report against production **only with separate approval**:
      `scripts/db-readonly-check.sh docs/rollout/access-grants-impact.sql`
      (read-only session; prints member names and e-mails, no amounts). It lists, per company:
      managers (and their past approval decisions), employees (tasks visible today vs after),
      contractors (channels today vs after), waiting approvals, and any grants already present.
- [ ] From that list decide, per company: which managers keep invoices (which of the three
      levels), which managers or employees decide approvals, which employees keep all tasks,
      which contractors join which channels.
- [ ] Agree a short window: right after deploy the people above lose access until the grants are set.

## 4. Merge and deploy order (each step needs owner approval)

1. #124 (based on `main`; touches `apps/api`, `apps/web`, CI) → redeploys `jihad` and `maos-web`.
2. #122 (web only) → redeploys `maos-web`.
3. #123 (stacked on #122; base retargets to `main` after #122 merges; touches `apps/api`, `apps/web`, CI) → redeploys `jihad` and `maos-web`.

The three merge cleanly with each other and pass together (local combined run). Independent of
#120 (board lists, has a migration) and #121 (tunnel tools); only `ci.yml` overlaps, without conflict.
No new environment variables.

## 5. Right after deploy (owner, in the app)

- [ ] Company access: set the grants decided in step 3 for each company.
- [ ] Chat: add contractors to their channels.
- [ ] Smoke test: `/api/health/ready` 200; owner opens `/control-center`; a manager without grants
      gets no Invoices entry and 403 on `/api/invoices`; with "Views invoices" the entry appears.
- [ ] Re-run the impact report (approved) to confirm the grants are in place.

## 6. Rollback

Application rollback only (no schema change). Grants are ordinary `MembershipPermission` rows;
older code ignores the `grant` markers and `read-all` / `decide` rows. One difference: older code
honours an explicit row, so a manager invoice/payment row left at `granted = false` (a revoked
grant) would deny that manager after a rollback, where older code would otherwise allow by default.
If a rollback happens, review those rows with the impact report (section 5) before deciding
whether to change them; that change is a production data write and needs owner approval.
