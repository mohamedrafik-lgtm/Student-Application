import { IsString, Matches } from 'class-validator';

export class LookupExamCommitteeDto {
  @IsString()
  @Matches(/^\d{14}$/, { message: 'الرقم القومي يجب أن يكون 14 رقم' })
  nationalId: string;
}
