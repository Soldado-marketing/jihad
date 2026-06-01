# Railway Smoke Test Checklist

## Purpose

Minimum smoke test checklist after Railway staging deployment and before UAT or 50-user load testing.

## Smoke Test Preconditions

- Railway web service is deployed.
- Railway API service is deployed.
- Railway PostgreSQL service is connected to API.
- Required env vars are configured.
- No real external providers are activated.
- Test accounts or invite placeholders are available.

## Smoke Tests

| Test ID | Check | Role | Expected Result | Evidence Required | Status |
|---|---|---|---|---|---|
| SMOKE-001 | API health check | QA Lead | `GET /api/health` responds successfully | Response screenshot/log | Pending |
| SMOKE-002 | Web dashboard loads | Owner/QA | `/dashboard` loads without runtime error | Screenshot | Pending |
| SMOKE-003 | Web API URL configured | QA Lead / Frontend Lead | Web uses Railway API URL with `/api` prefix | Env evidence and browser/API check | Pending |
| SMOKE-004 | Login/invite placeholder path | QA Lead | `/auth/login` and `/auth/invite` load; no public registration appears | Screenshot | Pending |
| SMOKE-005 | Dashboard route | Owner/QA | Dashboard summary placeholder loads | Screenshot | Pending |
| SMOKE-006 | Projects route | Owner/Manager/Employee | `/projects` loads for internal users | Screenshot | Pending |
| SMOKE-007 | Client route | Client | `/client` loads client-safe shell only | Screenshot | Pending |
| SMOKE-008 | Finance owner-only route | Owner and non-Owner | Owner can see finance placeholder; non-Owner access remains denied/hidden | Screenshot/evidence | Pending |
| SMOKE-009 | Reports route | Owner/Manager | `/reports` loads and hidden data notice remains visible | Screenshot | Pending |
| SMOKE-010 | No public registration | Security Architect / QA Lead | No public registration route or workflow appears | Route/evidence check | Pending |
| SMOKE-011 | Client boundary smoke test | Client | Client navigation does not show internal CRM, finance, audit, reports admin, or internal notes | Screenshot | Pending |
| SMOKE-012 | Owner finance boundary smoke test | Manager/Employee/Client | Non-Owner roles do not see Owner-only finance navigation/data | Screenshot/evidence | Pending |
| SMOKE-013 | Deferred providers inactive | Security Architect | Storage, AI, transcription, payment, realtime remain placeholder/inactive | Env and UI evidence | Pending |

## Blocking Criteria

- API health fails.
- Web app fails to load.
- Web points to wrong API URL.
- Public registration appears.
- Client sees internal data/navigation.
- Non-Owner sees Owner-only finance.
- Deferred external provider appears active.

## Completion Criteria

- All smoke tests pass or blockers are logged.
- Evidence is attached before UAT begins.
- 50-user load test is not started until smoke tests pass.
