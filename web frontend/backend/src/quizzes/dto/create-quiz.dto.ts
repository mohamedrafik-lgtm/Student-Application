import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizQuestionDto {
  @ApiProperty({ description: 'معرف السؤال من بنك الأسئلة' })
  @IsInt()
  questionId: number;

  @ApiProperty({ description: 'ترتيب السؤال في الاختبار', required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ description: 'درجة السؤال', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;
}

export class CreateQuizDto {
  @ApiProperty({ description: 'معرف المحتوى التدريبي' })
  @IsInt()
  trainingContentId: number;

  @ApiProperty({ description: 'عنوان الاختبار' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'وصف الاختبار', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'تعليمات الاختبار', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ description: 'تاريخ ووقت بداية الاختبار' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'تاريخ ووقت نهاية الاختبار' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'مدة الاختبار بالدقائق' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ description: 'درجة النجاح (نسبة مئوية)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiProperty({ description: 'عدد المحاولات المسموح بها', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiProperty({ description: 'خلط ترتيب الأسئلة', required: false })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiProperty({ description: 'خلط ترتيب الإجابات', required: false })
  @IsOptional()
  @IsBoolean()
  shuffleAnswers?: boolean;

  @ApiProperty({ description: 'عرض النتائج للمتدرب بعد الانتهاء', required: false })
  @IsOptional()
  @IsBoolean()
  showResults?: boolean;

  @ApiProperty({ description: 'عرض الإجابات الصحيحة', required: false })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;

  @ApiProperty({ description: 'هل الاختبار نشط', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'هل تم نشر الاختبار', required: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiProperty({ description: 'قائمة الأسئلة', type: [QuizQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}

