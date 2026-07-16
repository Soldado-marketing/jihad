import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsEnum(ApprovalVisibilityScope)
  visibilityScope!: ApprovalVisibilityScope;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions?: PermissionGrantDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
