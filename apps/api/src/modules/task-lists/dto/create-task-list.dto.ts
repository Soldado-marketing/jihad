import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TASK_STATUSES, type TaskStatusValue } from './task-status';

export class CreateTaskListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  /** Status a card takes when moved into the list; omitted keeps the card's status. */
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatusValue;
}
