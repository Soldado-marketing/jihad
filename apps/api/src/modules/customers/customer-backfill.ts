import { Prisma, PrismaClient } from '@prisma/client';
import { KEY_TABLES, LINKED_TABLES, relinkCustomers } from './customer-link';

export interface BackfillTenantReport {
  tenantId: string;
  distinctKeys: number;
  customersToCreate: number;
  rowsToLink: Record<string, number>;
}

export interface BackfillReport {
  dryRun: boolean;
  tenants: BackfillTenantReport[];
  customersCreated: number;
  rowsChanged: Record<string, number>;
}

/**
 * ADR-017 backfill (MAOS-T51). For each tenant, every distinct non-null
 * clientScopeKey found on any of the 13 key-carrying tables becomes exactly one
 * Customer (named after its key until an owner renames it), and Project,
 * Invoice and FileAsset rows with that key get its customerId.
 *
 * Dry run (the default) only counts and writes nothing. A real run is one
 * transaction and idempotent: a second run creates and changes nothing.
 * The report carries tenant ids and counts only - never keys or names.
 */
export async function backfillCustomers(
  prisma: PrismaClient,
  opts: { dryRun: boolean; /** Limit to these tenants (tests); default every tenant. */ tenantIds?: string[] },
): Promise<BackfillReport> {
  // The command line never passes tenantIds, so production runs stay global.
  // Tests pass their own tenants: a global run raced with suites seeding keys in parallel (CI-3).
  const only = (alias: string) =>
    !opts.tenantIds
      ? Prisma.empty
      : opts.tenantIds.length === 0
        ? Prisma.sql` AND FALSE`
        : Prisma.sql` AND ${Prisma.raw(alias)}."tenantId" IN (${Prisma.join(opts.tenantIds)})`;
  const union = Prisma.join(
    KEY_TABLES.map((t) => Prisma.sql`SELECT "tenantId", "clientScopeKey" FROM ${Prisma.raw(`"${t}"`)} x WHERE "clientScopeKey" IS NOT NULL${only('x')}`),
    ' UNION ',
  );

  return prisma.$transaction(
    async (tx) => {
      const keys = await tx.$queryRaw<{ tenantId: string; clientScopeKey: string; exists: boolean }[]>`
        SELECT k."tenantId", k."clientScopeKey",
               EXISTS (SELECT 1 FROM "Customer" c WHERE c."tenantId" = k."tenantId" AND c."clientScopeKey" = k."clientScopeKey") AS "exists"
        FROM (${union}) k
        ORDER BY k."tenantId", k."clientScopeKey"`;

      const tenants = new Map<string, BackfillTenantReport>();
      for (const k of keys) {
        const r = tenants.get(k.tenantId) ?? { tenantId: k.tenantId, distinctKeys: 0, customersToCreate: 0, rowsToLink: {} };
        r.distinctKeys += 1;
        if (!k.exists) r.customersToCreate += 1;
        tenants.set(k.tenantId, r);
      }
      // Rows whose customerId would change once every key has its Customer.
      for (const table of LINKED_TABLES) {
        const t = Prisma.raw(`"${table}"`);
        const counts = await tx.$queryRaw<{ tenantId: string; n: number }[]>`
          SELECT r."tenantId", count(*)::int AS n FROM ${t} r
          LEFT JOIN "Customer" c ON c."tenantId" = r."tenantId" AND c."clientScopeKey" = r."clientScopeKey"
          WHERE ((r."clientScopeKey" IS NOT NULL AND (c.id IS NULL OR r."customerId" IS DISTINCT FROM c.id))
             OR (r."clientScopeKey" IS NULL AND r."customerId" IS NOT NULL))${only('r')}
          GROUP BY r."tenantId"`;
        for (const c of counts) {
          const r = tenants.get(c.tenantId) ?? { tenantId: c.tenantId, distinctKeys: 0, customersToCreate: 0, rowsToLink: {} };
          r.rowsToLink[table] = c.n;
          tenants.set(c.tenantId, r);
        }
      }

      const report: BackfillReport = { dryRun: opts.dryRun, tenants: [...tenants.values()], customersCreated: 0, rowsChanged: {} };
      if (opts.dryRun) return report;

      const missing = keys.filter((k) => !k.exists);
      if (missing.length > 0) {
        const created = await tx.customer.createMany({
          data: missing.map((k) => ({ tenantId: k.tenantId, clientScopeKey: k.clientScopeKey, name: k.clientScopeKey })),
          skipDuplicates: true,
        });
        report.customersCreated = created.count;
      }
      if (!opts.tenantIds) {
        report.rowsChanged = await relinkCustomers(tx, null);
      } else {
        for (const tenantId of opts.tenantIds) {
          for (const [table, n] of Object.entries(await relinkCustomers(tx, tenantId))) {
            report.rowsChanged[table] = (report.rowsChanged[table] ?? 0) + n;
          }
        }
      }
      return report;
    },
    { timeout: 5 * 60 * 1000, maxWait: 10_000 },
  );
}
