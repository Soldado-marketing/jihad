#!/usr/bin/env bash
#
# MAOS - restore rehearsal.
#
# Proves that a backup can actually be restored: verifies the dump's checksum,
# restores it with scripts/restore-db.sh into a brand-new database inside a
# throwaway PostgreSQL container, checks the result, prints a report and
# removes the container.
#
# SAFETY:
#   - The container runs with `--network none` and publishes no port, so the
#     rehearsal can never reach a real database server, production included.
#   - The dump, its checksum and the scripts are mounted read-only.
#   - Trust authentication exists only inside that isolated container; no
#     password is used or printed anywhere.
#   - The container is removed on success and on every failure.
#
# Usage:
#   ./scripts/restore-rehearsal.sh <dump-file>
#
# The dump must have its <dump-file>.sha256 next to it (backup-db.sh writes it).
#
# Environment (all optional):
#   REHEARSAL_PG_IMAGE        PostgreSQL image; must be at least the major version
#                             of the pg_dump that made the dump. Default postgres:18.
#   REHEARSAL_READY_ATTEMPTS  readiness checks before giving up. Default 60.
#   REHEARSAL_POLL_INTERVAL   seconds between readiness checks. Default 1.
#   REHEARSAL_REPORT          also write the report to this file.
#
# Exit status: 0 only when the restore succeeded and every check passed.

set -euo pipefail

DUMP_FILE="${1:-}"
IMAGE="${REHEARSAL_PG_IMAGE:-postgres:18}"
READY_ATTEMPTS="${REHEARSAL_READY_ATTEMPTS:-60}"
POLL_INTERVAL="${REHEARSAL_POLL_INTERVAL:-1}"
TARGET_DB="maos_rehearsal"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ -z "$DUMP_FILE" ]]; then
  echo "Usage: $0 <dump-file>" >&2
  exit 1
fi

[[ -f "$DUMP_FILE" ]] || fail "dump file not found: ${DUMP_FILE}"
[[ -f "${DUMP_FILE}.sha256" ]] || fail "no ${DUMP_FILE}.sha256 next to the dump - a rehearsal must prove integrity first."

# Verify the checksum on the host before anything is started. Only the hash is
# compared: the .sha256 file records the path the dump had when it was written.
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SUM="$(sha256sum "$DUMP_FILE")"
else
  ACTUAL_SUM="$(shasum -a 256 "$DUMP_FILE")"
fi
EXPECTED_SUM="$(cat "${DUMP_FILE}.sha256")"
if [[ "${ACTUAL_SUM%% *}" != "${EXPECTED_SUM%% *}" ]]; then
  fail "checksum mismatch - the dump is corrupt. Refusing to rehearse."
fi

command -v docker >/dev/null 2>&1 || fail "docker not found on PATH."
docker info >/dev/null 2>&1 || fail "the Docker daemon is not running."

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$(cd "$(dirname "$DUMP_FILE")" && pwd)"
DUMP_NAME="$(basename "$DUMP_FILE")"
CONTAINER="maos-rehearsal-$(date -u +%Y%m%dT%H%M%SZ)-$$"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Checksum OK: ${DUMP_NAME}"
echo "Starting isolated PostgreSQL (${IMAGE}, no network) ..."
docker run --detach \
  --name "$CONTAINER" \
  --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --volume "${DUMP_DIR}/${DUMP_NAME}:/rehearsal/dump/${DUMP_NAME}:ro" \
  --volume "${DUMP_DIR}/${DUMP_NAME}.sha256:/rehearsal/dump/${DUMP_NAME}.sha256:ro" \
  --volume "${SCRIPTS_DIR}:/rehearsal/scripts:ro" \
  "$IMAGE" >/dev/null

# The image's init phase runs a socket-only server and then restarts, so the
# TCP check on 127.0.0.1 only succeeds once the final server is up.
ready=0
for _ in $(seq 1 "$READY_ATTEMPTS"); do
  if docker exec "$CONTAINER" pg_isready -q -h 127.0.0.1 -p 5432 -U postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep "$POLL_INTERVAL"
done
[[ "$ready" == 1 ]] || fail "PostgreSQL in the rehearsal container was not ready after ${READY_ATTEMPTS} checks."

echo "Restoring into '${TARGET_DB}' ..."
if ! docker exec \
  --env "ADMIN_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres" \
  "$CONTAINER" \
  bash /rehearsal/scripts/restore-db.sh "/rehearsal/dump/${DUMP_NAME}" "$TARGET_DB"; then
  fail "restore failed (see output above)."
fi

query() {
  docker exec "$CONTAINER" psql -h 127.0.0.1 -U postgres -d "$TARGET_DB" -v ON_ERROR_STOP=1 -tA -c "$1"
}

TABLES="$(query "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")" \
  || fail "could not count restored tables."
[[ "$TABLES" =~ ^[0-9]+$ ]] || fail "unexpected table count: ${TABLES}"
(( TABLES > 0 )) || fail "the restore contains no tables."

APPLIED="$(query "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")" \
  || fail "could not read _prisma_migrations - no applied Prisma migrations found."
[[ "$APPLIED" =~ ^[0-9]+$ ]] || fail "unexpected migration count: ${APPLIED}"
(( APPLIED > 0 )) || fail "the restore has no applied Prisma migrations."

FAILED="$(query "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL")" \
  || fail "could not check for failed migrations."
[[ "$FAILED" =~ ^[0-9]+$ ]] || fail "unexpected failed-migration count: ${FAILED}"
(( FAILED == 0 )) || fail "the restore has ${FAILED} failed or unfinished Prisma migration(s)."

# Row counts per table. Names and counts only - no row data leaves the container.
ROWS="$(query "SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', table_name), false, true, '')))[1]::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name")" \
  || fail "could not count rows per table."

REPORT="$(
  echo "MAOS restore rehearsal"
  echo "Dump: ${DUMP_NAME}"
  echo "Image: ${IMAGE}"
  echo "Checked at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Tables restored: ${TABLES}"
  echo "Prisma migrations applied: ${APPLIED}"
  echo
  echo "Rows per table:"
  while IFS='|' read -r table count; do
    [[ -n "$table" ]] && printf '  %-40s %s\n' "$table" "$count"
  done <<< "$ROWS"
  echo
  echo "REHEARSAL OK"
)"

echo
echo "$REPORT"
if [[ -n "${REHEARSAL_REPORT:-}" ]]; then
  printf '%s\n' "$REPORT" > "$REHEARSAL_REPORT"
fi
