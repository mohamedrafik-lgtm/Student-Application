import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmBranchDeliveryDto {
  @ApiPropertyOptional({ description: 'هل يريد الموظف حفظ صورة ضوئية من الإقرار' })
  @IsOptional()
  @IsBoolean()
  saveScannedCopy?: boolean;

  @ApiPropertyOptional({ description: 'رابط الصورة/الملف الضوئي للإقرار (اختياري)' })
  @IsOptional()
  @IsString()
  declarationFileUrl?: string;

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

  @ApiPropertyOptional({ description: 'ملاحظات إدارية عند تأكيد استلام إقرار الفرع' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  branchDeliveryNotes?: string;
}
