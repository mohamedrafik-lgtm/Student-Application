// Enumeración para el estado del alumno
export enum TraineeStatus {
  ACTIVE = 'ACTIVE',           // نشط
  INACTIVE = 'INACTIVE',       // غير نشط
  GRADUATED = 'GRADUATED',     // متخرج
  WITHDRAWN = 'WITHDRAWN',     // منسحب
  SUSPENDED = 'SUSPENDED',     // موقوف
}

// Interfaz para el alumno
export interface Trainee {
  id: number;
  nameAr: string;
  nameEn?: string;
  nationalId: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  avatar?: string;
  photoUrl?: string;
  status: TraineeStatus;
  programId: number;
  program?: any; // TrainingProgram
  enrollmentType?: string;
  academicYear?: string;
  guardianPhone?: string; // رقم هاتف ولي الأمر
  guardianEmail?: string; // بريد ولي الأمر
  guardianJob?: string; // وظيفة ولي الأمر
  guardianRelation?: string; // صلة القرابة
  guardianName?: string; // اسم ولي الأمر
  landline?: string; // الهاتف الأرضي
  whatsapp?: string; // رقم الواتساب
  createdAt: string;
  updatedAt: string;
} 