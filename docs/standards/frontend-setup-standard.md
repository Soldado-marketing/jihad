# MAOS Frontend Setup Standard

## Purpose

This standard defines the approved frontend setup expectations for MAOS MVP. It is a Sprint 0 setup document only and does not implement frontend features.

## Next.js App Structure

| Area | Standard |
|---|---|
| App boundary | Future MAOS frontend work targets `apps/web` |
| Current root app | Existing root Next.js app remains unmoved until a separate migration task is approved |
| Routing | Internal workspace and client portal routes must be separated |
| Role-aware navigation | Navigation must render only allowed modules and safe denied states |
| Shared types | Frontend should use `packages/types` for API contracts when available |

## React/TypeScript Baseline

| Rule | Requirement |
|---|---|
| TypeScript | Required for frontend code |
| Component props | Typed props required |
| API contracts | Typed request/response contracts expected once API contracts exist |
| Strictness | Type strictness should be preserved or increased, not weakened |
| Client-safe UI | UI must not be relied on as the only permission enforcement layer |

## Tailwind Baseline

| Rule | Requirement |
|---|---|
| Styling model | Tailwind CSS is the baseline utility styling system |
| Design tokens | Shared color, spacing, typography, and radius conventions should be centralized |
| Responsive design | Responsive web is required for MVP |
| Accessibility | Focus, contrast, labels, and errors must be accounted for in components |

## Design Tokens

| Token Area | Requirement |
|---|---|
| Color | Use a defined palette for background, text, border, status, danger, warning, success, and information states |
| Spacing | Use consistent spacing scale through Tailwind conventions |
| Typography | Use consistent heading, body, label, and table text sizing |
| Radius | Keep UI radius consistent with the product standard |
| Directionality | Tokens and utilities must work in Arabic RTL and English/German LTR layouts |

## Component System Baseline

| Area | Standard |
|---|---|
| Component system | shadcn/ui or equivalent |
| Reusable components | Buttons, forms, tables, cards, dialogs, tabs, badges, dropdowns, and layout primitives should be standardized |
| Permission states | Components that show actions must support disabled, hidden, denied, loading, and error states |
| Client-safe states | Client portal components must not expose internal-only data |

## shadcn/ui or Equivalent Usage Rules

| Rule | Requirement |
|---|---|
| Accessibility | Component primitives must preserve keyboard and screen-reader behavior |
| Styling | Components must use the approved Tailwind/token baseline |
| Variants | Common variants must be standardized instead of recreated per page |
| Permission-aware actions | Action components must support hidden/disabled/denied states |
| Client portal use | Client-facing components must support client-safe redaction and empty states |

## Route Grouping Expectations

| Route Group | Purpose |
|---|---|
| Internal workspace | Owner, Manager, Employee experiences |
| Client portal | Client-only experience |
| Auth routes | Login, invite acceptance, logout, session-related routes |
| Denied routes | Permission-safe unauthorized and not-found handling |

## RTL/LTR Baseline

| Language | Direction | Requirement |
|---|---|---|
| Arabic | RTL | Layout, tables, navigation, forms, and messages must support RTL |
| English | LTR | Default LTR support |
| German | LTR | Longer labels must fit without layout breakage |

## Environment Config Expectations

| Rule | Requirement |
|---|---|
| Public variables | Only safe client-exposed variables may use public prefixes |
| Secret variables | Secrets must never be exposed to frontend runtime |
| Environment separation | Local, QA, staging, and production values must be separated |
| Documentation | Frontend environment rules must be documented before implementation |

## Error Tracking Placeholder

Frontend error tracking is required before MVP launch. The provider and implementation are not selected in Day 2. The selected provider must support privacy-safe frontend error reporting without exposing secrets, full payloads, or client-confidential data.

## Day 4B Frontend Readiness

| Area | Baseline |
|---|---|
| Environment config | Governed by `docs/standards/frontend-environment-config.md` |
| Route group structure | Governed by `docs/standards/route-group-structure.md` |
| Role-aware navigation | Governed by `docs/standards/role-aware-navigation-standard.md` |
| RTL/LTR | Governed by `docs/ux/rtl-ltr-baseline.md` |
| Accessibility | Governed by `docs/ux/accessibility-baseline.md` |

## Frontend Environment Config

Frontend config must distinguish public variables from private server-side variables. Secrets, provider private keys, database URLs, and token signing secrets must never be exposed to frontend runtime.

## Route Group Structure

Future routes must separate internal workspace, client portal, auth routes, and denied states. The existing root Next.js app remains unmoved during Sprint 0.

## Role-Aware Navigation

Navigation must render only allowed modules and safe denied states. It must not reveal hidden counts, totals, client names, project names, finance data, payroll data, or internal-only records.

## Denied States

Denied states must be generic, accessible, and safe. They must not distinguish between missing and unauthorized resources where doing so would leak metadata.

## Client/Internal Route Separation

Client portal routes must not expose internal notes, internal chat, audit logs, payroll, employee costs, internal reports, or unapproved files.

## Accessibility Baseline

Frontend implementation must support keyboard navigation, visible focus states, labels, contrast, error states, and form accessibility from the start.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Next.js frontend boundary is documented | Met |
| React/TypeScript baseline is documented | Met |
| Tailwind baseline is documented | Met |
| Design tokens are documented | Met |
| Component-system baseline is documented | Met |
| shadcn/ui or equivalent usage rules are documented | Met |
| Route grouping expectations are documented | Met |
| RTL/LTR baseline is documented | Met |
| Environment config expectations are documented | Met |
| Error tracking placeholder is documented | Met |
| No frontend feature implementation was added | Met |
| Frontend environment config link is documented | Met |
| Route group structure is documented | Met |
| Role-aware navigation is documented | Met |
| Denied states are documented | Met |
| RTL/LTR baseline link is documented | Met |
| Accessibility baseline is documented | Met |
