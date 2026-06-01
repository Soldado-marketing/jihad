import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';

@Module({
  controllers: [ClientPortalController],
  imports: [AuditModule, PermissionsModule],
  providers: [ClientPortalService],
})
export class ClientPortalModule {}
