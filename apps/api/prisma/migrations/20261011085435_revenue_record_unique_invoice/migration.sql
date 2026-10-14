-- MAOS-T40: one revenue record per invoice (unique (tenantId, invoiceId)).
--
-- Technical write freeze (owner requirement 2026-10-14). Until this index
-- exists, two concurrent postings could still insert a duplicate. So, in ONE
-- transaction:
--   1. lock RevenueRecord in SHARE ROW EXCLUSIVE mode. This conflicts with the
--      ROW EXCLUSIVE lock every INSERT, UPDATE and DELETE takes, so no write
--      to the table can start or be in flight while we hold it; plain reads
--      (ACCESS SHARE) still work. lock_timeout makes the migration fail fast,
--      instead of queueing application writes behind it, if a write
--      transaction is open.
--   2. with the lock held, refuse (and roll everything back) if any
--      duplicate (tenantId, invoiceId) already exists;
--   3. create the unique index (it needs SHARE, which this transaction's lock
--      already covers); the lock is released when the transaction ends.
-- One transaction without BEGIN/COMMIT: Prisma sends this whole file as a
-- single simple-query message, which PostgreSQL runs as ONE implicit
-- transaction and rolls back as a whole on any error (no index, no change;
-- Prisma can still record the failure). If the statements were ever sent one
-- by one instead, LOCK TABLE would refuse to run outside a transaction block,
-- so the freeze can never be skipped silently.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE "RevenueRecord" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "RevenueRecord"
    WHERE "invoiceId" IS NOT NULL
    GROUP BY "tenantId", "invoiceId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'MAOS T40 precheck failed: duplicate (tenantId, invoiceId) in RevenueRecord - migration not applied';
  END IF;
END
$$;
CREATE UNIQUE INDEX "RevenueRecord_tenantId_invoiceId_key" ON "RevenueRecord"("tenantId", "invoiceId");
