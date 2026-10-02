import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'الرقم القومي للمتدرب',
    example: '12345678901234',
  })
  @IsString()
  @IsNotEmpty()
  nationalId: string;
}
