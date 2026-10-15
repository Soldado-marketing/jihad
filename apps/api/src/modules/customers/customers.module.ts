import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CustomerOverviewService } from './customer-overview.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerOverviewService],
})
export class CustomersModule {}
