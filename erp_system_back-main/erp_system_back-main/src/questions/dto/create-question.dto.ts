import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateNested, IsBoolean, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionDifficulty, QuestionSkill, QuestionType } from '@prisma/client';

export class CreateQuestionOptionDto {
  @ApiProperty({ description: 'El texto de la opción' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Indica si esta opción es correcta' })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'El texto de la pregunta' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ 
    description: 'El tipo de pregunta', 
    enum: QuestionType,
    example: QuestionType.MULTIPLE_CHOICE
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ 
    description: 'La habilidad que evalúa la pregunta', 
    enum: QuestionSkill,
    example: QuestionSkill.RECALL
  })
  @IsEnum(QuestionSkill)
  skill: QuestionSkill;

  @ApiProperty({ 
    description: 'El nivel de dificultad de la pregunta', 
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MEDIUM
  })
  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @ApiProperty({ description: 'El número del capítulo al que pertenece la pregunta' })
  @IsInt()
  @Min(1)
  chapter: number;

  @ApiProperty({ description: 'El ID del contenido de formación al que pertenece la pregunta' })
  @IsInt()
  contentId: number;

  @ApiProperty({ 
    description: 'Las opciones de la pregunta',
    type: [CreateQuestionOptionDto]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options: CreateQuestionOptionDto[];

  // Este campo se añade en el controlador
  createdById?: string;
} 