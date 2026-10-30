/**
 * Private Railway tunnel for the migration tools (MAOS-R01 follow-up).
 * Run (from the repository root): node --test scripts/test/*.test.mjs
 *
 * It lives outside apps/ on purpose: a change under apps/api redeploys the
 * production API (Railway watch path /apps/api/**), and these tests cover
 * operator scripts only. CI runs it in its own step.
 *
 * Since the production database lost its public TCP proxy, the read-only
 * check and the one-migration runner must reach it through Railway's private
 * SSH tunnel, exactly like the nightly backup. scripts/lib/private-tunnel.sh
 * holds the audited helpers for all three. Both tools are RUN here with stub
 * `railway` (a real local TCP listener stands in for the SSH tunnel), stub
 * `docker`/`prisma` and a stub Keychain, so no database, Keychain or Railway
 * project is touched. The tests prove, for both tools, that private mode:
 *   - connects through the tunnel only: the Keychain URL keeps user, password,
 *     database and options, host and port become the tunnel, sslmode=require;
 *   - is the only way Railway is called, and only as
 *     `railway connect Postgres --ssh --tunnel-only -P <port>`;
 *   - closes the tunnel after success, failure, refusal and SIGTERM;
 *   - fails closed: a port already in use (never used, never stopped), a
 *     tunnel that exits or is not ready in time, an invalid port or mode;
 *   - opens no tunnel before the local guards pass (runner);
 *   - never prints the password, the stored host or a connection string;
 * and that direct mode, the default, is unchanged.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const READONLY = join(repoRoot, 'scripts/db-readonly-check.sh');
const MIGRATE = join(repoRoot, 'scripts/migrate-deploy-one.sh');
const LIB = join(repoRoot, 'scripts/lib/private-tunnel.sh');
const NODE = process.execPath;

const scratch = mkdtempSync(join(tmpdir(), 'maos-tunnel-tools-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const KEYCHAIN_URL = 'postgresql://maos:Tunn3l%40Secret@old-public.proxy.example:16699/railway?sslmode=verify-full&connect_timeout=10&host=evil.example';
const LSOF = spawnSync('/bin/sh', ['-c', 'command -v lsof || ls /usr/sbin/lsof /usr/bin/lsof 2>/dev/null | head -1'], {
  encoding: 'utf8',
  env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin' },
}).stdout.trim();

function writeExe(path, body) {
  writeFileSync(path, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
}

function freePort() {
  const r = spawnSync(NODE, ['-e', "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"], { encoding: 'utf8' });
  return Number(r.stdout.trim());
}

const portOpen = (port) => spawnSync('/bin/bash', ['-c', `(exec 3<>/dev/tcp/127.0.0.1/${port}) 2>/dev/null`]).status === 0;
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

let caseNo = 0;
/** Stub railway: `stay` listens until stopped, `fail` exits, `hang` never listens. */
function stubDir(tunnel = 'stay') {
  caseNo += 1;
  const dir = join(scratch, `case-${caseNo}`);
  const stub = join(dir, 'stub');
  mkdirSync(stub, { recursive: true });
  writeFileSync(join(stub, 'keychain'), KEYCHAIN_URL);
  writeFileSync(join(stub, 'tunnel.mode'), tunnel);
  writeExe(join(stub, 'security'), `[ -f "$STUB_DIR/keychain" ] || exit 44; cat "$STUB_DIR/keychain"`);
  writeExe(
    join(stub, 'railway'),
    `printf '%s\\n' "$@" >> "$STUB_DIR/railway.args"
echo "connection details: postgresql://user:Tunn3l%40Secret@127.0.0.1:x/railway"
[ "$1" = connect ] || exit 9
port=""; prev=""
for a in "$@"; do [ "$prev" = "-P" ] && port="$a"; prev="$a"; done
mode="$(cat "$STUB_DIR/tunnel.mode")"
case "$mode" in
  stay) "${NODE}" -e "require('net').createServer(s=>s.end()).listen(Number(process.argv[1]),'127.0.0.1')" "$port" &
        echo "$!" > "$STUB_DIR/listener.pid"; sleep 60 & wait $! ;;
  fail) exit 1 ;;
  hang) sleep 60 & wait $! ;;
esac`,
  );
  return { dir, stub, port: freePort() };
}

const tunnelEnv = (c, extra = {}) => ({
  PATH: process.env.PATH,
  HOME: c.dir,
  STUB_DIR: c.stub,
  MAOS_SECURITY_BIN: join(c.stub, 'security'),
  MAOS_DB_CONNECTION: 'private',
  MAOS_DB_TUNNEL_PORT: String(c.port),
  MAOS_DB_TUNNEL_READY_SECONDS: '5',
  MAOS_RAILWAY_BIN: join(c.stub, 'railway'),
  MAOS_RAILWAY_DIR: c.dir,
  MAOS_LSOF_BIN: LSOF,
  ...extra,
});

const read = (c, name) => (existsSync(join(c.stub, name)) ? readFileSync(join(c.stub, name), 'utf8') : '');

function assertClosed(c) {
  const pid = Number(read(c, 'listener.pid') || 0);
  if (pid) assert.equal(alive(pid), false, `listener ${pid} still running`);
  assert.equal(portOpen(c.port), false, 'tunnel port still listening');
}

function assertNoSecret(all) {
  assert.ok(!all.includes('Tunn3l'), 'password leaked');
  assert.ok(!all.includes('old-public.proxy.example'), 'stored host leaked');
  assert.ok(!/postgres(ql)?:\/\/[^<\s]/.test(all), 'connection string leaked');
}

function assertTunnelUrl(url, host, port) {
  assert.ok(url.startsWith(`postgresql://maos:Tunn3l%40Secret@${host}:${port}/railway?`), 'user, password and database kept; host and port are the tunnel');
  assert.match(url, /connect_timeout=10/);
  assert.match(url, /sslmode=require$/);
  assert.ok(!url.includes('evil.example') && !url.includes('verify-full'), 'host and sslmode options dropped');
}

// ── db-readonly-check.sh ─────────────────────────────────────────────────────

/** docker stub: records the URL it got and whether the tunnel was listening at that moment. */
function installDocker(c, { psqlExit = 0, hang = false } = {}) {
  writeFileSync(join(c.dir, 'check.sql'), 'SELECT 1;\n');
  writeExe(
    join(c.stub, 'docker'),
    `[ "$1" = info ] && exit 0
printf '%s\\n' "$@" > "$STUB_DIR/docker.argv"; printf '%s' "$MAOS_PG_URL" > "$STUB_DIR/url.received"
(exec 3<>/dev/tcp/127.0.0.1/${c.port}) 2>/dev/null && echo yes > "$STUB_DIR/tunnel.seen"
cat > /dev/null; echo "psql output via $MAOS_PG_URL"
echo "$$" > "$STUB_DIR/docker.pid"
${hang ? 'sleep 30 & wait $!' : ''}
exit ${psqlExit}`,
  );
}

function runReadonly(c, extra = {}) {
  const r = spawnSync('bash', [READONLY, join(c.dir, 'check.sql')], {
    encoding: 'utf8',
    env: tunnelEnv(c, { MAOS_DOCKER_BIN: join(c.stub, 'docker'), ...extra }),
  });
  return { ...r, all: `${r.stdout}${r.stderr}` };
}

describe('db-readonly-check.sh - private tunnel', () => {
  it('runs the check through the tunnel with the rewritten URL, closes it and exits 0', () => {
    const c = stubDir();
    installDocker(c);
    const r = runReadonly(c);
    assert.equal(r.status, 0, r.all);
    assert.equal(read(c, 'tunnel.seen').trim(), 'yes', 'psql ran while the tunnel was open');
    assertTunnelUrl(read(c, 'url.received'), 'host.docker.internal', c.port);
    assert.deepEqual(read(c, 'railway.args').trim().split('\n'), ['connect', 'Postgres', '--ssh', '--tunnel-only', '-P', String(c.port)]);
    assert.match(read(c, 'docker.argv'), /PGOPTIONS=-c default_transaction_read_only=on/);
    assert.ok(!read(c, 'docker.argv').includes('Tunn3l'), 'URL never in argv');
    assert.match(r.stderr, /tunnel: private tunnel ready/);
    assert.match(r.stderr, /tunnel: private tunnel closed/);
    assertNoSecret(r.all);
    assertClosed(c);
  });

  it('passes psql\'s failure through and still closes the tunnel', () => {
    const c = stubDir();
    installDocker(c, { psqlExit: 3 });
    const r = runReadonly(c);
    assert.equal(r.status, 3);
    assertClosed(c);
  });

  it('refuses a port already in use, never uses or stops that listener (exit 5)', async () => {
    const c = stubDir();
    installDocker(c);
    const other = spawn(NODE, ['-e', `require('net').createServer(s=>s.end()).listen(${c.port},'127.0.0.1')`], { stdio: 'ignore' });
    try {
      for (let i = 0; i < 50 && !portOpen(c.port); i += 1) await new Promise((res) => setTimeout(res, 50));
      const r = runReadonly(c);
      assert.equal(r.status, 5, r.all);
      assert.match(r.stderr, /already in use/);
      assert.equal(read(c, 'railway.args'), '', 'railway never called');
      assert.equal(read(c, 'url.received'), '', 'psql never ran');
      assert.equal(alive(other.pid), true, 'foreign listener left alone');
    } finally {
      other.kill();
    }
  });

  it('fails closed when the tunnel exits or is not ready in time (exit 5), psql never runs', () => {
    for (const mode of ['fail', 'hang']) {
      const c = stubDir(mode);
      installDocker(c);
      const r = runReadonly(c, { MAOS_DB_TUNNEL_READY_SECONDS: '2' });
      assert.equal(r.status, 5, `${mode}: ${r.all}`);
      assert.match(r.stderr, mode === 'fail' ? /exited before it was ready/ : /not ready within 2s/);
      assert.equal(read(c, 'url.received'), '', `${mode}: psql never ran`);
      assertClosed(c);
    }
  });

  it('closes the tunnel and stops on SIGTERM', async () => {
    const c = stubDir();
    installDocker(c, { hang: true });
    const child = spawn('bash', [READONLY, join(c.dir, 'check.sql')], { env: tunnelEnv(c, { MAOS_DOCKER_BIN: join(c.stub, 'docker') }) });
    const code = new Promise((res) => child.on('exit', (status, signal) => res(status ?? signal)));
    for (let i = 0; i < 100 && !read(c, 'docker.pid'); i += 1) await new Promise((res) => setTimeout(res, 100));
    child.kill('SIGTERM');
    assert.equal(await code, 143);
    assertClosed(c);
  });

  it('rejects an unknown mode (2), an invalid port (5) and a Keychain URL without user or database (3)', () => {
    const c = stubDir();
    installDocker(c);
    assert.equal(runReadonly(c, { MAOS_DB_CONNECTION: 'public' }).status, 2);
    assert.equal(runReadonly(c, { MAOS_DB_TUNNEL_PORT: '80' }).status, 5);
    writeFileSync(join(c.stub, 'keychain'), 'postgresql://old-public.proxy.example:5432/');
    const r = runReadonly(c);
    assert.equal(r.status, 3);
    assertNoSecret(r.all);
    assert.equal(read(c, 'railway.args'), '', 'railway never called');
  });

  it('direct mode is unchanged and never calls Railway', () => {
    const c = stubDir();
    installDocker(c);
    const r = runReadonly(c, { MAOS_DB_CONNECTION: '' });
    assert.equal(r.status, 0, r.all);
    assert.equal(read(c, 'url.received'), KEYCHAIN_URL);
    assert.equal(read(c, 'railway.args'), '');
  });
});

// ── migrate-deploy-one.sh ────────────────────────────────────────────────────

const NAME = '20261014155254_project_enrichment';
const SQL = 'ALTER TABLE "Project" ADD COLUMN "x" TEXT;\n';
const SHA = createHash('sha256').update(SQL).digest('hex');
const pendingOnly = `2 migrations found in prisma/migrations\n\nFollowing migration have not yet been applied:\n${NAME}\n\nTo apply migrations in production run prisma migrate deploy.\n`;
const upToDate = '14 migrations found in prisma/migrations\n\nDatabase schema is up to date!\n';

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

/** A throwaway checkout with the runner, the shared library and one committed migration. */
function migrateCase(tunnel = 'stay') {
  const c = stubDir(tunnel);
  const mig = join(c.dir, 'apps/api/prisma/migrations', NAME);
  mkdirSync(join(c.dir, 'scripts/lib'), { recursive: true });
  mkdirSync(mig, { recursive: true });
  copyFileSync(MIGRATE, join(c.dir, 'scripts/migrate-deploy-one.sh'));
  copyFileSync(LIB, join(c.dir, 'scripts/lib/private-tunnel.sh'));
  writeFileSync(join(c.dir, 'apps/api/prisma/schema.prisma'), '// schema\n');
  writeFileSync(join(mig, 'migration.sql'), SQL);
  writeFileSync(join(c.dir, '.gitignore'), 'stub/\n');
  git(c.dir, 'init', '-q');
  git(c.dir, 'add', '.');
  git(c.dir, '-c', 'user.email=t@example.invalid', '-c', 'user.name=t', 'commit', '-qm', 'init');
  writeFileSync(join(c.stub, 'status.1'), pendingOnly);
  writeFileSync(join(c.stub, 'status.2'), upToDate);
  writeExe(
    join(c.stub, 'prisma'),
    `echo "$*" >> "$STUB_DIR/prisma.argv"
printf '%s\\n' "$DATABASE_URL" >> "$STUB_DIR/prisma.urls"
(exec 3<>/dev/tcp/127.0.0.1/${c.port}) 2>/dev/null && echo yes >> "$STUB_DIR/tunnel.seen" || echo no >> "$STUB_DIR/tunnel.seen"
echo "Datasource \\"db\\": PostgreSQL database at $DATABASE_URL"
if [ "$1 $2" = "migrate status" ]; then
  n=$(( $(cat "$STUB_DIR/status.count" 2>/dev/null || echo 0) + 1 )); echo $n > "$STUB_DIR/status.count"
  cat "$STUB_DIR/status.$n" 2>/dev/null || cat "$STUB_DIR/status.2"; exit 1
fi
if [ "$1 $2" = "migrate deploy" ]; then
  echo deployed >> "$STUB_DIR/deploy.calls"; [ -e "$STUB_DIR/deploy.fail" ] && exit 1; exit 0
fi
exit 9`,
  );
  return c;
}

function runMigrate(c, args, extra = {}) {
  const r = spawnSync('bash', [join(c.dir, 'scripts/migrate-deploy-one.sh'), ...args], {
    cwd: c.dir,
    encoding: 'utf8',
    env: tunnelEnv(c, { MAOS_PRISMA_BIN: join(c.stub, 'prisma'), ...extra }),
  });
  return { ...r, all: `${r.stdout}${r.stderr}` };
}

describe('migrate-deploy-one.sh - private tunnel', () => {
  it('check: every prisma call goes through the open tunnel; nothing applied; tunnel closed', () => {
    const c = migrateCase();
    const r = runMigrate(c, ['check', NAME, SHA]);
    assert.equal(r.status, 0, r.all);
    assert.match(r.stdout, /CHECK OK/);
    assert.match(r.stdout, /connection: private tunnel on 127\.0\.0\.1:/);
    for (const url of read(c, 'prisma.urls').trim().split('\n')) assertTunnelUrl(url, '127.0.0.1', c.port);
    assert.ok(read(c, 'tunnel.seen').trim().split('\n').every((x) => x === 'yes'), 'tunnel open for every prisma call');
    assert.equal(read(c, 'deploy.calls'), '');
    assertNoSecret(r.all);
    assertClosed(c);
  });

  it('apply: deploys once through the tunnel, verifies, closes the tunnel', () => {
    const c = migrateCase();
    const r = runMigrate(c, ['apply', NAME, SHA]);
    assert.equal(r.status, 0, r.all);
    assert.match(r.stdout, /APPLY OK/);
    assert.equal(read(c, 'deploy.calls').trim(), 'deployed');
    assert.deepEqual(read(c, 'railway.args').trim().split('\n'), ['connect', 'Postgres', '--ssh', '--tunnel-only', '-P', String(c.port)]);
    assertNoSecret(r.all);
    assertClosed(c);
  });

  it('opens no tunnel when a local guard refuses (wrong sha256)', () => {
    const c = migrateCase();
    const r = runMigrate(c, ['check', NAME, '0'.repeat(64)]);
    assert.equal(r.status, 5);
    assert.equal(read(c, 'railway.args'), '', 'railway never called');
  });

  it('a tunnel that cannot open refuses with 9 before prisma runs', () => {
    const c = migrateCase('fail');
    const r = runMigrate(c, ['apply', NAME, SHA]);
    assert.equal(r.status, 9, r.all);
    assert.equal(read(c, 'prisma.argv'), '', 'prisma never ran');
    assertClosed(c);
  });

  it('closes the tunnel when the deploy fails (7)', () => {
    const c = migrateCase();
    writeFileSync(join(c.stub, 'deploy.fail'), '');
    const r = runMigrate(c, ['apply', NAME, SHA]);
    assert.equal(r.status, 7);
    assertClosed(c);
  });

  it('rejects an unknown mode and an invalid port before anything else', () => {
    const c = migrateCase();
    assert.equal(runMigrate(c, ['check', NAME, SHA], { MAOS_DB_CONNECTION: 'public' }).status, 2);
    assert.equal(runMigrate(c, ['check', NAME, SHA], { MAOS_DB_TUNNEL_PORT: 'x' }).status, 9);
    assert.equal(read(c, 'railway.args'), '');
  });

  it('direct mode is unchanged and never calls Railway', () => {
    const c = migrateCase();
    const r = runMigrate(c, ['check', NAME, SHA], { MAOS_DB_CONNECTION: '' });
    assert.equal(r.status, 0, r.all);
    assert.equal(read(c, 'prisma.urls').trim().split('\n')[0], KEYCHAIN_URL);
    assert.equal(read(c, 'railway.args'), '');
  });
});

describe('one audited tunnel implementation', () => {
  it('the nightly backup and both tools source the same library', () => {
    assert.match(readFileSync(join(repoRoot, 'scripts/nightly-backup.sh'), 'utf8'), /\. "\$SCRIPT_DIR\/lib\/private-tunnel\.sh"/);
    assert.match(readFileSync(READONLY, 'utf8'), /\. "\$SCRIPT_DIR\/lib\/private-tunnel\.sh"/);
    assert.match(readFileSync(MIGRATE, 'utf8'), /\. "\$REPO\/scripts\/lib\/private-tunnel\.sh"/);
    assert.doesNotMatch(readFileSync(join(repoRoot, 'scripts/nightly-backup.sh'), 'utf8'), /^close_tunnel\(\)|^tunnel_url\(\)/m, 'no second copy');
  });

  it('the library reads no credential and asks Railway for nothing but the tunnel', () => {
    const lib = readFileSync(LIB, 'utf8');
    assert.doesNotMatch(lib, /find-generic-password|railway"? variables|DATABASE_PUBLIC_URL/);
    assert.match(lib, /"\$RAILWAY_BIN" connect Postgres --ssh --tunnel-only -P "\$TUNNEL_PORT"/);
  });
});
