import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientInvoicesController } from './client-invoices.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

@Module({
  // ClientInvoicesController was previously written but never registered, so
  // the /api/client/invoices routes did not exist at runtime.
  controllers: [InvoicesController, ClientInvoicesController],
  imports: [AuditModule, PermissionsModule],
  providers: [InvoicePdfService, InvoicesRepository, InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
