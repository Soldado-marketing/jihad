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
# The credentials are passed to pg_dump through libpq's PGUSER/PGPASSWORD
# environment variables, so neither the password nor an authenticated
# connection string ever appears in the process list or in this script's
# output. Host, port, database and the query parameters remain in the --dbname
# URL: they are not secrets and keeping them there means no connection option
# can be lost in translation.

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

# Prisma's DATABASE_URL carries connection parameters that libpq does not
# understand — 'schema' above all, which apps/api/.env.example sets. pg_dump
# rejects the whole URI with "invalid URI query parameter", so the project's own
# connection string could not be backed up. Strip the Prisma-only parameters and
# keep everything else (sslmode, host, port, credentials) untouched.
strip_prisma_params() {
  local url="$1" base query kept=""
  base="${url%%\?*}"
  [[ "$url" == *\?* ]] || { printf '%s' "$url"; return; }
  query="${url#*\?}"

  local IFS='&' param
  for param in $query; do
    case "${param%%=*}" in
      schema|connection_limit|pool_timeout|connect_timeout_ms|pgbouncer|sslaccept|socket_timeout) ;;
      '') ;;
      *) kept="${kept:+${kept}&}${param}" ;;
    esac
  done

  printf '%s' "${base}${kept:+?${kept}}"
}

PGDUMP_URL="$(strip_prisma_params "$DATABASE_URL")"

# libpq percent-decodes the userinfo part of a URI; the environment variables
# below are taken literally. Only applied when a '%' is actually present, so an
# ordinary password passes through untouched.
percent_decode() {
  local s="$1"
  case "$s" in
    *%*) printf '%b' "${s//%/\\x}" ;;
    *)   printf '%s' "$s" ;;
  esac
}

# Move the credentials out of the URL and into libpq's own environment
# variables.
#
# pg_dump takes the connection string as a command-line ARGUMENT, and arguments
# are readable through `ps` by any process for as long as the dump runs — which
# on a large database is a long time. This file's header claimed the connection
# string never reaches the process list; until this change that was not true.
#
# Everything that is not a credential — scheme, host, port, database and every
# query parameter, sslmode above all — stays in the URL untouched, so the
# connection behaves exactly as before and nothing can be silently dropped.
# Splitting on the FIRST '@' is what the URI spec requires: a literal '@' inside
# a password must be percent-encoded.
PG_STRIPPED_URL="$PGDUMP_URL"
split_credentials() {
  local url="$1" scheme rest userinfo
  case "$url" in
    *://*) ;;
    *) return 0 ;;
  esac
  scheme="${url%%://*}"
  rest="${url#*://}"
  case "$rest" in
    *@*) ;;
    *) return 0 ;;
  esac
  userinfo="${rest%%@*}"
  PG_STRIPPED_URL="${scheme}://${rest#*@}"
  if [[ -n "${userinfo%%:*}" ]]; then
    PGUSER="$(percent_decode "${userinfo%%:*}")"
    export PGUSER
  fi
  case "$userinfo" in
    *:*)
      PGPASSWORD="$(percent_decode "${userinfo#*:}")"
      export PGPASSWORD
      ;;
  esac
}

split_credentials "$PGDUMP_URL"

mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${OUTPUT_DIR}/maos-${TIMESTAMP}.dump"

echo "Backing up to ${DUMP_FILE} ..."

# pg_dump creates the file before it can fail, and 'set -e' would exit before
# the emptiness check below. Without this, a failed run leaves a zero-byte file
# that a later restore could mistake for a backup.
cleanup_failed_dump() {
  [[ -s "$DUMP_FILE" ]] || rm -f "$DUMP_FILE"
}
trap cleanup_failed_dump EXIT

# -Fc  custom format: compressed and restorable selectively
# -Z9  maximum compression
# --no-owner / --no-privileges keep the dump portable across environments
pg_dump \
  --dbname="$PG_STRIPPED_URL" \
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
#
# Read line by line instead of `mapfile`: mapfile is bash 4+, and macOS still
# ships bash 3.2, where it fails with "command not found". Under `set -e` that
# aborted the script AFTER a valid dump and checksum had already been written —
# a successful backup reported as a failure. `read` is POSIX and behaves the
# same on both. Process substitution (not a pipe) keeps the loop in this shell,
# and `IFS=` with `read -r` preserves spaces and backslashes in paths.
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  echo "Pruning old backup: ${file}"
  rm -f "$file" "${file}.sha256"
done < <(ls -1t "${OUTPUT_DIR}"/maos-*.dump 2>/dev/null | tail -n +"$((RETENTION + 1))")

echo "Retention: keeping the newest ${RETENTION} backup(s)."
