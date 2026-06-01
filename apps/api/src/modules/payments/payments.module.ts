import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinanceModule } from '../finance/finance.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientPaymentsController } from './client-payments.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, ClientPaymentsController],
  imports: [AuditModule, FinanceModule, PermissionsModule],
  providers: [PaymentsRepository, PaymentsService],
})
export class PaymentsModule {}
