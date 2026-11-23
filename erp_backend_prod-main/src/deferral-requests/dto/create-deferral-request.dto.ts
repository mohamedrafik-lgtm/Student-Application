import { IsInt, IsString, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeferralRequestDto {
  @ApiProperty({ description: 'معرف الرسم المطلوب تأجيله' })
  @IsInt()
  @IsNotEmpty()
  feeId: number;

  @ApiProperty({ description: 'سبب طلب التأجيل' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'عدد الأيام المطلوب تأجيلها', minimum: 1, maximum: 14 })
  @IsInt()
  @Min(1, { message: 'الحد الأدنى لعدد أيام التأجيل هو يوم واحد' })
  @Max(14, { message: 'الحد الأقصى لعدد أيام التأجيل هو 14 يوماً' })
  requestedExtensionDays: number;
}