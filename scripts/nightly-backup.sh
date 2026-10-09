#!/usr/bin/env bash
#
# MAOS - scheduled production backup runner.
#
# Entry point for the nightly LaunchAgent on the backup Mac. Prepares a
# non-interactive environment, obtains the database URL, runs
# scripts/backup-db.sh (which stays authoritative for dumping, retries,
# checksums and retention) and logs the outcome.
#
# No credential is stored here. The connection string is fetched from the
# authenticated Railway CLI at run time, exists only in this process and its
# children, and is redacted from everything written to the log.
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
#   3   database URL could not be obtained (for example an expired login)
#   4   backup exceeded MAOS_BACKUP_MAX_SECONDS and was stopped
#   75  another run holds the lock
#
# Environment (all optional):
#   MAOS_BACKUP_HOME         default $HOME/MAOS_BACKUPS (production/, logs/)
#   MAOS_BACKUP_MAX_SECONDS  default 7200
#   BACKUP_RETENTION         passed to backup-db.sh, default 14
#   DOCKER_BIN               default /usr/local/bin/docker
#   RAILWAY_BIN              default $HOME/.npm-global/bin/railway
#   MAOS_RAILWAY_DIR         directory linked to the Railway project; default
#                            the repository root
#   MAOS_BACKUP_PG_DUMP      docker (default: use scripts/pg-dump-docker.sh as
#                            pg_dump) or path (use pg_dump from PATH)
#   MAOS_BACKUP_SCRIPT       backup script; default scripts/backup-db.sh

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
RAILWAY_DIR="${MAOS_RAILWAY_DIR:-$REPO}"
PG_DUMP_MODE="${MAOS_BACKUP_PG_DUMP:-docker}"
BACKUP_SCRIPT="${MAOS_BACKUP_SCRIPT:-$SCRIPT_DIR/backup-db.sh}"

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
  exit "$2"
}

# ── Preconditions ─────────────────────────────────────────────────────────────
if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  finish "FAIL: Docker is not running — pg_dump is unavailable on this Mac without it" 2
fi

if [ ! -x "$RAILWAY_BIN" ]; then
  finish "FAIL: railway CLI not found at $RAILWAY_BIN" 2
fi

DATABASE_URL="$(cd "$RAILWAY_DIR" && "$RAILWAY_BIN" variables --service Postgres --kv 2>/dev/null \
  | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)"
if [ -z "$DATABASE_URL" ]; then
  finish "FAIL: could not obtain the database URL from Railway (login expired?)" 3
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
  finish "SUCCESS: exit 0" 0
fi
finish "FAIL: exit $STATUS" "$STATUS"
