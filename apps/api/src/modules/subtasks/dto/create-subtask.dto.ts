import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSubtaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}
