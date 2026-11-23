import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitOnlineDeclarationDto {
  @ApiProperty({ description: 'رابط ملف الإقرار المرفوع' })
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

  @ApiPropertyOptional({ description: 'ملاحظات المتدرب' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  submissionNotes?: string;
}
