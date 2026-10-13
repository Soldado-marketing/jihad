#!/usr/bin/env bash
#
# MAOS - install the backup schedules on the backup Mac (MAOS-T21).
#
#   ./scripts/install-backup-schedule.sh [--ref <git-ref>] [--dry-run <dir>]
#
# 1. Pins a runtime copy of scripts/ from <ref> (default origin/main) into
#    $MAOS_BACKUP_HOME/runtime/<short-sha>/ and points runtime/current at it,
#    so the schedules never run a working checkout's feature branch.
# 2. Renders the three LaunchAgents from scripts/launchd/ with absolute paths,
#    keeps a copy of any plist it replaces in $MAOS_BACKUP_HOME/launchd-backup/,
#    and (unless --dry-run) reloads them with launchctl.
# No credential is involved: the nightly runner reads it from the Keychain.
#
# Re-run after a reviewed change to the backup scripts lands on main.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
AGENTS_DIR="${MAOS_LAUNCH_AGENTS_DIR:-$HOME/Library/LaunchAgents}"
REF="origin/main"
DRY_RUN=""
LABELS=(com.soldado.maos.backup com.soldado.maos.backup-staleness com.soldado.maos.restore-rehearsal)

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="$2"; shift 2 ;;
    --dry-run) DRY_RUN="$2"; AGENTS_DIR="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

SHA="$(git -C "$REPO" rev-parse --short "$REF")"
RUNTIME="$BACKUP_HOME/runtime/$SHA"
mkdir -p "$RUNTIME" "$BACKUP_HOME/logs" "$AGENTS_DIR"
git -C "$REPO" archive "$REF" scripts | tar -x -C "$RUNTIME"
echo "$SHA" > "$RUNTIME/VERSION"
ln -sfn "$RUNTIME" "$BACKUP_HOME/runtime/current"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
for label in "${LABELS[@]}"; do
  target="$AGENTS_DIR/$label.plist"
  if [ -f "$target" ] && [ -z "$DRY_RUN" ]; then
    mkdir -p "$BACKUP_HOME/launchd-backup/$STAMP"
    cp "$target" "$BACKUP_HOME/launchd-backup/$STAMP/"
  fi
  sed -e "s#__RUNTIME__#$BACKUP_HOME/runtime/current#g" \
      -e "s#__BACKUP_HOME__#$BACKUP_HOME#g" \
      -e "s#__RAILWAY_DIR__#$REPO#g" \
      "$RUNTIME/scripts/launchd/$label.plist" > "$target"
  if command -v plutil >/dev/null 2>&1; then plutil -lint -s "$target"; fi
done

if [ -n "$DRY_RUN" ]; then
  echo "dry run: runtime $SHA, plists rendered into $AGENTS_DIR"
  exit 0
fi

DOMAIN="gui/$(id -u)"
for label in "${LABELS[@]}"; do
  launchctl bootout "$DOMAIN/$label" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$AGENTS_DIR/$label.plist"
  launchctl print "$DOMAIN/$label" >/dev/null && echo "loaded: $label"
done
echo "runtime: $BACKUP_HOME/runtime/current -> $SHA"
