-- Custom project board lists (owner approval 2026-10-29, docs/migrations/PROJECT_BOARD_LISTS_GATE.md).
-- Additive only: a nullable Task.listId and a new TaskList table. No existing
-- row is rewritten; tasks without a list keep working by their status.

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
CREATE UNIQUE INDEX "TaskList_id_tenantId_projectId_key" ON "TaskList"("id", "tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Task_tenantId_listId_sortOrder_idx" ON "Task"("tenantId", "listId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "TaskList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_listId_tenantId_projectId_fkey" FOREIGN KEY ("listId", "tenantId", "projectId") REFERENCES "TaskList"("id", "tenantId", "projectId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskList" ADD CONSTRAINT "TaskList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskList" ADD CONSTRAINT "TaskList_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A list name is 1-60 characters after trimming (the API trims; this is the backstop).
-- Prisma does not model CHECK constraints.
ALTER TABLE "TaskList" ADD CONSTRAINT "TaskList_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 60);
