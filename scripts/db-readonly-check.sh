#!/usr/bin/env bash
#
# MAOS - run a read-only SQL check file against production.
#
# Used for a migration window's prechecks and post-apply verification (for
# example docs/migrations/T56_precheck.sql). The session is forced read-only
# (default_transaction_read_only=on), so a check file cannot write. psql runs
# in the postgres:18 image; the URL comes from the Keychain (the item the
# nightly backup uses) and reaches the container by variable NAME only, so it
# never appears in an argument list or in the output.
#
# Connection modes (MAOS_DB_CONNECTION):
#   direct   (default) connect to the host in the Keychain URL, as before.
#   private  the production database has no public TCP proxy (MAOS-R01). The
#            script opens Railway's private SSH tunnel with the helpers the
#            nightly backup uses (scripts/lib/private-tunnel.sh): the Keychain
#            URL's host and port are replaced in memory by the tunnel,
#            sslmode=require; a listener this run did not start is never used;
#            the tunnel is closed on success, failure and termination.
#
# Usage: scripts/db-readonly-check.sh <file.sql>
#
# Environment:
#   MAOS_MIGRATE_KEYCHAIN_SERVICE  default maos-backup-database-url
#   MAOS_MIGRATE_KEYCHAIN_ACCOUNT  default maos
#   MAOS_SECURITY_BIN              default /usr/bin/security
#   MAOS_DOCKER_BIN                default docker
#   MAOS_DB_CONNECTION             direct (default) or private
#   MAOS_DB_TUNNEL_PORT            private: local port, default 15433 (the
#                                  nightly backup uses 15432)
#   MAOS_DB_TUNNEL_READY_SECONDS   private: readiness limit, default 60
#   MAOS_DB_TUNNEL_HOST            private: host psql (in Docker) uses to reach
#                                  the tunnel, default host.docker.internal
#   MAOS_RAILWAY_BIN               default $HOME/.npm-global/bin/railway
#   MAOS_RAILWAY_DIR               directory linked to the Railway project;
#                                  default the repository root
#   MAOS_LSOF_BIN                  default /usr/sbin/lsof
#
# Exit codes: 0 ok, 2 usage, 3 credential, 4 docker not running, 5 private
# tunnel could not be opened or closed, 129/130/143 stopped by a signal,
# other = psql.

set -uo pipefail

SQL_FILE="${1:-}"
[ -n "$SQL_FILE" ] && [ -f "$SQL_FILE" ] || { echo "usage: $0 <file.sql>" >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_BIN="${MAOS_SECURITY_BIN:-/usr/bin/security}"
DOCKER_BIN="${MAOS_DOCKER_BIN:-docker}"
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
  TUNNEL_HOST="${MAOS_DB_TUNNEL_HOST:-host.docker.internal}"
  RAILWAY_BIN="${MAOS_RAILWAY_BIN:-$HOME/.npm-global/bin/railway}"
  RAILWAY_DIR="${MAOS_RAILWAY_DIR:-$(dirname "$SCRIPT_DIR")}"
  LSOF_BIN="${MAOS_LSOF_BIN:-/usr/sbin/lsof}"
  TUNNEL_RECORD=""
  TUNNEL_CLIENT="psql"
  log() { echo "tunnel: $*" >&2; }
  # shellcheck source=lib/private-tunnel.sh
  . "$SCRIPT_DIR/lib/private-tunnel.sh"
  tunnel_check_settings || { echo "REFUSED: $TUNNEL_ERROR" >&2; exit 5; }
  # Closed on every exit; a signal exits through the EXIT trap.
  trap close_tunnel EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
fi

"$DOCKER_BIN" info >/dev/null 2>&1 || { echo "REFUSED: Docker is not running" >&2; exit 4; }

MAOS_PG_URL="$("$SECURITY_BIN" find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null)" \
  || { echo "REFUSED: Keychain item $KEYCHAIN_SERVICE not readable" >&2; exit 3; }
case "$MAOS_PG_URL" in
  postgres://*|postgresql://*) ;;
  *) MAOS_PG_URL=""; echo "REFUSED: Keychain item $KEYCHAIN_SERVICE is not a PostgreSQL URL" >&2; exit 3 ;;
esac

if [ "$CONNECTION" = private ]; then
  if ! PRIVATE_URL="$(tunnel_url "$MAOS_PG_URL")"; then
    MAOS_PG_URL=""
    echo "REFUSED: Keychain item $KEYCHAIN_SERVICE is not a usable PostgreSQL URL (user, host and database required)" >&2
    exit 3
  fi
  MAOS_PG_URL="$PRIVATE_URL"
  PRIVATE_URL=""
  open_tunnel || { echo "REFUSED: $TUNNEL_ERROR" >&2; exit 5; }
fi
export MAOS_PG_URL

"$DOCKER_BIN" run --rm -i -e MAOS_PG_URL -e PGOPTIONS='-c default_transaction_read_only=on' postgres:18 \
  sh -c 'psql "$MAOS_PG_URL" -X -q -v ON_ERROR_STOP=1' < "$SQL_FILE" 2>&1 \
  | sed -E 's#postgres(ql)?://[^[:space:]"'\'']*#<redacted-url>#g'
STATUS="${PIPESTATUS[0]}"

if [ "$CONNECTION" = private ]; then
  close_tunnel
  if [ "$TUNNEL_LEAK" = 1 ]; then
    echo "REFUSED: port $TUNNEL_PORT is still listening after the tunnel was closed" >&2
    exit 5
  fi
fi
exit "$STATUS"
