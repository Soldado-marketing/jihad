import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { FinanceController } from './finance.controller';
import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController],
  imports: [PermissionsModule],
  providers: [FinanceRepository, FinanceService],
  exports: [FinanceRepository, FinanceService],
})
export class FinanceModule {}