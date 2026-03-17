import * as z from "zod";

export const formSchema = z.object({
  nameAr: z.string().min(3, "الاسم بالعربية يجب أن يكون 3 أحرف على الأقل"),
  nameEn: z.string().min(3, "الاسم بالإنجليزية يجب أن يكون 3 أحرف على الأقل"),
  enrollmentType: z.enum(["REGULAR", "DISTANCE", "BOTH"]),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]),
  nationalId: z.string().length(14, "الرقم القومي يجب أن يكون 14 رقم"),
  idIssueDate: z.string(),
  idExpiryDate: z.string(),
  programType: z.enum(["SUMMER", "WINTER", "ANNUAL"]),
  nationality: z.string().min(2, "الجنسية يجب أن تكون حرفين على الأقل"),
  gender: z.enum(["MALE", "FEMALE"]),
  birthDate: z.string(),
  residenceAddress: z.string().min(1, "محل الإقامة مطلوب"),
  photoUrl: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
  religion: z.enum(["ISLAM", "CHRISTIANITY", "JUDAISM"]),
  programId: z.preprocess((val) => val ? Number(val) : null, z.number().nullable()),
  country: z.string().min(2, "الدولة يجب أن تكون حرفين على الأقل"),
  governorate: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
  city: z.string().min(2, "المدينة يجب أن تكون حرفين على الأقل"),
  address: z.string().min(1, "العنوان مطلوب"),
  phone: z.string().min(11, "رقم الهاتف يجب أن يكون 11 رقم على الأقل"),
  email: z.preprocess(
    (val) => val === null || val === undefined ? '' : val,
    z.string().refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "البريد الإلكتروني غير صالح"
    }).optional()
  ),
  guardianPhone: z.string().min(11, "رقم هاتف ولي الأمر يجب أن يكون 11 رقم على الأقل"),
  guardianEmail: z.preprocess(
    (val) => val === null || val === undefined ? '' : val,
    z.string().refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "البريد الإلكتروني لولي الأمر غير صالح"
    }).optional()
  ),
  guardianJob: z.preprocess(
    (val) => val === null || val === undefined ? '' : val,
    z.string().refine((val) => !val || val.length >= 3, {
      message: "وظيفة ولي الأمر يجب أن تكون 3 أحرف على الأقل"
    }).optional()
  ),
  guardianRelation: z.string().min(2, "صلة القرابة يجب أن تكون حرفين على الأقل"),
  guardianName: z.string().min(2, "اسم ولي الأمر مطلوب ويجب أن يكون حرفين على الأقل"),
  landline: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
  whatsapp: z.string().min(11, "رقم واتساب مطلوب ويجب أن يكون 11 رقم على الأقل"),
  facebook: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
  educationType: z.enum([
    "PREPARATORY",
    "INDUSTRIAL_SECONDARY",
    "COMMERCIAL_SECONDARY",
    "AGRICULTURAL_SECONDARY",
    "AZHAR_SECONDARY",
    "GENERAL_SECONDARY",
    "UNIVERSITY",
    "INDUSTRIAL_APPRENTICESHIP"
  ]),
  schoolName: z.string().min(3, "اسم المدرسة/المعهد يجب أن يكون 3 أحرف على الأقل"),
  educationalAdministration: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
  graduationDate: z.string(),
  totalGrade: z.preprocess((val) => val || null, z.number().nullable()),
  gradePercentage: z.preprocess((val) => val || null, z.number().nullable()),
  academicYear: z.preprocess((val) => val === null || val === undefined ? '' : val, z.string().optional()),
  status: z.enum(["FRESHMAN", "GRADUATE"]).optional(),
});

export type FormData = z.infer<typeof formSchema>; 