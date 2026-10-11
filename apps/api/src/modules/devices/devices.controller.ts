import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
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
  listOwnDevices(@CurrentUser() user: JwtPayload) {
    return this.devicesService.listOwn(user.tenantId, user.sub);
  }
}
