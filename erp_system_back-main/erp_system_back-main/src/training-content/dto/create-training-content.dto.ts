import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Min, IsEnum, IsArray } from 'class-validator';

export class CreateTrainingContentDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  programId: number;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  classroomId: number;

  @IsNotEmpty()
  @IsString()
  instructorId: string;

  // نوع المحتوى (جديد)
  @IsOptional()
  @IsEnum(['THEORY', 'PRACTICAL', 'BOTH', 'UNSPECIFIED'])
  contentType?: 'THEORY' | 'PRACTICAL' | 'BOTH' | 'UNSPECIFIED';

  // مسؤولو الحضور الجدد (array)
  @IsOptional()
  @IsArray()
  attendanceRecorderIds?: string[];

  // الحقول القديمة (محتفظ بها للتوافق)
  @IsOptional()
  @IsString()
  theoryAttendanceRecorderId?: string;

  @IsOptional()
  @IsString()
  practicalAttendanceRecorderId?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  theorySessionsPerWeek: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  practicalSessionsPerWeek: number;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  chaptersCount: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  yearWorkMarks: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  practicalMarks: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  writtenMarks: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  attendanceMarks: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quizzesMarks: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  finalExamMarks: number;
} 