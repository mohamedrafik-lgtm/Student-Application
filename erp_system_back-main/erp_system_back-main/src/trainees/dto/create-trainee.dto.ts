import { EnrollmentType, Gender, MaritalStatus, ProgramType, Religion, EducationType, TraineeStatus, Year } from '@prisma/client';
import { IsDate, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches, IsUrl, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTraineeDto {
  @ApiProperty({ description: 'اسم المتدرب باللغة العربية' })
  @IsNotEmpty()
  @IsString()
  nameAr: string;

  @ApiProperty({ description: 'اسم المتدرب باللغة الإنجليزية' })
  @IsNotEmpty()
  @IsString()
  nameEn: string;

  @ApiProperty({ description: 'نوع الالتحاق', enum: EnrollmentType })
  @IsNotEmpty()
  @IsEnum(EnrollmentType)
  enrollmentType: EnrollmentType;

  @ApiProperty({ description: 'الحالة الاجتماعية', enum: MaritalStatus })
  @IsNotEmpty()
  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @ApiProperty({ description: 'الرقم القومي', example: '12345678901234' })
  @IsNotEmpty()
  @IsString()
  @Length(14, 14, { message: 'National ID must be 14 digits' })
  @Matches(/^[0-9]{14}$/, { message: 'National ID must contain only numbers' })
  nationalId: string;

  @ApiProperty({ description: 'تاريخ إصدار البطاقة' })
  @IsNotEmpty()
  @IsString()
  idIssueDate: string;

  @ApiProperty({ description: 'تاريخ انتهاء البطاقة' })
  @IsNotEmpty()
  @IsString()
  idExpiryDate: string;

  @ApiProperty({ description: 'نوع البرنامج', enum: ProgramType })
  @IsNotEmpty()
  @IsEnum(ProgramType)
  programType: ProgramType;

  @ApiProperty({ description: 'الجنسية' })
  @IsNotEmpty()
  @IsString()
  nationality: string;

  @ApiProperty({ description: 'الجنس', enum: Gender })
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ description: 'تاريخ الميلاد' })
  @IsNotEmpty()
  @IsString()
  birthDate: string;

  @ApiProperty({ description: 'عنوان الإقامة' })
  @IsNotEmpty()
  @IsString()
  residenceAddress: string;

  @ApiProperty({ description: 'رابط الصورة الشخصية', required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ description: 'الديانة', enum: Religion, required: false })
  @IsOptional()
  @IsEnum(Religion)
  religion?: Religion;

  @ApiProperty({ description: 'رقم البرنامج التدريبي' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  programId: number;

  @ApiProperty({ description: 'الدولة' })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ description: 'المحافظة', required: false })
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiProperty({ description: 'المدينة' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ description: 'العنوان' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ description: 'رقم الهاتف', example: '+201234567890' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Phone number must be valid' })
  phone: string;

  @ApiProperty({ description: 'البريد الإلكتروني', example: 'example@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'رقم هاتف ولي الأمر', example: '+201234567890' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Guardian phone number must be valid' })
  guardianPhone: string;

  @ApiProperty({ description: 'البريد الإلكتروني لولي الأمر', required: false, example: 'guardian@example.com' })
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @ApiProperty({ description: 'وظيفة ولي الأمر', required: false })
  @IsOptional()
  @IsString()
  guardianJob?: string;

  @ApiProperty({ description: 'صلة القرابة بولي الأمر' })
  @IsNotEmpty()
  @IsString()
  guardianRelation: string;

  @ApiProperty({ description: 'اسم ولي الأمر', example: 'أحمد محمد علي' })
  @IsNotEmpty({ message: 'اسم ولي الأمر مطلوب' })
  @IsString()
  @Length(2, 100, { message: 'اسم ولي الأمر يجب أن يكون بين 2 و 100 حرف' })
  guardianName: string;

  @ApiProperty({ description: 'رقم الهاتف الأرضي', required: false })
  @IsOptional()
  @IsString()
  landline?: string;

  @ApiProperty({ description: 'رقم واتساب', required: false })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({ description: 'حساب فيسبوك', required: false })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiProperty({ description: 'نوع التعليم', enum: EducationType })
  @IsNotEmpty()
  @IsEnum(EducationType)
  educationType: EducationType;

  @ApiProperty({ description: 'اسم المدرسة/الجامعة' })
  @IsNotEmpty()
  @IsString()
  schoolName: string;

  @ApiProperty({ description: 'الإدارة التعليمية', required: false })
  @IsOptional()
  educationalAdministration?: string;

  @ApiProperty({ description: 'تاريخ التخرج' })
  @IsNotEmpty()
  @IsString()
  graduationDate: string;

  @ApiProperty({ description: 'المجموع الكلي', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalGrade?: number;

  @ApiProperty({ description: 'النسبة المئوية للدرجات', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gradePercentage?: number;



  @ApiProperty({ description: 'العام الدراسي', example: '2025/2026', required: false })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiProperty({ description: 'حالة المتدرب', enum: TraineeStatus, required: false, default: TraineeStatus.NEW })
  @IsOptional()
  @IsEnum(TraineeStatus)
  traineeStatus?: TraineeStatus;

  @ApiProperty({ description: 'الفرقة الدراسية', enum: Year, required: false, default: Year.FIRST })
  @IsOptional()
  @IsEnum(Year)
  classLevel?: Year;
}