'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { TibaModal } from '@/components/ui/tiba-modal';
import { toast } from 'react-hot-toast';
import ProtectedPage from '@/components/permissions/ProtectedPage';
import ZXingQRScanner from '@/components/attendance/ZXingQRScanner';
import QRCode from 'qrcode';
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PrinterIcon,
  HashtagIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  QrCodeIcon,
  BookOpenIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '@/lib/api';
import {
  getExpectedTrainees,
  bulkRecordAttendance,
  AttendanceStatus,
} from '@/lib/attendance-api';

interface Trainee {
  id: number;
  nameAr: string;
  nationalId: string;
  phone: string;
  email?: string;
}

const DAYS_AR: { [key: string]: string } = {
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
  SATURDAY: 'السبت',
};

export default function SessionAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = parseInt(params.sessionId as string);

  const [session, setSession] = useState<any>(null);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [attendance, setAttendance] = useState<{ [key: number]: AttendanceStatus }>({});
  const [notes, setNotes] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerInput, setScannerInput] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTimer, setConfirmTimer] = useState(6);
  const [scanMode, setScanMode] = useState<'manual' | 'camera'>('manual');
  const lastToastIdRef = useRef<string | null>(null);
  const [attendanceCode, setAttendanceCode] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const printQRCode = () => {
    if (!qrDataUrl || !attendanceCode) return;
    const sessionName = session?.scheduleSlot?.content?.name || '';
    const sessionDate = session ? new Date(session.date).toLocaleDateString('ar-SA') : '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كود تسجيل الحضور</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #fff; padding: 40px 20px; }
          .container { text-align: center; max-width: 500px; width: 100%; }
          h1 { font-size: 28px; color: #065f46; margin-bottom: 8px; }
          .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 30px; }
          .qr-box { border: 3px dashed #34d399; border-radius: 20px; padding: 30px; margin-bottom: 24px; background: #f0fdf4; }
          .qr-box img { width: 280px; height: 280px; }
          .code-box { border: 2px dashed #a7f3d0; border-radius: 16px; padding: 20px; margin-bottom: 24px; background: #f9fafb; }
          .code-label { font-size: 12px; color: #9ca3af; margin-bottom: 10px; }
          .code-digits { display: flex; justify-content: center; gap: 8px; direction: ltr; }
          .digit { width: 48px; height: 56px; display: flex; align-items: center; justify-content: center; background: #fff; border: 2px solid #34d399; border-radius: 10px; font-size: 28px; font-weight: 900; color: #065f46; }
          .session-info { font-size: 14px; color: #4b5563; margin-bottom: 30px; line-height: 1.8; }
          .session-info strong { color: #111827; }
          .hint { font-size: 11px; color: #9ca3af; margin-top: 16px; }
          .print-btn { background: linear-gradient(135deg, #10b981, #0d9488); color: #fff; border: none; padding: 12px 40px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px; }
          .print-btn:hover { opacity: 0.9; }
          @media print { .print-btn { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>كود تسجيل الحضور</h1>
          <p class="subtitle">امسح الكيو آر كود أو أدخل الكود لتسجيل حضورك</p>
          <div class="qr-box">
            <img src="${qrDataUrl}" alt="QR Code" />
          </div>
          <div class="code-box">
            <p class="code-label">أو أدخل الكود يدوياً</p>
            <div class="code-digits">
              ${attendanceCode.split('').map(d => `<span class="digit">${d}</span>`).join('')}
            </div>
          </div>
          ${sessionName || sessionDate ? `
          <div class="session-info">
            ${sessionName ? `<p><strong>المادة:</strong> ${sessionName}</p>` : ''}
            ${sessionDate ? `<p><strong>التاريخ:</strong> ${sessionDate}</p>` : ''}
          </div>` : ''}
          <p class="hint">يمكن للمتدرب مسح الكود من منصة المتدربين لتسجيل الحضور تلقائياً</p>
          <button class="print-btn" onclick="window.print()">🖨️ طباعة</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  // مؤقت نافذة التأكيد
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    
    if (showConfirmModal && confirmTimer > 0) {
      timer = setTimeout(() => {
        setConfirmTimer(confirmTimer - 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showConfirmModal, confirmTimer]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getExpectedTrainees(sessionId);
      
      setSession(data.session);
      setTrainees(data.trainees || []);

      // Load existing attendance records
      const existingAttendance: { [key: number]: AttendanceStatus } = {};
      const existingNotes: { [key: number]: string } = {};
      
      if (data.session.attendance) {
        data.session.attendance.forEach((record: any) => {
          existingAttendance[record.traineeId] = record.status;
          if (record.notes) {
            existingNotes[record.traineeId] = record.notes;
          }
        });
      }

      setAttendance(existingAttendance);
      setNotes(existingNotes);
      setHasUnsavedChanges(false); // لا توجد تغييرات غير محفوظة عند التحميل الأولي
    } catch (error: any) {
      console.error('Error loading data:', error);
      
      // إذا كانت المشكلة بسبب محاضرة سابقة لم تُسجل
      if (error?.message?.includes('يجب تسجيل حضور المحاضرة السابقة')) {
        toast.error(error.message, { duration: 5000 });
        // الرجوع للصفحة السابقة بعد 3 ثوانٍ
        setTimeout(() => {
          router.back();
        }, 3000);
      } else {
        toast.error('فشل تحميل البيانات');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (traineeId: number, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [traineeId]: status }));
    setHasUnsavedChanges(true);
    
    // حفظ تلقائي فوري
    await immediateAutoSave(traineeId, status, notes[traineeId]);
  };

  const handleNoteChange = async (traineeId: number, note: string) => {
    setNotes(prev => ({ ...prev, [traineeId]: note }));
    setHasUnsavedChanges(true);
    
    // حفظ تلقائي فوري إذا كان هناك حالة حضور مسجلة
    if (attendance[traineeId]) {
      await immediateAutoSave(traineeId, attendance[traineeId], note);
    }
  };

  const handleScannerInput = async (value: string) => {
    setScannerInput(value);
    
    // إذا كان الرقم القومي كامل (14 رقم)
    if (value.length === 14) {
      await processNationalId(value);
      // تنظيف الحقل
      setScannerInput('');
    }
  };

  // دالة معالجة الرقم القومي (مشتركة بين الإدخال اليدوي والكاميرا)
  const processNationalId = async (nationalId: string) => {
    const trainee = trainees.find(t => t.nationalId === nationalId);
    
    // إغلاق أي رسالة سابقة قبل عرض رسالة جديدة
    if (lastToastIdRef.current) {
      toast.dismiss(lastToastIdRef.current);
    }
      
      if (trainee) {
        // تسجيل حضور تلقائياً
        if (attendance[trainee.id] !== AttendanceStatus.PRESENT) {
          setAttendance(prev => ({ ...prev, [trainee.id]: AttendanceStatus.PRESENT }));
          setScannedCount(prev => prev + 1);
        setHasUnsavedChanges(true);
        
        // حفظ تلقائي فوري
        await immediateAutoSave(trainee.id, AttendanceStatus.PRESENT, notes[trainee.id]);
        
        // رسالة نجاح واحدة فقط
        const toastId = toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-2xl rounded-2xl pointer-events-auto flex items-center gap-3 p-4`}>
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">{trainee.nameAr}</p>
              <p className="text-green-50 text-sm">تم تسجيل الحضور بنجاح</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} className="text-white hover:text-green-100">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        ), { duration: 2000 });
        lastToastIdRef.current = toastId;
      } else {
        // رسالة تحذير واحدة فقط للمسجل مسبقاً
        const toastId = toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-2xl rounded-2xl pointer-events-auto flex items-center gap-3 p-4`}>
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <ExclamationCircleIcon className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">{trainee.nameAr}</p>
              <p className="text-amber-50 text-sm">مسجل مسبقاً - لا حاجة للتسجيل مرة أخرى</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} className="text-white hover:text-amber-100">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        ), { duration: 2000 });
        lastToastIdRef.current = toastId;
      }
    } else {
      // رسالة خطأ
      const toastId = toast.custom((t) => (
        <div className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-gradient-to-r from-red-500 to-rose-500 shadow-2xl rounded-2xl pointer-events-auto flex items-center gap-3 p-4`}>
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <XCircleIcon className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-base">رقم قومي غير موجود</p>
            <p className="text-red-50 text-sm">هذا المتدرب غير مسجل في المحاضرة</p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-white hover:text-red-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      ), { duration: 2500 });
      lastToastIdRef.current = toastId;
    }
  };

  // دالة معالجة المسح من الكاميرا
  const handleQRScan = async (nationalId: string) => {
    await processNationalId(nationalId);
  };

  // دالة الحفظ التلقائي الفوري
  const immediateAutoSave = async (traineeId: number, status: AttendanceStatus, note?: string) => {
    try {
      setAutoSaving(true);
      
      // تحضير السجل للتسجيل
      const record = {
        traineeId: traineeId,
        status: status,
        notes: note || undefined,
      };

      await bulkRecordAttendance({ sessionId, records: [record] });
      setLastSaved(new Date());
      console.log(`✅ تم حفظ ${getStatusLabel(status)} للمتدرب ${traineeId} تلقائياً`);
    } catch (error: any) {
      console.error('❌ فشل الحفظ التلقائي الفوري:', error);
      
      // رسالة خطأ واضحة حسب نوع المشكلة
      let errorMessage = 'فشل حفظ السجل تلقائياً';
      let duration = 3000;
      
      if (error?.message) {
        if (error.message.includes('تأخر في سداد') || error.message.includes('السداد أولاً')) {
          // 🔴 خطأ حجب الحضور بسبب عدم السداد
          errorMessage = `🚫 ${error.message}`;
          duration = 5000; // رسالة أطول لأنها مهمة
          
          // إلغاء التسجيل من UI
          setAttendance(prev => {
            const newAttendance = { ...prev };
            delete newAttendance[traineeId];
            return newAttendance;
          });
        } else if (error.message.includes('يوم المحاضرة')) {
          errorMessage = '⚠️ لا يمكن التسجيل إلا في يوم المحاضرة';
        } else if (error.message.includes('ملغاة')) {
          errorMessage = '⚠️ المحاضرة ملغاة';
        } else if (error.message.includes('غير موجودة')) {
          errorMessage = '⚠️ المحاضرة غير موجودة';
        } else if (error.message.includes('صلاحية')) {
          errorMessage = '⚠️ ليس لديك صلاحية التسجيل';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }
      
      toast.error(errorMessage, { duration });
    } finally {
      setAutoSaving(false);
    }
  };

  // دالة الحفظ التلقائي (للحفظ الدوري)
  const autoSave = async () => {
    if (autoSaving || !hasUnsavedChanges) return;
    
    try {
      setAutoSaving(true);
      
      // تحضير السجلات للتسجيل
      const records = trainees
        .filter(trainee => attendance[trainee.id]) // فقط المتدربين الذين تم تسجيل حضورهم
        .map(trainee => ({
          traineeId: trainee.id,
          status: attendance[trainee.id],
          notes: notes[trainee.id] || undefined,
        }));

      if (records.length > 0) {
        await bulkRecordAttendance({ sessionId, records });
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        console.log('✅ تم الحفظ التلقائي بنجاح');
      }
    } catch (error: any) {
      console.error('❌ فشل الحفظ التلقائي:', error);
      
      // عرض رسالة خطأ بدون إزعاج (silent error - فقط في الكونسول)
      // لأن الحفظ التلقائي الدوري يمكن أن يفشل لأسباب طبيعية
      if (error?.message?.includes('يوم المحاضرة')) {
        console.warn('⚠️ تم تعطيل الحفظ التلقائي: المحاضرة ليست اليوم');
      }
    } finally {
      setAutoSaving(false);
    }
  };

  // useEffect للحفظ التلقائي كل 30 ثانية
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const interval = setInterval(() => {
      autoSave();
    }, 30000); // كل 30 ثانية

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, attendance, notes]);

  // useEffect للحفظ التلقائي عند مغادرة الصفحة
  useEffect(() => {
    const handleBeforeUnload = async (_e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // محاولة حفظ التغييرات قبل المغادرة
        try {
          await autoSave();
        } catch (error) {
          console.error('فشل الحفظ عند المغادرة:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden && hasUnsavedChanges) {
        // محاولة حفظ التغييرات عند إخفاء الصفحة
        try {
          await autoSave();
        } catch (error) {
          console.error('فشل الحفظ عند إخفاء الصفحة:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasUnsavedChanges]);

  const markRemainingAsAbsent = () => {
    setConfirmTimer(6); // إعادة تعيين المؤقت
    setShowConfirmModal(true);
  };

  const handleFinishSession = async () => {
    try {
      setSaving(true);
      setShowConfirmModal(false);

      // تسجيل غياب لمن لم يُسجل
      const newAttendance: { [key: number]: AttendanceStatus } = { ...attendance };
      const absentTrainees: string[] = [];
      
      trainees.forEach(trainee => {
        if (!newAttendance[trainee.id]) {
          newAttendance[trainee.id] = AttendanceStatus.ABSENT;
          absentTrainees.push(trainee.nameAr);
        }
      });

      // حفظ السجلات
      const records = trainees.map(trainee => ({
        traineeId: trainee.id,
        status: newAttendance[trainee.id] || AttendanceStatus.ABSENT,
        notes: notes[trainee.id] || undefined,
      }));

      await bulkRecordAttendance({ sessionId, records });
      
      setHasUnsavedChanges(false); // تم حفظ جميع التغييرات
      
      // عرض رسالة النجاح مع تفاصيل تسجيل الغياب التلقائي
      let successMessage = '✅ تم إنهاء المحاضرة وحفظ سجلات الحضور بنجاح';
      
      if (absentTrainees.length > 0) {
        successMessage += `\n📝 تم تسجيل غياب تلقائي لـ ${absentTrainees.length} متدرب: ${absentTrainees.slice(0, 3).join(', ')}${absentTrainees.length > 3 ? '...' : ''}`;
      }
      
      toast.success(successMessage, {
        duration: 4000
      });
      
      // الخروج من صفحة الجلسة فوراً
      router.replace('/dashboard/attendance');
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('فشل حفظ سجلات الحضور');
      setSaving(false);
    }
  };

  const markAll = async (status: AttendanceStatus) => {
    const newAttendance: { [key: number]: AttendanceStatus } = {};
    filteredTrainees.forEach(trainee => {
      newAttendance[trainee.id] = status;
    });
    setAttendance(prev => ({ ...prev, ...newAttendance }));
    setHasUnsavedChanges(true);
    
    // حفظ تلقائي فوري لجميع المتدربين
    const savePromises = filteredTrainees.map(trainee => 
      immediateAutoSave(trainee.id, status, notes[trainee.id])
    );
    
    try {
      await Promise.all(savePromises);
      toast.success(`تم تعيين الجميع كـ ${getStatusLabel(status)} وحفظ تلقائياً`);
    } catch (error) {
      toast.error('فشل حفظ بعض السجلات');
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: return 'حاضر';
      case AttendanceStatus.ABSENT: return 'غائب';
      case AttendanceStatus.LATE: return 'متأخر';
      case AttendanceStatus.EXCUSED: return 'بعذر';
    }
  };

  const getStats = () => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: trainees.length,
    };

    trainees.forEach(trainee => {
      const status = attendance[trainee.id];
      if (status === AttendanceStatus.PRESENT) stats.present++;
      else if (status === AttendanceStatus.ABSENT) stats.absent++;
      else if (status === AttendanceStatus.LATE) stats.late++;
      else if (status === AttendanceStatus.EXCUSED) stats.excused++;
    });

    return stats;
  };

  // حساب الإحصائيات في كل مرة يتغير فيها attendance
  const stats = getStats();
  
  const filteredTrainees = trainees.filter(trainee =>
    trainee.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainee.nationalId.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="..." description="جاري التحميل..." breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }, { label: '...' }]} />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1, 2, 3].map(i => (<div key={i}><div className="h-3 bg-slate-100 rounded w-20 mb-2" /><div className="h-4 bg-slate-200 rounded w-32" /></div>))}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">{[1, 2, 3, 4, 5].map(i => (<div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 animate-pulse"><div className="h-6 bg-slate-200 rounded w-10 mx-auto mb-1" /><div className="h-3 bg-slate-100 rounded w-14 mx-auto" /></div>))}</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="المحاضرة غير موجودة" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'رصد الحضور', href: '/dashboard/attendance' }]} />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarDaysIcon className="w-7 h-7 text-slate-400" /></div>
            <h3 className="text-base font-bold text-slate-800 mb-3">المحاضرة غير موجودة</h3>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/attendance')} leftIcon={<ArrowRightIcon className="w-4 h-4" />}>العودة</Button>
          </div>
        </div>
      </div>
    );
  }

  const sessionDate = new Date(session.date);

  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.attendance', action: 'record' }}>
      <div className="space-y-6">

          {/* Auto Save Status */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            {autoSaving && (
              <div className="flex items-center gap-1 sm:gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                <span className="hidden sm:inline">جاري الحفظ التلقائي...</span>
                <span className="sm:hidden">حفظ...</span>
              </div>
            )}
            
            {hasUnsavedChanges && !autoSaving && (
              <div className="flex items-center gap-1 sm:gap-2 text-amber-600">
                <ExclamationCircleIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">توجد تغييرات غير محفوظة</span>
                <span className="sm:hidden">غير محفوظ</span>
              </div>
            )}
            
            {lastSaved && !hasUnsavedChanges && (
              <div className="flex items-center gap-1 sm:gap-2 text-emerald-600">
                <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">آخر حفظ: {lastSaved.toLocaleTimeString('ar-EG')}</span>
                <span className="md:hidden">محفوظ ✓</span>
              </div>
            )}
            
            <div className="hidden md:flex items-center gap-2 text-slate-500">
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>الحفظ التلقائي الفوري مفعل</span>
            </div>
          </div>

          <PageHeader
            title="تسجيل الحضور"
            description={session.scheduleSlot.content.name}
            breadcrumbs={[
              { label: 'لوحة التحكم', href: '/dashboard' },
              { label: 'رصد الحضور', href: '/dashboard/attendance' },
              { label: 'تسجيل الحضور' }
            ]}
          />

          {/* Session Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><BookOpenIcon className="w-4 h-4 text-blue-600" /></div>
                  <div><p className="text-[11px] text-slate-500">المادة</p><p className="text-sm font-bold text-slate-900 line-clamp-1">{session.scheduleSlot.content.name}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0"><CalendarDaysIcon className="w-4 h-4 text-violet-600" /></div>
                  <div><p className="text-[11px] text-slate-500">التاريخ</p><p className="text-sm font-bold text-slate-900">{DAYS_AR[session.scheduleSlot.dayOfWeek]} - {sessionDate.toLocaleDateString('ar-EG')}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0"><ClockIcon className="w-4 h-4 text-emerald-600" /></div>
                  <div><p className="text-[11px] text-slate-500">الوقت</p><p className="text-sm font-bold text-slate-900">{session.scheduleSlot.startTime} - {session.scheduleSlot.endTime}</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs sm:text-sm text-slate-500">المجموع</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
              <div className="p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.present}</p>
                <p className="text-xs sm:text-sm text-slate-500">حاضر</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-red-500">
              <div className="p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-xs sm:text-sm text-slate-500">غائب</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-amber-500">
              <div className="p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.late}</p>
                <p className="text-xs sm:text-sm text-slate-500">متأخر</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
              <div className="p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.excused}</p>
                <p className="text-xs sm:text-sm text-slate-500">بعذر</p>
              </div>
            </div>
          </div>

          {/* QR/Barcode Scanner */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-teal-500">
            <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <QrCodeIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">📱 مسح QR Code / Barcode</h3>
                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-1">استخدم جهاز المسح أو اكتب الرقم القومي يدوياً</p>
                </div>
                <div className="text-center bg-white rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm border border-slate-200">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{scannedCount}</p>
                  <p className="text-[10px] text-slate-500">تم المسح</p>
                </div>
              </div>

              {/* أزرار اختيار طريقة المسح */}
              <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Button
                  onClick={() => setScanMode('manual')}
                  variant={scanMode === 'manual' ? 'primary' : 'outline'}
                  className="flex-1 text-xs sm:text-sm py-2 sm:py-3"
                >
                  <span className="hidden sm:inline">⌨️ إدخال يدوي / باركود</span>
                  <span className="sm:hidden">⌨️ يدوي</span>
                </Button>
                <Button
                  onClick={() => setScanMode('camera')}
                  variant={scanMode === 'camera' ? 'primary' : 'outline'}
                  className={`flex-1 text-xs sm:text-sm py-2 sm:py-3 ${scanMode === 'camera' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  <span className="hidden sm:inline">📷 كاميرا QR مباشرة</span>
                  <span className="sm:hidden">📷 كاميرا</span>
                </Button>
              </div>

              {/* الإدخال اليدوي / الباركود */}
              {scanMode === 'manual' && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    value={scannerInput}
                    onChange={(e) => handleScannerInput(e.target.value)}
                    placeholder="امسح أو اكتب الرقم القومي..."
                    className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-lg sm:text-xl md:text-2xl text-center font-bold border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all bg-white"
                    autoFocus
                    maxLength={14}
                  />
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className={`h-2 w-2 rounded-full ${scannerInput.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {scannerInput.length}/14 رقم
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={markRemainingAsAbsent}
                  variant="danger"
                  className="px-4 sm:px-6 py-3 sm:py-4 h-auto shadow-lg text-sm sm:text-base"
                  disabled={saving}
                >
                  <ArrowDownTrayIcon className="w-5 h-5 ml-2" />
                  <span className="font-bold">
                    {saving ? 'جاري الحفظ...' : 'إنهاء المحاضرة'}
                    <br className="hidden sm:inline"/>
                    <span className="text-xs hidden sm:inline">{saving ? '' : 'وحفظ السجلات'}</span>
                  </span>
                </Button>
              </div>
              )}

              {/* ماسح الكاميرا */}
              {scanMode === 'camera' && (
                <div>
                  <ZXingQRScanner
                    onScan={handleQRScan}
                    isActive={scanMode === 'camera'}
                    className="mb-3 sm:mb-4"
                  />
                  <Button
                    onClick={markRemainingAsAbsent}
                    variant="danger"
                    className="w-full px-6 py-4 h-auto shadow-lg"
                    disabled={saving}
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 ml-2" />
                    <span className="font-bold">
                      {saving ? 'جاري الحفظ...' : 'إنهاء المحاضرة وحفظ السجلات'}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                <div className="w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو الرقم القومي..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => {
                      window.open(`/print/session-attendance/${sessionId}`, '_blank');
                    }}
                    variant="primary"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <PrinterIcon className="w-4 h-4 ml-1.5" />
                    <span className="hidden sm:inline">🖨️ طباعة كشف الحضور</span>
                    <span className="sm:hidden">🖨️ طباعة</span>
                  </Button>

                  <Button
                    onClick={async () => {
                      setGeneratingCode(true);
                      try {
                        const res = await fetchAPI(`/attendance/session/${sessionId}/generate-code`, {
                          method: 'POST',
                          body: JSON.stringify({}),
                        });
                        setAttendanceCode(res.code);
                        try {
                          const qrUrl = await QRCode.toDataURL(res.code, {
                            width: 400,
                            margin: 2,
                            color: { dark: '#000000', light: '#FFFFFF' },
                            errorCorrectionLevel: 'H',
                          });
                          setQrDataUrl(qrUrl);
                        } catch (e) {
                          console.error('QR generation error:', e);
                        }
                        setShowCodeModal(true);
                        if (res.isNew) {
                          toast.success('تم إنشاء كود الحضور بنجاح');
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'حدث خطأ في إنشاء الكود');
                      } finally {
                        setGeneratingCode(false);
                      }
                    }}
                    disabled={generatingCode}
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm"
                  >
                    <HashtagIcon className="w-4 h-4 ml-1.5" />
                    <span className="hidden sm:inline">{generatingCode ? 'جاري الإنشاء...' : '🔢 كود تسجيل الحضور'}</span>
                    <span className="sm:hidden">{generatingCode ? '...' : '🔢 كود'}</span>
                  </Button>
                  
                  <Button
                    onClick={() => markAll(AttendanceStatus.PRESENT)}
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5 ml-1" />
                    <span className="hidden sm:inline">تحديد الكل حاضر</span>
                    <span className="sm:hidden">كل حاضر</span>
                  </Button>
                  <Button
                    onClick={() => markAll(AttendanceStatus.ABSENT)}
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <XCircleIcon className="w-3.5 h-3.5 ml-1" />
                    <span className="hidden sm:inline">تحديد الكل غائب</span>
                    <span className="sm:hidden">كل غائب</span>
                  </Button>
                  
                  {hasUnsavedChanges && (
                    <Button
                      onClick={autoSave}
                      disabled={autoSaving}
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-600 text-xs sm:text-sm"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5 ml-1" />
                      <span className="hidden sm:inline">{autoSaving ? 'جاري الحفظ...' : 'حفظ إضافي'}</span>
                      <span className="sm:hidden">حفظ</span>
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من الخروج؟\n\nملاحظة: تم حفظ جميع التغييرات تلقائياً فور تسجيلها.')) {
                        router.push('/dashboard/attendance');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-1 transform rotate-180" />
                    خروج
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Trainees List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">
                قائمة المتدربين ({filteredTrainees.length})
              </h3>

              <div className="space-y-2 sm:space-y-3">
                {filteredTrainees.map((trainee, index) => {
                  const hasStatus = !!attendance[trainee.id];
                  const isPresent = attendance[trainee.id] === AttendanceStatus.PRESENT;
                  
                  return (
                    <div
                      key={trainee.id}
                      className={`border rounded-xl p-2 sm:p-4 transition-all ${
                        hasStatus
                          ? isPresent
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-slate-50 border-slate-200'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2 sm:gap-4 mb-2 sm:mb-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          hasStatus
                            ? isPresent
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-400 text-white'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {hasStatus && isPresent ? (
                            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <span className="font-bold text-xs sm:text-base">{index + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">{trainee.nameAr}</h4>
                            {isPresent && (
                              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500 text-white text-[10px] sm:text-xs rounded-full font-bold whitespace-nowrap">
                                ✓ مسجل
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:gap-4 text-xs sm:text-sm text-slate-500 mt-1 space-y-0.5 sm:space-y-0">
                            <span className="truncate">📋 {trainee.nationalId}</span>
                            <span className="truncate" dir="ltr">📞 {trainee.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                        <button
                          onClick={() => handleStatusChange(trainee.id, AttendanceStatus.PRESENT)}
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                            attendance[trainee.id] === AttendanceStatus.PRESENT
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircleIcon className="inline w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                          حاضر
                        </button>
                        <button
                          onClick={() => handleStatusChange(trainee.id, AttendanceStatus.LATE)}
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                            attendance[trainee.id] === AttendanceStatus.LATE
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-amber-100'
                          }`}
                        >
                          <ClockIcon className="inline w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                          متأخر
                        </button>
                        <button
                          onClick={() => handleStatusChange(trainee.id, AttendanceStatus.EXCUSED)}
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                            attendance[trainee.id] === AttendanceStatus.EXCUSED
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-blue-100'
                          }`}
                        >
                          <ExclamationCircleIcon className="inline w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                          بعذر
                        </button>
                        <button
                          onClick={() => handleStatusChange(trainee.id, AttendanceStatus.ABSENT)}
                          className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                            attendance[trainee.id] === AttendanceStatus.ABSENT
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-red-100'
                          }`}
                        >
                          <XCircleIcon className="inline w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                          غائب
                        </button>
                      </div>

                      {/* Notes */}
                      {attendance[trainee.id] && (
                        <div className="mt-2 sm:mt-3">
                          <input
                            type="text"
                            value={notes[trainee.id] || ''}
                            onChange={(e) => handleNoteChange(trainee.id, e.target.value)}
                            placeholder="ملاحظات (اختياري)..."
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
      </div>

      {/* Confirmation Modal */}
      <TibaModal
        open={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setConfirmTimer(6); }}
        variant="warning"
        size="md"
        title="تأكيد إنهاء المحاضرة"
        subtitle="هل أنت متأكد من إنهاء المحاضرة؟"
        icon={<ExclamationCircleIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => { setShowConfirmModal(false); setConfirmTimer(6); }}>إلغاء</Button>
            <Button variant="danger" className="flex-1" onClick={handleFinishSession} disabled={saving || confirmTimer > 0}>
              <ArrowDownTrayIcon className="w-4 h-4 ml-2" />
              {saving ? 'جاري الحفظ...' : confirmTimer > 0 ? `انتظر (${confirmTimer}s)` : 'تأكيد وإنهاء'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-red-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm text-slate-700 text-center leading-relaxed">
              سيتم تسجيل <span className="font-bold text-red-600">غياب تلقائي</span> لجميع المتدربين الذين لم يتم تسجيل حضورهم.
            </p>
            <p className="text-xs text-emerald-600 text-center mt-2 leading-relaxed">
              ✅ جميع التغييرات محفوظة تلقائياً فور تسجيلها
            </p>
          </div>

          {confirmTimer > 0 && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-bold">انتظر {confirmTimer} ثانية للتأكيد...</span>
              </div>
            </div>
          )}
        </div>
      </TibaModal>

      {/* مودال كود تسجيل الحضور */}
      <TibaModal
        open={showCodeModal && !!attendanceCode}
        onClose={() => setShowCodeModal(false)}
        variant="primary"
        size="md"
        title="كود تسجيل الحضور"
        icon={<HashtagIcon className="w-6 h-6" />}
        footer={
          <div className="space-y-3 w-full">
            <div className="flex gap-2">
              {qrDataUrl && (
                <Button variant="outline" className="flex-1 text-sm" onClick={printQRCode}>
                  <PrinterIcon className="w-4 h-4 ml-1.5" />
                  طباعة
                </Button>
              )}
              <Button variant="outline" className="flex-1 text-sm" onClick={() => { navigator.clipboard.writeText(attendanceCode!); toast.success('تم نسخ الكود'); }}>
                <ClipboardDocumentIcon className="w-4 h-4 ml-1.5" />
                نسخ الكود
              </Button>
            </div>
            <button
              onClick={async () => {
                if (!confirm('هل أنت متأكد من تعطيل الكود؟')) return;
                try {
                  await fetchAPI(`/attendance/session/${sessionId}/deactivate-code`, { method: 'PATCH' });
                  setAttendanceCode(null);
                  setShowCodeModal(false);
                  toast.success('تم تعطيل الكود');
                } catch (err: any) {
                  toast.error(err.message || 'حدث خطأ');
                }
              }}
              className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors"
            >
              تعطيل الكود
            </button>
          </div>
        }
      >
        <div className="text-center space-y-5">
          <div className="bg-slate-50 rounded-xl p-6 border-2 border-dashed border-emerald-300">
            <p className="text-xs text-slate-500 mb-2">الكود المكون من 6 أرقام</p>
            <div className="flex items-center justify-center gap-2">
              {attendanceCode?.split('').map((digit, i) => (
                <span key={i} className="w-12 h-14 flex items-center justify-center bg-white border-2 border-emerald-400 rounded-lg text-2xl font-black text-emerald-700 shadow-sm">
                  {digit}
                </span>
              ))}
            </div>
          </div>

          {qrDataUrl && (
            <div className="bg-slate-50 rounded-xl p-4 border-2 border-dashed border-blue-300">
              <p className="text-xs text-slate-500 mb-3">كيو آر كود للمسح بالكاميرا</p>
              <div className="flex justify-center">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-lg border-2 border-white shadow-sm" />
              </div>
            </div>
          )}

          {session && (
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-bold">المادة:</span> {session.scheduleSlot?.content?.name}</p>
              <p><span className="font-bold">التاريخ:</span> {new Date(session.date).toLocaleDateString('ar-SA')}</p>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            يمكن للمتدرب إدخال الكود أو مسح الكيو آر من منصة المتدربين لتسجيل حضوره تلقائياً
          </p>
        </div>
      </TibaModal>
    </ProtectedPage>
  );
}


