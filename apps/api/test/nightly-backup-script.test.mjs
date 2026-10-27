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
 *   - the shim keeps the URL and the password out of every argument list;
 *   - private tunnel mode (MAOS-R01): Keychain only, bounded readiness,
 *     rewritten URL, no secret in the log, no public fallback, and the tunnel
 *     (including an SSH child that outlives it) closed on every exit path.
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
      // Never the real Keychain: the stub exists only when a test installs it.
      SECURITY_BIN: join(c.bin, 'security'),
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

/**
 * Keychain stub (MAOS-T18): records its arguments; prints the value in
 * $STUB_DIR/keychain.value, or exits 44 ("item not found") when absent.
 */
function installKeychain(c, value) {
  if (value !== undefined) writeFileSync(join(c.stub, 'keychain.value'), value);
  writeExe(
    join(c.bin, 'security'),
    `printf '%s\\n' "$@" > "$STUB_DIR/security.args"
[ -e "$STUB_DIR/keychain.value" ] || exit 44
cat "$STUB_DIR/keychain.value"`,
  );
}

describe('nightly-backup.sh - Keychain credential (MAOS-T18)', () => {
  const KEYCHAIN_URL = 'postgresql://backup:K3ychain%40Secret@db.example:5432/railway';

  it('uses the Keychain item without calling Railway, and never logs the value', () => {
    const c = makeCase();
    setup(c);
    installKeychain(c, KEYCHAIN_URL);
    const r = runNightly(c);
    assert.equal(r.status, 0, logOf(c));
    assert.equal(existsSync(join(c.stub, 'railway.args')), false, 'Railway must not be called');
    const log = logOf(c);
    assert.match(log, /credential source: keychain/);
    assert.match(log, /received DATABASE_URL=<REDACTED>/);
    for (const out of [log, r.stdout, r.stderr]) assert.ok(!out.includes('K3ychain'), 'credential leaked');
  });

  it('asks security for the item by name only (the secret is never an argument)', () => {
    const c = makeCase();
    setup(c);
    installKeychain(c, KEYCHAIN_URL);
    runNightly(c);
    const args = readFileSync(join(c.stub, 'security.args'), 'utf8').trim().split('\n');
    assert.deepEqual(args, ['find-generic-password', '-s', 'maos-backup-database-url', '-a', 'maos', '-w']);
  });

  it('falls back to the Railway CLI when the item is missing (auto)', () => {
    const c = makeCase();
    setup(c);
    installKeychain(c);
    assert.equal(runNightly(c).status, 0, logOf(c));
    assert.match(logOf(c), /credential source: railway/);
  });

  it('fails with exit 3 and never calls Railway when the Keychain is required but missing', () => {
    const c = makeCase();
    setup(c);
    installKeychain(c);
    const r = runNightly(c, { MAOS_BACKUP_CREDENTIAL_SOURCE: 'keychain' });
    assert.equal(r.status, 3);
    assert.match(logOf(c), /FAIL: no Keychain item maos-backup-database-url/);
    assert.equal(existsSync(join(c.stub, 'railway.args')), false);
  });

  it('refuses a Keychain value that is not a PostgreSQL URL, without echoing it', () => {
    const c = makeCase();
    setup(c);
    installKeychain(c, 'not-a-url-S3cretValue');
    const r = runNightly(c);
    assert.equal(r.status, 3);
    assert.match(logOf(c), /is not a PostgreSQL URL/);
    assert.ok(!logOf(c).includes('S3cretValue'));
  });

  it('skips the Keychain when the source is railway, and rejects an unknown source', () => {
    const c = makeCase();
    setup(c);
    installKeychain(c, KEYCHAIN_URL);
    assert.equal(runNightly(c, { MAOS_BACKUP_CREDENTIAL_SOURCE: 'railway' }).status, 0);
    assert.equal(existsSync(join(c.stub, 'security.args')), false);
    const other = makeCase();
    setup(other);
    assert.equal(runNightly(other, { MAOS_BACKUP_CREDENTIAL_SOURCE: 'vault' }).status, 3);
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

/**
 * Private tunnel mode (MAOS-R01). The railway stub stands in for
 * `railway connect Postgres --ssh --tunnel-only -P <port>`; $STUB_DIR/tunnel.mode:
 *   stay    starts a real TCP listener child on the port (the "SSH child") and waits
 *   orphan  starts the listener child and exits at once (child outlives the parent)
 *   delayed exits at once; its child starts listening only 1.5 s later (slow SSH start)
 *   fail    exits 1 without listening
 *   hang    waits without ever listening
 * The listener is a real node process, so readiness, ownership and cleanup are
 * checked against real processes. Ports are free ephemeral ports.
 */
const NODE = process.execPath;

function freePort() {
  const r = spawnSync(NODE, ['-e', "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"], { encoding: 'utf8' });
  return Number(r.stdout.trim());
}

function installTunnelRailway(c) {
  writeExe(
    join(c.bin, 'railway'),
    `printf '%s\\n' "$@" >> "$STUB_DIR/railway.args"
echo "connection details: postgresql://user:Tunn3l%40Secret@127.0.0.1:x/railway"
[ "$1" = connect ] || exit 9
port=""; prev=""
for a in "$@"; do [ "$prev" = "-P" ] && port="$a"; prev="$a"; done
echo "$$" > "$STUB_DIR/tunnel.pid"
mode="$(cat "$STUB_DIR/tunnel.mode" 2>/dev/null || echo stay)"
listen() {
  "${NODE}" -e "require('net').createServer(s=>s.end()).listen(Number(process.argv[1]),'127.0.0.1')" "$port" &
  echo "$!" > "$STUB_DIR/listener.pid"
}
case "$mode" in
  stay)   listen; sleep 60 & wait $! ;;
  orphan) listen; exit 0 ;;
  delayed) ( sleep 1.5; exec "${NODE}" -e "require('net').createServer(s=>s.end()).listen(Number(process.argv[1]),'127.0.0.1')" "$port" ) &
          echo "$!" > "$STUB_DIR/listener.pid"; exit 0 ;;
  fail)   exit 1 ;;
  hang)   sleep 60 & wait $! ;;
esac`,
  );
}

/** backup-db.sh stand-in that records the URL it got (outside the log) and can drop the tunnel. */
function installPrivateBackup(c) {
  writeExe(
    join(c.bin, 'backup-db.sh'),
    `out="$1"; mkdir -p "$out"
printf '%s' "$DATABASE_URL" > "$STUB_DIR/url.received"
echo "received DATABASE_URL=$DATABASE_URL"
echo "$$" > "$STUB_DIR/backup.pid"
mode="$(cat "$STUB_DIR/backup.mode" 2>/dev/null || echo ok)"
case "$mode" in
  ok)   echo PGDMP > "$out/maos-20261026T013000Z.dump"; echo "abc  x" > "$out/maos-20261026T013000Z.dump.sha256"; exit 0 ;;
  drop) kill "$(cat "$STUB_DIR/listener.pid")"; sleep 1; echo "pg_dump: error: connection to server failed" >&2; exit 1 ;;
  hang) echo partial > "$out/maos-20261026T013000Z.dump.partial-1"; sleep 30 & wait $!; exit 0 ;;
  snap) cp "$MAOS_BACKUP_HOME/.nightly-backup.lock/tunnel.pids" "$STUB_DIR/tunnel.pids.snap"; echo PGDMP > "$out/maos-20261026T013000Z.dump"; exit 0 ;;
esac`,
  );
}

const PRIVATE_KEYCHAIN_URL =
  'postgresql://backup:Tunn3l%40Secret@old-public.proxy.example:16699/railway?sslmode=verify-full&connect_timeout=10&host=evil.example';

function privateCase({ tunnel = 'stay', backup = 'ok', keychain = PRIVATE_KEYCHAIN_URL } = {}) {
  const c = makeCase();
  installDocker(c);
  installTunnelRailway(c);
  installPrivateBackup(c);
  installKeychain(c, keychain);
  writeFileSync(join(c.stub, 'tunnel.mode'), tunnel);
  writeFileSync(join(c.stub, 'backup.mode'), backup);
  c.port = freePort();
  return c;
}

// macOS has lsof in /usr/sbin (the script's default), Linux CI in /usr/bin.
const LSOF = spawnSync('/bin/sh', ['-c', 'command -v lsof || ls /usr/sbin/lsof /usr/bin/lsof 2>/dev/null | head -1'], {
  encoding: 'utf8',
  env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin' },
}).stdout.trim();

const privateEnv = (c, extra = {}) => ({
  MAOS_BACKUP_CONNECTION: 'private',
  LSOF_BIN: LSOF,
  MAOS_BACKUP_TUNNEL_PORT: String(c.port),
  MAOS_BACKUP_TUNNEL_READY_SECONDS: '5',
  MAOS_RAILWAY_DIR: c.dir,
  ...extra,
});

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const pidFrom = (c, name) => (existsSync(join(c.stub, name)) ? Number(readFileSync(join(c.stub, name), 'utf8')) : 0);
const portOpen = (port) =>
  spawnSync('/bin/bash', ['-c', `(exec 3<>/dev/tcp/127.0.0.1/${port}) 2>/dev/null`]).status === 0;

function assertTunnelClosed(c) {
  for (const name of ['tunnel.pid', 'listener.pid']) {
    const pid = pidFrom(c, name);
    if (pid) assert.equal(alive(pid), false, `${name} ${pid} still running`);
  }
  assert.equal(portOpen(c.port), false, 'tunnel port still listening');
}

function assertNoSecret(c, r) {
  for (const out of [logOf(c), r.stdout, r.stderr]) {
    assert.ok(!out.includes('Tunn3l'), 'password leaked');
    assert.ok(!out.includes('old-public.proxy.example'), 'stored host leaked');
    assert.ok(!/postgres(ql)?:\/\/[^<\s]/.test(out.replace(/<REDACTED>/g, '')), 'connection string leaked');
  }
}

describe('nightly-backup.sh - private Railway tunnel (MAOS-R01)', () => {
  it('opens the tunnel, backs up through it with the rewritten URL, closes it and exits 0', () => {
    const c = privateCase();
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 0, logOf(c));
    const log = logOf(c);
    assert.match(log, /credential source: keychain/);
    assert.match(log, /private tunnel ready after/);
    assert.match(log, /private tunnel closed/);
    assert.match(log, /SUCCESS: exit 0/);
    const args = readFileSync(join(c.stub, 'railway.args'), 'utf8').trim().split('\n');
    assert.deepEqual(args, ['connect', 'Postgres', '--ssh', '--tunnel-only', '-P', String(c.port)]);
    assertTunnelClosed(c);
    assert.ok(log.indexOf('private tunnel closed') < log.indexOf('SUCCESS: exit 0'), 'closed before the result is logged');
  });

  it('keeps user, password, database and options; replaces host and port; forces sslmode=require', () => {
    const c = privateCase();
    assert.equal(runNightly(c, privateEnv(c)).status, 0, logOf(c));
    const url = readFileSync(join(c.stub, 'url.received'), 'utf8');
    assert.equal(url, `postgresql://backup:Tunn3l%40Secret@127.0.0.1:${c.port}/railway?connect_timeout=10&sslmode=require`);
  });

  it('uses host.docker.internal when pg_dump runs in Docker', () => {
    const c = privateCase();
    assert.equal(runNightly(c, privateEnv(c, { MAOS_BACKUP_PG_DUMP: 'docker' })).status, 0, logOf(c));
    assert.match(readFileSync(join(c.stub, 'url.received'), 'utf8'), new RegExp(`@host\\.docker\\.internal:${c.port}/railway\\?`));
  });

  it('never writes the password, the stored host or any connection string to the log or output', () => {
    const c = privateCase();
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 0, logOf(c));
    assertNoSecret(c, r);
    assert.match(logOf(c), /received DATABASE_URL=<REDACTED>/);
  });

  it('closes the SSH child that outlives `railway connect`', () => {
    const c = privateCase({ tunnel: 'orphan' });
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 0, logOf(c));
    assert.ok(pidFrom(c, 'listener.pid') > 0);
    assertTunnelClosed(c);
  });

  it('waits for an SSH child that starts listening after `railway connect` has exited', () => {
    const c = privateCase({ tunnel: 'delayed' });
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 0, logOf(c));
    assert.doesNotMatch(logOf(c), /exited before it was ready/);
    assert.match(logOf(c), /private tunnel ready after [1-9]\d*s/);
    assert.match(logOf(c), /SUCCESS: exit 0/);
    assertTunnelClosed(c);
  });

  it('fails with exit 5 and an alert-worthy log line when the tunnel cannot start', () => {
    const c = privateCase({ tunnel: 'fail' });
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 5, logOf(c));
    assert.match(logOf(c), /FAIL: private tunnel exited before it was ready/);
    assert.ok(!existsSync(join(c.stub, 'backup.pid')), 'backup must not start');
    assertTunnelClosed(c);
    assertNoSecret(c, r);
  });

  it('stops waiting after the readiness limit, exits 5 and stops the tunnel', () => {
    const c = privateCase({ tunnel: 'hang' });
    const started = Date.now();
    const r = runNightly(c, privateEnv(c, { MAOS_BACKUP_TUNNEL_READY_SECONDS: '2' }));
    assert.equal(r.status, 5, logOf(c));
    assert.ok(Date.now() - started < 15000, 'readiness must be bounded');
    assert.match(logOf(c), /FAIL: private tunnel not ready within 2s/);
    assert.ok(!existsSync(join(c.stub, 'backup.pid')), 'backup must not start');
    assertTunnelClosed(c);
  });

  it('reports a tunnel that drops during the backup, fails with the backup status and cleans up', () => {
    const c = privateCase({ backup: 'drop' });
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 1, logOf(c));
    const log = logOf(c);
    assert.match(log, /private tunnel was no longer listening when the backup ended/);
    assert.match(log, /FAIL: exit 1/);
    assertTunnelClosed(c);
    assertNoSecret(c, r);
  });

  it('closes the tunnel when the duration guard stops the backup', () => {
    const c = privateCase({ backup: 'hang' });
    const r = runNightly(c, privateEnv(c, { MAOS_BACKUP_MAX_SECONDS: '2' }));
    assert.equal(r.status, 4, logOf(c));
    assert.match(logOf(c), /private tunnel closed/);
    assertTunnelClosed(c);
  });

  it('closes the tunnel and stops the backup on SIGTERM', async () => {
    const c = privateCase({ backup: 'hang' });
    const { spawn } = await import('node:child_process');
    const child = spawn('/bin/bash', [NIGHTLY], {
      env: {
        PATH: '/usr/bin:/bin',
        HOME: c.dir,
        STUB_DIR: c.stub,
        MAOS_BACKUP_HOME: c.home,
        DOCKER_BIN: join(c.bin, 'docker'),
        RAILWAY_BIN: join(c.bin, 'railway'),
        MAOS_BACKUP_SCRIPT: join(c.bin, 'backup-db.sh'),
        MAOS_BACKUP_PG_DUMP: 'path',
        SECURITY_BIN: join(c.bin, 'security'),
        ...privateEnv(c),
      },
    });
    const deadline = Date.now() + 15000;
    while (!existsSync(join(c.stub, 'backup.pid')) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    assert.ok(existsSync(join(c.stub, 'backup.pid')), 'backup did not start');
    child.kill('SIGTERM');
    const code = await new Promise((r) => child.on('exit', (code) => r(code)));
    assert.equal(code, 143, logOf(c));
    assert.match(logOf(c), /FAIL: stopped by SIGTERM/);
    assert.match(logOf(c), /private tunnel closed/);
    assertTunnelClosed(c);
    assert.equal(alive(pidFrom(c, 'backup.pid')), false, 'backup still running');
    assert.ok(!readdirSync(c.out).some((f) => f.includes('.partial-')), 'partial dump left');
  });

  it('never falls back to Railway variables or the public URL when the Keychain item is missing', () => {
    const c = privateCase({ keychain: undefined });
    rmSync(join(c.stub, 'keychain.value'), { force: true });
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 3, logOf(c));
    assert.match(logOf(c), /FAIL: no Keychain item maos-backup-database-url/);
    assert.equal(existsSync(join(c.stub, 'railway.args')), false, 'Railway must not be called at all');
  });

  it('refuses MAOS_BACKUP_CREDENTIAL_SOURCE=railway in private mode', () => {
    const c = privateCase();
    const r = runNightly(c, privateEnv(c, { MAOS_BACKUP_CREDENTIAL_SOURCE: 'railway' }));
    assert.equal(r.status, 3);
    assert.match(logOf(c), /private mode reads the credential from the Keychain only/);
    assert.equal(existsSync(join(c.stub, 'railway.args')), false);
  });

  it('refuses a Keychain URL without user or database, without echoing it', () => {
    const c = privateCase({ keychain: 'postgresql://old-public.proxy.example:16699' });
    const r = runNightly(c, privateEnv(c));
    assert.equal(r.status, 3);
    assert.match(logOf(c), /is not a usable PostgreSQL URL/);
    assertNoSecret(c, r);
  });

  it('refuses to use, and never stops, a listener it did not start', () => {
    const c = privateCase();
    const foreign = spawnSync('/bin/bash', ['-c', `"${NODE}" -e "require('net').createServer(s=>s.end()).listen(${c.port},'127.0.0.1')" >/dev/null 2>&1 & echo $!`], { encoding: 'utf8' });
    const foreignPid = Number(foreign.stdout.trim());
    try {
      const deadline = Date.now() + 5000;
      while (!portOpen(c.port) && Date.now() < deadline) spawnSync('sleep', ['0.1']);
      const r = runNightly(c, privateEnv(c));
      assert.equal(r.status, 5, logOf(c));
      assert.match(logOf(c), /port \d+ is already in use; refusing to use a listener this run did not start/);
      assert.equal(existsSync(join(c.stub, 'railway.args')), false, 'tunnel must not start');
      assert.equal(alive(foreignPid), true, 'foreign listener must not be killed');
    } finally {
      process.kill(foreignPid, 'SIGKILL');
    }
  });

  describe('stale-run recovery fails closed (PID reuse)', () => {
    /** A real listener on c.port that this run did not start; returns its pid. */
    function startListener(c) {
      const r = spawnSync('/bin/bash', ['-c', `"${NODE}" -e "require('net').createServer(s=>s.end()).listen(${c.port},'127.0.0.1')" >/dev/null 2>&1 & echo $!`], { encoding: 'utf8' });
      const pid = Number(r.stdout.trim());
      const deadline = Date.now() + 5000;
      while (!portOpen(c.port) && Date.now() < deadline) spawnSync('sleep', ['0.1']);
      return pid;
    }
    const identity = (pid) => {
      const start = spawnSync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8' }).stdout.replace(/\s+/g, ' ').trim();
      const comm = spawnSync('ps', ['-o', 'comm=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
      return `${start}|${comm}`;
    };
    function staleLock(c, record) {
      const lock = join(c.home, '.nightly-backup.lock');
      mkdirSync(lock, { recursive: true });
      writeFileSync(join(lock, 'pid'), '999999'); // the dead run
      writeFileSync(join(lock, 'tunnel.pids'), record);
    }

    it('does not stop an unrelated listener whose PID matches the record but whose identity differs', () => {
      const c = privateCase();
      const pid = startListener(c);
      try {
        // Same PID, different start time: what a reused PID looks like.
        staleLock(c, `${pid}|Thu Jan  1 00:00:00 1970|/usr/sbin/sshd\n`);
        const r = runNightly(c, privateEnv(c));
        assert.equal(alive(pid), true, 'unrelated listener was killed');
        assert.equal(r.status, 5, logOf(c));
        assert.match(logOf(c), new RegExp(`not stopping pid ${pid}: its identity does not match the stale tunnel record`));
        assert.match(logOf(c), /port \d+ is already in use; refusing to use a listener this run did not start/);
        assert.equal(existsSync(join(c.stub, 'railway.args')), false, 'no tunnel may start');
      } finally {
        process.kill(pid, 'SIGKILL');
      }
    });

    it('does not stop a listener when the record carries no identity (PID only)', () => {
      const c = privateCase();
      const pid = startListener(c);
      try {
        staleLock(c, `${pid}\n`);
        const r = runNightly(c, privateEnv(c));
        assert.equal(alive(pid), true, 'listener was killed on a PID-only record');
        assert.equal(r.status, 5, logOf(c));
        assert.match(logOf(c), new RegExp(`not stopping pid ${pid}: the stale tunnel record has no process identity`));
      } finally {
        process.kill(pid, 'SIGKILL');
      }
    });

    it('does not stop the recorded PID when it is alive but not listening on the tunnel port', () => {
      const c = privateCase();
      const other = spawnSync('/bin/bash', ['-c', 'sleep 30 >/dev/null 2>&1 & echo $!'], { encoding: 'utf8' });
      const pid = Number(other.stdout.trim());
      try {
        staleLock(c, `${pid}|${identity(pid)}\n`);
        const r = runNightly(c, privateEnv(c));
        assert.equal(alive(pid), true, 'a non-listening process was killed');
        assert.equal(r.status, 0, logOf(c));
        assertTunnelClosed(c);
      } finally {
        process.kill(pid, 'SIGKILL');
      }
    });

    it('still stops a genuine leftover tunnel listener whose recorded identity matches, then runs', () => {
      const c = privateCase();
      const pid = startListener(c);
      try {
        staleLock(c, `${pid}|${identity(pid)}\n`);
        const r = runNightly(c, privateEnv(c));
        assert.equal(r.status, 0, logOf(c));
        assert.match(logOf(c), new RegExp(`stopped tunnel listener ${pid} left by the stale run`));
        assert.equal(alive(pid), false, 'leftover listener still running');
        assertTunnelClosed(c);
      } finally {
        if (alive(pid)) process.kill(pid, 'SIGKILL');
      }
    });

    it('records PID with start time and executable for every owned listener', () => {
      const c = privateCase({ backup: 'snap' });
      const r = runNightly(c, privateEnv(c));
      assert.equal(r.status, 0, logOf(c));
      const rec = readFileSync(join(c.stub, 'tunnel.pids.snap'), 'utf8').trim();
      const listener = pidFrom(c, 'listener.pid');
      assert.match(rec, new RegExp(`^${listener}\\|\\w{3} \\w{3} +\\d+ \\d\\d:\\d\\d:\\d\\d \\d{4}\\|\\S*node$`), rec);
    });
  });

  it('rejects an unknown connection mode and an invalid port', () => {
    const c1 = privateCase();
    assert.equal(runNightly(c1, privateEnv(c1, { MAOS_BACKUP_CONNECTION: 'tcp-proxy' })).status, 3);
    const c2 = privateCase();
    assert.equal(runNightly(c2, privateEnv(c2, { MAOS_BACKUP_TUNNEL_PORT: '80' })).status, 5);
    assert.equal(existsSync(join(c2.stub, 'railway.args')), false);
  });

  it('stays off by default: without MAOS_BACKUP_CONNECTION the direct path is unchanged', () => {
    const c = privateCase();
    const r = runNightly(c, { MAOS_RAILWAY_DIR: c.dir });
    assert.equal(r.status, 0, logOf(c));
    assert.doesNotMatch(logOf(c), /private tunnel/);
    assert.equal(existsSync(join(c.stub, 'railway.args')), false, 'no tunnel in direct mode');
    assert.equal(readFileSync(join(c.stub, 'url.received'), 'utf8'), PRIVATE_KEYCHAIN_URL);
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
