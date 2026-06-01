import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @MinLength(16)
  token!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
