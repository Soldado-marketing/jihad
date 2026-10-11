#!/usr/bin/env bash
#
# MAOS - backup alert (MAOS-T19).
#
# Raises one alert: a macOS notification plus a line in logs/alerts.log, so a
# failed or stale backup is never silent. Called by nightly-backup.sh on
# failure and by backup-staleness-check.sh when no recent verified dump exists.
#
#   ./scripts/backup-alert.sh <message>
#
# The message is reduced to one line, connection strings are redacted and it
# is cut to 200 characters. Never fails the caller: exit status is always 0.
#
# Environment (all optional):
#   MAOS_BACKUP_HOME   default $HOME/MAOS_BACKUPS (logs/alerts.log)
#   MAOS_NOTIFY_BIN    notifier; default /usr/bin/osascript

set -u

BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
ALERT_LOG="$BACKUP_HOME/logs/alerts.log"
NOTIFY_BIN="${MAOS_NOTIFY_BIN:-/usr/bin/osascript}"

MSG="$(printf '%s' "$*" | tr '\r\n' '  ' \
  | sed -e 's#postgres[a-zA-Z]*://[^ "]*#<REDACTED>#g' | cut -c1-200)"
[ -n "$MSG" ] || MSG="backup alert (no detail)"

mkdir -p "$(dirname "$ALERT_LOG")"
stamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }
echo "$(stamp) ALERT $MSG" >> "$ALERT_LOG"

# AppleScript string literal: escape backslashes first, then double quotes.
ESCAPED="$(printf '%s' "$MSG" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
if ! "$NOTIFY_BIN" -e "display notification \"$ESCAPED\" with title \"MAOS backup\" sound name \"Basso\"" \
  >/dev/null 2>&1; then
  echo "$(stamp) notification could not be shown (see the line above)" >> "$ALERT_LOG"
fi
exit 0
