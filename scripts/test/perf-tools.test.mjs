/**
 * A07 — the arithmetic and the guards of the load assessment (scripts/perf).
 * Run: node --test scripts/test/perf-tools.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertLocal, markdownTable, parseArgs, percentile, summarise, verdict } from '../perf/lib.mjs';

const perf = join(dirname(fileURLToPath(import.meta.url)), '..', 'perf');
const sample = (ms, status = 200, bytes = 1000) => ({ ms, status, bytes });

describe('A07 — percentiles', () => {
  it('uses the nearest-rank rule and does not depend on the order of the values', () => {
    const hundred = Array.from({ length: 100 }, (_, i) => 100 - i);
    assert.equal(percentile(hundred, 50), 50);
    assert.equal(percentile(hundred, 95), 95);
    assert.equal(percentile(hundred, 99), 99);
    assert.equal(percentile(hundred, 100), 100);
    assert.equal(percentile([5, 1, 9, 3, 7], 95), 9);
    assert.equal(percentile([42], 95), 42);
    assert.deepEqual(hundred[0], 100, 'the input is not sorted in place');
  });

  it('has no value for an empty run and refuses a percentile outside (0, 100]', () => {
    assert.equal(percentile([], 95), null);
    assert.throws(() => percentile([1], 0), RangeError);
    assert.throws(() => percentile([1], 101), RangeError);
  });
});

describe('A07 — one endpoint\'s result', () => {
  it('counts only expected answers as measured: a refusal or a throttled request cannot flatter the numbers', () => {
    const slow = Array.from({ length: 95 }, () => sample(600));
    const refusedFast = Array.from({ length: 5 }, () => sample(2, 429));
    const result = summarise([...slow, ...refusedFast], { seconds: 10 });
    assert.equal(result.requests, 100);
    assert.equal(result.ok, 95);
    assert.equal(result.errors, 5);
    assert.deepEqual(result.statuses, { 200: 95, 429: 5 });
    assert.equal(result.p50, 600);
    assert.equal(result.p95, 600, 'the fast refusals are not in the percentiles');
    assert.equal(result.perSecond, 9.5);
    assert.equal(verdict(result), 'ERRORS');
  });

  it('passes under the bound, fails at or over it, and says so when nothing was measured', () => {
    const fast = summarise(Array.from({ length: 100 }, (_, i) => sample(i + 1)), { seconds: 5 });
    assert.equal(fast.p95, 95);
    assert.equal(fast.max, 100);
    assert.equal(fast.bytes, 1000);
    assert.equal(verdict(fast), 'PASS');
    assert.equal(verdict(summarise(Array.from({ length: 100 }, () => sample(500)), { seconds: 5 })), 'FAIL', '500 ms is not under 500 ms');
    assert.equal(verdict(summarise(Array.from({ length: 100 }, () => sample(650)), { seconds: 5 })), 'FAIL');
    const nothing = summarise([sample(1, 0)], { seconds: 1 });
    assert.equal(nothing.p95, null);
    assert.equal(verdict(nothing), 'NO DATA');
    assert.equal(verdict(summarise([sample(10, 404)], { seconds: 1, expectStatus: 404 })), 'PASS', 'an expected status other than 200 can be measured');
  });

  it('writes one table row per endpoint with the verdict', () => {
    const row = { label: 'GET /tasks', as: 'owner', rows: 2000, ...summarise(Array.from({ length: 10 }, () => sample(700, 200, 2_500_000)), { seconds: 2 }) };
    const table = markdownTable([row]);
    assert.match(table, /\| `GET \/tasks` \| owner \| 2000 \| 2\.4 MB \| 10 \| 0 \| 700 \| 700 \| 700 \| 700 \| 5 \| FAIL \|/);
    assert.match(table.split('\n')[0], /p95 < 500 ms/);
  });
});

describe('A07 — the run stays on this machine', () => {
  it('accepts only this machine as the API and as the database host', () => {
    for (const ok of ['http://127.0.0.1:3911/api', 'http://localhost:3911/api', 'http://[::1]:3911/api']) assert.doesNotThrow(() => assertLocal(ok, 'the API'));
    for (const no of ['https://jihad-production.up.railway.app/api', 'http://10.0.0.5:3001/api', 'http://127.0.0.1.example.test/api', 'not a url', '']) {
      assert.throws(() => assertLocal(no, 'the API'), /the API/, no);
    }
  });

  it('every script checks that before it connects, and none names a production address or a credential store', () => {
    for (const file of ['load.mjs', 'seed-load.mjs', 'slow-queries.mjs']) {
      const source = readFileSync(join(perf, file), 'utf8');
      assert.match(source, /assertLocal\(/, `${file} checks its target`);
      assert.ok(source.indexOf('assertLocal(') < source.search(/new PrismaClient\(|await fetch\(|await login\(/), `${file} checks before connecting`);
    }
    for (const file of ['load.mjs', 'seed-load.mjs', 'slow-queries.mjs', 'run-local.sh', 'lib.mjs']) {
      const source = readFileSync(join(perf, file), 'utf8');
      assert.ok(!/railway\.app|find-generic-password|maos-backup-database-url/.test(source), `${file} names nothing of production`);
    }
    const runner = readFileSync(join(perf, 'run-local.sh'), 'utf8');
    assert.match(runner, /export DATABASE_URL="postgresql:\/\/[^"]*@127\.0\.0\.1:/, 'the database address is set to this machine in the runner itself');
    assert.match(runner, /trap cleanup EXIT/, 'the container is removed whatever happens');
  });

  it('the seed refuses a database that already holds a company', () => {
    const seed = readFileSync(join(perf, 'seed-load.mjs'), 'utf8');
    assert.match(seed, /await prisma\.tenant\.count\(\) > 0[^\n]*REFUSED/);
  });
});

describe('A07 — command line', () => {
  it('reads --key value pairs and flags', () => {
    assert.deepEqual(parseArgs(['--api', 'http://127.0.0.1:1/api', '--users', '20', '--quick', '--out', 'r.json']), { api: 'http://127.0.0.1:1/api', users: '20', quick: true, out: 'r.json' });
    assert.deepEqual(parseArgs(['stray', '--only']), { only: true });
  });
});
