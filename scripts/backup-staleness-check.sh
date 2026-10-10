#!/usr/bin/env bash
#
# MAOS - backup staleness check (MAOS-T19).
#
# Alerts when the newest *verified* production dump is too old or missing.
# A dump counts only when its <dump>.sha256 exists and matches, so a corrupt
# or unchecksummed file never hides a backup outage. Meant to run on a
# schedule independent of the nightly backup, so it also catches runs that
# never started (Mac asleep, LaunchAgent unloaded).
#
#   ./scripts/backup-staleness-check.sh
#
# Exit status:
#   0  newest verified dump is younger than the limit (silent)
#   1  no verified dump, or the newest is older than the limit (alert raised)
#
# Environment (all optional):
#   MAOS_BACKUP_HOME           default $HOME/MAOS_BACKUPS (production/, logs/)
#   MAOS_BACKUP_MAX_AGE_HOURS  default 26
#   MAOS_BACKUP_ALERT          alert command; default scripts/backup-alert.sh

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
OUT="$BACKUP_HOME/production"
MAX_AGE_HOURS="${MAOS_BACKUP_MAX_AGE_HOURS:-26}"
ALERT="${MAOS_BACKUP_ALERT:-$SCRIPT_DIR/backup-alert.sh}"

case "$MAX_AGE_HOURS" in
  ''|*[!0-9]*) MAX_AGE_HOURS=26 ;;
esac

sum_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"; else shasum -a 256 "$1"; fi
}
# GNU stat first: on Linux `stat -f` is filesystem status and would "succeed".
mtime_of() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1"; }

NEWEST=""
# Newest first; the first dump whose checksum matches is the newest verified one.
while IFS= read -r f; do
  [ -f "$f.sha256" ] || continue
  actual="$(sum_of "$f")"
  expected="$(cat "$f.sha256")"
  if [ "${actual%% *}" = "${expected%% *}" ]; then
    NEWEST="$f"
    break
  fi
done < <(ls -1t "$OUT"/maos-*.dump 2>/dev/null)

if [ -z "$NEWEST" ]; then
  "$ALERT" "No verified MAOS backup found in $OUT"
  exit 1
fi

AGE_HOURS=$(( ( $(date +%s) - $(mtime_of "$NEWEST") ) / 3600 ))
if [ "$AGE_HOURS" -ge "$MAX_AGE_HOURS" ]; then
  "$ALERT" "Newest verified MAOS backup is ${AGE_HOURS}h old (limit ${MAX_AGE_HOURS}h): $(basename "$NEWEST")"
  exit 1
fi

echo "OK: newest verified backup $(basename "$NEWEST") is ${AGE_HOURS}h old"
exit 0
