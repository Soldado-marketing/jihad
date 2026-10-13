# Off-site encrypted backup: owner setup gate (D2, MAOS-T20)

The code is in place and tested; it stays silent until these steps are done.
They need an account, payment and secrets, so they are the owner's. About 15 minutes.

**Choose a provider:** S3-compatible object storage, EU region, independent of
Railway and of this Mac. Any of: Hetzner Object Storage (Germany), Backblaze B2
(EU Central), Scaleway Object Storage (Paris/Amsterdam), Cloudflare R2. A few
MB per night; cost is about the provider's minimum monthly fee.

1. **Create the bucket** (private, EU region). Turn on **versioning** and, if
   offered, **object lock** (compliance or governance, 35 days). Add a
   **lifecycle rule**: delete objects older than 35 days.
2. **Create an access key limited to that bucket**, allowed to *put* and *get*
   objects (not delete, not other buckets).
3. **Store the access key in the Keychain** on the backup Mac. Each command
   asks for the value interactively; nothing goes on the command line or in history:
   ```bash
   security add-generic-password -s maos-offsite-access-key-id -a maos -w
   ```
   ```bash
   security add-generic-password -s maos-offsite-secret-access-key -a maos -w
   ```
4. **Create the encryption key** (stored in the Keychain; the certificate goes
   to `~/MAOS_BACKUPS/offsite/recipient.pem`):
   ```bash
   ~/MAOS_BACKUPS/runtime/current/scripts/offsite-setup-keys.sh
   ```
5. **Escrow the private key outside this Mac** (essential: without it the
   off-site copies cannot be decrypted if the Mac is lost). Copy it to the
   clipboard, paste it into your password manager, then copy something else:
   ```bash
   security find-generic-password -s maos-offsite-private-key -a maos -w | base64 -d | pbcopy
   ```
6. **Write the (non-secret) config** `~/MAOS_BACKUPS/offsite.env`:
   ```
   OFFSITE_ENDPOINT=https://<provider S3 endpoint>
   OFFSITE_REGION=<region>
   OFFSITE_BUCKET=<bucket>
   ```
7. Tell Claude "D2 configured". It then runs one upload and one off-site
   restore rehearsal, checks both, and records the result in the ledger.
   From then on every nightly backup is copied and every weekly rehearsal also
   restores the off-site copy.
