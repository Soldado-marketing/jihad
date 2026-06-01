import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';

@Module({
  exports: [MembershipsService],
  providers: [MembershipsService],
})
export class MembershipsModule {}
