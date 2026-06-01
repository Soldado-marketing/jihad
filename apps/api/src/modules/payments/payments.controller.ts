import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(PermissionGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PAYMENT, sensitive: true })
  listPayments(@Headers() headers: RequestHeaders) {
    return this.paymentsService.listPayments(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.PAYMENT, sensitive: true })
  createPayment(@Headers() headers: RequestHeaders, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }
}
