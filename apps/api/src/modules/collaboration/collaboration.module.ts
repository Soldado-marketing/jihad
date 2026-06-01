import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CollaborationController } from './collaboration.controller';
import { CollaborationRepository } from './collaboration.repository';
import { CollaborationService } from './collaboration.service';

@Module({
  controllers: [CollaborationController],
  imports: [AuditModule, PermissionsModule],
  providers: [CollaborationRepository, CollaborationService],
})
export class CollaborationModule {}
