# Railway Build And Start Command Guide

## Purpose

Document expected Railway build/start commands based on the current repository package files.

## Inspected Package Scripts

| Path | Scripts Found |
|---|---|
| Root `package.json` | `dev`, `build`, `start`, `typecheck`, `lint`, `format` |
| `apps/web/package.json` | `dev`, `build`, `start`, `typecheck`, `test` |
| `apps/api/package.json` | `build`, `dev`, `start`, `typecheck`, `test`, `prisma:generate`, `prisma:validate` |

## Web Service: `apps/web`

| Field | Expected Value |
|---|---|
| Railway service root | `apps/web` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Runtime command resolved to | `next start` |
| Working directory | `apps/web` |
| Dev command | `npm run dev` |
| Test command | `npm test` |

## Web Start Command Caveat

Resolved: `apps/web/package.json` now defines a package-level `start` script.

| Selected Option | Command | Notes |
|---|---|---|
| Package start script | `npm start` | Runs `next start` after `npm run build` |

Railway can use `npm run build` followed by `npm start` for the `apps/web` service.

## API Service: `apps/api`

| Field | Expected Value |
|---|---|
| Railway service root | `apps/api` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Runtime command resolved to | `node dist/main.js` |
| Dev command | `npm run dev` |
| Test command | `npm test` |
| Prisma validation | `npm run prisma:validate` |

## API Runtime Details

- The API uses NestJS.
- The API sets global prefix `/api`.
- The API listens on `process.env.PORT` with fallback `3001`.
- Railway should provide `PORT`; if not, configure it explicitly.

## Monorepo Caveats

| Caveat | Required Decision |
|---|---|
| Railway service root must be set per service | Web root: `apps/web`; API root: `apps/api` |
| Root `package.json` is a separate Next app and should not be used for MAOS staging | Do not deploy root app for MAOS staging |
| `apps/web` production start script | Resolved: use `npm start` from `apps/web` |
| Database setup is separate from Prisma validation | Do not create production migrations in staging decision package |

## Acceptance Criteria

- API build/start commands are ready for Railway.
- Web build/start commands are ready for Railway staging.
- No SandAroma, WordPress, or WooCommerce deployment path is included.
