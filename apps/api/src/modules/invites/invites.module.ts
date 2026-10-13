import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { InvitesAdminController, InvitesPublicController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [AuditModule, MailModule],
  controllers: [InvitesAdminController, InvitesPublicController],
  providers: [InvitesService],
})
export class InvitesModule {}
