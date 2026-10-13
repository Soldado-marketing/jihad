#!/usr/bin/env bash
#
# MAOS - encrypted off-site copy of a verified backup (MAOS-T20, owner decision D2).
#
# Copies one verified dump to S3-compatible object storage outside both this
# Mac and Railway:
#   1. checks the dump against its .sha256 (never ships a corrupt dump);
#   2. encrypts it on this Mac BEFORE upload with the recipient certificate
#      (openssl cms, AES-256; only the private key can decrypt, and the Mac
#      needs only the public certificate to encrypt);
#   3. uploads the ciphertext and a small manifest (plain and cipher sha256);
#   4. downloads the ciphertext back and compares its sha256 - an upload is
#      only "OK" when the stored copy is proven intact.
#
#   ./scripts/offsite-backup.sh [dump-file]     (default: newest verified dump)
#
# Configuration (not secret) in $MAOS_OFFSITE_CONFIG, default
# $MAOS_BACKUP_HOME/offsite.env:
#   OFFSITE_ENDPOINT  https://<s3-endpoint>   OFFSITE_REGION   e.g. eu-central
#   OFFSITE_BUCKET    bucket name             OFFSITE_PREFIX   default maos/production
#   OFFSITE_CERT      recipient certificate (PEM), default $MAOS_BACKUP_HOME/offsite/recipient.pem
# Secrets come from the macOS Keychain (account "maos") and never appear on a
# command line or in output: maos-offsite-access-key-id, maos-offsite-secret-access-key.
# Retention and deletion belong to the bucket (lifecycle + object lock): the
# key this Mac holds should be allowed to write and read, not to delete.
#
# Exit 0 on a verified upload; 1 on failure (and one alert via backup-alert.sh);
# 2 when off-site storage is not configured yet (no alert: setup gate pending).
#
# Test seams: MAOS_OFFSITE_CURL, MAOS_SECURITY_BIN, MAOS_BACKUP_ALERT.

set -uo pipefail

BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
CONFIG="${MAOS_OFFSITE_CONFIG:-$BACKUP_HOME/offsite.env}"
CURL_BIN="${MAOS_OFFSITE_CURL:-/usr/bin/curl}"
SECURITY_BIN="${MAOS_SECURITY_BIN:-/usr/bin/security}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALERT="${MAOS_BACKUP_ALERT:-$SCRIPT_DIR/backup-alert.sh}"
LOG="$BACKUP_HOME/logs/offsite.log"
mkdir -p "$(dirname "$LOG")"

stamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "$(stamp) $*" >> "$LOG"; echo "$*"; }
WORK=""
cleanup() { [ -n "$WORK" ] && rm -rf "$WORK"; }
trap cleanup EXIT
fail() {
  log "FAIL: $1"
  "$ALERT" "Off-site backup failed: $1" >/dev/null 2>&1 || true
  exit 1
}
sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }

if [ ! -f "$CONFIG" ]; then
  log "NOT CONFIGURED: $CONFIG missing (owner setup gate D2) - nothing uploaded"
  exit 2
fi
# shellcheck disable=SC1090
. "$CONFIG"
OFFSITE_PREFIX="${OFFSITE_PREFIX:-maos/production}"
OFFSITE_CERT="${OFFSITE_CERT:-$BACKUP_HOME/offsite/recipient.pem}"
for v in OFFSITE_ENDPOINT OFFSITE_REGION OFFSITE_BUCKET; do
  [ -n "${!v:-}" ] || fail "$v is not set in the off-site config"
done
case "$OFFSITE_ENDPOINT" in https://*) ;; *) fail "OFFSITE_ENDPOINT must be https" ;; esac
[ -f "$OFFSITE_CERT" ] || fail "recipient certificate not found"

secret() { "$SECURITY_BIN" find-generic-password -s "$1" -a maos -w 2>/dev/null; }
ACCESS_KEY="$(secret maos-offsite-access-key-id)" || ACCESS_KEY=""
SECRET_KEY="$(secret maos-offsite-secret-access-key)" || SECRET_KEY=""
[ -n "$ACCESS_KEY" ] && [ -n "$SECRET_KEY" ] || fail "off-site credentials missing from the Keychain"

# The dump: the argument, or the newest one whose checksum matches.
DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  for f in $(ls -t "$BACKUP_HOME/production"/maos-*.dump 2>/dev/null); do
    [ -f "$f.sha256" ] && [ "$(sha "$f")" = "$(cut -d' ' -f1 < "$f.sha256")" ] && { DUMP="$f"; break; }
  done
fi
[ -n "$DUMP" ] && [ -f "$DUMP" ] || fail "no verified dump to copy"
[ -f "$DUMP.sha256" ] || fail "dump has no .sha256"
PLAIN_SHA="$(sha "$DUMP")"
[ "$PLAIN_SHA" = "$(cut -d' ' -f1 < "$DUMP.sha256")" ] || fail "dump checksum mismatch - not copied"

NAME="$(basename "$DUMP").cms"
WORK="$(mktemp -d)"
openssl cms -encrypt -binary -aes256 -outform DER -in "$DUMP" -out "$WORK/$NAME" "$OFFSITE_CERT" 2>/dev/null \
  || fail "encryption failed"
# Never upload plaintext: a pg_dump custom archive starts with PGDMP.
[ -s "$WORK/$NAME" ] && [ "$(head -c 5 "$WORK/$NAME")" != "PGDMP" ] || fail "encryption output invalid"
CIPHER_SHA="$(sha "$WORK/$NAME")"
printf 'name=%s\nplain_sha256=%s\ncipher_sha256=%s\nbytes=%s\ncreated=%s\n' \
  "$NAME" "$PLAIN_SHA" "$CIPHER_SHA" "$(wc -c < "$WORK/$NAME" | tr -d ' ')" "$(stamp)" > "$WORK/$NAME.manifest"

URL="${OFFSITE_ENDPOINT%/}/$OFFSITE_BUCKET/$OFFSITE_PREFIX"
# Credentials reach curl through its config on stdin, never through argv.
s3() {
  printf 'user = "%s:%s"\n' "$ACCESS_KEY" "$SECRET_KEY" \
    | "$CURL_BIN" -K - --silent --show-error --fail --aws-sigv4 "aws:amz:$OFFSITE_REGION:s3" "$@"
}
s3 -T "$WORK/$NAME" "$URL/$NAME" >/dev/null 2>&1 || fail "upload failed"
s3 -T "$WORK/$NAME.manifest" "$URL/$NAME.manifest" >/dev/null 2>&1 || fail "manifest upload failed"

# Prove the stored copy: read it back and compare.
s3 -o "$WORK/check" "$URL/$NAME" >/dev/null 2>&1 || fail "read-back failed"
[ "$(sha "$WORK/check")" = "$CIPHER_SHA" ] || fail "stored copy checksum mismatch"

mkdir -p "$BACKUP_HOME/offsite"
echo "$NAME" > "$BACKUP_HOME/offsite/last-upload"
log "OK: $NAME uploaded and verified (cipher sha256 $CIPHER_SHA)"
exit 0
