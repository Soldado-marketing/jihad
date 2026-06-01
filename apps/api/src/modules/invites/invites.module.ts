import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  controllers: [InvitesController],
  exports: [InvitesService],
  providers: [InvitesService],
})
export class InvitesModule {}
