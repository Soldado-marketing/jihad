import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/tenant/tenant-context';

type HeaderValue = string | string[] | undefined;

@Injectable()
export class TenantContextService {
  resolveFromHeaders(headers: Record<string, HeaderValue>): TenantContext | null {
    const tenantId = this.first(headers['x-tenant-id']);
    const actorId = this.first(headers['x-actor-id']);
    const membershipId = this.first(headers['x-membership-id']);

    if (!tenantId) {
      return null;
    }

    return {
      actorId,
      membershipId,
      source: 'request-header',
      tenantId,
    };
  }

  requireTenantContext(context: TenantContext | null): TenantContext {
    if (!context?.tenantId) {
      throw new BadRequestException('Tenant context is required.');
    }

    return context;
  }

  private first(value: HeaderValue): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
