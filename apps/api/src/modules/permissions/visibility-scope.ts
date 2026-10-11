import { VisibilityScope } from '@prisma/client';

/**
 * The visibility scope a membership actually has (MAOS-T36).
 *
 * No query filters on TenantMembership.visibilityScope: internal roles see by
 * role across the tenant, and a CLIENT is isolated by its clientScopeKey. The
 * stored value must therefore describe that reality, never a narrower scope
 * the backend does not enforce. Derived from the role, not chosen by the caller.
 */
export function effectiveVisibilityScope(role: string): VisibilityScope {
  return role === 'CLIENT' ? VisibilityScope.CLIENT_LEVEL : VisibilityScope.TENANT_WIDE;
}
