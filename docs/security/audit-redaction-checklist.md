# MAOS Audit Redaction Checklist

## Purpose

Define what audit logs and operational logs must redact before implementation starts.

## Redaction Rules

| Data Category | Rule |
|---|---|
| Secrets | Never log raw secrets, tokens, passwords, private keys, recovery codes, or webhook secrets |
| Payment/full financial detail | Do not log full payment data, bank details, card details, or unnecessary invoice line details |
| Payroll | Do not log payroll amounts or employee cost details except under approved finance/payroll audit policy |
| Sensitive AI prompts | Do not log full prompts/responses containing sensitive data unless governed by AI retention policy |
| File content | Do not log raw file contents or signed URL secrets |
| Chat content | Do not log full message bodies by default |
| Voice content | Do not log audio content or full transcript by default |
| Client data | Minimize client-confidential data in audit/log payloads |
| Error payloads | Redact request bodies, stack context, and provider payloads before logging |

## Sensitive AI Prompt Handling

AI prompt and response retention must follow the Phase 9 AI retention policy. Operational logs should reference AI log IDs instead of storing raw prompt payloads.

## File/Chat/Voice Content Handling

Use metadata references, object IDs, and safe categories. Full content should only be accessed through permission-checked product flows.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Secrets exclusion is documented | Met |
| Payment/full financial detail exclusion is documented | Met |
| Sensitive AI prompt handling is documented | Met |
| File/chat/voice content handling is documented | Met |
| Client data handling is documented | Met |
| Error payload redaction is documented | Met |
