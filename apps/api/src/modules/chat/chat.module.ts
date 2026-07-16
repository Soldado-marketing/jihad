import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ChatController } from './chat.controller';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  imports: [PermissionsModule],
  providers: [ChatRepository, ChatService],
})
export class ChatModule {}