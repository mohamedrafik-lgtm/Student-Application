import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// أنواع الطلبات
export enum RequestType {
  EXAM_POSTPONE = 'EXAM_POSTPONE',       // تأجيل اختبار
  SICK_LEAVE = 'SICK_LEAVE',             // إجازة مرضية
  ENROLLMENT_PROOF = 'ENROLLMENT_PROOF', // طلب إثبات قيد
  CERTIFICATE = 'CERTIFICATE',           // طلب إفادة
}

// أنواع الاختبارات
export enum ExamType {
  MIDTERM = 'MIDTERM', // ميد تيرم
  FINAL = 'FINAL',     // نهائي
}

export class CreateTraineeRequestDto {
  @ApiProperty({ enum: RequestType, description: 'نوع الطلب' })
  @IsEnum(RequestType)
  @IsNotEmpty()
  type: RequestType;

  @ApiProperty({ description: 'سبب الطلب' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ required: false, description: 'رابط المرفق (للإجازة المرضية)' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @ApiProperty({ required: false, description: 'معرف المرفق في Cloudinary' })
  @IsOptional()
  @IsString()
  attachmentCloudinaryId?: string;

  @ApiProperty({ required: false, enum: ExamType, description: 'نوع الاختبار (لتأجيل اختبار)' })
  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @ApiProperty({ required: false, description: 'تاريخ الاختبار الأصلي' })
  @IsOptional()
  @IsDateString()
  examDate?: string;
}