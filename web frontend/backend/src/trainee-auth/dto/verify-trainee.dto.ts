import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class VerifyTraineeDto {
  @ApiProperty({
    description: 'الرقم القومي للمتدرب',
    example: '12345678901234',
  })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({
    description: 'تاريخ الميلاد (YYYY-MM-DD)',
    example: '1995-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;
}
