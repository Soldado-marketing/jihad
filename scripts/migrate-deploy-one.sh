#!/usr/bin/env bash
#
# MAOS - apply ONE approved Prisma migration to production.
#
# This is not a migration system: it is a guard around the project's own
# `prisma migrate deploy`. It refuses to run unless the single approved
# migration is the only one pending, and its migration.sql has the approved
# sha256. Use it only inside an owner-approved migration window, after the
# fresh backup, sha256, `pg_restore --list` and isolated restore rehearsal of
# that window (see the migration's gate document in docs/migrations/).
#
# Usage (from a checkout of the approved commit, node_modules installed):
#   scripts/migrate-deploy-one.sh check <migration_folder> <sha256>
#   scripts/migrate-deploy-one.sh apply <migration_folder> <sha256>
#
#   check  read-only: every guard below, then stops. Writes nothing.
#   apply  the same guards, then `prisma migrate deploy`, then requires
#          `prisma migrate status` to report the database up to date.
#
# Guards (any failure stops before the database is written):
#   - apps/api/.env must not exist (no second credential source);
#   - apps/api/prisma has no uncommitted or untracked changes;
#   - the folder exists and migration.sql matches the full sha256 given;
#   - the credential is a PostgreSQL URL from the macOS Keychain (MAOS-T18
#     item, the one the nightly backup uses), kept in the environment only;
#   - `prisma migrate status`: no failed migration, no applied migration
#     missing locally, and the pending set is exactly <migration_folder>.
#
# The URL is never printed and never passed as an argument; tool output is
# filtered so a URL a tool might print is redacted.
#
# Environment:
#   MAOS_MIGRATE_KEYCHAIN_SERVICE  default maos-backup-database-url
#   MAOS_MIGRATE_KEYCHAIN_ACCOUNT  default maos
#   MAOS_SECURITY_BIN              default /usr/bin/security
#   MAOS_PRISMA_BIN                default apps/api/node_modules/.bin/prisma
#
# Exit codes:
#   0  check passed / migration applied and verified
#   2  usage
#   3  credential could not be obtained
#   4  checkout refused (.env present, uncommitted prisma changes, not git)
#   5  migration folder missing or sha256 mismatch
#   6  migration state refused (failed, missing locally, or pending set differs)
#   7  prisma migrate deploy failed
#   8  post-apply status is not up to date

set -uo pipefail

MODE="${1:-}"; NAME="${2:-}"; EXPECT_SHA="${3:-}"

usage() { echo "usage: $0 check|apply <migration_folder> <sha256>" >&2; exit 2; }
[ "$MODE" = check ] || [ "$MODE" = apply ] || usage
[[ "$NAME" =~ ^[0-9]{14}_[a-z0-9_]+$ ]] || usage
[[ "$EXPECT_SHA" =~ ^[0-9a-f]{64}$ ]] || usage

REPO="$(cd "$(dirname "$0")/.." && pwd)"
API="$REPO/apps/api"
MIGRATION="$API/prisma/migrations/$NAME/migration.sql"
SECURITY_BIN="${MAOS_SECURITY_BIN:-/usr/bin/security}"
PRISMA_BIN="${MAOS_PRISMA_BIN:-$API/node_modules/.bin/prisma}"
KEYCHAIN_SERVICE="${MAOS_MIGRATE_KEYCHAIN_SERVICE:-maos-backup-database-url}"
KEYCHAIN_ACCOUNT="${MAOS_MIGRATE_KEYCHAIN_ACCOUNT:-maos}"

refuse() { echo "REFUSED: $2" >&2; exit "$1"; }
redact() { sed -E -e 's#postgres(ql)?://[^[:space:]"'\'']*#<redacted-url>#g' -e '/^Datasource /d'; }

# --- checkout --------------------------------------------------------------
[ ! -e "$API/.env" ] || refuse 4 "apps/api/.env exists; remove it from this checkout"
git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 || refuse 4 "not a git checkout"
DIRTY="$(git -C "$REPO" status --porcelain -- apps/api/prisma)"
[ -z "$DIRTY" ] || refuse 4 "uncommitted or untracked changes under apps/api/prisma"
echo "checkout: $(git -C "$REPO" rev-parse HEAD)"

# --- migration file --------------------------------------------------------
[ -f "$MIGRATION" ] || refuse 5 "migration $NAME not found in this checkout"
ACTUAL_SHA="$(shasum -a 256 "$MIGRATION" | cut -d' ' -f1)"
[ "$ACTUAL_SHA" = "$EXPECT_SHA" ] || refuse 5 "sha256 of $NAME is $ACTUAL_SHA, approved $EXPECT_SHA"
echo "migration: $NAME sha256 MATCH"

# --- credential ------------------------------------------------------------
[ -x "$SECURITY_BIN" ] || refuse 3 "Keychain tool not found"
DATABASE_URL="$("$SECURITY_BIN" find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null)" \
  || refuse 3 "Keychain item $KEYCHAIN_SERVICE not readable"
case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *) DATABASE_URL=""; refuse 3 "Keychain item $KEYCHAIN_SERVICE is not a PostgreSQL URL" ;;
esac
export DATABASE_URL
echo "credential: keychain"

[ -x "$PRISMA_BIN" ] || refuse 4 "prisma CLI not found; run npm ci in apps/api"
cd "$API" || refuse 4 "cannot enter apps/api"

# --- migration state -------------------------------------------------------
# `migrate status` exits non-zero while migrations are pending, so its exit
# code is not used; its text is parsed and every unexpected state refuses.
status() { "$PRISMA_BIN" migrate status --schema prisma/schema.prisma 2>&1 | redact; }
ST="$(status)"
if echo "$ST" | grep -qiE 'have failed|failed to apply|not found locally|drift'; then
  echo "$ST" | tail -15 >&2
  refuse 6 "migration history is not clean"
fi
PENDING="$(echo "$ST" | sed -n '/not yet been applied/,/^[[:space:]]*$/p' | grep -oE '^[[:space:]]*[0-9]{14}_[A-Za-z0-9_]+' | tr -d '[:space:]')"
echo "pending: ${PENDING:-<none>}"
[ "$PENDING" = "$NAME" ] || refuse 6 "pending set is not exactly $NAME"

if [ "$MODE" = check ]; then
  echo "CHECK OK: only $NAME is pending and its sha256 matches; nothing was written"
  exit 0
fi

# --- apply -----------------------------------------------------------------
echo "applying $NAME"
"$PRISMA_BIN" migrate deploy --schema prisma/schema.prisma 2>&1 | redact
[ "${PIPESTATUS[0]}" -eq 0 ] || refuse 7 "prisma migrate deploy failed; do not deploy the code, follow the gate's containment"

ST="$(status)"
echo "$ST" | grep -q 'Database schema is up to date' || { echo "$ST" | tail -15 >&2; refuse 8 "status after apply is not up to date"; }
echo "APPLY OK: $NAME applied; database schema is up to date"
