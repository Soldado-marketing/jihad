# Load Test Tooling Recommendation

## Purpose

Recommend lightweight load testing tools for the MAOS MVP 50-concurrent-user gate without installing tools automatically.

## Tooling Rule

Do not install or activate load testing tools unless explicitly approved by the CTO or DevOps Architect. Commands below are examples only.

## Recommended Tools

| Tool | Best Use | Strengths | Tradeoffs |
|---|---|---|---|
| k6 | API and scripted user journey load tests | Strong metrics, CI-friendly, clear thresholds | Requires script authoring and install/runner approval |
| Artillery | Mixed HTTP scenario testing | Simple YAML/JS scenarios, good staged ramping | Less strict by default unless thresholds are configured |
| autocannon | API-only smoke load | Very lightweight for single endpoint/API smoke checks | Not sufficient alone for full user journey/UAT load gate |

## k6 Option

Use when the team needs repeatable API journey scripts and threshold assertions.

Example only:

```sh
k6 run --vus 50 --duration 15m load-tests/maos-50-user.js
```

Recommended for:

- API p95/p99 threshold checks.
- Tenant and role-specific request scenarios.
- Repeatable launch gate evidence.

## Artillery Option

Use when the team wants staged ramp-up scenarios in a readable configuration.

Example only:

```sh
artillery run load-tests/maos-50-user.yml
```

Recommended for:

- Ramp-up and sustained load phases.
- Multiple endpoint groups.
- Load reports that are easy for QA/DevOps to review.

## autocannon Option

Use only for API smoke load, not as the full launch gate.

Example only:

```sh
autocannon -c 50 -d 60 https://uat-api.maos.example/api/health
```

Recommended for:

- Fast health endpoint smoke checks.
- API-only baseline checks before full load test.

## Tool Selection Guidance

| Situation | Recommended Tool |
|---|---|
| Full 50-user launch gate | k6 or Artillery |
| API-only smoke before full test | autocannon |
| CI-friendly future regression | k6 |
| Simple staged scenario file | Artillery |

## Required Approval Before Install

| Decision | Owner Role |
|---|---|
| Tool selection | CTO / DevOps Architect |
| Staging/UAT target approval | DevOps Architect |
| Scenario approval | QA Lead / Security Architect |
| Execution window | Release Manager |

## Acceptance Criteria

- Tool is selected before execution.
- No heavy tool is installed automatically.
- Load report captures p95, p99, error rate, failed requests, and leakage checks.
