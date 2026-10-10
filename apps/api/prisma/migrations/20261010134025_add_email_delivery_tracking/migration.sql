-- MAOS-T44: per-recipient email delivery tracking (owner decision D9).
--
-- Purely additive: one new enum and two new tables; no existing table, column
-- or row is changed, so code that does not know these tables keeps working and
-- the migration is safe to apply before the new image serves traffic. The new
-- code writes here when an invoice is sent; that write is failure-safe, but the
-- migration should still be applied BEFORE the new API image is deployed.
--
-- EmailMessage: one row per recipient (each recipient gets its own message).
-- providerMessageId is the Resend email id that delivery webhooks match on.
-- EmailEvent: provider delivery events for a message (written by T45).

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'DELIVERED', 'DELAYED', 'BOUNCED', 'COMPLAINED');

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_providerMessageId_key" ON "EmailMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "EmailMessage_tenantId_resourceType_resourceId_idx" ON "EmailMessage"("tenantId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "EmailEvent_emailMessageId_occurredAt_idx" ON "EmailEvent"("emailMessageId", "occurredAt");

-- CreateIndex
CREATE INDEX "EmailEvent_tenantId_idx" ON "EmailEvent"("tenantId");

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
