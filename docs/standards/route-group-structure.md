# MAOS Route Group Structure

## Purpose

Define the frontend route grouping baseline before implementation starts.

## Route Groups

| Route Group | Purpose | Users | Rule |
|---|---|---|---|
| Internal workspace | Owner, Manager, Employee workspace | Internal users | Must not expose client-only routes as internal data shortcuts |
| Client portal | Client-facing portal | Client users | Own-client-only and client-visible data only |
| Auth routes | Login, invite acceptance, logout, session routes | All invited users | No public registration route |
| Denied states | Unauthorized, forbidden, not found | All users | Must avoid hidden resource leakage |

## Permission-Aware Navigation

Navigation must render only allowed modules or safe denied/empty states. The backend remains authoritative for authorization.

## No Client/Internal Route Leakage

Client portal routes must not display internal notes, internal chat, employee cost, payroll, audit logs, other-client data, or unapproved files/reports.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Internal workspace route group is documented | Met |
| Client portal route group is documented | Met |
| Auth route group is documented | Met |
| Denied states are documented | Met |
| Permission-aware navigation is documented | Met |
| No client/internal route leakage rule is documented | Met |
