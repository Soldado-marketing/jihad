/**
 * Restore rehearsal script - behaviour tests (MAOS-T16).
 * Run: node --test test/restore-rehearsal-script.test.mjs
 *
 * These tests RUN scripts/restore-rehearsal.sh with a stub `docker` placed
 * first on PATH, so no Docker daemon, no PostgreSQL and no network are needed.
 * The stub records every docker invocation and answers from a per-case plan,
 * which lets the tests prove that the rehearsal:
 *
 *   - refuses before starting anything when the dump or its checksum is
 *     missing or wrong;
 *   - runs PostgreSQL in a container with no network and no published port,
 *     so it can never reach a real database server;
 *   - mounts the dump and the scripts read-only;
 *   - restores through scripts/restore-db.sh into a new database, with a
 *     container-local connection URL that carries no password;
 *   - fails on an empty restore, on missing or failed Prisma migrations and on
 *     a server that never becomes ready;
 *   - always removes its container, on success and on every failure.
 *
 * Every test works in its own temporary directory, removed afterwards.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const REHEARSAL = join(repoRoot, 'scripts/restore-rehearsal.sh');

const scratch = mkdtempSync(join(tmpdir(), 'maos-restore-rehearsal-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

let caseNo = 0;
function makeCase() {
  caseNo += 1;
  const dir = join(scratch, `case-${caseNo}`);
  const bin = join(dir, 'bin');
  const stub = join(dir, 'stub');
  mkdirSync(bin, { recursive: true });
  mkdirSync(stub, { recursive: true });
  installDocker(bin);
  return { dir, bin, stub };
}

/**
 * docker stub. Records each call as args.docker.<n> (one argument per line)
 * and answers from plan files in $STUB_DIR:
 *   plan.info     ok | down
 *   plan.ready    number of not-ready answers before ready, or "never"
 *   plan.restore  ok | fail
 *   plan.tables   number of public base tables
 *   plan.applied  number of applied Prisma migrations
 *   plan.failed   number of failed / unfinished Prisma migrations
 */
function installDocker(bin) {
  const body = `#!/bin/bash
d="$STUB_DIR"
n=$(( $(cat "$d/count.docker" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$d/count.docker"
printf '%s\\n' "$@" > "$d/args.docker.$n"
plan() { cat "$d/plan.$1" 2>/dev/null || echo "$2"; }
all="$*"
case "$1" in
  info) [ "$(plan info ok)" = ok ] && exit 0 || { echo "Cannot connect to the Docker daemon" >&2; exit 1; } ;;
  run)  echo "0123456789abcdef"; exit 0 ;;
  rm)   echo "removed" > "$d/removed"; exit 0 ;;
  exec)
    case "$all" in
      *pg_isready*)
        r="$(plan ready 0)"
        [ "$r" = never ] && exit 2
        k=$(( $(cat "$d/ready.calls" 2>/dev/null || echo 0) + 1 )); echo "$k" > "$d/ready.calls"
        [ "$k" -gt "$r" ] && exit 0 || exit 2 ;;
      *restore-db.sh*)
        [ "$(plan restore ok)" = ok ] && { echo "OK: restored"; exit 0; } || { echo "pg_restore: error: could not execute query" >&2; exit 1; } ;;
      *query_to_xml*)
        t="$(plan tables 3)"; i=1
        while [ "$i" -le "$t" ]; do echo "table_$i|$(( i * 10 ))"; i=$(( i + 1 )); done; exit 0 ;;
      *information_schema.tables*) plan tables 3; exit 0 ;;
      *"finished_at IS NOT NULL"*) plan applied 8; exit 0 ;;
      *"finished_at IS NULL"*) plan failed 0; exit 0 ;;
    esac
    echo "unexpected exec: $all" >&2; exit 97 ;;
esac
echo "unexpected docker call: $all" >&2
exit 98
`;
  writeFileSync(join(bin, 'docker'), body, { mode: 0o755 });
}

function setPlan(c, plan) {
  for (const [key, value] of Object.entries(plan)) {
    writeFileSync(join(c.stub, `plan.${key}`), String(value));
  }
}

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function makeDump(c, { checksum = 'good' } = {}) {
  const dump = join(c.dir, 'maos-20261009T014944Z.dump');
  writeFileSync(dump, 'PGDMP rehearsal test payload');
  if (checksum === 'good') writeFileSync(`${dump}.sha256`, `${sha256(dump)}  /some/host/path/${'maos.dump'}\n`);
  if (checksum === 'bad') writeFileSync(`${dump}.sha256`, `${'f'.repeat(64)}  ${dump}\n`);
  return dump;
}

function run(c, dump, env = {}) {
  return spawnSync('/bin/bash', [REHEARSAL, ...(dump === undefined ? [] : [dump])], {
    encoding: 'utf8',
    env: {
      PATH: `${c.bin}:/usr/bin:/bin`,
      HOME: c.dir,
      STUB_DIR: c.stub,
      REHEARSAL_READY_ATTEMPTS: '3',
      REHEARSAL_POLL_INTERVAL: '0',
      ...env,
    },
  });
}

const dockerCalls = (c) => {
  const f = join(c.stub, 'count.docker');
  const total = existsSync(f) ? Number(readFileSync(f, 'utf8').trim()) : 0;
  return Array.from({ length: total }, (_, i) => readFileSync(join(c.stub, `args.docker.${i + 1}`), 'utf8').trim().split('\n'));
};
const callsOf = (c, sub) => dockerCalls(c).filter((a) => a[0] === sub);
const removed = (c) => existsSync(join(c.stub, 'removed'));

describe('restore-rehearsal.sh - refuses before starting anything', () => {
  it('requires a dump argument', () => {
    const c = makeCase();
    const r = run(c, undefined);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Usage/);
    assert.equal(dockerCalls(c).length, 0);
  });

  it('refuses a dump that does not exist', () => {
    const c = makeCase();
    const r = run(c, join(c.dir, 'missing.dump'));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /not found/);
    assert.equal(dockerCalls(c).length, 0);
  });

  it('refuses a dump without a .sha256 file (a rehearsal must prove integrity)', () => {
    const c = makeCase();
    const r = run(c, makeDump(c, { checksum: 'none' }));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /sha256/);
    assert.equal(dockerCalls(c).length, 0);
  });

  it('refuses a dump whose checksum does not match, before docker is touched', () => {
    const c = makeCase();
    const r = run(c, makeDump(c, { checksum: 'bad' }));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /checksum mismatch/);
    assert.equal(dockerCalls(c).length, 0);
  });

  it('fails clearly when the Docker daemon is not running', () => {
    const c = makeCase();
    setPlan(c, { info: 'down' });
    const r = run(c, makeDump(c));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Docker/);
    assert.equal(callsOf(c, 'run').length, 0);
  });
});

describe('restore-rehearsal.sh - isolated, read-only container', () => {
  it('runs PostgreSQL with no network and no published port', () => {
    const c = makeCase();
    const r = run(c, makeDump(c));
    assert.equal(r.status, 0, r.stderr);
    const [runArgs] = callsOf(c, 'run');
    const joined = runArgs.join(' ');
    assert.match(joined, /--network none/);
    assert.doesNotMatch(joined, /(^| )(-p|--publish|--publish-all|-P)( |$)/);
    assert.ok(runArgs.includes('--detach') || runArgs.includes('-d'));
  });

  it('uses postgres:18 by default and honours REHEARSAL_PG_IMAGE', () => {
    const c1 = makeCase();
    assert.equal(run(c1, makeDump(c1)).status, 0);
    assert.ok(callsOf(c1, 'run')[0].includes('postgres:18'));

    const c2 = makeCase();
    assert.equal(run(c2, makeDump(c2), { REHEARSAL_PG_IMAGE: 'postgres:18.1' }).status, 0);
    assert.ok(callsOf(c2, 'run')[0].includes('postgres:18.1'));
  });

  it('mounts the dump, its checksum and the scripts read-only', () => {
    const c = makeCase();
    assert.equal(run(c, makeDump(c)).status, 0);
    const mounts = callsOf(c, 'run')[0].filter((a, i, all) => all[i - 1] === '-v' || all[i - 1] === '--volume');
    assert.ok(mounts.length >= 2, 'expected volume mounts');
    for (const m of mounts) assert.match(m, /:ro$/, `mount must be read-only: ${m}`);
    assert.ok(mounts.some((m) => m.includes('maos-20261009T014944Z.dump')));
  });

  it('gives each run a unique maos-rehearsal-* container name and removes that container', () => {
    const c = makeCase();
    assert.equal(run(c, makeDump(c)).status, 0);
    const runArgs = callsOf(c, 'run')[0];
    const name = runArgs[runArgs.indexOf('--name') + 1];
    assert.match(name, /^maos-rehearsal-/);
    const rm = callsOf(c, 'rm');
    assert.equal(rm.length, 1);
    assert.ok(rm[0].includes(name));
    assert.ok(rm[0].includes('-f') || rm[0].includes('--force'));
  });
});

describe('restore-rehearsal.sh - restore and verification', () => {
  it('restores through restore-db.sh into a new database with a container-local, password-free URL', () => {
    const c = makeCase();
    const r = run(c, makeDump(c));
    assert.equal(r.status, 0, r.stderr);
    const restore = callsOf(c, 'exec').find((a) => a.some((x) => x.includes('restore-db.sh')));
    assert.ok(restore, 'restore-db.sh must be executed in the container');
    assert.ok(restore.includes('maos_rehearsal'));
    const url = restore.find((a) => a.startsWith('ADMIN_DATABASE_URL='));
    assert.ok(url, 'ADMIN_DATABASE_URL must be passed to the container');
    assert.match(url, /^ADMIN_DATABASE_URL=postgresql:\/\/postgres@127\.0\.0\.1:5432\/postgres$/);
  });

  it('reports table and row counts and ends with REHEARSAL OK', () => {
    const c = makeCase();
    setPlan(c, { tables: 2, applied: 8 });
    const r = run(c, makeDump(c));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Tables restored: 2/);
    assert.match(r.stdout, /Prisma migrations applied: 8/);
    assert.match(r.stdout, /table_1\s+10/);
    assert.match(r.stdout, /table_2\s+20/);
    assert.match(r.stdout, /REHEARSAL OK/);
  });

  it('writes the same report to REHEARSAL_REPORT when set', () => {
    const c = makeCase();
    const report = join(c.dir, 'report.txt');
    const r = run(c, makeDump(c), { REHEARSAL_REPORT: report });
    assert.equal(r.status, 0, r.stderr);
    const text = readFileSync(report, 'utf8');
    assert.match(text, /REHEARSAL OK/);
    assert.match(text, /maos-20261009T014944Z\.dump/);
  });

  it('waits for the server and succeeds once it is ready', () => {
    const c = makeCase();
    setPlan(c, { ready: 2 });
    const r = run(c, makeDump(c));
    assert.equal(r.status, 0, r.stderr);
  });
});

describe('restore-rehearsal.sh - every failure exits non-zero and cleans up', () => {
  const failing = [
    ['a server that never becomes ready', { ready: 'never' }, /not ready/],
    ['a failed restore', { restore: 'fail' }, /restore failed/],
    ['a restore with no tables', { tables: 0 }, /no tables/],
    ['a restore with no applied Prisma migrations', { applied: 0 }, /no applied Prisma migrations/],
    ['a restore with failed or unfinished migrations', { failed: 1 }, /failed or unfinished/],
  ];

  for (const [label, plan, message] of failing) {
    it(`fails on ${label} and still removes the container`, () => {
      const c = makeCase();
      setPlan(c, plan);
      const r = run(c, makeDump(c));
      assert.notEqual(r.status, 0, `expected failure for ${label}`);
      assert.match(r.stderr, message);
      assert.doesNotMatch(r.stdout, /REHEARSAL OK/);
      assert.ok(removed(c), 'container must be removed');
    });
  }

  it('leaves no files behind next to the dump', () => {
    const c = makeCase();
    const dump = makeDump(c);
    assert.equal(run(c, dump).status, 0);
    const files = readdirSync(c.dir).filter((f) => f.startsWith('maos-'));
    assert.deepEqual(files.sort(), ['maos-20261009T014944Z.dump', 'maos-20261009T014944Z.dump.sha256']);
  });
});
