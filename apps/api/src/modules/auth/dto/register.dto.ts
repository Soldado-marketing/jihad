import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Public-facing requested account types — OWNER is intentionally excluded.
// Owner accounts can only be created via bootstrap-owner (first setup) or
// assigned manually by an existing Owner through the admin approval flow.
export enum RequestedAccountType {
  TEAM_MEMBER = 'team_member',
  CLIENT = 'client',
  CONTRACTOR = 'contractor',
  OTHER = 'other',
}

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsEnum(RequestedAccountType, {
    message: 'requestedAccountType must be one of: team_member, client, contractor, other',
  })
  requestedAccountType!: RequestedAccountType;

  // The tenant this registration is for. Must already exist.
  // Not validated against DB here — auth service handles the lookup safely.
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  tenantSlug!: string;
}
