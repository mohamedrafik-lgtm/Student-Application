'use client';

import { useState, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { fetchAPI } from '../../../lib/api';
import { useSettings } from '@/lib/settings-context';
import {
  FiHome, FiMenu, FiLogOut, FiChevronRight, FiChevronDown,
  FiSettings, FiUser, FiUsers, FiFileText,
  FiCalendar, FiDollarSign, FiBarChart2,
  FiClock, FiBook, FiEdit, FiX, FiMessageSquare, FiZap, FiFolder, FiCreditCard,
  FiTarget, FiTrendingUp, FiUserPlus, FiGrid, FiActivity, FiCheckSquare, FiAward, FiClipboard,
  FiAlertCircle, FiDownload, FiInbox, FiBell, FiUpload, FiCopy, FiAlertTriangle, FiTrash2
} from 'react-icons/fi';
import { 
  FaGraduationCap, FaUserShield, FaBuilding, 
  FaNewspaper, FaUserGraduate, FaHistory, 
  FaQuestion, FaMoneyBillWave,
  FaUniversity, FaBookOpen, FaWrench,
  FaUsers, FaUser, FaExchangeAlt, FaRobot, FaUserTie
} from 'react-icons/fa';
import {
  ComputerDesktopIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { ProtectedNavigation } from '../../../components/permissions/ProtectedNavigation';
import { usePermissions } from '../../../hooks/usePermissions';

interface SidebarItem {
  title: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  requiredRole?: string;
  requiredRoles?: string[];
  subGroup?: string;
}

interface SidebarCategory {
  title: string;
  icon: ReactNode;
  items: SidebarItem[];
  badge?: number;
  href?: string;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  requiredPermissions?: Array<{
    resource: string;
    action: string;
  }>;
  requiredRole?: string;
  requiredRoles?: string[];
  requireAll?: boolean;
  customVisible?: boolean;
}

interface DashboardSidebarProps {
  items?: SidebarItem[];
}

export default function DashboardSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { hasPermission, canAccessFinancialPages, loading: permissionsLoading } = usePermissions();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubGroup, setExpandedSubGroup] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [centerName, setCenterName] = useState<string>('نظام التدريب');
  const [isStaffEnrolled, setIsStaffEnrolled] = useState(false);
  const [pendingRequestCounts, setPendingRequestCounts] = useState<{
    deferral: number; general: number; complaints: number; gradeAppeals: number;
  }>({ deferral: 0, general: 0, complaints: 0, gradeAppeals: 0 });

  // استجابة الشريط الجانبي للشاشات الصغيرة فقط
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };

    // تحديث عند التحميل
    handleResize();

    // إضافة مستمع الحجم
    window.addEventListener('resize', handleResize);
    
    // إزالة المستمع عند الانتهاء
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // التحقق من تسجيل الموظف في نظام الحضور
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const data = await fetchAPI('/staff-attendance/my-status');
        setIsStaffEnrolled(data?.isEnrolled === true);
      } catch {
        setIsStaffEnrolled(false);
      }
    };
    checkEnrollment();
  }, []);

  // جلب أعداد الطلبات المعلقة لكل قسم
  useEffect(() => {
    const fetchPendingCounts = async () => {
      const counts = { deferral: 0, general: 0, complaints: 0, gradeAppeals: 0 };
      const fetches: Promise<void>[] = [];

      if (hasPermission('dashboard.deferral-requests', 'view')) {
        fetches.push(
          fetchAPI('/deferral-requests/stats').then(d => { counts.deferral = d?.pending || d?.PENDING || 0; }).catch(() => {})
        );
      }
      if (hasPermission('dashboard.trainee-requests', 'view')) {
        fetches.push(
          fetchAPI('/trainee-requests/stats').then(d => { counts.general = d?.pending || d?.PENDING || 0; }).catch(() => {})
        );
      }
      if (hasPermission('dashboard.complaints', 'view')) {
        fetches.push(
          fetchAPI('/complaints/stats').then(d => { counts.complaints = (d?.pending || d?.PENDING || 0) + (d?.inProgress || d?.IN_PROGRESS || 0); }).catch(() => {})
        );
      }
      if (hasPermission('dashboard.grade-appeals', 'view')) {
        fetches.push(
          fetchAPI('/grade-appeals/stats').then(d => { counts.gradeAppeals = d?.pending || d?.PENDING || 0; }).catch(() => {})
        );
      }

      await Promise.all(fetches);
      setPendingRequestCounts(counts);
    };

    if (!permissionsLoading) {
      fetchPendingCounts();
      // Refresh every 2 minutes
      const interval = setInterval(fetchPendingCounts, 120000);
      return () => clearInterval(interval);
    }
  }, [permissionsLoading]);

  // استخدام Context للحصول على اسم المركز
  const { settings } = useSettings();
  
  useEffect(() => {
    if (settings?.centerName) {
      setCenterName(settings.centerName);
    }
  }, [settings?.centerName]);

  // دالة لفحص صلاحية عرض فئة
  const canShowCategory = (category: SidebarCategory): boolean => {
    if (permissionsLoading) return false;
    
    // إذا كانت الرؤية محددة يدوياً
    if (category.customVisible !== undefined) {
      return category.customVisible;
    }
    
    // فحص خاص للنظام المالي
    if (category.title === 'النظام المالي') {
      return canAccessFinancialPages();
    }
    
    // إذا كانت هناك صلاحية مطلوبة واحدة
    if (category.requiredPermission) {
      return hasPermission(category.requiredPermission.resource, category.requiredPermission.action);
    }
    
    // إذا كانت هناك صلاحيات متعددة
    if (category.requiredPermissions && category.requiredPermissions.length > 0) {
      if (category.requireAll) {
        // يجب أن تكون جميع الصلاحيات متوفرة
        return category.requiredPermissions.every(perm => 
          hasPermission(perm.resource, perm.action)
        );
      } else {
        // واحدة فقط كافية
        return category.requiredPermissions.some(perm => 
          hasPermission(perm.resource, perm.action)
        );
      }
    }
    
    // إذا لم تكن هناك متطلبات، اعرض الفئة
    return true;
  };

  // دالة لفحص صلاحية عرض عنصر
  const canShowItem = (item: SidebarItem): boolean => {
    if (permissionsLoading) return true; // عرض العناصر أثناء التحميل
    
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission.resource, item.requiredPermission.action);
    }
    
    return true;
  };

  // دالة لفحص ما إذا كان العنصر معطل بسبب الصلاحيات
  const isItemDisabled = (item: SidebarItem): boolean => {
    if (permissionsLoading) return true; // معطل أثناء التحميل
    
    if (item.requiredPermission) {
      return !hasPermission(item.requiredPermission.resource, item.requiredPermission.action);
    }
    
    return false;
  };

  // التأكد من توسيع الفئة النشطة تلقائيًا
  useEffect(() => {
    if (pathname) {
      const activeCategory = sidebarCategories.find(category => 
        canShowCategory(category) && category.items && category.items.some(item => isItemActive(item.href))
      );
      
      if (activeCategory && expandedCategory !== activeCategory.title) {
        setExpandedCategory(activeCategory.title);
      }

      // توسيع القسم التفريعي النشط تلقائيًا
      if (activeCategory) {
        const activeItem = activeCategory.items.find(item => isItemActive(item.href));
        if (activeItem?.subGroup && expandedSubGroup !== activeItem.subGroup) {
          setExpandedSubGroup(activeItem.subGroup);
        }
      }
    }
  }, [pathname, permissionsLoading]);

  // تنظيم العناصر في فئات
  const sidebarCategories: SidebarCategory[] = [

    {
      title: 'إدارة المتدربين',
      icon: <FaGraduationCap className="w-5 h-5" />,
      // يمكن رؤية القسم إذا كان لديه أي من هذه الصلاحيات
      requiredPermissions: [
        { resource: 'dashboard.trainees', action: 'view' },
        { resource: 'dashboard.attendance', action: 'view' }, // من يدير الحضور يحتاج رؤية المتدربين
        { resource: 'dashboard.registrations', action: 'view' }, // من يدير تسجيلات الفورم
      ],
      requireAll: false, // واحدة فقط كافية
      items: [
        {
          title: 'المتدربين',
          href: '/dashboard/trainees',
          icon: <FaUserGraduate className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainees', action: 'view' },
        },
        {
          title: 'أرشيف المتدربين',
          href: '/dashboard/trainees/archive',
          icon: <FiFolder className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainees.archive', action: 'view' },
        },
        {
          title: 'إدارة الكارنيهات',
          href: '/dashboard/trainees/id-cards',
          icon: <FiCreditCard className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.id-cards', action: 'manage' },
        },
        {
          title: 'استخراج البيانات',
          href: '/dashboard/trainees/export',
          icon: <FiDownload className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainees', action: 'export_data' },
        },
        {
          title: 'تحويل المتدربين',
          href: '/dashboard/trainees/transfer',
          icon: <FaExchangeAlt className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainees', action: 'transfer' },
        },
      ]
    },
      {
        title: 'البرامج التدريبية',
        icon: <FaUniversity className="w-5 h-5" />,
        requiredPermissions: [
          { resource: 'dashboard.programs', action: 'view' },
          { resource: 'dashboard.classrooms', action: 'view' },
          { resource: 'dashboard.attendance.records', action: 'view' },
        ],
        requireAll: false,
        items: [
          {
            title: 'البرامج التدريبية',
            href: '/dashboard/programs',
            icon: <FaBookOpen className="w-5 h-5" />,
            requiredPermission: { resource: 'dashboard.programs', action: 'view' },
          },
          {
            title: 'الفصول الدراسية',
            href: '/dashboard/classrooms',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
            requiredPermission: { resource: 'dashboard.classrooms', action: 'view' },
          },
          {
            title: 'الجدول الدراسي',
            href: '/dashboard/schedule',
            icon: <FiClock className="w-5 h-5" />,
            requiredPermission: { resource: 'dashboard.schedule', action: 'view' },
          },
          {
            title: 'رصد الحضور',
            href: '/dashboard/attendance',
            icon: <FiCheckSquare className="w-5 h-5" />,
            requiredPermission: { resource: 'dashboard.attendance', action: 'view' },
          },
          {
            title: 'سجلات الحضور',
            href: '/dashboard/attendance-records',
            icon: <FiBarChart2 className="w-5 h-5" />,
            requiredPermission: { resource: 'dashboard.attendance.records', action: 'view' },
          },
        ]
      },
    {
      title: 'إدارة التوزيع',
      icon: <FiGrid className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.trainees.distribution', action: 'view' },
      items: [
        {
          title: 'التوزيعات',
          href: '/dashboard/trainees/distribution',
          icon: <FiClipboard className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainees.distribution', action: 'view' },
        },
        {
          title: 'إدارة التوزيعات',
          href: '/dashboard/distribution/students',
          icon: <FaUsers className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainees.distribution', action: 'view' },
        },
        {
          title: 'طلاب غير موزعين',
          href: '/dashboard/trainees/undistributed',
          icon: <FiAlertCircle className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainees.distribution', action: 'view' },
        },
      ]
    },
    {
      title: 'الأدوات الدراسية',
      icon: <FaWrench className="w-5 h-5" />,
      requiredPermissions: [
        { resource: 'study-materials', action: 'view' },
        { resource: 'study-materials.deliveries', action: 'view' },
      ],
      requireAll: false,
      items: [
        {
          title: 'الأدوات الدراسية',
          href: '/dashboard/study-materials',
          icon: <FaWrench className="w-5 h-5" />,
          requiredPermission: { resource: 'study-materials', action: 'view' },
        },
        {
          title: 'تتبع التسليم',
          href: '/dashboard/study-materials/deliveries',
          icon: <FiCheckSquare className="w-5 h-5" />,
          requiredPermission: { resource: 'study-materials.deliveries', action: 'view' },
        },
      ]
    },
    {
      title: 'المحتوى التدريبي',
      icon: <FiBook className="w-5 h-5" />,
      requiredPermissions: [
        { resource: 'dashboard.training-contents', action: 'view' },
        { resource: 'dashboard.questions', action: 'view' },
      ],
      requireAll: false, // واحدة فقط كافية
      items: [
        {
          title: 'المحتوى التدريبي',
          href: '/dashboard/training-contents',
          icon: <FiFileText className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.training-contents', action: 'view' },
        },
        {
          title: 'بنك الأسئلة',
          href: '/dashboard/question-bank',
          icon: <FaQuestion className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.questions', action: 'view' },
        },
      ]
    },
    {
      title: 'إدارة الاختبارات',
      icon: <FiClipboard className="w-5 h-5" />,
      requiredPermissions: [
        { resource: 'dashboard.quizzes', action: 'view' },
        { resource: 'dashboard.paper-exams', action: 'view' },
        { resource: 'dashboard.control', action: 'view' },
        { resource: 'dashboard.grade-release', action: 'view' },
      ],
      requireAll: false,
      items: [
        {
          title: 'اختبارات أونلاين',
          href: '/dashboard/quizzes',
          icon: <FiEdit className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.quizzes', action: 'view' },
        },
        {
          title: 'الاختبارات الورقية',
          href: '/dashboard/paper-exams',
          icon: <FiFileText className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.paper-exams', action: 'view' },
        },
        {
          title: 'نظام الكونترول',
          href: '/dashboard/control',
          icon: <ChartBarIcon className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.control', action: 'view' },
        },
        {
          title: 'إعلان الدرجات',
          href: '/dashboard/grade-release',
          icon: <FiBell className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grade-release', action: 'view' },
        },
      ]
    },
    {
      title: 'درجات المتدربين',
      icon: <FiAward className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.grades', action: 'view' },
      items: [
        {
          title: 'إدارة الدرجات',
          href: '/dashboard/grades',
          icon: <FiEdit className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grades', action: 'view' },
        },
        {
          title: 'رصد الأوائل',
          href: '/dashboard/grades/top-students',
          icon: <FiTrendingUp className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grades', action: 'view' },
        },
        {
          title: 'طلاب الدور الثاني',
          href: '/dashboard/grades/second-round',
          icon: <FiAlertTriangle className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grades.second-round', action: 'manage' },
        },

        {
          title: 'رفع درجات المتدربين',
          href: '/dashboard/grades/bulk-upload',
          icon: <FiUpload className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grades.bulk-upload', action: 'manage' },
        },
        {
          title: 'درجات الرأفة',
          href: '/dashboard/grades/mercy-grades',
          icon: <FaGraduationCap className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grades.mercy', action: 'manage' },
        },
        {
          title: 'تصفير مكون درجة',
          href: '/dashboard/grades/reset-component',
          icon: <FiTrash2 className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grades.reset-component', action: 'manage' },
        },
      ]
    },
    {
      title: 'النظام المالي',
      icon: <FiDollarSign className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.financial', action: 'view' },
      items: [
        {
          title: 'الخزائن',
          href: '/dashboard/finances/safes',
          icon: <FaMoneyBillWave className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.financial', action: 'view' },
        },
        {
          title: 'مواعيد السداد',
          href: '/dashboard/finances/payment-schedules',
          icon: <FiCalendar className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.financial.payment-schedules', action: 'view' },
        },
        {
          title: 'مدفوعات المتدربين',
          href: '/dashboard/finances/trainee-payments',
          icon: <FiDollarSign className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.financial', action: 'view' },
        },
        {
          title: 'القيود المالية',
          href: '/dashboard/finances/entries',
          icon: <FaExchangeAlt className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.financial', action: 'manage' },
        },
        {
          title: 'التقارير المالية',
          href: '/dashboard/finances/reports',
          icon: <FiBarChart2 className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.financial.reports', action: 'view' },
        },
        {
          title: 'العمولات',
          href: '/dashboard/finances/commissions',
          icon: <FiTrendingUp className="w-5 h-5" />,
          requiredPermission: { resource: 'commissions', action: 'read' },
        },
        {
          title: 'سجل العمليات',
          href: '/dashboard/finances/audit-logs',
          icon: <FiActivity className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.financial.audit-log', action: 'view' },
        },
      ]
    },
    {
      title: 'الرسوم المالية',
      icon: <FiCreditCard className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.financial', action: 'view' },
      items: [
        {
          title: 'رسوم المتدربين',
          href: '/dashboard/finances/trainee-fees',
          icon: <FiCreditCard className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.financial', action: 'view' },
        },
        {
          title: 'رسوم التظلمات',
          href: '/dashboard/requests/grade-appeals/fees',
          icon: <FiAlertCircle className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grade-appeals', action: 'view' },
        },
        {
          title: 'رسوم الدور الثاني',
          href: '/dashboard/grades/second-round-fees',
          icon: <FiDollarSign className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.grades.second-round-fees', action: 'manage' },
        },
      ]
    },
    {
      title: 'الموارد البشرية',
      icon: <FaUserTie className="w-5 h-5" />,
      requiredPermissions: [
        { resource: 'staff-attendance', action: 'view' },
        { resource: 'staff-attendance.enrollments', action: 'view' },
        { resource: 'staff-attendance.leaves', action: 'view' },
      ],
      requireAll: false,
      items: [
        {
          title: 'لوحة الحضور',
          href: '/dashboard/staff-attendance',
          icon: <FiBarChart2 className="w-5 h-5" />,
          requiredPermission: { resource: 'staff-attendance', action: 'view' },
          subGroup: 'نظام الحضور والغياب',
        },
        {
          title: 'سجلات الحضور',
          href: '/dashboard/staff-attendance/logs',
          icon: <FiFileText className="w-5 h-5" />,
          requiredPermission: { resource: 'staff-attendance', action: 'view' },
          subGroup: 'نظام الحضور والغياب',
        },
        {
          title: 'الموظفين المسجلين',
          href: '/dashboard/staff-attendance/employees',
          icon: <FiUsers className="w-5 h-5" />,
          requiredPermission: { resource: 'staff-attendance.enrollments', action: 'view' },
          subGroup: 'نظام الحضور والغياب',
        },
        {
          title: 'طلبات الإجازات',
          href: '/dashboard/staff-attendance/leaves',
          icon: <FiCalendar className="w-5 h-5" />,
          requiredPermission: { resource: 'staff-attendance.leaves', action: 'view' },
          subGroup: 'نظام الحضور والغياب',
        },
        {
          title: 'العطلات الرسمية',
          href: '/dashboard/staff-attendance/holidays',
          icon: <FiCalendar className="w-5 h-5" />,
          requiredPermission: { resource: 'staff-attendance.holidays', action: 'manage' },
          subGroup: 'نظام الحضور والغياب',
        },
        {
          title: 'إعدادات الحضور',
          href: '/dashboard/staff-attendance/settings',
          icon: <FiSettings className="w-5 h-5" />,
          requiredPermission: { resource: 'staff-attendance.settings', action: 'view' },
          subGroup: 'نظام الحضور والغياب',
        },
      ]
    },
    {
      title: 'إدارة المحتوى',
      icon: <FiBook className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.content', action: 'view' },
      items: [
        {
          title: 'الوظائف',
          href: '/dashboard/jobs',
          icon: <FaBuilding className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.jobs', action: 'view' },
        },
        {
          title: 'الأخبار',
          href: '/dashboard/news',
          icon: <FaNewspaper className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.news', action: 'view' },
        },
        {
          title: 'تسجيلات الفورم',
          href: '/dashboard/registrations',
          icon: <FiEdit className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.registrations', action: 'view' },
        },
      ]
    },
    {
      title: 'إدارة التسويق',
      icon: <FiTarget className="w-5 h-5" />,
      requiredPermissions: [
        { resource: 'marketing.employees', action: 'view' },
        { resource: 'marketing.targets', action: 'view' },
        { resource: 'marketing.applications', action: 'view' },
        { resource: 'marketing.stats', action: 'view' },
      ],
      requireAll: false, // واحدة فقط كافية
      items: [
        {
          title: 'موظفي التسويق',
          href: '/dashboard/marketing/employees',
          icon: <FiUserPlus className="w-5 h-5" />,
          requiredPermission: { resource: 'marketing.employees', action: 'view' },
        },
        {
          title: 'تحديد التارجت',
          href: '/dashboard/marketing/targets',
          icon: <FiTarget className="w-5 h-5" />,
          requiredPermission: { resource: 'marketing.targets', action: 'view' },
        },
        {
          title: 'التقديمات',
          href: '/dashboard/marketing/applications',
          icon: <FiFileText className="w-5 h-5" />,
          requiredPermission: { resource: 'marketing.applications', action: 'view' },
        },
        {
          title: 'إحصائيات التسويق',
          href: '/dashboard/marketing/stats',
          icon: <FiTrendingUp className="w-5 h-5" />,
          requiredPermission: { resource: 'marketing.stats', action: 'view' },
        },
      ]
    },
    {
      title: 'الأتمتة التلقائية',
      icon: <FiZap className="w-5 h-5" />,
      requiredPermissions: [
        { resource: 'whatsapp', action: 'read' },
        { resource: 'dashboard.whatsapp.campaigns', action: 'view' },
        { resource: 'dashboard.whatsapp.templates', action: 'view' },
        { resource: 'dashboard.automation.payment-reminders', action: 'view' }
      ],
      requireAll: false, // واحدة فقط كافية
      items: [
        {
          title: 'إدارة الواتساب',
          href: '/dashboard/whatsapp',
          icon: <FiMessageSquare className="w-5 h-5" />,
          requiredPermission: { resource: 'whatsapp', action: 'read' },
        },
        {
          title: 'الحملات الجماعية',
          href: '/dashboard/whatsapp/campaigns',
          icon: <FiTarget className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.whatsapp.campaigns', action: 'view' },
        },
        {
          title: 'قوالب الرسائل',
          href: '/dashboard/whatsapp/campaigns/templates',
          icon: <FiFileText className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.whatsapp.templates', action: 'view' },
        },
        {
          title: 'رسائل تذكير السداد',
          href: '/dashboard/automation/payment-reminders',
          icon: <FiBell className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.automation.payment-reminders', action: 'view' },
        },
      ]
    },
    {
      title: 'المساعد الذكي',
      icon: <FaRobot className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.vision-ai', action: 'view' },
      items: [
        {
          title: 'تصحيح ورقي',
          href: '/dashboard/vision-ai',
          icon: <ComputerDesktopIcon className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.vision-ai', action: 'view' },
        },
        {
          title: 'رفع أسئلة',
          href: '/dashboard/vision-ai/upload-questions',
          icon: <FiUpload className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.vision-ai.upload-questions', action: 'view' },
        },
        {
          title: 'محادثة ذكية',
          href: '/dashboard/vision-ai/chat',
          icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.vision-ai', action: 'view' },
        },
      ]
    },
    {
      title: 'منصة المتدربين',
      icon: <ComputerDesktopIcon className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.trainee-platform', action: 'view' },
      items: [
        {
          title: 'إدارة حسابات المتدربين',
          href: '/dashboard/trainee-platform/accounts',
          icon: <FaUsers className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainee-platform.accounts', action: 'view' },
        },
        {
          title: 'إحصائيات منصة المتدربين',
          href: '/dashboard/trainee-platform/stats',
          icon: <ChartBarIcon className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.trainee-platform.stats', action: 'view' },
        },
        {
          title: 'الاستبيانات',
          href: '/dashboard/trainee-platform/surveys',
          icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.surveys', action: 'view' },
        },
      ]
    },
    {
      title: 'إدارة الطلبات',
      icon: <FiInbox className="w-5 h-5" />,
      badge: (pendingRequestCounts.deferral + pendingRequestCounts.general + pendingRequestCounts.complaints + pendingRequestCounts.gradeAppeals) || undefined,
      requiredPermissions: [
        { resource: 'dashboard.deferral-requests', action: 'view' },
        { resource: 'dashboard.trainee-requests', action: 'view' },
        { resource: 'dashboard.complaints', action: 'view' },
        { resource: 'dashboard.grade-appeals', action: 'view' },
      ],
      requireAll: false,
      items: [
        {
          title: 'طلبات تأجيل السداد',
          href: '/dashboard/requests/deferral',
          icon: <FiCalendar className="w-5 h-5" />,
          badge: pendingRequestCounts.deferral || undefined,
          requiredPermission: { resource: 'dashboard.deferral-requests', action: 'view' },
        },
        {
          title: 'الطلبات المجانية',
          href: '/dashboard/requests/general',
          icon: <FiFileText className="w-5 h-5" />,
          badge: pendingRequestCounts.general || undefined,
          requiredPermission: { resource: 'dashboard.trainee-requests', action: 'view' },
        },
        {
          title: 'الشكاوي والاقتراحات',
          href: '/dashboard/requests/complaints',
          icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
          badge: pendingRequestCounts.complaints || undefined,
          requiredPermission: { resource: 'dashboard.complaints', action: 'view' },
        },
        {
          title: 'تظلمات الدرجات',
          href: '/dashboard/requests/grade-appeals',
          icon: <FiFileText className="w-5 h-5" />,
          badge: pendingRequestCounts.gradeAppeals || undefined,
          requiredPermission: { resource: 'dashboard.grade-appeals', action: 'view' },
        },
        {
          title: 'إعدادات الطلبات',
          href: '/dashboard/requests/settings',
          icon: <FiSettings className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.deferral-requests.settings', action: 'view' },
        },
      ]
    },
    {
      title: 'إدارة المستخدمين',
      icon: <FaUsers className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.users', action: 'view' },
      items: [
        {
          title: 'إدارة المستخدمين',
          href: '/dashboard/users',
          icon: <FaUser className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.users', action: 'view' },
        },
        {
          title: 'الأدوار والصلاحيات',
          href: '/dashboard/permissions',
          icon: <FaUserShield className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.permissions', action: 'manage' },
        },
      ]
    },
    {
      title: 'سجل حضوري',
      icon: <FiCheckSquare className="w-5 h-5" />,
      customVisible: isStaffEnrolled,
      items: [
        {
          title: 'تسجيل الحضور',
          href: '/dashboard/staff-attendance/check-in',
          icon: <FiClock className="w-5 h-5" />,
        },
        {
          title: 'سجل حضوري',
          href: '/dashboard/staff-attendance/my-logs',
          icon: <FiFileText className="w-5 h-5" />,
        },
        {
          title: 'طلبات إجازاتي',
          href: '/dashboard/staff-attendance/my-leaves',
          icon: <FiCalendar className="w-5 h-5" />,
        },
      ]
    },
    {
      title: 'إعدادات النظام',
      icon: <FiSettings className="w-5 h-5" />,
      requiredPermission: { resource: 'dashboard.settings', action: 'view' },
      items: [
        {
          title: 'حالة النظام',
          href: '/dashboard/settings/system-health',
          icon: <FiActivity className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.settings', action: 'view' },
        },
        {
          title: 'إعدادات النظام',
          href: '/dashboard/settings',
          icon: <FaWrench className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.settings', action: 'edit' },
        },
        {
          title: 'المواقع الجغرافية',
          href: '/dashboard/settings/locations',
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          requiredPermission: { resource: 'dashboard.settings.locations', action: 'manage' },
        },
        {
          title: 'إعدادات المطورين',
          href: '/dashboard/settings/developer',
          icon: <FiZap className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.developer-settings', action: 'view' },
        },
        {
          title: 'النسخ الاحتياطي',
          href: '/dashboard/settings/backup',
          icon: <FiDownload className="w-5 h-5" />,
          requiredPermission: { resource: 'dashboard.backup', action: 'view' },
        },
      ]
    },
  ];

  // عرض جميع الفئات بدون فلترة

  // التحقق مما إذا كان العنصر نشطًا - مقارنة دقيقة فقط
  const isItemActive = (href: string) => {
    // مقارنة مباشرة للمسار الحالي
    return pathname === href;
  };

  // التحقق مما إذا كانت الفئة تحتوي على عنصر نشط
  const isCategoryActive = (items: SidebarItem[]) => 
    items.some(item => isItemActive(item.href));

  // التبديل بين توسيع وطي الفئة
  const toggleCategory = (title: string) => {
    if (expandedCategory === title) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(title);
    }
  };

  // دالة لإغلاق السايد بار على الهواتف عند الضغط على رابط
  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (isMobile) {
      e.preventDefault();
      onClose();
      // تأخير مقلل للسماح للسايد بار بالإغلاق أولاً
      setTimeout(() => {
        router.push(href);
      }, 80);
    }
  };

  // دالة لإغلاق السايد بار عند الضغط على الشعار (الرئيسية)
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMobile) {
      onClose();
      // تأخير مقلل للسماح للسايد بار بالإغلاق أولاً
      setTimeout(() => {
        router.push('/dashboard');
      }, 80);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <>
      {/* خلفية معتمة للشاشات الصغيرة */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* الشريط الجانبي */}
      <aside 
        className={`fixed z-50 flex flex-col transition-transform duration-300 ease-out transform bg-blue-700 lg:inset-y-0 lg:right-0 lg:w-72 lg:h-screen lg:translate-x-0 inset-0 w-full h-full rounded-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* رأس الشريط الجانبي مع الشعار */}
        <div className="flex items-center justify-between p-6 pt-8 bg-blue-800">
          <button onClick={handleLogoClick} className="flex items-center gap-4 hover:opacity-90 transition-opacity">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-sm border border-white/10">
              <FaUserShield className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-white tracking-tight">المنصة الإدارية</h2>
              <p className="text-xs text-white mt-0.5">{centerName}</p>
            </div>
          </button>
          
          {/* زر إغلاق الشريط الجانبي على الشاشات الصغيرة */}
          <button 
            onClick={onClose} 
            className="lg:hidden p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى الشريط الجانبي */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* رابط الصفحة الرئيسية */}
          <Link 
            href="/dashboard"
            onClick={(e) => handleLinkClick(e, '/dashboard')}
            className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
              pathname === '/dashboard'
                ? 'bg-blue-500 text-white font-bold shadow-sm'
                : 'text-white hover:bg-white/10 font-medium'
            }`}
          >
            <FiHome className={`w-5 h-5 ml-3 transition-transform duration-300 ${
              pathname === '/dashboard' ? 'text-white' : 'text-white group-hover:scale-110'
            }`} />
            <span>الرئيسية</span>
          </Link>
          
          {/* فئات القائمة */}
          <div className="space-y-1 mt-2">
            {sidebarCategories.filter(canShowCategory).map((category) => (
              <div key={category.title} className="mb-1">
                  {/* إذا كانت الفئة لديها href مباشر (عنصر واحد) */}
                  {category.href ? (
                    <Link
                      href={category.href}
                      onClick={(e) => handleLinkClick(e, category.href!)}
                      className={`w-full flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 group ${
                        isItemActive(category.href)
                          ? 'bg-blue-500 text-white font-bold shadow-sm'
                          : 'text-white hover:bg-white/10 font-bold'
                      }`}
                    >
                      <span className={`ml-3 transition-all duration-300 ${
                        isItemActive(category.href)
                          ? 'text-white'
                          : 'text-white group-hover:scale-110'
                      }`}>{category.icon}</span>
                      <span className="flex-1">{category.title}</span>
                    </Link>
                  ) : (
                    <>
                      {/* عنوان الفئة */}
                      <button 
                        onClick={() => toggleCategory(category.title)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all duration-200 group font-bold ${
                          expandedCategory === category.title
                            ? 'bg-white/10 text-white'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className={`ml-3 transition-colors duration-200 ${
                            expandedCategory === category.title ? 'text-white' : 'text-white group-hover:scale-110'
                          }`}>{category.icon}</span>
                          <span>{category.title}</span>
                          {category.badge && category.badge > 0 && expandedCategory !== category.title && (
                            <span className="mr-2 text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-white/20 text-white/90 min-w-[18px] text-center">
                              {category.badge}
                            </span>
                          )}
                        </div>
                        <FiChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                          expandedCategory === category.title ? 'text-white rotate-180' : 'text-white -rotate-90'
                        }`} />
                      </button>
                      
                      {/* عناصر الفئة */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedCategory === category.title ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="mr-5 pr-4 border-r border-white/20 space-y-1 py-1">
                          {(() => {
                            const visibleItems = category.items.filter(canShowItem);
                            // تجميع العناصر: عناصر بدون subGroup تُعرض مباشرة، وعناصر مع subGroup تُجمع
                            const groups: { type: 'item' | 'subgroup'; item?: typeof visibleItems[0]; subGroup?: string; items?: typeof visibleItems }[] = [];
                            const subGroupMap = new Map<string, typeof visibleItems>();
                            const subGroupOrder: string[] = [];

                            visibleItems.forEach((item) => {
                              if (item.subGroup) {
                                if (!subGroupMap.has(item.subGroup)) {
                                  subGroupMap.set(item.subGroup, []);
                                  subGroupOrder.push(item.subGroup);
                                  groups.push({ type: 'subgroup', subGroup: item.subGroup });
                                }
                                subGroupMap.get(item.subGroup)!.push(item);
                              } else {
                                groups.push({ type: 'item', item });
                              }
                            });

                            return groups.map((group, gi) => {
                              if (group.type === 'item' && group.item) {
                                const item = group.item;
                                const disabled = isItemDisabled(item);
                                return (
                                  <Link 
                                    key={item.href}
                                    href={disabled ? '#' : item.href}
                                    onClick={(e) => {
                                      if (disabled) { e.preventDefault(); return; }
                                      handleLinkClick(e, item.href);
                                    }}
                                    className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-300 group ${
                                      disabled ? 'text-white/30 cursor-not-allowed'
                                        : isItemActive(item.href) ? 'bg-blue-500 text-white font-bold shadow-sm'
                                        : 'text-white hover:bg-white/10 font-medium'
                                    }`}
                                  >
                                    <span className={`ml-3 transition-all duration-300 ${
                                      disabled ? 'text-white/30'
                                        : isItemActive(item.href) ? 'text-white' : 'text-white group-hover:scale-110'
                                    }`}>{item.icon}</span>
                                    <span className="flex-1">{item.title}</span>
                                    {disabled && <span className="text-xs text-white/30">🔒</span>}
                                    {!disabled && item.badge != null && item.badge > 0 && (
                                      <span className={`text-[10px] rounded-full px-2 py-0.5 font-bold leading-none ${
                                        isItemActive(item.href) ? 'bg-white/25 text-white' : 'bg-white/20 text-white'
                                      }`}>{item.badge}</span>
                                    )}
                                  </Link>
                                );
                              }

                              if (group.type === 'subgroup' && group.subGroup) {
                                const sgItems = subGroupMap.get(group.subGroup)!;
                                const isSubExpanded = expandedSubGroup === group.subGroup;
                                const hasActiveItem = sgItems.some(i => isItemActive(i.href));
                                return (
                                  <div key={`sg-${group.subGroup}`}>
                                    <button
                                      onClick={() => setExpandedSubGroup(isSubExpanded ? null : group.subGroup!)}
                                      className="w-full flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 group font-bold text-white hover:bg-white/10"
                                    >
                                      <FiChevronDown className={`w-3.5 h-3.5 ml-2 transition-transform duration-300 text-white ${
                                        isSubExpanded ? 'rotate-180' : '-rotate-90'
                                      }`} />
                                      <FiFolder className="w-4 h-4 ml-2 text-white" />
                                      <span className="text-white">{group.subGroup}</span>
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                      isSubExpanded ? 'max-h-[500px] opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                                    }`}>
                                      <div className="mr-4 pr-3 border-r border-white/15 space-y-0.5 py-0.5">
                                        {sgItems.map((item) => {
                                          const disabled = isItemDisabled(item);
                                          return (
                                            <Link 
                                              key={item.href}
                                              href={disabled ? '#' : item.href}
                                              onClick={(e) => {
                                                if (disabled) { e.preventDefault(); return; }
                                                handleLinkClick(e, item.href);
                                              }}
                                              className={`flex items-center px-4 py-2 text-[13px] rounded-lg transition-all duration-300 group ${
                                                disabled ? 'text-white/30 cursor-not-allowed'
                                                  : isItemActive(item.href) ? 'bg-blue-500 text-white font-bold shadow-sm'
                                                  : 'text-white hover:bg-white/10 font-medium'
                                              }`}
                                            >
                                              <span className={`ml-3 transition-all duration-300 ${
                                                disabled ? 'text-white/30'
                                                  : isItemActive(item.href) ? 'text-white' : 'text-white group-hover:scale-110'
                                              }`}>{item.icon}</span>
                                              <span className="flex-1">{item.title}</span>
                                              {disabled && <span className="text-xs text-white/30">🔒</span>}
                                              {!disabled && item.badge != null && item.badge > 0 && (
                                                <span className={`text-[10px] rounded-full px-2 py-0.5 font-bold leading-none ${
                                                  isItemActive(item.href) ? 'bg-white/25 text-white' : 'bg-white/20 text-white'
                                                }`}>{item.badge}</span>
                                              )}
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            });
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
            ))}
          </div>
        </div>
          
        {/* تذييل الشريط الجانبي */}
        <div className="p-4 bg-blue-800/50">
          {/* زر تسجيل الخروج */}
          <button
            onClick={() => logout && logout()}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 text-sm text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 font-bold group"
          >
            <FiLogOut className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// Add the styles to the document
if (typeof document !== 'undefined') {
  // Removed custom scrollbar styles to use Tailwind hidden scrollbar
} 