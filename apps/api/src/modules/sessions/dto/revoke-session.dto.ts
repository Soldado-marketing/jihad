import { IsString, MinLength } from 'class-validator';

export class RevokeSessionDto {
  @IsString()
  @MinLength(8)
  sessionId!: string;
}
