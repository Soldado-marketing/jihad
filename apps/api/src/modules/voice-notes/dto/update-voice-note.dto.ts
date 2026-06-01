import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateVoiceNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'RECORDED', 'TRANSCRIPTION_REQUESTED', 'TRANSCRIBED', 'FAILED', 'ARCHIVED'])
  status?: 'DRAFT' | 'RECORDED' | 'TRANSCRIPTION_REQUESTED' | 'TRANSCRIBED' | 'FAILED' | 'ARCHIVED';

  @IsOptional()
  @IsIn(['ar', 'en', 'de', 'mixed'])
  languageHint?: 'ar' | 'en' | 'de' | 'mixed';

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  clientScopeKey?: string;
}
