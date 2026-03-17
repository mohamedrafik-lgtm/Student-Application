import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateTraineeContactDto {
  @ApiPropertyOptional({ description: 'معرف موظف التواصل الأول' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'معرف موظف التواصل الأول يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف موظف التواصل الأول غير صحيح' })
  firstContactEmployeeId?: number | null;

  @ApiPropertyOptional({ description: 'معرف موظف التواصل الثاني' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'معرف موظف التواصل الثاني يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف موظف التواصل الثاني غير صحيح' })
  secondContactEmployeeId?: number | null;
}
