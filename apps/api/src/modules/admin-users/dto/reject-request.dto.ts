import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectRequestDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  rejectionReason!: string;
}
