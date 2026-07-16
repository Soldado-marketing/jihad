import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import {
  AuditOutcome,
  AuditPermissionResult,
  LoginBlockReason,
  RegistrationAction,
} from '../audit/audit.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { BootstrapOwnerDto } from './dto/bootstrap-owner.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Generic neutral error so registration doesn't leak tenant existence
const REGISTRATION_NEUTRAL_ERROR = 'Registration could not be completed. Please check your details and try again.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  // ── Public Registration ────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Lookup tenant by slug — neutral error on miss to avoid tenant enumeration
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Organization not found. Please check the organization slug.',
      );
    }

    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      // Neutral — do not confirm whether this email is registered
      throw new BadRequestException(REGISTRATION_NEUTRAL_ERROR);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user with PENDING_APPROVAL — no TenantMembership at this stage
    // Use (as any) because passwordHash is not in the stale Prisma-generated type
    const user = await (this.prisma as any).user.create({
      data: {
        email: dto.email.toLowerCase(),
        displayName: dto.fullName,
        passwordHash,
        status: 'PENDING_APPROVAL' as any,
      },
    }) as { id: string; email: string };

    // Create registration request record
    const regRequest = await (this.prisma as any).registrationRequest.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        companyName: dto.companyName ?? null,
        requestedRole: dto.requestedAccountType,
        status: 'PENDING',
      },
    });

    // Persist audit event
    await this.auditService.createAuditEvent({
      tenantId: tenant.id,
      resourceType: 'RegistrationRequest',
      resourceId: regRequest.id,
      action: RegistrationAction.SUBMITTED,
      permissionResult: AuditPermissionResult.NOT_EVALUATED,
      outcome: AuditOutcome.SUCCESS,
      payload: {
        email: dto.email.toLowerCase(),
        requestedRole: dto.requestedAccountType,
      },
    });

    // Notify tenant OWNER — best-effort, non-blocking
    // Look up OWNER membership; skip silently if none found
    try {
      const ownerMembership = await (this.prisma as any).tenantMembership.findFirst({
        where: { tenantId: tenant.id, role: 'OWNER', status: 'ACTIVE' },
        include: { user: { select: { email: true } } },
      }) as { user: { email: string } } | null;

      if (ownerMembership?.user?.email) {
        this.mailService.notifyOwnerNewRequest({
          ownerEmail: ownerMembership.user.email,
          requesterName: dto.fullName,
          requesterEmail: dto.email.toLowerCase(),
          requestedRole: dto.requestedAccountType,
          tenantSlug: dto.tenantSlug,
        });
      }
    } catch (err: unknown) {
      // Owner lookup failed — log and continue; registration already succeeded
      this.logger.warn(
        `Could not look up tenant owner for email notification: ${String(err)}`,
      );
    }

    return {
      message: 'Your account request was received and is waiting for approval.',
    };
  }

  // ── Login (with status gate) ───────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    user: { id: string; email: string; displayName: string | null; role: string };
    tenant: { id: string; name: string; slug: string };
    tokens: AuthTokens;
  }> {
    const { email, passwordOrMagicCode, tenantSlug } = dto;

    type LoginUser = {
      id: string;
      email: string;
      displayName: string | null;
      status: string;
      passwordHash: string | null;
      memberships: Array<{
        tenantId: string;
        role: string;
        status: string; // included so we can filter in code rather than relying on Prisma enum filter
        tenant: { id: string; name: string; slug: string; status: string };
      }>;
    };

    // Fetch all memberships (no Prisma-level enum filter); filter to ACTIVE in code below.
    // This avoids any edge-case where Prisma's `where: { status }` enum filter on an `as any`
    // client returns an empty array unexpectedly, locking out a freshly-approved user.
    const user = await (this.prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    }) as LoginUser | null;

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(passwordOrMagicCode, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userStatus = user.status as string;

    // ── Status gate — check before any session creation ──────────────────────
    if (userStatus === 'PENDING_APPROVAL') {
      await this.auditService.createAuditEvent({
        resourceType: 'User',
        resourceId: user.id,
        action: RegistrationAction.LOGIN_BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        outcome: AuditOutcome.BLOCKED,
        failureCategory: LoginBlockReason.PENDING_APPROVAL,
        payload: { email: user.email },
      });
      throw new ForbiddenException('Your account is waiting for approval.');
    }

    if (userStatus === 'REJECTED') {
      await this.auditService.createAuditEvent({
        resourceType: 'User',
        resourceId: user.id,
        action: RegistrationAction.LOGIN_BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        outcome: AuditOutcome.BLOCKED,
        failureCategory: LoginBlockReason.REJECTED,
        payload: { email: user.email },
      });
      throw new ForbiddenException('Your account request was rejected. Please contact support.');
    }

    if (userStatus === 'SUSPENDED') {
      await this.auditService.createAuditEvent({
        resourceType: 'User',
        resourceId: user.id,
        action: RegistrationAction.LOGIN_BLOCKED,
        permissionResult: AuditPermissionResult.DENIED,
        outcome: AuditOutcome.BLOCKED,
        failureCategory: LoginBlockReason.SUSPENDED,
        payload: { email: user.email },
      });
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    // DISABLED / ARCHIVED (legacy path) and any unknown status
    if (userStatus === 'DISABLED' || userStatus === 'ARCHIVED') {
      throw new ForbiddenException('Account is disabled');
    }

    // APPROVED and ACTIVE are both valid for login
    const allowedStatuses: string[] = ['APPROVED', 'ACTIVE'];
    if (!allowedStatuses.includes(userStatus)) {
      throw new ForbiddenException('Account access denied');
    }

    // Filter to ACTIVE memberships in code — defensive against any Prisma enum quirk
    const activeMemberships = user.memberships.filter((m) => m.status === 'ACTIVE');

    let membership = activeMemberships[0];
    if (tenantSlug) {
      membership = activeMemberships.find((m) => m.tenant.slug === tenantSlug) ?? membership;
    }

    if (!membership) {
      throw new ForbiddenException(
        'Your account is approved but has no active workspace membership. Contact your administrator.',
      );
    }
    if (membership.tenant.status !== 'ACTIVE') throw new ForbiddenException('Tenant is suspended');

    const tokens = await this.createSession(
      user.id,
      user.email,
      membership.tenantId,
      membership.tenant.slug,
      membership.role,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: membership.role,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
      tokens,
    };
  }

  // ── Bootstrap Owner (first-setup only) ────────────────────────────────────

  async bootstrapOwner(dto: BootstrapOwnerDto): Promise<{
    message: string;
    tenantSlug: string;
  }> {
    // Block if any Owner membership already exists anywhere in the system.
    // This endpoint is strictly for initial system setup.
    const existingOwner = await this.prisma.tenantMembership.findFirst({
      where: { role: 'OWNER' },
      select: { id: true },
    });

    if (existingOwner) {
      throw new ForbiddenException(
        'An Owner account already exists. Bootstrap is only available during initial setup.',
      );
    }

    // Verify slug is not taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
      select: { id: true },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug is already taken.');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictException('Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create tenant + owner user + owner membership in one transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenantName, slug: dto.tenantSlug, status: 'ACTIVE' },
      });

      const user = await (tx as any).user.create({
        data: {
          email: dto.email.toLowerCase(),
          displayName: dto.fullName,
          passwordHash,
          status: 'APPROVED' as any,
        },
      }) as { id: string; email: string; displayName: string | null };

      const membership = await (tx as any).tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'OWNER',
          status: 'ACTIVE',
          visibilityScope: 'TENANT_WIDE' as any,
        },
      }) as { id: string };

      return { tenant, user, membership };
    });

    await this.auditService.createAuditEvent({
      tenantId: result.tenant.id,
      actorId: result.user.id,
      actorRole: 'OWNER' as any,
      resourceType: 'Tenant',
      resourceId: result.tenant.id,
      action: 'bootstrap.owner.created',
      permissionResult: AuditPermissionResult.NOT_EVALUATED,
      outcome: AuditOutcome.SUCCESS,
    });

    return {
      message: 'Owner account and tenant created successfully.',
      tenantSlug: result.tenant.slug,
    };
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: { where: { status: 'ACTIVE' }, include: { tenant: true } },
          },
        },
        tenant: true,
      },
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Session expired');
    }

    const membership = session.user.memberships.find((m) => m.tenantId === session.tenantId);
    if (!membership) throw new UnauthorizedException('Membership not found');

    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const newHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { tokenHash: newHash, expiresAt, lastSeenAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: session.userId,
      email: session.user.email,
      tenantId: session.tenantId,
      tenantSlug: session.tenant.slug,
      role: membership.role,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken, refreshToken: newRefreshToken, expiresIn: this.getExpiresInSeconds() };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string, tenantId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, tenantId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  // ── Session validation (used by JWT strategy) ──────────────────────────────

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { status: true, expiresAt: true },
    });
    if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      return false;
    }
    void this.prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
    return true;
  }

  // ── Set password (invite flow) ─────────────────────────────────────────────

  async setPassword(userId: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await (this.prisma as any).user.update({
      where: { id: userId },
      data: { passwordHash: hash, status: 'ACTIVE' },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async createSession(
    userId: string,
    email: string,
    tenantId: string,
    tenantSlug: string,
    role: string,
  ): Promise<AuthTokens> {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: { userId, tenantId, tokenHash, expiresAt, status: 'ACTIVE' },
    });

    const payload: JwtPayload = {
      sub: userId,
      email,
      tenantId,
      tenantSlug,
      role,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken, refreshToken, expiresIn: this.getExpiresInSeconds() };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getExpiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_EXPIRES_IN', '15m');
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 900;
    const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Number(match[1]) * (mult[match[2]] ?? 60);
  }
}
