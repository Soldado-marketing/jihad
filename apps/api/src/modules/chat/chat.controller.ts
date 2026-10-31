import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ChatService } from './chat.service';
import { CreateChatChannelDto } from './dto/create-chat-channel.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { AddChatMemberDto } from './dto/add-chat-member.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get('channels')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL })
  listChannels(@CurrentUser() user: JwtPayload) { return this.svc.listChannels(user.tenantId, user.sub); }

  @Post('channels')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CHAT_CHANNEL })
  createChannel(@CurrentUser() user: JwtPayload, @Body() dto: CreateChatChannelDto) {
    return this.svc.createChannel(user.tenantId, user.sub, dto.name, dto.type);
  }

  @Get('channels/:channelId/messages')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_MESSAGE })
  listMessages(@CurrentUser() user: JwtPayload, @Param('channelId') channelId: string) {
    return this.svc.listMessages(user.tenantId, user.sub, channelId);
  }

  @Post('channels/:channelId/messages')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CHAT_MESSAGE })
  createMessage(@CurrentUser() user: JwtPayload, @Param('channelId') channelId: string, @Body() dto: CreateChatMessageDto) {
    return this.svc.createMessage(user.tenantId, channelId, user.sub, dto.body);
  }

  @Get('channels/:channelId/members')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL })
  listMembers(@CurrentUser() user: JwtPayload, @Param('channelId') channelId: string) {
    return this.svc.listMembers(user.tenantId, user.sub, channelId);
  }

  @Post('channels/:channelId/members')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.CHAT_CHANNEL })
  addMember(@CurrentUser() user: JwtPayload, @Param('channelId') channelId: string, @Body() dto: AddChatMemberDto) {
    return this.svc.addMember(user.tenantId, user.sub, user.sessionId, channelId, dto.userId);
  }

  @Delete('channels/:channelId/members/:userId')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.CHAT_CHANNEL })
  removeMember(@CurrentUser() user: JwtPayload, @Param('channelId') channelId: string, @Param('userId') userId: string) {
    return this.svc.removeMember(user.tenantId, user.sub, user.sessionId, channelId, userId);
  }
}
