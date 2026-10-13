#!/usr/bin/env bash
#
# MAOS - scheduled production backup runner.
#
# Entry point for the nightly LaunchAgent on the backup Mac. Prepares a
# non-interactive environment, obtains the database URL, runs
# scripts/backup-db.sh (which stays authoritative for dumping, retries,
# checksums and retention) and logs the outcome.
#
# No credential is stored here. The connection string comes from the macOS
# Keychain (MAOS-T18; stored once by the owner) or, as a fallback, from the
# authenticated Railway CLI at run time. It exists only in this process and
# its children, never in an argument list, and is redacted from everything
# written to the log.
#
# Guards:
#   - one run at a time (lock directory with the owner's pid; a lock whose
#     process is gone is taken over);
#   - a maximum duration, after which the backup is stopped and any partial
#     dump is removed.
#
# Exit status:
#   0   backup succeeded
#   1+  backup-db.sh failed (its own exit status)
#   2   tooling missing (Docker daemon, Railway CLI)
#   3   database URL could not be obtained (missing Keychain item, expired
#       Railway login, or a Keychain value that is not a PostgreSQL URL)
#   4   backup exceeded MAOS_BACKUP_MAX_SECONDS and was stopped
#   75  another run holds the lock
#
# Every failure also raises an alert through scripts/backup-alert.sh
# (MAOS-T19). A skipped run (75) is not a failure and stays silent: the run
# holding the lock reports for itself.
#
# Environment (all optional):
#   MAOS_BACKUP_HOME         default $HOME/MAOS_BACKUPS (production/, logs/)
#   MAOS_BACKUP_MAX_SECONDS  default 7200
#   BACKUP_RETENTION         passed to backup-db.sh, default 14
#   DOCKER_BIN               default /usr/local/bin/docker
#   RAILWAY_BIN              default $HOME/.npm-global/bin/railway
#   MAOS_BACKUP_CREDENTIAL_SOURCE
#                            auto (default: Keychain, then Railway CLI),
#                            keychain (Keychain only) or railway (CLI only)
#   MAOS_BACKUP_KEYCHAIN_SERVICE  default maos-backup-database-url
#   MAOS_BACKUP_KEYCHAIN_ACCOUNT  default maos
#   SECURITY_BIN             default /usr/bin/security
#   MAOS_RAILWAY_DIR         directory linked to the Railway project; default
#                            the repository root
#   MAOS_BACKUP_PG_DUMP      docker (default: use scripts/pg-dump-docker.sh as
#                            pg_dump) or path (use pg_dump from PATH)
#   MAOS_BACKUP_SCRIPT       backup script; default scripts/backup-db.sh
#   MAOS_BACKUP_ALERT        alert command; default scripts/backup-alert.sh

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$SCRIPT_DIR")"

BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
OUT="$BACKUP_HOME/production"
LOG="$BACKUP_HOME/logs/backup.log"
LOCK="$BACKUP_HOME/.nightly-backup.lock"
MAX_SECONDS="${MAOS_BACKUP_MAX_SECONDS:-7200}"
DOCKER_BIN="${DOCKER_BIN:-/usr/local/bin/docker}"
RAILWAY_BIN="${RAILWAY_BIN:-$HOME/.npm-global/bin/railway}"
CREDENTIAL_SOURCE="${MAOS_BACKUP_CREDENTIAL_SOURCE:-auto}"
KEYCHAIN_SERVICE="${MAOS_BACKUP_KEYCHAIN_SERVICE:-maos-backup-database-url}"
KEYCHAIN_ACCOUNT="${MAOS_BACKUP_KEYCHAIN_ACCOUNT:-maos}"
SECURITY_BIN="${SECURITY_BIN:-/usr/bin/security}"
RAILWAY_DIR="${MAOS_RAILWAY_DIR:-$REPO}"
PG_DUMP_MODE="${MAOS_BACKUP_PG_DUMP:-docker}"
BACKUP_SCRIPT="${MAOS_BACKUP_SCRIPT:-$SCRIPT_DIR/backup-db.sh}"
ALERT="${MAOS_BACKUP_ALERT:-$SCRIPT_DIR/backup-alert.sh}"

# Absolute paths only: launchd gives a minimal PATH, never the login shell's.
PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH DOCKER_BIN

mkdir -p "$OUT" "$(dirname "$LOG")"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG"; }
redact() { sed -e 's#postgres[a-zA-Z]*://[^ "]*#<REDACTED>#g'; }

log "=== run start ==="

# ── One run at a time ─────────────────────────────────────────────────────────
if ! mkdir "$LOCK" 2>/dev/null; then
  OLD_PID="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    log "SKIP: another backup run is in progress (pid $OLD_PID)"
    exit 75
  fi
  log "taking over stale lock (pid ${OLD_PID:-unknown} is not running)"
  rm -rf "$LOCK"
  if ! mkdir "$LOCK" 2>/dev/null; then
    log "SKIP: could not acquire the lock"
    exit 75
  fi
fi
echo "$$" > "$LOCK/pid"

TMP=""
SHIM_DIR=""
cleanup() {
  [ -n "$TMP" ] && rm -f "$TMP"
  [ -n "$SHIM_DIR" ] && rm -rf "$SHIM_DIR"
  rm -rf "$LOCK"
}
trap cleanup EXIT

finish() {
  log "$1"
  log "=== run end ==="
  if [ "$2" -ne 0 ]; then
    "$ALERT" "Nightly backup failed - $1" >/dev/null 2>&1 || log "alert could not be raised"
  fi
  exit "$2"
}

# ── Preconditions ─────────────────────────────────────────────────────────────
if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  finish "FAIL: Docker is not running — pg_dump is unavailable on this Mac without it" 2
fi

case "$CREDENTIAL_SOURCE" in
  auto|keychain|railway) ;;
  *) finish "FAIL: MAOS_BACKUP_CREDENTIAL_SOURCE must be auto, keychain or railway" 3 ;;
esac

DATABASE_URL=""
# Keychain first: non-interactive, unlike a Railway login that expires. The
# value is read into a variable only; `security` receives just the item name.
if [ "$CREDENTIAL_SOURCE" != railway ] && [ -x "$SECURITY_BIN" ]; then
  DATABASE_URL="$("$SECURITY_BIN" find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null || true)"
  if [ -n "$DATABASE_URL" ]; then
    case "$DATABASE_URL" in
      postgres://*|postgresql://*) log "credential source: keychain" ;;
      *) DATABASE_URL=""; finish "FAIL: the Keychain item $KEYCHAIN_SERVICE is not a PostgreSQL URL" 3 ;;
    esac
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  if [ "$CREDENTIAL_SOURCE" = keychain ]; then
    finish "FAIL: no Keychain item $KEYCHAIN_SERVICE (account $KEYCHAIN_ACCOUNT)" 3
  fi
  if [ ! -x "$RAILWAY_BIN" ]; then
    finish "FAIL: railway CLI not found at $RAILWAY_BIN" 2
  fi
  DATABASE_URL="$(cd "$RAILWAY_DIR" && "$RAILWAY_BIN" variables --service Postgres --kv 2>/dev/null \
    | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)"
  if [ -z "$DATABASE_URL" ]; then
    finish "FAIL: could not obtain the database URL from Railway (login expired?)" 3
  fi
  log "credential source: railway"
fi
export DATABASE_URL
export BACKUP_RETENTION="${BACKUP_RETENTION:-14}"

if [ "$PG_DUMP_MODE" = docker ]; then
  SHIM_DIR="$(mktemp -d "${TMPDIR:-/tmp}/maos-pgdump.XXXXXX")"
  ln -s "$SCRIPT_DIR/pg-dump-docker.sh" "$SHIM_DIR/pg_dump"
  PATH="$SHIM_DIR:$PATH"
  export PATH
fi

# ── Backup with a duration guard ──────────────────────────────────────────────
# Output goes to a temp file first: piping into sed would make $? the status of
# sed, and the URL must be redacted before anything reaches the log.
TMP="$(mktemp "${TMPDIR:-/tmp}/maos-backup.XXXXXX")"
"$BACKUP_SCRIPT" "$OUT" >"$TMP" 2>&1 &
BACKUP_PID=$!

ELAPSED=0
TIMED_OUT=0
while kill -0 "$BACKUP_PID" 2>/dev/null; do
  if [ "$ELAPSED" -ge "$MAX_SECONDS" ]; then
    TIMED_OUT=1
    # Stop the dump process first, then the script, so its EXIT trap (which
    # removes partial dumps) runs promptly; escalate if anything lingers.
    pkill -TERM -P "$BACKUP_PID" 2>/dev/null || true
    kill -TERM "$BACKUP_PID" 2>/dev/null || true
    sleep 2
    pkill -KILL -P "$BACKUP_PID" 2>/dev/null || true
    kill -KILL "$BACKUP_PID" 2>/dev/null || true
    break
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done
wait "$BACKUP_PID" 2>/dev/null
STATUS=$?

redact < "$TMP" >> "$LOG"

if [ "$TIMED_OUT" = 1 ]; then
  rm -f "$OUT"/maos-*.dump.partial-*
  finish "FAIL: backup exceeded ${MAX_SECONDS}s and was stopped" 4
fi

if [ "$STATUS" -eq 0 ]; then
  # D2 (MAOS-T20): encrypted off-site copy of the new dump. Silent until it is
  # configured (exit 2); on failure it raises its own alert. It never turns a
  # good local backup into a failed run.
  OFFSITE_CMD="${MAOS_OFFSITE_CMD:-$SCRIPT_DIR/offsite-backup.sh}"
  if [ -x "$OFFSITE_CMD" ]; then
    "$OFFSITE_CMD" >> "$LOG" 2>&1
    case $? in
      0) log "off-site copy: OK" ;;
      2) log "off-site copy: not configured" ;;
      *) log "off-site copy: FAILED (alert raised)" ;;
    esac
  fi
  finish "SUCCESS: exit 0" 0
fi
finish "FAIL: exit $STATUS" "$STATUS"
