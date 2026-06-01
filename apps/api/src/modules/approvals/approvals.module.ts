import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

@Module({
  controllers: [ApprovalsController],
  imports: [AuditModule, PermissionsModule],
  providers: [ApprovalsRepository, ApprovalsService],
})
export class ApprovalsModule {}
