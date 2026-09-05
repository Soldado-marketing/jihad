# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* is inlined into the browser bundle by `next build`, so the API
# URL has to be present HERE, at image build time. A runtime environment
# variable on the container cannot change an already-built bundle — which is why
# docker-compose.yml setting NEXT_PUBLIC_API_URL under `environment:` has no
# effect on it. Pass it as a build argument:
#
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com apps/web
#
# Deliberately NO default. A default would let a deployment that forgets the
# build argument succeed, exit 0, pass its health check, and serve a bundle
# whose every request goes to the visitor's own machine — a silent failure with
# nothing in the build log to explain it. Failing here instead costs one clear
# error message and cannot reach production.
# Not a secret: NEXT_PUBLIC_* values are public by definition and ship to every
# browser. The ENV lives only in this builder stage, which is discarded — the
# production stage below inherits nothing from it.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# -n also rejects an empty string, which would otherwise inline "" and make
# apiBase() resolve to a bare "/api" — a third behaviour nobody asked for.
RUN test -n "$NEXT_PUBLIC_API_URL" || { echo "Build failed: NEXT_PUBLIC_API_URL build-arg is required (it is inlined into the browser bundle)."; exit 1; }

# Build Next.js — output: standalone for minimal production image
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Production ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup -S maos && adduser -S maos -G maos

# Copy only what Next.js needs to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER maos

EXPOSE 3000

CMD ["node", "server.js"]
