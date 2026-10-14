import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/**
 * ADR-017 invariant: a row's customerId is always the Customer that owns the
 * row's own clientScopeKey in the same tenant, or null. Every write that sets
 * a clientScopeKey on Project, Invoice or FileAsset derives customerId here;
 * a customerId is never taken from a request.
 */
export async function customerIdForKey(db: Db, tenantId: string, clientScopeKey: string | null | undefined): Promise<string | null> {
  if (!clientScopeKey) return null;
  const customer = await db.customer.findUnique({
    where: { tenantId_clientScopeKey: { tenantId, clientScopeKey } },
    select: { id: true },
  });
  return customer?.id ?? null;
}

/** The tables that carry customerId in the first step (ADR-017 §1). */
export const LINKED_TABLES = ['Project', 'Invoice', 'FileAsset'] as const;

/** Every table that carries a clientScopeKey (ADR-017 context). */
export const KEY_TABLES = [
  'TenantMembership', 'Project', 'Task', 'FileAsset', 'FileShare', 'ApprovalRequest', 'ChatChannel',
  'ChatMembership', 'ChatMessage', 'VoiceNote', 'Invoice', 'Payment', 'RevenueRecord',
] as const;

/**
 * Points every linked row of one tenant (optionally one key) at the Customer
 * owning its key, and clears a customerId whose key no longer matches.
 * Returns the number of rows changed per table. Idempotent.
 */
export async function relinkCustomers(db: Db, tenantId: string | null, clientScopeKey?: string): Promise<Record<string, number>> {
  const changed: Record<string, number> = {};
  for (const table of LINKED_TABLES) {
    const t = Prisma.raw(`"${table}"`);
    const tenant = tenantId === null ? Prisma.sql`TRUE` : Prisma.sql`r."tenantId" = ${tenantId}`;
    const key = clientScopeKey === undefined ? Prisma.sql`TRUE` : Prisma.sql`r."clientScopeKey" = ${clientScopeKey}`;
    const linked = await db.$executeRaw`
      UPDATE ${t} AS r SET "customerId" = c.id
      FROM "Customer" c
      WHERE ${tenant} AND ${key}
        AND c."tenantId" = r."tenantId" AND c."clientScopeKey" = r."clientScopeKey"
        AND r."customerId" IS DISTINCT FROM c.id`;
    const cleared = await db.$executeRaw`
      UPDATE ${t} AS r SET "customerId" = NULL
      WHERE ${tenant} AND ${key} AND r."customerId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "Customer" c
          WHERE c.id = r."customerId" AND c."tenantId" = r."tenantId" AND c."clientScopeKey" = r."clientScopeKey")`;
    changed[table] = linked + cleared;
  }
  return changed;
}
