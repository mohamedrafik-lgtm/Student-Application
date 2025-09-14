// SOLID Principle: Interface Segregation - Separate interfaces for different concerns

// 1. Login Request/Response Types
export interface TraineeLoginRequest {
  nationalId: string;
  password: string;
}

export interface TraineeLoginResponse {
  access_token: string;
  trainee: Trainee;
}

export interface TraineeLoginError {
  statusCode: number;
  message: string;
  error?: string;
}

// 2. Auth State Management
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  user?: Trainee;
  accessToken?: string;
}

// 3. Enums
export enum EnrollmentType {
  REGULAR = 'REGULAR',     // انتظام
  DISTANCE = 'DISTANCE',   // انتساب  
  BOTH = 'BOTH'           // الكل
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',       // أعزب
  MARRIED = 'MARRIED',     // متزوج
  DIVORCED = 'DIVORCED',   // مطلق
  WIDOWED = 'WIDOWED'      // أرمل
}

export enum ProgramType {
  SUMMER = 'SUMMER',       // برنامج صيفي
  WINTER = 'WINTER',       // برنامج شتوي
  ANNUAL = 'ANNUAL'        // عقد سنة
}

export enum Gender {
  MALE = 'MALE',           // ذكر
  FEMALE = 'FEMALE'        // أنثى
}

export enum Religion {
  ISLAM = 'ISLAM',         // الإسلام
  CHRISTIANITY = 'CHRISTIANITY', // المسيحية
  JUDAISM = 'JUDAISM'      // اليهودية
}

export enum EducationType {
  PREPARATORY = 'PREPARATORY',                     // اعدادي
  INDUSTRIAL_SECONDARY = 'INDUSTRIAL_SECONDARY',   // ثانوي فني صناعي
  COMMERCIAL_SECONDARY = 'COMMERCIAL_SECONDARY',   // ثانوي فني تجاري
  AGRICULTURAL_SECONDARY = 'AGRICULTURAL_SECONDARY', // ثانوي فني زراعي
  AZHAR_SECONDARY = 'AZHAR_SECONDARY',            // ثانوي أزهري
  GENERAL_SECONDARY = 'GENERAL_SECONDARY',        // ثانوي عام
  UNIVERSITY = 'UNIVERSITY',                      // بكالوريوس - ليسانس
  INDUSTRIAL_APPRENTICESHIP = 'INDUSTRIAL_APPRENTICESHIP' // تلمذة صناعية
}

export enum TraineeStatus {
  NEW = 'NEW',           // مستجد
  CURRENT = 'CURRENT',   // مستمر
  GRADUATE = 'GRADUATE', // خريج
  WITHDRAWN = 'WITHDRAWN' // منسحب
}

export enum Year {
  FIRST = 'FIRST',       // السنة الأولى
  SECOND = 'SECOND',     // السنة الثانية
  THIRD = 'THIRD',       // السنة الثالثة
  FOURTH = 'FOURTH'      // السنة الرابعة
}

// 4. Training Program Interface
export interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 5. Main Trainee Interface
export interface Trainee {
  // البيانات الأساسية
  id: number;
  nameAr: string;                    // الاسم بالعربية
  nameEn: string;                    // الاسم بالإنجليزية
  nationalId: string;                // الرقم القومي
  birthDate: string;                 // تاريخ الميلاد
  gender: Gender;                    // النوع
  religion: Religion;                // الديانة
  nationality: string;               // الجنسية
  maritalStatus: MaritalStatus;      // الحالة الاجتماعية
  
  // بيانات البطاقة الشخصية
  idIssueDate: string;               // تاريخ إصدار البطاقة
  idExpiryDate: string;              // تاريخ انتهاء البطاقة
  
  // بيانات البرنامج التدريبي
  enrollmentType: EnrollmentType;    // نطاق الالتحاق
  programType: ProgramType;          // نوع البرنامج
  programId: number;                 // معرف البرنامج
  program: TrainingProgram;          // بيانات البرنامج
  traineeStatus: TraineeStatus;      // حالة المتدرب
  classLevel: Year;                  // الفرقة الدراسية
  academicYear?: string;             // العام الدراسي
  
  // بيانات الاتصال والعنوان
  country: string;                   // الدولة
  governorate?: string;              // المحافظة
  city: string;                      // المدينة
  address: string;                   // العنوان
  residenceAddress: string;          // محل الإقامة
  phone: string;                     // رقم الهاتف
  email?: string;                    // البريد الإلكتروني
  landline?: string;                 // الهاتف الأرضي
  whatsapp?: string;                 // رقم الواتساب
  facebook?: string;                 // حساب فيسبوك
  
  // بيانات ولي الأمر
  guardianName: string;              // اسم ولي الأمر
  guardianPhone: string;             // رقم هاتف ولي الأمر
  guardianEmail?: string;            // بريد ولي الأمر
  guardianJob?: string;              // وظيفة ولي الأمر
  guardianRelation: string;          // صلة القرابة
  
  // البيانات التعليمية
  educationType: EducationType;      // نوع المؤهل
  schoolName: string;                // اسم المدرسة/المعهد
  graduationDate: string;            // تاريخ التخرج
  totalGrade?: number;               // المجموع الكلي
  gradePercentage?: number;          // النسبة المئوية
  
  // الأنشطة
  sportsActivity?: string;           // النشاط الرياضي
  culturalActivity?: string;         // النشاط الثقافي
  educationalActivity?: string;      // النشاط التعليمي
  
  // الصورة الشخصية
  photoUrl?: string;                 // رابط صورة المتدرب
  photoCloudinaryId?: string;        // معرف الصورة في Cloudinary
  
  // بيانات التسويق
  marketingEmployeeId?: number;      // معرف موظف التسويق
  firstContactEmployeeId?: number;   // معرف موظف التواصل الأول
  secondContactEmployeeId?: number;  // معرف موظف التواصل الثاني
  
  // ملاحظات وتواريخ
  notes?: string;                    // ملاحظات
  createdAt: string;                 // تاريخ الإنشاء
  updatedAt: string;                 // تاريخ آخر تحديث
}
