import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum DocumentType {
  PERSONAL_PHOTO = 'PERSONAL_PHOTO',         // الصورة الشخصية
  ID_CARD_FRONT = 'ID_CARD_FRONT',          // صورة البطاقة وجه
  ID_CARD_BACK = 'ID_CARD_BACK',            // صورة البطاقة ظهر
  QUALIFICATION_FRONT = 'QUALIFICATION_FRONT', // صورة المؤهل الدراسي وجه
  QUALIFICATION_BACK = 'QUALIFICATION_BACK',   // صورة المؤهل الدراسي ظهر
  EXPERIENCE_CERT = 'EXPERIENCE_CERT',         // صورة شهادة الخبرة
  MINISTRY_CERT = 'MINISTRY_CERT',             // صورة شهادة الوزارة
  PROFESSION_CARD = 'PROFESSION_CARD',         // صورة كارنيه مزاولة المهنة
  SKILL_CERT = 'SKILL_CERT',                   // صورة شهادة قياس المهارة
}

export class CreateTraineeDocumentDto {
  @ApiProperty({ description: 'نوع الوثيقة', enum: DocumentType })
  @IsNotEmpty()
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'اسم الملف الأصلي' })
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'مسار الملف المخزن' })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'حجم الملف بالبايت' })
  @IsNotEmpty()
  fileSize: number;

  @ApiProperty({ description: 'نوع الملف' })
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'ملاحظات على الوثيقة', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTraineeDocumentDto {
  @ApiProperty({ description: 'ملاحظات على الوثيقة', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'هل تم التحقق من الوثيقة', required: false })
  @IsOptional()
  isVerified?: boolean;
}
