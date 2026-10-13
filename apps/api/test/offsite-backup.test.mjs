/**
 * Encrypted off-site backup copy and its restore rehearsal - behaviour tests
 * (MAOS-T20, owner decision D2). Run: node --test test/offsite-backup.test.mjs
 *
 * The scripts run for real with a real openssl round trip; only curl (the
 * bucket), the Keychain and the isolated restore are stubs. No network, no
 * Docker, no database.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const UPLOAD = join(repoRoot, 'scripts/offsite-backup.sh');
const REHEARSE = join(repoRoot, 'scripts/offsite-rehearsal.sh');

const scratch = mkdtempSync(join(tmpdir(), 'maos-offsite-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const ACCESS = 'AKIA-TEST-0ffs1te';
const SECRET = 'S3cr3t/Off+site=Value';
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const exe = (p, body) => writeFileSync(p, `#!/bin/bash\n${body}\n`, { mode: 0o755 });

// One key pair for all cases, plus a second one for "wrong key".
function keypair(dir) {
  mkdirSync(dir, { recursive: true });
  const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=test',
    '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return { cert: join(dir, 'cert.pem'), keyB64: readFileSync(join(dir, 'key.pem')).toString('base64') };
}
const keys = keypair(join(scratch, 'keys'));
const otherKeys = keypair(join(scratch, 'keys2'));

let n = 0;
function makeCase({ configured = true, endpoint = 'https://s3.example.test', key = keys } = {}) {
  n += 1;
  const dir = join(scratch, `case-${n}`);
  const home = join(dir, 'MAOS_BACKUPS');
  const bin = join(dir, 'bin');
  const store = join(dir, 'bucket');
  for (const d of [join(home, 'production'), bin, store]) mkdirSync(d, { recursive: true });
  if (configured) {
    writeFileSync(join(home, 'offsite.env'),
      `OFFSITE_ENDPOINT=${endpoint}\nOFFSITE_REGION=eu-test\nOFFSITE_BUCKET=maos-test\nOFFSITE_CERT=${keys.cert}\n`);
  }
  // Bucket stub: PUT (-T) copies into the store, GET (-o) copies out. Records
  // its argv and stdin separately so the test can prove where secrets went.
  exe(join(bin, 'curl'), `
STORE="${store}"; printf '%s\\n' "$*" >> "${dir}/curl.argv"; cat > /dev/null
src=""; out=""; url=""
while [ $# -gt 0 ]; do case "$1" in -T) src="$2"; shift 2;; -o) out="$2"; shift 2;; -K|--aws-sigv4) shift 2;; -*) shift;; *) url="$1"; shift;; esac; done
obj="$STORE/$(basename "$url")"
if [ -n "$src" ]; then cp "$src" "$obj"; exit 0; fi
[ -f "$obj" ] || exit 22
cp "$obj" "$out"; [ -e "${dir}/tamper" ] && printf 'x' >> "$out"; exit 0`);
  exe(join(bin, 'security'), `
case "$*" in
  *maos-offsite-access-key-id*) echo '${ACCESS}';;
  *maos-offsite-secret-access-key*) echo '${SECRET}';;
  *maos-offsite-private-key*) echo '${key.keyB64}';;
  *) exit 44;;
esac`);
  exe(join(bin, 'alert'), `printf '%s\\n' "$*" >> "${dir}/alerts"`);
  exe(join(bin, 'rehearse'), `cp "$1" "${dir}/rehearsed.dump"; [ -f "$1.sha256" ] || exit 9; echo REHEARSAL OK`);
  return { dir, home, store, prod: join(home, 'production') };
}

function dump(c, name = 'maos-20261013T030000Z.dump', body = `PGDMP fake archive ${n} ${'x'.repeat(5000)}`) {
  const p = join(c.prod, name);
  writeFileSync(p, body);
  writeFileSync(`${p}.sha256`, `${sha(Buffer.from(body))}  ${p}\n`);
  return { path: p, body };
}

function run(c, script, args = []) {
  const r = spawnSync('bash', [script, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MAOS_BACKUP_HOME: c.home,
      MAOS_OFFSITE_CURL: join(c.dir, 'bin/curl'),
      MAOS_SECURITY_BIN: join(c.dir, 'bin/security'),
      MAOS_BACKUP_ALERT: join(c.dir, 'bin/alert'),
      MAOS_REHEARSAL_CMD: join(c.dir, 'bin/rehearse'),
    },
  });
  return { ...r, alerts: existsSync(join(c.dir, 'alerts')) ? readFileSync(join(c.dir, 'alerts'), 'utf8') : '' };
}

describe('off-site backup copy (MAOS-T20)', () => {
  it('without configuration it uploads nothing, exits 2 and raises no alert (setup gate pending)', () => {
    const c = makeCase({ configured: false });
    dump(c);
    const r = run(c, UPLOAD);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /NOT CONFIGURED/);
    assert.equal(r.alerts, '');
    assert.deepEqual(readdirSync(c.store), []);
  });

  it('encrypts before upload, proves the stored copy, and never exposes the credentials', () => {
    const c = makeCase();
    const d = dump(c);
    const r = run(c, UPLOAD);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const name = 'maos-20261013T030000Z.dump.cms';
    assert.deepEqual(readdirSync(c.store).sort(), [name, `${name}.manifest`]);
    const cipher = readFileSync(join(c.store, name));
    assert.ok(!cipher.subarray(0, 5).equals(Buffer.from('PGDMP')), 'not plaintext');
    assert.ok(!cipher.includes(Buffer.from('fake archive')), 'plaintext not visible in the stored object');
    const manifest = readFileSync(join(c.store, `${name}.manifest`), 'utf8');
    assert.match(manifest, new RegExp(`plain_sha256=${sha(Buffer.from(d.body))}`));
    assert.match(manifest, new RegExp(`cipher_sha256=${sha(cipher)}`));
    const argv = readFileSync(join(c.dir, 'curl.argv'), 'utf8');
    for (const s of [ACCESS, SECRET]) {
      assert.ok(!argv.includes(s), 'credentials never on the command line');
      assert.ok(!(r.stdout + r.stderr).includes(s), 'credentials never in output');
    }
    assert.match(argv, /--aws-sigv4 aws:amz:eu-test:s3/);
    assert.equal(readFileSync(join(c.home, 'offsite/last-upload'), 'utf8').trim(), name);
    assert.match(readFileSync(join(c.home, 'logs/offsite.log'), 'utf8'), /OK: .* uploaded and verified/);
  });

  it('refuses a dump whose checksum does not match, uploading nothing', () => {
    const c = makeCase();
    const d = dump(c);
    writeFileSync(d.path, `${d.body}corrupted`);
    const r = run(c, UPLOAD, [d.path]);
    assert.equal(r.status, 1);
    assert.match(r.alerts, /checksum mismatch/);
    assert.deepEqual(readdirSync(c.store), []);
  });

  it('fails and alerts when the stored copy does not read back intact', () => {
    const c = makeCase();
    dump(c);
    writeFileSync(join(c.dir, 'tamper'), '');
    const r = run(c, UPLOAD);
    assert.equal(r.status, 1);
    assert.match(r.alerts, /stored copy checksum mismatch/);
    assert.ok(!existsSync(join(c.home, 'offsite/last-upload')));
  });

  it('refuses a non-https endpoint', () => {
    const c = makeCase({ endpoint: 'http://s3.example.test' });
    dump(c);
    const r = run(c, UPLOAD);
    assert.equal(r.status, 1);
    assert.match(r.alerts, /must be https/);
  });

  it('rehearsal: downloads, decrypts, matches both checksums and runs the isolated restore on the original bytes', () => {
    const c = makeCase();
    const d = dump(c);
    assert.equal(run(c, UPLOAD).status, 0);
    const r = run(c, REHEARSE);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS/);
    assert.equal(readFileSync(join(c.dir, 'rehearsed.dump'), 'utf8'), d.body);
    assert.ok(!(r.stdout + r.stderr).includes(keys.keyB64.slice(0, 40)), 'key never printed');
  });

  it('rehearsal fails on a tampered download or the wrong key', () => {
    const c = makeCase();
    dump(c);
    assert.equal(run(c, UPLOAD).status, 0);
    writeFileSync(join(c.dir, 'tamper'), '');
    const tampered = run(c, REHEARSE);
    assert.equal(tampered.status, 1);
    assert.match(tampered.alerts, /ciphertext checksum mismatch/);

    const w = makeCase({ key: otherKeys });
    dump(w);
    assert.equal(run(w, UPLOAD).status, 0);
    const wrong = run(w, REHEARSE);
    assert.equal(wrong.status, 1);
    assert.match(wrong.alerts, /decryption failed/);
  });

  it('runs after every successful nightly backup and every passing weekly rehearsal, never instead of them', () => {
    const nightly = readFileSync(join(repoRoot, 'scripts/nightly-backup.sh'), 'utf8');
    const success = nightly.slice(nightly.indexOf('if [ "$STATUS" -eq 0 ]; then'));
    assert.match(success, /OFFSITE_CMD=[^\n]*offsite-backup\.sh[\s\S]*finish "SUCCESS: exit 0" 0/);
    assert.match(success, /2\) log "off-site copy: not configured"/);
    const weekly = readFileSync(join(repoRoot, 'scripts/scheduled-rehearsal.sh'), 'utf8');
    assert.match(weekly, /echo "\$\(stamp\) PASS[^\n]*\n[\s\S]{0,400}offsite-rehearsal\.sh[\s\S]{0,200}\|\| true; fi\n  exit 0/);
  });
});
