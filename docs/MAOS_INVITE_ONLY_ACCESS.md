# MAOS — Invite-only onboarding

Approved by owner: 2026-10-27
Implementation scope: independent PR for controlled onboarding; does not include the
unmerged multi-company PR #112, finance, design, or production infrastructure changes.

## Policy
- MAOS is publicly reachable for login and accepting invitations only.
- No visitor can create a MAOS account or request membership by submitting
  the previous public registration form or posting to /auth/register.
- Backend POST /auth/register always returns 403, regardless of body or tenantSlug.
  AuthService.register also refuses calls before any database or mail side effect.
- /auth/register is an informational page with no signup form.
- Existing users sign in normally; existing memberships and owner approvals
  remain unchanged.
- OWNER sends tenant-scoped, expiring, one-time invites through the existing
  authenticated /admin/invites workflow.
- Tokenized invitation preview and acceptance remain available under
  /auth/invites/preview and /auth/invites/accept.
- /auth/bootstrap remains first-install only and refuses access whenever any
  Owner membership exists; it is not a general signup mechanism.
- Public signup for external SaaS customers is a separate, future owner-approved
  onboarding design and is NOT automatically enabled.

## Verification
- Real HTTP integration test in existing apps/api/test/invites.test.mjs, run
  on an isolated local PostgreSQL database and included in GitHub CI.
- Source and UI regression tests in apps/web/test/invite-only.test.mjs.
- No schema migrations, no changes to existing user records.
- Existing pending registration requests (created before this restriction) remain in the admin review queue; review them explicitly. No new public requests can be submitted.
- Existing invited-users workflow refuses invitations to emails with existing accounts. Adding a current user to a second company belongs to the separate multi-company membership task; no unsafe workaround is introduced here.
- Do not merge or deploy without separate release review:
  apps/api and apps/web are watched by Railway and changes to main may redeploy.
