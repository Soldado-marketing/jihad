import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  controllers: [DevicesController],
  exports: [DevicesService],
  providers: [DevicesService],
})
export class DevicesModule {}
