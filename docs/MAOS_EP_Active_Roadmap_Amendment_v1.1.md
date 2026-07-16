# MAOS — EP Active Roadmap Amendment v1.1

**Product:** MAOS (Multi-Account Operations System)
**Document Type:** Formal Roadmap Amendment — Correction Release
**Version:** 1.1
**Date:** 2026-06-11
**Status:** ACTIVE — Supersedes Amendment v1.0 in full
**Prepared by:** Architecture Review | Block 2 Close-Out Correction
**Supersedes:** MAOS_EP_Active_Roadmap_Amendment_v1.0.md
**Trigger:** Block 2 Close-Out Review v1.0 Medium findings M-01 and M-02

---

## 1. Purpose

This amendment corrects two documentation-level findings identified during the MAOS Block 2 Close-Out Review v1.0 (issued 2026-06-11):

- **M-01:** EP Active Roadmap Amendment v1.0 Section 5 listed Sprint 12 as "MVP Release Candidate Stabilization & RC Governance." That title was a tentative placeholder from the time the amendment was authored. The Sprint 12 Execution Package v1.0, which was subsequently generated and validated, defined Sprint 12 as "Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation." Amendment v1.1 corrects the active sprint sequence table to reflect the actual Sprint 12 definition.

- **M-02:** Amendment v1.0 Deferred Scope Register entries D-02, D-03, and D-04 listed Finance BI Reports, Invoice PDF Generation, and Export Execution as deferred to "Sprint 14 / Block 3." All three were fully delivered in Sprint 12. Amendment v1.1 updates their status to RESOLVED and corrects the Sprint 14 Block 3 scope definition to reflect the items that remain undelivered.

No technical, security, or architectural changes are made by this amendment. All permission rules, client visibility boundaries, tenant isolation guarantees, and security controls established in Sprints 10–12 remain unchanged.

---

## 2. Background

Amendment v1.0 was authored on 2026-06-11 as a prerequisite for Sprint 12 formal packaging. At that time, the Sprint 12 Execution Package had not yet been generated. The amendment used a tentative title for Sprint 12 — "MVP Release Candidate Stabilization & RC Governance" — derived from an earlier expectation of what Sprint 12 would cover. It also listed D-02, D-03, and D-04 as deferred to Sprint 14 based on that same expectation.

The user's Sprint 12 request, issued immediately after Amendment v1.0 was saved, explicitly overrode the RC label and defined Sprint 12 as the Block 2 closing feature sprint: Finance BI / Invoice PDF / Export Execution. The Sprint 12 EP was generated, validated (2,612 paragraphs, 78 tables, 65.4 KB, zero errors), and confirmed to fully deliver D-02, D-03, and D-04.

The Block 2 Close-Out Review confirmed this sequence and raised M-01 and M-02 as documentation-level Medium findings requiring correction before Sprint 13 pre-flight.

---

## 3. Corrections Table

| Finding | Location in v1.0 | Error | Correction in v1.1 |
|---|---|---|---|
| M-01 | Section 5, Sprint 12 row | Sprint 12 title: "MVP Release Candidate Stabilization & RC Governance" | Sprint 12 title: "Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation" |
| M-01 | Section 6, Block 2 definition | Block 2 description: "MVP RC Stabilization (S12)" | Block 2 description: "Finance BI / Invoice PDF / Export Execution (S12) — CLOSED" |
| M-01 | Section 9, Sprint 12 authorization | Sprint 12 title: "MVP Release Candidate Stabilization & RC Governance" | Sprint 12 title: "Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation" |
| M-02 | Section 8, D-02 | Finance BI Reports (Full) → Sprint 14 / Block 3 | Status: RESOLVED — delivered Sprint 12 |
| M-02 | Section 8, D-03 | Invoice PDF Generation → Sprint 14 / Block 3 | Status: RESOLVED — delivered Sprint 12 |
| M-02 | Section 8, D-04 | Export Execution (File Delivery) → Sprint 14 / Block 3 | Status: RESOLVED — delivered Sprint 12 |
| M-02 | Section 6, Block 3, Sprint 14 definition | "Finance BI Reports, Invoice PDF Generation, Export Execution Foundation" | Updated to remaining undelivered Sprint 14 items only (see Section 6 below) |

---

## 4. Confirmed Unchanged from v1.0

The following decisions from Amendment v1.0 are fully confirmed and unchanged:

| Decision | Status |
|---|---|
| Phase 15 Sprints 10–13 retired as active implementation sequence | Confirmed |
| EP Series is the sole authoritative roadmap from Sprint 0 onwards | Confirmed |
| Sprints 0–9 valid under both Phase 15 and EP Series | Confirmed |
| Sprint 10 (Finance Portal, Client Invoices & Payment Visibility) confirmed | Confirmed |
| Sprint 11 (Reporting/Search/Governance/MVP QA hybrid) confirmed | Confirmed |
| Sprint 11 hybrid design valid; GAP-01 closed | Confirmed |
| Block 1 closed (Sprints 7–9) | Confirmed |
| Block 2 closed (Sprints 10–12) | Confirmed — per Block 2 Close-Out Review v1.0 |
| Phase 15 path RC artifacts in docs/sprint-12/ are superseded | Confirmed |
| Phase 15 path launch artifacts in docs/sprint-13/ are partial reference only | Confirmed |
| Sprint 12 EP DOCX (2,612 paragraphs, 78 tables, zero errors) is authoritative | Confirmed |

---

## 5. Active Sprint Sequence (EP Series — Authoritative, Updated)

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
| **12** | **Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation** | **Block 2** | **Complete — Block 2 Closed** |
| **13** | **MVP Production Launch** | **Block 3** | **Next — authorized after Sprint 12 exit review Pass and this amendment saved** |
| 14 | Archive Enforcement, Soft-Delete Recovery, Manager Reporting Access, Real XLSX Export | Block 3 | Planned |
| 15 | SMTP Email Delivery (CS-01), Report Scheduling, Notifications Foundation, Retention Enforcement | Block 3 | Planned |
| 16 | Automation Engine & Workflow Rules (Phase 10 spec) | Block 3 | Planned |
| 17+ | Presence (CS-02), Typing (CS-03), Threaded Replies, Full-Text Search Engine, Advanced AI Copilot | Block 3+ | Planned |

---

## 6. Block Definitions (Updated)

### Block 1 — Collaboration Layer (Sprints 7–9) — CLOSED
Client Portal Visibility (S7), Chat/Mentions/Realtime (S8), Voice Notes/Transcription (S9).
Block 1 Close-Out Review v1.0 issued 2026-06-08.

### Block 2 — Finance & Reporting + Finance BI / Export (Sprints 10–12) — CLOSED
Finance Portal / Client Invoices / Payments (S10), Reporting / Search / Governance / MVP QA (S11), Finance BI / Invoice PDF / Export Execution Foundation (S12).
Block 2 Close-Out Review v1.0 issued 2026-06-11.
Finding: 0 Critical · 0 High · 2 Medium (resolved by this amendment) · 5 Low · 61 Pass.

### Block 3 — Post-MVP / Launch / Enhancements (Sprint 13+) — AUTHORIZED TO BEGIN
Sprint 13 is the Block 3 opening sprint. Authorization conditions are specified in Section 9 below.

- **Sprint 13:** MVP Production Launch — RC hardening, production deployment, UAT evidence sign-off, launch governance (GAP-02 + GAP-03)
- **Sprint 14:** Archive Enforcement (D-05), Soft-Delete Recovery (D-07), Manager Reporting Access (D-11), Real XLSX Export (D-17)
- **Sprint 15:** SMTP Email Delivery (CS-01), Report Scheduling + Email Delivery (D-10), Retention Policy Enforcement (D-06), Export Retention Enforcement (D-18)
- **Sprint 16:** Automation Engine & Workflow Rules (D-16, Phase 10 spec)
- **Sprint 17+:** Presence Indicators (CS-02), Typing Indicators (CS-03), Threaded Chat Replies (D-01), Full-Text Search Engine (D-08), Voice Transcript Search (D-09), Real-Time Reporting (D-12), GDPR Erasure / Data Purge (D-13), Payroll Reports (D-14), AI-Generated Report Summaries (D-15), Advanced AI Copilot

---

## 7. GAP Assignment Register (Updated)

| GAP ID | Description | Original Phase 15 Sprint | EP Resolution | Status |
|---|---|---|---|---|
| GAP-01 | Full MVP Regression / UAT | Phase 15 Sprint 11 | Resolved in EP Sprint 11 hybrid | **CLOSED** |
| GAP-02 | RC Hardening & Release Candidate | Phase 15 Sprint 12 | EP Sprint 13 (authorized) | **OPEN — Sprint 13** |
| GAP-03 | Production Launch | Phase 15 Sprint 13 | EP Sprint 13 (authorized) | **OPEN — Sprint 13** |

---

## 8. Deferred Scope Register (Updated)

| ID | Feature | Deferred From | Assigned Target | Target Block | Status |
|---|---|---|---|---|---|
| CS-01 | SMTP Email Delivery | S8→S11 | Sprint 15 | Block 3 | OPEN |
| CS-02 | Presence Indicators | S9 | Sprint 17+ | Block 3 | OPEN |
| CS-03 | Typing Indicators | S8 | Sprint 17+ | Block 3 | OPEN |
| D-01 | Threaded Chat Replies | S8 | Sprint 17+ | Block 3 | OPEN |
| **D-02** | **Finance BI Reports (Full)** | S11 | Sprint 12 | Block 2 | **RESOLVED — delivered Sprint 12** |
| **D-03** | **Invoice PDF Generation** | S10 | Sprint 12 | Block 2 | **RESOLVED — delivered Sprint 12** |
| **D-04** | **Export Execution (File Delivery)** | S11 | Sprint 12 | Block 2 | **RESOLVED — delivered Sprint 12** |
| D-05 | Automated Archive Enforcement | S11 | Sprint 14 | Block 3 | OPEN |
| D-06 | Retention Policy Enforcement | S11 | Sprint 15 | Block 3 | OPEN |
| D-07 | Soft-Delete Recovery | S11 | Sprint 14 | Block 3 | OPEN |
| D-08 | Full-Text Search Engine | S11 | Sprint 17+ | Block 3 | OPEN |
| D-09 | Voice Transcript Search | S9+S11 | Sprint 17+ | Block 3 | OPEN |
| D-10 | Report Scheduling + Email | S11 | Sprint 15 | Block 3 | OPEN |
| D-11 | Manager Reporting Access | S11 | Sprint 14 | Block 3 | OPEN |
| D-12 | Real-Time Reporting | S11 | Sprint 17+ | Block 3 | OPEN |
| D-13 | GDPR Erasure / Data Purge | S11 | Sprint 17+ | Block 3 | OPEN |
| D-14 | Payroll Reports | S11 | Sprint 17+ | Block 3 | OPEN |
| D-15 | AI-Generated Report Summaries | S11 | Sprint 17+ | Block 3 | OPEN |
| D-16 | Automation Engine & Workflow Rules | Phase 10 spec | Sprint 16 | Block 3 | OPEN |
| D-17 | Real XLSX Export | S12 | Sprint 14 | Block 3 | OPEN |
| D-18 | Export Retention Enforcement | S12 | Sprint 15 | Block 3 | OPEN |

---

## 9. Block 2 Close-Out Reference

Block 2 Close-Out Review v1.0 was issued on 2026-06-11 following completion of the Sprint 12 Execution Package. The review covered all seven audit areas and returned the following verdict:

**BLOCK 2 CLOSED — READY FOR SPRINT 13**

| Audit Area | Findings |
|---|---|
| A. Roadmap / Numbering Consistency | 1 Medium (M-01 — resolved by this amendment), 6 Pass |
| B. Finance Visibility | 0 findings, 9 Pass |
| C. Invoice PDF and Document Safety | 0 findings, 6 Pass |
| D. Export Execution Safety | 1 Low (L-01 — Export retention stub, Sprint 15), 8 Pass |
| E. Reporting / Search / Governance Continuity | 0 findings, 7 Pass |
| F. Deferred Scope Register | 1 Medium (M-02 — resolved by this amendment), 2 Low, 12 Pass |
| G. Test Coverage | 2 Low (L-02 Sprint 12 exit review pending, L-05 checklist gate), 11 Pass |
| **Total** | **0 Critical · 0 High · 2 Medium (both resolved) · 5 Low · 61 Pass** |

Both Medium findings (M-01 and M-02) are fully resolved by this amendment. The five Low findings are tracked items with no action required before Sprint 13 pre-flight.

---

## 10. Sprint 13 Authorization Statement

**Sprint 13 — MVP Production Launch — formal EP Execution Package generation is hereby authorized** subject to the following conditions:

1. This amendment (`MAOS_EP_Active_Roadmap_Amendment_v1.1.md`) has been saved. ✅
2. Block 2 Close-Out Review v1.0 (`docs/MAOS_Block2_CloseOut_Review_v1.0.md`) has been issued. ✅
3. Sprint 12 exit review must be completed and return a Pass result before Sprint 13 **implementation** begins. (Sprint 13 EP generation may proceed; implementation is gated on Sprint 12 exit review.)
4. Sprint 13 title: **"MVP Production Launch"**
5. Sprint 13 belongs to Block 3 in the EP Series.
6. Sprint 13 must be generated under the EP Series definition. It must NOT inherit scope from the retired Phase 15 Sprint 13 path (final-launch-checklist.md, mvp-handover-package.md, etc. in `docs/sprint-13/` are partial Phase 15 reference artifacts only).
7. Sprint 13 covers GAP-02 (RC Hardening) and GAP-03 (Production Launch) as defined in the GAP Assignment Register above.
8. Sprint 14 formal packaging remains blocked until Sprint 13 is complete.

---

## 11. Amendment Decision Record

| Question | Decision |
|---|---|
| Is Phase 15 still the active roadmap? | No — superseded from Sprint 10 onwards |
| Is the EP Series the sole active roadmap? | Yes — authoritative from Sprint 0 onwards |
| Are Sprints 0–9 valid under both sequences? | Yes |
| Is Sprint 11 confirmed (hybrid scope)? | Yes — confirmed and approved |
| Is Sprint 12's correct title (updated)? | Finance BI Reports, Advanced Analytics Baseline, Invoice PDF Generation & Export Execution Foundation |
| Is Block 2 closed? | Yes — Block 2 Close-Out Review v1.0 issued, verdict CLOSED |
| Were D-02, D-03, D-04 delivered in Sprint 12? | Yes — all three RESOLVED in Sprint 12 |
| Is Sprint 14 Block 3 scope updated? | Yes — Sprint 14 now covers D-05, D-07, D-11, D-17 only |
| Is Sprint 13 generation authorized? | **Yes — after this amendment is saved and Sprint 12 exit review returns Pass** |
| What is Sprint 13's correct title? | MVP Production Launch |
| What block does Sprint 13 belong to? | Block 3 |
| Is Sprint 13 the old Phase 15 Sprint 13? | No — EP Series definition only |

---

*End of Amendment v1.1. This document supersedes MAOS_EP_Active_Roadmap_Amendment_v1.0.md in full. Issued following Block 2 Close-Out Review v1.0, 2026-06-11.*
