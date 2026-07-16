# MAOS — EP Active Roadmap Amendment v1.0

**Product:** MAOS (Multi-Account Operations System)
**Document Type:** Formal Roadmap Amendment
**Version:** 1.0
**Date:** 2026-06-11
**Status:** ACTIVE — Supersedes Phase 15 Sprints 10–13 as the active implementation sequence
**Prepared by:** Architecture Review | Audit-Driven Amendment
**Supersedes:** Phase 15 Implementation Roadmap v1.0 (Sprints 10–13 only)

---

## 1. Purpose

This amendment formally records the divergence between the Phase 15 Implementation Roadmap v1.0 and the Execution Package (EP) Sprint Series, resolves all identified inconsistencies, retires Phase 15 Sprints 10–13 as the active implementation sequence, and authorizes the generation of the Sprint 12 formal EP Execution Package.

This document is a prerequisite for Sprint 12 formal packaging. Sprint 12 generation was blocked pending this amendment.

---

## 2. Background

The Phase 15 Implementation Roadmap v1.0 defined a 14-sprint sequence (Sprint 0–Sprint 13) ending at MVP production launch. The Execution Package Series was created to provide implementation-grade specifications for each sprint. The two sequences were fully aligned through Sprint 9.

Starting at Sprint 10, the EP Series diverged from Phase 15 due to scope depth requirements that could not be satisfied within Phase 15's lean planning model. This divergence was intentional and technically justified but was never formally documented.

A Full Roadmap & Sprint Consistency Audit was performed on 2026-06-11 and is recorded in `MAOS_Full_Roadmap_Sprint_Consistency_Audit_v1.0.docx`. This amendment implements the audit's required actions.

---

## 3. Key Findings

### 3.1 Sequence Alignment (Sprints 0–9)
EP Sprints 0–9 are fully aligned with Phase 15 Sprints 0–9. No amendment is required for these sprints. They remain valid and approved under both sequences.

### 3.2 Permanent Divergence at Sprint 10
Phase 15 Sprint 10 was titled "Dashboards & Reports Basic." The EP redirected Sprint 10 to "Finance Portal, Client Invoices & Payment Visibility" — a depth expansion that Phase 15 did not plan as a standalone sprint. This was the first permanent break. Phase 15 Sprint 10 is **retired** and replaced by EP Sprint 10.

### 3.3 Sprint 11 Hybrid Scope
EP Sprint 11 merged two sprint types into one:
- **EP Sprint 11 feature scope:** Reporting, Search, Data Governance & Deferred Collaboration Items (Block 2 feature delivery)
- **Phase 15 Sprint 11 scope:** MVP QA, UAT, Security Hardening (originally Phase 15's standalone QA milestone sprint)

This hybrid design was valid and is confirmed. Sprint 11 closed with a Pass result and Go decision for Sprint 12. GAP-01 (MVP Regression) is resolved — it was absorbed into Sprint 11.

### 3.4 Sprint 12 RC Artifacts (Existing — Partial)
Sprint 12 artifacts already exist in `docs/sprint-12/` following Phase 15's Sprint 12 (MVP Release Candidate) path. These include: release-candidate-checklist, final-mvp-validation-matrix, rc-version-manifest, uat-evidence-template, security-signoff-checklist, performance-load-readiness-plan, and related governance artifacts.

These artifacts are **valid** but **incomplete**: they lack a formal EP Execution Package cover/scope plan and a compiled DOCX. Sprint 12 formal EP packaging is **authorized to proceed** upon saving of this amendment and the audit DOCX.

### 3.5 Sprint 13 Launch Artifacts (Existing — Partial)
Sprint 13 artifacts already exist in `docs/sprint-13/` following Phase 15's Sprint 13 (MVP Launch) path. These include: final-launch-checklist, mvp-handover-package, deployment-execution-plan, monitoring-alerting-launch-checklist, and related launch artifacts.

These artifacts are **valid** but **incomplete**: they lack a formal EP Execution Package cover/scope plan and DOCX. Sprint 13 formal packaging remains **blocked** until Sprint 12 is complete and its launch gates are passed.

### 3.6 Block 2 Closure
Block 2 ("Finance & Reporting Foundation", Sprints 10–12) is de facto closed at the feature delivery level by Sprint 11's hybrid scope. Sprint 12 is Block 2's formal close-out sprint in the RC sense. The Block 2 Close-Out Review shall be issued after Sprint 12 RC gates pass.

### 3.7 Deferred Finance BI / Invoice PDF / Export Scope
The following items planned for EP Sprint 12 in the original Block 2 design were not delivered and are formally deferred to Block 3:
- Finance BI Reports and Advanced Analytics
- Invoice PDF Generation
- Export Execution (CSV/PDF/JSON file delivery)
- Automated Archive Enforcement
- Retention Policy Enforcement
- Scheduled Report Delivery

---

## 4. Formal Retirement of Phase 15 Sprints 10–13

| Phase 15 Sprint | Phase 15 Title | Status |
|---|---|---|
| Sprint 10 | Dashboards & Reports Basic | **Retired** — replaced by EP Sprint 10 |
| Sprint 11 | MVP QA, UAT, Security Hardening | **Retired** — merged into EP Sprint 11 hybrid |
| Sprint 12 | MVP Release Candidate | **Retired as named sprint** — content superseded by EP Sprint 12 RC |
| Sprint 13 | MVP Launch | **Retired as named sprint** — content superseded by EP Sprint 13 Launch |

Phase 15 Sprints 0–9 remain valid reference material. The Phase 15 Milestone-to-Sprint mapping (M0–M11) is superseded by the EP Block structure.

---

## 5. Active Sprint Sequence (EP Series — Authoritative)

| Sprint | Title | Block | Status |
|---|---|---|---|
| 0 | Setup & Architecture Readiness | Foundation | Complete |
| 1 | Identity, Auth, Tenants, RBAC, Audit Foundation | Foundation | Complete |
| 2 | Workspace Shell & Navigation | Foundation | Complete |
| 3 | Projects, Tasks, Subtasks Core | Foundation | Complete |
| 4 | Client Portal Foundation | Foundation | Complete |
| 5 | CRM Basic + Collaboration Foundation | Foundation | Complete |
| 6 | Files, File Versioning, Approvals | Foundation | Complete |
| 7 | Client Portal Visibility & Approval UX | Block 1 | Complete |
| 8 | Chat, Comments, Mentions & Realtime | Block 1 | Complete |
| 9 | Voice Notes, Transcription & Voice-to-Task | Block 1 | Complete — Block 1 Closed |
| 10 | Finance Portal, Client Invoices & Payment Visibility | Block 2 | Complete |
| 11 | Reporting, Search, Data Governance & MVP QA/UAT/Security | Block 2 | Complete |
| **12** | **MVP Release Candidate Stabilization & RC Governance** | **Block 2** | **Next — authorized after this amendment** |
| 13 | MVP Production Launch | Block 3 | Blocked until Sprint 12 RC gates pass |

---

## 6. Block Definitions (Updated)

### Block 1 — Collaboration Layer (Sprints 7–9) — CLOSED
Client Portal Visibility, Chat/Mentions/Realtime, Voice Notes/Transcription.
Block 1 Close-Out Review v1.0 issued.

### Block 2 — Finance & Reporting + RC (Sprints 10–12) — IN PROGRESS
Finance Portal (S10), Reporting/Search/Governance/QA (S11), MVP RC Stabilization (S12).
Block 2 Close-Out Review to be issued after Sprint 12 RC gates pass.

### Block 3 — Post-MVP Enhancements (Sprint 13+) — DEFINED (Not started)
Scope includes:
- Sprint 13: MVP Production Launch & Handover
- Sprint 14: Finance BI Reports, Invoice PDF Generation, Export Execution Foundation
- Sprint 15: SMTP Email Delivery (CS-01), Report Scheduling, Notifications Foundation
- Sprint 16: Automation Engine & Workflow Rules (Phase 10 spec)
- Sprint 17+: Presence (CS-02), Typing (CS-03), Threaded Replies, Full-Text Search Engine (Elasticsearch/Typesense), Advanced AI Copilot

---

## 7. GAP Assignment Register

| GAP ID | Description | Original Phase 15 Sprint | EP Resolution | Status |
|---|---|---|---|---|
| GAP-01 | Full MVP Regression / UAT | Phase 15 Sprint 11 | Resolved in EP Sprint 11 hybrid | **CLOSED** |
| GAP-02 | RC Hardening & Release Candidate | Phase 15 Sprint 12 | EP Sprint 12 (authorized, pending formal packaging) | **IN PROGRESS** |
| GAP-03 | Production Launch | Phase 15 Sprint 13 | EP Sprint 13 (partial artifacts exist) | **BLOCKED — awaits Sprint 12 completion** |

---

## 8. Deferred Scope Register (Updated)

| ID | Feature | Deferred From | Assigned To | Target Block |
|---|---|---|---|---|
| CS-01 | SMTP Email Delivery | S8→S11 | Sprint 15 | Block 3 |
| CS-02 | Presence Indicators | S9 | Sprint 17+ | Block 3 |
| CS-03 | Typing Indicators | S8 | Sprint 17+ | Block 3 |
| D-01 | Threaded Chat Replies | S8 | Sprint 17+ | Block 3 |
| D-02 | Finance BI Reports (Full) | S11 | Sprint 14 | Block 3 |
| D-03 | Invoice PDF Generation | S10 | Sprint 14 | Block 3 |
| D-04 | Export Execution (File Delivery) | S11 | Sprint 14 | Block 3 |
| D-05 | Automated Archive Enforcement | S11 | Sprint 14 | Block 3 |
| D-06 | Retention Policy Enforcement | S11 | Sprint 15 | Block 3 |
| D-07 | Soft-Delete Recovery | S11 | Sprint 14 | Block 3 |
| D-08 | Full-Text Search Engine | S11 | Sprint 17+ | Block 3 |
| D-09 | Voice Transcript Search | S11 | Sprint 17+ | Block 3 |
| D-10 | Report Scheduling + Email | S11 | Sprint 15 | Block 3 |
| D-11 | Manager Reporting Access | S11 | Sprint 14 | Block 3 |
| D-12 | Real-Time Reporting | S11 | Sprint 17+ | Block 3 |
| D-13 | GDPR Erasure / Data Purge | S11 | Sprint 17+ | Block 3 |
| D-14 | Payroll Reports | S11 | Sprint 17+ | Block 3 |
| D-15 | AI-Generated Report Summaries | S11 | Sprint 17+ | Block 3 |
| D-16 | Automation Engine & Workflow Rules | Phase 10 spec | Sprint 16 | Block 3 |

---

## 9. Sprint 12 Authorization

**Sprint 12 formal EP Execution Package generation is hereby authorized** subject to the following conditions:

1. This amendment (`MAOS_EP_Active_Roadmap_Amendment_v1.0.md`) has been saved. ✅
2. The Full Roadmap & Sprint Consistency Audit (`MAOS_Full_Roadmap_Sprint_Consistency_Audit_v1.0.docx`) has been saved.
3. Sprint 12 Execution Package shall incorporate all existing `docs/sprint-12/` artifacts.
4. Sprint 12 title: **"MVP Release Candidate Stabilization & RC Governance"**
5. Sprint 12 is Block 2's final sprint. It must produce a Block 2 Close-Out Review.

Sprint 13 formal EP packaging remains blocked until Sprint 12 RC gates pass.

---

## 10. Amendment Decision

| Question | Decision |
|---|---|
| Is Phase 15 still the active roadmap? | No — superseded from Sprint 10 onwards |
| Is the EP Series the sole active roadmap? | Yes — authoritative from Sprint 0 onwards |
| Are Sprints 0–9 valid under both sequences? | Yes |
| Is Sprint 11 confirmed (hybrid scope)? | Yes — confirmed and approved |
| Do Sprint 12 artifacts exist? | Yes — partial (no formal EP package yet) |
| Do Sprint 13 artifacts exist? | Yes — partial (no formal EP package yet) |
| Is Sprint 12 generation authorized? | **Yes — after this amendment and audit are saved** |
| Is Sprint 13 generation authorized? | No — blocked until Sprint 12 RC gates pass |
| What is Sprint 12's correct title? | MVP Release Candidate Stabilization & RC Governance |
| What is Block 2's status? | In progress — closes with Sprint 12 |
| What is Block 3? | Defined (Sprint 13 = Launch; Sprint 14+ = Post-MVP enhancements) |

---

*End of Amendment. Issued under Full Roadmap & Sprint Consistency Audit, 2026-06-11.*
