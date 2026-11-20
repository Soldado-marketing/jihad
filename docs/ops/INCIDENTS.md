# MAOS incident runbooks (B10)

**Status:** active since 2026-11-04; reviewed with the owner in a tabletop: pending. **Owner:** the platform owner decides every production action; the operator executes and records.
**Rules in every incident** (from the production-engineer standard): stop unrelated work, preserve logs, state user impact, find the last known-good deployment, check the backup state before any database action, smallest safe fix, verify, write the root cause. Never force-push, never reset `main`, never drop or overwrite a database, never print a credential.

Fixed facts: Railway project `humorous-fulfillment`; API `jihad` → `https://jihad-production.up.railway.app`; web `maos-web` → `https://maos-web-production.up.railway.app`; Postgres on the private network only; backups on the backup Mac in `~/MAOS_BACKUPS/production` (nightly LaunchAgent `com.soldado.maos.backup`, staleness check `…backup-staleness`, weekly `…restore-rehearsal`); encrypted off-site copy per `docs/ops/OFFSITE_BACKUP_SETUP.md`.

Severity: **S1** customers cannot use MAOS or data may be lost or leaked; **S2** one function broken for everyone or jobs stopped; **S3** degraded, workaround exists. S1 and S2 interrupt everything else.

---

## R1 — API down or unhealthy

**Signals:** web shows "cannot reach server"; `GET /api/health/ready` 503 or timeout; Railway service status crashed/restarting.

1. `curl -s -o /dev/null -w '%{http_code}' https://jihad-production.up.railway.app/api/health` and `/api/health/ready`. `health` 200 + `ready` 503 = the API runs but cannot reach the database → go to R2.
2. Railway → `jihad` → Deployments: did a deploy happen in the last hour? If yes → `RELEASE_ROLLBACK.md` section 4 (redeploy the previous deployment) — this is the fastest recovery.
3. Logs (Railway → service → Logs): look for the startup validator (missing or short `JWT_SECRET`, `DATABASE_URL`), `EADDRINUSE`, Prisma `P1001`/`P1017` (database), out-of-memory restarts.
4. If no deploy changed and the logs show resource exhaustion: *Restart* the service once. A second crash within minutes → do not loop on restarts; collect the log excerpt and escalate to the owner.
5. Recovery = `ready` 200 and a sign-in with a fictional account. Record time down, cause, action.

## R2 — Database down or unreachable

**Signals:** `ready` 503 with `health` 200; Prisma errors `P1001` (cannot reach), `P1017` (closed), `P2024` (pool timeout) in the API logs.

1. Railway → Postgres service: status, metrics (connections, disk, memory). A full disk or a restart is visible here.
2. Do **not** run any write, migration or restore. The API reconnects on its own once the service is back.
3. If Postgres is up but the API cannot connect: check the `DATABASE_URL` variable reference on the API service (it must reference the Postgres service's private variables, not a stale literal), then redeploy the API (same image).
4. Connection-pool exhaustion (`P2024`): one restart of the API clears leaked connections; if it returns, capture the queries from the Postgres metrics and open a defect.
5. If the database is **lost or corrupted** (Railway volume failure, accidental deletion): `RELEASE_ROLLBACK.md` section 6 — restore the newest verified dump into a **new** database; the owner decides the switch. Backup location and proof: `~/MAOS_BACKUPS/production/*.dump` with matching `.sha256`, last `logs/rehearsal.log` PASS.
6. Afterwards: the scheduler's watchdog (B06) will report silent jobs; check `GET /api/health/ops` once `ready` is back.

## R3 — Bad deploy (wrong behaviour after a release)

**Signals:** smoke fails; a client sees internal data; finance numbers wrong; errors after the deploy time.

1. Confirm the deploy time (Railway → Deployments) and the merge (`git log origin/main -3`).
2. **Isolation or finance defect → treat as S1:** redeploy the previous deployment immediately (`RELEASE_ROLLBACK.md` §4), then assess exposure: audit log (`/audit` as OWNER) and `LoginHistory` for the window; who could have seen what. Client-visible impact → the owner informs the affected client.
3. Functional defect without data risk → owner decides: redeploy previous or fix forward within the hour. Never both at once.
4. If the release carried a migration: the previous application runs on the new schema (additive migrations). Roll the database back only per `RELEASE_ROLLBACK.md` §5 and only if the owner wants the data in the new objects gone.
5. Root cause into `docs/MAOS_PROGRESS.md`; the gap that let it through becomes a test in the isolation gate or the feature suite before the fix PR merges.

## R4 — Scheduled jobs silent or failing

**Signals:** OWNER notice "Scheduled job is silent" or "Scheduled job failed" (B06); reminders not sent; invites never expire.

1. `GET /api/health/ops` as OWNER: `schedulerEnabled` (must be `true`; it is `MAOS_SCHEDULER_ENABLED` on the API), `activeTimers`, each job's `lastFinishedAt`, `lastError`.
2. `schedulerEnabled: false` after a deploy → the variable was lost; restore it on the API service, redeploy.
3. One job failing repeatedly: its `lastError` names the cause; a job runs under `pg_try_advisory_xact_lock`, so a stuck lock clears with the transaction. Fix forward; jobs are idempotent (dedupe keys), so a backlog runs safely on the next tick.
4. Everything silent while the API is healthy → instance restarted and the timers did not start: redeploy; if it repeats, defect.

## R5 — Storage (S3-compatible) unavailable or near capacity

**Signals:** uploads fail, downloads 500, OWNER notice "Storage is above its limit" (B06, defaults 5 GiB / 50,000 objects via `MAOS_STORAGE_ALERT_BYTES` / `MAOS_STORAGE_ALERT_OBJECTS`).

1. `GET /api/health/ops` → `storage` section (configured, objects, bytes, truncated).
2. Provider outage: nothing to fix in MAOS; files stay recorded in the database and work again when the provider is back. Tell the owner; no retries that duplicate uploads.
3. Credentials rotated by the provider (Railway rotated S3 keys once): update the `S3_*` variables on the API, redeploy, upload one fictional file and delete it.
4. Capacity: the owner raises the plan or decides what to delete; deletion only through the application (file deletion removes every version's object and is audited; never delete objects in the bucket by hand).

## R6 — Backup Mac lost, offline or asleep

**Signals:** alert from `backup-staleness-check.sh` (no verified dump in 26 h), no entry in `~/MAOS_BACKUPS/logs/backup.log`, no weekly rehearsal line.

1. The production database is unaffected. The risk is the recovery point moving back by the outage length.
2. Mac present but asleep/unloaded: `launchctl list | grep com.soldado.maos`; reload with `scripts/install-backup-schedule.sh` (pins a runtime copy from `origin/main`, needs no credential). Run `scripts/nightly-backup.sh` once by hand and confirm a new verified dump.
3. Mac lost or dead: on a replacement Mac the owner (a) installs Docker and the Railway CLI, (b) stores the database URL in the Keychain item `maos-backup-database-url` (account `maos`) — the owner types it, it is never sent in chat or stored in a file — (c) runs `scripts/install-backup-schedule.sh`, (d) runs one backup and one `restore-rehearsal.sh`. The last verified dumps are also in the encrypted off-site copy (`offsite-rehearsal.sh` proves it restores; the private key is in the owner's Keychain `maos-offsite-private-key`).
4. A lost Mac held a copy of the production database dumps and a Keychain with the database URL: treat as **R7** as well (rotate the database password).

## R7 — Key or credential leak

**Signals:** a secret appears in a log, a chat, a commit, a screenshot, or a device holding it is lost; the CI secret scan fails on a PR; a provider warns of exposure.

Order: contain (rotate) → assess (what could the key reach, since when) → clean (history, logs) → record. Rotation is done by the **owner** in Railway and the Keychain; the operator prepares and verifies. Procedures proven on 2026-10-31:

| Secret | Rotation | Effect | Verify |
|---|---|---|---|
| `JWT_SECRET` (API) | new 96-hex value via `railway variable set --stdin`; redeploy same image | every access token invalid at once; web sessions survive through refresh tokens | an old access token answers 401; sign-in works |
| `JWT_REFRESH_SECRET` | same way | every session signed out | all users sign in again |
| Postgres password | `ALTER ROLE … PASSWORD` (SCRAM) through the private tunnel; update Railway `POSTGRES_PASSWORD` (references follow) and the Keychain item; redeploy API | readiness 503 for ~1–1.5 min | `ready` 200; a nightly backup + rehearsal pass. Note: the Railway SSH tunnel does not password-check, so the API's readiness is the proof, not a tunnel connection |
| `RESEND_API_KEY` | new key in the Resend dashboard, set on the API, revoke the old one | mail sends with the new key | invite mail to a fictional address arrives (`email-deliveries` endpoint shows SENT) |
| `S3_*` keys | new key pair at the provider, set on the API, revoke old | uploads/downloads continue | upload + download + delete one fictional file |
| Off-site private key | new certificate/key pair; re-encrypt is not possible for old copies — keep the old key offline until those dumps expire | — | `offsite-rehearsal.sh` PASS with the new key |

A secret committed to git: rotate first (the history is public to anyone who had the repository), then remove it from history only with the owner's explicit decision (`git filter-repo` rewrites history and needs every clone refreshed); the CI job `Secret scan` must pass again. Open security items are tracked in `docs/MAOS_MASTER_TASK_LIST.md` (currently: `RESEND_API_KEY` rotation status unknown since the 2026-10-21 disclosure).

## R8 — Suspected cross-company or cross-client leak

1. S1. Redeploy the previous deployment if a release is the likely cause (R3). Otherwise do not change production until the facts are known.
2. Reproduce on an isolated stack with fictional companies, never in production with customer accounts.
3. Audit log and `LoginHistory` for the window: which users of the other company/client were active; what they requested.
4. The fix PR adds the case to the isolation gate (`docs/security/TENANT_ISOLATION_INVARIANTS.md`) and is released under its own approval.
5. The owner informs affected clients; the record in `docs/MAOS_PROGRESS.md` states exposure, duration, fix and prevention.

---

## Communication and record

- Owner first, by the channel the owner uses; never customer data in the message. Then the record: start, detection, impact, actions with times, recovery, root cause, prevention — one entry per incident in `docs/MAOS_PROGRESS.md` under the date, and a link from the task row it touched.
- Client-visible impact → the owner writes to the client; MAOS has no status page yet (master task list, workstream B).

## Tabletop review

| Date | Scenarios walked | Participants | Follow-ups |
|---|---|---|---|
| pending | R1, R3, R6, R7 | owner, operator | — |
