import { Module } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';

@Module({
  exports: [TenantsService],
  providers: [TenantsRepository, TenantsService],
})
export class TenantsModule {}
