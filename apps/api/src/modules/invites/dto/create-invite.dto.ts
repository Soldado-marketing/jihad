import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Roles an invite may grant. OWNER is never invitable. A CLIENT invite must
 * name the Customer it belongs to (ADR-017); the service checks it.
 */
export const INVITABLE_ROLES = ['MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT'] as const;

export class CreateInviteDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsIn(INVITABLE_ROLES, { message: 'role must be one of: MANAGER, EMPLOYEE, CONTRACTOR, CLIENT' })
  role!: (typeof INVITABLE_ROLES)[number];

  /** Required for CLIENT, refused for every other role. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerId?: string;
}
