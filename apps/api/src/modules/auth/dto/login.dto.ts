import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  passwordOrMagicCode!: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
