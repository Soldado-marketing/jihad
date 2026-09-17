import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';

@Module({
  imports: [MembershipsModule, PermissionsModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
})
export class ClientPortalModule {}
