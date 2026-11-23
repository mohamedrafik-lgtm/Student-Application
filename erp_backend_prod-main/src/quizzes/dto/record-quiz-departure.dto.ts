import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordQuizDepartureDto {
  @ApiProperty({ enum: ['WEB', 'MOBILE'] })
  @IsIn(['WEB', 'MOBILE'])
  platform: 'WEB' | 'MOBILE';

  @ApiProperty({ description: 'معرّف حدث فريد لمنع احتساب إعادة الإرسال مرتين' })
  @IsString()
  @MaxLength(100)
  clientEventId: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
