#!/usr/bin/env bash
#
# MAOS - Railway private tunnel helpers (MAOS-R01), shared by
# scripts/nightly-backup.sh, scripts/db-readonly-check.sh and
# scripts/migrate-deploy-one.sh. Sourced, never run.
#
# The functions are the ones audited for the nightly backup (#111), moved here
# unchanged in substance so every production connection uses the same tunnel
# handling: `railway connect Postgres --ssh --tunnel-only -P <port>`, a bounded
# wait, ownership of the listener proven by process tree and identity, and a
# close that stops only this run's processes and reports a listener it could
# not close. Nothing here reads a credential or opens a public endpoint.
#
# The caller sets, before open_tunnel:
#   TUNNEL_PORT           local port (1024-65535), checked by tunnel_check_settings
#   TUNNEL_HOST           host the client uses to reach the tunnel (127.0.0.1, or
#                         host.docker.internal for a client inside Docker)
#   TUNNEL_READY_SECONDS  readiness limit in seconds
#   RAILWAY_BIN           Railway CLI
#   RAILWAY_DIR           directory linked to the Railway project
#   LSOF_BIN              lsof
#   TUNNEL_RECORD         optional file for the owned listeners ("pid|identity"
#                         lines), removed when the tunnel closes
# and defines log() for progress and warning lines (never secrets).

TUNNEL_PID=""      # the `railway connect` process (on macOS a Node wrapper)
TUNNEL_GROUP=""    # its own process group, when it has one (never ours)
TUNNEL_LEADER_ID="" # identity (start time|executable) of TUNNEL_PID at start
TUNNEL_TREE=""     # "pid|identity" lines: descendants of TUNNEL_PID seen so far
TUNNEL_OWNED=""    # "pid|identity" lines: listeners on TUNNEL_PORT this run started
TUNNEL_READY=0
TUNNEL_LEAK=0      # 1 when a listener was still open after close_tunnel
TUNNEL_ERROR=""    # why open_tunnel or tunnel_check_settings failed

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

# Every descendant of a pid (children, grandchildren, ...), from one ps listing.
proc_descendants() {
  ps -A -o pid= -o ppid= 2>/dev/null | awk -v root="$1" '
    { kids[$2] = kids[$2] " " $1 }
    END {
      n = split(kids[root], q, " ")
      for (i = 1; i <= n; i++) {
        print q[i]
        m = split(kids[q[i]], c, " ")
        for (j = 1; j <= m; j++) q[++n] = c[j]
      }
    }'
}

tunnel_leader_alive() {
  [ -n "$TUNNEL_LEADER_ID" ] && [ "$(proc_identity "$TUNNEL_PID" || true)" = "$TUNNEL_LEADER_ID" ]
}

# Record, with identity, every current descendant of the tunnel. The real CLI
# is a chain (Node wrapper -> railway binary -> ssh), and the binary starts ssh
# in a process group of its own: only the parent chain proves that the SSH
# listener belongs to this run. Descendants are trusted only while the leader
# is verifiably the process this run started.
tunnel_snapshot() {
  local p id
  tunnel_leader_alive || return 0
  for p in $(proc_descendants "$TUNNEL_PID"); do
    case "
$TUNNEL_TREE
" in *"
$p|"*) continue ;; esac
    id="$(proc_identity "$p" || true)"
    [ -n "$id" ] && TUNNEL_TREE="${TUNNEL_TREE:+$TUNNEL_TREE
}$p|$id"
  done
}

# Is pid recorded in a "pid|identity" list with an identity that still matches?
record_matches() {
  local list="$2" rec
  while IFS= read -r rec; do
    [ "${rec%%|*}" = "$1" ] || continue
    [ "$(proc_identity "$1" || true)" = "${rec#*|}" ] && return 0
  done <<EOF_REC
$list
EOF_REC
  return 1
}

# Processes of this run's tunnel that are alive AND still the same process
# (identity unchanged): the leader, its recorded descendants and the recorded
# listeners. A reused PID never appears here.
tunnel_verified_pids() {
  local rec p
  tunnel_leader_alive && echo "$TUNNEL_PID"
  while IFS= read -r rec; do
    [ -n "$rec" ] || continue
    p="${rec%%|*}"
    [ "$(proc_identity "$p" || true)" = "${rec#*|}" ] && echo "$p"
  done <<EOF_OWNED
$TUNNEL_TREE
$TUNNEL_OWNED
EOF_OWNED
}

# May the tunnel's process group be signalled? Only if it still exists and is
# provably ours. Until the tunnel is ready the group is checked every second
# (an id cannot be reused while its group exists); after that, a member whose
# identity is verified must still be in it.
tunnel_group_ours() {
  local p
  [ -n "$TUNNEL_GROUP" ] || return 1
  kill -0 -- "-$TUNNEL_GROUP" 2>/dev/null || return 1
  [ "$TUNNEL_READY" = 1 ] || return 0
  for p in $(tunnel_verified_pids); do
    [ "$(ps -o pgid= -p "$p" 2>/dev/null | tr -d ' ')" = "$TUNNEL_GROUP" ] && return 0
  done
  return 1
}

# Is the tunnel still starting or running? `railway connect` may exit while
# the SSH child it started is still coming up (seen on Linux CI): with its own
# group, any member counts; any recorded descendant counts too.
tunnel_running() {
  if [ -n "$TUNNEL_GROUP" ] && kill -0 -- "-$TUNNEL_GROUP" 2>/dev/null; then return 0; fi
  kill -0 "$TUNNEL_PID" 2>/dev/null && return 0
  [ -n "$(tunnel_verified_pids)" ]
}

# Stop the tunnel: its process group (if provably ours) and every verified
# process of it, including the SSH child in its own group. Nothing else is
# ever signalled. Success is reported only if the port is closed afterwards;
# otherwise TUNNEL_LEAK=1 and the listener is named. Idempotent.
close_tunnel() {
  [ -n "$TUNNEL_PID" ] || return 0
  local p still="" i=0 open=""
  tunnel_snapshot
  tunnel_group_ours && kill -TERM -- "-$TUNNEL_GROUP" 2>/dev/null
  for p in $(tunnel_verified_pids); do kill -TERM "$p" 2>/dev/null; done
  while [ "$i" -lt 5 ]; do
    still="$(tunnel_verified_pids | tr '\n' ' ')"
    if [ -z "${still// /}" ] && ! tunnel_group_ours && ! tunnel_listening; then still=""; break; fi
    sleep 1
    i=$((i + 1))
  done
  if [ -n "${still// /}" ] || tunnel_group_ours; then
    tunnel_group_ours && kill -KILL -- "-$TUNNEL_GROUP" 2>/dev/null
    for p in $(tunnel_verified_pids); do kill -KILL "$p" 2>/dev/null; done
    sleep 1
  fi
  still="$(tunnel_verified_pids | tr '\n' ' ')"
  tunnel_listening && open="$(tunnel_listener_pids | tr '\n' ' ')"
  if [ -n "${still// /}" ] || tunnel_group_ours; then
    TUNNEL_LEAK=1
    log "WARNING: private tunnel process(es) ${still}could not be stopped"
  fi
  if tunnel_listening; then
    TUNNEL_LEAK=1
    log "WARNING: port $TUNNEL_PORT is still listening after the tunnel was closed (pid ${open:-unknown}); it was not stopped because it is not verifiably this run's tunnel"
  fi
  [ "$TUNNEL_LEAK" = 1 ] || log "private tunnel closed"
  TUNNEL_PID=""
  TUNNEL_GROUP=""
  TUNNEL_LEADER_ID=""
  TUNNEL_TREE=""
  TUNNEL_OWNED=""
  TUNNEL_READY=0
  [ -n "${TUNNEL_RECORD:-}" ] && rm -f "$TUNNEL_RECORD"
  return 0
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

# Port and readiness limit must be sane before anything is started.
tunnel_check_settings() {
  case "$TUNNEL_PORT" in
    ''|*[!0-9]*) TUNNEL_ERROR="the tunnel port must be a port number (1024-65535)"; return 1 ;;
  esac
  if [ "$TUNNEL_PORT" -lt 1024 ] || [ "$TUNNEL_PORT" -gt 65535 ]; then
    TUNNEL_ERROR="the tunnel port must be a port number (1024-65535)"; return 1
  fi
  case "$TUNNEL_READY_SECONDS" in
    ''|*[!0-9]*|0) TUNNEL_ERROR="the tunnel readiness limit must be a positive whole number"; return 1 ;;
  esac
  if [ ! -x "$RAILWAY_BIN" ]; then
    TUNNEL_ERROR="railway CLI not found at $RAILWAY_BIN"; return 1
  fi
  return 0
}

# Open the tunnel and prove the listener is this run's. Returns 0 when ready;
# otherwise 1 with TUNNEL_ERROR set (the caller closes the tunnel and fails).
open_tunnel() {
  local waited=0 own_group p pgid id
  # Never use a listener this run did not start.
  if tunnel_listening; then
    TUNNEL_ERROR="private tunnel port $TUNNEL_PORT is already in use; refusing to use a listener this run did not start"
    return 1
  fi

  # Own process group (set -m), so the tunnel and the SSH child it starts can
  # be stopped together. Its output is discarded: it prints connection details.
  set -m
  ( cd "$RAILWAY_DIR" && exec "$RAILWAY_BIN" connect Postgres --ssh --tunnel-only -P "$TUNNEL_PORT" ) \
    </dev/null >/dev/null 2>&1 &
  TUNNEL_PID=$!
  set +m
  TUNNEL_LEADER_ID="$(proc_identity "$TUNNEL_PID" || true)"
  # Monitor mode put the job in its own group, whose id is TUNNEL_PID. Use it
  # only if that group exists right now (the leader itself may already have
  # exited: Linux CI) and is not this runner's own group.
  own_group="$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' ')"
  if [ "$TUNNEL_PID" != "$own_group" ] && kill -0 -- "-$TUNNEL_PID" 2>/dev/null; then
    TUNNEL_GROUP="$TUNNEL_PID"
  fi
  log "private tunnel starting on 127.0.0.1:$TUNNEL_PORT (pid $TUNNEL_PID; ${TUNNEL_CLIENT:-client} via $TUNNEL_HOST)"

  until tunnel_listening; do
    tunnel_snapshot
    if ! tunnel_running && ! tunnel_listening; then
      TUNNEL_ERROR="private tunnel exited before it was ready (Railway login expired or SSH key missing?)"
      return 1
    fi
    if [ "$waited" -ge "$TUNNEL_READY_SECONDS" ]; then
      TUNNEL_ERROR="private tunnel not ready within ${TUNNEL_READY_SECONDS}s"
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done

  # The listener must belong to this tunnel: in its process group, or a
  # recorded descendant of `railway connect` (the real ssh: grandchild, own
  # group). Each owned listener is recorded with its identity.
  tunnel_snapshot
  for p in $(tunnel_listener_pids); do
    pgid="$(ps -o pgid= -p "$p" 2>/dev/null | tr -d ' ')"
    if { [ "$p" = "$TUNNEL_PID" ] && tunnel_leader_alive; } \
      || { [ -n "$TUNNEL_GROUP" ] && [ "$pgid" = "$TUNNEL_GROUP" ]; } \
      || record_matches "$p" "$TUNNEL_TREE"; then
      id="$(proc_identity "$p" || true)"
      [ -n "$id" ] && TUNNEL_OWNED="${TUNNEL_OWNED:+$TUNNEL_OWNED
}$p|$id"
    fi
  done
  if [ -z "$TUNNEL_OWNED" ]; then
    TUNNEL_ERROR="the listener on port $TUNNEL_PORT does not belong to this run's tunnel"
    return 1
  fi
  [ -n "${TUNNEL_RECORD:-}" ] && printf '%s\n' "$TUNNEL_OWNED" > "$TUNNEL_RECORD"
  TUNNEL_READY=1
  log "private tunnel ready after ${waited}s"
  return 0
}
