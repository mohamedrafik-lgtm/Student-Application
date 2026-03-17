import { IsArray, IsOptional, IsString, IsNumber, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AppealSubjectDto {
  @ApiProperty({ description: 'معرف المادة' })
  @IsNumber()
  contentId: number;

  @ApiProperty({ description: 'الدرجة الحالية' })
  @IsNumber()
  currentScore: number;

  @ApiProperty({ description: 'الدرجة القصوى' })
  @IsNumber()
  maxScore: number;

  @ApiProperty({ description: 'النسبة المئوية' })
  @IsNumber()
  percentage: number;
}

export class CreateGradeAppealDto {
  @ApiProperty({ description: 'المواد المراد التظلم منها', type: [AppealSubjectDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'يجب اختيار مادة واحدة على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => AppealSubjectDto)
  subjects: AppealSubjectDto[];

  @ApiProperty({ description: 'ملاحظات المتدرب', required: false })
  @IsOptional()
  @IsString()
  traineeNotes?: string;
}
