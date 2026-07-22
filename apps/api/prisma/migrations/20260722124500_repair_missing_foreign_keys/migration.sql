-- Migration: repair_missing_foreign_keys
-- Purpose: Idempotently (re)establish six foreign-key constraints that may be
--          missing on databases where they were never created.
--
-- Safety design:
--   * Each constraint is guarded by its own DO $$ ... END $$; block.
--   * The block checks pg_constraint for the EXACT constraint name and only
--     adds the constraint when that exact name is absent.
--   * No existing constraint is dropped, renamed, replaced, or validated.
--   * No application data is read, updated, or deleted.

-- ──────────────────────────────────────────────
-- 1. FileAsset.projectId -> Project.id
-- ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_projectId_fkey'
  ) THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ──────────────────────────────────────────────
-- 2. FileAsset.taskId -> Task.id
-- ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_taskId_fkey'
  ) THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "Task"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ──────────────────────────────────────────────
-- 3. FileAsset.createdByUserId -> User.id
-- ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FileAsset_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "FileAsset"
      ADD CONSTRAINT "FileAsset_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ──────────────────────────────────────────────
-- 4. VoiceNote.projectId -> Project.id
-- ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VoiceNote_projectId_fkey'
  ) THEN
    ALTER TABLE "VoiceNote"
      ADD CONSTRAINT "VoiceNote_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ──────────────────────────────────────────────
-- 5. VoiceNote.taskId -> Task.id
-- ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VoiceNote_taskId_fkey'
  ) THEN
    ALTER TABLE "VoiceNote"
      ADD CONSTRAINT "VoiceNote_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "Task"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ──────────────────────────────────────────────
-- 6. Invoice.projectId -> Project.id
-- ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_projectId_fkey'
  ) THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
