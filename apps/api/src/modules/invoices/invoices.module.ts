import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [InvoicesController],
  imports: [PermissionsModule],
  providers: [InvoicesRepository, InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
