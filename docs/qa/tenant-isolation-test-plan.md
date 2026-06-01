# MAOS Tenant Isolation Test Plan

## Purpose

Define tests required to validate tenant isolation during Sprint 1 and later sensitive module work.

## Cross-Tenant Denial Tests

| Scenario | Expected Result |
|---|---|
| User from Tenant A requests Tenant B resource ID | Denied without confirming resource existence |
| Manager from Tenant A queries Tenant B project list | Empty/denied safe response |
| Client from Tenant A requests Tenant B client portal resource | Denied safely |

## Tenant Context Tests

| Context | Required Test |
|---|---|
| HTTP request | Tenant context resolved before service execution |
| Service layer | Services receive tenant and actor context |
| Repository layer | Tenant-owned repository methods reject missing tenant context |
| Audit | Audit events include tenant context where tenant-scoped |

## Tenant-Aware Repository Tests

Repository tests must verify no tenant-owned query can execute without tenant context and that tenant filters cannot be omitted for protected modules.

## Background Job Tenant Context Tests

Background job tests must verify tenant and actor/effective actor context is preserved before sensitive job execution. Full worker implementation is later, but the test requirement is established now.

## Report/AI Future Context Tests

Future reporting and AI tests must prove permission-filtered tenant context before any generated report, search, summary, or AI answer is returned.

## Evidence Requirements

Evidence must include actor role, tenant used, target tenant/resource, expected denial or allowed result, actual result, and audit/log reference where applicable.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Cross-tenant denial tests are documented | Met |
| Tenant context tests are documented | Met |
| Tenant-aware repository tests are documented | Met |
| Background job tenant context tests are documented | Met |
| Report/AI future context tests are documented | Met |
| Evidence requirements are documented | Met |
