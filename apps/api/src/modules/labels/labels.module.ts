import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { LabelsController } from './labels.controller';
import { LabelsRepository } from './labels.repository';
import { LabelsService } from './labels.service';

@Module({
  imports: [PermissionsModule, AuditModule],
  controllers: [LabelsController],
  providers: [LabelsRepository, LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
