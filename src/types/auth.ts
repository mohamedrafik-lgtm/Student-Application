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

export interface TraineeProfileError {
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

// إضافة الـ enums المفقودة
export enum FeeType {
  REGISTRATION = 'REGISTRATION',
  TUITION = 'TUITION',
  EXAM = 'EXAM',
  MATERIALS = 'MATERIALS',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum DocumentType {
  NATIONAL_ID = 'NATIONAL_ID',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  QUALIFICATION_CERTIFICATE = 'QUALIFICATION_CERTIFICATE',
  MILITARY_SERVICE = 'MILITARY_SERVICE',
  MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
  PHOTOS = 'PHOTOS',
  OTHER = 'OTHER'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export enum SessionType {
  THEORY = 'THEORY',
  PRACTICAL = 'PRACTICAL',
  EXAM = 'EXAM',
  WORKSHOP = 'WORKSHOP'
}

// 4. Training Program Interface
export interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
  duration: string;
  description: string;
  requirements: string;
  cost: number;
  programType: ProgramType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// المحتوى التعليمي
export interface TrainingContent {
  id: number;
  title: string;
  description: string;
  type: SessionType;
  duration: number;
  createdAt: string;
}

// الجلسة التدريبية
export interface Session {
  id: number;
  date: string;
  duration: number;
  location: string;
  notes?: string;
  contentId: number;
  content: TrainingContent;
}

// سجل الحضور
export interface AttendanceRecord {
  id: number;
  status: AttendanceStatus;
  attendedAt: string;
  notes?: string;
  traineeId: number;
  sessionId: number;
  createdAt: string;
  updatedAt: string;
  session: Session;
}

// رسوم المتدربين
export interface TraineeFee {
  id: number;
  name: string;
  amount: number;
  type: FeeType;
  academicYear: string;
}

// مدفوعات المتدربين
export interface TraineePayment {
  id: number;
  amount: number;
  status: PaymentStatus;
  paidAmount: number;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  fee: TraineeFee;
}

// وثائق المتدرب
export interface TraineeDocument {
  id: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  cloudinaryId?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  notes?: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
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
  
  // البيانات المترابطة
  attendanceRecords: AttendanceRecord[];
  traineePayments: TraineePayment[];
  documents: TraineeDocument[];
}

// بيانات المصادقة للمتدرب
export interface TraineeAuth {
  id: string;
  nationalId: string;
  birthDate: string;
  isActive: boolean;
  lastLoginAt?: string;
  traineeId: number;
  createdAt: string;
  updatedAt: string;
  trainee: Trainee;
}

// الاستجابة الكاملة لـ profile endpoint
export interface TraineeProfileResponse extends TraineeAuth {}

// نوع للاستخدام في الفرونت إند
export type TraineeProfile = TraineeProfileResponse;

// DTO للتحقق من بيانات المتدرب
export interface VerifyTraineeDto {
  nationalId: string;  // الرقم القومي
  birthDate: string;   // تاريخ الميلاد (YYYY-MM-DD)
}

// استجابة التحقق من بيانات المتدرب
export interface VerifyTraineeResponse {
  traineeId: number;   // معرف المتدرب
  nationalId: string;  // الرقم القومي
  name: string;        // اسم المتدرب (بالعربية)
  hasAccount: boolean; // هل يوجد حساب مسجل مسبقاً
  phoneHint?: string;  // آخر رقمين من رقم الهاتف (للأمان)
}

// DTO للتحقق من رقم الهاتف
export interface VerifyPhoneDto {
  nationalId: string;  // الرقم القومي
  phone: string;       // رقم الهاتف
}

// استجابة التحقق من رقم الهاتف - حالة النجاح
export interface VerifyPhoneResponse {
  success: boolean;    // true في حالة النجاح
  message: string;     // رسالة التأكيد
}

// استجابة حالة الخطأ
export interface VerifyPhoneErrorResponse {
  statusCode: number;  // كود الخطأ (404 أو 400)
  message: string;     // رسالة الخطأ
  error: string;       // نوع الخطأ
}

// DTO لإنشاء كلمة مرور جديدة
export interface CreatePasswordDto {
  nationalId: string;  // الرقم القومي
  birthDate: string;   // تاريخ الميلاد (YYYY-MM-DD)
  password: string;    // كلمة المرور الجديدة (6 أحرف على الأقل، تحتوي على حروف وأرقام)
}

// استجابة إنشاء كلمة المرور - حالة النجاح
export interface CreatePasswordResponse {
  success: boolean;    // true في حالة النجاح
  message: string;     // رسالة التأكيد
}

// استجابة حالة الخطأ
export interface CreatePasswordErrorResponse {
  statusCode: number;      // كود الخطأ (404 أو 400)
  message: string | string[]; // رسالة الخطأ (قد تكون مصفوفة في حالة أخطاء التحقق)
  error: string;           // نوع الخطأ
}

// DTO لطلب إعادة تعيين كلمة المرور
export interface RequestPasswordResetDto {
  nationalId: string;  // الرقم القومي
}

// استجابة طلب إعادة تعيين كلمة المرور
export interface RequestPasswordResetResponse {
  message: string;     // رسالة تأكيد إرسال الكود
  phoneHint: string;   // تلميح رقم الهاتف المرسل إليه الكود
}

// DTO للتحقق من كود إعادة التعيين
export interface VerifyResetCodeDto {
  nationalId: string;  // الرقم القومي
  resetCode: string;   // كود إعادة التعيين (6 أرقام)
}

// استجابة التحقق من كود إعادة التعيين
export interface VerifyResetCodeResponse {
  verified: boolean;   // هل الكود صحيح
  message: string;     // رسالة التأكيد
  token?: string;      // توكن مؤقت لإعادة تعيين كلمة المرور
}

// DTO لإعادة تعيين كلمة المرور
export interface ResetPasswordDto {
  nationalId: string;  // الرقم القومي
  resetCode: string;   // كود إعادة التعيين
  newPassword: string; // كلمة المرور الجديدة
}

// استجابة إعادة تعيين كلمة المرور
export interface ResetPasswordResponse {
  message: string;     // رسالة تأكيد تغيير كلمة المرور
}

// DTO لتسجيل الدخول
export interface TraineeLoginDto {
  nationalId: string;  // الرقم القومي
  password: string;    // كلمة المرور
}

// نوع عام للاستجابات مع رسائل النجاح
export interface ApiSuccessResponse {
  message: string;
  data?: any;
}

// نوع عام للاستجابات مع الأخطاء
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}
