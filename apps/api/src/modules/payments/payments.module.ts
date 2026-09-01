import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientPaymentsController } from './client-payments.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  // ClientPaymentsController was previously written but never registered, so
  // the /api/client/payments route did not exist at runtime.
  controllers: [PaymentsController, ClientPaymentsController],
  imports: [InvoicesModule, PermissionsModule],
  providers: [PaymentsRepository, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
