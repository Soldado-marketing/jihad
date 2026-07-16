import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  imports: [PermissionsModule],
  providers: [ReportsRepository, ReportsService],
})
export class ReportsModule {}