import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}
