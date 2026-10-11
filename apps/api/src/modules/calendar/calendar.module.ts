import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [PermissionsModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
