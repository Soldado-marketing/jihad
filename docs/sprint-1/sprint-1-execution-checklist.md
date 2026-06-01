# MAOS Sprint 1 Execution Checklist

## 1. Sprint 1 Objective

Implement the MVP foundation for identity, tenants, invite-only access, sessions, devices, login history, RBAC, permission guards, tenant-aware access, audit logging, audit redaction, and Sprint 1 QA/security validation.

Sprint 1 is split into:

- Sprint 1A: Identity Foundation.
- Sprint 1B: Permissions & Audit Foundation.

## 2. Sprint 1 Scope

| Scope Area | Included |
|---|---|
| Identity foundation | Tenant, user, membership, invitation, login/session baseline |
| Tenant foundation | Tenant model, tenant context, tenant-aware access requirements |
| Invite-only access | Invitation lifecycle baseline and no public registration |
| Sessions/devices/login history | Session basics, device baseline, login event baseline |
| RBAC foundation | Owner, Manager, Employee, Client baseline roles |
| Permission guard foundation | Route guard, permission check, denied behavior |
| Resource scope validation | Service-level tenant/resource scope checks |
| Audit foundation | Audit event service, append-only expectation, redaction baseline |
| QA/security validation | Sprint 1 test plan, permission tests, tenant isolation tests, evidence capture |

## 3. Sprint 1 Non-Scope

| Excluded Area | Reason |
|---|---|
| CRM | Starts later after identity/permissions foundation |
| Client Portal | Requires identity, client boundaries, and permission foundation first |
| Projects/Tasks | Starts after Sprint 1 foundation |
| Finance | Requires Owner-only access and audit foundation first |
| AI | Requires project/task/file/voice foundations later |
| Reports | Requires data-producing modules later |
| Automations | Requires stable manual workflows later |
| Advanced permissions | MVP foundation only; no complex policy builder |
| Production deployment | Sprint 1 implementation/testing only |

## 4. Sprint 1A Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| S1A-001 | Define tenant model implementation plan | Backend Lead / Database Architect | Tenant model fields and ownership rules documented in implementation ticket | Sprint 0 tenant isolation baseline | Tenant model includes tenant identity, status, timestamps, and ownership metadata | Blocking | Tenant model review and tenant isolation test mapping |
| S1A-002 | Define user model implementation plan | Backend Lead | User model fields and identity rules documented | Backend setup standard | User model supports invited users, profile basics, status, and audit references | Blocking | User creation and uninvited-user negative tests |
| S1A-003 | Define membership model implementation plan | Backend Lead / Security Architect | Membership model with tenant, user, role, status, and scope | Tenant model and user model | Membership controls tenant access and prevents cross-tenant access | Blocking | Cross-tenant membership denial tests |
| S1A-004 | Define invitation model and lifecycle | Backend Lead / Product Owner | Invitation states, expiry, revocation, acceptance rules | Invite-only access standard | Draft/sent/accepted/expired/revoked states are represented | Blocking | Valid, expired, revoked, duplicate invite tests |
| S1A-005 | Enforce no public registration scope | Backend Lead / Security Architect | No-public-registration route policy | Invite-only access standard | No self-registration path exists or is reachable | Blocking | Public signup absent/denied test |
| S1A-006 | Define invite acceptance flow baseline | Backend Lead / QA Lead | Invite acceptance workflow and failure handling | Email fallback approval | Valid invite can create/link user membership; invalid invite denied safely | Blocking | Valid/wrong tenant/expired/revoked invite tests |
| S1A-007 | Define login/session baseline | Backend Lead / Security Architect | Session lifecycle requirements | User and membership models | Login, logout, expiry, invalid session behavior defined | Blocking | Session creation, expiry, revocation, invalid session tests |
| S1A-008 | Define device tracking baseline | Backend Lead | Device record requirements and trust/untrust future placeholder | Session baseline | Login can create safe device record without over-collecting sensitive data | Blocking | Device record creation and visibility tests |
| S1A-009 | Define login history baseline | Backend Lead / QA Lead | Login history event requirements | Session and device baseline | Login success/failure events are audit-ready and tenant/user scoped | Blocking | Login history creation and failed login tests |
| S1A-010 | Define frontend auth screen requirements | Frontend Lead / Designer | Login, invite accept, denied, logout screen requirements | Frontend setup standard | Screens support invite-only flow and safe denied states | Blocking | UX review and no-public-registration UI test |
| S1A-011 | Define tenant context resolver implementation task | Backend Lead | Tenant resolver task with request/session membership source | Tenant isolation baseline | Protected requests resolve tenant context before service execution | Blocking | Tenant context HTTP tests |
| S1A-012 | Define Sprint 1A QA evidence set | QA Lead | QA evidence records for identity/session/invite tests | QA evidence template | Evidence includes role, tenant, result, logs/screenshots, reviewer | Blocking | Evidence completeness review |

## 5. Sprint 1B Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| S1B-001 | Define RBAC role constants and baseline role rules | Backend Lead / Security Architect | Owner, Manager, Employee, Client baseline role rules | Membership model | Role rules match Sprint 0 permission matrix | Blocking | Role allowed/denied tests |
| S1B-002 | Define permission action/resource vocabulary | Security Architect / Backend Lead | MVP permission vocabulary for identity, tenants, audit, memberships | RBAC baseline | Vocabulary covers Sprint 1 resources without advanced policy builder | Blocking | Permission vocabulary review |
| S1B-003 | Define permission guard implementation task | Backend Lead | Route guard task with role, permission, tenant context, denied behavior | Tenant resolver and RBAC | Protected routes cannot execute without guard | Blocking | Protected route allowed/denied tests |
| S1B-004 | Define service-level resource scope validation task | Backend Lead / Security Architect | Service validation rules for tenant, membership, audit access | Service/repository layering standard | Sensitive services re-check resource scope after route guard | Blocking | Service-level scope negative tests |
| S1B-005 | Define tenant-aware repository enforcement task | Database Architect / Backend Lead | Repository rule requiring tenant context for tenant-owned records | Tenant-aware repository baseline | Tenant-owned repository access rejects missing tenant context | Blocking | Repository missing-tenant-context tests |
| S1B-006 | Define audit event service implementation task | Backend Lead / Security Architect | Audit event service requirements | Audit logging baseline | Service can create append-only audit events with required fields | Blocking | Audit event creation tests |
| S1B-007 | Define audit redaction implementation task | Security Architect / Backend Lead | Redaction rules and sensitive payload exclusions | Audit redaction checklist | Secrets, payment data, file/chat/voice content, and sensitive AI prompts are excluded | Blocking | Redaction negative tests |
| S1B-008 | Define audit access rules | Security Architect | Owner/security-grant audit access policy | RBAC baseline | Clients, employees, and managers cannot access global audit logs by default | Blocking | Audit visibility denied tests |
| S1B-009 | Define permission denied response rules | Backend Lead / QA Lead | Safe forbidden/not-found behavior rules | Permission guard standard | Denials do not reveal hidden tenant/resource metadata | Blocking | Hidden metadata leakage tests |
| S1B-010 | Define permission drift review | CTO / Security Architect | Review checklist before Sprint 1 exit | All permission tasks | No protected route/service/repository bypass exists | Blocking | Permission drift review evidence |
| S1B-011 | Define Sprint 1B QA evidence set | QA Lead | QA evidence records for RBAC/permission/audit/tenant tests | QA evidence template | Evidence proves role scope, tenant scope, audit, and negative tests | Blocking | Evidence completeness review |

## 6. Required Data Models

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| DM-001 | Tenant | Database Architect | Tenant model definition | ADR-004 | Supports tenant identity, status, timestamps, and owner relationship | Blocking | Tenant creation and cross-tenant denial tests |
| DM-002 | User | Database Architect / Backend Lead | User model definition | Invite-only standard | Supports invited identity, status, timestamps, and login linkage | Blocking | User invite/login tests |
| DM-003 | Tenant Membership | Database Architect / Security Architect | Membership model definition | Tenant and user models | Links user to tenant with role and status | Blocking | Membership scope tests |
| DM-004 | Invitation | Database Architect / Backend Lead | Invitation model definition | Invite flow baseline | Supports lifecycle, expiry, revocation, role/scope, accepted metadata | Blocking | Invitation lifecycle tests |
| DM-005 | Session | Backend Lead / Security Architect | Session model definition | Login baseline | Supports active/expired/revoked status and safe session tracking | Blocking | Session lifecycle tests |
| DM-006 | Device | Backend Lead | Device model definition | Session baseline | Supports safe device metadata, first/last seen, and user linkage | Blocking | Device creation/visibility tests |
| DM-007 | Login History | Backend Lead / QA Lead | Login history model definition | Session/device baseline | Captures success/failure, timestamp, user/session/device where safe | Blocking | Login history tests |
| DM-008 | Role/Permission Foundation | Security Architect / Backend Lead | Role and permission mapping definition | Membership model | Supports Owner/Manager/Employee/Client baseline permissions | Blocking | RBAC tests |
| DM-009 | Audit Event | Security Architect / Backend Lead | Audit event model definition | Audit baseline | Includes actor, tenant, resource, action, permission result, outcome, timestamp, session/device where available | Blocking | Audit event and redaction tests |

## 7. Required Backend Modules

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| BM-001 | Identity module | Backend Lead | Module task for users, invite acceptance, login baseline | Backend setup standard | No public registration and no unrelated features | Blocking | Identity functional tests |
| BM-002 | Tenant module | Backend Lead / Database Architect | Module task for tenant and membership access | Tenant isolation baseline | Tenant context is central to protected operations | Blocking | Tenant isolation tests |
| BM-003 | Auth/session module | Backend Lead / Security Architect | Module task for session basics | Invite-only standard | Supports login/logout/expiry/revocation baseline | Blocking | Session tests |
| BM-004 | Device/login history module | Backend Lead | Module task for device and login event capture | Session baseline | Device/login data is privacy-safe and audit-ready | Blocking | Device/login tests |
| BM-005 | Permissions module | Backend Lead / Security Architect | Module task for roles, permissions, guards | Permission guard standard | Route guard and service scope validation foundations exist | Blocking | RBAC/permission tests |
| BM-006 | Audit module | Backend Lead / Security Architect | Module task for audit event and redaction baseline | Audit logging baseline | Audit events are append-only from normal paths and redacted | Blocking | Audit/redaction tests |

## 8. Required API Endpoints

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| API-001 | Invite acceptance endpoint | Backend Lead | Endpoint contract for accepting valid invite | Invitation model | Accepts only valid invite and denies expired/revoked safely | Blocking | Invite lifecycle tests |
| API-002 | Login endpoint | Backend Lead / Security Architect | Endpoint contract for login baseline | User/membership/session models | Creates session only for invited valid member | Blocking | Login success/failure tests |
| API-003 | Logout endpoint | Backend Lead | Endpoint contract for logout/session revocation | Session model | Revokes active session safely | Blocking | Logout/revocation tests |
| API-004 | Current session/profile endpoint | Backend Lead | Endpoint contract for current user, tenant membership, role | Session and membership models | Returns only authenticated actor's safe profile/context | Blocking | Authenticated context tests |
| API-005 | Session list/revoke baseline | Backend Lead / Security Architect | Endpoint contract for own sessions and revoke flow | Session model | User can manage own sessions; admin scope follows permission rules | Blocking | Session visibility/revoke tests |
| API-006 | Device list baseline | Backend Lead | Endpoint contract for own device visibility | Device model | User sees own devices only unless explicit admin scope later | Blocking | Device visibility tests |
| API-007 | Login history baseline | Backend Lead / QA Lead | Endpoint contract for own login history or audit-backed internal view | Login history model | No cross-user or cross-tenant leakage | Blocking | Login history visibility tests |
| API-008 | Protected route probe endpoint | Backend Lead / QA Lead | Safe internal test endpoint or documented test route strategy | Permission guard | Confirms guard and denied behavior without production feature scope | Blocking | Guard positive/negative tests |
| API-009 | Audit event access baseline | Backend Lead / Security Architect | Endpoint contract or access policy for audit review | Audit module | Owner/security-grant only; client/employee/manager denied by default | Blocking | Audit access tests |

## 9. Required Frontend/Auth Screens

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| FE-S1-001 | Login screen | Frontend Lead / Designer | Login screen requirements and implementation task | Frontend setup standard | Supports invited users only and safe errors | Blocking | Login UI test |
| FE-S1-002 | Invite acceptance screen | Frontend Lead / Designer | Invite acceptance screen requirements | Invite acceptance endpoint | Valid/invalid/expired/revoked invite states are safe | Blocking | Invite UI state tests |
| FE-S1-003 | Logout/session expired state | Frontend Lead | Session expired/logout UI requirements | Session baseline | User can exit and sees safe expired state | Blocking | Session UI tests |
| FE-S1-004 | Forbidden/denied state | Frontend Lead / QA Lead | Safe denied state requirements | Permission guard | Denied state does not leak metadata | Blocking | Denied-state negative tests |
| FE-S1-005 | Basic account/session view | Frontend Lead | Minimal own profile/session/device/login history requirements | Session/device/login models | Shows own safe data only | Non-blocking | Own-scope visibility tests |

## 10. Required Guards And Middleware

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| GM-001 | Authentication guard | Backend Lead / Security Architect | Authenticated session guard implementation task | Session model | Protected routes require valid session | Blocking | Unauthenticated denial tests |
| GM-002 | Tenant resolver | Backend Lead | Tenant context resolver implementation task | Tenant/membership models | Tenant context resolved before protected service execution | Blocking | Tenant context tests |
| GM-003 | Role guard | Backend Lead / Security Architect | Role guard implementation task | Membership model | Evaluates Owner/Manager/Employee/Client baseline roles | Blocking | Role tests |
| GM-004 | Permission guard | Backend Lead / Security Architect | Permission/action/resource guard implementation task | Permission vocabulary | Denies unauthorized actions safely | Blocking | Permission tests |
| GM-005 | Service resource scope validator | Backend Lead | Service-level validation implementation task | Service/repository standard | Sensitive services validate tenant/resource scope | Blocking | Service-level negative tests |
| GM-006 | Audit context middleware/helper | Backend Lead / Security Architect | Audit context propagation task | Audit baseline | Actor, tenant, session/device where available are available for audit | Blocking | Audit context tests |

## 11. Required Audit Events

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| AUD-001 | Invite created/sent/accepted/expired/revoked | Backend Lead / QA Lead | Audit event requirements | Invitation model | Event contains actor, tenant, resource, action, outcome | Blocking | Invite audit tests |
| AUD-002 | Login success/failure | Backend Lead / QA Lead | Audit/login history event requirements | Login baseline | Success/failure recorded with redacted context | Blocking | Login audit tests |
| AUD-003 | Session created/revoked/expired | Backend Lead | Audit event requirements | Session model | Session lifecycle events are traceable | Blocking | Session audit tests |
| AUD-004 | Device first seen/updated | Backend Lead | Audit event requirements | Device model | Device event avoids sensitive over-collection | Blocking | Device audit tests |
| AUD-005 | Role/membership changed | Backend Lead / Security Architect | Audit event requirements | Membership model | Role changes are traceable and redacted | Blocking | Membership audit tests |
| AUD-006 | Permission allowed/denied for sensitive route | Security Architect / Backend Lead | Audit event requirements | Permission guard | Sensitive denials are logged safely | Blocking | Permission denied audit tests |
| AUD-007 | Audit viewed/export attempted | Security Architect | Audit access event requirements | Audit module | Audit access itself is audit-ready | Blocking | Audit access tests |

## 12. Required QA Tests

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| QA-101 | Invite lifecycle tests | QA Lead | Test cases and evidence | S1A invite tasks | Valid, expired, revoked, duplicate invite results captured | Blocking | Evidence template required |
| QA-102 | No-public-registration tests | QA Lead / Security Architect | Test cases and evidence | No-public-registration policy | Public signup is absent or denied | Blocking | Negative evidence required |
| QA-103 | Session lifecycle tests | QA Lead | Test cases and evidence | Session baseline | Login/logout/expiry/revocation covered | Blocking | Evidence template required |
| QA-104 | Device/login history tests | QA Lead | Test cases and evidence | Device/login history baseline | Device and login events are created and visible only as allowed | Blocking | Evidence template required |
| QA-105 | RBAC tests | QA Lead / Security Architect | Role matrix test evidence | RBAC baseline | Owner/Manager/Employee/Client allowed/denied results captured | Blocking | Permission matrix required |
| QA-106 | Audit event tests | QA Lead / Security Architect | Audit event evidence | Audit service baseline | Sensitive actions produce redacted audit events | Blocking | Audit evidence required |

## 13. Required Security Tests

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| SEC-T-001 | Cross-tenant denial | Security Architect / QA Lead | Security test evidence | Tenant resolver/repository baseline | Tenant A cannot access Tenant B records | Blocking | Tenant isolation plan |
| SEC-T-002 | Missing tenant context denial | Security Architect / Backend Lead | Test evidence | Tenant-aware repository baseline | Tenant-owned access fails without tenant context | Blocking | Repository tests |
| SEC-T-003 | Unauthorized role denial | Security Architect / QA Lead | Test evidence | RBAC guard | Unauthorized roles denied safely | Blocking | Permission matrix |
| SEC-T-004 | Hidden metadata leakage check | Security Architect / QA Lead | Test evidence | Denied response rules | Denied/not-found does not reveal resource existence | Blocking | Negative tests |
| SEC-T-005 | Audit redaction check | Security Architect / QA Lead | Test evidence | Audit redaction baseline | Secrets and sensitive payloads excluded | Blocking | Redaction tests |
| SEC-T-006 | Permission drift review | CTO / Security Architect | Review evidence | Sprint 1 implementation complete | No bypass of controller/service/repository/guard pattern | Blocking | Manual review checklist |

## 14. Required Negative Tests

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| NEG-001 | Uninvited user attempts login/register | QA Lead | Negative test evidence | Invite-only baseline | Denied safely without public registration | Blocking | QA evidence |
| NEG-002 | Expired/revoked invite acceptance | QA Lead | Negative test evidence | Invitation lifecycle | Denied safely and audit-ready | Blocking | QA evidence |
| NEG-003 | Cross-tenant resource ID request | QA Lead / Security Architect | Negative test evidence | Tenant isolation | Denied without metadata leakage | Blocking | Tenant isolation evidence |
| NEG-004 | Employee attempts Owner-only action | QA Lead | Negative test evidence | RBAC guard | Denied safely | Blocking | Permission evidence |
| NEG-005 | Client attempts audit/internal access | QA Lead / Security Architect | Negative test evidence | Permission guard | Denied safely | Blocking | Permission evidence |
| NEG-006 | Sensitive payload in audit/log path | Security Architect / QA Lead | Negative test evidence | Audit redaction | Payload redacted or excluded | Blocking | Redaction evidence |

## 15. Acceptance Criteria

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| AC-001 | Sprint 1A identity foundation accepted | CTO / QA Lead | Sprint 1A acceptance record | S1A tasks | Tenant/user/membership/invite/session/device/login foundations pass tests | Blocking | Sprint 1A QA evidence |
| AC-002 | Sprint 1B permissions/audit foundation accepted | CTO / Security Architect / QA Lead | Sprint 1B acceptance record | S1B tasks | RBAC, permission guard, service scope, audit, redaction pass tests | Blocking | Sprint 1B QA/security evidence |
| AC-003 | No non-scope module introduced | Technical Program Manager | Scope review evidence | All Sprint 1 tasks | No CRM, client portal, projects/tasks, finance, AI, reports, automations | Blocking | Scope review |
| AC-004 | Tenant isolation evidence accepted | Security Architect | Tenant isolation QA evidence | Tenant tests | Cross-tenant and missing-context tests pass | Blocking | Tenant isolation evidence |
| AC-005 | Audit evidence accepted | Security Architect / QA Lead | Audit QA evidence | Audit tests | Required audit events and redaction pass | Blocking | Audit evidence |

## 16. Sprint 1 Exit Criteria

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| EXIT-001 | Sprint 1A complete | Technical Program Manager | Sprint 1A completion note | AC-001 | All Sprint 1A blocking items complete | Blocking | QA evidence complete |
| EXIT-002 | Sprint 1B complete | Technical Program Manager | Sprint 1B completion note | AC-002 | All Sprint 1B blocking items complete | Blocking | QA/security evidence complete |
| EXIT-003 | Permission drift review complete | CTO / Security Architect | Permission drift review record | SEC-T-006 | No bypasses or unresolved high-risk permission gaps | Blocking | Review evidence |
| EXIT-004 | Regression baseline captured | QA Lead | Sprint 1 regression evidence | QA/security tests | Invite/auth/session/RBAC/audit/tenant tests pass | Blocking | Regression evidence |
| EXIT-005 | Sprint 2 readiness recommendation | CTO / Product Owner | Go/Conditional Go/No-Go recommendation | All exit items | Sprint 2 may start only if identity/permission/audit foundation is stable | Blocking | Exit review |

## 17. Sprint 1 Go/No-Go To Sprint 2

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| GATE2-001 | Go to Sprint 2 | CTO / QA Lead / Security Architect | Sprint 2 readiness decision | Sprint 1 exit criteria | Go only if all blocking identity, tenant, permission, audit, QA/security criteria pass | Blocking | Full Sprint 1 evidence |
| GATE2-002 | Conditional Go to Sprint 2 | CTO / Security Architect | Conditional Go record | Minor non-security issue only | Forbidden for tenant/auth/permission/audit/QA evidence blockers | Blocking | Risk acceptance evidence |
| GATE2-003 | No-Go to Sprint 2 | CTO / Technical Program Manager | No-Go decision and remediation plan | Critical unresolved blocker | Any tenant isolation, permission, audit, invite-only, or QA evidence blocker prevents Sprint 2 | Blocking | Remediation test plan |

## 18. Implementation Order

| Order | Workstream | Required Before |
|---|---|---|
| 1 | Confirm Sprint 1 tickets from this checklist | Any implementation |
| 2 | Data model definitions and review | API/service implementation |
| 3 | Tenant/user/membership/invitation/session/device/login history foundation | Permission guard and audit integration |
| 4 | Tenant resolver and service/repository context pattern | Protected endpoint completion |
| 5 | RBAC and permission vocabulary | Permission guard |
| 6 | Permission guard and service scope validation | Audit-sensitive access |
| 7 | Audit event service and redaction | Sprint 1 security validation |
| 8 | QA/security tests and evidence | Sprint 1 exit |
| 9 | Permission drift review | Sprint 2 Go/No-Go |

## 19. Risks And Mitigations

| Risk | Severity | Mitigation | Owner Role |
|---|---|---|---|
| Tenant context bypass | Critical | Enforce repository tenant context and service scope validation | Security Architect / Backend Lead |
| Public registration accidentally introduced | Critical | No-public-registration test and route review | Security Architect / QA Lead |
| Audit logs store sensitive payloads | High | Redaction tests and audit review | Security Architect |
| Sprint 1 scope creep | High | Scope review against non-scope list | Technical Program Manager |
| Permission guard too coarse | High | Service-level resource validation and negative tests | Backend Lead / Security Architect |
| Missing QA evidence | High | Evidence template required for every blocking test | QA Lead |
| Email provider still open | Medium | Use approved non-production invite fallback | DevOps Architect / QA Lead |

## 20. Final Sprint 1 Checklist

| Item ID | Description | Owner Role | Required Output | Dependency | Acceptance Criteria | Blocking Status | Test Requirement |
|---|---|---|---|---|---|---|---|
| FINAL-001 | Sprint 1A checklist approved for implementation | CTO / Technical Program Manager | Approved Sprint 1A ticket set | This document | All 1A items are ticket-ready | Blocking | Checklist review |
| FINAL-002 | Sprint 1B checklist approved for implementation | CTO / Security Architect | Approved Sprint 1B ticket set | This document | All 1B items are ticket-ready | Blocking | Checklist review |
| FINAL-003 | QA/security test set ready | QA Lead / Security Architect | Sprint 1 QA/security test pack | QA sections | Required QA/security/negative tests are mapped | Blocking | Test plan review |
| FINAL-004 | Scope guard accepted | Product Owner / Technical Program Manager | Non-scope confirmation | Non-scope section | No non-MVP Sprint 1 module included | Blocking | Scope review |
| FINAL-005 | Sprint 1 implementation ready | CTO | Ready decision | FINAL-001 through FINAL-004 | Sprint 1 can move from checklist to implementation tickets | Blocking | Readiness review |
