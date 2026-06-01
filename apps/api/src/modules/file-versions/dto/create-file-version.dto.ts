import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFileVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  originalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  storageKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}
