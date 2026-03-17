'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UserIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  AcademicCapIcon,
  ScaleIcon,
  ChartBarIcon,
  BookOpenIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  IdentificationIcon,
  InboxIcon,
  LockClosedIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

interface TraineeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  traineeData: any;
}

const menuItems = [
  {
    title: 'الرئيسية',
    href: '/trainee-dashboard',
    icon: HomeIcon,
    description: 'نظرة عامة على حسابك'
  },
  {
    title: 'البيانات الشخصية',
    href: '/trainee-dashboard/profile',
    icon: UserIcon,
    description: 'عرض وتحديث بياناتك'
  },
  {
    title: 'سجل الحضور والغياب',
    href: '/trainee-dashboard/attendance',
    icon: CalendarDaysIcon,
    description: 'متابعة حضورك وغيابك'
  },
  {
    title: 'تسجيل حضور',
    href: '/trainee-dashboard/check-in',
    icon: QrCodeIcon,
    description: 'تسجيل حضورك عبر كود المحاضرة'
  },
  {
    title: 'الجدول الدراسي',
    href: '/trainee-dashboard/schedule',
    icon: ClockIcon,
    description: 'عرض الجدول الدراسي'
  },
  {
    title: 'المدفوعات والرسوم',
    href: '/trainee-dashboard/payments',
    icon: CurrencyDollarIcon,
    description: 'عرض المدفوعات والمستحقات'
  },
  {
    title: 'النتائج الدراسية',
    href: '/trainee-dashboard/released-grades',
    icon: ChartBarIcon,
    description: 'عرض الدرجات المعلنة للفصول الدراسية'
  },
  {
    title: 'تظلمات الدرجات',
    href: '/trainee-dashboard/appeals',
    icon: ScaleIcon,
    description: 'تقديم ومتابعة تظلمات الدرجات',
    key: 'appeals'
  },
  {
    title: 'الطلبات',
    href: '/trainee-dashboard/requests',
    icon: InboxIcon,
    description: 'تأجيل سداد، إجازة، إثبات قيد، إفادة'
  },
  {
    title: 'المحتوى التعليمي',
    href: '/trainee-dashboard/content',
    icon: BookOpenIcon,
    description: 'الوصول للمواد التعليمية'
  },
  {
    title: 'المهام والتكليفات',
    href: '/trainee-dashboard/assignments',
    icon: ClipboardDocumentCheckIcon,
    description: 'عرض وتسليم المهام'
  },
  {
    title: 'الوثائق والشهادات',
    href: '/trainee-dashboard/documents',
    icon: DocumentTextIcon,
    description: 'تحميل وعرض الوثائق'
  },
  {
    title: 'كارنيه المتدرب',
    href: '/trainee-dashboard/id-card',
    icon: IdentificationIcon,
    description: 'متابعة حالة كارنيه المتدرب'
  },
  {
    title: 'الاختبارات الإلكترونية',
    href: '/trainee-dashboard/quizzes',
    icon: AcademicCapIcon,
    description: 'أداء الاختبارات المصغرة'
  },
  {
    title: 'الاستبيانات',
    href: '/trainee-dashboard/surveys',
    icon: ClipboardDocumentListIcon,
    description: 'تعبئة الاستبيانات والاستطلاعات'
  },
  {
    title: 'الشكاوي والاقتراحات',
    href: '/trainee-dashboard/complaints',
    icon: ExclamationTriangleIcon,
    description: 'تسجيل الشكاوي والاقتراحات'
  },
];

export default function TraineeSidebar({ isOpen, onClose, traineeData }: TraineeSidebarProps) {
  const pathname = usePathname();
  const [centerName, setCenterName] = useState('منصة المتدربين');

  useEffect(() => {
    const fetchCenterName = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.centerName) setCenterName(data.centerName);
        }
      } catch (err) {
        console.error('Error fetching center name:', err);
      }
    };
    fetchCenterName();
  }, []);

  return (
    <>
      {/* Desktop Sidebar - Floating Style */}
      <div className="hidden lg:fixed lg:inset-y-4 lg:right-4 lg:z-50 lg:block lg:w-[280px] lg:bg-emerald-600 lg:rounded-3xl lg:shadow-[0_8px_30px_rgb(16,185,129,0.2)] lg:border lg:border-emerald-500/30 overflow-hidden flex flex-col">
        <SidebarContent traineeData={traineeData} pathname={pathname} centerName={centerName} />
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Sidebar (Full Screen with Animation) */}
      <div 
        className={`fixed inset-0 z-50 bg-emerald-600 lg:hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] origin-bottom ${
          isOpen 
            ? 'opacity-100 translate-y-0 scale-100 visible' 
            : 'opacity-0 translate-y-12 scale-95 invisible'
        }`}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-900/30 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between p-6 sm:p-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20 backdrop-blur-sm border border-white/20">
              <AcademicCapIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">منصة المتدربين</h2>
              <p className="text-xs font-bold text-emerald-100 mt-0.5">{centerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all border border-white/10 backdrop-blur-sm shadow-sm"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="relative z-10 flex-1 overflow-y-auto sidebar-scrollbar px-2 sm:px-4 py-6">
          <SidebarContent traineeData={traineeData} pathname={pathname} onItemClick={onClose} isMobile isOpen={isOpen} centerName={centerName} />
        </div>
      </div>
    </>
  );
}

function SidebarContent({ traineeData, pathname, onItemClick, isMobile, isOpen, centerName }: { 
  traineeData: any; 
  pathname: string; 
  onItemClick?: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  centerName?: string;
}) {
  const [hasReleasedGrades, setHasReleasedGrades] = useState(false);

  useEffect(() => {
    const checkReleasedGrades = async () => {
      if (!traineeData?.id) return;
      try {
        const token = localStorage.getItem('trainee_token') || localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/trainee-grades/${traineeData.id}/released`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          const hasViewable = data.classrooms?.some((c: any) => c.canView && c.contents?.some((ct: any) => ct.grade && ct.maxMarks?.total > 0));
          setHasReleasedGrades(!!hasViewable);
        }
      } catch (err) {
        console.error('Error checking released grades:', err);
      }
    };
    checkReleasedGrades();
  }, [traineeData?.id]);

  return (
    <div className={`flex flex-col h-full ${isMobile ? 'bg-transparent' : 'bg-emerald-600'}`}>
      {/* Header (Desktop Only) */}
      {!isMobile && (
        <div className="p-6 pt-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-900/20">
              <AcademicCapIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">منصة المتدربين</h2>
              <p className="text-xs font-bold text-white mt-0.5">{centerName || 'منصة المتدربين'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto sidebar-scrollbar pb-6">
        <div className={`text-xs font-bold text-emerald-100 mb-6 px-2 uppercase tracking-wider transition-all duration-500 delay-100 ${isMobile && !isOpen ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>القائمة الرئيسية</div>
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isDisabled = (item as any).key === 'appeals' && !hasReleasedGrades;
          
          // حساب التأخير لكل عنصر في الموبايل لعمل تأثير متتالي (Staggered)
          const delay = isMobile ? `${150 + index * 50}ms` : '0ms';
          const animationClass = isMobile 
            ? `transition-all duration-500 ease-out ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`
            : '';

          if (isDisabled) {
            return (
              <div
                key={item.href}
                style={{ transitionDelay: delay }}
                className={`group flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold bg-white/5 text-white/40 cursor-not-allowed ${animationClass}`}
                title="لا توجد نتائج معلنة حالياً"
              >
                <LockClosedIcon className="w-6 h-6 text-white/40" />
                <span className="text-base">{item.title}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              style={{ transitionDelay: delay }}
              className={`group relative flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold overflow-hidden ${animationClass} ${
                isActive
                  ? 'text-white bg-white/20 shadow-md ring-1 ring-white/30 scale-[1.02]'
                  : 'text-white hover:bg-white/10 hover:scale-[1.02] transition-transform'
              }`}
            >
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-white rounded-l-full shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
              )}
              <Icon className={`w-6 h-6 transition-colors text-white ${isActive ? 'drop-shadow-md' : ''}`} />
              <span className="text-base">{item.title}</span>
            </Link>
          );
        })}
      </nav>


    </div>
  );
}
