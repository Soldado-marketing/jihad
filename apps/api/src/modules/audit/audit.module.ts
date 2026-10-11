import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityController } from './activity.controller';
import { AuditLogController } from './audit-log.controller';
import { ActivityService } from './activity.service';
import { AuditRedactor } from './audit-redactor';
import { AuditService } from './audit.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ActivityController, AuditLogController],
  exports: [AuditService, AuditRedactor],
  providers: [AuditService, AuditRedactor, ActivityService],
})
export class AuditModule {}
