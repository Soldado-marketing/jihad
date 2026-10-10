# Project Rules

## Project Identity

- Project name: MAOS — Soldado Marketing Platform
- Project path: `~/Developer/MAOS/claude` (all MAOS-owned material stays under `~/Developer/MAOS/`)
- Main active architecture: `apps/web` for the frontend and `apps/api` for the backend API.

## Active Project Boundary

- All future work must stay inside the existing project folder:
  `~/Developer/MAOS/claude`
- Do not create a new project folder.
- Do not rename the project folder.
- Do not save generated files, temporary files, downloads, exports, or task files outside this project path.

## No Root Application

- The old root Next.js app was removed. Do not recreate root-level `app`, `components`, `lib` or `styles` folders.
- The active MAOS implementation remains under:
  - `apps/web`
  - `apps/api`

## Duplicate Folder Prevention

- Do not create duplicate project folders or renamed copies such as:
  - `final`
  - `copy`
  - `backup`
  - `v2`
  - `updated`
  - `fixed`
  - `new project`
  - `claude final`, `claude copy`, `claude backup`, `claude v2`, `claude updated`
  - any second MAOS checkout outside `~/Developer/MAOS/`

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

- The root directory must not receive random files.
- Root-level files are allowed only when they are standard project-level files. Today these are:
  - `README.md`, `CLAUDE.md`, `PROJECT_RULES.md`, `.gitignore`
  - `docker-compose.yml`, `docker-compose.dev.yml`, `setup.sh`, `run_migrations.sh`
- There is no root `package.json`; `apps/api` and `apps/web` each have their own.

## Existing File Update Rule

- Before creating any new file, check whether an equivalent file already exists.
- If a similar or equivalent file exists, update the existing file instead of creating a duplicate.
- Do not create duplicate README files, duplicate documentation files, duplicate configuration files, or duplicate feature files.

## Related Files Rule

- Related files must stay together in the correct existing folder.
- Do not split one feature across unrelated folders unless the existing architecture already separates frontend, backend, tests, and documentation.
- Do not dump unrelated files into a single folder.

## Future Task Procedure

Before making changes, Codex must:

1. Work only inside the canonical MAOS repository `~/Developer/MAOS/claude`.
2. Read `docs/MAOS_PRODUCT_BLUEPRINT.md` and validate the task against it (§30). On a conflict with a Blueprint invariant, STOP and return `BLUEPRINT_CONFLICT`. Never change the Blueprint inside an unrelated implementation task. One MAOS task at a time.
3. Identify the existing related folders and files.
4. Prefer updating existing files over creating new ones.
5. Confirm the correct location before adding any necessary new file.
6. Avoid touching unrelated files.
7. Avoid moving, deleting, or renaming files unless explicitly approved.

## Required File-Change Report

Every task must end with a file-change report that includes exact paths:

- Modified files
- Created files
- Moved files, with old path and new path
- Deleted files, if any
- Skipped files, if any
- Reason for each change
