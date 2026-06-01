# ADR-002: Frontend Stack

Status: Approved

## Context

MAOS requires a web-first MVP that supports an internal workspace and a client portal. The frontend must support Owner, Manager, Employee, and Client experiences with permission-aware navigation, Arabic RTL, English LTR, German LTR, responsive layouts, basic dashboards, projects, tasks, CRM, collaboration, files, voice notes, finance visibility, and reports.

The repository currently contains an existing root-level Next.js application. Sprint 0 Day 2 must define the approved future frontend stack and the handling decision for the existing root app without moving application code.

## Decision

MAOS will use a Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui or equivalent component-system stack for the MVP frontend.

The approved frontend application boundary is `apps/web`.

## Recommended Frontend Stack

| Area | Decision |
|---|---|
| Framework | Next.js |
| UI runtime | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Component system | shadcn/ui or equivalent reusable component system |
| Directionality | Arabic RTL and English/German LTR from the start |
| Routing model | Role-aware route groups and permission-aware navigation |
| MVP delivery mode | Responsive web app, not native mobile |

## Current Root Next.js App Handling Decision

The existing root-level Next.js application remains in place during Sprint 0.

| Decision Area | Result |
|---|---|
| Move root app during Day 2 | No |
| Treat current root app as production MAOS app | No final decision in Day 2 |
| Future migration to `apps/web` | Allowed only through a separate scoped task with tests and review |
| Day 2 frontend standard | New MAOS frontend work targets the `apps/web` boundary |

This prevents accidental breakage of the existing application while preserving the approved MAOS monorepo direction.

## MVP Frontend Baseline

| Baseline | Requirement |
|---|---|
| Type safety | TypeScript is required for application code and shared UI contracts |
| Component consistency | Reusable components must follow the approved component-system baseline |
| Route safety | Internal workspace and client portal routes must be separated |
| Permission awareness | Navigation must not expose unauthorized modules |
| Denied states | Unauthorized routes and actions must show safe denied states |
| Responsive behavior | MVP must support desktop and responsive web usage |
| Accessibility | Basic keyboard, focus, labels, contrast, and form error standards are required |

## RTL/LTR Support Expectations

| Language | Direction | Expectation |
|---|---|---|
| Arabic | RTL | Layout, navigation, forms, tables, and messages must support RTL behavior |
| English | LTR | Default LTR behavior supported |
| German | LTR | LTR behavior with longer labels and strings supported |

Directionality must be treated as an application-level layout concern, not as a late translation-only task.

## Consequences

| Consequence | Impact |
|---|---|
| Next.js remains the frontend standard | The current root app stack aligns with the future target stack |
| Migration must be explicit | Existing root app will not be moved implicitly during setup |
| Permission-aware UI is mandatory | Frontend must coordinate with backend permissions but cannot be the only enforcement point |
| Shared types are expected | API and UI contracts should eventually use `packages/types` |
| RTL/LTR is early scope | UI standards must account for Arabic, English, and German before feature build-out |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Frontend stack is documented as Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui or equivalent | Met |
| Existing root Next.js app handling is documented | Met |
| `apps/web` is confirmed as the approved future frontend boundary | Met |
| RTL/LTR expectations are documented | Met |
| No frontend feature implementation was added | Met |
| No app movement was performed | Met |
