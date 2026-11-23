import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetCodeDto {
  @ApiProperty({ 
    description: 'رقم الهاتف المرتبط بالحساب',
    example: '01012345678',
    minLength: 10,
    maxLength: 15 
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 15)
  phoneNumber: string;

  @ApiProperty({ 
    description: 'كود إعادة تعيين كلمة المرور',
    example: '123456',
    minLength: 6,
    maxLength: 6 
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  resetCode: string;
}
