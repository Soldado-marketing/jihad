# MAOS AI Provider Shortlist

## AI Provider Options

| Option | Notes |
|---|---|
| OpenAI or compatible provider | Strong general AI capability; retention/security terms must be approved |
| Azure OpenAI or enterprise provider | Strong enterprise controls; setup and cost review required |
| Alternate compatible provider | Must meet permission, retention, language, and no-training requirements |

## Provider Abstraction Requirement

AI integrations must use a provider abstraction so application modules do not call providers directly.

## Retention/Security Notes

Provider use must minimize data sent, respect retention policy, support deletion where required, and avoid cross-tenant training or unauthorized model training.

## No Unauthorized Training Requirement

Tenant/client data cannot be used for unauthorized provider training or improvement.

## Owner

AI Systems Architect / Security Architect.

## Assigned Sprint 8 Gate

Provider selection and security review must close before voice-to-task implementation exits Sprint 8.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| AI provider options are documented | Met |
| Provider abstraction requirement is documented | Met |
| Retention/security notes are documented | Met |
| No unauthorized training requirement is documented | Met |
| Owner is documented | Met |
| Sprint 8 gate is documented | Met |
