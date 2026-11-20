# MAOS-A07 — Production performance and realistic-load assessment

**Closure status (2026-11-20): IN PROGRESS — checklist written before any measurement.**

Task row: "Production performance and realistic-load assessment. k6/autocannon against an isolated stack seeded with 50 projects / 2,000 tasks / 500 files metadata; Railway sizing note; never against production data. Acceptance: p95 < 500 ms for list endpoints at 20 concurrent users on the isolated stack; slow queries listed with indexes proposed."

Owner's condition for this run (2026-11-20): on an isolated environment, without using production data.

## Blueprint check (§30)

No conflict. This task measures; it adds no feature, no model and no migration. Indexes are **proposed** here, not created: an index is a schema change and gets its own task and approval (§29). Nothing touches production: no request is sent to the production API under load and no production row is read or copied.

## What "isolated" means here

- A disposable PostgreSQL 16 container on this Mac, a database created for the run, migrations applied, removed afterwards.
- The API built from `main` and started against that database only; the object-storage stub; no mail provider.
- Every row is invented by the seed script. No dump, no export and no id from production is used.
- The numbers therefore describe **this code on this machine**, not Railway. They show which endpoints and queries are heavy and how they grow; the absolute milliseconds on Railway will differ. The sizing note says what can and cannot be concluded.

## Tool

The row names k6 or autocannon. Neither is installed, and adding one means a new dependency (and a new entry for the blocking dependency audit) for a single measurement. The run uses a small runner written for it in plain Node (`scripts/perf/`), with no dependency: a fixed number of users that each keep one request in flight, latency per request, percentiles by the nearest-rank rule. Its arithmetic is covered by a unit test. If the owner prefers k6 for later runs, the scenarios are a list of paths and port directly.

## Acceptance checklist

| # | Requirement (from the task row unless marked) | How it is proven |
|---|---|---|
| 1 | Isolated stack; never production data | the run's own log: database name, host `127.0.0.1`, row counts created by the seed; nothing in the scripts reads a production address or credential |
| 2 | Seeded with 50 projects, 2,000 tasks and 500 files (metadata) | counts printed by the seed and read back from the database |
| 3 | The data is realistic enough to measure (derived): several roles, tasks spread over members and statuses, subtasks, labels, comments, notices, audit records, a client with shared work | counts in the record; the list endpoints answer with real pages of rows, not empty lists |
| 4 | 20 concurrent users on the list endpoints | runner output: 20 users, requests per endpoint, errors |
| 5 | p95 < 500 ms for list endpoints | table per endpoint and role: p50, p95, p99, requests, errors, response size. Every endpoint is listed, also one that fails the bound |
| 6 | Results are not an artefact (derived): no refused or throttled request is counted as a fast answer; the machine was awake; a second run agrees | error and status counts per endpoint; two runs compared |
| 7 | Slow queries listed | the database's own statement statistics for the run: the statements with the highest total and mean time, with calls and rows |
| 8 | Indexes proposed | for each slow statement: the plan the database chose, the index that would serve it, and whether an existing index already covers it. Proposed only |
| 9 | Railway sizing note | what the services have today as far as it can be read without changing anything, what the measurement implies and what it cannot say |
| 10 | The measuring scripts are kept and repeatable; their arithmetic is tested | `scripts/perf/`, `scripts/test/perf-tools.test.mjs` in the blocking CI job |
| 11 | No application code changed by this task unless a finding is fixed with the owner's knowledge | diff |
| 12 | CI six jobs green; merge on the owner's message | CI |

## Not in this task

- A load test against production or against Railway (the row forbids production data; a Railway test environment does not exist).
- Creating indexes or changing queries: findings become their own tasks.
- Uploads and downloads of file bytes (the row asks for file metadata).
