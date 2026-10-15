import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CustomerOverviewService } from './customer-overview.service';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CUSTOMER_STATUSES, UpdateCustomerDto } from './dto/update-customer.dto';

/**
 * PERMISSION_CONTROLLED (resource CUSTOMER): OWNER and MANAGER write, EMPLOYEE
 * reads, CONTRACTOR and CLIENT have no default access. No delete route:
 * customers are archived, never removed.
 */
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly overviews: CustomerOverviewService,
  ) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CUSTOMER })
  list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    if (status !== undefined && !(CUSTOMER_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS' });
    }
    return this.customers.list(user.tenantId, status);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CUSTOMER })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customers.get(user.tenantId, id);
  }

  /**
   * Customer 360 (MAOS-T54): sections are filtered by the caller's own
   * permissions and work scope; money only for the OWNER.
   */
  @Get(':id/overview')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CUSTOMER })
  overview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.overviews.overview({ sub: user.sub, tenantId: user.tenantId, role: user.role }, id);
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CUSTOMER })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user.tenantId, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.CUSTOMER })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(user.tenantId, user.sub, id, dto);
  }
}
