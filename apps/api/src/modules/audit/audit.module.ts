import { Module } from '@nestjs/common';
import { AuditRedactor } from './audit-redactor';
import { AuditService } from './audit.service';

@Module({
  exports: [AuditService, AuditRedactor],
  providers: [AuditService, AuditRedactor],
})
export class AuditModule {}
