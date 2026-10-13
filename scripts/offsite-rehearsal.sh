#!/usr/bin/env bash
#
# MAOS - restore rehearsal of the off-site copy (MAOS-T20, owner decision D2).
#
# Proves the off-site copy is restorable, not just present:
#   download ciphertext + manifest -> ciphertext sha256 -> decrypt with the
#   private key -> plaintext sha256 -> full isolated restore rehearsal
#   (restore-rehearsal.sh: a throwaway container, never production).
#
#   ./scripts/offsite-rehearsal.sh [object-name]   (default: the last upload)
#
# Same configuration as offsite-backup.sh. The private key is read from the
# Keychain item maos-offsite-private-key (base64 of the PEM), written only to a
# mode-600 file in a private temp directory and removed on exit.
# Appends PASS/FAIL to logs/offsite-rehearsal.log; alerts on failure.
#
# Test seams: MAOS_OFFSITE_CURL, MAOS_SECURITY_BIN, MAOS_BACKUP_ALERT,
# MAOS_REHEARSAL_CMD (default scripts/restore-rehearsal.sh).

set -uo pipefail

BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
CONFIG="${MAOS_OFFSITE_CONFIG:-$BACKUP_HOME/offsite.env}"
CURL_BIN="${MAOS_OFFSITE_CURL:-/usr/bin/curl}"
SECURITY_BIN="${MAOS_SECURITY_BIN:-/usr/bin/security}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALERT="${MAOS_BACKUP_ALERT:-$SCRIPT_DIR/backup-alert.sh}"
REHEARSAL="${MAOS_REHEARSAL_CMD:-$SCRIPT_DIR/restore-rehearsal.sh}"
LOG="$BACKUP_HOME/logs/offsite-rehearsal.log"
mkdir -p "$(dirname "$LOG")"

stamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "$(stamp) $*" >> "$LOG"; echo "$*"; }
WORK=""
cleanup() { [ -n "$WORK" ] && rm -rf "$WORK"; }
trap cleanup EXIT
fail() {
  log "FAIL: $1"
  "$ALERT" "Off-site restore rehearsal failed: $1" >/dev/null 2>&1 || true
  exit 1
}
sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }

[ -f "$CONFIG" ] || { log "NOT CONFIGURED: $CONFIG missing (owner setup gate D2)"; exit 2; }
# shellcheck disable=SC1090
. "$CONFIG"
OFFSITE_PREFIX="${OFFSITE_PREFIX:-maos/production}"
for v in OFFSITE_ENDPOINT OFFSITE_REGION OFFSITE_BUCKET; do
  [ -n "${!v:-}" ] || fail "$v is not set in the off-site config"
done

NAME="${1:-$(cat "$BACKUP_HOME/offsite/last-upload" 2>/dev/null)}"
[ -n "$NAME" ] || fail "no object to rehearse (no upload recorded)"
case "$NAME" in maos-*.dump.cms) ;; *) fail "unexpected object name" ;; esac

secret() { "$SECURITY_BIN" find-generic-password -s "$1" -a maos -w 2>/dev/null; }
ACCESS_KEY="$(secret maos-offsite-access-key-id)" || ACCESS_KEY=""
SECRET_KEY="$(secret maos-offsite-secret-access-key)" || SECRET_KEY=""
[ -n "$ACCESS_KEY" ] && [ -n "$SECRET_KEY" ] || fail "off-site credentials missing from the Keychain"

WORK="$(mktemp -d)"; chmod 700 "$WORK"
URL="${OFFSITE_ENDPOINT%/}/$OFFSITE_BUCKET/$OFFSITE_PREFIX"
s3() {
  printf 'user = "%s:%s"\n' "$ACCESS_KEY" "$SECRET_KEY" \
    | "$CURL_BIN" -K - --silent --show-error --fail --aws-sigv4 "aws:amz:$OFFSITE_REGION:s3" "$@"
}
s3 -o "$WORK/$NAME" "$URL/$NAME" >/dev/null 2>&1 || fail "download failed"
s3 -o "$WORK/manifest" "$URL/$NAME.manifest" >/dev/null 2>&1 || fail "manifest download failed"
field() { sed -n "s/^$1=//p" "$WORK/manifest"; }
[ "$(sha "$WORK/$NAME")" = "$(field cipher_sha256)" ] || fail "ciphertext checksum mismatch"

( umask 077; secret maos-offsite-private-key | base64 -d > "$WORK/key.pem" 2>/dev/null )
[ -s "$WORK/key.pem" ] || fail "private key missing from the Keychain"
DUMP="$WORK/${NAME%.cms}"
openssl cms -decrypt -binary -inform DER -in "$WORK/$NAME" -inkey "$WORK/key.pem" -out "$DUMP" 2>/dev/null \
  || fail "decryption failed"
rm -f "$WORK/key.pem"
PLAIN_SHA="$(sha "$DUMP")"
[ "$PLAIN_SHA" = "$(field plain_sha256)" ] || fail "decrypted dump checksum mismatch"
echo "$PLAIN_SHA  $DUMP" > "$DUMP.sha256"

"$REHEARSAL" "$DUMP" > "$WORK/rehearsal.out" 2>&1 || fail "isolated restore rehearsal failed"
log "PASS: $NAME downloaded, decrypted, checksums match, isolated restore OK"
exit 0
