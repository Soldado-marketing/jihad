import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientProgressService } from './client-progress.service';

@Module({
  imports: [MembershipsModule, PermissionsModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService, ClientProgressService],
})
export class ClientPortalModule {}
