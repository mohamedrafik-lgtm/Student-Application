// ملف ترجمات مشترك لتجنب التكرار

// ترجمة أنواع الرسوم
export const getFeeTypeLabel = (type: string): string => {
  switch (type) {
    case 'TUITION': return 'دراسية';
    case 'SERVICES': return 'خدمات';
    case 'TRAINING': return 'تدريب';
    case 'ADDITIONAL': return 'إضافية';
    case 'ADMINISTRATIVE': return 'إدارية';
    case 'EXAM': return 'امتحان';
    case 'CERTIFICATE': return 'شهادة';
    case 'OTHER': return 'أخرى';
    default: return type;
  }
};

// ترجمة أنواع الرسوم مع كلمة "رسوم"
export const getFeeTypeFullLabel = (type: string): string => {
  switch (type) {
    case 'TUITION': return 'رسوم دراسية';
    case 'SERVICES': return 'رسوم خدمات';
    case 'TRAINING': return 'رسوم تدريب';
    case 'ADDITIONAL': return 'رسوم إضافية';
    case 'ADMINISTRATIVE': return 'رسوم إدارية';
    case 'EXAM': return 'رسوم امتحان';
    case 'CERTIFICATE': return 'رسوم شهادة';
    case 'OTHER': return 'رسوم أخرى';
    default: return `رسوم ${type}`;
  }
};

// ترجمة حالة الدفع
export const getPaymentStatusLabel = (status: string): string => {
  switch (status) {
    case 'PENDING': return 'في الانتظار';
    case 'PAID': return 'مدفوع';
    case 'PARTIALLY_PAID': return 'مدفوع جزئياً';
    case 'CANCELLED': return 'ملغي';
    default: return status;
  }
};

// ترجمة النوع الجنس
export const getGenderLabel = (gender: string): string => {
  switch (gender) {
    case 'MALE': return 'ذكر';
    case 'FEMALE': return 'أنثى';
    default: return gender;
  }
};

// ترجمة نوع البرنامج
export const getProgramTypeLabel = (type: string): string => {
  switch (type) {
    case 'SUMMER': return 'صيفي';
    case 'WINTER': return 'شتوي';
    case 'ANNUAL': return 'سنوي';
    default: return type;
  }
};

// ترجمة حالة المتدرب
export const getTraineeStatusLabel = (status: string): string => {
  switch (status) {
    case 'NEW': return 'مستجد';
    case 'CURRENT': return 'مستمر';
    case 'GRADUATE': return 'خريج';
    case 'WITHDRAWN': return 'منسحب';
    default: return status;
  }
};

// ترجمة السنة الدراسية
export const getYearLabel = (year: string): string => {
  switch (year) {
    case 'FIRST': return 'الأولى';
    case 'SECOND': return 'الثانية';
    case 'THIRD': return 'الثالثة';
    case 'FOURTH': return 'الرابعة';
    default: return year;
  }
};
