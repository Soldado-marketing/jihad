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
# Connection modes (MAOS_DB_CONNECTION):
#   direct   (default) connect to the host in the Keychain URL, as before.
#   private  the production database has no public TCP proxy (MAOS-R01). After
#            every local guard has passed, Railway's private SSH tunnel is
#            opened with the helpers the nightly backup uses
#            (scripts/lib/private-tunnel.sh): the Keychain URL's host and port
#            are replaced in memory by the tunnel, sslmode=require; a listener
#            this run did not start is never used; the tunnel is closed on
#            success, refusal, failure and termination.
#
# Environment:
#   MAOS_MIGRATE_KEYCHAIN_SERVICE  default maos-backup-database-url
#   MAOS_MIGRATE_KEYCHAIN_ACCOUNT  default maos
#   MAOS_SECURITY_BIN              default /usr/bin/security
#   MAOS_PRISMA_BIN                default apps/api/node_modules/.bin/prisma
#   MAOS_DB_CONNECTION             direct (default) or private
#   MAOS_DB_TUNNEL_PORT            private: local port, default 15433 (the
#                                  nightly backup uses 15432)
#   MAOS_DB_TUNNEL_READY_SECONDS   private: readiness limit, default 60
#   MAOS_DB_TUNNEL_HOST            private: default 127.0.0.1 (prisma runs here)
#   MAOS_RAILWAY_BIN               default $HOME/.npm-global/bin/railway
#   MAOS_RAILWAY_DIR               default the repository root
#   MAOS_LSOF_BIN                  default /usr/sbin/lsof
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
#   9  private tunnel could not be opened, or a listener stayed open after it
#      was closed (an APPLY OK line above it still means the migration applied)
#   129/130/143  stopped by a signal (the tunnel is closed first)

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
CONNECTION="${MAOS_DB_CONNECTION:-direct}"

case "$CONNECTION" in
  direct|private) ;;
  *) echo "usage: MAOS_DB_CONNECTION must be direct or private" >&2; exit 2 ;;
esac

if [ "$CONNECTION" = private ]; then
  TUNNEL_PORT="${MAOS_DB_TUNNEL_PORT:-15433}"
  TUNNEL_READY_SECONDS="${MAOS_DB_TUNNEL_READY_SECONDS:-60}"
  TUNNEL_HOST="${MAOS_DB_TUNNEL_HOST:-127.0.0.1}"
  RAILWAY_BIN="${MAOS_RAILWAY_BIN:-$HOME/.npm-global/bin/railway}"
  RAILWAY_DIR="${MAOS_RAILWAY_DIR:-$REPO}"
  LSOF_BIN="${MAOS_LSOF_BIN:-/usr/sbin/lsof}"
  TUNNEL_RECORD=""
  TUNNEL_CLIENT="prisma"
  log() { echo "tunnel: $*" >&2; }
  # shellcheck source=lib/private-tunnel.sh
  . "$REPO/scripts/lib/private-tunnel.sh"
  tunnel_check_settings || { echo "REFUSED: $TUNNEL_ERROR" >&2; exit 9; }
  # Closed on every exit; a signal exits through the EXIT trap.
  trap close_tunnel EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
fi

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
echo "credential: keychain"

[ -x "$PRISMA_BIN" ] || refuse 4 "prisma CLI not found; run npm ci in apps/api"
cd "$API" || refuse 4 "cannot enter apps/api"

# --- private tunnel (after every local guard) -------------------------------
if [ "$CONNECTION" = private ]; then
  if ! PRIVATE_URL="$(tunnel_url "$DATABASE_URL")"; then
    DATABASE_URL=""
    refuse 3 "Keychain item $KEYCHAIN_SERVICE is not a usable PostgreSQL URL (user, host and database required)"
  fi
  DATABASE_URL="$PRIVATE_URL"
  PRIVATE_URL=""
  open_tunnel || refuse 9 "$TUNNEL_ERROR"
  echo "connection: private tunnel on 127.0.0.1:$TUNNEL_PORT"
fi
export DATABASE_URL

# A listener left open after closing makes the run fail (9) even when the
# migration step itself succeeded; the message says which.
finish_tunnel() {
  [ "$CONNECTION" = private ] || return 0
  close_tunnel
  [ "$TUNNEL_LEAK" = 1 ] && refuse 9 "port $TUNNEL_PORT is still listening after the tunnel was closed"
  return 0
}

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
  finish_tunnel
  exit 0
fi

# --- apply -----------------------------------------------------------------
echo "applying $NAME"
"$PRISMA_BIN" migrate deploy --schema prisma/schema.prisma 2>&1 | redact
[ "${PIPESTATUS[0]}" -eq 0 ] || refuse 7 "prisma migrate deploy failed; do not deploy the code, follow the gate's containment"

ST="$(status)"
echo "$ST" | grep -q 'Database schema is up to date' || { echo "$ST" | tail -15 >&2; refuse 8 "status after apply is not up to date"; }
echo "APPLY OK: $NAME applied; database schema is up to date"
finish_tunnel
