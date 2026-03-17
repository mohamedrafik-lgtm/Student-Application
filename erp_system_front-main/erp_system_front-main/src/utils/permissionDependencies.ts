// نظام ترابط الصلاحيات - تحديد الصلاحيات المطلوبة لكل صلاحية

export interface PermissionDependency {
  permission: string; // الصلاحية الرئيسية
  requires: string[]; // الصلاحيات المطلوبة
  implies: string[]; // الصلاحيات التي تُمنح تلقائياً
}

// قواعد ترابط الصلاحيات
export const PERMISSION_DEPENDENCIES: PermissionDependency[] = [
  // =============== إدارة المستخدمين ===============
  {
    permission: 'dashboard.users.create',
    requires: ['dashboard.users.view'],
    implies: ['dashboard.users.view']
  },
  {
    permission: 'dashboard.users.edit',
    requires: ['dashboard.users.view'],
    implies: ['dashboard.users.view']
  },
  {
    permission: 'dashboard.users.delete',
    requires: ['dashboard.users.view', 'dashboard.users.edit'],
    implies: ['dashboard.users.view']
  },

  // =============== إدارة المتدربين ===============
  {
    permission: 'dashboard.trainees.create',
    requires: ['dashboard.trainees.view'],
    implies: ['dashboard.trainees.view']
  },
  {
    permission: 'dashboard.trainees.edit',
    requires: ['dashboard.trainees.view'],
    implies: ['dashboard.trainees.view']
  },
  {
    permission: 'dashboard.trainees.delete',
    requires: ['dashboard.trainees.view', 'dashboard.trainees.edit'],
    implies: ['dashboard.trainees.view']
  },

  // =============== إدارة البرامج التدريبية ===============
  {
    permission: 'dashboard.programs.create',
    requires: ['dashboard.programs.view'],
    implies: ['dashboard.programs.view']
  },
  {
    permission: 'dashboard.programs.edit',
    requires: ['dashboard.programs.view'],
    implies: ['dashboard.programs.view']
  },
  {
    permission: 'dashboard.programs.delete',
    requires: ['dashboard.programs.view', 'dashboard.programs.edit'],
    implies: ['dashboard.programs.view']
  },

  // =============== إدارة الأخبار ===============
  {
    permission: 'dashboard.news.create',
    requires: ['dashboard.news.view'],
    implies: ['dashboard.news.view']
  },
  {
    permission: 'dashboard.news.edit',
    requires: ['dashboard.news.view'],
    implies: ['dashboard.news.view']
  },
  {
    permission: 'dashboard.news.delete',
    requires: ['dashboard.news.view', 'dashboard.news.edit'],
    implies: ['dashboard.news.view']
  },

  // =============== إدارة الوظائف ===============
  {
    permission: 'dashboard.jobs.create',
    requires: ['dashboard.jobs.view'],
    implies: ['dashboard.jobs.view']
  },
  {
    permission: 'dashboard.jobs.edit',
    requires: ['dashboard.jobs.view'],
    implies: ['dashboard.jobs.view']
  },
  {
    permission: 'dashboard.jobs.delete',
    requires: ['dashboard.jobs.view', 'dashboard.jobs.edit'],
    implies: ['dashboard.jobs.view']
  },

  // =============== إدارة التسجيلات ===============
  {
    permission: 'dashboard.registrations.create',
    requires: ['dashboard.registrations.view'],
    implies: ['dashboard.registrations.view']
  },
  {
    permission: 'dashboard.registrations.edit',
    requires: ['dashboard.registrations.view'],
    implies: ['dashboard.registrations.view']
  },
  {
    permission: 'dashboard.registrations.delete',
    requires: ['dashboard.registrations.view', 'dashboard.registrations.edit'],
    implies: ['dashboard.registrations.view']
  },

  // =============== إدارة الحضور ===============
  {
    permission: 'dashboard.attendance.create',
    requires: ['dashboard.attendance.view', 'dashboard.trainees.view'],
    implies: ['dashboard.attendance.view', 'dashboard.trainees.view']
  },
  {
    permission: 'dashboard.attendance.edit',
    requires: ['dashboard.attendance.view', 'dashboard.trainees.view'],
    implies: ['dashboard.attendance.view', 'dashboard.trainees.view']
  },
  {
    permission: 'dashboard.attendance.delete',
    requires: ['dashboard.attendance.view', 'dashboard.attendance.edit'],
    implies: ['dashboard.attendance.view']
  },

  // =============== إدارة بنك الأسئلة ===============
  {
    permission: 'dashboard.questions.create',
    requires: ['dashboard.questions.view'],
    implies: ['dashboard.questions.view']
  },
  {
    permission: 'dashboard.questions.edit',
    requires: ['dashboard.questions.view'],
    implies: ['dashboard.questions.view']
  },
  {
    permission: 'dashboard.questions.delete',
    requires: ['dashboard.questions.view', 'dashboard.questions.edit'],
    implies: ['dashboard.questions.view']
  },

  // =============== إدارة المحتوى التدريبي ===============
  {
    permission: 'dashboard.training-content.create',
    requires: ['dashboard.training-content.view', 'dashboard.programs.view'],
    implies: ['dashboard.training-content.view', 'dashboard.programs.view']
  },
  {
    permission: 'dashboard.training-content.edit',
    requires: ['dashboard.training-content.view', 'dashboard.programs.view'],
    implies: ['dashboard.training-content.view', 'dashboard.programs.view']
  },
  {
    permission: 'dashboard.training-content.delete',
    requires: ['dashboard.training-content.view', 'dashboard.training-content.edit'],
    implies: ['dashboard.training-content.view']
  },

  // =============== إدارة المالية ===============
  {
    permission: 'dashboard.finances.create',
    requires: ['dashboard.finances.view'],
    implies: ['dashboard.finances.view']
  },
  {
    permission: 'dashboard.finances.edit',
    requires: ['dashboard.finances.view'],
    implies: ['dashboard.finances.view']
  },
  {
    permission: 'dashboard.finances.delete',
    requires: ['dashboard.finances.view', 'dashboard.finances.edit'],
    implies: ['dashboard.finances.view']
  },

  // =============== إدارة التسويق ===============
  {
    permission: 'dashboard.marketing.create',
    requires: ['dashboard.marketing.view'],
    implies: ['dashboard.marketing.view']
  },
  {
    permission: 'dashboard.marketing.edit',
    requires: ['dashboard.marketing.view'],
    implies: ['dashboard.marketing.view']
  },
  {
    permission: 'dashboard.marketing.delete',
    requires: ['dashboard.marketing.view', 'dashboard.marketing.edit'],
    implies: ['dashboard.marketing.view']
  },
  {
    permission: 'dashboard.marketing.assign',
    requires: ['dashboard.marketing.view', 'dashboard.trainees.view'],
    implies: ['dashboard.marketing.view', 'dashboard.trainees.view']
  },
  {
    permission: 'dashboard.marketing.targets',
    requires: ['dashboard.marketing.view'],
    implies: ['dashboard.marketing.view']
  },
  {
    permission: 'dashboard.marketing.stats',
    requires: ['dashboard.marketing.view'],
    implies: ['dashboard.marketing.view']
  },

  // =============== إدارة الصلاحيات ===============
  {
    permission: 'dashboard.permissions.manage',
    requires: ['dashboard.permissions.view', 'dashboard.users.view'],
    implies: ['dashboard.permissions.view', 'dashboard.users.view']
  },

  // =============== إدارة WhatsApp ===============
  {
    permission: 'dashboard.whatsapp.send',
    requires: ['dashboard.whatsapp.view'],
    implies: ['dashboard.whatsapp.view']
  },

  // =============== رفع الملفات ===============
  {
    permission: 'dashboard.upload.manage',
    requires: ['dashboard.upload.view'],
    implies: ['dashboard.upload.view']
  },

  // =============== صلاحيات متقدمة ===============
  {
    permission: 'dashboard.admin',
    requires: [],
    implies: [
      'dashboard.users.view', 'dashboard.users.create', 'dashboard.users.edit',
      'dashboard.trainees.view', 'dashboard.trainees.create', 'dashboard.trainees.edit',
      'dashboard.programs.view', 'dashboard.programs.create', 'dashboard.programs.edit',
      'dashboard.permissions.view', 'dashboard.permissions.manage'
    ]
  },

  // =============== صلاحيات المدرب ===============
  {
    permission: 'dashboard.instructor',
    requires: [],
    implies: [
      'dashboard.trainees.view', 'dashboard.trainees.edit',
      'dashboard.programs.view',
      'dashboard.attendance.view', 'dashboard.attendance.create', 'dashboard.attendance.edit',
      'dashboard.training-content.view', 'dashboard.training-content.create', 'dashboard.training-content.edit',
      'dashboard.questions.view', 'dashboard.questions.create', 'dashboard.questions.edit'
    ]
  },

  // =============== صلاحيات موظف التسويق ===============
  {
    permission: 'dashboard.marketing.employee',
    requires: [],
    implies: [
      'dashboard.trainees.view', 'dashboard.trainees.create', 'dashboard.trainees.edit',
      'dashboard.programs.view',
      'dashboard.marketing.view', 'dashboard.marketing.assign',
      'dashboard.registrations.view', 'dashboard.registrations.create', 'dashboard.registrations.edit'
    ]
  },

  // =============== صلاحيات مدير التسويق ===============
  {
    permission: 'dashboard.marketing.manager',
    requires: [],
    implies: [
      'dashboard.trainees.view', 'dashboard.trainees.create', 'dashboard.trainees.edit',
      'dashboard.programs.view', 'dashboard.programs.create', 'dashboard.programs.edit',
      'dashboard.marketing.view', 'dashboard.marketing.create', 'dashboard.marketing.edit',
      'dashboard.marketing.assign', 'dashboard.marketing.targets', 'dashboard.marketing.stats',
      'dashboard.registrations.view', 'dashboard.registrations.create', 'dashboard.registrations.edit',
      'dashboard.users.view'
    ]
  },

  // =============== صلاحيات موظف إدخال المتدربين ===============
  {
    permission: 'dashboard.trainee.entry.clerk',
    requires: [],
    implies: [
      'dashboard.trainees.view', 'dashboard.trainees.create',
      'dashboard.programs.view'
    ]
  }
];

// دالة للحصول على الصلاحيات المطلوبة لصلاحية معينة
export function getRequiredPermissions(permission: string): string[] {
  const dependency = PERMISSION_DEPENDENCIES.find(dep => dep.permission === permission);
  return dependency?.requires || [];
}

// دالة للحصول على الصلاحيات التي تُمنح تلقائياً عند منح صلاحية معينة
export function getImpliedPermissions(permission: string): string[] {
  const dependency = PERMISSION_DEPENDENCIES.find(dep => dep.permission === permission);
  return dependency?.implies || [];
}

// دالة للحصول على جميع الصلاحيات المترابطة (مطلوبة + مُضمنة)
export function getAllRelatedPermissions(permission: string): string[] {
  const required = getRequiredPermissions(permission);
  const implied = getImpliedPermissions(permission);
  
  // إزالة التكرارات
  return Array.from(new Set([...required, ...implied, permission]));
}

// دالة لحساب الصلاحيات النهائية بعد تطبيق قواعد الترابط
export function calculateFinalPermissions(selectedPermissions: string[]): string[] {
  const finalPermissions = new Set<string>();
  
  // إضافة الصلاحيات المحددة
  selectedPermissions.forEach(permission => {
    finalPermissions.add(permission);
    
    // إضافة الصلاحيات المُضمنة
    const implied = getImpliedPermissions(permission);
    implied.forEach(impliedPerm => finalPermissions.add(impliedPerm));
  });
  
  return Array.from(finalPermissions);
}

// دالة للتحقق من صحة الصلاحيات (التأكد من وجود الصلاحيات المطلوبة)
export function validatePermissions(selectedPermissions: string[]): {
  isValid: boolean;
  missingPermissions: string[];
  suggestions: string[];
} {
  const missingPermissions: string[] = [];
  const suggestions: string[] = [];
  
  selectedPermissions.forEach(permission => {
    const required = getRequiredPermissions(permission);
    
    required.forEach(requiredPerm => {
      if (!selectedPermissions.includes(requiredPerm)) {
        missingPermissions.push(requiredPerm);
        suggestions.push(`لاستخدام "${permission}" تحتاج إلى "${requiredPerm}"`);
      }
    });
  });
  
  return {
    isValid: missingPermissions.length === 0,
    missingPermissions: Array.from(new Set(missingPermissions)),
    suggestions: Array.from(new Set(suggestions))
  };
}
