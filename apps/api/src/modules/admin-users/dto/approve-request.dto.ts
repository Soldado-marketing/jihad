import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CLIENT_SCOPE_KEY_PATTERN } from '../../permissions/client-scope-assignment';

export enum ApprovalRole {
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  CONTRACTOR = 'CONTRACTOR',
  CLIENT = 'CLIENT',
}

export enum ApprovalVisibilityScope {
  TENANT_WIDE = 'TENANT_WIDE',
  WORKSPACE_LEVEL = 'WORKSPACE_LEVEL',
  PROJECT_LEVEL = 'PROJECT_LEVEL',
  CLIENT_LEVEL = 'CLIENT_LEVEL',
  ASSIGNED_ITEMS_ONLY = 'ASSIGNED_ITEMS_ONLY',
}

export class PermissionGrantDto {
  @IsString()
  action!: string;

  @IsString()
  resource!: string;
}

export class ApproveRequestDto {
  @IsEnum(ApprovalRole, {
    message: 'role must be one of: MANAGER, EMPLOYEE, CONTRACTOR, CLIENT',
  })
  role!: ApprovalRole;

  /**
   * Accepted for compatibility with older clients but not used: the stored
   * scope is derived from the role (see effectiveVisibilityScope), because the
   * backend enforces no narrower scope (MAOS-T36).
   */
  @IsOptional()
  @IsEnum(ApprovalVisibilityScope)
  visibilityScope?: ApprovalVisibilityScope;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions?: PermissionGrantDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;

  /**
   * Required for the CLIENT role, refused for every other role (F-1): the key
   * that ties the client membership to its client's projects, files and
   * invoices.
   */
  @IsOptional()
  @Matches(CLIENT_SCOPE_KEY_PATTERN, {
    message: 'clientScopeKey: 1-120 letters, digits, dot, underscore or hyphen',
  })
  clientScopeKey?: string;
}
