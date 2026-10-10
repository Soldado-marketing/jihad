/**
 * Nightly backup runner and pg_dump Docker shim - behaviour tests (MAOS-T17).
 * Run: node --test test/nightly-backup-script.test.mjs
 *
 * scripts/nightly-backup.sh is the scheduled production backup entry point
 * (previously kept outside Git). scripts/pg-dump-docker.sh is the pg_dump
 * that runs inside the postgres image on a Mac without PostgreSQL client
 * tools. Both are RUN here with stub `railway`, `docker` and backup scripts,
 * so no Railway login, no Docker and no database are needed. The tests prove:
 *
 *   - a missing Docker daemon, a missing Railway CLI or an unobtainable
 *     database URL each fail with their own exit code and a clear log line;
 *   - the database URL never reaches the log, even if a tool prints it;
 *   - only one run can be active at a time, and a stale lock is taken over;
 *   - a run that exceeds its time limit is stopped, logged as a timeout and
 *     leaves no partial dump behind;
 *   - the shim keeps the URL and the password out of every argument list.
 *
 * Every test works in its own temporary directory, removed afterwards.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const NIGHTLY = join(repoRoot, 'scripts/nightly-backup.sh');
const SHIM = join(repoRoot, 'scripts/pg-dump-docker.sh');

const scratch = mkdtempSync(join(tmpdir(), 'maos-nightly-backup-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const DB_URL = 'postgresql://maos:N1ghtly%40Secret@db.example:5432/railway?sslmode=require';

let caseNo = 0;
function makeCase() {
  caseNo += 1;
  const dir = join(scratch, `case-${caseNo}`);
  const home = join(dir, 'MAOS_BACKUPS');
  const bin = join(dir, 'bin');
  const stub = join(dir, 'stub');
  for (const d of [home, bin, stub]) mkdirSync(d, { recursive: true });
  return { dir, home, bin, stub, out: join(home, 'production'), log: join(home, 'logs', 'backup.log') };
}

function writeExe(path, body) {
  writeFileSync(path, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
}

/** docker stub for the runner: `docker info` succeeds unless $STUB_DIR/docker.down exists. */
function installDocker(c) {
  writeExe(join(c.bin, 'docker'), `[ -e "$STUB_DIR/docker.down" ] && exit 1; exit 0`);
}

/** railway stub: prints the variables listing, or nothing when railway.nourl exists. */
function installRailway(c) {
  writeExe(
    join(c.bin, 'railway'),
    `printf '%s\\n' "$@" > "$STUB_DIR/railway.args"
[ -e "$STUB_DIR/railway.nourl" ] && exit 1
echo "PGHOST=db.example"
echo "DATABASE_PUBLIC_URL=${DB_URL}"
echo "DATABASE_URL=postgresql://internal.example/railway"`,
  );
}

/**
 * Stand-in for scripts/backup-db.sh, selected by $STUB_DIR/backup.mode:
 *   ok    writes a dump + checksum, echoes the URL it received (to prove redaction)
 *   fail  exits 1
 *   hang  writes a partial file, then sleeps until killed
 */
function installBackup(c) {
  const path = join(c.bin, 'backup-db.sh');
  writeExe(
    path,
    `out="$1"; mkdir -p "$out"
echo "received DATABASE_URL=$DATABASE_URL retention=$BACKUP_RETENTION"
echo "$$" > "$STUB_DIR/backup.pid"
mode="$(cat "$STUB_DIR/backup.mode" 2>/dev/null || echo ok)"
case "$mode" in
  ok)   echo PGDMP > "$out/maos-20261010T013000Z.dump"; echo "abc  x" > "$out/maos-20261010T013000Z.dump.sha256"; echo "OK: dump written"; exit 0 ;;
  fail) echo "ERROR: pg_dump failed" >&2; exit 1 ;;
  hang) echo partial > "$out/maos-20261010T013000Z.dump.partial-1"; sleep 30 & wait $!; exit 0 ;;
esac`,
  );
  return path;
}

function setup(c, { docker = true, railway = true } = {}) {
  if (docker) installDocker(c);
  if (railway) installRailway(c);
  return installBackup(c);
}

function runNightly(c, env = {}) {
  return spawnSync('/bin/bash', [NIGHTLY], {
    encoding: 'utf8',
    timeout: 20000,
    env: {
      PATH: '/usr/bin:/bin',
      HOME: c.dir,
      STUB_DIR: c.stub,
      MAOS_BACKUP_HOME: c.home,
      DOCKER_BIN: join(c.bin, 'docker'),
      RAILWAY_BIN: join(c.bin, 'railway'),
      MAOS_BACKUP_SCRIPT: join(c.bin, 'backup-db.sh'),
      MAOS_BACKUP_PG_DUMP: 'path',
      ...env,
    },
  });
}

const logOf = (c) => (existsSync(c.log) ? readFileSync(c.log, 'utf8') : '');
const mode = (c, m) => writeFileSync(join(c.stub, 'backup.mode'), m);

describe('nightly-backup.sh - success path', () => {
  it('runs the backup, logs SUCCESS and exits 0', () => {
    const c = makeCase();
    setup(c);
    const r = runNightly(c);
    assert.equal(r.status, 0, r.stderr + logOf(c));
    const log = logOf(c);
    assert.match(log, /=== run start ===/);
    assert.match(log, /SUCCESS: exit 0/);
    assert.match(log, /=== run end ===/);
    assert.ok(existsSync(join(c.out, 'maos-20261010T013000Z.dump')));
  });

  it('reads DATABASE_PUBLIC_URL from the Postgres service of the linked Railway project', () => {
    const c = makeCase();
    setup(c);
    assert.equal(runNightly(c).status, 0);
    const args = readFileSync(join(c.stub, 'railway.args'), 'utf8').trim().split('\n');
    assert.deepEqual(args, ['variables', '--service', 'Postgres', '--kv']);
  });

  it('never writes the database URL or its password to the log or stdout', () => {
    const c = makeCase();
    setup(c);
    const r = runNightly(c);
    assert.equal(r.status, 0);
    const all = logOf(c) + r.stdout + r.stderr;
    assert.ok(!all.includes('N1ghtly'), 'password leaked');
    assert.ok(!all.includes('db.example:5432'), 'URL leaked');
    assert.match(logOf(c), /<REDACTED>/);
  });

  it('passes BACKUP_RETENTION through, defaulting to 14', () => {
    const c1 = makeCase();
    setup(c1);
    runNightly(c1);
    assert.match(logOf(c1), /retention=14/);

    const c2 = makeCase();
    setup(c2);
    runNightly(c2, { BACKUP_RETENTION: '30' });
    assert.match(logOf(c2), /retention=30/);
  });
});

describe('nightly-backup.sh - precondition failures', () => {
  it('exits 2 when the Docker daemon is not running', () => {
    const c = makeCase();
    setup(c);
    writeFileSync(join(c.stub, 'docker.down'), '');
    const r = runNightly(c);
    assert.equal(r.status, 2);
    assert.match(logOf(c), /FAIL: Docker is not running/);
    assert.ok(!existsSync(join(c.stub, 'backup.pid')), 'backup must not start');
  });

  it('exits 2 when the Railway CLI is missing', () => {
    const c = makeCase();
    setup(c, { railway: false });
    const r = runNightly(c);
    assert.equal(r.status, 2);
    assert.match(logOf(c), /FAIL: railway CLI not found/);
  });

  it('exits 3 when the database URL cannot be obtained (for example an expired login)', () => {
    const c = makeCase();
    setup(c);
    writeFileSync(join(c.stub, 'railway.nourl'), '');
    const r = runNightly(c);
    assert.equal(r.status, 3);
    assert.match(logOf(c), /FAIL: could not obtain the database URL from Railway \(login expired\?\)/);
    assert.ok(!existsSync(join(c.stub, 'backup.pid')), 'backup must not start');
  });

  it('exits with the backup status and logs FAIL when the backup fails', () => {
    const c = makeCase();
    setup(c);
    mode(c, 'fail');
    const r = runNightly(c);
    assert.equal(r.status, 1);
    assert.match(logOf(c), /FAIL: exit 1/);
    assert.doesNotMatch(logOf(c), /SUCCESS/);
  });
});

describe('nightly-backup.sh - one run at a time', () => {
  it('exits 75 without running when another live run holds the lock', () => {
    const c = makeCase();
    setup(c);
    const lock = join(c.home, '.nightly-backup.lock');
    mkdirSync(lock, { recursive: true });
    writeFileSync(join(lock, 'pid'), String(process.pid)); // a live process
    const r = runNightly(c);
    assert.equal(r.status, 75);
    assert.match(logOf(c), /SKIP: another backup run is in progress/);
    assert.ok(!existsSync(join(c.stub, 'backup.pid')));
    assert.ok(existsSync(lock), 'a foreign live lock must not be removed');
  });

  it('takes over a stale lock whose process is gone, and releases its own lock', () => {
    const c = makeCase();
    setup(c);
    const lock = join(c.home, '.nightly-backup.lock');
    mkdirSync(lock, { recursive: true });
    writeFileSync(join(lock, 'pid'), '999999'); // no such process
    const r = runNightly(c);
    assert.equal(r.status, 0, logOf(c));
    assert.match(logOf(c), /stale lock/);
    assert.ok(!existsSync(lock), 'lock must be released after the run');
  });

  it('releases the lock after a failed run too', () => {
    const c = makeCase();
    setup(c);
    mode(c, 'fail');
    runNightly(c);
    assert.ok(!existsSync(join(c.home, '.nightly-backup.lock')));
  });
});

describe('nightly-backup.sh - duration guard', () => {
  it('stops a run that exceeds MAOS_BACKUP_MAX_SECONDS, exits 4 and removes partial dumps', () => {
    const c = makeCase();
    setup(c);
    mode(c, 'hang');
    mkdirSync(c.out, { recursive: true });
    writeFileSync(join(c.out, 'maos-20261001T013000Z.dump'), 'older complete dump');
    const started = Date.now();
    const r = runNightly(c, { MAOS_BACKUP_MAX_SECONDS: '2' });
    assert.equal(r.status, 4, logOf(c));
    assert.ok(Date.now() - started < 15000, 'guard must stop the run promptly');
    assert.match(logOf(c), /FAIL: backup exceeded 2s/);
    const files = readdirSync(c.out);
    assert.ok(!files.some((f) => f.includes('.partial-')), `partial left: ${files}`);
    assert.ok(files.includes('maos-20261001T013000Z.dump'), 'older complete dumps must be kept');
    const pid = Number(readFileSync(join(c.stub, 'backup.pid'), 'utf8'));
    assert.throws(() => process.kill(pid, 0), 'backup process must be stopped');
  });
});

describe('pg-dump-docker.sh - credentials stay out of argument lists', () => {
  function runShim(c, args, env = {}) {
    writeExe(join(c.bin, 'docker'), `printf '%s\\n' "$@" > "$STUB_DIR/docker.args"; env > "$STUB_DIR/docker.env"; exit 0`);
    return spawnSync('/bin/sh', [SHIM, ...args], {
      encoding: 'utf8',
      env: { PATH: '/usr/bin:/bin', STUB_DIR: c.stub, DOCKER_BIN: join(c.bin, 'docker'), PGPASSWORD: 'Sh1mSecret', PGUSER: 'maos', ...env },
    });
  }

  it('moves the URL into the container environment and passes PGPASSWORD by name only', () => {
    const c = makeCase();
    const file = join(c.dir, 'out', 'maos.dump.partial-1');
    mkdirSync(dirname(file), { recursive: true });
    const r = runShim(c, ['--format=custom', '--no-owner', `--dbname=${DB_URL}`, `--file=${file}`]);
    assert.equal(r.status, 0, r.stderr);
    const args = readFileSync(join(c.stub, 'docker.args'), 'utf8');
    assert.ok(!args.includes('N1ghtly'), 'password in docker args');
    assert.ok(!args.includes('db.example'), 'URL in docker args');
    assert.ok(!args.includes('Sh1mSecret'), 'PGPASSWORD value in docker args');
    assert.match(args, /^PGSHIM_URL$/m);
    assert.match(args, /^PGPASSWORD$/m);
    assert.match(readFileSync(join(c.stub, 'docker.env'), 'utf8'), /^PGSHIM_URL=postgresql:\/\/maos:N1ghtly/m);
    assert.match(args, /--rm/);
    assert.match(args, /postgres:18/);
    assert.match(args, /--file=\/out\/maos\.dump\.partial-1/);
  });

  it('honours PG_DUMP_IMAGE', () => {
    const c = makeCase();
    const file = join(c.dir, 'o.dump');
    runShim(c, [`--dbname=${DB_URL}`, `--file=${file}`], { PG_DUMP_IMAGE: 'postgres:18.1' });
    assert.match(readFileSync(join(c.stub, 'docker.args'), 'utf8'), /postgres:18\.1/);
  });

  it('refuses to run without --dbname or --file', () => {
    const c = makeCase();
    assert.equal(runShim(c, ['--file=/tmp/x.dump']).status, 2);
    assert.equal(runShim(c, [`--dbname=${DB_URL}`]).status, 2);
  });
});
