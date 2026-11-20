# MAOS-A07 — Production performance and realistic-load assessment

**Closure status (2026-11-20): ASSESSED — the bound is NOT met for one endpoint; not DONE.** Measured on an isolated local stack with invented data. 24 of 26 measured reads are far under 500 ms at 20 people at once. `GET /tasks` for an OWNER or MANAGER is not: it answers with all 2,000 tasks (1.3 MB) every time and reaches a p95 of about 700–800 ms. The database is not the cause — no statement averages 5 ms — so no index fixes it; the list needs a page size. That is a change to how the board loads and is proposed as its own task. Two indexes are proposed for later growth. Open: the owner's decision on the task-list finding. The checklist below was written before any measurement.

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

## Acceptance checklist and evidence

| # | Requirement (from the task row unless marked) | Evidence | Result |
|---|---|---|---|
| 1 | Isolated stack; never production data | `scripts/perf/run-local.sh` sets the database address to `127.0.0.1` itself, starts a disposable container and removes it on exit; every script refuses a target that is not this machine before it connects (unit test); nothing in them names a production address or a credential store (unit test). No container is left | PASS |
| 2 | Seeded with 50 projects, 2,000 tasks and 500 files (metadata) | read back from the database after the seed: 50 projects, 2000 tasks, 500 files with 629 versions | PASS |
| 3 | Realistic enough to measure | one company with 29 people (Owner, manager, 12 employees, 3 contractors, 12 clients), 12 customers, 156 project memberships, 2962 subtasks, 1017 task labels, 1656 comments, 1717 notices, 5041 audit records; the lists answer with real rows (column "Rows") | PASS |
| 4 | 20 concurrent users on the list endpoints | 20 people each keeping one request in flight for 20 s per endpoint; run A 379139 requests, run B 342391 | PASS |
| 5 | p95 < 500 ms for list endpoints | table below: 24 of 26 rows PASS, the highest of them 334.5 ms; **`GET /tasks` as Owner and as Manager FAIL** (p95 697.7 / 798 and 713.2 / 808.8 ms) | **NOT MET for one endpoint** |
| 6 | Not an artefact | 0 errors in 721530 requests (every answer had the expected status; a throttled or refused answer would have been counted as an error, unit test); the Mac was kept awake for the runs; two runs agree on every verdict, and two earlier runs with a different spread of client addresses gave the same (690.2 and 700.3 ms as Owner, 700.2 and 719.4 ms as Manager). One thing stays unexplained, see "Observed, not explained" | PASS, with one open observation |
| 7 | Slow queries listed | "The database's statements" below, from the database's own statistics of run A | PASS |
| 8 | Indexes proposed | "Proposed indexes" below — two, both for growth, neither needed for today's bound; and the statement of what no index fixes | PASS |
| 9 | Railway sizing note | below | PASS |
| 10 | Scripts kept and repeatable; arithmetic tested | `scripts/perf/` (seed, runner, statistics, plans, one command for the whole run); `scripts/test/perf-tools.test.mjs` 9 cases, in the blocking CI step for script tests | PASS |
| 11 | No application code changed | diff: `scripts/perf/`, `scripts/test/`, this file | PASS |
| 12 | CI six jobs green; merge on the owner's message | on the PR. The dependency-audit job is red on `main` since 2026-11-20 for a reason outside this task (new advisory, fixed by PR #180) and stays red here until that is merged | OPEN |

## Where and how it was measured

- Machine: Apple M3, 8 cores, 16 GB, macOS 26.6.2; Docker 29.5.3 with PostgreSQL 16 in a container; Node 24.15; the API as built from `main` (`52c46ff`), one process, as a production build (`NODE_ENV=production`). API, database and the load runner share this one machine.
- Two full runs, A (12:13–12:22 UTC) and B (12:22–12:31 UTC), each on a fresh database with the same invented data. Run B was slower overall (the machine, not the code: 342391 requests against 379139); no verdict differs.
- A time is taken from sending a request until its whole body has arrived. Percentiles by the nearest-rank rule over the answers with the expected status.
- The API's rate limit stayed on. The requests were spread over 2,000 simulated client addresses so that the limit is not what is measured; no request was throttled.

## Results at 20 people at once

| Endpoint | As | Rows | Size | Requests (run A / B) | Errors | p50 ms (A / B) | p95 ms (A / B) | p99 ms (A / B) | p95 < 500 ms |
|---|---|---|---|---|---|---|---|---|---|
| `GET /tasks` | owner | 2000 | 1.3 MB | 828 / 739 | 0 | 478.7 / 523.5 | 697.7 / 798 | 775.9 / 1355.9 | **FAIL** |
| `GET /tasks` | manager | 2000 | 1.3 MB | 824 / 749 | 0 | 478 / 514.1 | 713.2 / 808.8 | 771.9 / 981.5 | **FAIL** |
| `GET /tasks` | employee | 645 | 436 kB | 2403 / 2223 | 0 | 162.6 / 174.1 | 230.3 / 251.8 | 257.3 / 282.3 | PASS |
| `GET /tasks?status=IN_PROGRESS` | owner | 440 | 298 kB | 3435 / 3077 | 0 | 114.5 / 124.3 | 157.3 / 183.8 | 177.7 / 226.5 | PASS |
| `GET /tasks?projectId=…` | owner | 40 | 26 kB | 16691 / 14253 | 0 | 23.4 / 25.8 | 30.9 / 39.3 | 35.4 / 73.5 | PASS |
| `GET /projects` | owner | 50 | 28 kB | 13261 / 10201 | 0 | 29.4 / 35 | 38.6 / 64.4 | 44.6 / 104.5 | PASS |
| `GET /projects` | employee | 50 | 27 kB | 10693 / 9059 | 0 | 36.8 / 40.6 | 48.2 / 60.6 | 54.8 / 128.9 | PASS |
| `GET /files` | owner | 500 | 210 kB | 4513 / 4327 | 0 | 86.9 / 88.1 | 118.8 / 124.7 | 142.4 / 167 | PASS |
| `GET /customers` | owner | 12 | 4 kB | 31736 / 27509 | 0 | 11.9 / 13 | 18.4 / 23.2 | 23.5 / 37.2 | PASS |
| `GET /labels` | owner | 12 | 2 kB | 37154 / 32507 | 0 | 10.1 / 10.8 | 16.7 / 20.6 | 20.9 / 32.4 | PASS |
| `GET /users/members` | owner | 29 | 3 kB | 32046 / 25758 | 0 | 10.7 / 12.6 | 23.2 / 31.3 | 28.4 / 47.7 | PASS |
| `GET /notifications` | employee | 50 | 12 kB | 6793 / 9233 | 0 | 47.7 / 31.9 | 124 / 81.1 | 236.4 / 327.2 | PASS |
| `GET /notifications/unread-count` ¹ | employee | — | 1 kB | 18927 / 17918 | 0 | 20.7 / 19.2 | 32.8 / 46.9 | 45.2 / 87.2 | PASS |
| `GET /my-work` | employee | — | 16 kB | 8058 / 7403 | 0 | 45.6 / 49.1 | 78.4 / 83.1 | 93.7 / 118.4 | PASS |
| `GET /audit-events` | owner | 50 | 17 kB | 25944 / 20895 | 0 | 14.6 / 17.4 | 22.8 / 30.7 | 28.6 / 44.5 | PASS |
| `GET /collaboration/notes` | owner | 1656 | 542 kB | 1788 / 1692 | 0 | 220.7 / 231.9 | 317.8 / 334.5 | 357.5 / 372.2 | PASS |
| `GET /collaboration/notes?task` | owner | 2 | 1 kB | 27383 / 26056 | 0 | 13.9 / 14.5 | 20.6 / 21.5 | 27.3 / 28.5 | PASS |
| `GET /search?q=colour` | owner | — | 3 kB | 10694 / 11637 | 0 | 35.7 / 33.2 | 55.2 / 47.7 | 64.4 / 56.2 | PASS |
| `GET /dashboards/workspace-summary` ¹ | owner | — | 1 kB | 16572 / 15521 | 0 | 23.1 / 24.1 | 33.4 / 37.2 | 39.5 / 54.7 | PASS |
| `GET /client/projects` | client | 5 | 1 kB | 23613 / 18336 | 0 | 15.3 / 20 | 28.2 / 34.5 | 35.2 / 52.3 | PASS |
| `GET /client/progress` | client | 5 | 1 kB | 20613 / 14737 | 0 | 18.7 / 24 | 27.1 / 45.4 | 32.4 / 66.6 | PASS |
| `GET /tasks/:id` ¹ | owner | — | 1 kB | 12673 / 14147 | 0 | 22.7 / 25.1 | 35.9 / 47.7 | 55.9 / 70.1 | PASS |
| `GET /tasks/:id/subtasks` | owner | 3 | 1 kB | 12529 / 17447 | 0 | 25.4 / 20.3 | 65 / 36.6 | 159.8 / 59.9 | PASS |
| `GET /activity/task/:id` | owner | 2 | 1 kB | 18264 / 19832 | 0 | 18.8 / 19 | 32 / 30.4 | 86.5 / 40.3 | PASS |
| `GET /projects/:id` ¹ | owner | — | 4 kB | 14820 / 12196 | 0 | 24.3 / 28.4 | 44.5 / 49.5 | 69.5 / 71.7 | PASS |
| `GET /customers/:id/overview` ¹ | owner | — | 5 kB | 6884 / 4939 | 0 | 56.5 / 68.4 | 74.7 / 139.3 | 97.7 / 309.9 | PASS |

¹ a single record or a count, measured next to the lists; not a list endpoint.

## The one that fails: the full task list

`GET /tasks` has no page size. For an Owner or a Manager it returns every task of the company with its project, assignee, labels and subtask count: 2,000 rows, 1.3 MB. The tasks page asks for it on opening and again after every change in the editor.

How it behaves as people are added (8 s per step, same data):

| People at once | all 2,000 tasks (Owner): p50 ms | p95 ms | answers per second | 645 tasks (employee): p50 ms | p95 ms | answers per second |
|---|---|---|---|---|---|---|
| 1 | 59.5 | 68.7 | 16.5 | 24.8 | 30.1 | 39.6 |
| 5 | 146.5 | 202.1 | 33.5 | 51.5 | 68.9 | 95.3 |
| 10 | 283.9 | 356.9 | 35.2 | 94.3 | 130.6 | 104.4 |
| 20 | 497.3 | 722.3 | 39 | 168.4 | 224.3 | 117.1 |
| 40 | 911.9 | 1129.2 | 42.1 | 324.2 | 396.3 | 120.9 |

The number of answers per second barely rises with more people: one API process is busy building and sending the answers, so each added person makes everyone wait longer. With one person the full list takes about 60 ms; the bound of 500 ms is crossed between 10 and 20 people. An employee, who sees their own 645 tasks, stays under it up to 40.

The database's part in it is small: the list statement averages under 5 ms for 2,000 rows. The time goes into turning 2,000 rows with their relations into objects and 1.3 MB of JSON, in one process. So:

- **No index fixes this.** The statement already reads what it must: every task of the company.
- What fixes it is a bounded answer: a page size, or loading the board per project or per column, and not returning archived work. That changes what the board and the list view load, so it is a product and interface change with its own checklist — **proposed as its own task**, not done here.
- The same shape, further from the bound today: `GET /collaboration/notes` without a filter (1656 notes, 542 kB, p95 317.8 / 334.5 ms) and `GET /files` (500 files, 210 kB, p95 118.8 / 124.7 ms). Both return every row.

## The database's statements

From PostgreSQL's own statistics of run A (`pg_stat_statements`); statements 10 and 11 are too cheap to appear among run A's 25 heaviest and are taken from the shorter sessions that read the plans. The plans are the generic plans PostgreSQL gives for the same statements. The 25 heaviest statements of run A together took about 144 s of database time, against roughly 10,500 person-seconds of load: the database is idle most of the time at this volume.

| # | Statement | Rows per call | Mean ms | What the plan does |
|---|---|---|---|---|
| 1 | Task list, every task of the company | 2,000 | 4.8 | reads the whole `Task` table of the company and sorts it; counts subtasks by reading the whole `Subtask` table |
| 2 | Task list of an employee (assigned, or in their projects) | 645 | 2.1 | uses `Task_tenantId_assignedToUserId_idx` and `Task_tenantId_projectId_idx`; subtask count as above |
| 3 | Notes list, every note of the company | 1,656 | 1.8 | reads and sorts all of them |
| 4 | Task list by status | 440 | 1.4 | uses `Task_tenantId_status_idx` |
| 5 | Search tasks by title (`ILIKE '%…%'`, 10 rows) | 10 | 1.4 | reads every task of the company and compares the title |
| 6 | Task list of one project | 40 | 1.0 | uses `Task_tenantId_projectId_idx`; **still reads the whole `Subtask` table** to count subtasks for 40 tasks |
| 7 | Tasks per project and status (for the project list) | 248 groups | 0.9 | reads the `Task` table of the company |
| 8 | Project list | 50 | 0.6 | reads and sorts the projects; task counts from an index only |
| 9 | File list | 500 | 0.6 | reads and sorts all files of the company |
| 10 | Notice list of one person (50 newest) | 50 | 0.3 | walks the index on `createdAt` of **all** notices backwards and keeps this person's |
| 11 | Audit log page (50 newest) | 51 | 0.2 | walks the index on `createdAt` of **all** audit records backwards and keeps this company's |

None of these is slow today. Three of them are written in a way that gets slower as other people's data grows, not one's own: 6 (the subtask count), 10 and 11.

## Proposed indexes

Proposed only; each is a migration and needs its own approval (§29). Neither is needed to meet today's bound.

| # | Index | Serves | Why |
|---|---|---|---|
| 1 | `Notification (tenantId, recipientUserId, createdAt DESC)` | the notice list and the bell (statement 10) | today the newest 50 of one person are found by walking every notice of every company from the newest; with many companies or a person with few notices that walk gets long. The existing `(tenantId, recipientUserId)` index serves the unread count, not the ordered list |
| 2 | `AuditEvent (tenantId, createdAt DESC, id DESC)` | the audit log page (statement 11) | the same pattern: the existing index on `createdAt` covers all companies together |

Considered and not proposed:

- **Task list**: the existing indexes already serve the filtered lists; the full list reads everything by design (see above).
- **Search by title**: a trigram index would serve `ILIKE '%…%'`, at the price of an extension; at 2,000 tasks the search costs 1.4 ms. To revisit when a company holds tens of thousands of tasks.
- **Subtask count** (statement 6): an index on `(tenantId, taskId)` exists and PostgreSQL chose not to use it at this size. Whether it switches as the table grows was not measured; to watch, since this cost grows with the subtasks of all companies.

## Railway sizing note

What Railway reports for the services today (read, nothing changed): plan "hobby", one replica, no resource limit override, application sleep off, restart on failure, health check on `/api/health/ready`.

What this measurement supports:

- **Nothing has to be resized for today's volume.** Production holds two projects and no tasks; the invented company here is far larger than the real one, and everything except the full task list has a wide margin.
- **The API's processor is the limit, not the database.** One API process served about 40 full task lists a second, or roughly 1,600 small answers a second (lists of a few rows), while the database idled. More database capacity would change nothing measured here.
- **The first thing that will be felt as the company grows is the tasks page for Owner and Manager**, and it is fixed in code (a bounded list), not by a larger machine: by the arithmetic of the table above, a machine twice as fast would move the point where 500 ms is crossed from between 10 and 20 people to between 20 and 40, and the answer stays 1.3 MB.

What it cannot say:

- **Milliseconds on Railway.** A Railway processor share is not an M3 core, and here the runner competed with the API for the same machine. Only the shape carries over: cost per answer grows with the rows returned, and waiting grows with the people asking at once.
- Network time between Amsterdam and the people using the app, and the time a phone needs to parse 1.3 MB.
- A second API replica: whether the API can run twice side by side was not examined (the rate limit is counted per process and the scheduled jobs run inside the API). To be checked before anyone adds a replica.
- Writes, uploads and downloads: only reads were measured, as the task asks.

## Observed, not explained

- `GET /notifications` and `GET /notifications/unread-count` are fast alone (p95 14 and 9.8 ms at 20 people, three rounds of 20 s) but slower in the middle of the full sequence (p95 124 / 81.1 and 32.8 / 46.9 ms), in all four full runs. Both figures are far under the bound. The database is not the cause (0.3 ms and 0.1 ms per statement). A first guess — the rate limiter's bookkeeping for tens of thousands of simulated addresses — was tested by cutting the addresses to 2,000 and did not remove it. The cause is not established.

## Findings for the owner

1. **The task list has no page size** (above). Proposed task: bound `GET /tasks` and load the board accordingly; the same for the notes list and the file list.
2. **Two indexes proposed** for later growth (above): each a small migration.
3. The measurement is repeatable with one command (`scripts/perf/run-local.sh <output-dir>`); it needs Docker and about ten minutes with the Mac awake.

## Not in this task

- A load test against production or against Railway (the row forbids production data; a Railway test environment does not exist).
- Creating indexes or changing queries: findings become their own tasks.
- Uploads and downloads of file bytes (the row asks for file metadata).
