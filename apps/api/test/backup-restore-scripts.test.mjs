/**
 * Backup and restore scripts - behaviour tests (MAOS-T08).
 * Run: node --test test/backup-restore-scripts.test.mjs
 *
 * phase-5-ops.test.mjs only reads the scripts as text. These tests RUN
 * scripts/backup-db.sh and scripts/restore-db.sh with stub pg_dump, psql and
 * pg_restore binaries placed first on PATH, so no PostgreSQL server, no client
 * tools and no network are needed. The stubs record their arguments and the
 * libpq credential variables they received, which lets the tests prove that:
 *
 *   - a failed or interrupted pg_dump never leaves a dump file behind, even a
 *     non-empty partial one;
 *   - transient connection failures are retried a bounded number of times and
 *     anything else fails immediately, always with a non-zero exit;
 *   - the checksum is written only for a complete dump;
 *   - restore keeps query parameters such as ?sslmode=require on the target URL;
 *   - no password ever appears in a process argument or in the script output.
 *
 * Every test works in its own temporary directory, removed afterwards.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const BACKUP = join(repoRoot, 'scripts/backup-db.sh');
const RESTORE = join(repoRoot, 'scripts/restore-db.sh');

const scratch = mkdtempSync(join(tmpdir(), 'maos-backup-restore-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

// The password contains '@' (percent-encoded in the URL) on purpose: it must
// reach libpq decoded, and must appear nowhere in either spelling.
const DB_PASSWORD = 'S3cr3t@pw';
const DB_PASSWORD_ENCODED = 'S3cr3t%40pw';
const ADMIN_PASSWORD = 'Adm!nPw9';

let caseNo = 0;
function makeCase() {
  caseNo += 1;
  const dir = join(scratch, `case-${caseNo}`);
  const bin = join(dir, 'bin');
  const stub = join(dir, 'stub');
  const out = join(dir, 'out');
  mkdirSync(bin, { recursive: true });
  mkdirSync(stub, { recursive: true });
  mkdirSync(out, { recursive: true });
  return { dir, bin, stub, out };
}

const RECORD = `
d="$STUB_DIR"
n=$(( $(cat "$d/count.$TOOL" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$d/count.$TOOL"
printf '%s\\n' "$@" > "$d/args.$TOOL.$n"
printf 'PGUSER=%s\\nPGPASSWORD=%s\\n' "\${PGUSER:-}" "\${PGPASSWORD:-}" > "$d/env.$TOOL.$n"
`;

function writeStub(bin, name, body) {
  writeFileSync(join(bin, name), `#!/bin/bash\nTOOL=${name}\n${RECORD}\n${body}\n`, { mode: 0o755 });
}

/** pg_dump stub. Each line of $STUB_DIR/plan is the outcome of one attempt. */
function installPgDump(bin) {
  writeStub(
    bin,
    'pg_dump',
    `
file=""
for a in "$@"; do case "$a" in --file=*) file="\${a#--file=}" ;; esac; done
mode="$(sed -n "\${n}p" "$d/plan")"
[ -n "$mode" ] || mode="$(tail -n 1 "$d/plan")"
case "$mode" in
  ok)    printf 'PGDMP complete dump from attempt %s' "$n" > "$file"; exit 0 ;;
  empty) : > "$file"; exit 0 ;;
  eof)   printf 'PGDMP partial' > "$file"
         echo 'pg_dump: error: query failed: SSL error: unexpected eof while reading' >&2; exit 1 ;;
  closed) printf 'PGDMP partial' > "$file"
         echo 'pg_dump: error: server closed the connection unexpectedly' >&2; exit 1 ;;
  auth)  printf 'PGDMP partial' > "$file"
         echo 'pg_dump: error: connection to server at "db.example" (10.0.0.1), port 5432 failed: FATAL:  password authentication failed for user "maos"' >&2; exit 1 ;;
esac
exit 99
`,
  );
}

function runBackup(c, { plan, env = {} }) {
  writeFileSync(join(c.stub, 'plan'), `${plan.join('\n')}\n`);
  return spawnSync('/bin/bash', [BACKUP, c.out], {
    encoding: 'utf8',
    env: {
      PATH: `${c.bin}:/usr/bin:/bin`,
      HOME: c.dir,
      STUB_DIR: c.stub,
      DATABASE_URL: `postgresql://maos:${DB_PASSWORD_ENCODED}@db.example:5432/railway?sslmode=require&schema=public`,
      BACKUP_RETRY_DELAY: '0',
      ...env,
    },
  });
}

const count = (c, tool) => {
  const f = join(c.stub, `count.${tool}`);
  return existsSync(f) ? Number(readFileSync(f, 'utf8').trim()) : 0;
};
const argsOf = (c, tool, n) => readFileSync(join(c.stub, `args.${tool}.${n}`), 'utf8');
const envOf = (c, tool, n) => readFileSync(join(c.stub, `env.${tool}.${n}`), 'utf8');
const allArgs = (c, tool) =>
  Array.from({ length: count(c, tool) }, (_, i) => argsOf(c, tool, i + 1)).join('\n');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function assertNoSecret(text, secrets, where) {
  for (const s of secrets) {
    assert.ok(!text.includes(s), `${where} must not contain a password`);
  }
}

// ── backup-db.sh ─────────────────────────────────────────────────────────────

describe('backup-db.sh - behaviour with a stub pg_dump', () => {
  it('writes one complete dump plus a matching checksum and no partial file', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['ok'] });
    assert.equal(r.status, 0, r.stderr);

    const files = readdirSync(c.out).sort();
    assert.equal(files.length, 2, files.join(','));
    const dump = files.find((f) => /^maos-\d{8}T\d{6}Z\.dump$/.test(f));
    assert.ok(dump, 'final dump name');
    assert.equal(files.find((f) => f.endsWith('.sha256')), `${dump}.sha256`);
    assert.equal(
      readFileSync(join(c.out, `${dump}.sha256`), 'utf8').split(/\s+/)[0],
      sha256(join(c.out, dump)),
    );
    assert.equal(readFileSync(join(c.out, dump), 'utf8'), 'PGDMP complete dump from attempt 1');
  });

  it('keeps the password out of pg_dump arguments and out of all output', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['ok'] });
    assert.equal(r.status, 0, r.stderr);
    const args = argsOf(c, 'pg_dump', 1);
    assertNoSecret(args, [DB_PASSWORD, DB_PASSWORD_ENCODED, 'maos:'], 'pg_dump arguments');
    assertNoSecret(r.stdout + r.stderr, [DB_PASSWORD, DB_PASSWORD_ENCODED], 'script output');
    assert.match(args, /--dbname=postgresql:\/\/db\.example:5432\/railway\?sslmode=require\n/);
    assert.doesNotMatch(args, /schema=/);
    assert.match(envOf(c, 'pg_dump', 1), new RegExp(`PGPASSWORD=${DB_PASSWORD.replace('$', '\\$')}\\n`));
    assert.match(envOf(c, 'pg_dump', 1), /PGUSER=maos\n/);
  });

  it('retries a transient SSL EOF and succeeds without leaving the partial file', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['eof', 'ok'] });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(count(c, 'pg_dump'), 2);
    const files = readdirSync(c.out).sort();
    assert.equal(files.length, 2, files.join(','));
    const dump = files.find((f) => f.endsWith('.dump'));
    assert.equal(readFileSync(join(c.out, dump), 'utf8'), 'PGDMP complete dump from attempt 2');
    assert.match(r.stderr + r.stdout, /transient/i);
    assert.match(r.stderr + r.stdout, /SSL error: unexpected eof/);
    assertNoSecret(r.stdout + r.stderr, [DB_PASSWORD, DB_PASSWORD_ENCODED], 'script output');
  });

  it('gives every attempt its own partial file name, never the final .dump name', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['eof', 'closed', 'ok'] });
    assert.equal(r.status, 0, r.stderr);
    const files = [1, 2, 3].map((n) => (argsOf(c, 'pg_dump', n).match(/^--file=(.*)$/m) || [])[1]);
    assert.equal(new Set(files).size, 3, 'a fresh path per attempt');
    for (const f of files) {
      assert.match(f, /\.dump\.partial-\d$/);
    }
  });

  it('gives up after the bounded number of retries, exits non-zero and leaves no file', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['eof'], env: { BACKUP_RETRIES: '2' } });
    assert.notEqual(r.status, 0);
    assert.equal(count(c, 'pg_dump'), 3, 'one attempt plus two retries');
    assert.deepEqual(readdirSync(c.out), []);
    assert.match(r.stderr, /ERROR: pg_dump failed after 3 attempt/);
  });

  it('uses two retries by default', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['closed'] });
    assert.notEqual(r.status, 0);
    assert.equal(count(c, 'pg_dump'), 3);
    assert.deepEqual(readdirSync(c.out), []);
  });

  it('does not retry a non-transient failure and removes the non-empty partial dump', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['auth', 'ok'] });
    assert.notEqual(r.status, 0);
    assert.equal(count(c, 'pg_dump'), 1, 'authentication failures are never retried');
    assert.deepEqual(readdirSync(c.out), [], 'no dump, no partial, no checksum');
    assertNoSecret(r.stdout + r.stderr, [DB_PASSWORD, DB_PASSWORD_ENCODED], 'script output');
  });

  it('rejects an empty dump', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['empty'] });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /backup file is empty/);
    assert.deepEqual(readdirSync(c.out), []);
  });

  it('refuses an invalid or unbounded retry count before contacting the database', () => {
    for (const value of ['x', '-1', '6', '99']) {
      const c = makeCase();
      installPgDump(c.bin);
      const r = runBackup(c, { plan: ['ok'], env: { BACKUP_RETRIES: value } });
      assert.equal(r.status, 1, `BACKUP_RETRIES=${value}`);
      assert.match(r.stderr, /BACKUP_RETRIES must be an integer between 0 and 5/);
      assert.equal(count(c, 'pg_dump'), 0);
    }
  });

  it('allows retries to be switched off', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const r = runBackup(c, { plan: ['eof', 'ok'], env: { BACKUP_RETRIES: '0' } });
    assert.notEqual(r.status, 0);
    assert.equal(count(c, 'pg_dump'), 1);
  });

  it('prunes by retention without touching unrelated files', () => {
    const c = makeCase();
    installPgDump(c.bin);
    const old = ['maos-20260101T000000Z.dump', 'maos-20260102T000000Z.dump', 'maos-20260103T000000Z.dump'];
    old.forEach((f, i) => {
      writeFileSync(join(c.out, f), 'old');
      writeFileSync(join(c.out, `${f}.sha256`), 'x');
      const t = new Date(Date.UTC(2026, 0, i + 1)).getTime() / 1000;
      utimesSync(join(c.out, f), t, t);
    });
    writeFileSync(join(c.out, 'notes.txt'), 'keep me');
    const r = runBackup(c, { plan: ['ok'], env: { BACKUP_RETENTION: '2' } });
    assert.equal(r.status, 0, r.stderr);
    const dumps = readdirSync(c.out).filter((f) => f.endsWith('.dump')).sort();
    assert.equal(dumps.length, 2);
    assert.ok(dumps.includes('maos-20260103T000000Z.dump'));
    assert.ok(existsSync(join(c.out, 'notes.txt')));
    assert.ok(!existsSync(join(c.out, 'maos-20260101T000000Z.dump.sha256')));
  });
});

// ── restore-db.sh ────────────────────────────────────────────────────────────

function installRestoreStubs(bin) {
  writeStub(
    bin,
    'psql',
    `
case "$*" in
  *"SELECT 1 FROM pg_database"*) printf '%s' "\${STUB_EXISTS:-}" ;;
esac
exit 0
`,
  );
  writeStub(bin, 'pg_restore', 'exit "${STUB_RESTORE_EXIT:-0}"');
}

function makeDump(c, { goodChecksum = true } = {}) {
  const dump = join(c.dir, 'maos-20261001T000000Z.dump');
  writeFileSync(dump, 'PGDMP restore test payload');
  const sum = goodChecksum ? sha256(dump) : 'f'.repeat(64);
  writeFileSync(`${dump}.sha256`, `${sum}  ${dump}\n`);
  return dump;
}

function runRestore(c, { dump, target = 'maos_restore_test', adminUrl, env = {} }) {
  return spawnSync('/bin/bash', [RESTORE, dump, target], {
    encoding: 'utf8',
    env: {
      PATH: `${c.bin}:/usr/bin:/bin`,
      HOME: c.dir,
      STUB_DIR: c.stub,
      ADMIN_DATABASE_URL:
        adminUrl ??
        `postgresql://admin:${encodeURIComponent(ADMIN_PASSWORD)}@db.example:5432/postgres?sslmode=require&schema=public`,
      ...env,
    },
  });
}

const dbnameArg = (args) => (args.match(/^--dbname=(.*)$/m) || [])[1];

describe('restore-db.sh - behaviour with stub psql and pg_restore', () => {
  it('keeps ?sslmode on the admin and the target connection, drops Prisma-only parameters', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, { dump: makeDump(c) });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(count(c, 'pg_restore'), 1);
    assert.equal(
      dbnameArg(argsOf(c, 'pg_restore', 1)),
      'postgresql://db.example:5432/maos_restore_test?sslmode=require',
    );
    assert.equal(argsOf(c, 'psql', 1).split('\n')[0], 'postgresql://db.example:5432/postgres?sslmode=require');
  });

  it('never puts the admin password into psql or pg_restore arguments or output', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, { dump: makeDump(c) });
    assert.equal(r.status, 0, r.stderr);
    const secrets = [ADMIN_PASSWORD, encodeURIComponent(ADMIN_PASSWORD), 'admin:'];
    assertNoSecret(allArgs(c, 'psql'), secrets, 'psql arguments');
    assertNoSecret(allArgs(c, 'pg_restore'), secrets, 'pg_restore arguments');
    assertNoSecret(r.stdout + r.stderr, secrets.slice(0, 2), 'script output');
    for (const tool of ['psql', 'pg_restore']) {
      assert.match(envOf(c, tool, 1), new RegExp(`PGPASSWORD=${ADMIN_PASSWORD}\\n`));
      assert.match(envOf(c, tool, 1), /PGUSER=admin\n/);
    }
  });

  it('builds the target URL when the admin URL has no query string', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, {
      dump: makeDump(c),
      adminUrl: `postgresql://admin:${ADMIN_PASSWORD}@db.example:5432/postgres`,
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(dbnameArg(argsOf(c, 'pg_restore', 1)), 'postgresql://db.example:5432/maos_restore_test');
  });

  it('builds the target URL when the admin URL has no database segment', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, {
      dump: makeDump(c),
      adminUrl: `postgresql://admin:${ADMIN_PASSWORD}@db.example:5432?sslmode=verify-full`,
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      dbnameArg(argsOf(c, 'pg_restore', 1)),
      'postgresql://db.example:5432/maos_restore_test?sslmode=verify-full',
    );
  });

  it('refuses an existing target database and never restores into it', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, { dump: makeDump(c), env: { STUB_EXISTS: '1' } });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /already exists/);
    assert.equal(count(c, 'pg_restore'), 0);
    assert.doesNotMatch(allArgs(c, 'psql'), /CREATE DATABASE/);
  });

  it('refuses a dump whose checksum does not match before contacting the server', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, { dump: makeDump(c, { goodChecksum: false }) });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /checksum mismatch/);
    assert.equal(count(c, 'psql'), 0);
    assert.equal(count(c, 'pg_restore'), 0);
  });

  it('exits non-zero when pg_restore fails', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, { dump: makeDump(c), env: { STUB_RESTORE_EXIT: '1' } });
    assert.notEqual(r.status, 0);
  });

  it('rejects a target name that is not a plain identifier', () => {
    const c = makeCase();
    installRestoreStubs(c.bin);
    const r = runRestore(c, { dump: makeDump(c), target: 'bad-name;drop' });
    assert.equal(r.status, 1);
    assert.equal(count(c, 'psql'), 0);
  });
});
