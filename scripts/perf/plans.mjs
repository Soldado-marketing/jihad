/**
 * The plans the database chooses for the statements of a load run (MAOS A07).
 * Takes the application's own statements from pg_stat_statements — the ones
 * with the highest total time and the ones with the highest mean time — and
 * writes one EXPLAIN (GENERIC_PLAN) per statement into a .sql file (a generic
 * plan needs no parameter values). run-local.sh feeds that file to psql inside
 * the disposable container. Reads only; local databases only.
 *
 * Usage: DATABASE_URL=… node scripts/perf/plans.mjs <out.json>
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
const out = process.argv[2];

const base = `FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database()) AND query ILIKE 'SELECT%' AND query NOT ILIKE '%pg_stat_statements%' AND query NOT ILIKE '%pg_catalog%' AND calls >= 20`;
const cols = `query, calls::int AS calls, round(total_exec_time::numeric, 1)::float AS total_ms, round(mean_exec_time::numeric, 2)::float AS mean_ms, (rows / GREATEST(calls, 1))::int AS rows_per_call`;
const byTotal = await prisma.$queryRawUnsafe(`SELECT ${cols} ${base} ORDER BY total_exec_time DESC LIMIT 12`);
const byMean = await prisma.$queryRawUnsafe(`SELECT ${cols} ${base} ORDER BY mean_exec_time DESC LIMIT 8`);
const seen = new Set(); const report = []; const sql = [];
for (const s of [...byTotal, ...byMean]) {
  if (seen.has(s.query)) continue; seen.add(s.query);
  const table = (/FROM "public"\."(\w+)"/.exec(s.query) ?? [])[1] ?? '?';
  report.push({ n: report.length + 1, table, calls: s.calls, total_ms: s.total_ms, mean_ms: s.mean_ms, rows_per_call: s.rows_per_call, query: s.query.replace(/\s+/g, ' ') });
  // The statements carry $1, $2 … placeholders; psql sends them as they are, which a prepared-statement client cannot.
  sql.push(`\\echo ### ${report.length} ${table} mean ${s.mean_ms} ms, ${s.rows_per_call} rows/call, ${s.calls} calls`, `EXPLAIN (GENERIC_PLAN) ${s.query.replace(/\s+/g, ' ')};`);
}
if (out) { writeFileSync(out, JSON.stringify(report, null, 2)); writeFileSync(out.replace(/\.json$/, '.sql'), sql.join('\n') + '\n'); }
console.log(`${report.length} statements written for EXPLAIN`);
// The indexes that exist, for comparison with what the plans use.
const indexes = await prisma.$queryRawUnsafe(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('Task','AuditEvent','Notification','InternalNote','FileAsset','Subtask','TaskLabel','Project') ORDER BY tablename, indexname`);
if (out) writeFileSync(out.replace(/\.json$/, '-indexes.json'), JSON.stringify(indexes, null, 2));
await prisma.$disconnect();
