import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleSlotDto } from './create-schedule-slot.dto';

export class UpdateScheduleSlotDto extends PartialType(CreateScheduleSlotDto) {}

