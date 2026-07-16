import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditRedactor } from './audit-redactor';
import { AuditService } from './audit.service';

@Module({
  imports: [PrismaModule],
  exports: [AuditService, AuditRedactor],
  providers: [AuditService, AuditRedactor],
})
export class AuditModule {}
