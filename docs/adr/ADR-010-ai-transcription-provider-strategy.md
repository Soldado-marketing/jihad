# ADR-010: AI And Transcription Provider Strategy

Status: Proposed

## Context

The MVP AI scope is limited to basic voice-to-task. Advanced AI Analyst, autonomous AI actions, and AI financial analytics are not MVP scope. Provider choices must respect tenant isolation, permissions, retention rules, no unauthorized training, multilingual support, and human approval before task creation.

## Decision

Use an AI provider abstraction and a transcription provider evaluation process before implementing voice-to-task. Final provider selection is assigned to the Sprint 8 voice/AI gate.

## AI Provider Abstraction

| Requirement | Baseline |
|---|---|
| Provider boundary | Application uses a provider abstraction instead of direct scattered provider calls |
| Permission gateway | AI input data must pass through permission-filtered retrieval |
| Logging | AI actions must produce redacted AI/audit logs |
| Retention | Provider retention terms must be approved before use |
| Human approval | AI-created task drafts require user confirmation before save |

## Transcription Provider Shortlist Approach

Shortlist providers by language quality, retention/security terms, cost, latency, failure handling, and no unauthorized training guarantees.

## Arabic/English/German Benchmark Requirement

Provider evaluation must test Arabic, English, German, and mixed-language voice samples with real agency-style content before Sprint 8 implementation approval.

## Retention/Security Requirements

Provider contracts/settings must minimize data sent, prevent unauthorized model training, respect tenant data boundaries, and define deletion/retention behavior.

## No Unauthorized Training Requirement

No provider may use MAOS tenant/client data for unauthorized model training. Any training or improvement use requires explicit governance approval and must not cross tenant boundaries.

## Human Approval For Voice-To-Task

Voice-to-task can create a draft only. The user must review and confirm extracted title, description, due date, assignee, project/client, priority, and subtasks before task creation.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| AI provider abstraction is documented | Met |
| Transcription provider shortlist approach is documented | Met |
| Arabic/English/German benchmark requirement is documented | Met |
| Retention/security requirements are documented | Met |
| No unauthorized training requirement is documented | Met |
| Human approval for voice-to-task is documented | Met |
| Final provider selection assigned to Sprint 8 gate | Met |

## Open Questions

| Question | Owner Role | Gate |
|---|---|---|
| Select AI provider | AI Systems Architect / Security Architect | Sprint 8 voice/AI gate |
| Select transcription provider | AI Systems Architect | Sprint 8 voice/AI gate |
| Define benchmark sample set | AI Systems Architect / QA Lead | Before Sprint 8 build starts |
