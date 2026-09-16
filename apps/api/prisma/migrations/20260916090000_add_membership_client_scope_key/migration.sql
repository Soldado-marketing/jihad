-- Gate 3: give a CLIENT membership an identity to be scoped by.
--
-- Every client-facing resource (Project, Task, FileAsset, ApprovalRequest,
-- Invoice, Payment) already carries clientScopeKey, but nothing on the identity
-- side said WHICH client a member speaks for, so the client portal could only
-- ever scope to the tenant. This column is the missing half of that pair.
--
-- Additive and nullable on purpose: existing rows keep NULL, no backfill runs,
-- and old application code that never selects the column keeps working, so the
-- migration is safe to apply before the new image serves traffic.
--
-- NULL is the fail-closed value. A CLIENT membership with NULL matches no
-- resource at all; it never falls back to tenant-wide access.

-- AlterTable
ALTER TABLE "TenantMembership" ADD COLUMN     "clientScopeKey" TEXT;

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_clientScopeKey_idx" ON "TenantMembership"("tenantId", "clientScopeKey");
