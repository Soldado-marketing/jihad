import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { LeadsController } from './leads.controller';
import { LeadsRepository } from './leads.repository';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  imports: [PermissionsModule],
  providers: [LeadsRepository, LeadsService],
})
export class LeadsModule {}
