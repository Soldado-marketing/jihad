/**
 * MAOS-T51 command line: `node dist/modules/customers/backfill-customers.cli.js [--apply]`.
 * Without --apply it is a dry run. DATABASE_URL comes from the environment;
 * running it against production is a migration-gate step for the owner.
 */
import { PrismaClient } from '@prisma/client';
import { backfillCustomers } from './customer-backfill';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    const report = await backfillCustomers(prisma, { dryRun: !apply });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`backfill failed: ${err instanceof Error ? err.name : 'UnknownError'}\n`);
  process.exit(1);
});
