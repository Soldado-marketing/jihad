import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CollaborationController } from './collaboration.controller';
import { CollaborationRepository } from './collaboration.repository';
import { CollaborationService } from './collaboration.service';

@Module({
  controllers: [CollaborationController],
  imports: [PermissionsModule, NotificationsModule],
  providers: [CollaborationRepository, CollaborationService],
})
export class CollaborationModule {}