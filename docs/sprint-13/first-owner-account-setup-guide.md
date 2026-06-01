# Sprint 13 First Owner Account Setup Guide

## Purpose

Define a safe launch-time path for creating the first Owner account while preserving invite-only access and no-public-registration rules.

## Setup Principles

- No public registration endpoint may be introduced.
- First Owner setup must be governed, auditable, and tenant-scoped.
- No password, token, or secret value may be stored in documentation.
- First Owner setup must use approved environment and data access controls.

## Setup Options

| Option | Description | Preferred Use | Required Approval |
|---|---|---|---|
| Governed admin operation | Create initial tenant and Owner through controlled backend/admin process | Preferred launch path | CTO, Security Architect, Database Architect |
| Invite bootstrap | Create first tenant and send first Owner invite through approved invite path | Preferred if invite service is ready | Product Owner, QA Lead |
| Manual database intervention | Direct data intervention under migration governance | Last resort only | CTO, Database Architect, Security Architect |

## Required Setup Fields

| Field | Rule |
|---|---|
| Tenant name | Required and launch-approved |
| Owner email | Required and verified with Product Owner |
| Owner role | Must be `OWNER` |
| Tenant membership | Must be tenant-scoped |
| Invite status | Must not allow public signup bypass |
| Audit evidence | Required if audit service is active for the setup path |

## Validation Checklist

| Check | Owner Role | Required Evidence | Blocks Launch |
|---|---|---|---:|
| First tenant created through approved process | Product Owner | Setup record | Yes |
| First Owner has Owner role only for intended tenant | QA Lead | Role/scope verification | Yes |
| No public registration path exists | Security Architect | Route/test evidence | Yes |
| Invite-only rule remains intact | QA Lead | Test or checklist evidence | Yes |
| No secrets in setup notes | Security Architect | Review record | Yes |

## Acceptance Criteria

- First Owner setup path is selected before production launch.
- Owner access is tenant-scoped.
- Public registration remains absent.
