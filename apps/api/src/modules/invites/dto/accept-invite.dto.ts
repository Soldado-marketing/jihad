import { IsString, MaxLength, MinLength } from 'class-validator';

/** Same rules as registration for the name and password (RegisterDto). */
export class AcceptInviteDto {
  @IsString()
  @MaxLength(100)
  token!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
