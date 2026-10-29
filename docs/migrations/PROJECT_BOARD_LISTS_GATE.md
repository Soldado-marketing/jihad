# Migration gate: project board lists (Trello-style), PROPOSAL

Status: **awaiting owner approval**. Nothing here is in `prisma/schema.prisma` or `prisma/migrations/`; no database was changed outside disposable test containers.

## Why a migration

The owner wants each project to have its own board with lists that can be created, renamed, reordered and archived. Today a board column *is* a `TaskStatus` enum value (TODO, IN_PROGRESS, IN_REVIEW, BLOCKED, DONE), so lists are fixed for every project. A user-defined list needs its own row. Optionally, a card can have several people (Trello "members"); today a task has one `assignedToUserId`.

Covered without a migration (branch `feat/project-boards`):

- Card order within a list, using the existing `Task.sortOrder` and `PATCH /tasks/reorder`.
- A board per project, using `/tasks?project=<id>`.
- Card history: task changes are now written to the audit log and shown on the card.
- Labels, due dates, checklists (subtasks), attachments (files with `taskId`) and comments (`InternalNote` with `resourceType=task`). These already existed.

## The migration

### A. Board lists (required for custom lists)

```sql
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "listId" TEXT;

-- CreateTable
CREATE TABLE "TaskList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" DOUBLE PRECISION NOT NULL,
    "status" "TaskStatus",
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskList_tenantId_projectId_archivedAt_sortOrder_idx" ON "TaskList"("tenantId", "projectId", "archivedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "Task_tenantId_listId_sortOrder_idx" ON "Task"("tenantId", "listId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "TaskList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskList" ADD CONSTRAINT "TaskList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskList" ADD CONSTRAINT "TaskList_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Prisma model (generated with `prisma migrate diff` from the current schema, so the SQL above is exactly what `migrate dev` would emit):

```prisma
model TaskList {
  id         String      @id @default(cuid())
  tenantId   String
  projectId  String
  name       String
  sortOrder  Float
  /// Status a card takes when moved into this list; null keeps its status.
  status     TaskStatus?
  archivedAt DateTime?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  tenant     Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  project    Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks      Task[]

  @@index([tenantId, projectId, archivedAt, sortOrder])
}
// Task: listId String?, list TaskList? @relation(onDelete: SetNull), @@index([tenantId, listId, sortOrder])
```

### B. Several people per card (optional, decide separately)

```sql
-- CreateTable
CREATE TABLE "TaskAssignee" (
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateIndex
CREATE INDEX "TaskAssignee_tenantId_userId_idx" ON "TaskAssignee"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

`Task.assignedToUserId` stays the primary assignee, so My Work, notifications, the contractor scope and reports keep working unchanged. `TaskAssignee` only adds further members.

## Design choices

- **Status stays.** Reports, My Work, overdue logic, the dashboard and the client portal all read `Task.status`, so lists do not replace it. A list may map to a status (`TaskList.status`); moving a card into, for example, "Done" sets DONE. A list without a mapping leaves the status alone.
- **No data rewrite.** The migration only adds a nullable column and new tables. Existing tasks keep `listId = NULL`.
  - The first time a project's board opens, the API creates that project's five default lists from the status columns: To Do, In Progress, In Review, Blocked, Done.
  - A card with no list appears in the list mapped to its status.
  - No backfill runs at deploy time.
- **Archive, never delete.** `archivedAt` hides a list and its cards stay. Deleting a project cascades to its lists, and that sets the cards' `listId` back to NULL.
- **Tenant and scope.**
  - Every list query filters by `tenantId` and the caller's project scope (`resourceScope.projectWhere`).
  - Before a `listId` is set on a card, the API checks that the list belongs to the same tenant and to the card's project, and returns 404 otherwise.
  - CLIENT users never receive lists.
  - The tenant FK stays as on every other tenant-owned table.
- **Compatibility.** Old code runs against the new schema, because the column is nullable and the tables are unknown to it. New code reads lists only after the migration. Deploying API and migration together, as the existing `migrate deploy` step does, is safe in either order.

## Evidence (disposable database only)

- `prisma validate` passes for both proposed schemas.
- A and B applied in one transaction to a disposable PG16 database that held 74 tasks from the integration suites. Afterwards: 74 tasks, 0 with a `listId`, and both tables present.
- The rollback below ran on the same database afterwards and left 74 tasks.

## Rollback

```sql
BEGIN;
DROP TABLE "TaskAssignee";
ALTER TABLE "Task" DROP CONSTRAINT "Task_listId_fkey";
DROP INDEX "Task_tenantId_listId_sortOrder_idx";
ALTER TABLE "Task" DROP COLUMN "listId";
DROP TABLE "TaskList";
COMMIT;
```

Rolling back loses only list names, order and membership created after the deploy. No task, status or assignment is lost.

## After approval (separate task)

1. Add the models and a new forward migration, generated on a disposable database.
2. Build the `task-lists` API (list, create, rename, reorder, archive and restore, all scoped). Add `listId` to the task update and reorder endpoints, with negative tests for a foreign tenant, a foreign project and contractor scope.
3. Build the board UI from `src/components/tasks/board-prototype.tsx`, using the real endpoints.
4. Owner window: verify a backup, run `migrate deploy`, then check health and logs.
