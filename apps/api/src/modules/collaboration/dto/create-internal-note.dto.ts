import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInternalNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  threadKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;
}
