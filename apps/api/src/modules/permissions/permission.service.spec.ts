import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PermissionAction,
  PermissionRequirement,
  PermissionResource,
  VisibilityScope,
} from './permission.types';

const mockPrisma = {
  tenantMembership: {
    findUnique: jest.fn(),
  },
};

const READ_PROJECT: PermissionRequirement = {
  action: PermissionAction.READ,
  resource: PermissionResource.PROJECT,
};

const OWNER_MEMBERSHIP = {
  id: 'm1',
  role: 'OWNER',
  status: 'ACTIVE',
  visibilityScope: 'TENANT_WIDE',
  permissions: [],
};

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PermissionService>(PermissionService);
  });

  it('allows OWNER regardless of requirement', async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue(OWNER_MEMBERSHIP);
    const result = await service.decide(READ_PROJECT, 'u1', 't1', 'OWNER');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('owner_baseline_allow');
  });

  it('returns TENANT_WIDE scope for Owner', async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue(OWNER_MEMBERSHIP);
    const result = await service.decide(READ_PROJECT, 'u1', 't1', 'OWNER');
    expect(result.visibilityScope).toBe(VisibilityScope.TENANT_WIDE);
  });

  it('denies when requirement is missing', async () => {
    const result = await service.decide(undefined, 'u1', 't1', 'EMPLOYEE');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('permission_requirement_missing');
  });

  it('denies when tenantId is missing', async () => {
    const result = await service.decide(READ_PROJECT, 'u1', undefined, 'EMPLOYEE');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('tenant_context_missing');
  });

  it('denies when userId is missing', async () => {
    const result = await service.decide(READ_PROJECT, undefined, 't1', 'EMPLOYEE');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('actor_context_missing');
  });

  it('allows non-Owner with matching custom permission grant', async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue({
      id: 'm1',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      visibilityScope: 'PROJECT_LEVEL',
      permissions: [{ granted: true }],
    });
    const result = await service.decide(READ_PROJECT, 'u1', 't1', 'EMPLOYEE');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('custom_permission_grant');
    expect(result.visibilityScope).toBe(VisibilityScope.PROJECT_LEVEL);
  });

  it('denies non-Owner with explicit deny custom permission', async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue({
      id: 'm1',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      visibilityScope: 'ASSIGNED_ITEMS_ONLY',
      permissions: [{ granted: false }],
    });
    const result = await service.decide(READ_PROJECT, 'u1', 't1', 'EMPLOYEE');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('custom_permission_deny');
  });

  it('denies non-Owner with no custom grant and no role default', async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue({
      id: 'm1',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      visibilityScope: 'ASSIGNED_ITEMS_ONLY',
      permissions: [],
    });
    const result = await service.decide(READ_PROJECT, 'u1', 't1', 'EMPLOYEE');
    expect(result.allowed).toBe(false);
  });

  it('denies when JWT claims OWNER but DB role is EMPLOYEE', async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue({
      ...OWNER_MEMBERSHIP,
      role: 'EMPLOYEE',
    });
    const result = await service.decide(READ_PROJECT, 'u1', 't1', 'OWNER');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('owner_claim_not_verified');
  });

  it('denies when membership is inactive', async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue({
      id: 'm1',
      role: 'EMPLOYEE',
      status: 'SUSPENDED',
      visibilityScope: 'TENANT_WIDE',
      permissions: [{ granted: true }],
    });
    const result = await service.decide(READ_PROJECT, 'u1', 't1', 'EMPLOYEE');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('membership_not_found_or_inactive');
  });
});
