import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, MinLength, Matches } from 'class-validator';

export class CreatePasswordDto {
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

  @ApiProperty({
    description: 'كلمة المرور الجديدة (يجب أن تحتوي على 6 أحرف على الأقل)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { 
    message: 'كلمة المرور يجب أن تحتوي على حروف وأرقام' 
  })
  password: string;
}
