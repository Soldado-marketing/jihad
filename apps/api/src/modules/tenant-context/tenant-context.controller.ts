import { Controller, Get, Headers } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Controller('tenant-context')
export class TenantContextController {
  constructor(private readonly tenantContextService: TenantContextService) {}

  @Get()
  getTenantContext(@Headers() headers: Record<string, string | string[] | undefined>) {
    const context = this.tenantContextService.resolveFromHeaders(headers);

    return {
      context,
      requiredForProtectedOperations: true,
      status: context ? 'resolved' : 'missing',
    };
  }
}
