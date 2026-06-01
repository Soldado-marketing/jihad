import { Injectable } from '@nestjs/common';

@Injectable()
export class DevicesService {
  listOwnDevicesPlaceholder() {
    return {
      scope: 'own-devices-only',
      status: 'devices-placeholder',
    };
  }
}
