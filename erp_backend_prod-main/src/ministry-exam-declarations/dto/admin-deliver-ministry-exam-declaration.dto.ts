import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum MinistryDeclarationAdminDeliveryMode {
  PAPER_ONLY = 'PAPER_ONLY',
  DIGITAL_COPY = 'DIGITAL_COPY',
}

export class AdminDeliverMinistryExamDeclarationDto {
  @ApiProperty({
    enum: MinistryDeclarationAdminDeliveryMode,
    description: 'طريقة حفظ التسليم من الإدارة (نسخة ورقية أو نسخة رقمية)',
  })
  @IsEnum(MinistryDeclarationAdminDeliveryMode)
  deliveryMode: MinistryDeclarationAdminDeliveryMode;

  @ApiProperty({ description: 'رابط صورة الإقرار المرفوعة (إجباري)' })
  @IsString()
  @IsNotEmpty()
  declarationFileUrl: string;

  @ApiPropertyOptional({ description: 'معرف الملف في Cloudinary إن وجد' })
  @IsOptional()
  @IsString()
  declarationFileCloudinaryId?: string;

  @ApiPropertyOptional({ description: 'اسم الملف الأصلي' })
  @IsOptional()
  @IsString()
  declarationFileName?: string;

  @ApiPropertyOptional({ description: 'نوع الملف MIME' })
  @IsOptional()
  @IsString()
  declarationFileMimeType?: string;

  @ApiPropertyOptional({ description: 'ملاحظات إدارية' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  submissionNotes?: string;
}
