#!/usr/bin/env bash
# MAOS A07 — the whole load assessment on this machine, and nothing else:
# a disposable PostgreSQL container with invented data, the API built from this
# checkout, 20 people on every list endpoint, the database's statement
# statistics, and everything removed again.
#
# Usage: scripts/perf/run-local.sh <output-dir> [seconds-per-endpoint] [users]
#        A07_ONLY='GET /tasks' A07_LADDER='1 5 10 20' scripts/perf/run-local.sh <output-dir> 10
# Needs: docker, node, `npm ci` done in apps/api. Never reads a production
# address or credential; DATABASE_URL is set here and only here.
set -euo pipefail
OUT="${1:?usage: run-local.sh <output-dir> [seconds] [users]}"; SECONDS_EACH="${2:-20}"; USERS="${3:-20}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
NAME=maos-a07-pg; DB_PORT=55441; API_PORT=3911
mkdir -p "$OUT"
export DATABASE_URL="postgresql://maos:maos_local_only@127.0.0.1:${DB_PORT}/maos_a07?schema=public"
export JWT_SECRET="a07-local-only-secret-0123456789abcdef0123456789" JWT_REFRESH_SECRET="a07-local-only-refresh-0123456789abcdef0123456789"
export CORS_ORIGINS="http://127.0.0.1:3910" WEB_URL="http://127.0.0.1:3910" TRUST_PROXY_HOPS=1
export S3_BUCKET=a07 S3_REGION=eu-central-1 S3_ACCESS_KEY_ID=a07-local-only S3_SECRET_ACCESS_KEY=a07-local-only-not-a-secret S3_ENDPOINT="http://127.0.0.1:9199" S3_FORCE_PATH_STYLE=true
API_PID=""
cleanup() { [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true; docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_USER=maos -e POSTGRES_PASSWORD=maos_local_only -e POSTGRES_DB=maos_a07 -p "127.0.0.1:${DB_PORT}:5432" \
  postgres:16-alpine -c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all >/dev/null
for _ in $(seq 1 40); do docker exec "$NAME" pg_isready -U maos -d maos_a07 >/dev/null 2>&1 && break; sleep 1; done

cd "$REPO/apps/api"
npx prisma migrate deploy >/dev/null
[ -f dist/main.js ] || npm run build >/dev/null
node "$REPO/scripts/perf/seed-load.mjs" "$OUT/seed.json"
# Fresh planner statistics, as a database that has been running for a while has them.
docker exec "$NAME" psql -U maos -d maos_a07 -q -c "ANALYZE" >/dev/null

PORT="$API_PORT" NODE_ENV=production node dist/main.js > "$OUT/api.log" 2>&1 &
API_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "http://127.0.0.1:${API_PORT}/api/health/ready" && break; sleep 1; done
curl -sf -o /dev/null "http://127.0.0.1:${API_PORT}/api/health/ready" || { echo "API not ready"; tail -20 "$OUT/api.log"; exit 1; }

node "$REPO/scripts/perf/slow-queries.mjs" reset
# caffeinate keeps this Mac from idling during the run; elsewhere the runner is started directly.
KEEP=(); command -v caffeinate >/dev/null 2>&1 && KEEP=(caffeinate -i)
if [ -n "${A07_LADDER:-}" ]; then
  # How one endpoint behaves as people are added: A07_ONLY names it, A07_LADDER lists the numbers of users.
  for n in $A07_LADDER; do
    "${KEEP[@]}" node "$REPO/scripts/perf/load.mjs" --api "http://127.0.0.1:${API_PORT}/api" --seed "$OUT/seed.json" --out "$OUT/ladder-$n.json" --users "$n" --seconds "$SECONDS_EACH" --only "${A07_ONLY:-GET /tasks}" | grep " as " | sed "s/^/$n users: /" | tee -a "$OUT/ladder.txt"
  done
else
  "${KEEP[@]}" node "$REPO/scripts/perf/load.mjs" --api "http://127.0.0.1:${API_PORT}/api" --seed "$OUT/seed.json" --out "$OUT/results.json" --users "$USERS" --seconds "$SECONDS_EACH" | tee "$OUT/load.txt"
fi
node "$REPO/scripts/perf/slow-queries.mjs" report "$OUT/slow-queries.json" | tee "$OUT/slow-queries.txt"
node "$REPO/scripts/perf/plans.mjs" "$OUT/plans.json"
docker exec -i "$NAME" psql -U maos -d maos_a07 -X -q -f - < "$OUT/plans.sql" > "$OUT/plans.txt" 2>&1 || true
grep -ciE '"level":"error"|unhandled|ECONN' "$OUT/api.log" | sed 's/^/api error lines: /' || true
rm -f "$OUT/seed.json"
echo "done; the container is removed on exit"
