import { Module } from '@nestjs/common';
import { FollowUpsModule } from '../follow-ups/follow-ups.module';
import { LeadsModule } from '../leads/leads.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';

@Module({
  imports: [LeadsModule, OpportunitiesModule, MeetingsModule, FollowUpsModule],
})
export class CrmModule {}
