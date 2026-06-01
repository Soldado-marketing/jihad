import { TenantContext } from '../tenant/tenant-context';

export abstract class TenantAwareRepository {
  protected requireTenantContext(context: TenantContext | null | undefined): TenantContext {
    if (!context?.tenantId) {
      throw new Error('Tenant context is required for tenant-owned repository access.');
    }

    return context;
  }

  protected tenantWhere(context: TenantContext) {
    return { tenantId: context.tenantId };
  }
}
