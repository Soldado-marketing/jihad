import {
  Body,
  BadRequestException,
  ForbiddenException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { BootstrapOwnerDto } from './dto/bootstrap-owner.dto';
import { EXPLICIT_GRANT_KEYS, type ExplicitGrant } from '../permissions/explicit-grants';
import { AuthService, JwtPayload } from './auth.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Owner policy (2026-10-27): MAOS is INVITE ONLY until SaaS onboarding
  // is designed separately. Reject ALL public registration requests before
  // body parsing or database access, even with a known tenant slug.
  // The existing /auth/invites/accept path remains available for valid tokens.
  @Post('register')
  @HttpCode(HttpStatus.FORBIDDEN)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register() {
    throw new ForbiddenException('Registration is invitation-only. Contact your workspace owner.');
  }

  // S-03: bootstrap is one-time setup — keep it tightly limited.
  @Post('bootstrap')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  bootstrapOwner(@Body() dto: BootstrapOwnerDto) {
    return this.authService.bootstrapOwner(dto);
  }

  // S-03: stricter limit on login to slow brute-force attempts.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  // S-03: refresh needs enough capacity for normal session renewal.
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logoutAll(@CurrentUser() user: JwtPayload) {
    return this.authService.logoutAll(user.sub, user.tenantId);
  }

  // Tenant lists and token rotations are server-authorized: UI visibility is
  // never an authorization boundary.
  @Get('companies')
  @UseGuards(JwtAuthGuard)
  companies(@CurrentUser() user: JwtPayload) {
    return this.authService.availableCompanies(user);
  }

  @Post('companies/switch')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  switchCompany(
    @CurrentUser() user: JwtPayload,
    @Body('tenantId') tenantId: string,
  ) {
    return this.authService.switchCompany(user, tenantId);
  }

  @Get('company-members')
  @UseGuards(JwtAuthGuard)
  companyMembers(@CurrentUser() user: JwtPayload) {
    return this.authService.companyMembers(user);
  }

  @Get('my-grants')
  @UseGuards(JwtAuthGuard)
  myGrants(@CurrentUser() user: JwtPayload) {
    return this.authService.myGrants(user);
  }

  @Patch('company-members/:userId/grants/:grant')
  @UseGuards(JwtAuthGuard)
  setMemberGrant(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Param('grant') grant: string,
    @Body() body: { enabled?: boolean },
  ) {
    if (!(EXPLICIT_GRANT_KEYS as string[]).includes(grant)) throw new BadRequestException('Unknown permission');
    if (typeof body?.enabled !== 'boolean') throw new BadRequestException('enabled must be a boolean');
    return this.authService.setMemberGrant(user, userId, grant as ExplicitGrant, body.enabled);
  }

  @Patch('company-members/:userId/switch')
  @UseGuards(JwtAuthGuard)
  setCompanySwitchPermission(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() body: { enabled?: boolean },
  ) {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean');
    }
    return this.authService.setCompanySwitchPermission(user, userId, body.enabled);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
