#!/usr/bin/env bash
#
# MAOS - one-time key setup for the encrypted off-site copy (MAOS-T20, D2).
# Run by the OWNER, once, on the backup Mac:
#
#   ./scripts/offsite-setup-keys.sh
#
# Creates an RSA-4096 key and a self-signed recipient certificate:
#   - the certificate (public; encrypts) -> $MAOS_BACKUP_HOME/offsite/recipient.pem
#   - the private key (decrypts)         -> Keychain item maos-offsite-private-key
#     (account maos, base64 of the PEM), entered through `security -i` on
#     stdin, so it never appears on a command line, in a file that stays, or
#     in this script's output.
# Refuses to replace an existing key: a new key could not decrypt older copies.
#
# AFTER RUNNING: keep a copy of the private key OUTSIDE this Mac (password
# manager). Without it, the off-site copies cannot be decrypted if the Mac is
# lost. Copy it to the clipboard with:
#   security find-generic-password -s maos-offsite-private-key -a maos -w | base64 -d | pbcopy
# paste it into the password manager, then clear the clipboard.

set -euo pipefail
BACKUP_HOME="${MAOS_BACKUP_HOME:-$HOME/MAOS_BACKUPS}"
CERT="$BACKUP_HOME/offsite/recipient.pem"

if security find-generic-password -s maos-offsite-private-key -a maos >/dev/null 2>&1; then
  echo "A maos-offsite-private-key already exists in the Keychain - not replaced." >&2
  exit 1
fi
mkdir -p "$BACKUP_HOME/offsite"
WORK="$(mktemp -d)"; chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT
( umask 077
  openssl req -x509 -newkey rsa:4096 -nodes -days 3650 -subj "/CN=MAOS off-site backup" \
    -keyout "$WORK/key.pem" -out "$WORK/cert.pem" 2>/dev/null )
KEY_B64="$(base64 < "$WORK/key.pem" | tr -d '\n')"
printf 'add-generic-password -s maos-offsite-private-key -a maos -l "MAOS off-site backup private key" -w %s\n' "$KEY_B64" | security -i
unset KEY_B64
cp "$WORK/cert.pem" "$CERT"
echo "Certificate: $CERT"
echo "Private key stored in the Keychain (maos-offsite-private-key)."
echo "NOW keep a copy of the private key in your password manager (see the header of this script)."
