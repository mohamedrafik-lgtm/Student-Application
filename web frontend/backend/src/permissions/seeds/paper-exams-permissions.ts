// صلاحيات نظام الاختبارات الورقية

export const paperExamsPermissions = [
  // عرض الاختبارات الورقية
  {
    resource: 'dashboard.paper-exams',
    action: 'view',
    displayName: 'عرض الاختبارات الورقية',
    description: 'القدرة على عرض قائمة الاختبارات الورقية وتفاصيلها',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // إنشاء اختبارات ورقية
  {
    resource: 'dashboard.paper-exams',
    action: 'create',
    displayName: 'إنشاء اختبارات ورقية',
    description: 'القدرة على إنشاء اختبارات ورقية جديدة ونماذج أسئلة',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // تعديل الاختبارات الورقية
  {
    resource: 'dashboard.paper-exams',
    action: 'edit',
    displayName: 'تعديل الاختبارات الورقية',
    description: 'القدرة على تعديل معلومات الاختبارات الورقية',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // حذف الاختبارات الورقية
  {
    resource: 'dashboard.paper-exams',
    action: 'delete',
    displayName: 'حذف الاختبارات الورقية',
    description: 'القدرة على حذف الاختبارات الورقية',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // تصحيح الاختبارات
  {
    resource: 'dashboard.paper-exams',
    action: 'grade',
    displayName: 'تصحيح الاختبارات الورقية',
    description: 'القدرة على تصحيح أوراق الإجابة بالكاميرا',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // توليد أوراق الإجابة
  {
    resource: 'dashboard.paper-exams',
    action: 'generate_sheets',
    displayName: 'توليد أوراق الإجابة',
    description: 'القدرة على توليد أوراق الإجابة لجميع المتدربين',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // طباعة نماذج الأسئلة
  {
    resource: 'dashboard.paper-exams',
    action: 'print_questions',
    displayName: 'طباعة نماذج الأسئلة',
    description: 'القدرة على طباعة نماذج الأسئلة',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // طباعة أوراق الإجابة
  {
    resource: 'dashboard.paper-exams',
    action: 'print_answer_sheets',
    displayName: 'طباعة أوراق الإجابة',
    description: 'القدرة على طباعة أوراق الإجابة',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
  
  // عرض التقارير
  {
    resource: 'dashboard.paper-exams',
    action: 'view_reports',
    displayName: 'عرض تقارير الاختبارات الورقية',
    description: 'القدرة على عرض تقارير النتائج والإحصائيات',
    category: 'إدارة الاختبارات',
    isSystem: false,
  },
];