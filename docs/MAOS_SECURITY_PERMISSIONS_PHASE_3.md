# Marketing Agency Operating System (MAOS)

## Phase 3 Security & Permissions Specification

**Version:** 1.0  
**Phase:** Phase 3  
**Status:** Security Specification  
**Parent Documents:** `MAOS_MASTER_SPECIFICATION_v1.1.md`, `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md`, `MAOS_ENTERPRISE_DATABASE_PHASE_2.md`  
**Document Role:** Complete security and permissions system specification for MAOS using the approved architecture and database  
**Code Policy:** No application code, SQL, migrations, or implementation snippets are included in this document.

---

## 1. Security Objectives

The MAOS security system must protect tenant data, client data, financial records, files, AI access, sessions, devices, APIs, and administrative actions across the full SaaS platform.

Primary objectives:

- Enforce invite-only access.
- Enforce tenant isolation.
- Provide role-based access control.
- Support custom permissions.
- Protect client portal boundaries.
- Track sessions, devices, and login history.
- Audit critical actions.
- Secure AI retrieval and AI-generated actions.
- Secure API access and file access.
- Apply least privilege by default.

---

## 2. Security Principles

Core principles:

- Deny by default.
- Authenticate every protected request.
- Resolve tenant before accessing tenant data.
- Authorize every action against role, permission, tenant, resource, and visibility.
- Apply least privilege for every role.
- Treat financial, payroll, permissions, billing, files, and AI actions as sensitive.
- Require explicit confirmation for destructive or externally visible actions.
- Log critical actions to audit logs.
- Do not expose internal records to client users unless explicitly shared.
- Do not allow public registration.

---

## 3. Approved Security Data Model

Phase 3 uses the approved Phase 2 database foundation.

Security-critical tables:

| Area | Tables |
| --- | --- |
| Identity | `users`, `tenant_memberships` |
| Access Control | `roles`, `permissions`, `role_permissions`, `membership_roles` |
| Invitations | `invitations` |
| Sessions | `sessions` |
| Devices | `devices` |
| Client Boundary | `clients`, `client_contacts`, `tenant_memberships` |
| Files | `files`, `file_versions`, `file_shares` |
| Chat | `chat_channels`, `chat_channel_members`, `chat_messages` |
| AI | `ai_logs` |
| Audit | `audit_logs`, `activity_logs` |
| Notifications | `notifications`, `notification_deliveries`, `notification_preferences` |

Login history is represented through `audit_logs`, `sessions`, and `devices`.

---

## 4. Access Model

### 4.1 Invite Only Access

MAOS is invite only.

Rules:

- Public registration is prohibited.
- A user can only join a tenant through a valid invitation.
- Invitations must be issued by an authorized Owner or Manager with user-management permission.
- Invitations must be single-use.
- Invitations must expire.
- Invitations must be revocable.
- Invitation tokens must be stored as hashes.
- Accepted, expired, or revoked invitations cannot be reused.
- Invitation creation, acceptance, expiry, and revocation must be audited.

### 4.2 Tenant Membership Requirement

Access requires:

- Active user.
- Active tenant.
- Active tenant membership.
- Valid session.
- Required role or permission.
- Resource visibility access.

If any requirement fails, access is denied.

### 4.3 Client Access Boundary

Client users are restricted to records connected to their client scope.

Client users may access only:

- Their client profile where exposed.
- Client-visible projects.
- Client-visible tasks.
- Shared files.
- Client-visible approvals.
- Client chat channels where they are members.
- Client invoices and payments where allowed.
- Published client reports.
- Notifications addressed to them.

Client users must not access:

- Internal agency notes.
- Internal-only tasks.
- Other clients.
- Payroll.
- Employee costs.
- Profitability unless explicitly exposed.
- Internal audit logs.
- Tenant-wide dashboards.
- Permission administration.
- AI context outside their visible records.

---

## 5. Role Model

### 5.1 Standard Roles

Phase 3 defines four required tenant roles:

| Role | Purpose | Default Scope |
| --- | --- | --- |
| Owner | Full tenant control and ultimate administrative authority | Tenant-wide |
| Manager | Operational management across assigned modules and teams | Tenant-wide or module-limited |
| Employee | Internal agency user who performs assigned work | Assigned resources |
| Client | External client portal user | Client-scoped only |

### 5.2 Role Hierarchy

Role authority from highest to lowest:

1. Owner.
2. Manager.
3. Employee.
4. Client.

Hierarchy does not bypass explicit restrictions. For example, a Manager still needs finance permission to access payroll or billing records.

### 5.3 Role Assignment Rules

Rules:

- Roles are assigned to tenant memberships through `membership_roles`.
- Roles are not assigned directly to global users.
- A user may hold different roles in different tenants.
- A user may hold multiple roles in the same tenant only when explicitly allowed.
- Client users must receive client-scoped roles.
- Owner assignment and removal must be audited.
- A tenant must always have at least one active Owner.

---

## 6. RBAC Specification

### 6.1 RBAC Components

RBAC uses:

| Component | Database Table | Purpose |
| --- | --- | --- |
| User identity | `users` | Global login identity |
| Tenant membership | `tenant_memberships` | Tenant and client access scope |
| Role | `roles` | Named access bundle |
| Permission | `permissions` | Atomic action capability |
| Role permission | `role_permissions` | Maps roles to permissions |
| Membership role | `membership_roles` | Assigns roles to users within tenant |

### 6.2 Permission Evaluation Order

Every protected action must evaluate:

1. Is the user authenticated?
2. Is the session active?
3. Is the device allowed?
4. Is the tenant active?
5. Is the membership active?
6. Does the user have a role in this tenant?
7. Does the role include the required permission?
8. Is the target resource in the same tenant?
9. Is the resource visible to this role and membership?
10. Is the action blocked by sensitivity, policy, billing status, or environment?

If any step fails, the action is denied.

### 6.3 Permission Naming Standard

Permissions should follow this structure:

| Pattern | Meaning |
| --- | --- |
| `module.read` | View records in a module |
| `module.create` | Create records in a module |
| `module.update` | Edit records in a module |
| `module.delete` | Delete or archive records in a module |
| `module.manage` | Manage settings or advanced actions |
| `module.approve` | Approve workflow records |
| `module.export` | Export records or reports |
| `module.share` | Share resources externally or with clients |

Examples:

| Permission | Meaning |
| --- | --- |
| `crm.read` | View CRM records |
| `projects.manage` | Manage project settings and members |
| `tasks.update` | Edit tasks |
| `files.share` | Share files |
| `finance.read` | View finance data |
| `payroll.manage` | Manage payroll |
| `ai.use` | Use AI Assistant |
| `ai.manage` | Configure AI settings |
| `audit.read` | View audit logs |

---

## 7. Custom Permissions

### 7.1 Purpose

Custom permissions allow a tenant to refine role access without changing the platform role model.

### 7.2 Custom Permission Rules

Rules:

- Custom permissions must map to approved modules and actions.
- Custom permissions cannot override tenant isolation.
- Custom permissions cannot grant platform super-admin capabilities.
- Custom permissions cannot allow client users to access another client.
- Sensitive permissions require Owner approval.
- Permission changes must be audited.

### 7.3 Sensitive Permissions

Sensitive permissions include:

- User and role management.
- Finance management.
- Payroll management.
- Payment recording.
- Invoice sending.
- File sharing outside internal users.
- Client portal access management.
- AI administration.
- Automation management.
- Audit log access.
- API key management.

### 7.4 Custom Role Examples

| Custom Role | Typical Permissions |
| --- | --- |
| Finance Manager | finance.read, finance.manage, invoices.manage, payments.manage |
| Project Lead | projects.manage, tasks.manage, approvals.manage, files.share |
| Sales Manager | crm.manage, leads.manage, opportunities.manage, meetings.manage |
| Read-Only Client | client_portal.read, files.read, reports.read |

---

## 8. Default Role Permission Matrix

### 8.1 Core Access Matrix

| Module | Owner | Manager | Employee | Client |
| --- | --- | --- | --- | --- |
| Tenant settings | Full | Limited | None | None |
| White label settings | Full | Limited | None | None |
| Users and invitations | Full | Limited | None | None |
| Roles and permissions | Full | Limited if granted | None | None |
| CRM | Full | Full or assigned | Limited | None |
| Leads | Full | Full or assigned | Limited | None |
| Clients | Full | Full or assigned | Assigned only | Own client only |
| Projects | Full | Full or assigned | Assigned only | Client-visible only |
| Tasks | Full | Full or assigned | Assigned only | Client-visible only |
| Subtasks | Full | Full or assigned | Assigned only | Client-visible only |
| Files | Full | Full or assigned | Assigned/shared only | Shared/client-visible only |
| Chat | Full | Managed/assigned | Member channels | Client channels only |
| Voice Notes | Full | Managed/assigned | Own/assigned | None unless enabled |
| Approvals | Full | Managed/assigned | Assigned | Client-visible assigned |
| Templates | Full | Manage if granted | Use only | None |
| Automations | Full | Manage if granted | None or limited | None |
| Notifications | Full own/admin | Own/team | Own | Own |
| Time tracking | Full | Team/assigned | Own | None |
| Payroll | Full | Only if granted | Own summary only if enabled | None |
| Employee costs | Full | Only if granted | None | None |
| Finance | Full | Only if granted | None or limited | None |
| Invoices | Full | Finance granted | None | Own client only |
| Payments | Full | Finance granted | None | Own client only |
| Wallets | Full | Finance granted | None | Own client only if enabled |
| Contracts | Full | Managed/assigned | Limited | Own client visible only |
| AI | Full | Use/manage if granted | Use if granted | Client-safe only |
| Audit logs | Full | Limited if granted | None | None |

### 8.2 Default Role Descriptions

Owner:

- Full tenant administration.
- Full module access.
- Can manage roles, permissions, billing, white-label settings, users, security, and sensitive workflows.
- Can view audit logs.
- Can approve sensitive automation and AI actions.

Manager:

- Operational role.
- Can manage teams, clients, projects, tasks, approvals, and reports where granted.
- Cannot access payroll, employee costs, billing, permissions, or audit logs unless explicitly granted.
- Cannot remove the last Owner.

Employee:

- Internal contributor role.
- Can access assigned projects, tasks, files, chat channels, approvals, and own time entries.
- Cannot manage users, roles, tenant settings, finance, payroll, or audit logs.
- Can use AI only if granted and only over accessible resources.

Client:

- External portal role.
- Can access only client-visible records for their own client.
- Cannot access internal agency data.
- Cannot access tenant administration, payroll, employee costs, internal finance, audit logs, or global AI context.

---

## 9. Invite Only Access Flow

### 9.1 Invitation Creation

Required checks:

- Actor has `users.invite` or equivalent permission.
- Tenant is active.
- Invitee email is valid.
- Role is allowed for invitee type.
- Client role requires client scope.
- Duplicate active invitations should be prevented or replaced by controlled resend.

Audit events:

- `invitation.created`.
- `invitation.resent`.
- `invitation.revoked`.
- `invitation.expired`.

### 9.2 Invitation Acceptance

Required checks:

- Invitation exists.
- Invitation token hash matches.
- Invitation is pending.
- Invitation is not expired.
- Invitation is not revoked.
- Tenant is active.
- Role and client scope are still valid.

Result:

- User is created or connected.
- Tenant membership is created.
- Membership role is assigned.
- Invitation is marked accepted.
- Session may be created after authentication.
- Audit log is written.

### 9.3 Invitation Failure Handling

Failed invitations must not reveal whether an email already exists. User-facing errors should be generic and safe.

---

## 10. Session Management

### 10.1 Session Requirements

Sessions must:

- Be tied to a user.
- Optionally retain last active tenant context.
- Reference a device when available.
- Store only token hashes.
- Expire automatically.
- Be revocable.
- Track last seen time.
- Be invalidated when user, tenant membership, or device is suspended.

### 10.2 Session States

| State | Meaning |
| --- | --- |
| Active | Valid and usable |
| Expired | Past expiration time |
| Revoked | Manually or automatically invalidated |

### 10.3 Session Security Rules

Rules:

- Session tokens must never be stored in plaintext.
- Sensitive actions may require recent authentication.
- Role or permission changes should invalidate or refresh effective access.
- Password reset or account compromise should revoke active sessions.
- Suspicious sessions should be revocable by Owner or security admin.

---

## 11. Device Tracking

### 11.1 Device Requirements

Device tracking uses the approved `devices` table.

Tracked metadata:

- User.
- Device fingerprint hash.
- Device name.
- Device type.
- Browser.
- Operating system.
- Last IP address.
- Last seen time.
- Trusted time.
- Revoked time.

### 11.2 Device Rules

Rules:

- Device fingerprints must be hashed.
- Users should be able to review active devices.
- Owners or authorized admins may revoke suspicious devices.
- Revoked devices cannot create new active sessions without re-verification.
- New or unusual devices should create security audit events.

### 11.3 Device Audit Events

Required events:

- `device.first_seen`.
- `device.trusted`.
- `device.revoked`.
- `device.suspicious`.
- `device.session_started`.

---

## 12. Login History

### 12.1 Login History Source

Login history is represented through:

- `audit_logs` for login events.
- `sessions` for active and historical session records.
- `devices` for device context.

### 12.2 Required Login Events

Login history must capture:

- Login success.
- Login failure.
- Logout.
- Session expiration.
- Session revocation.
- Password reset request where passwords are used.
- Password reset completion where passwords are used.
- New device login.
- Suspicious login attempt.

### 12.3 Login History Fields

Each login history event must retain:

- User where known.
- Tenant where known.
- Actor type.
- Event result.
- Timestamp.
- IP address where available.
- User agent where available.
- Device reference where available.
- Session reference where available.
- Failure reason category where safe.

### 12.4 Access To Login History

Access rules:

- Users may view their own login history where enabled.
- Owners may view tenant security login history.
- Managers may view login history only if granted security permission.
- Clients may view only their own login history if exposed in the portal.
- Failed login details must not expose sensitive authentication internals.

---

## 13. Audit Logs

### 13.1 Audit Purpose

Audit logs provide immutable evidence of critical security, administrative, financial, AI, and data access actions.

### 13.2 Required Audit Areas

Audit logs must cover:

- Authentication events.
- Invitation events.
- User status changes.
- Role assignment changes.
- Permission changes.
- Tenant settings changes.
- White-label settings changes.
- Client data changes.
- Project and task critical changes.
- File sharing changes.
- Contract changes.
- Invoice status changes.
- Payment status changes.
- Wallet transactions.
- Payroll approval and payment changes.
- AI sensitive actions.
- Automation creation and execution.
- API key creation, rotation, and revocation.

### 13.3 Audit Log Rules

Rules:

- Audit logs are append-only.
- Audit logs must be tenant-scoped unless platform-level.
- Sensitive snapshots must be redacted.
- Financial and payroll audit records must be retained according to retention policy.
- Audit log access must itself be audited.
- Client users must not access internal audit logs.

---

## 14. AI Security

### 14.1 AI Security Principles

AI must follow the same access rules as the requesting user.

Rules:

- AI cannot access cross-tenant data.
- AI cannot retrieve records hidden from the user.
- AI cannot expose internal-only records to client users.
- AI cannot perform sensitive actions without explicit user confirmation.
- AI outputs that trigger actions must pass permission checks.
- AI interactions must be logged in `ai_logs`.
- Sensitive AI actions must be logged in `audit_logs`.

### 14.2 AI Permission Requirements

| AI Capability | Required Permission |
| --- | --- |
| Ask AI over accessible workspace data | `ai.use` |
| Use AI inside tasks/projects | `ai.use` plus resource access |
| Generate client-facing content | `ai.use` plus target module permission |
| Run AI analytics | `ai.analytics.read` |
| Configure AI settings | `ai.manage` |
| Use AI to create or update records | Target module create/update permission |
| Use AI to send external messages | Target communication/send permission |

### 14.3 AI Client Safety

Client AI responses must be restricted to:

- Client-visible projects.
- Client-visible tasks.
- Shared files.
- Client approvals.
- Client invoices and payments where enabled.
- Published reports.
- Client chat channels.

Client AI must not include:

- Internal notes.
- Internal profitability.
- Employee costs.
- Payroll.
- Other clients.
- Internal audit logs.
- Internal AI logs.

---

## 15. API Security

### 15.1 API Security Principles

Every API request must be authenticated, tenant-scoped, authorized, validated, rate-limited where appropriate, and audited when sensitive.

### 15.2 API Request Security Checks

Required checks:

- Valid authentication.
- Active session or valid service credential.
- Tenant resolution.
- Active tenant status.
- Active membership.
- Required permission.
- Resource tenant match.
- Resource visibility match.
- Input validation.
- Rate limit check.
- Sensitive action confirmation where required.

### 15.3 API Key And Integration Security

If API keys or integration tokens are introduced:

- Keys must be tenant-scoped.
- Keys must be hashed or securely stored.
- Keys must have explicit scopes.
- Keys must support expiration.
- Keys must support rotation.
- Keys must be revocable.
- Key creation and use must be audited.

### 15.4 API Rate Limiting

Rate limits should apply to:

- Login attempts.
- Invitation acceptance.
- Password reset.
- File upload.
- AI requests.
- Public webhook endpoints.
- Payment webhook processing.
- Search endpoints.
- Export endpoints.

---

## 16. File Security

### 16.1 File Access Rules

Files are private by default.

Access requires:

- Active authenticated user.
- Active tenant membership.
- File tenant match.
- File visibility access.
- Direct resource access or explicit file share.
- Non-quarantined file status.

### 16.2 File Visibility Levels

| Visibility | Meaning |
| --- | --- |
| Internal | Agency users only with resource access |
| Client Visible | Visible to authorized client users |
| Restricted | Explicitly shared users only |

### 16.3 File Sharing Rules

Rules:

- Sharing must be explicit.
- Client sharing requires client context.
- External file links should be signed and expiring.
- Revoked shares must immediately remove access.
- File downloads of sensitive files must be audited.
- File sharing changes must be audited.

### 16.4 File Upload Security

Required controls:

- File size limits.
- File type validation.
- Malware scanning where available.
- Quarantine status for suspicious files.
- Tenant-scoped storage keys.
- Protected file metadata.
- Version tracking for changed files.

---

## 17. Module Security Matrix

| Module | Owner | Manager | Employee | Client |
| --- | --- | --- | --- | --- |
| CRM | Full | Full/assigned | Limited assigned | None |
| Leads | Full | Full/assigned | Limited assigned | None |
| Clients | Full | Full/assigned | Assigned only | Own client only |
| Projects | Full | Full/assigned | Assigned only | Client-visible only |
| Tasks | Full | Full/assigned | Assigned only | Client-visible only |
| Subtasks | Full | Full/assigned | Assigned only | Client-visible only |
| Files | Full | Full/assigned | Assigned/shared only | Shared/client-visible only |
| Chat | Full | Managed/member | Member channels | Client channels only |
| Voice Notes | Full | Managed/assigned | Own/assigned | None by default |
| AI | Full | Granted/assigned | Granted/assigned | Client-safe only |
| Payroll | Full | Explicit grant only | Own summary if enabled | None |
| Finance | Full | Explicit grant only | None by default | None |
| Invoices | Full | Finance grant | None by default | Own client only |
| Payments | Full | Finance grant | None by default | Own client only |
| Contracts | Full | Managed/assigned | Limited assigned | Client-visible only |
| Notifications | Full admin/own | Team/own | Own | Own |
| Audit Logs | Full | Explicit grant only | None | None |

---

## 18. Sensitive Action Policy

Sensitive actions require stronger controls.

Sensitive actions:

- Change tenant settings.
- Change white-label domains.
- Invite users.
- Assign or remove Owner role.
- Change permissions.
- Share files with clients.
- Send invoices.
- Record payments.
- Refund payments.
- Approve payroll.
- Run payroll.
- Export financial data.
- Export client data.
- Configure AI access.
- Approve AI-generated external actions.
- Create or change automations that affect clients or finance.

Required controls:

- Permission check.
- Recent authentication where appropriate.
- Confirmation step.
- Audit log.
- Notification to relevant admins where appropriate.

---

## 19. Security Notifications

Security notifications should be generated for:

- New login from unknown device.
- Role changed.
- Permission changed.
- Owner added or removed.
- Invitation accepted.
- Invitation revoked.
- Session revoked.
- Device revoked.
- Password reset completed.
- Payment provider setting changed.
- File shared externally or with client.
- AI sensitive action requested.
- API key created, rotated, or revoked.

Recipients:

- Affected user.
- Owner.
- Security or admin users where configured.

---

## 20. Environment Security

### 20.1 Sandbox

Sandbox rules:

- No production secrets.
- No live payment credentials.
- Synthetic or anonymized data only.
- Restricted email delivery.
- Reduced AI limits.

### 20.2 Staging

Staging rules:

- Production-like permissions.
- Separate database and storage.
- Test payment credentials only.
- Controlled email delivery.
- Security regression validation before release.

### 20.3 Production

Production rules:

- Production-only secrets.
- Full audit logging.
- Full monitoring.
- Backup and restore policy.
- Strict payment provider controls.
- Incident response readiness.

---

## 21. Security Acceptance Criteria

Phase 3 is accepted when:

- Invite-only access is enforced.
- RBAC is defined for Owner, Manager, Employee, and Client.
- Custom permissions are supported without breaking tenant isolation.
- Sessions are tracked, expirable, and revocable.
- Devices are tracked and revocable.
- Login history is available through audit, session, and device records.
- Audit logs cover critical actions and are append-only.
- AI access is tenant-scoped, permission-scoped, and audited.
- API requests require authentication, tenant resolution, authorization, validation, and rate controls.
- Files are private by default, tenant-scoped, access-controlled, and auditable.
- Client users cannot access internal agency data or other clients.

---

## 22. Final Phase 3 Statement

This Phase 3 Security & Permissions Specification defines the approved security foundation for MAOS. It must guide authentication, authorization, invite-only onboarding, role management, custom permissions, session handling, device tracking, login history, audit logging, AI security, API security, and file security.

All implementation must preserve tenant isolation, least privilege, client boundaries, auditability, and explicit controls for sensitive actions.

