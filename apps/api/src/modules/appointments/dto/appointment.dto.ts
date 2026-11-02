import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @MaxLength(64)
  projectId!: string;

  @IsDateString()
  startsAt!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  location!: string;

  /** What the client should prepare; shown to the client as written. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  preparation?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  preparation?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;
}
