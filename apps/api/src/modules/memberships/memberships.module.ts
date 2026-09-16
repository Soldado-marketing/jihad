import { Module } from '@nestjs/common';
import { ClientScopeService } from './client-scope.service';
import { MembershipsService } from './memberships.service';

@Module({
  exports: [ClientScopeService, MembershipsService],
  providers: [ClientScopeService, MembershipsService],
})
export class MembershipsModule {}
