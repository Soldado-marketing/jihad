#!/usr/bin/env bash
set -e

echo "═══════════════════════════════════════"
echo "  MAOS — First-Run Setup"
echo "═══════════════════════════════════════"

# Check Docker
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required. Install from https://docker.com"; exit 1; }

# Setup .env
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "✓ Created apps/api/.env — edit JWT secrets before production!"
fi

# Start infra
echo ""
echo "▶ Starting PostgreSQL + Redis..."
docker compose -f docker-compose.dev.yml up -d
sleep 4

# Install deps
echo ""
echo "▶ Installing API dependencies..."
cd apps/api && npm install

# Generate Prisma client
echo ""
echo "▶ Generating Prisma client..."
npm run prisma:generate

# Run migrations
echo ""
echo "▶ Running database migrations..."
npm run prisma:migrate:dev -- --name init

# Seed
echo ""
echo "▶ Seeding database..."
npm run prisma:seed

cd ../..

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Setup complete!"
echo "═══════════════════════════════════════"
echo ""
echo "  Start the API:     cd apps/api && npm run dev"
echo "  Start the Web:     cd apps/web && npm run dev"
echo ""
echo "  API:  http://localhost:3001"
echo "  Web:  http://localhost:3000"
echo ""
echo "  Login: owner@demo-agency.com / Password123!"
echo "═══════════════════════════════════════"
