#!/usr/bin/env bash
#
# MAOS - PostgreSQL backup.
#
# Creates a compressed custom-format dump plus a SHA-256 checksum, then prunes
# old backups by retention count.
#
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/backup-db.sh [output-dir]
#
# Environment:
#   DATABASE_URL       required - connection string (never printed)
#   BACKUP_RETENTION   optional - how many dumps to keep (default 14)
#
# The connection string is passed to pg_dump via the environment, so it never
# appears in the process list or in this script's output.

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
RETENTION="${BACKUP_RETENTION:-14}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found. Install the PostgreSQL client tools." >&2
  exit 1
fi

if ! [[ "$RETENTION" =~ ^[0-9]+$ ]] || [[ "$RETENTION" -lt 1 ]]; then
  echo "ERROR: BACKUP_RETENTION must be a positive integer." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${OUTPUT_DIR}/maos-${TIMESTAMP}.dump"

echo "Backing up to ${DUMP_FILE} ..."

# -Fc  custom format: compressed and restorable selectively
# -Z9  maximum compression
# --no-owner / --no-privileges keep the dump portable across environments
pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

if [[ ! -s "$DUMP_FILE" ]]; then
  echo "ERROR: backup file is empty - aborting." >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

# Checksum so a corrupted transfer is detectable before a restore is attempted.
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$DUMP_FILE" > "${DUMP_FILE}.sha256"
else
  shasum -a 256 "$DUMP_FILE" > "${DUMP_FILE}.sha256"
fi

SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "OK: ${DUMP_FILE} (${SIZE})"

# Prune by count, newest first. Only files this script's naming scheme created
# are ever considered, so nothing else in the directory can be removed.
mapfile -t OLD < <(ls -1t "${OUTPUT_DIR}"/maos-*.dump 2>/dev/null | tail -n +"$((RETENTION + 1))")
for file in "${OLD[@]:-}"; do
  [[ -n "$file" ]] || continue
  echo "Pruning old backup: ${file}"
  rm -f "$file" "${file}.sha256"
done

echo "Retention: keeping the newest ${RETENTION} backup(s)."
