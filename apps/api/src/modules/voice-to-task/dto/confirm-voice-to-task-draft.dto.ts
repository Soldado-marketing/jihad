import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmVoiceToTaskDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  confirmationNote?: string;
}
