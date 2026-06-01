# MAOS PostgreSQL Environment Strategy

## Purpose

Define PostgreSQL environment expectations for MAOS MVP without creating databases, SQL, or migrations.

## Environment Strategy

| Environment | Purpose | Data Rules | Access Rules |
|---|---|---|---|
| Local/dev | Developer setup and local validation | Synthetic data only; no production data | Developer-local access only |
| QA | QA validation and permission testing | Synthetic multi-tenant fixtures | QA, security, and developer access as approved |
| Staging | Production-like release validation | Sanitized or synthetic production-like data only | Restricted release/testing access |
| Production | Live tenant data | Real tenant data | Restricted operational access |

## Environment Data Rules

| Rule | Requirement |
|---|---|
| No production data in local/dev | Production data must never be copied into local/dev |
| Synthetic tenant data | QA must include at least two tenants, multiple roles, and client/project scopes |
| Financial test data | Must be synthetic and clearly marked |
| AI/report test data | Must include permission boundary cases without real sensitive data |
| Reset policy | QA data may be reset under QA governance |

## Tenant Test Data Approach

QA/staging test fixtures should include:

| Fixture | Purpose |
|---|---|
| Tenant A and Tenant B | Cross-tenant denial tests |
| Owner, Manager, Employee, Client | RBAC and role tests |
| Multiple clients | Client boundary tests |
| Projects/tasks/subtasks | Resource scope tests |
| Files/voice/chat placeholders | Collaboration boundary tests |
| Invoices/payments placeholders | Owner-only and client invoice/payment visibility tests |

## Backup/Restore Assumptions

Backup and restore implementation is not created in Day 3. The environment strategy assumes Day 5 backup/recovery planning will define cadence, restore drills, RPO/RTO placeholders, object storage backup requirements, and production recovery controls.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Local/dev/QA/staging/production strategy is documented | Met |
| Environment data rules are documented | Met |
| Tenant test data approach is documented | Met |
| No production data in local/dev rule is documented | Met |
| Backup/restore assumptions are documented | Met |
| No SQL or migrations were created | Met |
