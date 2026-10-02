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
#   DATABASE_URL        required - connection string (never printed)
#   BACKUP_RETENTION    optional - how many dumps to keep (default 14)
#   BACKUP_RETRIES      optional - extra attempts after a TRANSIENT connection
#                       failure, 0-5 (default 2). Anything else fails at once.
#   BACKUP_RETRY_DELAY  optional - seconds before the first retry, multiplied
#                       by the attempt number (default 30, max 600)
#
# pg_dump writes to <name>.dump.partial-<attempt>. Only a complete, non-empty dump is
# renamed to <name>.dump and checksummed; any failure removes the partial file,
# so a broken run can never leave something that looks like a backup.
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

RETRIES="${BACKUP_RETRIES:-2}"
RETRY_DELAY="${BACKUP_RETRY_DELAY:-30}"

# Bounded on purpose: a retry loop must never turn into a run that never ends.
if ! [[ "$RETRIES" =~ ^[0-9]$ ]] || [[ "$RETRIES" -gt 5 ]]; then
  echo "ERROR: BACKUP_RETRIES must be an integer between 0 and 5." >&2
  exit 1
fi

if ! [[ "$RETRY_DELAY" =~ ^[0-9]{1,3}$ ]] || [[ "$RETRY_DELAY" -gt 600 ]]; then
  echo "ERROR: BACKUP_RETRY_DELAY must be an integer between 0 and 600." >&2
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
# Each attempt writes to its own '<name>.dump.partial-<n>'. That name does not
# match the 'maos-*.dump' pattern used by retention and by anyone looking for
# backups, so an unfinished file is never mistaken for one. A fresh name per
# attempt matters on this Mac: pg_dump runs in Docker there, and re-creating a
# path the host has just deleted through the bind mount failed with "could not
# open output file ... No such file or directory" on the third attempt.
PARTIAL_FILE=""
ERR_FILE="${OUTPUT_DIR}/.maos-${TIMESTAMP}.pg_dump.err"
COMPLETED=0

echo "Backing up to ${DUMP_FILE} ..."

# pg_dump creates its output file before it can fail, and a connection that
# drops halfway leaves a NON-empty file behind. Whatever happens, nothing but a
# complete, checksummed dump may survive the run.
cleanup_failed_dump() {
  if [[ -n "$PARTIAL_FILE" ]]; then
    rm -f "$PARTIAL_FILE"
  fi
  rm -f "$ERR_FILE"
  if [[ "$COMPLETED" != 1 ]]; then
    rm -f "$DUMP_FILE" "${DUMP_FILE}.sha256"
  fi
}
trap cleanup_failed_dump EXIT

# Connection-level failures that a new connection can fix. Authentication,
# permission, missing-database and SQL errors are deliberately NOT here: they
# fail at once instead of being retried.
is_transient_failure() {
  grep -qiE \
    'SSL error|SSL SYSCALL error|unexpected eof|server closed the connection unexpectedly|no connection to the server|could not receive data from server|could not send data to server|Connection reset by peer|Connection refused|Connection timed out|Operation timed out|timeout expired|Network is unreachable|No route to host|could not translate host name|Temporary failure in name resolution|terminating connection due to administrator command' \
    "$1"
}

MAX_ATTEMPTS=$((RETRIES + 1))
ATTEMPT=1
while :; do
  echo "pg_dump attempt ${ATTEMPT}/${MAX_ATTEMPTS} ..."
  PARTIAL_FILE="${DUMP_FILE}.partial-${ATTEMPT}"
  rm -f "$PARTIAL_FILE"

  # -Fc  custom format: compressed and restorable selectively
  # -Z9  maximum compression
  # --no-owner / --no-privileges keep the dump portable across environments
  if pg_dump \
    --dbname="$PG_STRIPPED_URL" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="$PARTIAL_FILE" 2>"$ERR_FILE"; then
    cat "$ERR_FILE" >&2
    break
  else
    PG_STATUS=$?
  fi

  cat "$ERR_FILE" >&2
  rm -f "$PARTIAL_FILE"

  if ! is_transient_failure "$ERR_FILE"; then
    echo "ERROR: pg_dump failed (exit ${PG_STATUS}). Not a transient connection failure - not retrying." >&2
    exit 1
  fi

  if [[ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]]; then
    echo "ERROR: pg_dump failed after ${ATTEMPT} attempt(s); the last failure was a transient connection error (exit ${PG_STATUS})." >&2
    exit 1
  fi

  DELAY=$((RETRY_DELAY * ATTEMPT))
  echo "Transient connection failure on attempt ${ATTEMPT}/${MAX_ATTEMPTS}; retrying in ${DELAY}s ..." >&2
  sleep "$DELAY"
  ATTEMPT=$((ATTEMPT + 1))
done

if [[ ! -s "$PARTIAL_FILE" ]]; then
  echo "ERROR: backup file is empty - aborting." >&2
  exit 1
fi

# Same directory, so the rename is atomic: the final name only ever refers to
# a complete dump.
mv "$PARTIAL_FILE" "$DUMP_FILE"

# Checksum so a corrupted transfer is detectable before a restore is attempted.
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$DUMP_FILE" > "${DUMP_FILE}.sha256"
else
  shasum -a 256 "$DUMP_FILE" > "${DUMP_FILE}.sha256"
fi
# From here on the dump and its checksum are kept even if pruning fails.
COMPLETED=1

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
