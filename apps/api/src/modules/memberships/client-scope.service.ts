/**
 * Gate 3 - the one place a caller's client scope is decided.
 *
 * Client identity is read from the database membership, never from the request.
 * Not from a query parameter, not from a body field, not from x-tenant-id or
 * x-actor-role, and not from a clientScopeKey the caller supplied: those are all
 * attacker-controlled. The only inputs are the tenant and user the JWT was
 * verified into, and the answer comes from TenantMembership.
 *
 * The return value is deliberately a small union:
 *
 *   null   - apply no client filter. OWNER and MANAGER already read everything
 *            through the internal API, so scoping their portal reads would add
 *            no protection and would break owner-side preview.
 *   string - filter every client-facing query to exactly this key.
 *
 * A CLIENT never receives null. A CLIENT whose membership is inactive, whose
 * role has changed under the token, or whose clientScopeKey is unset is refused
 * outright, because the alternative - letting the filter fall away - is exactly
 * the tenant-wide read this gate exists to close.
 */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from '../../common/identity/membership-role';
import { PrismaService } from '../prisma/prisma.service';

/** null means "apply no client filter"; a string is the key to filter on. */
export type ClientScope = string | null;

/** Internal roles whose internal view is already tenant-wide; they may preview the portal. */
const PORTAL_PREVIEW_ROLES: ReadonlySet<string> = new Set<string>([MembershipRole.OWNER, MembershipRole.MANAGER]);

const deny = (reason: string): never => {
  throw new ForbiddenException({ code: 'FORBIDDEN', reason });
};

@Injectable()
export class ClientScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(tenantId: string, userId: string, role: string): Promise<ClientScope> {
    if (role !== MembershipRole.CLIENT) {
      // OWNER and MANAGER read the whole company through the internal routes,
      // so a tenant-wide portal preview gives them nothing new. EMPLOYEE and
      // CONTRACTOR are work-scoped there (assigned tasks, member projects); the
      // portal routes carry no such filter, so for them "no client filter"
      // would widen what they see (A09 finding, 2026-11-04). Refuse instead.
      if (PORTAL_PREVIEW_ROLES.has(role)) return null;
      return deny('portal_requires_client_scope');
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true, status: true, clientScopeKey: true },
    });

    // The JWT role is only a hint; the membership is re-read so a role or status
    // that changed after the token was issued cannot widen what the caller sees.
    if (!membership || membership.status !== 'ACTIVE') {
      return deny('membership_not_active');
    }
    if (membership.role !== MembershipRole.CLIENT) {
      // The token says CLIENT, the membership no longer does. Treating that as
      // "no filter" would hand a stale token more than it ever had.
      return deny('role_changed_reauthenticate');
    }

    const key = membership.clientScopeKey?.trim();
    if (!key) return deny('client_scope_missing');

    return key;
  }
}
