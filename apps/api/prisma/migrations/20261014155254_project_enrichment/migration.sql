-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budgetCents" INTEGER,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "ownerUserId" TEXT,
ADD COLUMN     "projectNumber" TEXT,
ADD COLUMN     "serviceType" TEXT;

-- CreateIndex
CREATE INDEX "Project_tenantId_ownerUserId_idx" ON "Project"("tenantId", "ownerUserId");

-- CreateIndex
CREATE INDEX "Project_tenantId_deadline_idx" ON "Project"("tenantId", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tenantId_projectNumber_key" ON "Project"("tenantId", "projectNumber");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

