# MAOS Migration Governance Plan

## Purpose

Define review and safety expectations for future database migrations. Sprint 0 does not create migrations.

## Migration Review

Every migration must be reviewed for tenant scope, sensitive table impact, rollback risk, and data integrity before merge.

## Backup Expectation

Staging and production migrations require backup or restore point confirmation before execution.

## Rollback Expectation

Every migration must document rollback strategy, forward-fix strategy, or non-rollbackable risk before approval.

## Environment Promotion

Migrations must run in lower environments before production and must be included in release notes where relevant.

## Tenant Safety Review

Tenant-owned tables must include tenant_id unless an explicit approved exception exists. Foreign key relationships should preserve tenant consistency where practical.

## Sensitive Table Review

Migrations affecting audit logs, finance, invoices, payments, files, chat, voice, AI logs, reports, permissions, sessions, devices, or login history require Security Architect review.

## Approval Rules

| Migration Type | Required Review |
|---|---|
| Tenant-owned table | Database Architect |
| Sensitive table | Database Architect and Security Architect |
| Finance/payroll table | Database Architect, Security Architect, Finance Owner |
| Destructive change | CTO, Database Architect, Release Manager |

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Migration review is documented | Met |
| Backup expectation is documented | Met |
| Rollback expectation is documented | Met |
| Environment promotion is documented | Met |
| Tenant safety review is documented | Met |
| Sensitive table review is documented | Met |
| Approval rules are documented | Met |
