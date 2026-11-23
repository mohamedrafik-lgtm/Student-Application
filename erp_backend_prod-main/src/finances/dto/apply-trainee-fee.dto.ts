import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ApplyTraineeFeeDto {
  @ApiProperty({ description: 'معرفات المتدربين المراد تطبيق الرسوم عليهم (اختياري، إذا لم يتم تحديدها سيتم تطبيق الرسوم على جميع متدربي البرنامج)', required: false })
  @IsOptional()
  @IsArray({ message: 'معرفات المتدربين يجب أن تكون مصفوفة' })
  @IsNumber({}, { each: true, message: 'معرفات المتدربين يجب أن تكون أرقامًا' })
  traineeIds?: number[];

  @ApiProperty({ description: 'وصف إضافي للرسوم', required: false })
  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصًا' })
  description?: string;
} 