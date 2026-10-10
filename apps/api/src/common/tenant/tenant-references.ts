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
