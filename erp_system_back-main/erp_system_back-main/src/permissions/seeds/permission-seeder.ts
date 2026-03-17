import { PrismaService } from '../../prisma/prisma.service';
import { paperExamsPermissions } from './paper-exams-permissions';

export class PermissionSeeder {
  constructor(private prisma: PrismaService) {}

  async seedBasicPermissions() {
    console.log('🌱 إنشاء الصلاحيات الأساسية...');

    const permissions = [
      // إدارة المستخدمين
      {
        resource: 'dashboard.users',
        action: 'view',
        displayName: 'عرض المستخدمين',
        description: 'عرض قائمة المستخدمين',
        category: 'إدارة المستخدمين',
      },
      {
        resource: 'dashboard.users',
        action: 'create',
        displayName: 'إضافة مستخدمين',
        description: 'إضافة مستخدمين جدد',
        category: 'إدارة المستخدمين',
      },
      {
        resource: 'dashboard.users',
        action: 'edit',
        displayName: 'تعديل المستخدمين',
        description: 'تعديل بيانات المستخدمين',
        category: 'إدارة المستخدمين',
      },
      {
        resource: 'dashboard.users',
        action: 'delete',
        displayName: 'حذف المستخدمين',
        description: 'حذف المستخدمين',
        category: 'إدارة المستخدمين',
      },

      // إدارة المتدربين
      {
        resource: 'dashboard.trainees',
        action: 'view',
        displayName: 'عرض المتدربين',
        description: 'عرض قائمة المتدربين',
        category: 'إدارة المتدربين',
      },
      {
        resource: 'dashboard.trainees',
        action: 'create',
        displayName: 'إضافة متدربين',
        description: 'إضافة متدربين جدد',
        category: 'إدارة المتدربين',
      },
      {
        resource: 'dashboard.trainees',
        action: 'edit',
        displayName: 'تعديل المتدربين',
        description: 'تعديل بيانات المتدربين',
        category: 'إدارة المتدربين',
      },
      {
        resource: 'dashboard.trainees',
        action: 'delete',
        displayName: 'حذف المتدربين',
        description: 'حذف المتدربين',
        category: 'إدارة المتدربين',
      },
      {
        resource: 'dashboard.trainees',
        action: 'export',
        displayName: 'تصدير المتدربين',
        description: 'تصدير قائمة المتدربين',
        category: 'إدارة المتدربين',
      },

      // إدارة البرامج التدريبية
      {
        resource: 'dashboard.programs',
        action: 'view',
        displayName: 'عرض البرامج التدريبية',
        description: 'عرض قائمة البرامج التدريبية',
        category: 'إدارة البرامج',
      },
      {
        resource: 'dashboard.programs',
        action: 'create',
        displayName: 'إضافة برامج تدريبية',
        description: 'إضافة برامج تدريبية جديدة',
        category: 'إدارة البرامج',
      },
      {
        resource: 'dashboard.programs',
        action: 'edit',
        displayName: 'تعديل البرامج التدريبية',
        description: 'تعديل البرامج التدريبية',
        category: 'إدارة البرامج',
      },
      {
        resource: 'dashboard.programs',
        action: 'delete',
        displayName: 'حذف البرامج التدريبية',
        description: 'حذف البرامج التدريبية',
        category: 'إدارة البرامج',
      },

      // إدارة المحتوى التدريبي
      {
        resource: 'dashboard.training-contents',
        action: 'view',
        displayName: 'عرض المحتوى التدريبي',
        description: 'عرض قائمة المحتوى التدريبي',
        category: 'المحتوى التدريبي',
      },
      {
        resource: 'dashboard.training-contents',
        action: 'create',
        displayName: 'إضافة محتوى تدريبي',
        description: 'إضافة محتوى تدريبي جديد',
        category: 'المحتوى التدريبي',
      },
      {
        resource: 'dashboard.training-contents',
        action: 'edit',
        displayName: 'تعديل المحتوى التدريبي',
        description: 'تعديل المحتوى التدريبي',
        category: 'المحتوى التدريبي',
      },
      {
        resource: 'dashboard.training-contents',
        action: 'delete',
        displayName: 'حذف المحتوى التدريبي',
        description: 'حذف المحتوى التدريبي',
        category: 'المحتوى التدريبي',
      },

      // بنك الأسئلة
      {
        resource: 'dashboard.questions',
        action: 'view',
        displayName: 'عرض بنك الأسئلة',
        description: 'عرض بنك الأسئلة',
        category: 'بنك الأسئلة',
      },
      {
        resource: 'dashboard.questions',
        action: 'create',
        displayName: 'إضافة أسئلة',
        description: 'إضافة أسئلة جديدة',
        category: 'بنك الأسئلة',
      },
      {
        resource: 'dashboard.questions',
        action: 'edit',
        displayName: 'تعديل الأسئلة',
        description: 'تعديل الأسئلة',
        category: 'بنك الأسئلة',
      },
      {
        resource: 'dashboard.questions',
        action: 'delete',
        displayName: 'حذف الأسئلة',
        description: 'حذف الأسئلة',
        category: 'بنك الأسئلة',
      },

      // إدارة الحضور والغياب
      {
        resource: 'dashboard.attendance',
        action: 'view',
        displayName: 'عرض الحضور والغياب',
        description: 'عرض سجلات الحضور والغياب',
        category: 'الحضور والغياب',
      },
      {
        resource: 'dashboard.attendance',
        action: 'create',
        displayName: 'تسجيل الحضور',
        description: 'تسجيل حضور المتدربين',
        category: 'الحضور والغياب',
      },
      {
        resource: 'dashboard.attendance',
        action: 'edit',
        displayName: 'تعديل الحضور',
        description: 'تعديل سجلات الحضور',
        category: 'الحضور والغياب',
      },

      // النظام المالي
      {
        resource: 'dashboard.financial',
        action: 'view',
        displayName: 'عرض النظام المالي',
        description: 'عرض البيانات المالية',
        category: 'النظام المالي',
      },
      {
        resource: 'dashboard.financial',
        action: 'manage',
        displayName: 'إدارة النظام المالي',
        description: 'إدارة المعاملات المالية',
        category: 'النظام المالي',
      },
      {
        resource: 'dashboard.financial.payment-schedules',
        action: 'view',
        displayName: 'عرض مواعيد سداد الرسوم',
        description: 'عرض صفحة مواعيد سداد الرسوم',
        category: 'النظام المالي',
      },
      {
        resource: 'dashboard.financial.payment-schedules',
        action: 'manage',
        displayName: 'إدارة مواعيد سداد الرسوم',
        description: 'إنشاء وتعديل مواعيد سداد الرسوم والإجراءات',
        category: 'النظام المالي',
      },

      // التقارير
      {
        resource: 'dashboard.reports',
        action: 'view',
        displayName: 'عرض التقارير',
        description: 'عرض التقارير',
        category: 'التقارير',
      },
      {
        resource: 'dashboard.reports',
        action: 'export',
        displayName: 'تصدير التقارير',
        description: 'تصدير التقارير',
        category: 'التقارير',
      },

      // إدارة الإعدادات
      {
        resource: 'dashboard.settings',
        action: 'view',
        displayName: 'عرض الإعدادات',
        description: 'عرض إعدادات النظام',
        category: 'إدارة النظام',
      },
      {
        resource: 'dashboard.settings',
        action: 'edit',
        displayName: 'تعديل الإعدادات',
        description: 'تعديل إعدادات النظام',
        category: 'إدارة النظام',
      },

      // سجل الأنشطة
      {
        resource: 'dashboard.audit-logs',
        action: 'view',
        displayName: 'عرض سجل الأنشطة',
        description: 'عرض سجل أنشطة النظام',
        category: 'إدارة النظام',
      },

      // إدارة الصلاحيات
      {
        resource: 'dashboard.permissions',
        action: 'view',
        displayName: 'عرض الصلاحيات',
        description: 'عرض الأدوار والصلاحيات',
        category: 'إدارة النظام',
        isSystem: true,
      },
      {
        resource: 'dashboard.permissions',
        action: 'manage',
        displayName: 'إدارة الصلاحيات',
        description: 'إدارة الأدوار والصلاحيات',
        category: 'إدارة النظام',
        isSystem: true,
      },

      // إعدادات المطورين
      {
        resource: 'dashboard.developer-settings',
        action: 'view',
        displayName: 'عرض إعدادات المطورين',
        description: 'عرض إعدادات النظام للمطورين',
        category: 'إدارة النظام',
        isSystem: true,
      },
      {
        resource: 'dashboard.developer-settings',
        action: 'manage',
        displayName: 'إدارة إعدادات المطورين',
        description: 'إدارة إعدادات النظام للمطورين',
        category: 'إدارة النظام',
        isSystem: true,
      },

      // إدارة التسويق
      {
        resource: 'marketing.employees',
        action: 'view',
        displayName: 'عرض موظفي التسويق',
        description: 'عرض قائمة موظفي التسويق',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.employees',
        action: 'create',
        displayName: 'إضافة موظفي تسويق',
        description: 'إضافة موظفي تسويق جدد',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.employees',
        action: 'edit',
        displayName: 'تعديل موظفي التسويق',
        description: 'تعديل بيانات موظفي التسويق',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.employees',
        action: 'delete',
        displayName: 'حذف موظفي التسويق',
        description: 'حذف موظفي التسويق',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.targets',
        action: 'view',
        displayName: 'عرض أهداف التسويق',
        description: 'عرض أهداف التسويق الشهرية',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.targets',
        action: 'create',
        displayName: 'تحديد أهداف التسويق',
        description: 'تحديد أهداف التسويق الشهرية',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.targets',
        action: 'edit',
        displayName: 'تعديل أهداف التسويق',
        description: 'تعديل أهداف التسويق الشهرية',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.targets',
        action: 'delete',
        displayName: 'حذف أهداف التسويق',
        description: 'حذف أهداف التسويق الشهرية',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.applications',
        action: 'view',
        displayName: 'عرض تقديمات التسويق',
        description: 'عرض تقديمات العملاء المحتملين',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.applications',
        action: 'create',
        displayName: 'إضافة تقديمات تسويق',
        description: 'إضافة تقديمات عملاء محتملين جدد',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.applications',
        action: 'edit',
        displayName: 'تعديل تقديمات التسويق',
        description: 'تعديل تقديمات العملاء المحتملين',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.applications',
        action: 'delete',
        displayName: 'حذف تقديمات التسويق',
        description: 'حذف تقديمات العملاء المحتملين',
        category: 'إدارة التسويق',
      },
      {
        resource: 'marketing.stats',
        action: 'view',
        displayName: 'عرض إحصائيات التسويق',
        description: 'عرض إحصائيات أداء التسويق',
        category: 'إدارة التسويق',
      },

      // إدارة الأرشيف ووثائق المتدربين
      {
        resource: 'dashboard.archive',
        action: 'view',
        displayName: 'عرض الأرشيف',
        description: 'عرض أرشيف وثائق المتدربين',
        category: 'إدارة الأرشيف',
      },
      {
        resource: 'dashboard.archive',
        action: 'create',
        displayName: 'إضافة وثائق للأرشيف',
        description: 'رفع وإضافة وثائق جديدة للأرشيف',
        category: 'إدارة الأرشيف',
      },
      {
        resource: 'dashboard.archive',
        action: 'edit',
        displayName: 'تعديل وثائق الأرشيف',
        description: 'تعديل وثائق الأرشيف',
        category: 'إدارة الأرشيف',
      },
      {
        resource: 'dashboard.archive',
        action: 'download',
        displayName: 'تحميل وثائق الأرشيف',
        description: 'تحميل وثائق من الأرشيف',
        category: 'إدارة الأرشيف',
      },
      {
        resource: 'dashboard.archive',
        action: 'delete',
        displayName: 'حذف وثائق الأرشيف',
        description: 'حذف وثائق من الأرشيف',
        category: 'إدارة الأرشيف',
      },
      {
        resource: 'dashboard.archive',
        action: 'verify',
        displayName: 'التحقق من وثائق المتدربين',
        description: 'التحقق من صحة وثائق المتدربين',
        category: 'إدارة الأرشيف',
      },

      // إدارة العمولات
      {
        resource: 'commissions',
        action: 'create',
        displayName: 'إنشاء العمولات',
        description: 'إنشاء عمولات جديدة للمسوقين',
        category: 'إدارة العمولات',
      },
      {
        resource: 'commissions',
        action: 'read',
        displayName: 'عرض العمولات',
        description: 'عرض قائمة العمولات والإحصائيات',
        category: 'إدارة العمولات',
      },
      {
        resource: 'commissions',
        action: 'update',
        displayName: 'تعديل العمولات',
        description: 'تعديل بيانات العمولات',
        category: 'إدارة العمولات',
      },
      {
        resource: 'commissions',
        action: 'delete',
        displayName: 'حذف العمولات',
        description: 'حذف العمولات',
        category: 'إدارة العمولات',
      },
      {
        resource: 'commissions',
        action: 'payout',
        displayName: 'صرف العمولات',
        description: 'صرف العمولات للمسوقين',
        category: 'إدارة العمولات',
      },

      // إدارة طلبات التأجيل
      {
        resource: 'dashboard.deferral-requests',
        action: 'view',
        displayName: 'عرض طلبات التأجيل',
        description: 'عرض وقراءة طلبات تأجيل السداد المقدمة من المتدربين',
        category: 'إدارة الطلبات',
      },
      {
        resource: 'dashboard.deferral-requests',
        action: 'review',
        displayName: 'مراجعة طلبات التأجيل',
        description: 'قبول أو رفض طلبات تأجيل السداد',
        category: 'إدارة الطلبات',
      },
      {
        resource: 'dashboard.deferral-requests',
        action: 'delete',
        displayName: 'حذف طلبات التأجيل',
        description: 'حذف طلبات تأجيل السداد',
        category: 'إدارة الطلبات',
      },

      // إدارة الشكاوي والاقتراحات
      {
        resource: 'dashboard.complaints',
        action: 'view',
        displayName: 'عرض الشكاوي والاقتراحات',
        description: 'عرض الشكاوي والاقتراحات المقدمة من المتدربين',
        category: 'إدارة الطلبات',
      },
      {
        resource: 'dashboard.complaints',
        action: 'review',
        displayName: 'مراجعة الشكاوي والاقتراحات',
        description: 'الرد على الشكاوي والاقتراحات وتغيير حالتها',
        category: 'إدارة الطلبات',
      },
      {
        resource: 'dashboard.complaints',
        action: 'delete',
        displayName: 'حذف الشكاوي والاقتراحات',
        description: 'حذف الشكاوي والاقتراحات',
        category: 'إدارة الطلبات',
      },

      // إدارة رسائل التذكير التلقائية
      {
        resource: 'dashboard.automation.payment-reminders',
        action: 'view',
        displayName: 'عرض رسائل التذكير',
        description: 'عرض وقراءة رسائل التذكير التلقائية للرسوم',
        category: 'الأتمتة التلقائية',
        isSystem: false,
      },
      {
        resource: 'dashboard.automation.payment-reminders',
        action: 'manage',
        displayName: 'إدارة رسائل التذكير',
        description: 'إنشاء وتعديل وحذف رسائل التذكير التلقائية',
        category: 'الأتمتة التلقائية',
        isSystem: false,
      },
      
      // إضافة صلاحيات الاختبارات الورقية
      ...paperExamsPermissions,

      // ===== حضور الموظفين =====
      {
        resource: 'staff-attendance',
        action: 'view',
        displayName: 'عرض سجلات حضور الموظفين',
        description: 'عرض سجلات الحضور والغياب للموظفين',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance',
        action: 'manage',
        displayName: 'إدارة حضور الموظفين',
        description: 'تسجيل حضور يدوي وتعديل السجلات',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance.enrollments',
        action: 'view',
        displayName: 'عرض تسجيل الموظفين بالحضور',
        description: 'عرض قائمة الموظفين المسجلين في نظام الحضور',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance.enrollments',
        action: 'manage',
        displayName: 'إدارة تسجيل الموظفين بالحضور',
        description: 'إضافة وإزالة موظفين من نظام الحضور',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance.leaves',
        action: 'view',
        displayName: 'عرض طلبات الإجازات',
        description: 'عرض طلبات الإجازات المقدمة من الموظفين',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance.leaves',
        action: 'manage',
        displayName: 'إدارة طلبات الإجازات',
        description: 'قبول أو رفض طلبات الإجازات',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance.holidays',
        action: 'manage',
        displayName: 'إدارة العطلات الرسمية',
        description: 'إضافة وتعديل وحذف العطلات الرسمية',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance.settings',
        action: 'view',
        displayName: 'عرض إعدادات الحضور',
        description: 'عرض إعدادات نظام حضور الموظفين',
        category: 'حضور الموظفين',
      },
      {
        resource: 'staff-attendance.settings',
        action: 'manage',
        displayName: 'إدارة إعدادات الحضور',
        description: 'تعديل إعدادات ساعات العمل والموقع الجغرافي',
        category: 'حضور الموظفين',
      },
    ];

    console.log(`🔍 محاولة إنشاء ${permissions.length} صلاحية...`);

    const createdPermissions = [];
    for (const permission of permissions) {
      try {
        const created = await this.prisma.permission.upsert({
          where: {
            resource_action: {
              resource: permission.resource,
              action: permission.action,
            },
          },
          update: permission,
          create: permission,
        });
        createdPermissions.push(created);

        // تسجيل صلاحيات التسويق بشكل خاص
        if (permission.resource.startsWith('marketing')) {
          console.log(`✅ تم إنشاء صلاحية التسويق: ${permission.resource}.${permission.action}`);
        }
      } catch (error) {
        console.error(`❌ خطأ في إنشاء الصلاحية ${permission.resource}.${permission.action}:`, error.message);
      }
    }

    console.log(`✅ تم إنشاء ${createdPermissions.length} صلاحية من أصل ${permissions.length} صلاحية مطلوبة`);

    // فحص صلاحيات التسويق المُنشأة
    const marketingPermissionsCreated = createdPermissions.filter(p => p.resource.startsWith('marketing'));
    console.log(`🎯 صلاحيات التسويق المُنشأة: ${marketingPermissionsCreated.length}`);

    if (marketingPermissionsCreated.length === 0) {
      console.log('⚠️ لم يتم إنشاء أي صلاحيات تسويق!');
    }
    return createdPermissions;
  }

  async seedBasicRoles() {
    console.log('🌱 إنشاء الأدوار الأساسية...');

    const roles = [
      {
        name: 'super_admin',
        displayName: 'مدير النظام الرئيسي',
        description: 'يملك جميع الصلاحيات في النظام',
        color: '#DC2626',
        icon: 'FaUserShield',
        priority: 1000,
        isSystem: true,
      },
      {
        name: 'admin',
        displayName: 'مدير النظام',
        description: 'مدير النظام مع صلاحيات شاملة',
        color: '#7C3AED',
        icon: 'FaUserCog',
        priority: 900,
        isSystem: true,
      },
      {
        name: 'manager',
        displayName: 'مدير',
        description: 'مدير مع صلاحيات إدارية',
        color: '#059669',
        icon: 'FaUserTie',
        priority: 800,
      },
      {
        name: 'instructor',
        displayName: 'مدرس',
        description: 'مدرس مع صلاحيات المحتوى التدريبي',
        color: '#0891B2',
        icon: 'FaChalkboardTeacher',
        priority: 600,
      },
      {
        name: 'accountant',
        displayName: 'محاسب',
        description: 'محاسب مع صلاحيات النظام المالي',
        color: '#EA580C',
        icon: 'FaCalculator',
        priority: 500,
      },
      {
        name: 'marketing_manager',
        displayName: 'مدير التسويق',
        description: 'مدير التسويق مع صلاحيات إدارة التسويق',
        color: '#10B981',
        icon: 'FaBullhorn',
        priority: 450,
      },
      {
        name: 'trainee_data_entry',
        displayName: 'موظف إدخال متدربين',
        description: 'موظف مختص بإدخال وإدارة بيانات المتدربين والأرشيف',
        color: '#8B5CF6',
        icon: 'FaUserEdit',
        priority: 350,
      },
      {
        name: 'employee',
        displayName: 'موظف',
        description: 'موظف مع صلاحيات محدودة',
        color: '#6B7280',
        icon: 'FaUser',
        priority: 300,
      },
      {
        name: 'viewer',
        displayName: 'مشاهد',
        description: 'صلاحيات عرض فقط',
        color: '#9CA3AF',
        icon: 'FaEye',
        priority: 100,
      },
    ];

    const createdRoles = [];
    for (const role of roles) {
      try {
        const created = await this.prisma.role.upsert({
          where: { name: role.name },
          update: role,
          create: role,
        });
        createdRoles.push(created);
      } catch (error) {
        console.error(`خطأ في إنشاء الدور ${role.name}:`, error.message);
      }
    }

    console.log(`✅ تم إنشاء ${createdRoles.length} دور`);
    return createdRoles;
  }

  async assignPermissionsToRoles() {
    console.log('🌱 تعيين الصلاحيات للأدوار...');

    // الحصول على جميع الصلاحيات والأدوار
    const permissions = await this.prisma.permission.findMany();
    const roles = await this.prisma.role.findMany();

    const superAdminRole = roles.find(r => r.name === 'super_admin');
    const adminRole = roles.find(r => r.name === 'admin');
    const managerRole = roles.find(r => r.name === 'manager');
    const instructorRole = roles.find(r => r.name === 'instructor');
    const accountantRole = roles.find(r => r.name === 'accountant');
    const marketingManagerRole = roles.find(r => r.name === 'marketing_manager');
    const employeeRole = roles.find(r => r.name === 'employee');
    const viewerRole = roles.find(r => r.name === 'viewer');

    // تعيين جميع الصلاحيات لمدير النظام الرئيسي
    if (superAdminRole) {
      for (const permission of permissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين جميع الصلاحيات لدور ${superAdminRole.displayName}`);
    }

    // تعيين صلاحيات مدير النظام (كل شيء عدا إدارة الصلاحيات، ولكن مع إعدادات المطورين)
    if (adminRole) {
      const adminPermissions = permissions.filter(p =>
        (!p.resource.includes('permissions') ||
        p.resource.includes('payment-schedules') ||
        p.resource.includes('deferral-requests') ||
        p.resource.includes('complaints') ||
        p.resource.includes('payment-reminders') ||
        p.resource.includes('paper-exams')) ||
        p.resource.includes('developer-settings') // منح admin صلاحية الوصول لإعدادات المطورين
      );
      for (const permission of adminPermissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: adminRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين ${adminPermissions.length} صلاحية لدور ${adminRole.displayName}`);
    }

    // تعيين صلاحيات المدير
    if (managerRole) {
      const managerPermissions = permissions.filter(p =>
        p.resource.includes('trainees') ||
        p.resource.includes('programs') ||
        p.resource.includes('attendance') ||
        p.resource.includes('reports') ||
        p.resource.includes('payment-schedules') ||
        p.resource.includes('deferral-requests') ||
        (p.resource.includes('users') && p.action === 'view')
      );
      for (const permission of managerPermissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: managerRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: managerRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين ${managerPermissions.length} صلاحية لدور ${managerRole.displayName}`);
    }

    // تعيين صلاحيات المدرس
    if (instructorRole) {
      const instructorPermissions = permissions.filter(p =>
        p.resource.includes('training-contents') ||
        p.resource.includes('questions') ||
        p.resource.includes('attendance') ||
        p.resource.includes('paper-exams') ||
        p.resource.includes('quizzes') ||
        p.resource.includes('grades') ||
        (p.resource.includes('trainees') && p.action === 'view')
      );
      for (const permission of instructorPermissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: instructorRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: instructorRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين ${instructorPermissions.length} صلاحية لدور ${instructorRole.displayName}`);
    }

    // تعيين صلاحيات المحاسب
    if (accountantRole) {
      const accountantPermissions = permissions.filter(p => 
        p.resource.includes('financial') ||
        p.resource.includes('commissions') ||
        (p.resource.includes('trainees') && p.action === 'view') ||
        (p.resource.includes('reports') && p.action === 'view')
      );
      for (const permission of accountantPermissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: accountantRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: accountantRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين ${accountantPermissions.length} صلاحية لدور ${accountantRole.displayName}`);
    }

    // تعيين صلاحيات مدير التسويق
    if (marketingManagerRole) {
      const marketingPermissions = permissions.filter(p =>
        p.resource.includes('marketing') ||
        p.resource.includes('commissions') ||
        (p.resource.includes('trainees') && p.action === 'view') ||
        (p.resource.includes('reports') && p.action === 'view')
      );
      for (const permission of marketingPermissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: marketingManagerRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: marketingManagerRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين ${marketingPermissions.length} صلاحية لدور ${marketingManagerRole.displayName}`);
    }

    // تعيين صلاحيات الموظف
    if (employeeRole) {
      const employeePermissions = permissions.filter(p => 
        (p.resource.includes('trainees') && ['view', 'create', 'edit'].includes(p.action)) ||
        (p.resource.includes('attendance') && p.action === 'view')
      );
      for (const permission of employeePermissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: employeeRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: employeeRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين ${employeePermissions.length} صلاحية لدور ${employeeRole.displayName}`);
    }

    // تعيين صلاحيات المشاهد
    if (viewerRole) {
      const viewerPermissions = permissions.filter(p => p.action === 'view');
      for (const permission of viewerPermissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: viewerRole.id,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            roleId: viewerRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(`✅ تم تعيين ${viewerPermissions.length} صلاحية لدور ${viewerRole.displayName}`);
    }

    console.log('✅ تم تعيين الصلاحيات للأدوار بنجاح');
  }

  async assignSuperAdminRole() {
    console.log('🌱 تعيين دور مدير النظام الرئيسي للمستخدم الأول...');

    const superAdminRole = await this.prisma.role.findUnique({
      where: { name: 'super_admin' },
    });

    if (!superAdminRole) {
      console.error('❌ لم يتم العثور على دور مدير النظام الرئيسي');
      return;
    }

    // البحث عن المستخدم الأول (المدير الافتراضي)
    const firstUser = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!firstUser) {
      console.error('❌ لم يتم العثور على أي مستخدم في النظام');
      return;
    }

    // تعيين دور مدير النظام الرئيسي
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: firstUser.id,
          roleId: superAdminRole.id,
        },
      },
      update: { isActive: true },
      create: {
        userId: firstUser.id,
        roleId: superAdminRole.id,
        isActive: true,
      },
    });

    console.log(`✅ تم تعيين دور ${superAdminRole.displayName} للمستخدم ${firstUser.name}`);
  }

  async seed() {
    console.log('🚀 بدء إنشاء نظام الصلاحيات...');
    
    await this.seedBasicPermissions();
    await this.seedBasicRoles();
    await this.assignPermissionsToRoles();
    await this.assignSuperAdminRole();
    
    console.log('🎉 تم إنشاء نظام الصلاحيات بنجاح!');
  }
}
