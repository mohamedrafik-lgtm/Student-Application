import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudyMaterialDto {
  @ApiProperty({ description: 'اسم الأداة الدراسية' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'الاسم بالإنجليزية', required: false })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: 'وصف الأداة', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'معرف البرنامج التدريبي' })
  @IsNumber()
  programId: number;

  @ApiProperty({ description: 'معرف الرسم المرتبط (اختياري)', required: false })
  @IsOptional()
  @IsNumber()
  linkedFeeId?: number | null;

  @ApiProperty({ description: 'الكمية المتاحة', default: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'حالة النشاط', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'معرفات الموظفين المسؤولين عن التسليم', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  responsibleUserIds?: string[];
}

