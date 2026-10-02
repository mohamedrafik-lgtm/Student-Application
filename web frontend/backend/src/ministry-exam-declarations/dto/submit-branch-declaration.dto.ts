import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitBranchDeclarationDto {
  @ApiPropertyOptional({ description: 'ملاحظات المتدرب عند اختيار التسليم من الفرع' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  submissionNotes?: string;
}
