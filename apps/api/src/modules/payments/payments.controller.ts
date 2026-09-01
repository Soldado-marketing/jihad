import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { InvoiceActor } from '../invoices/invoices.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

function toActor(user: JwtPayload): InvoiceActor {
  return {
    actorId: user.sub,
    role: user.role,
    sessionId: user.sessionId,
    tenantId: user.tenantId,
  };
}

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PAYMENT, sensitive: true })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.PAYMENT })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto) {
    return this.svc.create(toActor(user), dto);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PAYMENT, sensitive: true })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }
}
