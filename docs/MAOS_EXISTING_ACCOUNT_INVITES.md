# MAOS — Existing account invitation to another company

Status: feature branch only. DO NOT DEPLOY or merge without production release review.
Owner direction: continue company onboarding securely, without granting cross-tenant access automatically.

Rules:
- Existing approved/active account can be invited by the OWNER of another active tenant.
- The target tenant must not already have ANY membership for that user.
- OWNER is not an invitable role. Existing MANAGER, EMPLOYEE, CONTRACTOR, CLIENT restrictions remain.
- The existing account must sign in with its original password, and accept with BOTH its authenticated JWT and the original one-time invitation token. Their email addresses must match.
- No new user record, no password change, no automatic role escalation, no permission copied from the source tenant.
- The new tenant membership is ACTIVE with only the role the OWNER invited.
- CLIENT memberships require a live owner-selected Customer of the target tenant; clientScopeKey is revalidated at acceptance.
- New membership creation + single-use claim is atomic, with concurrency-safe rejection of consumed/revoked/expired invites.
- Missing, invalid, expired, revoked tokens fail closed; wrong authenticated account receives 403; not signed in gets 401.
- Existing new-user invitation acceptance retains its behavior. Anonymous users cannot accept as an existing account.
- UI opens sign-in in a second tab so that the secret invite token stays in the original tab and is not moved through the login URL. Once accepted, the login URL may include a NON-SECRET company slug so the user can explicitly log into the new tenant even without switching grants. Server-side ACTIVE membership validation remains mandatory.
- No schema migrations or production database changes.

Verification:
- Real Nest HTTP against isolated PostgreSQL: tests in apps/api/test/invites.test.mjs.
- API full suite, Web tests/typecheck/build, and CI with isolated PostgreSQL required.
- Known limitation: owner must invite via email (or pass a one-time private link if mail disabled). Do not publicly share invitation links.
