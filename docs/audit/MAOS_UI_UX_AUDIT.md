# MAOS UI/UX Audit

Status before fix: NEEDS FIX

This audit reviews the visible application experience in `apps/web`. It does not count backend module scaffolding or sprint documentation as product UX.

## Visual Quality

Before this pass, the UI looked like a basic implementation preview rather than a serious SaaS product. The biggest visible problems were weak placeholder text, inconsistent page headers, flat list styling, and a shell that did not communicate a premium agency operating system.

## Area Review

| Area | Finding | Severity | Required fix |
|---|---|---:|---|
| Sidebar | The original sidebar felt basic and did not give strong product identity. | P0 | Use a dark SaaS sidebar with grouped navigation, active states, and better spacing. |
| Topbar | Top status chips were too large and uneven. | P1 | Compact topbar with environment/API/user context. |
| Dashboard | Summary cards existed but read like a planning/status board, not an operating dashboard. | P1 | Improve cards, hierarchy, and honest readiness states. |
| Page headers | Many pages used ad hoc headings with sprint labels. | P0 | Reusable page header with eyebrow/title/description/action. |
| Cards | Too many flat bordered boxes with minimal spacing. | P1 | Rounded cards, subtle shadows, consistent padding. |
| Lists | Lists were functional but visually plain. | P1 | Upgrade list containers, row padding, hover states. |
| Forms | Very few real forms exist. | P1 | Use clear no-record/action states until real create flows exist. |
| Empty states | Some empty states were explicit sprint placeholders. | P0 | Convert to professional no-record or restricted messages. |
| Loading states | Loading state exists but is minimal. | P2 | Keep for now; strengthen when API integration exists. |
| Denied/unauthorized states | Existing states work but needed polish. | P1 | Improve card style and language. |
| Client portal UI | Client portal existed but needed stronger separation from internal workspace. | P1 | Polish client shell and client-safe notices. |
| CRM UI | CRM pages used demo data and skeleton language. | P1 | Use more realistic labels and cleaner lists. |
| Project/task UI | Task list existed, and Kanban movement was needed for owner expectation. | P0 | Keep Trello-style browser-state board and label it honestly. |
| Finance UI | Finance pages exposed sprint labels and weak preview language. | P0 | Owner-only finance copy and client-safe finance copy. |
| Reports UI | Report pages used placeholder wording. | P1 | Reframe as permission-filtered report preview with hidden data notice. |
| Mobile responsiveness | Sidebar can collapse horizontally, but dense dashboards still need deeper mobile QA. | P2 | Verify after next UI pass. |
| Arabic/RTL readiness | Direction helper exists, but full Arabic copy/layout mirroring is not fully proven. | P1 | Add RTL visual QA once core UI stabilizes. |

## User-Facing Text Problems Found

| Problem text pattern | Why it was bad | Fix applied |
|---|---|---|
| `Sprint X` labels on pages | Exposes internal project planning to users | Replaced most visible page labels with product-focused titles |
| `placeholder` in page titles/descriptions | Makes product feel fake | Replaced with "not enabled in this preview", "demo data", or "will appear after live API is connected" |
| `backend skeleton` in empty states | Too technical for owner/client UI | Replaced with professional no-record and data connection language |
| Inconsistent "foundation" labels | Reads like a planning document, not app UI | Replaced with operational labels |

## UI Fixes Implemented In This Pass

| Fix | Files touched |
|---|---|
| Modern dark sidebar with grouped navigation and active states | `apps/web/src/components/shell/sidebar.tsx` |
| Cleaner topbar and status actions | `apps/web/src/components/shell/topbar.tsx`, `topbar-actions.tsx`, `user-menu.tsx` |
| Shared page header component | `apps/web/src/components/ui/page-header.tsx` |
| Shared action link component | `apps/web/src/components/ui/action-link.tsx` |
| Better dashboard hierarchy and readiness cards | `apps/web/src/components/dashboard/*` |
| Better task board visual treatment | `apps/web/src/components/tasks/task-kanban-preview.tsx` |
| Professional empty/denied/loading/unauthorized states | `apps/web/src/components/states/*` |
| Cleaner client portal shell | `apps/web/src/components/client-portal/*` |
| Cleaner CRM, finance, project/task, file, approval, report, and voice pages | `apps/web/app`, `apps/web/src/components` |
| Removed most weak visible placeholder copy | Many app/component files |

## Remaining UX Gaps

| Gap | Impact | Priority |
|---|---|---:|
| Data is mostly static preview data | User cannot truly create/manage records | P0 |
| Create/edit forms are mostly absent | MVP workflows are not usable end to end | P0 |
| API integration is not wired into the frontend | UI does not reflect saved data | P0 |
| Auth/login screens are not real | Owner/client cannot use the app securely | P0 |
| Full mobile and RTL visual QA not complete | Arabic/German production UX risk | P1 |
| Real client onboarding flow absent | Client portal cannot be used by real clients | P0 |

## UX Verdict

After this pass, the UI is more credible as a SaaS preview, but it is still not a complete MVP product because key workflows are static and non-persistent. The next UX milestone must connect real data, auth, and create/edit flows rather than adding more surface area.
