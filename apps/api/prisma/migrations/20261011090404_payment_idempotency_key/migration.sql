-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId", "idempotencyKey");

