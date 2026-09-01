#!/usr/bin/env bash
#
# MAOS - PostgreSQL restore.
#
# SAFETY: this script never drops or overwrites an existing database. It
# restores into a NEW database that must not already exist. Promoting the
# restored copy to production is a deliberate, manual step (see the end of this
# file), which keeps an accidental run from destroying live data.
#
# Usage:
#   ADMIN_DATABASE_URL=postgresql://user:pass@host:5432/postgres \
#     ./scripts/restore-db.sh ./backups/maos-<timestamp>.dump maos_restored
#
# Environment:
#   ADMIN_DATABASE_URL  required - connection to an EXISTING database (e.g.
#                       'postgres') on the target server, used to create the
#                       new database. Never printed.

set -euo pipefail

DUMP_FILE="${1:-}"
TARGET_DB="${2:-}"

if [[ -z "$DUMP_FILE" || -z "$TARGET_DB" ]]; then
  echo "Usage: ADMIN_DATABASE_URL=... $0 <dump-file> <new-database-name>" >&2
  exit 1
fi

if [[ -z "${ADMIN_DATABASE_URL:-}" ]]; then
  echo "ERROR: ADMIN_DATABASE_URL is not set." >&2
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "ERROR: dump file not found: ${DUMP_FILE}" >&2
  exit 1
fi

# Refuse a target name that is not a plain identifier: the name is interpolated
# into SQL, so anything else is unsafe.
if ! [[ "$TARGET_DB" =~ ^[a-zA-Z][a-zA-Z0-9_]{0,62}$ ]]; then
  echo "ERROR: target database name must match ^[a-zA-Z][a-zA-Z0-9_]{0,62}$" >&2
  exit 1
fi

for tool in psql pg_restore; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: ${tool} not found. Install the PostgreSQL client tools." >&2
    exit 1
  fi
done

# Verify the checksum first: restoring a corrupted dump is worse than not
# restoring at all.
if [[ -f "${DUMP_FILE}.sha256" ]]; then
  echo "Verifying checksum ..."
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum --check --status "${DUMP_FILE}.sha256"
  else
    shasum -a 256 --check --status "${DUMP_FILE}.sha256"
  fi
  echo "Checksum OK."
else
  echo "WARNING: no .sha256 file next to the dump - integrity not verified." >&2
fi

# Fail if the target already exists. This is the guard that makes the script
# non-destructive: an existing database is never touched.
EXISTS="$(psql "$ADMIN_DATABASE_URL" -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}'")"

if [[ "$EXISTS" == "1" ]]; then
  echo "ERROR: database '${TARGET_DB}' already exists." >&2
  echo "Choose a new name. This script will not overwrite an existing database." >&2
  exit 1
fi

echo "Creating database '${TARGET_DB}' ..."
psql "$ADMIN_DATABASE_URL" -q -c "CREATE DATABASE \"${TARGET_DB}\""

# Build the target connection string by swapping the database segment of the
# admin URL, so credentials are not re-entered.
TARGET_URL="${ADMIN_DATABASE_URL%/*}/${TARGET_DB}"

echo "Restoring ${DUMP_FILE} into '${TARGET_DB}' ..."
pg_restore \
  --dbname="$TARGET_URL" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$DUMP_FILE"

echo
echo "OK: restored into '${TARGET_DB}'."
echo
echo "This script intentionally stopped short of touching your live database."
echo "To promote the restored copy, do it deliberately and with a fresh backup:"
echo "  1. Take a new backup of the current database."
echo "  2. Stop the API."
echo "  3. Repoint DATABASE_URL at '${TARGET_DB}' and restart."
echo "Renaming or dropping the existing database is left to you on purpose."
