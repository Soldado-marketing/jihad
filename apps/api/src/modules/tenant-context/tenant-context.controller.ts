import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { TenantContextService } from './tenant-context.service';

/**
 * Authorisation boundary: AUTHENTICATED (diagnostic only).
 *
 * This route reflects the caller's own request headers back at them. It decides
 * nothing: no other module resolves tenancy from headers - PermissionGuard and
 * every repository read tenantId from the verified JWT - so the echo cannot be
 * used to assume another tenant.
 *
 * It was still reachable without a session, which advertised a header-based
 * tenant model that no longer exists and invited exactly the wrong kind of
 * probing. Authentication closes that. The route is a Sprint 1A diagnostic and
 * is a candidate for removal once nothing depends on it.
 */
@Controller('tenant-context')
@UseGuards(JwtAuthGuard)
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
