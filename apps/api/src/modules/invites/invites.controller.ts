import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InvitesService } from './invites.service';

/** OWNER_ONLY (checked against the database membership in the service). */
@Controller('admin/invites')
@UseGuards(JwtAuthGuard)
export class InvitesAdminController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    return this.invites.create(user.sub, user.tenantId, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.invites.list(user.sub, user.tenantId);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invites.revoke(user.sub, user.tenantId, id);
  }
}

/** PUBLIC_BY_DESIGN: the token is the credential; both routes are throttled. */
@Controller('auth/invites')
export class InvitesPublicController {
  constructor(private readonly invites: InvitesService) {}

  @Get('preview')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  preview(@Query('token') token: string) {
    return this.invites.preview(token);
  }

  /** Existing accounts must authenticate with their original credentials first. */
  @Post('accept-existing')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  acceptExisting(@CurrentUser() user: JwtPayload, @Body() dto: { token?: string }) {
    return this.invites.acceptExisting(user.sub, dto?.token);
  }

  @Post('accept')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  accept(@Body() dto: AcceptInviteDto) {
    return this.invites.accept(dto);
  }
}
