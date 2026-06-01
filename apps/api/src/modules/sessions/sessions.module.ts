import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController],
  exports: [SessionsService],
  providers: [SessionsService],
})
export class SessionsModule {}
