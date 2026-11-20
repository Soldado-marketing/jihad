/**
 * The database's own statement statistics for a load run (MAOS A07): which
 * statements took the most time in total and on average. Needs the
 * pg_stat_statements extension (run-local.sh starts the disposable database
 * with it). Local databases only.
 *
 * Usage: DATABASE_URL=… node scripts/perf/slow-queries.mjs reset | report <out.json>
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { assertLocal } from './lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(root, 'apps/api/package.json'));
assertLocal(String(process.env.DATABASE_URL ?? '').replace(/^postgres(ql)?:/, 'http:'), 'the database');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const [mode, out] = process.argv.slice(2);

if (mode === 'reset') {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
  // The function answers with nothing; the outer SELECT gives the client a value to read.
  await prisma.$queryRawUnsafe('SELECT 1 AS done FROM (SELECT pg_stat_statements_reset()) AS r');
  console.log('statement statistics reset');
} else if (mode === 'report') {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT query, calls::int AS calls, round(total_exec_time::numeric, 1)::float AS total_ms, round(mean_exec_time::numeric, 2)::float AS mean_ms,
           round(max_exec_time::numeric, 1)::float AS max_ms, rows::int AS rows
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND query NOT ILIKE '%pg_stat_statements%' AND query NOT ILIKE 'BEGIN%' AND query NOT ILIKE 'COMMIT%' AND query NOT ILIKE 'SET %' AND query NOT ILIKE 'DEALLOCATE%'
    ORDER BY total_exec_time DESC LIMIT 25`);
  const total = rows.reduce((sum, r) => sum + r.total_ms, 0);
  const table = rows.map((r) => ({ ...r, share: total ? Math.round((r.total_ms / total) * 1000) / 10 : 0, rowsPerCall: r.calls ? Math.round(r.rows / r.calls) : 0, query: r.query.replace(/\s+/g, ' ') }));
  if (out) writeFileSync(out, JSON.stringify(table, null, 2));
  for (const r of table.slice(0, 15)) console.log(`${String(r.share).padStart(5)}%  total ${String(r.total_ms).padStart(9)} ms  mean ${String(r.mean_ms).padStart(7)} ms  calls ${String(r.calls).padStart(6)}  rows/call ${String(r.rowsPerCall).padStart(5)}  ${r.query.slice(0, 150)}`);
} else { console.error('usage: slow-queries.mjs reset | report <out.json>'); process.exit(2); }
await prisma.$disconnect();
