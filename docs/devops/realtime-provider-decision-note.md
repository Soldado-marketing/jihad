# MAOS Realtime Provider Decision Note

## Options

| Option | Notes |
|---|---|
| Native WebSockets | Strong control; more operational setup |
| Managed realtime provider | Faster setup; requires security and cost review |
| Polling/SSE fallback | Simpler fallback; weaker chat experience |

## Recommended Default

Keep provider selection assigned forward. Prefer native WebSockets or managed realtime only after Sprint 7 channel authorization and session revocation requirements are confirmed.

## Owner

Principal Software Architect / DevOps Architect.

## Assigned Milestone Gate

Sprint 7: Chat, notifications, and realtime.

## Risk If Unresolved

Chat and realtime notifications may be delayed or built without clear authorization/session revocation guarantees.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Options are documented | Met |
| Recommended default is documented | Met |
| Owner is documented | Met |
| Assigned milestone gate is documented | Met |
| Risk if unresolved is documented | Met |
