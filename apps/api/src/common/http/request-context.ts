import { ActorContext } from '../auth/actor-context';
import { MembershipRole } from '../identity/membership-role';
import { TenantContext } from '../tenant/tenant-context';

type HeaderValue = string | string[] | undefined;
export type RequestHeaders = Record<string, HeaderValue>;

function first(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function tenantContextFromHeaders(headers: RequestHeaders): TenantContext {
  const tenantId = first(headers['x-tenant-id']);

  if (!tenantId) {
    throw new Error('Tenant context is required for tenant-scoped operations.');
  }

  return {
    actorId: first(headers['x-actor-id']),
    membershipId: first(headers['x-membership-id']),
    source: 'request-header',
    tenantId,
  };
}

export function actorContextFromHeaders(headers: RequestHeaders): ActorContext | undefined {
  const tenantId = first(headers['x-tenant-id']);
  const actorId = first(headers['x-actor-id']);
  const role = first(headers['x-actor-role']) as MembershipRole | undefined;

  if (!tenantId || !actorId || !role) {
    return undefined;
  }

  return {
    actorId,
    deviceId: first(headers['x-device-id']),
    membershipId: first(headers['x-membership-id']),
    role,
    sessionId: first(headers['x-session-id']),
    tenantId,
  };
}
