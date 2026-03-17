export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  MARKETER = 'MARKETER',
}

export enum AccountType {
  EXPENSE = 'EXPENSE',
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  INCOME = 'INCOME',
}

export enum FeeType {
  TUITION = 'TUITION',       // مصروفات دراسية
  SERVICES = 'SERVICES',      // خدمات
  TRAINING = 'TRAINING',      // مصروفات دورات تدريبية
  ADDITIONAL = 'ADDITIONAL',    // مصروفات إضافية
}

export enum Year {
  FIRST = 'FIRST',  // السنة الأولى
  SECOND = 'SECOND', // السنة الثانية
  THIRD = 'THIRD',  // السنة الثالثة
  FOURTH = 'FOURTH', // السنة الرابعة
} 