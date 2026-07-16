import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class BootstrapOwnerDto {
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

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenantName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(63)
  tenantSlug!: string;
}
