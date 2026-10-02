import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'الرقم القومي للمتدرب',
    example: '12345678901234',
  })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({
    description: 'كود إعادة تعيين كلمة المرور (6 أرقام)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'كود التحقق يجب أن يكون 6 أرقام' })
  resetCode: string;

  @ApiProperty({
    description: 'كلمة المرور الجديدة (يجب أن تحتوي على 6 أحرف على الأقل)',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, { 
    message: 'كلمة المرور يجب أن تحتوي على حروف وأرقام' 
  })
  newPassword: string;
}
