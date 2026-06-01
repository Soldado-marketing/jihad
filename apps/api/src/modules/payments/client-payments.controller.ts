import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { PaymentsService } from './payments.service';

@Controller('client/payments')
@UseGuards(PermissionGuard)
export class ClientPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.PAYMENT,
    scope: 'client-portal',
  })
  listClientPayments(@Headers() headers: RequestHeaders) {
    return this.paymentsService.listClientPayments(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }
}
