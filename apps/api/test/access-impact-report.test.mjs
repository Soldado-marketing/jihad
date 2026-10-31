/**
 * The access-grants impact report (docs/rollout/access-grants-impact.sql) is
 * meant for a read-only production run. This keeps it that way: read-only
 * transaction, preflight abort, timeouts, nothing that writes, and no raw
 * personal data in the output.
 * Run: node --test test/access-impact-report.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const raw = readFileSync(join(repo, 'docs/rollout/access-grants-impact.sql'), 'utf8');
// SQL without comments, \echo lines and string literals: what actually executes.
const code = raw
  .split('\n')
  .filter((l) => !/^\s*--/.test(l) && !/^\s*\\echo/.test(l))
  .join('\n')
  .replace(/'[^']*'/g, "''");
const statements = code.split(';').map((s) => s.trim()).filter(Boolean);

describe('access impact report', () => {
  it('only reads: every statement is SELECT, SET, BEGIN or ROLLBACK', () => {
    for (const s of statements) {
      const body = s.replace(/^(\\(set|pset)[^\n]*\n)+/, '').trim();
      assert.match(body, /^(SELECT|SET|BEGIN|ROLLBACK)\b/i, `unexpected statement: ${body.slice(0, 60)}`);
    }
    assert.doesNotMatch(code, /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|COPY|COMMIT|VACUUM|CALL|DO|LOCK|REINDEX|CLUSTER|nextval|setval|pg_terminate_backend|pg_cancel_backend|dblink|lo_import|lo_export)\b/i);
    assert.doesNotMatch(code, /\\(copy|o|w|!|i|include)\b/, 'no psql commands that write files or run shell');
  });

  it('runs inside a read-only transaction that is rolled back, and stops unless read-only', () => {
    assert.match(code, /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;/);
    assert.equal(statements.at(-1), 'ROLLBACK');
    assert.match(code, /SELECT 1 \/ \(current_setting\(''\) = ''\)::int AS read_only_confirmed/);
    assert.match(raw, /SELECT 1 \/ \(current_setting\('transaction_read_only'\) = 'on'\)::int/);
    assert.match(raw, /\\set ON_ERROR_STOP on/);
  });

  it('sets timeouts before the transaction starts', () => {
    const begin = raw.indexOf('BEGIN TRANSACTION');
    for (const setting of ["statement_timeout = '30s'", "lock_timeout = '2s'", "idle_in_transaction_session_timeout = '60s'"]) {
      const at = raw.indexOf(`SET ${setting}`);
      assert.ok(at >= 0 && at < begin, setting);
    }
  });

  it('masks personal data in the database', () => {
    assert.doesNotMatch(raw, /"displayName"/, 'no display names');
    for (const use of raw.match(/u\.email/g) ?? []) assert.ok(use);
    const emailUses = [...raw.matchAll(/[^\n]*u\.email[^\n]*/g)].map((m) => m[0]);
    for (const line of emailUses) assert.match(line, /left\(split_part\(u\.email, '@', 1\), 1\) \|\| '\*\*\*@'/, line);
    assert.doesNotMatch(raw, /\bu\.id AS\b|SELECT u\.id\b/, 'no raw user ids');
  });
});
