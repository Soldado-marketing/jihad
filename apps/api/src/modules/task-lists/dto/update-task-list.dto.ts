import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { TASK_STATUSES, type TaskStatusValue } from './task-status';

export class UpdateTaskListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  /** A status maps the list to it; null removes the mapping. */
  @IsOptional()
  @ValidateIf((o) => o.status !== null)
  @IsIn(TASK_STATUSES)
  status?: TaskStatusValue | null;

  /** true archives the list (its cards stay), false restores it. */
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
