/**
 * Backup failure and staleness alerting - behaviour tests (MAOS-T19).
 * Run: node --test test/backup-alerting.test.mjs
 *
 * scripts/backup-alert.sh raises an alert (notification + logs/alerts.log).
 * scripts/nightly-backup.sh calls it on every failure; a skipped run (lock
 * held) and a successful run stay silent. scripts/backup-staleness-check.sh
 * alerts when the newest dump with a matching checksum is missing or older
 * than the limit. All scripts are RUN here with stub notifier, docker,
 * railway and backup commands: no Docker, no Railway login, no database.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const ALERT = join(repoRoot, 'scripts/backup-alert.sh');
const NIGHTLY = join(repoRoot, 'scripts/nightly-backup.sh');
const STALE = join(repoRoot, 'scripts/backup-staleness-check.sh');

const scratch = mkdtempSync(join(tmpdir(), 'maos-backup-alert-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const DB_URL = 'postgresql://maos:Al3rt%40Secret@db.example:5432/railway';

let caseNo = 0;
function makeCase() {
  caseNo += 1;
  const dir = join(scratch, `case-${caseNo}`);
  const home = join(dir, 'MAOS_BACKUPS');
  const bin = join(dir, 'bin');
  const stub = join(dir, 'stub');
  for (const d of [home, bin, stub, join(home, 'production')]) mkdirSync(d, { recursive: true });
  return {
    dir, home, bin, stub,
    out: join(home, 'production'),
    alerts: join(home, 'logs', 'alerts.log'),
    notified: join(stub, 'notify.args'),
    alertCalls: join(stub, 'alert.calls'),
  };
}

function writeExe(path, body) {
  writeFileSync(path, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
}

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

/** Notifier stub: records its arguments; fails when $STUB_DIR/notify.fail exists. */
function installNotifier(c) {
  const p = join(c.bin, 'osascript');
  writeExe(p, `printf '%s\\n' "$@" >> "$STUB_DIR/notify.args"; [ -e "$STUB_DIR/notify.fail" ] && exit 1; exit 0`);
  return p;
}

/** Alert stub for the callers: records each message on its own line. */
function installAlertStub(c) {
  const p = join(c.bin, 'alert');
  writeExe(p, `printf '%s\\n' "$*" >> "$STUB_DIR/alert.calls"`);
  return p;
}

function run(script, c, env = {}, args = []) {
  return spawnSync('/bin/bash', [script, ...args], {
    encoding: 'utf8',
    timeout: 20000,
    env: { PATH: '/usr/bin:/bin', HOME: c.dir, STUB_DIR: c.stub, MAOS_BACKUP_HOME: c.home, ...env },
  });
}

describe('backup-alert.sh', () => {
  it('logs the alert and shows a notification with the message', () => {
    const c = makeCase();
    const r = run(ALERT, c, { MAOS_NOTIFY_BIN: installNotifier(c) }, ['Nightly backup failed - FAIL: exit 3']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(read(c.alerts), /^\S+Z ALERT Nightly backup failed - FAIL: exit 3$/m);
    const args = read(c.notified);
    assert.match(args, /^-e$/m);
    assert.match(args, /display notification "Nightly backup failed - FAIL: exit 3" with title "MAOS backup"/);
  });

  it('redacts connection strings and keeps the alert on one line', () => {
    const c = makeCase();
    const r = run(ALERT, c, { MAOS_NOTIFY_BIN: installNotifier(c) }, [`boom ${DB_URL}\nsecond line`]);
    assert.equal(r.status, 0);
    const log = read(c.alerts);
    for (const out of [log, read(c.notified), r.stdout, r.stderr]) {
      assert.ok(!out.includes('Al3rt'), 'password leaked');
      assert.ok(!out.includes('db.example'), 'host leaked');
    }
    assert.match(log, /ALERT boom <REDACTED> second line$/m);
    assert.equal(log.trim().split('\n').length, 1);
  });

  it('escapes quotes so the message cannot break out of the notification text', () => {
    const c = makeCase();
    run(ALERT, c, { MAOS_NOTIFY_BIN: installNotifier(c) }, ['say "hi" \\ done']);
    assert.match(read(c.notified), /display notification "say \\"hi\\" \\\\ done" with title/);
  });

  it('never fails the caller: a broken notifier is logged and the exit is still 0', () => {
    const c = makeCase();
    writeFileSync(join(c.stub, 'notify.fail'), '');
    const r = run(ALERT, c, { MAOS_NOTIFY_BIN: installNotifier(c) }, ['x']);
    assert.equal(r.status, 0);
    assert.match(read(c.alerts), /ALERT x/);
    assert.match(read(c.alerts), /notification could not be shown/);
  });
});

describe('nightly-backup.sh raises an alert on failure', () => {
  function setup(c, mode) {
    writeExe(join(c.bin, 'docker'), `[ -e "$STUB_DIR/docker.down" ] && exit 1; exit 0`);
    writeExe(join(c.bin, 'railway'), `[ -e "$STUB_DIR/railway.nourl" ] && exit 1; echo "DATABASE_PUBLIC_URL=${DB_URL}"`);
    writeExe(
      join(c.bin, 'backup-db.sh'),
      `out="$1"; case "${mode}" in
  ok)   echo PGDMP > "$out/maos-20261010T013000Z.dump"; exit 0 ;;
  fail) echo "pg_dump failed for $DATABASE_URL" >&2; exit 1 ;;
  hang) sleep 30 & wait $!; exit 0 ;;
esac`,
    );
    return {
      DOCKER_BIN: join(c.bin, 'docker'),
      RAILWAY_BIN: join(c.bin, 'railway'),
      MAOS_BACKUP_SCRIPT: join(c.bin, 'backup-db.sh'),
      MAOS_BACKUP_PG_DUMP: 'path',
      MAOS_BACKUP_ALERT: installAlertStub(c),
    };
  }

  it('stays silent on success', () => {
    const c = makeCase();
    assert.equal(run(NIGHTLY, c, setup(c, 'ok')).status, 0);
    assert.equal(read(c.alertCalls), '');
  });

  it('alerts when the backup script fails, without the database URL', () => {
    const c = makeCase();
    assert.equal(run(NIGHTLY, c, setup(c, 'fail')).status, 1);
    const calls = read(c.alertCalls);
    assert.equal(calls, 'Nightly backup failed - FAIL: exit 1\n');
    assert.ok(!calls.includes('Al3rt'));
  });

  it('alerts when the database URL cannot be obtained (expired login)', () => {
    const c = makeCase();
    const env = setup(c, 'ok');
    writeFileSync(join(c.stub, 'railway.nourl'), '');
    assert.equal(run(NIGHTLY, c, env).status, 3);
    assert.match(read(c.alertCalls), /^Nightly backup failed - FAIL: could not obtain the database URL/);
  });

  it('alerts when Docker is down', () => {
    const c = makeCase();
    const env = setup(c, 'ok');
    writeFileSync(join(c.stub, 'docker.down'), '');
    assert.equal(run(NIGHTLY, c, env).status, 2);
    assert.match(read(c.alertCalls), /Docker is not running/);
  });

  it('alerts when the run times out', () => {
    const c = makeCase();
    assert.equal(run(NIGHTLY, c, { ...setup(c, 'hang'), MAOS_BACKUP_MAX_SECONDS: '1' }).status, 4);
    assert.match(read(c.alertCalls), /exceeded 1s and was stopped/);
  });

  it('does not alert when the run is skipped because another run holds the lock', () => {
    const c = makeCase();
    const env = setup(c, 'ok');
    mkdirSync(join(c.home, '.nightly-backup.lock'));
    writeFileSync(join(c.home, '.nightly-backup.lock', 'pid'), String(process.pid));
    assert.equal(run(NIGHTLY, c, env).status, 75);
    assert.equal(read(c.alertCalls), '');
  });
});

describe('backup-staleness-check.sh', () => {
  const HOUR = 3600;

  /** Writes a dump; checksum 'good' (matching), 'bad' (mismatch) or 'none'. Age in hours. */
  function dump(c, name, ageHours, checksum = 'good') {
    const f = join(c.out, name);
    writeFileSync(f, `PGDMP ${name}`);
    const hash = createHash('sha256').update(`PGDMP ${name}`).digest('hex');
    if (checksum === 'good') writeFileSync(`${f}.sha256`, `${hash}  /elsewhere/${name}\n`);
    if (checksum === 'bad') writeFileSync(`${f}.sha256`, `${'0'.repeat(64)}  ${name}\n`);
    const t = Date.now() / 1000 - ageHours * HOUR;
    utimesSync(f, t, t);
  }

  const check = (c, env = {}) => run(STALE, c, { MAOS_BACKUP_ALERT: installAlertStub(c), ...env });

  it('is silent when the newest verified dump is recent', () => {
    const c = makeCase();
    dump(c, 'maos-a.dump', 30);
    dump(c, 'maos-b.dump', 2);
    const r = check(c);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /OK: newest verified backup maos-b\.dump is 2h old/);
    assert.equal(read(c.alertCalls), '');
  });

  it('alerts when there is no dump at all', () => {
    const c = makeCase();
    assert.equal(check(c).status, 1);
    assert.match(read(c.alertCalls), /^No verified MAOS backup found/);
  });

  it('alerts when the newest verified dump is older than 26 hours', () => {
    const c = makeCase();
    dump(c, 'maos-old.dump', 27);
    assert.equal(check(c).status, 1);
    assert.match(read(c.alertCalls), /is 27h old \(limit 26h\): maos-old\.dump/);
  });

  it('ignores a recent dump whose checksum does not match or is missing', () => {
    const c = makeCase();
    dump(c, 'maos-old.dump', 40);
    dump(c, 'maos-corrupt.dump', 3, 'bad');
    dump(c, 'maos-unchecked.dump', 1, 'none');
    assert.equal(check(c).status, 1);
    assert.match(read(c.alertCalls), /40h old .*maos-old\.dump/);
  });

  it('alerts when only unverified dumps exist', () => {
    const c = makeCase();
    dump(c, 'maos-corrupt.dump', 1, 'bad');
    assert.equal(check(c).status, 1);
    assert.match(read(c.alertCalls), /No verified MAOS backup found/);
  });

  it('honours MAOS_BACKUP_MAX_AGE_HOURS and falls back to 26 for invalid values', () => {
    const c = makeCase();
    dump(c, 'maos-x.dump', 5);
    assert.equal(check(c, { MAOS_BACKUP_MAX_AGE_HOURS: '4' }).status, 1);
    assert.equal(check(c, { MAOS_BACKUP_MAX_AGE_HOURS: '4h; rm -rf /' }).status, 0);
  });
});
