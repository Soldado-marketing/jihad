#!/bin/sh
#
# MAOS - pg_dump that runs inside the official postgres image.
#
# For a host without PostgreSQL client tools (the backup Mac). scripts/
# nightly-backup.sh puts this on PATH as `pg_dump`, so scripts/backup-db.sh
# runs unmodified.
#
#   --file=<host path>  -> written through a bind mount of its directory
#   --dbname=<url>      -> moved into the container environment, so it is not
#                          placed on the `docker` command line
#   PGUSER / PGPASSWORD -> passed through by name only (-e VAR), so the values
#                          never appear in any argument list
#
# Environment:
#   DOCKER_BIN     docker binary. Default /usr/local/bin/docker, else PATH.
#   PG_DUMP_IMAGE  image; its major version must be at least the server's.
#                  Default postgres:18 (the production server's version).
#
# The remaining arguments come from scripts/backup-db.sh (fixed flags only).
set -e

if [ -z "${DOCKER_BIN:-}" ]; then
  if [ -x /usr/local/bin/docker ]; then DOCKER_BIN=/usr/local/bin/docker; else DOCKER_BIN=docker; fi
fi
IMAGE="${PG_DUMP_IMAGE:-postgres:18}"

OUTFILE=""
ARGS=""
DBURL=""

for a in "$@"; do
  case "$a" in
    --file=*)   OUTFILE="${a#--file=}" ;;
    --dbname=*) DBURL="${a#--dbname=}" ;;
    *)          ARGS="$ARGS $a" ;;
  esac
done

[ -n "$DBURL" ] || { echo "pg_dump shim: --dbname=<url> is required" >&2; exit 2; }
[ -n "$OUTFILE" ] || { echo "pg_dump shim: --file=<path> is required" >&2; exit 2; }

OUTDIR="$(cd "$(dirname "$OUTFILE")" && pwd)"
BASE="$(basename "$OUTFILE")"

export PGSHIM_URL="$DBURL"
exec "$DOCKER_BIN" run --rm \
  -e PGSHIM_URL -e PGUSER -e PGPASSWORD \
  -v "$OUTDIR:/out" "$IMAGE" \
  sh -c "pg_dump --dbname=\"\$PGSHIM_URL\" $ARGS --file=/out/$BASE"
