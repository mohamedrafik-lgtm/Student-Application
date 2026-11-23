import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentScheduleDto } from './create-payment-schedule.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdatePaymentScheduleDto extends PartialType(
  OmitType(CreatePaymentScheduleDto, ['feeId'] as const)
) {}