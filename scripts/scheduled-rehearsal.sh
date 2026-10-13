#!/usr/bin/env bash
#
# MAOS - scheduled restore rehearsal (MAOS-T21).
#
# Weekly proof that the newest verified production dump restores. Picks the
# newest dump whose .sha256 matches, runs scripts/restore-rehearsal.sh on it
# (isolated, network-less, throwaway container), keeps the report, appends one
# PASS/FAIL line to logs/rehearsal.log and raises an alert on failure.
#
# Exit status: 0 PASS, 1 FAIL (rehearsal failed or no verified dump).
#
# Environment (all optional):
#   MAOS_BACKUP_HOME         default $HOME/MAOS_BACKUPS (production/, logs/)
#   MAOS_REHEARSAL_SCRIPT    default scripts/restore-rehearsal.sh
#   MAOS_BACKUP_ALERT        default scripts/backup-alert.sh

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
OUT="$BACKUP_HOME/production"
LOGS="$BACKUP_HOME/logs"
REHEARSAL="${MAOS_REHEARSAL_SCRIPT:-$SCRIPT_DIR/restore-rehearsal.sh}"
ALERT="${MAOS_BACKUP_ALERT:-$SCRIPT_DIR/backup-alert.sh}"

mkdir -p "$LOGS"
stamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }
sum_of() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"; else shasum -a 256 "$1"; fi; }

DUMP=""
while IFS= read -r f; do
  [ -f "$f.sha256" ] || continue
  actual="$(sum_of "$f")"; expected="$(cat "$f.sha256")"
  if [ "${actual%% *}" = "${expected%% *}" ]; then DUMP="$f"; break; fi
done < <(ls -1t "$OUT"/maos-*.dump 2>/dev/null)

if [ -z "$DUMP" ]; then
  echo "$(stamp) FAIL no verified dump to rehearse" >> "$LOGS/rehearsal.log"
  "$ALERT" "Restore rehearsal could not run: no verified MAOS backup found" >/dev/null 2>&1 || true
  exit 1
fi

REPORT="$LOGS/rehearsal-$(date -u +%Y%m%dT%H%M%SZ).txt"
if REHEARSAL_REPORT="$REPORT" "$REHEARSAL" "$DUMP" > "$REPORT.log" 2>&1; then
  echo "$(stamp) PASS $(basename "$DUMP")" >> "$LOGS/rehearsal.log"
  # D2 (MAOS-T20): also prove the newest off-site copy restores. Silent until
  # configured (exit 2); it raises its own alert on failure.
  OFFSITE_REHEARSAL="${MAOS_OFFSITE_REHEARSAL_CMD:-$SCRIPT_DIR/offsite-rehearsal.sh}"
  if [ -x "$OFFSITE_REHEARSAL" ]; then "$OFFSITE_REHEARSAL" >> "$LOGS/rehearsal.log" 2>&1 || true; fi
  exit 0
fi
echo "$(stamp) FAIL $(basename "$DUMP") (see $(basename "$REPORT").log)" >> "$LOGS/rehearsal.log"
"$ALERT" "Weekly restore rehearsal FAILED for $(basename "$DUMP")" >/dev/null 2>&1 || true
exit 1
