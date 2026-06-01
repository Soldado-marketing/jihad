import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateVoiceNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsIn(['ar', 'en', 'de', 'mixed'])
  languageHint?: 'ar' | 'en' | 'de' | 'mixed';

  @IsOptional()
  @IsString()
  @MaxLength(240)
  storageKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  clientScopeKey?: string;
}
