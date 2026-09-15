import { Body, Controller, Post } from '@nestjs/common';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InvitesService } from './invites.service';

/**
 * Authorisation boundary: PUBLIC, deliberately.
 *
 * Invite acceptance happens before the invitee has a session, so no guard can
 * apply. The invite token is the credential, and the global rate limiter is the
 * only other protection. When the placeholder is implemented, the token must be
 * verified server-side and the response must not reveal whether an email is
 * already registered.
 */
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('accept')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.invitesService.acceptInvitePlaceholder(dto);
  }
}
