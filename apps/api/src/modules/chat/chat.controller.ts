import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ChatService } from './chat.service';
import { CreateChatChannelDto } from './dto/create-chat-channel.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@Controller('chat')
@UseGuards(PermissionGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('channels')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL })
  listChannels(@Headers() headers: RequestHeaders) {
    return this.chatService.listChannels(tenantContextFromHeaders(headers));
  }

  @Post('channels')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CHAT_CHANNEL })
  createChannel(@Headers() headers: RequestHeaders, @Body() dto: CreateChatChannelDto) {
    return this.chatService.createChannel(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get('channels/:id/messages')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_MESSAGE })
  listMessages(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.chatService.listMessages(tenantContextFromHeaders(headers), id);
  }

  @Post('channels/:id/messages')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CHAT_MESSAGE })
  createMessage(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: CreateChatMessageDto,
  ) {
    return this.chatService.createMessage(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
