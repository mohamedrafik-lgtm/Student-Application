import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTraineeNoteDto {
  @ApiProperty({ 
    description: 'محتوى الملاحظة المحدث',
    example: 'المتدرب أظهر تحسناً ملحوظاً في الأداء'
  })
  @IsString()
  @IsNotEmpty({ message: 'محتوى الملاحظة مطلوب' })
  @MaxLength(5000, { message: 'محتوى الملاحظة لا يمكن أن يتجاوز 5000 حرف' })
  content: string;
}

