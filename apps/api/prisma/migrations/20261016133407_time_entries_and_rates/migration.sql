-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'BILLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RateScope" AS ENUM ('MEMBER', 'ROLE', 'TENANT');

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "customerId" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "rateCents" INTEGER,
    "rateSource" "RateScope",
    "currency" TEXT,
    "costCents" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scope" "RateScope" NOT NULL,
    "userId" TEXT,
    "role" "MembershipRole",
    "rateCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "validFrom" DATE NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeEntry_tenantId_userId_date_idx" ON "TimeEntry"("tenantId", "userId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_tenantId_projectId_date_idx" ON "TimeEntry"("tenantId", "projectId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_tenantId_taskId_idx" ON "TimeEntry"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_tenantId_customerId_idx" ON "TimeEntry"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "TimeEntry_tenantId_status_idx" ON "TimeEntry"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Rate_tenantId_scope_validFrom_idx" ON "Rate"("tenantId", "scope", "validFrom");

-- CreateIndex
CREATE INDEX "Rate_tenantId_userId_validFrom_idx" ON "Rate"("tenantId", "userId", "validFrom");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;


-- ADR-018 invariants enforced by the database (Prisma does not model CHECK constraints).
-- One entry is 1 to 1440 minutes.
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_minutes_check" CHECK ("minutes" BETWEEN 1 AND 1440);
-- Integer cents are never negative.
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_cents_check" CHECK (("rateCents" IS NULL OR "rateCents" >= 0) AND ("costCents" IS NULL OR "costCents" >= 0));
-- A frozen rate is complete or absent: rate, source, currency and cost together, or none of rate, source and cost ("unrated").
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_frozen_rate_check" CHECK (
  ("rateCents" IS NULL AND "rateSource" IS NULL AND "costCents" IS NULL)
  OR ("rateCents" IS NOT NULL AND "rateSource" IS NOT NULL AND "currency" IS NOT NULL AND "costCents" IS NOT NULL)
);
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_rateCents_check" CHECK ("rateCents" >= 0);
-- MEMBER: a member and no role; ROLE: an internal role and no member; TENANT: neither.
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_scope_check" CHECK (
  ("scope" = 'MEMBER' AND "userId" IS NOT NULL AND "role" IS NULL)
  OR ("scope" = 'ROLE' AND "role" IS NOT NULL AND "role" <> 'CLIENT' AND "userId" IS NULL)
  OR ("scope" = 'TENANT' AND "userId" IS NULL AND "role" IS NULL)
);
