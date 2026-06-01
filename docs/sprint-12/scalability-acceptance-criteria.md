# Sprint 12 Scalability Acceptance Criteria

## Purpose

Define acceptance criteria for initial MVP scalability and future growth targets.

## Baseline Criteria: 50 Concurrent Users

| Criteria | Target |
|---|---|
| API p95 response target | <= 500 ms for basic read placeholder endpoints |
| API p99 response target | <= 1000 ms for basic read placeholder endpoints |
| Page load target | <= 1500 ms p95 in staging/UAT for key pages |
| Error rate | < 1% |
| Critical-path failed requests | 0 accepted without triage |
| Database connection safety | No saturation; connection usage remains within configured limit |
| Tenant leakage under load | 0 incidents |
| Permission bypass under load | 0 incidents |
| Client data leakage under load | 0 incidents |
| Owner finance leakage under load | 0 incidents |
| Hidden report totals leakage under load | 0 incidents |
| AI/voice unsafe behavior under load | 0 real provider calls; 0 automatic task creation |
| Signed URL unsafe behavior under load | 0 URL generations without permission/TTL marker |

## Future Scaling Criteria

| Target | Criteria |
|---:|---|
| 100 users | 50-user criteria still pass; DB connection review complete; caching candidates reviewed |
| 250 users | Query profiling complete; worker/queue scaling plan validated; rate limits tuned |
| 500 users | Horizontal scaling and managed DB sizing reviewed; automated load testing path established |

## Security Under Load

- Tenant context must remain mandatory.
- Permission checks must remain server-side.
- Client portal must remain own-client/client-visible only.
- Finance summaries must remain Owner-only.
- Report hidden totals must remain suppressed for unauthorized roles.
- AI/voice must remain placeholder-only unless provider governance is separately approved.
- Signed URLs must remain permission-checked with short TTL.

## Release Gate

Sprint 13 cannot launch unless 50-user baseline criteria are completed or explicitly accepted as controlled risk.
