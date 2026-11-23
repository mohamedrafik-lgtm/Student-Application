import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { Semester } from '@prisma/client';

export class CreateGradeReleaseDto {
  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  @IsInt()
  programId: number;

  @ApiProperty({ description: 'الفصل الدراسي', enum: Semester })
  @IsEnum(Semester)
  semester: Semester;

  @ApiProperty({ description: 'السنة الأكاديمية', example: '2024-2025' })
  @IsString()
  academicYear: string;

  @ApiProperty({ description: 'هل يتطلب سداد رسم', required: false })
  @IsOptional()
  @IsBoolean()
  requirePayment?: boolean;

  @ApiProperty({ description: 'نوع الرسم المطلوب', required: false })
  @IsOptional()
  @IsString()
  linkedFeeType?: string;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateGradeReleaseDto {
  @ApiProperty({ description: 'هل تم إعلان الدرجات', required: false })
  @IsOptional()
  @IsBoolean()
  isReleased?: boolean;

  @ApiProperty({ description: 'هل يتطلب سداد رسم', required: false })
  @IsOptional()
  @IsBoolean()
  requirePayment?: boolean;

  @ApiProperty({ description: 'نوع الرسم المطلوب', required: false })
  @IsOptional()
  @IsString()
  linkedFeeType?: string;

  @ApiProperty({ description: 'ملاحظات', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
