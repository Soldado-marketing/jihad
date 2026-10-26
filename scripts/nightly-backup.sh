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
# Connection modes (MAOS_BACKUP_CONNECTION):
#   direct   (default) connect to the host in the URL, as before.
#   private  (MAOS-R01, opt-in) the production database has no public TCP
#            proxy. The runner opens Railway's private SSH tunnel
#            (`railway connect Postgres --ssh --tunnel-only -P <port>`), waits
#            a bounded time for it, and points pg_dump at it. The credential
#            comes from the Keychain ONLY (never `railway variables`, never
#            DATABASE_PUBLIC_URL); its host and port are replaced in memory by
#            the tunnel, sslmode is set to require, the user, password,
#            database and other options are kept. The tunnel, its process
#            group and any listener it spawned are closed on success, failure,
#            timeout and termination; a listener this run did not start is
#            never used and never killed.
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
#   5   private mode: the tunnel could not be opened (port in use, tunnel
#       exited, not ready in time, or its listener is not ours)
#   75  another run holds the lock
#   129/130/143  stopped by SIGHUP/SIGINT/SIGTERM
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
#   MAOS_BACKUP_CONNECTION   direct (default) or private (see above)
#   MAOS_BACKUP_TUNNEL_PORT  private mode: local tunnel port, default 15432
#   MAOS_BACKUP_TUNNEL_READY_SECONDS  private mode: readiness limit, default 60
#   MAOS_BACKUP_TUNNEL_HOST  private mode: host pg_dump uses to reach the
#                            tunnel; default host.docker.internal (docker
#                            pg_dump) or 127.0.0.1 (pg_dump from PATH)
#   LSOF_BIN                 default /usr/sbin/lsof

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
CONNECTION="${MAOS_BACKUP_CONNECTION:-direct}"
TUNNEL_PORT="${MAOS_BACKUP_TUNNEL_PORT:-15432}"
TUNNEL_READY_SECONDS="${MAOS_BACKUP_TUNNEL_READY_SECONDS:-60}"
if [ "$PG_DUMP_MODE" = docker ]; then
  TUNNEL_HOST="${MAOS_BACKUP_TUNNEL_HOST:-host.docker.internal}"
else
  TUNNEL_HOST="${MAOS_BACKUP_TUNNEL_HOST:-127.0.0.1}"
fi
LSOF_BIN="${LSOF_BIN:-/usr/sbin/lsof}"

# Absolute paths only: launchd gives a minimal PATH, never the login shell's.
PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH DOCKER_BIN

mkdir -p "$OUT" "$(dirname "$LOG")"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG"; }
redact() { sed -e 's#postgres[a-zA-Z]*://[^ "]*#<REDACTED>#g'; }

# ── Private tunnel helpers (MAOS-R01) ─────────────────────────────────────────
TUNNEL_PID=""      # the `railway connect` process
TUNNEL_GROUP=""    # its own process group, when it has one (never ours)
TUNNEL_OWNED=""    # listener pids on TUNNEL_PORT that this run started

# Is anything accepting connections on the local tunnel port? (bash built-in,
# no extra tool; the connection is closed again at once.)
tunnel_listening() { (exec 3<>"/dev/tcp/127.0.0.1/$TUNNEL_PORT") 2>/dev/null; }

tunnel_listener_pids() {
  "$LSOF_BIN" -nP -iTCP:"$TUNNEL_PORT" -sTCP:LISTEN -t 2>/dev/null | sort -u
}

# A process's identity: start time + executable. A PID alone can be reused by
# an unrelated process; PID + start time + command cannot (for a live process).
proc_identity() {
  local start comm
  start="$(ps -o lstart= -p "$1" 2>/dev/null | tr -s ' ' | sed -e 's/^ //' -e 's/ $//')"
  comm="$(ps -o comm= -p "$1" 2>/dev/null | sed -e 's/^ *//' -e 's/ *$//')"
  [ -n "$start" ] && [ -n "$comm" ] || return 1
  printf '%s|%s' "$start" "$comm"
}

# Stop the tunnel: its whole process group, then every listener it spawned
# (the SSH child can outlive `railway connect`). Only processes this run
# started are signalled. Idempotent.
close_tunnel() {
  [ -n "$TUNNEL_PID" ] || return 0
  local p still="" i=0
  [ -n "$TUNNEL_GROUP" ] && kill -TERM -- "-$TUNNEL_GROUP" 2>/dev/null
  kill -TERM "$TUNNEL_PID" 2>/dev/null
  for p in $TUNNEL_OWNED; do kill -TERM "$p" 2>/dev/null; done
  while [ "$i" -lt 5 ]; do
    still=""
    for p in $TUNNEL_PID $TUNNEL_OWNED; do kill -0 "$p" 2>/dev/null && still="$still $p"; done
    [ -z "$still" ] && break
    sleep 1
    i=$((i + 1))
  done
  if [ -n "$still" ]; then
    [ -n "$TUNNEL_GROUP" ] && kill -KILL -- "-$TUNNEL_GROUP" 2>/dev/null
    for p in $still; do kill -KILL "$p" 2>/dev/null; done
    sleep 1
  fi
  still=""
  for p in $TUNNEL_PID $TUNNEL_OWNED; do kill -0 "$p" 2>/dev/null && still="$still $p"; done
  if [ -n "$still" ]; then
    log "WARNING: private tunnel process(es)${still} could not be stopped"
  else
    log "private tunnel closed"
  fi
  TUNNEL_PID=""
  TUNNEL_GROUP=""
  TUNNEL_OWNED=""
  rm -f "$LOCK/tunnel.pids"
}

# postgres[ql]://user:pass@host:port/db?opts  ->  same user, password, database
# and options, host and port replaced by the tunnel, sslmode=require. host,
# hostaddr and port options are dropped so nothing can bypass the tunnel.
# Prints the new URL (captured in memory, never logged) or returns 1.
tunnel_url() {
  local url="$1" scheme rest authority pathq userinfo path query="" kept="" param key
  case "$url" in
    postgresql://*) scheme=postgresql ;;
    postgres://*) scheme=postgres ;;
    *) return 1 ;;
  esac
  rest="${url#*://}"
  authority="${rest%%/*}"
  [ "$authority" != "$rest" ] || return 1
  case "$authority" in *@*) ;; *) return 1 ;; esac
  userinfo="${authority%@*}"
  [ -n "$userinfo" ] || return 1
  pathq="${rest#"$authority"}"
  path="${pathq%%\?*}"
  [ -n "${path#/}" ] || return 1
  case "$pathq" in *\?*) query="${pathq#*\?}" ;; esac
  set -f
  local IFS='&'
  for param in $query; do
    key="${param%%=*}"
    case "$key" in ''|sslmode|host|hostaddr|port) continue ;; esac
    kept="${kept:+$kept&}$param"
  done
  set +f
  printf '%s://%s@%s:%s%s?%ssslmode=require' "$scheme" "$userinfo" "$TUNNEL_HOST" "$TUNNEL_PORT" "$path" "${kept:+$kept&}"
}

log "=== run start ==="

# ── One run at a time ─────────────────────────────────────────────────────────
if ! mkdir "$LOCK" 2>/dev/null; then
  OLD_PID="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    log "SKIP: another backup run is in progress (pid $OLD_PID)"
    exit 75
  fi
  log "taking over stale lock (pid ${OLD_PID:-unknown} is not running)"
  # A tunnel listener left by that dead run is stopped only if it is provably
  # the same process: listening on the tunnel port AND with the exact start
  # time and executable recorded when it was opened. Anything else (a reused
  # PID, an unrelated listener, an old or damaged record) is left alone; the
  # port check below then refuses to run (fail closed, exit 5).
  if [ -s "$LOCK/tunnel.pids" ]; then
    STALE_LISTENERS=" $(tunnel_listener_pids | tr '\n' ' ') "
    while IFS= read -r REC || [ -n "$REC" ]; do
      p="${REC%%|*}"
      WANT="${REC#*|}"
      case "$p" in ''|*[!0-9]*) log "not stopping anything: unreadable stale tunnel record"; continue ;; esac
      if [ "$WANT" = "$REC" ] || [ -z "$WANT" ]; then
        log "not stopping pid $p: the stale tunnel record has no process identity"
        continue
      fi
      case "$STALE_LISTENERS" in
        *" $p "*) ;;
        *) continue ;;   # not listening on the tunnel port: nothing to stop
      esac
      HAVE="$(proc_identity "$p" || true)"
      if [ -n "$HAVE" ] && [ "$HAVE" = "$WANT" ]; then
        kill -TERM "$p" 2>/dev/null && log "stopped tunnel listener $p left by the stale run"
        i=0
        while kill -0 "$p" 2>/dev/null && [ "$i" -lt 5 ]; do sleep 1; i=$((i + 1)); done
      else
        log "not stopping pid $p: its identity does not match the stale tunnel record (PID reused?)"
      fi
    done < "$LOCK/tunnel.pids"
  fi
  rm -rf "$LOCK"
  if ! mkdir "$LOCK" 2>/dev/null; then
    log "SKIP: could not acquire the lock"
    exit 75
  fi
fi
echo "$$" > "$LOCK/pid"

TMP=""
SHIM_DIR=""
BACKUP_PID=""
cleanup() {
  close_tunnel
  [ -n "$TMP" ] && rm -f "$TMP"
  [ -n "$SHIM_DIR" ] && rm -rf "$SHIM_DIR"
  rm -rf "$LOCK"
}
trap cleanup EXIT

finish() {
  close_tunnel
  log "$1"
  log "=== run end ==="
  if [ "$2" -ne 0 ]; then
    "$ALERT" "Nightly backup failed - $1" >/dev/null 2>&1 || log "alert could not be raised"
  fi
  exit "$2"
}

# Termination: stop the backup, close the tunnel (via finish), alert.
on_signal() {
  trap - HUP INT TERM
  if [ -n "$BACKUP_PID" ]; then
    pkill -TERM -P "$BACKUP_PID" 2>/dev/null || true
    kill -TERM "$BACKUP_PID" 2>/dev/null || true
  fi
  rm -f "$OUT"/maos-*.dump.partial-* 2>/dev/null
  finish "FAIL: stopped by SIG$1" "$2"
}
trap 'on_signal HUP 129' HUP
trap 'on_signal INT 130' INT
trap 'on_signal TERM 143' TERM

# ── Preconditions ─────────────────────────────────────────────────────────────
if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  finish "FAIL: Docker is not running — pg_dump is unavailable on this Mac without it" 2
fi

case "$CREDENTIAL_SOURCE" in
  auto|keychain|railway) ;;
  *) finish "FAIL: MAOS_BACKUP_CREDENTIAL_SOURCE must be auto, keychain or railway" 3 ;;
esac

case "$CONNECTION" in
  direct) ;;
  private)
    # Private mode never asks Railway for a connection string.
    if [ "$CREDENTIAL_SOURCE" = railway ]; then
      finish "FAIL: private mode reads the credential from the Keychain only (MAOS_BACKUP_CREDENTIAL_SOURCE=railway is not allowed)" 3
    fi
    CREDENTIAL_SOURCE=keychain
    case "$TUNNEL_PORT" in
      ''|*[!0-9]*) finish "FAIL: MAOS_BACKUP_TUNNEL_PORT must be a port number (1024-65535)" 5 ;;
    esac
    if [ "$TUNNEL_PORT" -lt 1024 ] || [ "$TUNNEL_PORT" -gt 65535 ]; then
      finish "FAIL: MAOS_BACKUP_TUNNEL_PORT must be a port number (1024-65535)" 5
    fi
    case "$TUNNEL_READY_SECONDS" in
      ''|*[!0-9]*|0) finish "FAIL: MAOS_BACKUP_TUNNEL_READY_SECONDS must be a positive whole number" 5 ;;
    esac
    if [ ! -x "$RAILWAY_BIN" ]; then
      finish "FAIL: railway CLI not found at $RAILWAY_BIN" 2
    fi
    ;;
  *) finish "FAIL: MAOS_BACKUP_CONNECTION must be direct or private" 3 ;;
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

# ── Private tunnel (MAOS-R01) ─────────────────────────────────────────────────
if [ "$CONNECTION" = private ]; then
  if ! PRIVATE_URL="$(tunnel_url "$DATABASE_URL")"; then
    DATABASE_URL=""
    finish "FAIL: the Keychain item $KEYCHAIN_SERVICE is not a usable PostgreSQL URL (user, host and database required)" 3
  fi
  DATABASE_URL="$PRIVATE_URL"
  PRIVATE_URL=""

  # Never use a listener this run did not start.
  if tunnel_listening; then
    finish "FAIL: private tunnel port $TUNNEL_PORT is already in use; refusing to use a listener this run did not start" 5
  fi

  # Own process group (set -m), so the tunnel and the SSH child it starts can
  # be stopped together. Its output is discarded: it prints connection details.
  set -m
  ( cd "$RAILWAY_DIR" && exec "$RAILWAY_BIN" connect Postgres --ssh --tunnel-only -P "$TUNNEL_PORT" ) \
    </dev/null >/dev/null 2>&1 &
  TUNNEL_PID=$!
  set +m
  # Group signals only if the tunnel really leads its own group: a group shared
  # with this runner must never be signalled.
  OWN_GROUP="$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' ')"
  T_GROUP="$(ps -o pgid= -p "$TUNNEL_PID" 2>/dev/null | tr -d ' ')"
  if [ "$T_GROUP" = "$TUNNEL_PID" ] && [ "$T_GROUP" != "$OWN_GROUP" ]; then
    TUNNEL_GROUP="$TUNNEL_PID"
  fi
  log "private tunnel starting on 127.0.0.1:$TUNNEL_PORT (pid $TUNNEL_PID; pg_dump via $TUNNEL_HOST)"

  WAITED=0
  until tunnel_listening; do
    if ! kill -0 "$TUNNEL_PID" 2>/dev/null && ! tunnel_listening; then
      finish "FAIL: private tunnel exited before it was ready (Railway login expired or SSH key missing?)" 5
    fi
    if [ "$WAITED" -ge "$TUNNEL_READY_SECONDS" ]; then
      finish "FAIL: private tunnel not ready within ${TUNNEL_READY_SECONDS}s" 5
    fi
    sleep 1
    WAITED=$((WAITED + 1))
  done

  # The listener must belong to this tunnel: its process group, or a direct
  # child of `railway connect`.
  for p in $(tunnel_listener_pids); do
    PGID="$(ps -o pgid= -p "$p" 2>/dev/null | tr -d ' ')"
    PPID_OF="$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ')"
    if [ "$p" = "$TUNNEL_PID" ] || { [ -n "$TUNNEL_GROUP" ] && [ "$PGID" = "$TUNNEL_GROUP" ]; } || [ "$PPID_OF" = "$TUNNEL_PID" ]; then
      TUNNEL_OWNED="${TUNNEL_OWNED:+$TUNNEL_OWNED }$p"
    fi
  done
  if [ -z "$TUNNEL_OWNED" ]; then
    finish "FAIL: the listener on port $TUNNEL_PORT does not belong to this run's tunnel" 5
  fi
  : > "$LOCK/tunnel.pids"
  for p in $TUNNEL_OWNED; do
    ID="$(proc_identity "$p" || true)"
    [ -n "$ID" ] && printf '%s|%s\n' "$p" "$ID" >> "$LOCK/tunnel.pids"
  done
  log "private tunnel ready after ${WAITED}s"
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

if [ "$CONNECTION" = private ] && [ "$STATUS" -ne 0 ] && ! tunnel_listening; then
  log "private tunnel was no longer listening when the backup ended"
fi

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
