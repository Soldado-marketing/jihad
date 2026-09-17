import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DevicesService } from './devices.service';

/**
 * Authorisation boundary: SELF.
 *
 * The route returns the caller's own devices, so authentication is the gate.
 */
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  listOwnDevices() {
    return this.devicesService.listOwnDevicesPlaceholder();
  }
}
