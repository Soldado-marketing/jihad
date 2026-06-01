import { Injectable } from '@nestjs/common';
import { TenantContext } from '../../common/tenant/tenant-context';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  getCurrentTenant(context: TenantContext) {
    return this.tenantsRepository.findCurrentTenant(context);
  }
}
