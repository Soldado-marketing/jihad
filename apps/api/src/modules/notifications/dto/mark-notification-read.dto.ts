import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkNotificationReadDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  readReason?: string;
}
