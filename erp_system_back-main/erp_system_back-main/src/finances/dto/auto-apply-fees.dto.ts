import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AutoApplyFeesDto {
  @ApiProperty({ description: 'معرف المتدرب المراد تطبيق الرسوم عليه' })
  @IsNotEmpty({ message: 'يجب تحديد معرف المتدرب' })
  @IsNumber({}, { message: 'معرف المتدرب يجب أن يكون رقمًا' })
  traineeId: number;

  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  @IsNotEmpty({ message: 'يجب تحديد معرف البرنامج التدريبي' })
  @IsNumber({}, { message: 'معرف البرنامج التدريبي يجب أن يكون رقمًا' })
  programId: number;

  @ApiProperty({ description: 'وصف إضافي للتطبيق التلقائي', required: false })
  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصًا' })
  description?: string;
}
