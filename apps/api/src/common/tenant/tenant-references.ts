import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Tenant validation for IDs that arrive in a request body.
 *
 * A body field such as `projectId` or `assignedToUserId` is a reference to
 * another record. Writing it unchecked lets a caller link their record to
 * another tenant's data. These helpers accept the reference only when it
 * belongs to the caller's tenant; otherwise they refuse with the same 400
 * whether the ID exists in another tenant or nowhere, so the refusal reveals
 * nothing. `undefined` (field not sent) and `null` (explicit unset) pass.
 */

type Reference = string | null | undefined;

function invalidReference(field: string): never {
  throw new BadRequestException({
    code: 'INVALID_REFERENCE',
    field,
    message: `${field} does not reference a record in this workspace.`,
  });
}

export async function assertProjectInTenant(
  prisma: PrismaService,
  tenantId: string,
  projectId: Reference,
  field = 'projectId',
): Promise<void> {
  if (projectId === undefined || projectId === null) return;
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: { id: true },
  });
  if (!project) invalidReference(field);
}

/** The user must hold an ACTIVE membership in the tenant. */
export async function assertActiveMemberInTenant(
  prisma: PrismaService,
  tenantId: string,
  userId: Reference,
  field = 'assignedToUserId',
): Promise<void> {
  if (userId === undefined || userId === null) return;
  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId, userId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!membership) invalidReference(field);
}

export async function assertTaskInTenant(
  prisma: PrismaService,
  tenantId: string,
  taskId: Reference,
  field = 'taskId',
): Promise<void> {
  if (taskId === undefined || taskId === null) return;
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId }, select: { id: true } });
  if (!task) invalidReference(field);
}

export async function assertFileAssetInTenant(
  prisma: PrismaService,
  tenantId: string,
  fileAssetId: Reference,
  field = 'fileAssetId',
): Promise<void> {
  if (fileAssetId === undefined || fileAssetId === null) return;
  const asset = await prisma.fileAsset.findFirst({ where: { id: fileAssetId, tenantId }, select: { id: true } });
  if (!asset) invalidReference(field);
}

/**
 * The version must be in the tenant and, when `fileAssetId` is given, belong
 * to that file - otherwise a request could pair one file with another file's
 * version.
 */
export async function assertFileVersionInTenant(
  prisma: PrismaService,
  tenantId: string,
  fileVersionId: Reference,
  fileAssetId?: Reference,
  field = 'fileVersionId',
): Promise<void> {
  if (fileVersionId === undefined || fileVersionId === null) return;
  const version = await prisma.fileVersion.findFirst({
    where: { id: fileVersionId, tenantId, ...(fileAssetId ? { fileAssetId } : {}) },
    select: { id: true },
  });
  if (!version) invalidReference(field);
}

/**
 * Resource types a polymorphic reference (`resourceType` + `resourceId`) may
 * name. A reference can only be checked when its type is known, so any other
 * type is refused rather than stored unchecked.
 */
export const LINKABLE_RESOURCE_TYPES = ['project', 'task', 'file'] as const;

export async function assertResourceInTenant(
  prisma: PrismaService,
  tenantId: string,
  resourceType: string | null | undefined,
  resourceId: Reference,
): Promise<void> {
  if (resourceId === undefined || resourceId === null) return;
  switch (resourceType) {
    case 'project':
      return assertProjectInTenant(prisma, tenantId, resourceId, 'resourceId');
    case 'task':
      return assertTaskInTenant(prisma, tenantId, resourceId, 'resourceId');
    case 'file':
      return assertFileAssetInTenant(prisma, tenantId, resourceId, 'resourceId');
    default:
      invalidReference('resourceType');
  }
}

export async function assertLeadInTenant(
  prisma: PrismaService,
  tenantId: string,
  leadId: Reference,
  field = 'leadId',
): Promise<void> {
  if (leadId === undefined || leadId === null) return;
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } });
  if (!lead) invalidReference(field);
}

export async function assertOpportunityInTenant(
  prisma: PrismaService,
  tenantId: string,
  opportunityId: Reference,
  field = 'opportunityId',
): Promise<void> {
  if (opportunityId === undefined || opportunityId === null) return;
  const opportunity = await prisma.opportunity.findFirst({ where: { id: opportunityId, tenantId }, select: { id: true } });
  if (!opportunity) invalidReference(field);
}
