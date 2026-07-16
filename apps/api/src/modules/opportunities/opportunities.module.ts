import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesRepository } from './opportunities.repository';
import { OpportunitiesService } from './opportunities.service';

@Module({
  controllers: [OpportunitiesController],
  imports: [PermissionsModule],
  providers: [OpportunitiesRepository, OpportunitiesService],
})
export class OpportunitiesModule {}
