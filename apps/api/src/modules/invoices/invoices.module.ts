import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FinanceModule } from '../finance/finance.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientInvoicesController } from './client-invoices.controller';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [InvoicesController, ClientInvoicesController],
  imports: [AuditModule, FinanceModule, PermissionsModule],
  providers: [InvoicesRepository, InvoicesService],
  exports: [InvoicesRepository, InvoicesService],
})
export class InvoicesModule {}
