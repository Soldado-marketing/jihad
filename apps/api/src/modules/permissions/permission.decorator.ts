import { SetMetadata } from '@nestjs/common';
import { PermissionRequirement } from './permission.types';

export const PERMISSION_REQUIREMENT_KEY = 'maos:permission-requirement';

export const RequirePermission = (requirement: PermissionRequirement) =>
  SetMetadata(PERMISSION_REQUIREMENT_KEY, requirement);
