/**
 * Backup schedules (MAOS-T21): the weekly rehearsal runner and the LaunchAgent
 * installer. Run: node --test test/backup-schedule.test.mjs
 *
 * scheduled-rehearsal.sh is RUN with a stub rehearsal and alert; the installer
 * is RUN in --dry-run mode into a temporary directory (no launchctl).
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const RUNNER = join(repoRoot, 'scripts/scheduled-rehearsal.sh');
const INSTALLER = join(repoRoot, 'scripts/install-backup-schedule.sh');
const scratch = mkdtempSync(join(tmpdir(), 'maos-backup-schedule-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

let n = 0;
function makeCase() {
  n += 1;
  const dir = join(scratch, `case-${n}`);
  const home = join(dir, 'MAOS_BACKUPS');
  const bin = join(dir, 'bin');
  for (const d of [join(home, 'production'), bin]) mkdirSync(d, { recursive: true });
  const exe = (name, body) => {
    writeFileSync(join(bin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
    return join(bin, name);
  };
  return { dir, home, bin, exe, log: join(home, 'logs', 'rehearsal.log'), alerts: join(dir, 'alerts') };
}
function dump(c, name, ageHours, good = true) {
  const f = join(c.home, 'production', name);
  writeFileSync(f, `PGDMP ${name}`);
  const hash = createHash('sha256').update(`PGDMP ${name}`).digest('hex');
  writeFileSync(`${f}.sha256`, `${good ? hash : '0'.repeat(64)}  ${name}\n`);
  const t = Date.now() / 1000 - ageHours * 3600;
  utimesSync(f, t, t);
}
function run(c, mode) {
  const rehearsal = c.exe('rehearsal', `echo "$1" > "${c.dir}/rehearsed"; [ "${mode}" = ok ]`);
  const alert = c.exe('alert', `printf '%s\\n' "$*" >> "${c.alerts}"`);
  return spawnSync('/bin/bash', [RUNNER], {
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin', HOME: c.dir, MAOS_BACKUP_HOME: c.home, MAOS_REHEARSAL_SCRIPT: rehearsal, MAOS_BACKUP_ALERT: alert },
  });
}
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

describe('scheduled-rehearsal.sh', () => {
  it('rehearses the newest dump whose checksum matches and logs PASS without alerting', () => {
    const c = makeCase();
    dump(c, 'maos-old.dump', 30);
    dump(c, 'maos-new.dump', 2);
    dump(c, 'maos-corrupt.dump', 1, false);
    const r = run(c, 'ok');
    assert.equal(r.status, 0, r.stderr);
    assert.match(read(join(c.dir, 'rehearsed')), /maos-new\.dump/);
    assert.match(read(c.log), /PASS maos-new\.dump/);
    assert.equal(read(c.alerts), '');
  });

  it('logs FAIL and alerts when the rehearsal fails', () => {
    const c = makeCase();
    dump(c, 'maos-a.dump', 1);
    assert.equal(run(c, 'fail').status, 1);
    assert.match(read(c.log), /FAIL maos-a\.dump/);
    assert.match(read(c.alerts), /Weekly restore rehearsal FAILED for maos-a\.dump/);
  });

  it('alerts when there is no verified dump to rehearse', () => {
    const c = makeCase();
    dump(c, 'maos-bad.dump', 1, false);
    assert.equal(run(c, 'ok').status, 1);
    assert.equal(existsSync(join(c.dir, 'rehearsed')), false);
    assert.match(read(c.alerts), /no verified MAOS backup/);
  });
});

describe('install-backup-schedule.sh --dry-run', () => {
  it('pins a runtime copy and renders three valid, credential-free LaunchAgents', () => {
    const c = makeCase();
    const agents = join(c.dir, 'agents');
    const r = spawnSync('/bin/bash', [INSTALLER, '--ref', 'HEAD', '--dry-run', agents], {
      encoding: 'utf8',
      env: { ...process.env, MAOS_BACKUP_HOME: c.home },
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const files = readdirSync(agents).sort();
    assert.deepEqual(files, ['com.soldado.maos.backup-staleness.plist', 'com.soldado.maos.backup.plist', 'com.soldado.maos.restore-rehearsal.plist']);
    for (const f of files) {
      const xml = readFileSync(join(agents, f), 'utf8');
      assert.doesNotMatch(xml, /__[A-Z_]+__/, `${f}: placeholder left`);
      assert.doesNotMatch(xml, /postgres(ql)?:\/\/|password|secret/i, `${f}: credential-like text`);
      assert.match(xml, new RegExp(`${c.home}/runtime/current/scripts/`));
      assert.match(xml, /<key>RunAtLoad<\/key>\s*<false\/>/);
    }
    assert.match(readFileSync(join(agents, 'com.soldado.maos.backup.plist'), 'utf8'), /MAOS_BACKUP_CREDENTIAL_SOURCE<\/key>\s*<string>auto/);
    assert.ok(existsSync(join(c.home, 'runtime', 'current', 'scripts', 'nightly-backup.sh')));
    assert.match(readFileSync(join(c.home, 'runtime', 'current', 'VERSION'), 'utf8'), /^[0-9a-f]{7,}/);
  });
});
