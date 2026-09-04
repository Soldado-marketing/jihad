/**
 * Client-portal payment routes.
 *
 * Scoped to payments on client-visible, non-draft invoices. Reusing the
 * internal list here (as an earlier revision did) would have exposed every
 * payment in the tenant, including internal bookkeeping entries with no
 * invoice, to any CLIENT user.
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { PaymentsService } from './payments.service';

@Controller('client/payments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PAYMENT, scope: 'client-portal' })
  listClientPayments(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.listForClient(user.tenantId);
  }
}
