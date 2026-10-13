-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "Invite_tenantId_customerId_idx" ON "Invite"("tenantId", "customerId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
