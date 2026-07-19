# Project Rules

## Project Identity

- Project name: MAOS — Soldado Marketing Platform
- Project root: `/Users/jihadhilal/Documents/claude`
- Main active architecture: `apps/web` for the frontend and `apps/api` for the backend API.

## Active Project Boundary

- All MAOS work must stay inside the existing project folder:
  `/Users/jihadhilal/Documents/claude`
- Do not create a new project folder.
- Do not rename the project folder.
- Do not save generated files, temporary files, downloads, exports, or task files outside this project path.

## Active Project Areas

| Area | Path |
|---|---|
| Backend | `apps/api` |
| Frontend | `apps/web` |
| Prisma schema and migrations | `apps/api/prisma` |
| Migrations | `apps/api/prisma/migrations` |
| Documentation | `docs` |
| Shared code | `packages` |

The `packages` directory must never become a parallel application or runnable service. It may only contain explicitly shared code (config, shared utilities, types).

## Root Legacy Application Directories

The root-level directories `app/`, `components/`, `lib/`, and `styles/` are not part of active MAOS and do not currently exist in the repository.

- Do not recreate these directories.
- Application code belongs under `apps/api` or `apps/web` only.

## Duplicate Project Prevention

- The only valid project root is `/Users/jihadhilal/Documents/claude`.
- Do not create any parallel, copied, final, backup, or replacement MAOS project directory outside this root.
- Do not create any folder that duplicates or replaces the project, regardless of its name.

## Approved External Backup

One owner-approved external safety backup exists at:
`/Users/jihadhilal/Documents/MAOS_BEFORE_CLEANUP_BACKUP_20260715`

- This is not an active project root.
- Claude must not modify, delete, rename, move, or work inside it.
- No new external backup directory may be created without explicit owner approval.

## File Placement Rules

- Files must be placed by feature, file type, and purpose.
- Frontend pages and routes must stay inside the existing frontend app structure.
- Frontend components must stay inside the existing components structure.
- Backend API, modules, controllers, services, DTOs, repositories, and guards must stay inside the existing API structure.
- Styles must stay inside existing style folders.
- Documentation must stay inside `docs` unless the file is a standard root-level project file.
- Tests must stay near the related feature or inside the existing test folders.
- Database, schema, Prisma, and migration-related files must stay inside the existing database or Prisma folders.
- Shared utilities must stay inside existing shared, common, utility, helper, or library folders.

## Root Directory Rules

- Existing tracked project-wide configuration, Docker files, documentation, and approved maintenance scripts may remain at root.
- New application code must go only under `apps/api` or `apps/web`.
- New documentation must go under `docs`.
- New Prisma and migration files must go under `apps/api/prisma`.
- Random or generated files must not be added to root.
- Do not maintain a hardcoded exhaustive list of root files.

## Environment Files

- **Root `.env`** — local ignored file containing Docker/runtime secrets. Never commit, print, or copy its contents.
- **`apps/api/.env.example`** — safe development template.
- **`apps/api/.env.production.example`** — safe production template.
- Real secrets must never be committed, printed, copied into reports, or exposed in any form.

## Existing File Update Rule

- Before creating any new file, check whether an equivalent file already exists.
- If a similar or equivalent file exists, update the existing file instead of creating a duplicate.
- Do not create duplicate README files, duplicate documentation files, duplicate configuration files, or duplicate feature files.

## Related Files Rule

- Related files must stay together in the correct existing folder.
- Do not split one feature across unrelated folders unless the existing architecture already separates frontend, backend, tests, and documentation.
- Do not dump unrelated files into a single folder.

## Database Safety Rules

The following operations are permanently forbidden unless explicitly approved by the project owner after a dedicated review:

- Never run `prisma db push`.
- Never run `prisma migrate dev`.
- Never run `prisma migrate reset`.
- Never delete or recreate the current database.
- Never modify an existing migration directory or its `migration.sql`.
- Never create a baseline migration without a separately approved baseline strategy.
- A baseline migration must not simply be appended after existing migrations — its timestamp and structure must be selected only after a dedicated read-only Prisma migration-history audit.
- Existing migration history and the current `_prisma_migrations` table state must be inspected before selecting a baseline timestamp or structure.
- Never run `prisma seed` or any data-mutating script without explicit owner approval.
- Never use Prisma Studio to create, edit, or delete data without explicit owner approval.

## SQL Backup Files

Local SQL backup files such as `backup_before_tasks_phase1_*.sql` are local safety artifacts:

- They must remain listed in `.gitignore` and must never be committed to the repository.
- They must not be edited or moved.
- They must not be used as a source of truth for schema state.

## Future Task Procedure

Before making changes, the assistant must:

1. Work only inside `/Users/jihadhilal/Documents/claude`.
2. Identify the existing related folders and files.
3. Prefer updating existing files over creating new ones.
4. Confirm the correct location before adding any necessary new file.
5. Avoid touching unrelated files.
6. Avoid moving, deleting, or renaming files unless explicitly approved.

## Required File-Change Report

Every task must end with a file-change report that includes exact paths:

- Modified files
- Created files
- Moved files, with old path and new path
- Deleted files, if any
- Skipped files, if any
- Reason for each change
