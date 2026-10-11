import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ChatService } from './chat.service';
import { CreateChatChannelDto } from './dto/create-chat-channel.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get('channels')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL })
  listChannels(@CurrentUser() user: JwtPayload) { return this.svc.listChannels(user.tenantId); }

  @Post('channels')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CHAT_CHANNEL })
  createChannel(@CurrentUser() user: JwtPayload, @Body() dto: CreateChatChannelDto) {
    return this.svc.createChannel(user.tenantId, user.sub, dto.name, dto.type);
  }

  @Get('channels/:channelId/messages')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_MESSAGE })
  listMessages(@CurrentUser() user: JwtPayload, @Param('channelId') channelId: string) {
    return this.svc.listMessages(user.tenantId, channelId);
  }

  @Post('channels/:channelId/messages')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CHAT_MESSAGE })
  createMessage(@CurrentUser() user: JwtPayload, @Param('channelId') channelId: string, @Body() dto: CreateChatMessageDto) {
    return this.svc.createMessage(user.tenantId, channelId, user.sub, dto.body);
  }
}