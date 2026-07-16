# ── Stage 1: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Required for bcrypt native build
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src/
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev

# Copy the already-generated Prisma client from builder stage.
# Do NOT run `npx prisma generate` here: production install uses --omit=dev so
# the prisma CLI is absent, which causes npx to silently download prisma@latest —
# a version incompatible with this project's pinned Prisma. Copying the artifacts
# generated in builder (with the correct pinned version) avoids this entirely.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled output
COPY --from=builder /app/dist ./dist/

# Non-root user for security
RUN addgroup -S maos && adduser -S maos -G maos
USER maos

EXPOSE 3001

# Run migrations then start — migrations are idempotent so safe to run on every deploy
CMD ["node", "dist/main.js"]
