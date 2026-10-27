# MAOS — Multi-company access (approved requirements, implementation draft)

Product owner decision (2026-10-27):
- Every company is an isolated Tenant. Knowing another Tenant ID or URL never grants access.
- OWNER may switch between companies where they have an active OWNER/authorized membership.
- MANAGER may switch between active companies they are explicitly a member of; an OWNER may deny manager switching per company.
- EMPLOYEE, CONTRACTOR and CLIENT cannot switch by default. Only an OWNER of each destination/current company can explicitly grant the exception to that tenant membership.
- Even with switching rights, a user sees only the resources permitted by their role in the selected company. CLIENT remains client-portal scoped, never internal access.
- Only owners can grant or revoke an exception. No global view of tenants, no cross-tenant reads, no universal OWNER.
- Switching must be validated by API and create a correctly scoped session; old JWT session revoked. Client UI must reload to clear tenant-local state.

Implementation:
- Existing TenantMembership and MembershipPermission models; exception: action=switch, resource=tenant, granted true/false; no migration.
- Auth routes: GET /auth/companies (authorized tenant list), POST /auth/companies/switch (rotate session), GET /auth/company-members (OWNER only), PATCH /auth/company-members/:userId/switch (OWNER only).
- Owner management page /dashboard/admin/company-access.
- Navbar only displays switcher if server responds with multiple permitted companies. Current company name shown to any authenticated member.
- Validations: active user, active source+target memberships, active companies, source+target switching capability, source role match, revocation of source token after switch. Login tenantSlug may not bypass switch permissions.
- Tests: local isolated PostgreSQL + Nest HTTP apps/api/test/company-access-isolation.test.mjs, active in GitHub CI integration suite; no live production access.

Deployment instructions:
- Feature branch: feat/company-switch-permissions.
- This is separate from R01. DO NOT merge, migrate, deploy or grant real users permissions without owner review.
- Still open outside this task: broader permission/audit hardening, all modules' cross-tenant consistency, other MAOS vision features (custom Kanban, finance, AI, SaaS).
