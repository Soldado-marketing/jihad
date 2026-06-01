# MAOS Sensitive Table Hardening Plan

## Purpose

Define the baseline hardening target for sensitive table groups before implementation begins.

## Sensitive Table Groups

| Table Group | Required Tenant Scope | Application-Level Control | Database-Level Hardening Target | Audit Requirement | Test Expectation |
|---|---|---|---|---|---|
| Audit logs | tenant_id required where tenant-scoped | Owner/security-grant access only | Consider targeted RLS/equivalent protection | Audit access/export | Deny non-owner/global access |
| Finance records | tenant_id and client/project scope | Owner-only by default | Targeted RLS/equivalent where practical | Create/update/view/export | Owner-only and explicit grant tests |
| Invoices/payments | tenant_id and client scope | Owner finance, client own-approved visibility | Targeted RLS/equivalent where practical | Lifecycle and access events | Client own-only tests |
| Client visibility records | tenant_id and client_id | Client-visible flags enforced | Tenant and client consistency constraints where practical | Visibility changes | Client boundary tests |
| File metadata/versions/shares | tenant_id and resource scope | Permission check before metadata or signed URL | Tenant and share-scope hardening | Upload/version/share/download | Signed URL permission tests |
| Chat messages | tenant_id and channel membership | Channel membership and client/internal separation | Tenant/channel consistency hardening | Sensitive channel actions | Membership denial tests |
| Voice notes/transcripts | tenant_id and project/task/client scope | Permission-filtered transcript access | Tenant/resource hardening | Upload/transcription/task draft | Transcript visibility tests |
| AI logs | tenant_id and actor/resource scope | Permission-filtered access | Tenant and actor scope hardening | AI action and access events | Leakage and prompt-injection tests later |
| Report access logs | tenant_id and report scope | Report permission and sensitivity checks | Tenant/report scope hardening | View/export/schedule events | Hidden count/total tests later |
| Permission grants | tenant_id and actor/resource scope | Owner/security-grant mutation only | Targeted hardening recommended | Grant/revoke events | Permission revocation tests |
| Sessions/devices/login history | tenant_id and user scope | User own limited access; Owner/security oversight | Tenant/user scope hardening | Session/device/login events | Session/device visibility tests |

## Hardening Target

The MVP can use a shared PostgreSQL database, but sensitive table groups require stronger controls than normal application filters. Where practical, targeted RLS or equivalent database-level protections should be introduced for the highest-risk tenant-owned data.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Sensitive table groups are listed | Met |
| Required tenant scope is documented | Met |
| Application-level control is documented | Met |
| Database-level hardening target is documented | Met |
| Audit requirements are documented | Met |
| Test expectations are documented | Met |
