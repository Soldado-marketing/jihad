# Sprint 11 Release Readiness Checklist

## Purpose

Confirm MVP is ready to enter Sprint 12 release candidate stabilization.

## Readiness Gates

| Gate | Required Result | Evidence | Status |
|---|---|---|---|
| Build gate | API and web builds pass | Build command output | Ready |
| Test gate | API and web test suites pass | Test command output | Ready |
| Prisma gate | Prisma schema validates | Prisma validation output | Ready |
| Tenant isolation gate | Tenant-owned models and repositories remain tenant-scoped | API hardening test | Ready |
| Permission gate | Protected controllers remain guarded | API hardening test | Ready |
| Client boundary gate | Client surfaces remain client-safe | API and web hardening tests | Ready |
| Finance gate | Owner-only finance is preserved | API and web hardening tests | Ready |
| AI/voice gate | No external provider calls and no automatic task creation | API and web hardening tests | Ready |
| Report privacy gate | Hidden count/total suppression remains visible | API and web hardening tests | Ready |
| Deferred scope gate | Advanced BI, export, automations, payroll, and external integrations remain absent | API and web hardening tests | Ready |
| UAT gate | UAT scenarios are defined and ready for execution | UAT checklist | Ready |
| Known issues gate | Known issues are registered and non-blocking | Known issues register | Ready |

## Sprint 12 Entry Criteria

- Full automated validation passes.
- Sprint 11 hardening tests pass.
- No critical or high known issue remains open.
- UAT checklist is ready for execution.
- Release candidate work does not add new MVP scope.

## Sprint 12 Blocking Conditions

- Any failed build, test, or Prisma validation.
- Missing permission guard on protected MVP route.
- Missing tenant scope on tenant-owned model.
- Client portal leakage.
- Non-owner finance exposure.
- Real AI/transcription/payment/storage/realtime provider activation.
- Report hidden count/total leakage.
- Deferred feature route or module appears.
