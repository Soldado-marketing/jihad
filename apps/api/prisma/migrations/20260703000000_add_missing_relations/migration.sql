-- Add FK constraints for relations that were missing @relation declarations
-- These columns already exist; we are only adding FK constraints

-- FileAsset -> Project
ALTER TABLE "FileAsset"
  ADD CONSTRAINT "FileAsset_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FileAsset -> Task
ALTER TABLE "FileAsset"
  ADD CONSTRAINT "FileAsset_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FileAsset -> User (createdBy)
ALTER TABLE "FileAsset"
  ADD CONSTRAINT "FileAsset_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- VoiceNote -> Project
ALTER TABLE "VoiceNote"
  ADD CONSTRAINT "VoiceNote_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- VoiceNote -> Task
ALTER TABLE "VoiceNote"
  ADD CONSTRAINT "VoiceNote_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invoice -> Project
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
