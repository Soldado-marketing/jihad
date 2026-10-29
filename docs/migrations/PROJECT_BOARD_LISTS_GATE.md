# Migration gate: custom project board lists (migration A)

Status:
- **Approved for isolated development** (owner, 2026-10-29).
- **Production migration NOT approved.** It needs a separate owner go after review.
- Optional migration B (several assignees per card, `TaskAssignee`) is **deferred**.

Migration: `apps/api/prisma/migrations/20261029202156_task_lists/migration.sql`.

## Why a migration

The owner wants each project to have its own Trello-style board:
- any number of lists with custom names (for example To Edit, Editing, Review, Revisions, Approved, Published);
- lists can be renamed, reordered, archived and restored;
- cards move freely between lists and keep their position.

Before this change, a board column *was* a `TaskStatus` value, so every project had the same five columns. A user-defined list needs its own row.

## The migration (additive only)

| Change | Purpose |
|---|---|
| `Task.listId TEXT NULL` | The card's list. Null means the card shows in the list mapped to its status. |
| `TaskList` table: `id`, `tenantId`, `projectId`, `name`, `sortOrder`, `status` (nullable), `archivedAt`, timestamps | The lists. |
| `Task_listId_fkey`: `listId` → `TaskList.id`, ON DELETE SET NULL | A deleted list (only through project or tenant cascade) clears its cards' `listId`. |
| `Task_listId_tenantId_projectId_fkey`: (`listId`, `tenantId`, `projectId`) → `TaskList` (`id`, `tenantId`, `projectId`) | **Database guarantee** that a card's list is in the card's own tenant and project. MATCH SIMPLE: checked while the card has a project. |
| Unique (`id`, `tenantId`, `projectId`) on `TaskList` | Target of the composite foreign key. |
| `TaskList_name_check`: trimmed name 1–60 characters | Backstop for the API's validation. |
| `TaskList` → `Tenant` and → `Project`, ON DELETE CASCADE | Lists go with their project or tenant. |
| Indexes: `TaskList(tenantId, projectId, archivedAt, sortOrder)` and `Task(tenantId, listId, sortOrder)` | The board's queries. |

The migration rewrites no existing row. `prisma migrate diff` from the migrated database to `schema.prisma` reports no drift; both foreign keys are modelled in Prisma.

## Behaviour

- **Status stays separate from lists.** Reports, My Work, overdue logic, the dashboard, the status board and the client portal read `Task.status` only.
  - A list may map to a status: moving a card into "Published" (mapped to DONE) sets DONE.
  - An unmapped list, for example "Editing", keeps the card's status.
- **Setup is explicit and idempotent.**
  - Opening a board writes nothing.
  - `POST /projects/:id/lists/initialize` creates the five former columns only when the project has no lists, archived ones included.
  - A transaction advisory lock makes concurrent calls create them once.
  - No task is moved during setup.
- **Compatibility with existing tasks.**
  - A card without a list shows in the first active list mapped to its status, otherwise under "Not in a list".
  - A card moved to another project leaves its list.
- **Archive, never delete.** An archived list hides with its cards. Restoring a list puts it at the end.
- **Permissions** reuse the existing model; no new permission was added.

  | Action | Permission | Roles |
  |---|---|---|
  | Read lists | project READ | Internal roles, within work scope |
  | Change the list structure | project UPDATE | OWNER, MANAGER |
  | Move cards (`PATCH /tasks/reorder` with `listId`) | task UPDATE, within scope | As before |

  - CLIENT users get 403.
  - Another tenant's project or list answers 404 and reveals nothing.
- **History.**
  - Card moves are recorded as `task.list.changed` (and `task.status.changed` when a mapped list changes the status).
  - List changes are recorded on the project as `board.*`.

## Evidence (disposable PG16 containers only)

- **Database guarantees,** tested with direct SQL that bypasses the API:
  - a card cannot point to a list of another project or of another tenant;
  - a card cannot move to another project while keeping its list;
  - a blank list name is refused;
  - deleting a project clears its cards' `listId` without error.
- **API:** `test/task-lists.test.mjs`, 17 tests, covering:
  - setup that writes nothing on read and is idempotent under concurrent calls;
  - six custom lists that are renamed, reordered and persisted;
  - different workflows per project;
  - archive and restore;
  - card moves with position, mapped and unmapped status;
  - history;
  - foreign, archived and other-project lists, and cards without a project;
  - project change;
  - EMPLOYEE and CONTRACTOR blocked from changing structure, contractor scope, CLIENT, foreign tenant, and no session.
- **Full suites in CI order:** `integration-api` 35/35, then 61 suites 780/780, then unit 485 pass (10 todo).
- **Rollback,** on a database holding 144 tasks, 26 lists and 6 cards in lists:
  - the task checksum (`id`, `status`, `projectId`, `sortOrder`, `title`) was identical before, after rollback and after re-apply;
  - `task-lists` passed again after re-apply.

## Risks

- **Application rollback with lists in use.** The previous API does not know about lists. While the column exists, moving a card that sits in a list to another project would fail on the composite key (500). Roll back the database with the SQL below, or clear `listId` first (`UPDATE "Task" SET "listId" = NULL`).
- **Rolling back the migration loses list data.** It removes list names, order and card placement. No task, status, order or assignment is lost.
- **Lock and table size.** `ALTER TABLE "Task" ADD COLUMN` (nullable, no default) takes a brief lock without rewriting the table. The new index on `Task` builds without `CONCURRENTLY`, which is fine at the current table size.

## Rollback

```sql
BEGIN;
ALTER TABLE "Task" DROP CONSTRAINT "Task_listId_tenantId_projectId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT "Task_listId_fkey";
DROP INDEX "Task_tenantId_listId_sortOrder_idx";
ALTER TABLE "Task" DROP COLUMN "listId";
DROP TABLE "TaskList";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261029202156_task_lists';
COMMIT;
```

## Procedure (owner window, after explicit approval)

1. Merge the PR once the owner approves; CI must be green.
2. Verify a fresh backup.
3. Run `migrate deploy`, as part of the API release.
4. Check `/api/health/ready`, the logs, and one board in each role.
