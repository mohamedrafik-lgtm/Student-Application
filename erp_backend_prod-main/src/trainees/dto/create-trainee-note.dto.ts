import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTraineeNoteDto {
  @ApiProperty({ 
    description: 'محتوى الملاحظة',
    example: 'المتدرب يحتاج إلى متابعة خاصة في المواد العملية'
  })
  @IsString()
  @IsNotEmpty({ message: 'محتوى الملاحظة مطلوب' })
  @MaxLength(5000, { message: 'محتوى الملاحظة لا يمكن أن يتجاوز 5000 حرف' })
  content: string;
}

