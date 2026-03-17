import { IsInt, IsString, IsNotEmpty, Min } from 'class-validator';
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

  @ApiProperty({ description: 'عدد الأيام المطلوب تأجيلها', minimum: 1 })
  @IsInt()
  @Min(1)
  requestedExtensionDays: number;
}