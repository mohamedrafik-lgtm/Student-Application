export enum SafeCategory {
  DEBT = 'DEBT',                // خزائن مديونية
  INCOME = 'INCOME',            // خزائن دخل
  EXPENSE = 'EXPENSE',          // خزائن مصروفات
  ASSETS = 'ASSETS',            // خزائن أصول
  UNSPECIFIED = 'UNSPECIFIED'   // غير محدد (للخزائن القديمة)
}

export const SAFE_CATEGORY_LABELS: Record<SafeCategory, string> = {
  [SafeCategory.DEBT]: 'خزائن مديونية',
  [SafeCategory.INCOME]: 'خزائن دخل',
  [SafeCategory.EXPENSE]: 'خزائن مصروفات',
  [SafeCategory.ASSETS]: 'خزائن أصول',
  [SafeCategory.UNSPECIFIED]: 'غير محدد'
};
