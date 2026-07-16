# Sprint 13 Execution Package — Section 0
## Cover · Scope · Execution Plan · Owner Matrix

**Sprint Title:** MVP Production Launch
**Sprint Number:** 13
**Block:** Block 3 — MVP Launch Readiness & Production Release (Sprint 13+)
**Duration:** 10 working days
**Version:** 1.0
**Prepared:** 2026-06-12
**Depends On:** Sprint 12 (Finance BI / Invoice PDF / Export) · Block 2 Close-Out Review v1.0 · EP Active Roadmap Amendment v1.1

---

## Sprint Goal

Execute the full MAOS MVP production launch: harden the Sprint 12 RC (GAP-02), provision and verify the production environment, complete all launch governance procedures (UAT, go/no-go, runbook), and deploy to production (GAP-03). This sprint introduces no new features. All actions are auditable, reversible (with rollback), and gated by a formal go/no-go review with written sign-off.

---

## Sprint 13 Tracks (4 Active)

| Track | Scope |
|---|---|
| Track A: RC Hardening | Permission regression, RLS verification, client visibility, finance/export visibility, invoice PDF verification, audit logging, surface hardening review |
| Track B: Production Environment Readiness | Environment provisioning, config lock, bucket policies, secrets audit, migration execution |
| Track C: Launch Governance | Smoke tests, UAT sign-off, known issues register, go/no-go checklist, launch runbook, deployment checklist, post-launch monitoring |
| Track D: UAT and Sign-Off | Owner UAT, client portal UAT, finance/export UAT, security UAT, final approval checklist |

---

## Sprint 13 Scope

### Track A: RC Hardening
- Permission regression test matrix (19 cases) — all Sprint 0–12 surfaces
- RLS verification (12 cases) — all tenant isolation policies
- Client visibility regression (11 cases) — no internal fields exposed
- Finance/export visibility regression (11 cases) — OWNER-only gates confirmed
- Invoice PDF verification (9 cases) — PDF content safe, cross-client blocked
- Audit logging verification (7 categories) — all required events confirmed
- Sprint 12 surface hardening review (Section 1.2) — all new surfaces verified

### Track B: Production Environment Readiness
- Production DB, Redis, object storage provisioned per Section 2.1 spec
- Object storage bucket policy verified (Section 2.2)
- Environment configuration locked (Section 2.3)
- Database migration readiness checklist (8 items) verified
- Seed data freeze confirmed
- Backup and restore rehearsal (Section 4.1) — RTO ≤ 30 min documented
- Rollback rehearsal (Section 4.2) — rollback RTO ≤ 10 min documented
- Monitoring and alerting verification (Section 4.3) — 12 monitors live
- Secrets audit and rotation (Section 4.4) — 5 secrets rotated pre-launch

### Track C: Launch Governance
- Smoke test plan execution (25 cases) on production
- Go/No-Go checklist (25 items) reviewed and approved
- Launch runbook (15 steps) executed with per-step sign-off
- Deployment checklist (12 items) verified
- Post-launch monitoring plan (Section 5.8) active for 24 hours
- Post-launch review at T+24h

### Track D: UAT and Sign-Off
- Owner end-to-end UAT
- Client portal UAT
- Finance and export UAT
- Security UAT (Security Architect sign-off)
- Sprint 13 Final Approval Checklist (25 items)
- Sprint 13 exit review and implementation gate

---

## Sprint 13 Non-Scope

The following are explicitly excluded from Sprint 13. These are tracked in the Deferred Scope Register and will be addressed in subsequent sprints.

| Excluded Item | Reason | Target |
|---|---|---|
| SMTP email delivery (CS-01) | Deferred | Sprint 15 |
| Report scheduling and email (D-10) | Deferred | Sprint 15 |
| Real XLSX export (D-17) | Deferred | Sprint 14 |
| Archived entity recovery UI (D-07) | Deferred | Sprint 14 |
| Full-text search with relevance (D-08) | Deferred | Sprint 17+ |
| Presence indicators (CS-02) | Deferred | Sprint 17+ |
| Typing indicators (CS-03) | Deferred | Sprint 17+ |
| Manager full reporting access (D-11 full) | Deferred | Sprint 14 |
| Any new product feature | Sprint 13 = launch only | Sprint 14+ |
| Phase 15 Sprint 13 artifacts | Superseded by EP Series | N/A |

---

## Day-by-Day Execution Plan

| Day | Focus | Deliverables |
|---|---|---|
| 1 | RC hardening setup | Sprint 12 surface hardening review · Test data seeding · Permission regression execution begins |
| 2 | Permission + RLS verification | Permission regression matrix (19 cases) signed · RLS verification matrix (12 cases) signed |
| 3 | Client + finance visibility | Client visibility matrix (11 cases) signed · Finance/export visibility matrix (11 cases) signed |
| 4 | PDF + audit verification | Invoice PDF matrix (9 cases) signed · Audit logging matrix (7 categories) signed |
| 5 | Infrastructure track | Backup rehearsal complete · Rollback rehearsal complete · Monitoring activation signed |
| 6 | Production environment | DB/Redis/storage provisioned · Secrets rotated · Config locked · Migration readiness verified |
| 7 | UAT execution | Owner UAT · Client portal UAT · Finance/export UAT · UAT sign-offs collected |
| 8 | Security UAT + Go/No-Go prep | Security Architect UAT sign-off · Go/No-Go checklist review · Final approval checklist |
| 9 | Go/No-Go + launch | Go/No-Go meeting · GO decision recorded · Launch runbook executed · Smoke tests on production |
| 10 | Post-launch monitoring | 24-hour monitoring watch · Post-launch review meeting at T+24h · Sprint 13 exit review issued |

---

## Engineering Owner Matrix

| Area | Owner | Reviewer |
|---|---|---|
| Permission regression matrix | Security Architect | Backend Lead |
| RLS verification matrix | Security Architect | Backend Lead |
| Client visibility regression | QA Lead | Security Architect |
| Finance/export visibility regression | QA Lead | Security Architect |
| Invoice PDF verification | QA Lead | Backend Lead |
| Audit logging verification | Security Architect | Backend Lead |
| Sprint 12 surface hardening review | Backend Lead | Security Architect |
| Production environment provisioning | DevOps Lead | Engineering Manager |
| Secrets audit and rotation | Security Architect | Engineering Manager |
| Database migrations (production) | Backend Lead | Engineering Manager |
| Backup rehearsal | Backend Lead | DevOps Lead |
| Rollback rehearsal | DevOps Lead | Engineering Manager |
| Monitoring activation | DevOps Lead | Engineering Manager |
| Owner UAT | Product Owner | Engineering Manager |
| Client portal UAT | Product Owner | Security Architect |
| Finance/export UAT | Engineering Manager | CTO |
| Security UAT and sign-off | Security Architect | Engineering Manager |
| Go/No-Go review | Engineering Manager | CTO |
| Launch runbook execution | DevOps Lead | Engineering Manager |
| Post-launch monitoring watch | DevOps Lead + QA Lead | Engineering Manager |
| Sprint 13 exit review | Engineering Manager | CTO |
| Final Approval Checklist (25 items) | Engineering Manager | CTO |

---

## Supersession Notice

This Sprint 13 Execution Package is generated under the **EP Series** and supersedes all Phase 15-path Sprint 13 artifacts located in `docs/sprint-13/`. The following Phase 15 artifacts are reference material only and must not be used as authoritative implementation guides:

`final-launch-checklist.md`, `mvp-handover-package.md`, `deployment-execution-plan.md`, `production-environment-readiness-plan.md`, `uat-execution-plan.md`, `final-production-go-no-go-checklist.md`, and all other `docs/sprint-13/` Phase 15 path files.

The authoritative Sprint 13 specification is `docs/sprint-13/MAOS_Sprint13_Execution_Package_v1.0.docx`.
