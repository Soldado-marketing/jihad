import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../../common/repositories/tenant-aware.repository';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsRepository extends TenantAwareRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findCurrentTenant(context: TenantContext) {
    const tenantContext = this.requireTenantContext(context);

    return this.prisma.tenant.findUnique({
      where: { id: tenantContext.tenantId },
    });
  }
}
