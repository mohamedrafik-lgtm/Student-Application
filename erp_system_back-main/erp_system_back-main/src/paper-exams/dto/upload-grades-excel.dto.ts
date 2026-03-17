import { IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExcelGradeEntry {
  traineeId: number;
  score: number;
}

export class UploadGradesExcelDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExcelGradeEntry)
  grades: ExcelGradeEntry[];
}
