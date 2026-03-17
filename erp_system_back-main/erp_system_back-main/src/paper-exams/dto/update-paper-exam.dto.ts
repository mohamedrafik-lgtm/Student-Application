import { PartialType } from '@nestjs/mapped-types';
import { CreatePaperExamDto } from './create-paper-exam.dto';
import { IsOptional, IsEnum } from 'class-validator';

enum PaperExamStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdatePaperExamDto extends PartialType(CreatePaperExamDto) {
  @IsOptional()
  @IsEnum(PaperExamStatus)
  status?: PaperExamStatus;
}