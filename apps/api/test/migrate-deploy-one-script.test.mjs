/**
 * Single-migration production runner - behaviour tests (MAOS-T56 window).
 * Run: node --test test/migrate-deploy-one-script.test.mjs
 *
 * scripts/migrate-deploy-one.sh is the operator procedure for applying ONE
 * owner-approved migration. It is RUN here inside a throwaway git checkout,
 * with stub `security` (Keychain) and `prisma` binaries, so no database and
 * no Keychain are touched. The tests prove that it:
 *
 *   - refuses (before any database call) a wrong sha256, an unknown folder,
 *     uncommitted or untracked prisma changes, a present .env, bad usage;
 *   - refuses an unreadable or non-PostgreSQL credential;
 *   - refuses when the pending set is not exactly the approved migration,
 *     when nothing is pending, and when the history has a failed migration;
 *   - in `check` mode never calls `migrate deploy`;
 *   - in `apply` mode calls `migrate deploy` once and requires "up to date";
 *   - never prints the URL or passes it as an argument.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const SCRIPT = join(repoRoot, 'scripts/migrate-deploy-one.sh');

const scratch = mkdtempSync(join(tmpdir(), 'maos-migrate-one-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const DB_URL = 'postgresql://maos:M1grate%40Secret@db.example:5432/railway?sslmode=require';
const NAME = '20261014155254_project_enrichment';
const OTHER = '20261020000000_something_else';
const SQL = 'ALTER TABLE "Project" ADD COLUMN "x" TEXT;\n';
const SHA = createHash('sha256').update(SQL).digest('hex');

function writeExe(path, body) {
  writeFileSync(path, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

let caseNo = 0;
/**
 * A checkout with the script and one committed migration. The prisma stub
 * reads $STUB_DIR/status.<n> for its n-th `migrate status` call (falling back
 * to status), records every argv, and exits per $STUB_DIR/deploy.fail.
 */
function makeCase({ status = pendingOnly(NAME), statusAfter = upToDate(), keychain = DB_URL } = {}) {
  caseNo += 1;
  const dir = join(scratch, `case-${caseNo}`);
  const stub = join(dir, 'stub');
  const mig = join(dir, 'apps/api/prisma/migrations', NAME);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(mig, { recursive: true });
  mkdirSync(stub, { recursive: true });
  copyFileSync(SCRIPT, join(dir, 'scripts/migrate-deploy-one.sh'));
  writeFileSync(join(dir, 'apps/api/prisma/schema.prisma'), '// schema\n');
  writeFileSync(join(mig, 'migration.sql'), SQL);
  git(dir, 'init', '-q');
  git(dir, 'add', '.');
  git(dir, '-c', 'user.email=t@example.invalid', '-c', 'user.name=t', 'commit', '-qm', 'init');

  writeFileSync(join(stub, 'status.1'), status);
  writeFileSync(join(stub, 'status.2'), statusAfter);
  if (keychain !== null) writeFileSync(join(stub, 'keychain'), keychain);
  writeExe(
    join(stub, 'security'),
    `[ -f "$STUB_DIR/keychain" ] || exit 44; cat "$STUB_DIR/keychain"`,
  );
  writeExe(
    join(stub, 'prisma'),
    `echo "$*" >> "$STUB_DIR/prisma.argv"
echo "Datasource \\"db\\": PostgreSQL database at $DATABASE_URL"
if [ "$1 $2" = "migrate status" ]; then
  n=$(( $(cat "$STUB_DIR/status.count" 2>/dev/null || echo 0) + 1 )); echo $n > "$STUB_DIR/status.count"
  cat "$STUB_DIR/status.$n" 2>/dev/null || cat "$STUB_DIR/status.2"; exit 1
fi
if [ "$1 $2" = "migrate deploy" ]; then
  echo deployed >> "$STUB_DIR/deploy.calls"; echo "connected to $DATABASE_URL"
  [ -e "$STUB_DIR/deploy.fail" ] && exit 1; exit 0
fi
exit 9`,
  );
  return { dir, stub };
}

function run(c, ...args) {
  const r = spawnSync('bash', [join(c.dir, 'scripts/migrate-deploy-one.sh'), ...args], {
    cwd: c.dir,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: c.dir,
      STUB_DIR: c.stub,
      MAOS_SECURITY_BIN: join(c.stub, 'security'),
      MAOS_PRISMA_BIN: join(c.stub, 'prisma'),
    },
  });
  return { ...r, all: `${r.stdout}${r.stderr}` };
}

function pendingOnly(...names) {
  return `2 migrations found in prisma/migrations\n\nFollowing migration have not yet been applied:\n${names.join('\n')}\n\nTo apply migrations in production run prisma migrate deploy.\n`;
}
function upToDate() {
  return '14 migrations found in prisma/migrations\n\nDatabase schema is up to date!\n';
}
const deployCalls = (c) => (existsSync(join(c.stub, 'deploy.calls')) ? readFileSync(join(c.stub, 'deploy.calls'), 'utf8').trim().split('\n').length : 0);
const prismaCalls = (c) => (existsSync(join(c.stub, 'prisma.argv')) ? readFileSync(join(c.stub, 'prisma.argv'), 'utf8') : '');

function assertNoSecret(c, r) {
  assert.ok(!r.all.includes('M1grate'), 'URL/password must never be printed');
  assert.ok(!r.all.includes('db.example'), 'URL must be redacted');
  assert.ok(!prismaCalls(c).includes('M1grate'), 'URL must never be an argument');
}

describe('migrate-deploy-one.sh: guards before the database', () => {
  it('rejects bad usage', () => {
    const c = makeCase();
    assert.equal(run(c).status, 2);
    assert.equal(run(c, 'deploy', NAME, SHA).status, 2);
    assert.equal(run(c, 'check', NAME, SHA.slice(0, 12)).status, 2);
    assert.equal(run(c, 'check', '../x', SHA).status, 2);
    assert.equal(prismaCalls(c), '');
  });

  it('refuses a sha256 mismatch without calling prisma', () => {
    const c = makeCase();
    const r = run(c, 'apply', NAME, 'a'.repeat(64));
    assert.equal(r.status, 5);
    assert.match(r.stderr, /sha256 of .* is [0-9a-f]{64}, approved a{64}/);
    assert.equal(prismaCalls(c), '');
  });

  it('refuses an unknown migration folder', () => {
    const c = makeCase();
    assert.equal(run(c, 'check', OTHER, SHA).status, 5);
  });

  it('refuses uncommitted or untracked prisma changes', () => {
    const c = makeCase();
    writeFileSync(join(c.dir, 'apps/api/prisma/migrations', NAME, 'migration.sql'), `${SQL}-- edit\n`);
    assert.equal(run(c, 'check', NAME, SHA).status, 4);
    const d = makeCase();
    mkdirSync(join(d.dir, 'apps/api/prisma/migrations', OTHER));
    writeFileSync(join(d.dir, 'apps/api/prisma/migrations', OTHER, 'migration.sql'), 'SELECT 1;\n');
    const r = run(d, 'apply', NAME, SHA);
    assert.equal(r.status, 4);
    assert.equal(deployCalls(d), 0);
  });

  it('refuses when apps/api/.env exists', () => {
    const c = makeCase();
    writeFileSync(join(c.dir, 'apps/api/.env'), 'X=1\n');
    assert.equal(run(c, 'check', NAME, SHA).status, 4);
  });

  it('refuses a missing or non-PostgreSQL credential', () => {
    assert.equal(run(makeCase({ keychain: null }), 'check', NAME, SHA).status, 3);
    const c = makeCase({ keychain: 'mysql://x' });
    const r = run(c, 'check', NAME, SHA);
    assert.equal(r.status, 3);
    assert.equal(prismaCalls(c), '');
  });
});

describe('migrate-deploy-one.sh: migration state', () => {
  it('refuses when another migration is also pending', () => {
    const c = makeCase({ status: pendingOnly(NAME, OTHER) });
    const r = run(c, 'apply', NAME, SHA);
    assert.equal(r.status, 6);
    assert.equal(deployCalls(c), 0);
    assertNoSecret(c, r);
  });

  it('refuses when nothing is pending', () => {
    const c = makeCase({ status: upToDate() });
    assert.equal(run(c, 'apply', NAME, SHA).status, 6);
    assert.equal(deployCalls(c), 0);
  });

  it('refuses a history with a failed migration', () => {
    const c = makeCase({ status: `Following migration have failed:\n${OTHER}\n\n${pendingOnly(NAME)}` });
    assert.equal(run(c, 'apply', NAME, SHA).status, 6);
    assert.equal(deployCalls(c), 0);
  });

  it('refuses applied migrations missing locally', () => {
    const c = makeCase({ status: `The migrations from the database are not found locally in prisma/migrations:\n${OTHER}\n` });
    assert.equal(run(c, 'apply', NAME, SHA).status, 6);
  });

  it('check passes without deploying and without printing the URL', () => {
    const c = makeCase();
    const r = run(c, 'check', NAME, SHA);
    assert.equal(r.status, 0, r.all);
    assert.match(r.stdout, /CHECK OK/);
    assert.equal(deployCalls(c), 0);
    assert.ok(!prismaCalls(c).includes('deploy'));
    assertNoSecret(c, r);
  });
});

describe('migrate-deploy-one.sh: apply', () => {
  it('deploys once and requires up to date afterwards', () => {
    const c = makeCase();
    const r = run(c, 'apply', NAME, SHA);
    assert.equal(r.status, 0, r.all);
    assert.match(r.stdout, /APPLY OK/);
    assert.equal(deployCalls(c), 1);
    assertNoSecret(c, r);
  });

  it('reports a failed deploy with its own exit code', () => {
    const c = makeCase();
    writeFileSync(join(c.stub, 'deploy.fail'), '');
    const r = run(c, 'apply', NAME, SHA);
    assert.equal(r.status, 7);
    assertNoSecret(c, r);
  });

  it('fails when the status after apply is not up to date', () => {
    const c = makeCase({ statusAfter: pendingOnly(NAME) });
    assert.equal(run(c, 'apply', NAME, SHA).status, 8);
  });
});

const READONLY = join(repoRoot, 'scripts/db-readonly-check.sh');

describe('db-readonly-check.sh', () => {
  function roCase({ keychain = DB_URL, dockerDown = false } = {}) {
    caseNo += 1;
    const dir = join(scratch, `ro-${caseNo}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'check.sql'), 'SELECT 1;\n');
    if (keychain !== null) writeFileSync(join(dir, 'keychain'), keychain);
    writeExe(join(dir, 'security'), `[ -f "$STUB_DIR/keychain" ] || exit 44; cat "$STUB_DIR/keychain"`);
    writeExe(
      join(dir, 'docker'),
      `[ "$1" = info ] && { [ -e "$STUB_DIR/down" ] && exit 1; exit 0; }
printf '%s\\n' "$@" > "$STUB_DIR/docker.argv"; echo "$MAOS_PG_URL" > "$STUB_DIR/docker.env"
cat > "$STUB_DIR/docker.stdin"; echo "psql: connected to $MAOS_PG_URL"; exit 0`,
    );
    if (dockerDown) writeFileSync(join(dir, 'down'), '');
    const r = spawnSync('bash', [READONLY, join(dir, 'check.sql')], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH, STUB_DIR: dir, MAOS_SECURITY_BIN: join(dir, 'security'), MAOS_DOCKER_BIN: join(dir, 'docker') },
    });
    return { dir, r, all: `${r.stdout}${r.stderr}` };
  }

  it('forces a read-only session and keeps the URL out of argv and output', () => {
    const { dir, r, all } = roCase();
    assert.equal(r.status, 0, all);
    const argv = readFileSync(join(dir, 'docker.argv'), 'utf8');
    assert.match(argv, /PGOPTIONS=-c default_transaction_read_only=on/);
    assert.ok(!argv.includes('M1grate'));
    assert.equal(readFileSync(join(dir, 'docker.env'), 'utf8').trim(), DB_URL);
    assert.equal(readFileSync(join(dir, 'docker.stdin'), 'utf8'), 'SELECT 1;\n');
    assert.ok(!all.includes('M1grate') && !all.includes('db.example'));
  });

  it('refuses a non-PostgreSQL credential, a missing one, and a stopped Docker', () => {
    assert.equal(roCase({ keychain: 'mysql://x' }).r.status, 3);
    assert.equal(roCase({ keychain: null }).r.status, 3);
    assert.equal(roCase({ dockerDown: true }).r.status, 4);
  });

  it('rejects a missing SQL file', () => {
    const r = spawnSync('bash', [READONLY, join(scratch, 'nope.sql')], { encoding: 'utf8' });
    assert.equal(r.status, 2);
  });
});
