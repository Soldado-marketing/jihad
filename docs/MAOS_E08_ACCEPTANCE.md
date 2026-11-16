# MAOS-E08 — Access revocation on removal and suspension: verification

**Closure status (2026-11-16): READY FOR REVIEW — not DONE.** Tests only; no application code changed. CI green on PR #168 (row 15). Open: the owner's merge message and the production walk-through (row 14, owner-gated). Written before implementation (owner's rules of 2026-11-04: checklist from the original specification first, independent comparison before closure).

Task row: "Already implemented (#126: sessions revoked on removal/suspension); add it to the production walk-through and the isolation gate. Acceptance: removed member's token refused within the same minute; recorded."

## Blueprint check (§30)

No conflict: authentication stays server-side, sessions are revoked by the server, the audit record is written by the existing code. No schema change, no new endpoint, no change to roles or permissions.

## Audit before coding

| Question | Finding |
|---|---|
| What ends access on removal? | `AuthService.removeMember`: membership → REMOVED, its permissions deleted, the ACTIVE sessions of that company revoked, in one transaction; audit `membership.removed` with role and `sessionsRevoked`. `validateSession` also refuses a membership that is not ACTIVE |
| What ends access on suspension? | `AdminUsersService.suspendUser`: user → SUSPENDED and every ACTIVE session revoked, in one transaction; audit `user.suspended` |
| Already in the isolation gate | `security-gate-member-management` (removal of one EMPLOYEE: access and refresh 401 on `/tasks`, no new sign-in, other company kept, audit event) and `security-gate-session-revocation` (suspension of one EMPLOYEE: sessions revoked, access and refresh 401, no sign-in, reactivation) |
| Not asserted anywhere | other roles (MANAGER, CONTRACTOR, CLIENT) on their own routes; a second open session; the session rows after a removal; the one-minute bound; the audit record of a suspension and `sessionsRevoked`; what the signed-in person sees in the browser |
| Browser suite ("walk-through") | no spec removed or suspended anybody |

Decision: add only the missing checks — one named API suite in the isolation gate and one browser spec. The two existing suites stay as they are.

## Matrix

| # | Requirement | Evidence | Result |
|---|---|---|---|
| 1 | Removal: both open sessions of the person are refused at once — access token on the role's own route and on `/auth/me`, refresh token | `security-gate-access-revocation`, removal × MANAGER, EMPLOYEE, CONTRACTOR, CLIENT | PASS (local and CI) |
| 2 | Removal: the company's session rows are REVOKED (read before any token is reused), none ACTIVE | same | PASS (local and CI) |
| 3 | Removal: refused within the same minute (measured from the Owner's request to the last refusal, bound 60 s) | same; measured about 0.2 s per role | PASS (local and CI) |
| 4 | Removal: no new sign-in to that company | same | PASS (local and CI) |
| 5 | Removal is recorded: `membership.removed`, actor = the Owner, role, `sessionsRevoked` = 2 | same | PASS (local and CI) |
| 6 | Removal leaves the same person's other company alone: its token works, its session stays ACTIVE and refreshes | same (EMPLOYEE in two companies) | PASS (local and CI) |
| 7 | Only the Owner of that company removes: another company's Owner 404, an employee 403, nothing changed | same | PASS (local and CI) |
| 8 | Suspension: both open sessions refused at once on the role's own route, `/auth/me` and refresh; rows REVOKED; within the minute; no new sign-in | same, suspension × four roles | PASS (local and CI) |
| 9 | Suspension is recorded: `user.suspended`, actor = the Owner, outcome SUCCESS | same | PASS (local and CI) |
| 10 | People who were not removed or suspended keep working (a member of the same company, the Owner) | same | PASS (local and CI) |
| 11 | The checks can fail: with removal no longer revoking sessions 4 tests fail; with suspension no longer revoking sessions 4 tests fail (two mutations on the build output, restored) | run record | PASS |
| 12 | In the browser: a signed-in employee who is removed (or suspended) lands on the sign-in page at the next step, the stored session is cleared, the old tokens answer 401, signing in again shows the sentence that says why and creates no session; desktop and phone | `e2e/12-access-revocation.spec.ts` | PASS (local and CI, 4 tests) |
| 13 | Nothing else broke: the two neighbouring gate suites; the whole browser suite; web type-check | run record | PASS (local: 31 API tests, 108 browser tests; CI: six jobs) |
| 14 | Production walk-through: the browser spec against production with fictional people named in `E2E_REVOCATION_PEOPLE_FILE` | needs an owner approval for fictional data on production (method of O61) | OPEN — owner-gated |
| 15 | CI: six jobs green on the PR head; the new suite runs in the job "Isolation gate" | PR #168, run 43859465102 on `d507b4c`: six jobs SUCCESS; the three E08 groups `ok` in the isolation gate log; spec 12 passed on desktop and phone in the browser job (108 passed) | PASS |
| 16 | No application code changed | diff: `apps/api/test/…`, `apps/web/e2e/…`, `.github/workflows/ci.yml`, this file | PASS |
| 17 | Merge when authorised (tests and CI only; Railway rebuilds `maos-web` because the spec lives under `apps/web/`, with identical application code) | — | OPEN — owner's merge message |

## Run record (2026-11-16, disposable PostgreSQL 16, fictional people)

- `node --test test/security-gate-access-revocation.test.mjs`: 10 tests, 10 pass.
- Mutation 1 (build output only: `removeMember` matches no session): 4 fail, 6 pass. Mutation 2 (`suspendUser` matches no session): 4 fail, 6 pass. Build restored; new suite + `security-gate-member-management` + `security-gate-session-revocation`: 31 tests, 31 pass.
- Browser, local stack built from this branch (API, web, storage stub, fresh database): spec 12 alone 4 passed; whole suite 108 passed (desktop and phone).
- Two faults found in the first drafts of the checks, both in the checks and not in the application: the invitation acceptance limit (5 a minute per address) was hit by people sharing one address — each fictional person now acts from its own address, as the seed does; and the shared `useSession` helper writes the session again on every navigation, which hid whether the app cleared it — the spec signs the person in once instead.

## Findings (not changed here)

1. **Suspension is account-wide, removal is per company.** From the code: `suspendUser` sets the user to SUSPENDED and revokes the sessions in every company, and it needs only that the person is a member of the acting Owner's company. An Owner of one company therefore ends that person's access to every other company too. Not asserted by a test here because it may or may not be the intended rule. Decision for the owner if a second independent company is ever hosted: keep, or make suspension per company.
2. The sentence a removed person sees at sign-in is "Your account is approved but has no active workspace membership. Contact your administrator." — correct, but it does not say the access was removed. Wording only; left as it is.
3. From the design, not tested here: nothing pushes a sign-out to a page that is already open, so a removed person keeps seeing what is on screen until the page's next request, which is then refused (row 12 tests exactly that next step). The bound in this task is on the token, and it holds.

CI note: the first run did not start when the PR was opened (no run for the head commit after four minutes); closing and reopening the PR started two runs, of which one was cancelled by the concurrency rule and the other is the green run above.
