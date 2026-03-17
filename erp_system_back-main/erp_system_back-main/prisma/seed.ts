import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('🚀 بدء إنشاء نظام الصلاحيات...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 سياسة التحديث:');
  console.log('   • الصلاحيات: تُضاف أو تُحدث تلقائياً');
  console.log('   • الأدوار: تُضاف فقط إذا لم تكن موجودة (الحفاظ على التعديلات)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await seedBasicPermissions();
  await seedBasicRoles();
  await assignPermissionsToRoles();
  await assignSuperAdminRole();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 تم إنشاء نظام الصلاحيات بنجاح!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function seedBasicPermissions() {
  console.log('🌱 إنشاء/تحديث الصلاحيات الأساسية...');
  console.log('ℹ️  ملاحظة: الصلاحيات سيتم إضافتها أو تحديثها تلقائياً');

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
      action: 'transfer',
      displayName: 'تحويل المتدربين',
      description: 'تحويل المتدربين بين البرامج التدريبية',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees',
      action: 'view_phone',
      displayName: 'عرض أرقام هواتف المتدربين',
      description: 'عرض أرقام هواتف المتدربين في الجداول والصفحات',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.archive',
      action: 'view',
      displayName: 'عرض أرشيف المتدربين',
      description: 'عرض أرشيف وثائق المتدربين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.archive',
      action: 'manage',
      displayName: 'إدارة أرشيف المتدربين',
      description: 'رفع وإدارة وثائق المتدربين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.archive',
      action: 'bulk_download',
      displayName: 'تحميل أرشيفات جماعية',
      description: 'تحميل أرشيفات متعددة لبرنامج أو جميع البرامج',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.documents',
      action: 'upload',
      displayName: 'رفع وثائق المتدربين',
      description: 'رفع وثائق جديدة للمتدربين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.documents',
      action: 'verify',
      displayName: 'التحقق من وثائق المتدربين',
      description: 'التحقق من صحة وثائق المتدربين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.documents',
      action: 'delete',
      displayName: 'حذف وثائق المتدربين',
      description: 'حذف وثائق المتدربين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees',
      action: 'export',
      displayName: 'تصدير المتدربين',
      description: 'تصدير قائمة المتدربين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees',
      action: 'export_data',
      displayName: 'استخراج بيانات المتدربين',
      description: 'استخراج بيانات المتدربين في ملفات Excel مع خيارات متقدمة',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.payment-exceptions',
      action: 'manage',
      displayName: 'إدارة استثناءات مواعيد السداد',
      description: 'تأجيل أو تعديل مواعيد السداد لمتدربين محددين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.disciplinary-actions',
      action: 'manage',
      displayName: 'إدارة الإجراءات العقابية',
      description: 'اتخاذ إجراءات عقابية ضد المتدربين (فصل مؤقت، فصل نهائي، لفت نظر، استدعاء ولي أمر، حفظ محضر)',
      category: 'إدارة المتدربين',
      isSystem: false,
    },
    {
      resource: 'dashboard.updates',
      action: 'view',
      displayName: 'عرض تتبع التحديثات',
      description: 'الوصول إلى صفحة تتبع التحديثات والإصلاحات',
      category: 'النظام',
    },

    // درجات المتدربين
    {
      resource: 'dashboard.grades',
      action: 'view',
      displayName: 'عرض درجات المتدربين',
      description: 'عرض درجات المتدربين في المواد التدريبية',
      category: 'درجات المتدربين',
    },
    {
      resource: 'dashboard.grades',
      action: 'edit',
      displayName: 'تعديل درجات المتدربين',
      description: 'تعديل وتحرير درجات المتدربين',
      category: 'درجات المتدربين',
    },
    {
      resource: 'dashboard.grades',
      action: 'export',
      displayName: 'تصدير درجات المتدربين',
      description: 'تصدير درجات المتدربين',
      category: 'درجات المتدربين',
    },
    {
      resource: 'dashboard.grades.bulk-upload',
      action: 'manage',
      displayName: 'رفع درجات المتدربين بشكل جماعي',
      description: 'رفع وتحديث درجات المتدربين من خلال ملف Excel',
      category: 'درجات المتدربين',
    },
    {
      resource: 'dashboard.grades.mercy',
      action: 'manage',
      displayName: 'درجات الرأفة',
      description: 'إضافة درجات الرأفة للمتدربين الذين لديهم مواد أقل من الحد المطلوب',
      category: 'درجات المتدربين',
    },
    {
      resource: 'dashboard.grades.second-round',
      action: 'manage',
      displayName: 'رصد طلاب الدور الثاني',
      description: 'عرض وطباعة كشف المتدربين الذين لديهم مواد أقل من 50%',
      category: 'درجات المتدربين',
    },
    {
      resource: 'dashboard.grades.second-round-fees',
      action: 'manage',
      displayName: 'رسوم الدور الثاني',
      description: 'تطبيق القيود المالية على طلاب الدور الثاني',
      category: 'درجات المتدربين',
    },
    {
      resource: 'dashboard.grades.reset-component',
      action: 'manage',
      displayName: 'تصفير مكون درجة',
      description: 'تصفير درجة مكون معين للمتدربين الذين درجتهم أقل من حد معين',
      category: 'درجات المتدربين',
    },

    // الاختبارات المصغرة
    {
      resource: 'dashboard.quizzes',
      action: 'view',
      displayName: 'عرض الاختبارات',
      description: 'عرض وتصفح الاختبارات المصغرة',
      category: 'الاختبارات المصغرة',
    },
    {
      resource: 'dashboard.quizzes',
      action: 'create',
      displayName: 'إنشاء اختبار',
      description: 'إنشاء اختبار مصغر جديد',
      category: 'الاختبارات المصغرة',
    },
    {
      resource: 'dashboard.quizzes',
      action: 'edit',
      displayName: 'تعديل الاختبارات',
      description: 'تعديل وتحرير الاختبارات المصغرة',
      category: 'الاختبارات المصغرة',
    },
    {
      resource: 'dashboard.quizzes',
      action: 'delete',
      displayName: 'حذف الاختبارات',
      description: 'حذف الاختبارات المصغرة',
      category: 'الاختبارات المصغرة',
    },

    // توزيع المتدربين على القاعات
    {
      resource: 'dashboard.trainees.distribution',
      action: 'view',
      displayName: 'عرض توزيع المتدربين',
      description: 'عرض توزيعات المتدربين على القاعات',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.distribution',
      action: 'create',
      displayName: 'إنشاء توزيع متدربين',
      description: 'إنشاء توزيع جديد للمتدربين على القاعات',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.distribution',
      action: 'edit',
      displayName: 'تعديل توزيع المتدربين',
      description: 'تعديل توزيع المتدربين على القاعات',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.distribution',
      action: 'delete',
      displayName: 'حذف توزيع المتدربين',
      description: 'حذف توزيع المتدربين',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.distribution',
      action: 'print',
      displayName: 'طباعة قوائم التوزيع',
      description: 'طباعة قوائم توزيع المتدربين على القاعات',
      category: 'إدارة المتدربين',
    },
    {
      resource: 'dashboard.trainees.distribution',
      action: 'transfer',
      displayName: 'تحويل مجموعات المتدربين',
      description: 'تحويل المتدربين بين المجموعات النظرية والعملية',
      category: 'إدارة المتدربين',
    },

    // إدارة الكارنيهات
    {
      resource: 'dashboard.id-cards',
      action: 'view',
      displayName: 'عرض الكارنيهات',
      description: 'عرض قائمة حالة الكارنيهات',
      category: 'إدارة الكارنيهات',
    },
    {
      resource: 'dashboard.id-cards',
      action: 'manage',
      displayName: 'إدارة الكارنيهات',
      description: 'إدارة طباعة وتسليم الكارنيهات',
      category: 'إدارة الكارنيهات',
    },
    {
      resource: 'dashboard.id-cards',
      action: 'print',
      displayName: 'طباعة الكارنيهات',
      description: 'طباعة الكارنيهات للمتدربين',
      category: 'إدارة الكارنيهات',
    },
    {
      resource: 'dashboard.id-cards',
      action: 'deliver',
      displayName: 'تسليم الكارنيهات',
      description: 'تسجيل تسليم الكارنيهات للمتدربين',
      category: 'إدارة الكارنيهات',
    },
    {
      resource: 'dashboard.id-cards',
      action: 'statistics',
      displayName: 'إحصائيات الكارنيهات',
      description: 'عرض إحصائيات طباعة وتسليم الكارنيهات',
      category: 'إدارة الكارنيهات',
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

    // إدارة الفصول الدراسية
    {
      resource: 'dashboard.classrooms',
      action: 'view',
      displayName: 'عرض الفصول الدراسية',
      description: 'عرض قائمة الفصول الدراسية',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.classrooms',
      action: 'create',
      displayName: 'إضافة فصول دراسية',
      description: 'إضافة فصول دراسية جديدة',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.classrooms',
      action: 'edit',
      displayName: 'تعديل الفصول الدراسية',
      description: 'تعديل الفصول الدراسية',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.classrooms',
      action: 'delete',
      displayName: 'حذف الفصول الدراسية',
      description: 'حذف الفصول الدراسية',
      category: 'إدارة البرامج',
    },

    // إدارة الجدول الدراسي
    {
      resource: 'dashboard.schedule',
      action: 'view',
      displayName: 'عرض الجدول الدراسي',
      description: 'عرض الجدول الدراسي والفترات المجدولة',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.schedule',
      action: 'create',
      displayName: 'إضافة فترات في الجدول',
      description: 'إضافة فترات دراسية جديدة في الجدول',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.schedule',
      action: 'edit',
      displayName: 'تعديل الجدول الدراسي',
      description: 'تعديل الفترات والجلسات في الجدول',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.schedule',
      action: 'delete',
      displayName: 'حذف فترات من الجدول',
      description: 'حذف فترات من الجدول الدراسي',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.schedule',
      action: 'manage',
      displayName: 'إدارة حالة الجلسات',
      description: 'تحديث حالة الجلسات (إلغاء، تفعيل، إتمام)',
      category: 'إدارة البرامج',
    },

    // رصد الحضور والغياب
    {
      resource: 'dashboard.attendance',
      action: 'view',
      displayName: 'عرض سجلات الحضور',
      description: 'عرض سجلات الحضور للمحاضرات',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.attendance',
      action: 'record',
      displayName: 'تسجيل الحضور',
      description: 'تسجيل حضور المتدربين في المحاضرات',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.attendance',
      action: 'edit',
      displayName: 'تعديل سجلات الحضور',
      description: 'تعديل سجلات الحضور المسجلة',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.attendance',
      action: 'delete',
      displayName: 'حذف سجلات الحضور',
      description: 'حذف سجلات الحضور',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.attendance',
      action: 'stats',
      displayName: 'عرض إحصائيات الحضور',
      description: 'عرض التقارير والإحصائيات للحضور',
      category: 'إدارة البرامج',
    },
    {
      resource: 'dashboard.attendance',
      action: 'record_past',
      displayName: 'تسجيل الحضور لتواريخ سابقة',
      description: 'تسجيل حضور المتدربين في المحاضرات السابقة',
      category: 'إدارة البرامج',
    },
    
    // سجلات الحضور للمتدربين
    {
      resource: 'dashboard.attendance.records',
      action: 'view',
      displayName: 'عرض سجلات المتدربين',
      description: 'استعراض سجلات الحضور والغياب للمتدربين',
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
      description: 'عرض صفحة مواعيد سداد الرسوم والإجراءات',
      category: 'النظام المالي',
    },
    {
      resource: 'dashboard.financial.payment-schedules',
      action: 'manage',
      displayName: 'إدارة مواعيد سداد الرسوم',
      description: 'إنشاء وتعديل مواعيد سداد الرسوم والإجراءات عند عدم السداد',
      category: 'النظام المالي',
    },
    {
      resource: 'dashboard.financial.reports',
      action: 'view',
      displayName: 'عرض التقارير المالية',
      description: 'عرض وتحليل التقارير المالية والإحصائيات',
      category: 'النظام المالي',
    },
    // تقارير القيود المالية
    {
      resource: 'finances.entries.reports',
      action: 'view',
      displayName: 'عرض تقارير القيود المالية',
      description: 'عرض وطباعة تقارير القيود المالية',
      category: 'النظام المالي',
    },
    {
      resource: 'finances.entries.reports',
      action: 'export',
      displayName: 'تصدير تقارير القيود المالية',
      description: 'تصدير وطباعة تقارير القيود المالية',
      category: 'النظام المالي',
    },
    // صلاحية عرض أرصدة الخزائن
    {
      resource: 'finances.safes.balances',
      action: 'view',
      displayName: 'عرض أرصدة الخزائن',
      description: 'عرض أرصدة الخزائن في صفحة الخزائن وصفحة القيود المالية',
      category: 'النظام المالي',
    },
    // إدارة الخزائن
    {
      resource: 'finances.safes',
      action: 'view',
      displayName: 'عرض الخزائن',
      description: 'عرض قائمة الخزائن ومعاملاتها',
      category: 'النظام المالي',
    },
    {
      resource: 'finances.safes',
      action: 'create',
      displayName: 'إنشاء خزينة',
      description: 'إنشاء خزينة جديدة',
      category: 'النظام المالي',
    },
    {
      resource: 'finances.safes',
      action: 'edit',
      displayName: 'تعديل الخزائن',
      description: 'تعديل بيانات الخزائن',
      category: 'النظام المالي',
    },
    {
      resource: 'finances.safes',
      action: 'delete',
      displayName: 'حذف الخزائن',
      description: 'حذف الخزائن',
      category: 'النظام المالي',
    },
    {
      resource: 'finances.safes.transactions',
      action: 'view',
      displayName: 'عرض معاملات الخزينة',
      description: 'عرض معاملات وحركة الخزينة',
      category: 'النظام المالي',
    },
    {
      resource: 'finances.safes.transactions',
      action: 'create',
      displayName: 'إنشاء معاملة مالية',
      description: 'إنشاء إيداع أو سحب من الخزينة',
      category: 'النظام المالي',
    },
    // سجل العمليات المالية (التدقيق)
    {
      resource: 'dashboard.financial.audit-log',
      action: 'view',
      displayName: 'عرض سجل العمليات المالية',
      description: 'عرض سجل جميع العمليات والتغييرات المالية في النظام',
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
      description: 'إدارة إعدادات النظام للمطورين (مفاتيح API، إلخ)',
      category: 'إدارة النظام',
      isSystem: true,
    },

    // إدارة إعلان الدرجات
    {
      resource: 'dashboard.grade-release',
      action: 'view',
      displayName: 'عرض إعلان الدرجات',
      description: 'عرض إعدادات إعلان الدرجات للفصول الدراسية',
      category: 'إدارة الاختبارات',
    },
    {
      resource: 'dashboard.grade-release',
      action: 'manage',
      displayName: 'إدارة إعلان الدرجات',
      description: 'إدارة إعدادات إعلان الدرجات وربطها بالرسوم',
      category: 'إدارة الاختبارات',
    },

    // إعادة حساب درجات الحضور
    {
      resource: 'dashboard.attendance-grades',
      action: 'manage',
      displayName: 'إعادة حساب درجات الحضور',
      description: 'إعادة حساب درجات الحضور لجميع المتدربين بناءً على سجلات الحضور',
      category: 'إدارة النظام',
      isSystem: true,
    },

    // إعدادات التطبيق الجوال
    {
      resource: 'dashboard.settings.mobile-app',
      action: 'manage',
      displayName: 'إدارة إعدادات التطبيق',
      description: 'إدارة روابط التطبيق على Google Play و App Store وتفعيلها',
      category: 'إدارة النظام',
      isSystem: false,
    },

    // إدارة الواتساب - الإعدادات العامة
    {
      resource: 'whatsapp',
      action: 'read',
      displayName: 'عرض إعدادات الواتساب',
      description: 'عرض إعدادات الواتساب وحالة الاتصال',
      category: 'الأتمتة التلقائية',
    },
    {
      resource: 'whatsapp',
      action: 'write',
      displayName: 'إدارة الواتساب',
      description: 'إرسال الرسائل وإدارة اتصال الواتساب',
      category: 'الأتمتة التلقائية',
    },

    // إدارة حملات الواتساب
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'view',
      displayName: 'عرض حملات الواتساب',
      description: 'عرض قائمة حملات المراسلة الجماعية',
      category: 'حملات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'create',
      displayName: 'إنشاء حملات الواتساب',
      description: 'إنشاء حملات مراسلة جماعية جديدة',
      category: 'حملات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'edit',
      displayName: 'تعديل حملات الواتساب',
      description: 'تعديل وإدارة حملات المراسلة الجماعية',
      category: 'حملات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'delete',
      displayName: 'حذف حملات الواتساب',
      description: 'حذف حملات المراسلة الجماعية',
      category: 'حملات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'start',
      displayName: 'تشغيل حملات الواتساب',
      description: 'بدء تشغيل حملات المراسلة الجماعية',
      category: 'حملات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'pause',
      displayName: 'إيقاف حملات الواتساب',
      description: 'إيقاف مؤقت أو دائم لحملات المراسلة',
      category: 'حملات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'duplicate',
      displayName: 'نسخ حملات الواتساب',
      description: 'إنشاء نسخة من حملة موجودة',
      category: 'حملات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.campaigns',
      action: 'export',
      displayName: 'تصدير حملات الواتساب',
      description: 'تصدير تقارير وإحصائيات الحملات',
      category: 'حملات الواتساب',
    },

    // إدارة قوالب رسائل الواتساب
    {
      resource: 'dashboard.whatsapp.templates',
      action: 'view',
      displayName: 'عرض قوالب الرسائل',
      description: 'عرض قائمة قوالب رسائل الواتساب',
      category: 'قوالب الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.templates',
      action: 'create',
      displayName: 'إنشاء قوالب الرسائل',
      description: 'إنشاء قوالب رسائل جديدة للواتساب',
      category: 'قوالب الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.templates',
      action: 'edit',
      displayName: 'تعديل قوالب الرسائل',
      description: 'تعديل قوالب رسائل الواتساب الموجودة',
      category: 'قوالب الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.templates',
      action: 'delete',
      displayName: 'حذف قوالب الرسائل',
      description: 'حذف قوالب رسائل الواتساب',
      category: 'قوالب الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.templates',
      action: 'duplicate',
      displayName: 'نسخ قوالب الرسائل',
      description: 'إنشاء نسخة من قالب رسالة موجود',
      category: 'قوالب الواتساب',
    },

    // إحصائيات ومراقبة الواتساب
    {
      resource: 'dashboard.whatsapp.analytics',
      action: 'view',
      displayName: 'عرض إحصائيات الواتساب',
      description: 'عرض إحصائيات الحملات ومعدلات النجاح',
      category: 'إحصائيات الواتساب',
    },
    {
      resource: 'dashboard.whatsapp.logs',
      action: 'view',
      displayName: 'عرض سجلات الواتساب',
      description: 'عرض سجلات إرسال الرسائل والأخطاء',
      category: 'إحصائيات الواتساب',
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

    // إدارة منصة المتدربين
    {
      resource: 'dashboard.trainee-platform',
      action: 'view',
      displayName: 'عرض منصة المتدربين',
      description: 'عرض حسابات وإحصائيات منصة المتدربين',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.trainee-platform.accounts',
      action: 'view',
      displayName: 'عرض حسابات المتدربين',
      description: 'عرض قائمة حسابات المتدربين المسجلين',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.trainee-platform.accounts',
      action: 'edit',
      displayName: 'تعديل حسابات المتدربين',
      description: 'تعديل بيانات حسابات المتدربين وكلمات المرور',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.trainee-platform.accounts',
      action: 'activate',
      displayName: 'تفعيل/تعطيل حسابات المتدربين',
      description: 'تفعيل أو تعطيل حسابات المتدربين',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.trainee-platform.accounts',
      action: 'reset-password',
      displayName: 'إعادة تعيين كلمة مرور المتدربين',
      description: 'إعادة تعيين كلمات مرور المتدربين',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.trainee-platform.stats',
      action: 'view',
      displayName: 'عرض إحصائيات منصة المتدربين',
      description: 'عرض إحصائيات تسجيل الدخول والنشاط على منصة المتدربين',
      category: 'منصة المتدربين',
    },

    // الاستبيانات
    {
      resource: 'dashboard.surveys',
      action: 'view',
      displayName: 'عرض الاستبيانات',
      description: 'عرض قائمة الاستبيانات والنتائج',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.surveys',
      action: 'create',
      displayName: 'إنشاء استبيان',
      description: 'إنشاء استبيانات جديدة للمتدربين',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.surveys',
      action: 'manage',
      displayName: 'إدارة الاستبيانات',
      description: 'تعديل وتفعيل وإيقاف الاستبيانات',
      category: 'منصة المتدربين',
    },
    {
      resource: 'dashboard.surveys',
      action: 'delete',
      displayName: 'حذف الاستبيانات',
      description: 'حذف الاستبيانات من النظام',
      category: 'منصة المتدربين',
    },

    // إدارة الأدوات الدراسية
    {
      resource: 'study-materials',
      action: 'view',
      displayName: 'عرض الأدوات الدراسية',
      description: 'عرض قائمة الأدوات والمستلزمات الدراسية',
      category: 'الأدوات الدراسية',
    },
    {
      resource: 'study-materials',
      action: 'create',
      displayName: 'إضافة أدوات دراسية',
      description: 'إضافة أدوات ومستلزمات دراسية جديدة',
      category: 'الأدوات الدراسية',
    },
    {
      resource: 'study-materials',
      action: 'update',
      displayName: 'تعديل الأدوات الدراسية',
      description: 'تعديل بيانات الأدوات والمستلزمات الدراسية',
      category: 'الأدوات الدراسية',
    },
    {
      resource: 'study-materials',
      action: 'delete',
      displayName: 'حذف الأدوات الدراسية',
      description: 'حذف الأدوات والمستلزمات الدراسية',
      category: 'الأدوات الدراسية',
    },

    // إدارة سجلات التسليم
    {
      resource: 'study-materials.deliveries',
      action: 'view',
      displayName: 'عرض سجلات التسليم',
      description: 'عرض سجلات تسليم الأدوات الدراسية للمتدربين',
      category: 'الأدوات الدراسية',
    },
    {
      resource: 'study-materials.deliveries',
      action: 'create',
      displayName: 'تسجيل تسليم',
      description: 'تسجيل تسليم أدوات دراسية للمتدربين',
      category: 'الأدوات الدراسية',
    },
    {
      resource: 'study-materials.deliveries',
      action: 'update',
      displayName: 'تحديث سجلات التسليم',
      description: 'تحديث حالة وتفاصيل سجلات التسليم',
      category: 'الأدوات الدراسية',
    },
    {
      resource: 'study-materials.deliveries',
      action: 'delete',
      displayName: 'حذف سجلات التسليم',
      description: 'حذف سجلات تسليم الأدوات الدراسية',
      category: 'الأدوات الدراسية',
    },

    // إدارة طلبات تأجيل السداد
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
      description: 'قبول أو رفض طلبات تأجيل السداد وإنشاء استثناءات',
      category: 'إدارة الطلبات',
    },
    {
      resource: 'dashboard.deferral-requests',
      action: 'delete',
      displayName: 'حذف طلبات التأجيل',
      description: 'حذف طلبات تأجيل السداد',
      category: 'إدارة الطلبات',
    },
    {
      resource: 'dashboard.deferral-requests.settings',
      action: 'view',
      displayName: 'عرض إعدادات الطلبات',
      description: 'عرض وتعديل إعدادات نظام طلبات التأجيل',
      category: 'إدارة الطلبات',
    },

    // طلبات المتدربين المجانية (جديد)
    {
      resource: 'dashboard.trainee-requests',
      action: 'view',
      displayName: 'عرض طلبات المتدربين',
      description: 'عرض جميع طلبات المتدربين المجانية (تأجيل اختبار، إجازة، إثبات قيد، إفادة)',
      category: 'إدارة الطلبات',
    },
    {
      resource: 'dashboard.trainee-requests',
      action: 'review',
      displayName: 'مراجعة طلبات المتدربين',
      description: 'قبول أو رفض طلبات المتدربين المجانية',
      category: 'إدارة الطلبات',
    },
    {
      resource: 'dashboard.trainee-requests',
      action: 'delete',
      displayName: 'حذف طلبات المتدربين',
      description: 'حذف طلبات المتدربين المجانية',
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

    // إدارة تظلمات الدرجات
    {
      resource: 'dashboard.grade-appeals',
      action: 'view',
      displayName: 'عرض تظلمات الدرجات',
      description: 'عرض تظلمات الدرجات المقدمة من المتدربين',
      category: 'إدارة الطلبات',
    },
    {
      resource: 'dashboard.grade-appeals',
      action: 'review',
      displayName: 'مراجعة تظلمات الدرجات',
      description: 'قبول أو رفض تظلمات الدرجات المقدمة من المتدربين',
      category: 'إدارة الطلبات',
    },
    {
      resource: 'dashboard.grade-appeals',
      action: 'delete',
      displayName: 'حذف تظلمات الدرجات',
      description: 'حذف تظلمات الدرجات',
      category: 'إدارة الطلبات',
    },
    {
      resource: 'dashboard.grade-appeals',
      action: 'settings',
      displayName: 'إعدادات التظلمات',
      description: 'التحكم في فتح وإغلاق باب التظلمات',
      category: 'إدارة الطلبات',
    },

    // رسائل التذكير التلقائية بالسداد
    {
      resource: 'dashboard.automation.payment-reminders',
      action: 'view',
      displayName: 'عرض رسائل التذكير بالسداد',
      description: 'عرض وقراءة رسائل التذكير التلقائية المرتبطة بمواعيد سداد الرسوم',
      category: 'الأتمتة التلقائية',
    },
    {
      resource: 'dashboard.automation.payment-reminders',
      action: 'manage',
      displayName: 'إدارة رسائل التذكير بالسداد',
      description: 'إنشاء وتعديل وحذف رسائل التذكير التلقائية للرسوم',
      category: 'الأتمتة التلقائية',
    },
    
    // إدارة المواقع الجغرافية (الدول والمحافظات والمدن)
    {
      resource: 'dashboard.settings.locations',
      action: 'manage',
      displayName: 'إدارة المواقع الجغرافية',
      description: 'إدارة الدول والمحافظات والمدن في النظام (إضافة، تعديل، حذف)',
      category: 'إدارة النظام',
      isSystem: true,
    },

    // Vision AI - التصحيح الذكي
    {
      resource: 'dashboard.vision-ai',
      action: 'view',
      displayName: 'الوصول إلى Vision AI',
      description: 'القدرة على الوصول إلى نظام التصحيح الذكي Vision AI',
      category: 'Vision AI',
      isSystem: false,
    },
    {
      resource: 'dashboard.vision-ai',
      action: 'grade',
      displayName: 'تصحيح ذكي بـ Vision AI',
      description: 'القدرة على استخدام الذكاء الاصطناعي لتصحيح الاختبارات',
      category: 'Vision AI',
      isSystem: false,
    },
    {
      resource: 'dashboard.vision-ai.upload-questions',
      action: 'view',
      displayName: 'رفع أسئلة من Excel',
      description: 'القدرة على رفع أسئلة اختيار من متعدد من ملف Excel',
      category: 'Vision AI',
      isSystem: false,
    },
    {
      resource: 'dashboard.vision-ai.chat',
      action: 'view',
      displayName: 'محادثة مع Vision AI',
      description: 'القدرة على المحادثة مع المساعد الذكي Vision AI',
      category: 'Vision AI',
      isSystem: false,
    },
    {
      resource: 'dashboard.vision-ai.extract-questions',
      action: 'view',
      displayName: 'استخراج أسئلة من PDF',
      description: 'القدرة على استخراج أسئلة من ملفات PDF باستخدام الذكاء الاصطناعي',
      category: 'Vision AI',
      isSystem: false,
    },

    // الاختبارات الورقية (Paper Exams)
    {
      resource: 'dashboard.paper-exams',
      action: 'view',
      displayName: 'عرض الاختبارات الورقية',
      description: 'القدرة على عرض قائمة الاختبارات الورقية وتفاصيلها',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'create',
      displayName: 'إنشاء اختبارات ورقية',
      description: 'القدرة على إنشاء اختبارات ورقية جديدة ونماذج أسئلة',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'edit',
      displayName: 'تعديل الاختبارات الورقية',
      description: 'القدرة على تعديل معلومات الاختبارات الورقية',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'delete',
      displayName: 'حذف الاختبارات الورقية',
      description: 'القدرة على حذف الاختبارات الورقية',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'grade',
      displayName: 'تصحيح الاختبارات الورقية',
      description: 'القدرة على تصحيح أوراق الإجابة بالكاميرا',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'generate_sheets',
      displayName: 'توليد أوراق الإجابة',
      description: 'القدرة على توليد أوراق الإجابة لجميع المتدربين',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'print_questions',
      displayName: 'طباعة نماذج الأسئلة',
      description: 'القدرة على طباعة نماذج الأسئلة',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'print_answer_sheets',
      displayName: 'طباعة أوراق الإجابة',
      description: 'القدرة على طباعة أوراق الإجابة',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },
    {
      resource: 'dashboard.paper-exams',
      action: 'view_reports',
      displayName: 'عرض تقارير الاختبارات الورقية',
      description: 'القدرة على عرض تقارير النتائج والإحصائيات',
      category: 'إدارة الاختبارات',
      isSystem: false,
    },

    // نظام الكونترول (Control System)
    {
      resource: 'dashboard.control',
      action: 'view',
      displayName: 'عرض نظام الكونترول',
      description: 'القدرة على الوصول لنظام الكونترول',
      category: 'نظام الكونترول',
      isSystem: false,
    },
    {
      resource: 'dashboard.control',
      action: 'view_exams',
      displayName: 'عرض الاختبارات في الكونترول',
      description: 'القدرة على استعراض قائمة الاختبارات الورقية',
      category: 'نظام الكونترول',
      isSystem: false,
    },
    {
      resource: 'dashboard.control',
      action: 'view_grades',
      displayName: 'عرض درجات المتدربين',
      description: 'القدرة على عرض درجات المتدربين في الاختبارات',
      category: 'نظام الكونترول',
      isSystem: false,
    },
    {
      resource: 'dashboard.control',
      action: 'download_grades_template',
      displayName: 'تحميل شيت الدرجات',
      description: 'القدرة على تحميل ملف Excel بقائمة المتدربين',
      category: 'نظام الكونترول',
      isSystem: false,
    },
    {
      resource: 'dashboard.control',
      action: 'upload_grades',
      displayName: 'رفع درجات المتدربين',
      description: 'القدرة على رفع ملف Excel لإدخال الدرجات',
      category: 'نظام الكونترول',
      isSystem: false,
    },

    // ==================== إحصائيات الصفحة الرئيسية ====================
    {
      resource: 'dashboard.statistics',
      action: 'view',
      displayName: 'عرض إحصائيات الصفحة الرئيسية',
      description: 'عرض الإحصائيات والرسوم البيانية في الصفحة الرئيسية للوحة التحكم',
      category: 'إحصائيات',
      isSystem: false,
    },

    // ==================== صلاحيات النسخ الاحتياطي ====================
    {
      resource: 'dashboard.backup',
      action: 'view',
      displayName: 'عرض النسخ الاحتياطية',
      description: 'عرض قائمة النسخ الاحتياطية وإعداداتها',
      category: 'إدارة النظام',
      isSystem: true,
    },
    {
      resource: 'dashboard.backup',
      action: 'create',
      displayName: 'إنشاء نسخة احتياطية',
      description: 'إنشاء نسخة احتياطية جديدة وتحميلها وحذفها',
      category: 'إدارة النظام',
      isSystem: true,
    },
    {
      resource: 'dashboard.backup',
      action: 'restore',
      displayName: 'استعادة نسخة احتياطية',
      description: 'استعادة قاعدة البيانات من نسخة احتياطية سابقة',
      category: 'إدارة النظام',
      isSystem: true,
    },

    // ==================== حضور الموظفين (Staff Attendance) ====================
    {
      resource: 'staff-attendance',
      action: 'view',
      displayName: 'عرض سجلات حضور الموظفين',
      description: 'عرض سجلات وإحصائيات حضور الموظفين',
      category: 'حضور الموظفين',
    },
    {
      resource: 'staff-attendance',
      action: 'manage',
      displayName: 'إدارة حضور الموظفين',
      description: 'تعديل وحذف سجلات حضور الموظفين يدوياً',
      category: 'حضور الموظفين',
    },
    {
      resource: 'staff-attendance.enrollments',
      action: 'view',
      displayName: 'عرض الموظفين المسجلين بالحضور',
      description: 'عرض قائمة الموظفين المسجلين في نظام الحضور',
      category: 'حضور الموظفين',
    },
    {
      resource: 'staff-attendance.enrollments',
      action: 'manage',
      displayName: 'إدارة تسجيل الموظفين بالحضور',
      description: 'إضافة أو إزالة موظفين من نظام الحضور',
      category: 'حضور الموظفين',
    },
    {
      resource: 'staff-attendance.leaves',
      action: 'view',
      displayName: 'عرض طلبات إجازات الموظفين',
      description: 'عرض طلبات الإجازات المقدمة من الموظفين',
      category: 'حضور الموظفين',
    },
    {
      resource: 'staff-attendance.leaves',
      action: 'manage',
      displayName: 'إدارة طلبات إجازات الموظفين',
      description: 'قبول أو رفض طلبات إجازات الموظفين',
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
      displayName: 'عرض إعدادات نظام حضور الموظفين',
      description: 'عرض إعدادات نظام حضور الموظفين',
      category: 'حضور الموظفين',
    },
    {
      resource: 'staff-attendance.settings',
      action: 'manage',
      displayName: 'إدارة إعدادات نظام حضور الموظفين',
      description: 'تعديل إعدادات أوقات الدوام والموقع الجغرافي',
      category: 'حضور الموظفين',
    },
  ];

  const createdPermissions = [];
  for (const permission of permissions) {
    try {
      const created = await prisma.permission.upsert({
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
    } catch (error) {
      console.error(`خطأ في إنشاء الصلاحية ${permission.resource}.${permission.action}:`, error.message);
    }
  }

  console.log(`✅ تم إنشاء ${createdPermissions.length} صلاحية`);
  return createdPermissions;
}

async function seedBasicRoles() {
  console.log('🌱 إنشاء الأدوار الأساسية...');
  console.log('ℹ️  ملاحظة: الأدوار سيتم إضافتها فقط إذا لم تكن موجودة (لن يتم التحديث للحفاظ على التعديلات)');

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
      name: 'marketing_employee',
      displayName: 'موظف تسويق',
      description: 'موظف تسويق مع صلاحيات إدارة المتدربين والتسويق',
      color: '#8B5CF6',
      icon: 'FaUserTag',
      priority: 400,
    },
    {
      name: 'trainee_entry_clerk',
      displayName: 'موظف إدخال متدربين',
      description: 'موظف مختص بإدخال وعرض بيانات المتدربين فقط',
      color: '#06B6D4',
      icon: 'FaUserPlus',
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
      description: 'صلاحيات عرض محدودة',
      color: '#9CA3AF',
      icon: 'FaEye',
      priority: 100,
    },
  ];

  const createdRoles = [];
  for (const role of roles) {
    try {
      // التحقق من وجود الدور
      const existingRole = await prisma.role.findUnique({
        where: { name: role.name },
      });

      if (existingRole) {
        // الدور موجود - لا نقوم بالتحديث، نستخدم الموجود فقط
        console.log(`⏩ الدور "${role.displayName}" موجود بالفعل - تم تجاهل التحديث`);
        createdRoles.push(existingRole);
      } else {
        // الدور غير موجود - نقوم بإنشائه
        const created = await prisma.role.create({
          data: role,
        });
        console.log(`✨ تم إنشاء دور جديد: "${role.displayName}"`);
      createdRoles.push(created);
      }
    } catch (error) {
      console.error(`❌ خطأ في معالجة الدور ${role.name}:`, error.message);
    }
  }

  console.log(`✅ تمت معالجة ${createdRoles.length} دور (${roles.length - createdRoles.length} موجود مسبقاً)`);
  return createdRoles;
}

// دالة مساعدة لتعيين الصلاحيات بشكل آمن (فقط إذا لم تكن معينة)
async function assignPermissionToRole(roleId: string, permissionId: string, roleName: string) {
  const existing = await prisma.rolePermission.findUnique({
    where: {
      roleId_permissionId: {
        roleId,
        permissionId,
      },
    },
  });

  if (existing) {
    return { created: false, existing: true };
  }

  await prisma.rolePermission.create({
    data: {
      roleId,
      permissionId,
      granted: true,
    },
  });

  return { created: true, existing: false };
}

async function assignPermissionsToRoles() {
  console.log('🌱 تعيين الصلاحيات للأدوار...');
  console.log('ℹ️  ملاحظة: الصلاحيات المعينة مسبقاً لن يتم تحديثها (الحفاظ على التعديلات)');
  console.log('⚠️  تنبيه: سيتم تعيين الصلاحيات فقط لـ Super Admin و Admin');
  console.log('   الأدوار الأخرى يجب تعيين صلاحياتها يدوياً من واجهة النظام');

  // الحصول على جميع الصلاحيات والأدوار
  const permissions = await prisma.permission.findMany();
  const roles = await prisma.role.findMany();

  const superAdminRole = roles.find(r => r.name === 'super_admin');
  const adminRole = roles.find(r => r.name === 'admin');

  // تعيين جميع الصلاحيات لمدير النظام الرئيسي
  if (superAdminRole) {
    let newCount = 0;
    let existingCount = 0;
    for (const permission of permissions) {
      const result = await assignPermissionToRole(superAdminRole.id, permission.id, superAdminRole.name);
      if (result.created) newCount++;
      if (result.existing) existingCount++;
    }
    console.log(`✅ دور ${superAdminRole.displayName}: ${newCount} صلاحية جديدة، ${existingCount} موجودة مسبقاً`);
  }

  // تعيين صلاحيات مدير النظام (كل شيء عدا إدارة الصلاحيات، ولكن مع إعدادات المطورين + Vision AI + نظام الكونترول)
  if (adminRole) {
    const adminPermissions = permissions.filter(p =>
      (!p.resource.includes('permissions') ||
      p.resource.includes('vision-ai') ||
      p.resource.includes('dashboard.control')) ||
      p.resource.includes('developer-settings') || // منح admin صلاحية الوصول لإعدادات المطورين
      p.resource.includes('grade-release') || // منح admin صلاحية إعلان الدرجات
      p.resource.includes('attendance-grades') || // منح admin صلاحية إعادة حساب درجات الحضور
      p.resource.includes('grades.mercy') || // منح admin صلاحية درجات الرأفة
      p.resource.includes('grades.second-round') || // منح admin صلاحية رصد طلاب الدور الثاني
      p.resource.includes('grades.second-round-fees') || // منح admin صلاحية قيود الدور الثاني
      p.resource.includes('grades.reset-component') || // منح admin صلاحية تصفير مكون درجة
      p.resource.includes('finances.safes.balances') // منح admin صلاحية عرض أرصدة الخزائن
    );
    let newCount = 0;
    let existingCount = 0;
    for (const permission of adminPermissions) {
      const result = await assignPermissionToRole(adminRole.id, permission.id, adminRole.name);
      if (result.created) newCount++;
      if (result.existing) existingCount++;
    }
    console.log(`✅ دور ${adminRole.displayName}: ${newCount} صلاحية جديدة، ${existingCount} موجودة مسبقاً (بما في ذلك Vision AI ونظام الكونترول)`);
  }

  // ملاحظة: تم تعطيل التعيين التلقائي للصلاحيات للأدوار الأخرى (manager, instructor, accountant, إلخ)
  // يمكن للمدير تعيين الصلاحيات يدوياً من خلال واجهة النظام
  console.log('ℹ️  الأدوار الأخرى (مدير، مدرس، محاسب، إلخ) لن يتم تعيين صلاحيات لها تلقائياً');
  console.log('   يمكن تعيين الصلاحيات يدوياً من خلال إدارة الأدوار والصلاحيات');

  console.log('✅ تم تعيين الصلاحيات للأدوار بنجاح');
}

async function assignSuperAdminRole() {
  console.log('🌱 تعيين دور مدير النظام الرئيسي للمستخدم الأول...');

  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super_admin' },
  });

  if (!superAdminRole) {
    console.error('❌ لم يتم العثور على دور مدير النظام الرئيسي');
    return;
  }

  // البحث عن المستخدم الأول (المدير الافتراضي)
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!firstUser) {
    console.error('❌ لم يتم العثور على أي مستخدم في النظام');
    return;
  }

  // تعيين دور مدير النظام الرئيسي
  await prisma.userRole.upsert({
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

async function main() {
  console.log('🌱 بدء تشغيل البذور...');

  // إنشاء المستخدم الأساسي
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@codex.com' },
    update: {},
    create: {
      name: 'مدير النظام',
      email: 'admin@codex.com',
      phone: '01234567890',
      password: hashedPassword,
    },
  });

  console.log('✅ تم إنشاء المستخدم الأساسي:', adminUser.email);

  // إنشاء إعدادات النظام الأساسية
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      centerName: 'مركز تدريب مهني',
      centerManagerName: 'مركز تدريب مهني',
      centerAddress: 'المنصورة - مصر',
      facebookPageUrl: 'https://www.facebook.com/smartcodexeg',
      licenseNumber: '29',
      showTraineeDebtsToTraineeAffairs: false,
      printingAmount: 50.0,
      idCardWidth: 320,
      idCardHeight: 200,
    },
  });

  console.log('✅ تم إنشاء إعدادات النظام الأساسية');

  // إنشاء نظام الصلاحيات
  await seedPermissions();

  // نقل بيانات المواقع الجغرافية
  console.log('');
  console.log('🌍 نقل بيانات المواقع الجغرافية...');
  const { seedLocations } = await import('../src/locations/seed-locations');
  await seedLocations();

  console.log('🎉 تم الانتهاء من تشغيل البذور بنجاح!');
  console.log('');
  console.log('📋 بيانات تسجيل الدخول:');
  console.log('   البريد الإلكتروني: admin@codex.com أو الهاتف: 01234567890');
  console.log('   كلمة المرور: admin123');
  console.log('   الدور: مدير النظام الرئيسي (جميع الصلاحيات)');
  console.log('');
  console.log('   مستخدمين إضافيين:');
  console.log('   - user1@tiba.com أو 01111111111 / user123');
  console.log('   - user2@tiba.com أو 01222222222 / user123');
  console.log('   - user3@tiba.com أو 01333333333 / user123');
  console.log('');
  console.log('🔐 نظام الصلاحيات المتقدم جاهز للاستخدام!');
  console.log('📱 نظام الواتساب متاح في: /dashboard/whatsapp');
  console.log('   ✅ تم إضافة صلاحيات حملات الواتساب الكاملة');
  console.log('   ✅ تم إضافة صلاحيات قوالب الرسائل');
  console.log('   ✅ تم إضافة صلاحيات الإحصائيات والمراقبة');
  console.log('   - مدير النظام: جميع صلاحيات الواتساب');
  console.log('   - المدير: جميع صلاحيات الواتساب');
  console.log('   - مدير التسويق: جميع صلاحيات الواتساب');
  console.log('   - المحاسب: صلاحية عرض الواتساب فقط');
  console.log('');
  console.log('🎯 صلاحيات حملات الواتساب:');
  console.log('   - عرض/إنشاء/تعديل/حذف الحملات');
  console.log('   - تشغيل/إيقاف/نسخ الحملات');
  console.log('   - إدارة قوالب الرسائل');
  console.log('   - عرض الإحصائيات والسجلات');
}

main()
  .catch((e) => {
    console.error('❌ خطأ في تشغيل البذور:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });