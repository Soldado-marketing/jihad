import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, RequestedAccountType } from './dto/register.dto';
import { BootstrapOwnerDto } from './dto/bootstrap-owner.dto';
import { LoginDto } from './dto/login.dto';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tenantMembership: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  registrationRequest: {
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      tenant: { create: jest.fn().mockResolvedValue({ id: 't1', name: 'Acme', slug: 'acme', status: 'ACTIVE' }) },
      user: { create: jest.fn().mockResolvedValue({ id: 'u1', email: 'owner@acme.com', displayName: 'Owner' }) },
      tenantMembership: { create: jest.fn().mockResolvedValue({ id: 'm1', role: 'OWNER' }) },
    })
  ),
};

const mockAudit = {
  createAuditEvent: jest.fn().mockResolvedValue({}),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfig = {
  get: jest.fn((key: string, fallback: string) => fallback),
};

const mockMail = {
  notifyOwnerNewRequest: jest.fn(),
  sendApprovalEmail: jest.fn(),
  sendRejectionEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  // ── register() (invite-only policy) ──────────────────────────────────────
  describe('register()', () => {
    const dto: RegisterDto = {
      fullName: 'Jane Smith',
      email: 'jane@acme.com',
      password: 'password123',
      requestedAccountType: RequestedAccountType.TEAM_MEMBER,
      tenantSlug: 'acme',
    };

    it('always refuses public self-registration, without touching any database table', async () => {
      await expect(service.register(dto)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.tenant.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.registrationRequest.create).not.toHaveBeenCalled();
    });

    it('does not send account-approval or owner-notification mail', async () => {
      await expect(service.register(dto)).rejects.toThrow(ForbiddenException);
      expect(mockMail.notifyOwnerNewRequest).not.toHaveBeenCalled();
    });
  });

  // ── login() status gate ───────────────────────────────────────────────────

  describe('login() status gate', () => {
    const baseUser = {
      id: 'u1',
      email: 'jane@acme.com',
      passwordHash: '$2b$12$hashedpassword',
      displayName: 'Jane',
      memberships: [
        {
          tenantId: 't1',
          role: 'EMPLOYEE',
          status: 'ACTIVE',  // required — login filters by m.status === 'ACTIVE'
          tenant: { id: 't1', name: 'Acme', slug: 'acme', status: 'ACTIVE' },
        },
      ],
    };

    const dto: LoginDto = {
      email: 'jane@acme.com',
      passwordOrMagicCode: 'correctpassword',
    };

    async function loginWithStatus(status: string) {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correctpassword', 1);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash, status });
      return service.login(dto);
    }

    it('blocks login for PENDING_APPROVAL with friendly message', async () => {
      await expect(loginWithStatus('PENDING_APPROVAL')).rejects.toThrow(
        'Your account is waiting for approval.',
      );
      expect(mockAudit.createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ failureCategory: 'LOGIN_BLOCKED_PENDING_APPROVAL' }),
      );
    });

    it('blocks login for REJECTED with friendly message', async () => {
      await expect(loginWithStatus('REJECTED')).rejects.toThrow(
        'Your account request was rejected. Please contact support.',
      );
      expect(mockAudit.createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ failureCategory: 'LOGIN_BLOCKED_REJECTED' }),
      );
    });

    it('blocks login for SUSPENDED with friendly message', async () => {
      await expect(loginWithStatus('SUSPENDED')).rejects.toThrow(
        'Your account has been suspended. Please contact support.',
      );
      expect(mockAudit.createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ failureCategory: 'LOGIN_BLOCKED_SUSPENDED' }),
      );
    });

    it('allows login for APPROVED status', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correctpassword', 1);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash, status: 'APPROVED' });
      mockPrisma.session.create.mockResolvedValue({ id: 's1' });

      const result = await service.login(dto);
      expect(result.tokens.accessToken).toBe('mock.jwt.token');
    });

    it('allows login for ACTIVE status (backward compatibility)', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correctpassword', 1);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash, status: 'ACTIVE' });
      mockPrisma.session.create.mockResolvedValue({ id: 's1' });

      const result = await service.login(dto);
      expect(result.tokens.accessToken).toBe('mock.jwt.token');
    });
  });

  // ── bootstrapOwner() ──────────────────────────────────────────────────────

  describe('bootstrapOwner()', () => {
    const dto: BootstrapOwnerDto = {
      fullName: 'Owner',
      email: 'owner@acme.com',
      password: 'password123',
      tenantName: 'Acme',
      tenantSlug: 'acme',
    };

    it('creates tenant + owner when no owner exists', async () => {
      mockPrisma.tenantMembership.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.bootstrapOwner(dto);
      expect(result.message).toBe('Owner account and tenant created successfully.');
    });

    it('throws ForbiddenException when an Owner already exists', async () => {
      mockPrisma.tenantMembership.findFirst.mockResolvedValue({ id: 'existing-owner' });
      await expect(service.bootstrapOwner(dto)).rejects.toThrow(ForbiddenException);
    });
  });
});
