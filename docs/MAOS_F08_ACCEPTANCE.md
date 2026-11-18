# MAOS-F08 — Steady the three intermittent tests

**Closure status (2026-11-18): READY FOR REVIEW — not DONE.** Tests only; no application or script code changed. Open: CI on the PR and the owner's decision on the merge (a merge rebuilds both services because the files live under `apps/api/` and `apps/web/`; the application code is identical).

Origin: owner's message of 2026-11-18 — fix the off-site backup test and the D08 width test, investigate the C06 upload-cancel test, show the results before a merge that rebuilds both services. Three reruns of CI in two days came from these tests, each time on a change that could not have caused them.

## Blueprint check (§30)

No conflict: test files only; no endpoint, schema, role, permission or script change.

## The three tests

| Test | What happened | Cause (proven) | Change |
|---|---|---|---|
| `apps/api/test/offsite-backup.test.mjs` "rehearsal fails on a tampered download or the wrong key" | main CI 2026-11-17: 510 of 511 — the rehearsal refused the copy, but with "decrypted dump checksum mismatch" instead of the expected "decryption failed" | `openssl cms -decrypt` with a wrong private key does not always report it: in 1,500 tries it reported failure 1,490 times and "success" 10 times, never with the original bytes (its guard against padding-oracle timing). The script's second guard, the plaintext checksum, then refuses the copy | the test requires the refusal (exit 1) and accepts either of the two guards' alerts; it also requires that no "passed" alert is raised |
| `apps/web/e2e/11-client-project-status.spec.ts` width check, phone | main CI 2026-11-18: 134 of 135 — horizontal overflow measured once as 6 px (limit 1 px) | a single reading right after a heading appears, while the layout can still be settling | the measurement is polled until it holds (`expect.poll`) |
| `apps/web/e2e/09-upload.spec.ts` "Cancel stops it and nothing is saved; Upload then succeeds", phone | seen three times in local whole-suite runs since 2026-11-11, never diagnosed | reproduced 2 times in 40 repeats; the page then read "Uploaded as version 2." The test released its held request and switched interception off at the same moment; when the switch-off came first (trace: `setNetworkInterceptionPatterns` before `Route.abort`), Chromium sent the held request although the page had cancelled it, and the server stored it as version 1 | the test ends the held request before it switches interception off |

## Matrix

| # | Requirement | Evidence | Result |
|---|---|---|---|
| 1 | Backup test: the cause is shown, not assumed | openssl 4.0.3, 1,500 decryptions with a wrong key: 1,490 reported failures, 10 reported successes, 0 with the original plaintext; the right key decrypts to the original | PASS |
| 2 | Backup test: still requires that a wrong key is refused, whichever guard catches it; nothing in the script changed | diff: one assertion widened, one added; suite 25 of 25 runs green locally | PASS locally |
| 3 | D08 width test: still requires at most 1 px of overflow, measured until it holds | 40 of 40 repeats at phone width | PASS locally |
| 4 | C06 cancel test: failure reproduced before the change | 2 failed of 40 repeats at phone width, same error as the earlier sightings ("Uploaded as version 1." not found; the page says version 2) | PASS (reproduced) |
| 5 | C06 cancel test: cause found in the trace and removed | order of `Route.abort` and the interception switch-off; after the change 80 of 80 repeats at phone width and 40 of 40 on desktop | PASS locally |
| 6 | What the tests assert is unchanged otherwise: no version after Cancel, exactly one version after the next Upload | diff of `09-upload.spec.ts`: ordering only | PASS |
| 7 | Nothing else broke | web `npm test` 427/427, web type-check clean, API type-check as in CI (`tsconfig.build.json`) clean; whole browser suite locally 135 passed, 5 skipped by design | PASS locally |
| 8 | CI: six jobs green on the PR head | PR | OPEN |
| 9 | Merge when authorised — rebuilds `jihad` and `maos-web` with identical application code | — | OPEN — owner's decision, results first |

## Findings (not changed here)

1. **A product gap behind the C06 case.** Cancel only aborts the browser's request and then always says "Upload cancelled. Nothing was saved." If the whole file had already reached the server (small files, or Cancel during "Sent. Saving on the server…"), the server can still store the version, and the sentence is then untrue. C06's record describes a server confirmation that the code does not make. The duplicate guard for Try again already knows how to look for such a version; the same look after a Cancel would make the sentence true ("Your file had already arrived as version N"). Proposed as its own small task (C10), not done here.
2. `npm run typecheck` in `apps/api` fails locally with 149 errors in three old Jest-style `*.spec.ts` files (no Jest types installed); CI type-checks with `tsconfig.build.json`, which leaves them out, and is green. The spec files are not run by any job.
