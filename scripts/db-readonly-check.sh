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
# Usage: scripts/db-readonly-check.sh <file.sql>
#
# Environment:
#   MAOS_MIGRATE_KEYCHAIN_SERVICE  default maos-backup-database-url
#   MAOS_MIGRATE_KEYCHAIN_ACCOUNT  default maos
#   MAOS_SECURITY_BIN              default /usr/bin/security
#   MAOS_DOCKER_BIN                default docker
#
# Exit codes: 0 ok, 2 usage, 3 credential, 4 docker not running, other = psql.

set -uo pipefail

SQL_FILE="${1:-}"
[ -n "$SQL_FILE" ] && [ -f "$SQL_FILE" ] || { echo "usage: $0 <file.sql>" >&2; exit 2; }

SECURITY_BIN="${MAOS_SECURITY_BIN:-/usr/bin/security}"
DOCKER_BIN="${MAOS_DOCKER_BIN:-docker}"
KEYCHAIN_SERVICE="${MAOS_MIGRATE_KEYCHAIN_SERVICE:-maos-backup-database-url}"
KEYCHAIN_ACCOUNT="${MAOS_MIGRATE_KEYCHAIN_ACCOUNT:-maos}"

"$DOCKER_BIN" info >/dev/null 2>&1 || { echo "REFUSED: Docker is not running" >&2; exit 4; }

MAOS_PG_URL="$("$SECURITY_BIN" find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null)" \
  || { echo "REFUSED: Keychain item $KEYCHAIN_SERVICE not readable" >&2; exit 3; }
case "$MAOS_PG_URL" in
  postgres://*|postgresql://*) ;;
  *) echo "REFUSED: Keychain item $KEYCHAIN_SERVICE is not a PostgreSQL URL" >&2; exit 3 ;;
esac
export MAOS_PG_URL

"$DOCKER_BIN" run --rm -i -e MAOS_PG_URL -e PGOPTIONS='-c default_transaction_read_only=on' postgres:18 \
  sh -c 'psql "$MAOS_PG_URL" -X -q -v ON_ERROR_STOP=1' < "$SQL_FILE" 2>&1 \
  | sed -E 's#postgres(ql)?://[^[:space:]"'\'']*#<redacted-url>#g'
exit "${PIPESTATUS[0]}"
