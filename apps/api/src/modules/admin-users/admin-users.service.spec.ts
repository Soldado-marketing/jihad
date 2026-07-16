import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { ApproveRequestDto, ApprovalRole, ApprovalVisibilityScope } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';

const OWNER_MEMBERSHIP = { role: 'OWNER', status: 'ACTIVE' };
const NON_OWNER_MEMBERSHIP = { role: 'MANAGER', status: 'ACTIVE' };

const PENDING_REQUEST = {
  id: 'rr1',
  userId: 'u1',
  tenantId: 't1',
  fullName: 'Jane',
  status: 'PENDING',
  user: { id: 'u1', email: 'jane@acme.com' },
};

const mockPrisma: any = {
  tenantMembership: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  registrationRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  membershipPermission: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      user: { update: jest.fn() },
      tenantMembership: { create: jest.fn().mockResolvedValue({ id: 'm1' }) },
      membershipPermission: { createMany: jest.fn() },
      registrationRequest: { update: jest.fn() },
    })
  ),
};

const mockAudit = {
  createAuditEvent: jest.fn().mockResolvedValue({}),
};

const mockMail = {
  notifyOwnerNewRequest: jest.fn(),
  sendApprovalEmail: jest.fn(),
  sendRejectionEmail: jest.fn(),
};

describe('AdminUsersService', () => {
  let service: AdminUsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();
    service = module.get<AdminUsersService>(AdminUsersService);
  });

  // ── requireOwner guard ────────────────────────────────────────────────────

  describe('Owner-only guard', () => {
    it('allows Owner to list pending requests', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(OWNER_MEMBERSHIP);
      mockPrisma.registrationRequest.findMany.mockResolvedValue([]);
      await expect(service.getPendingRequests('actor', 't1')).resolves.toEqual([]);
    });

    it('throws ForbiddenException for non-Owner caller', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(NON_OWNER_MEMBERSHIP);
      await expect(service.getPendingRequests('actor', 't1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when no membership found', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(null);
      await expect(service.getPendingRequests('actor', 't1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── approveRequest() ──────────────────────────────────────────────────────

  describe('approveRequest()', () => {
    const dto: ApproveRequestDto = {
      role: ApprovalRole.EMPLOYEE,
      visibilityScope: ApprovalVisibilityScope.ASSIGNED_ITEMS_ONLY,
    };

    it('approves request, creates membership, writes 4 audit events', async () => {
      mockPrisma.tenantMembership.findUnique
        .mockResolvedValueOnce(OWNER_MEMBERSHIP) // requireOwner
        .mockResolvedValueOnce({ role: 'OWNER' }); // actorRole lookup
      mockPrisma.registrationRequest.findUnique.mockResolvedValue(PENDING_REQUEST);

      await service.approveRequest('rr1', dto, 'actor', 't1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockAudit.createAuditEvent).toHaveBeenCalledTimes(4);
    });

    it('throws NotFoundException when request does not exist', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(OWNER_MEMBERSHIP);
      mockPrisma.registrationRequest.findUnique.mockResolvedValue(null);
      await expect(service.approveRequest('bad-id', dto, 'actor', 't1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when request is not PENDING', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(OWNER_MEMBERSHIP);
      mockPrisma.registrationRequest.findUnique.mockResolvedValue({ ...PENDING_REQUEST, status: 'APPROVED' });
      await expect(service.approveRequest('rr1', dto, 'actor', 't1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── rejectRequest() ───────────────────────────────────────────────────────

  describe('rejectRequest()', () => {
    const dto: RejectRequestDto = { rejectionReason: 'Not eligible at this time.' };

    it('rejects request and writes 1 audit event', async () => {
      mockPrisma.tenantMembership.findUnique
        .mockResolvedValueOnce(OWNER_MEMBERSHIP)
        .mockResolvedValueOnce({ role: 'OWNER' });
      mockPrisma.registrationRequest.findUnique.mockResolvedValue(PENDING_REQUEST);

      await service.rejectRequest('rr1', dto, 'actor', 't1');

      expect(mockAudit.createAuditEvent).toHaveBeenCalledTimes(1);
      expect(mockAudit.createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'registration.rejected' }),
      );
    });
  });

  // ── suspendUser() ─────────────────────────────────────────────────────────

  describe('suspendUser()', () => {
    it('suspends user and writes audit event', async () => {
      mockPrisma.tenantMembership.findUnique
        .mockResolvedValueOnce(OWNER_MEMBERSHIP)   // requireOwner
        .mockResolvedValueOnce({ role: 'EMPLOYEE' }) // target membership
        .mockResolvedValueOnce({ role: 'OWNER' });  // actorRole
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', status: 'APPROVED' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.suspendUser('u2', 'actor', 't1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SUSPENDED' } }),
      );
      expect(mockAudit.createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.suspended' }),
      );
    });

    it('throws ForbiddenException when trying to suspend another Owner', async () => {
      mockPrisma.tenantMembership.findUnique
        .mockResolvedValueOnce(OWNER_MEMBERSHIP)  // requireOwner
        .mockResolvedValueOnce({ role: 'OWNER' }); // target is also Owner
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', status: 'APPROVED' });

      await expect(service.suspendUser('u2', 'actor', 't1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── reactivateUser() ─────────────────────────────────────────────────────

  describe('reactivateUser()', () => {
    it('reactivates user to APPROVED and writes audit event', async () => {
      mockPrisma.tenantMembership.findUnique
        .mockResolvedValueOnce(OWNER_MEMBERSHIP)
        .mockResolvedValueOnce({ id: 'm1' })      // target membership
        .mockResolvedValueOnce({ role: 'OWNER' }); // actorRole
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', status: 'SUSPENDED' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.reactivateUser('u2', 'actor', 't1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'APPROVED' } }),
      );
      expect(mockAudit.createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.reactivated' }),
      );
    });
  });
});
