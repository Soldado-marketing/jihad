# Sprint 13 User Invite Launch Flow Guide

## Purpose

Define the launch flow for inviting initial MAOS MVP users without introducing public registration.

## Invite Flow

| Step | Action | Owner Role | Evidence |
|---|---|---|---|
| INV-001 | Confirm tenant and role for invitee | Product Owner | Invite request record |
| INV-002 | Confirm role is one of Owner, Manager, Employee, Client | Product Owner | Role assignment record |
| INV-003 | Generate invite through approved invite flow or fallback | Backend Lead / DevOps Architect | Invite event/log reference |
| INV-004 | Send invite through email provider or approved fallback | Product Owner | Delivery evidence |
| INV-005 | User accepts invite | User / Product Owner | Acceptance record |
| INV-006 | Session/device/login history baseline is validated | QA Lead | QA evidence |
| INV-007 | Permission and tenant scope are checked | QA Lead / Security Architect | QA evidence |

## Invite Fallback

If the email provider is not production-ready:

- Use an approved manual invite delivery fallback.
- Never expose invite tokens in shared channels.
- Record owner, recipient, expiration, and delivery method.
- Treat the fallback as temporary and launch-gated by Product Owner and Security Architect.

## Role Launch Rules

| Role | Initial Launch Use | Restrictions |
|---|---|---|
| Owner | Required | Full tenant ownership, finance access |
| Manager | Optional | No Owner-only finance |
| Employee | Optional | Internal workspace only |
| Client | Optional | Client portal and client-safe surfaces only |

## Acceptance Criteria

- No public registration is added.
- Invite flow includes role, tenant, expiration, and evidence.
- Client invites do not expose internal workspace navigation or data.
