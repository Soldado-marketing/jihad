#!/usr/bin/env bash
# MAOS — Safe Prisma Migration Runner
# Run from: /Users/jihadhilal/Documents/claude
# Uses Prisma v6.19.3 (project-pinned) from the builder Docker stage.
# DATABASE_URL is read from the running api container — never printed.

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MAOS — Prisma Migration Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Confirm working directory ──────────────────────────────────────────
echo ""
echo "[1/7] Working directory"
pwd

# ── Step 2: Confirm postgres container is healthy ──────────────────────────────
echo ""
echo "[2/7] Postgres health check"
docker compose exec -T postgres pg_isready -U maos -d maos

# ── Step 3: Build migrator image (builder stage = full devDeps + Prisma CLI) ──
echo ""
echo "[3/7] Building migrator image from builder stage..."
docker build --target builder -t claude-api-migrator -f apps/api/Dockerfile apps/api

# ── Step 4: Confirm Prisma version (must be 6.x) ──────────────────────────────
echo ""
echo "[4/7] Prisma version in migrator image:"
docker run --rm claude-api-migrator npx --no-install prisma --version

# ── Step 5: Identify docker network ───────────────────────────────────────────
echo ""
echo "[5/7] Docker network:"
NETWORK=$(docker network ls --filter name=claude --format '{{.Name}}' | head -1)
echo "  → $NETWORK"

# ── Step 6: Run migrations ────────────────────────────────────────────────────
echo ""
echo "[6/7] Applying migrations..."
DB_URL=$(docker compose exec -T api printenv DATABASE_URL | tr -d '\r')
docker run --rm \
  --network "$NETWORK" \
  -e DATABASE_URL="$DB_URL" \
  claude-api-migrator \
  npx --no-install prisma migrate deploy

# ── Step 7: Verify tables ─────────────────────────────────────────────────────
echo ""
echo "[7/7] Tables in public schema:"
docker compose exec -T postgres psql -U maos -d maos -c "\dt public.*"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MIGRATIONS COMPLETE — tables created"
echo " Next step: POST /api/auth/bootstrap"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  curl -s -X POST http://localhost:3001/api/auth/bootstrap \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"abo@soldado-services.de\",\"password\":\"<YOUR_PASSWORD>\",\"name\":\"Admin\"}' \\"
echo "    | python3 -m json.tool"
echo ""
