import { ApiProperty } from '@nestjs/swagger';

export class GetTraineeFeeDto {
  @ApiProperty({ description: 'معرف الرسوم' })
  id: number;

  @ApiProperty({ description: 'اسم الرسوم' })
  name: string;

  @ApiProperty({ description: 'قيمة الرسوم' })
  amount: number;

  @ApiProperty({ description: 'نوع الرسوم' })
  type: string;

  @ApiProperty({ description: 'العام الدراسي' })
  academicYear: string;

  @ApiProperty({ description: 'السماح بتطبيق متعدد' })
  allowMultipleApply: boolean;

  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  programId: number;

  @ApiProperty({ description: 'معرف الخزينة' })
  safeId: string;

  @ApiProperty({ description: 'حالة التطبيق' })
  isApplied: boolean;

  @ApiProperty({ description: 'تاريخ التطبيق', required: false })
  appliedAt?: Date;

  @ApiProperty({ description: 'معرف من قام بالتطبيق', required: false })
  appliedById?: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;

  @ApiProperty({ description: 'تاريخ التحديث' })
  updatedAt: Date;

  @ApiProperty({ description: 'بيانات البرنامج التدريبي', required: false })
  program?: any;

  @ApiProperty({ description: 'بيانات الخزينة', required: false })
  safe?: any;

  @ApiProperty({ description: 'مدفوعات المتدربين', required: false, type: 'array' })
  traineePayments?: any[];
} 