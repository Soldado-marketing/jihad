-- Migration: add_sort_order_labels
-- Adds sortOrder to Task and Subtask, creates Label and TaskLabel models,
-- and backfills sortOrder on all existing rows.

-- ──────────────────────────────────────────────
-- 1. Add sortOrder to Task
-- ──────────────────────────────────────────────
ALTER TABLE "Task" ADD COLUMN "sortOrder" DOUBLE PRECISION;

-- ──────────────────────────────────────────────
-- 2. Add sortOrder to Subtask
-- ──────────────────────────────────────────────
ALTER TABLE "Subtask" ADD COLUMN "sortOrder" DOUBLE PRECISION;

-- ──────────────────────────────────────────────
-- 3. Create Label table
-- ──────────────────────────────────────────────
CREATE TABLE "Label" (
  "id"        TEXT         NOT NULL,
  "tenantId"  TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "color"     TEXT         NOT NULL DEFAULT '#94a3b8',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Label_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Label_tenantId_name_key" UNIQUE ("tenantId", "name"),
  CONSTRAINT "Label_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Label_tenantId_idx" ON "Label"("tenantId");

-- ──────────────────────────────────────────────
-- 4. Create TaskLabel join table
-- ──────────────────────────────────────────────
CREATE TABLE "TaskLabel" (
  "taskId"    TEXT NOT NULL,
  "labelId"   TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,

  CONSTRAINT "TaskLabel_taskId_labelId_key" UNIQUE ("taskId", "labelId"),
  CONSTRAINT "TaskLabel_taskId_fkey" FOREIGN KEY ("taskId")
    REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskLabel_labelId_fkey" FOREIGN KEY ("labelId")
    REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskLabel_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TaskLabel_tenantId_taskId_idx"  ON "TaskLabel"("tenantId", "taskId");
CREATE INDEX "TaskLabel_tenantId_labelId_idx" ON "TaskLabel"("tenantId", "labelId");

-- ──────────────────────────────────────────────
-- 5. Add supporting index on Task.sortOrder
-- ──────────────────────────────────────────────
CREATE INDEX "Task_tenantId_sortOrder_idx" ON "Task"("tenantId", "sortOrder");

-- ──────────────────────────────────────────────
-- 6. Backfill sortOrder on existing Task rows
--
-- Within each (tenantId, status) group, tasks are ordered by createdAt ASC.
-- Row 1 gets 1000.0, row 2 gets 2000.0, etc.
-- Using multiples of 1000 leaves room for fractional insertion later
-- (e.g. insert at 1500 between 1000 and 2000).
-- This is a no-op on databases with no Task rows.
-- ──────────────────────────────────────────────
UPDATE "Task"
SET "sortOrder" = ranked.rn * 1000.0
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "status"
      ORDER BY "createdAt" ASC
    ) AS rn
  FROM "Task"
) AS ranked
WHERE "Task".id = ranked.id;

-- ──────────────────────────────────────────────
-- 7. Backfill sortOrder on existing Subtask rows
--
-- Within each taskId group, subtasks are ordered by createdAt ASC.
-- Row 1 gets 1000.0, row 2 gets 2000.0, etc.
-- This is a no-op on databases with no Subtask rows.
-- ──────────────────────────────────────────────
UPDATE "Subtask"
SET "sortOrder" = ranked.rn * 1000.0
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "taskId"
      ORDER BY "createdAt" ASC
    ) AS rn
  FROM "Subtask"
) AS ranked
WHERE "Subtask".id = ranked.id;
