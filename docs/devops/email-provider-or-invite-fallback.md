# MAOS Email Provider or Invite Testing Fallback

Status: Approved

## Context

MAOS is invite-only and has no public registration. Sprint 1 invitation work requires either an email provider path or an approved invite testing fallback. No final provider is selected in Sprint 0. The non-production invite testing fallback is approved for Sprint 1 so invite-only access can be tested without public registration.

## Email Provider Options

| Option | Fit | Notes |
|---|---|---|
| Transactional email provider | Strong MVP fit | Supports invite delivery and audit-friendly logs |
| SMTP provider | Possible MVP fit | Simpler but may require deliverability checks |
| Development mailbox/sink | Good for QA fallback | Allows invite flow testing without sending real email |
| Manual invite token fallback | Acceptable temporary testing fallback | Must be restricted to non-production environments |

## Invite Testing Fallback

If a provider is not ready for Sprint 1, QA may use an approved non-production invite testing fallback such as a development mailbox/sink or manually captured invite token. This fallback must not enable public registration.

## MVP Requirement

Sprint 1 cannot validate invite-only access unless the team has either an email provider path or an approved non-production fallback.

## Risks

| Risk | Mitigation |
|---|---|
| Email provider not selected | Use approved invite testing fallback |
| Invite testing bypasses security | Restrict fallback to non-production and audit-ready flow |
| Public registration accidentally enabled | Explicit no-public-registration test required |
| Deliverability issues later | Select transactional provider before launch |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Email provider options are documented | Met |
| Invite testing fallback is documented | Met |
| MVP invite requirement is documented | Met |
| Risks are documented | Met |
| No email implementation was added | Met |
| Sprint 1 invite testing fallback is approved | Met |

## Open Questions

| Question | Owner Role | Target |
|---|---|---|
| Select final email provider | DevOps Architect / Product Operations | Before production invite delivery |
| Approve Sprint 1 invite testing fallback | DevOps Architect / Security Architect / QA Lead | Before Sprint 1 begins |
