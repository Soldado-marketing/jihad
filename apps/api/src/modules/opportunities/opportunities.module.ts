import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesRepository } from './opportunities.repository';
import { OpportunitiesService } from './opportunities.service';

@Module({
  controllers: [OpportunitiesController],
  imports: [AuditModule, PermissionsModule],
  providers: [OpportunitiesRepository, OpportunitiesService],
})
export class OpportunitiesModule {}
