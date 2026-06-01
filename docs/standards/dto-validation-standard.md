# MAOS DTO Validation Standard

## Purpose

Define validation expectations for future API request DTOs without implementing code.

## Required Validation Rules

| Area | Requirement |
|---|---|
| Required fields | Required fields must be present and non-empty unless nullable |
| Optional fields | Optional fields must be validated if present |
| Length | String lengths must be bounded where relevant |
| Format | Emails, dates, IDs, URLs, currencies, and timezones must be validated |
| Unknown fields | Unknown fields should be rejected or explicitly ignored by standard |

## Type Validation

DTOs must validate strings, numbers, booleans, arrays, objects, dates, and IDs according to API contract expectations.

## Empty/Null Handling

Empty strings, null values, and omitted fields must have explicit behavior. Sensitive updates must not interpret null as delete unless explicitly allowed.

## Enum Validation

Enums such as role, status, priority, language, currency, timezone, visibility, and permission values must reject unsupported values.

## ID Validation

IDs must be validated for format and resource scope. Valid ID format does not imply access permission.

## Tenant/Resource Scope Validation Note

DTO validation validates shape and basic format only. Tenant, client, project, task, file, finance, report, audit, and permission scope must be validated in services.

## Error Response Standard

Validation failures must return safe messages and must not expose internal schema details, hidden resources, secrets, or sensitive payloads.

## QA Testability

Validation rules must be expressible as positive and negative QA cases, including missing fields, invalid types, invalid enum values, malformed IDs, and forbidden field updates.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Required validation rules are documented | Met |
| Type validation is documented | Met |
| Empty/null handling is documented | Met |
| Enum validation is documented | Met |
| ID validation is documented | Met |
| Tenant/resource scope validation note is documented | Met |
| Error response standard is documented | Met |
| QA testability is documented | Met |
