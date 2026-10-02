'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpenIcon,
  AcademicCapIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  SparklesIcon,
  MicrophoneIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../hooks/useTraineeProfile';
import LoadingScreen from '../components/LoadingScreen';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { handleTokenExpiry, isTokenExpiryError } from '@/lib/trainee-api';
import { processBatchesWithFallback } from '@/lib/batch-processor';

interface ClassroomGroup {
  classroom: {
    id: number;
    name: string;
    classNumber: number;
    startDate: string | null;
    endDate: string | null;
  };
  contents: any[];
}

export default function TraineeContentPage() {
  const { profile: traineeData, loading: profileLoading, error: profileError } = useTraineeProfile();
  
  const [loading, setLoading] = useState(true);
  const [trainingContents, setTrainingContents] = useState<any[]>([]);
  const [activeClassroomId, setActiveClassroomId] = useState<number | null>(null);
  const [centerName, setCenterName] = useState('');

  useEffect(() => {
    const fetchCenterName = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.centerName) setCenterName(data.centerName);
        }
      } catch (err) { /* ignore */ }
    };
    fetchCenterName();
  }, []);

  useEffect(() => {
    if (traineeData?.trainee?.program?.id) {
      loadTrainingContents();
    }
  }, [traineeData]);

  // تجميع المحتويات حسب الفصل الدراسي
  const classroomGroups = useMemo<ClassroomGroup[]>(() => {
    const groupMap: Record<number, ClassroomGroup> = {};
    
    trainingContents.forEach((content) => {
      const cls = content.classroom;
      if (!cls) return;
      
      if (!groupMap[cls.id]) {
        groupMap[cls.id] = {
          classroom: {
            id: cls.id,
            name: cls.name,
            classNumber: cls.classNumber ?? 0,
            startDate: cls.startDate,
            endDate: cls.endDate,
          },
          contents: [],
        };
      }
      groupMap[cls.id].contents.push(content);
    });
    
    // ترتيب حسب رقم الفصل (الأحدث أولاً)
    return Object.values(groupMap).sort((a, b) => b.classroom.classNumber - a.classroom.classNumber);
  }, [trainingContents]);

  // تحديد الفصل النشط تلقائياً
  useEffect(() => {
    if (classroomGroups.length > 0 && activeClassroomId === null) {
      const now = new Date();
      const current = classroomGroups.find((g) => {
        const start = g.classroom.startDate ? new Date(g.classroom.startDate) : null;
        const end = g.classroom.endDate ? new Date(g.classroom.endDate) : null;
        return start && end && now >= start && now <= end;
      });
      setActiveClassroomId((current || classroomGroups[0]).classroom.id);
    }
  }, [classroomGroups, activeClassroomId]);

  const activeGroup = classroomGroups.find((g) => g.classroom.id === activeClassroomId);
  const displayContents = activeGroup?.contents || trainingContents;

  useEffect(() => {
    if (traineeData?.trainee?.program?.id) {
      loadTrainingContents();
    }
  }, [traineeData]);

  const loadTrainingContents = async () => {
    try {
      setLoading(true);
      
      const programId = traineeData?.trainee?.program?.id;
      
      if (!programId) {
        setTrainingContents([]);
        return;
      }
      
      // طلب واحد - Backend يفلتر حسب programId
      const contents = await fetchAPI(`/training-contents?programId=${programId}`);
      
      console.log(`✅ Backend أرجع ${contents?.length || 0} مادة فقط للبرنامج ${programId}`);
      
      // ✅ جلب المحاضرات على دفعات (5 مواد في المرة) لمنع Memory Spike
      if (contents && contents.length > 0) {
        const contentsWithLectures = await processBatchesWithFallback(
          contents,
          async (content: any) => {
            const lectures = await fetchAPI(`/lectures/content/${content.id}`);
            return { ...content, lecturesCount: lectures?.length || 0 };
          },
          { lecturesCount: 0 } as any, // fallback value عند فشل الطلب
          5 // معالجة 5 مواد في المرة الواحدة
        );
        setTrainingContents(contentsWithLectures);
      } else {
        setTrainingContents([]);
      }
      
    } catch (error: any) {
      console.error('خطأ في تحميل المحتوى التدريبي:', error);
      
      // إذا كان الخطأ بسبب انتهاء صلاحية التوكن
      if (isTokenExpiryError(error)) {
        handleTokenExpiry();
        return;
      }
      
      toast.error('حدث خطأ أثناء تحميل المحتوى التعليمي');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <LoadingScreen 
        message="جاري تحميل بيانات المتدرب..." 
        submessage="نتحقق من بياناتك الشخصية"
      />
    );
  }
  
  if (loading) {
    return (
      <LoadingScreen 
        message="جاري تحميل المحتوى التعليمي..." 
        submessage="نجهز لك المواد التعليمية والمحاضرات"
      />
    );
  }

  if (profileError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">حدث خطأ في تحميل البيانات</h3>
          <p className="text-gray-600 mb-4">{profileError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const trainee = traineeData?.trainee;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Section */}
      <div className="bg-emerald-600 text-white pt-8 pb-16 px-4 sm:px-6 rounded-b-[2.5rem] shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-sm">
              <BookOpenIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">المقررات الدراسية</h1>
              <p className="text-emerald-100 text-sm sm:text-base mt-1 font-medium">
                {centerName ? `منصة التعلم الإلكتروني - ${centerName}` : 'منصة التعلم الإلكتروني'}
              </p>
            </div>
          </div>

          {/* Program Info Card */}
          {trainee?.program && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <AcademicCapIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-0.5">برنامجك التدريبي الحالي</p>
                <h2 className="text-lg sm:text-xl font-bold text-white">{trainee.program.nameAr}</h2>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 space-y-8">
        
        {/* AI Assistant Teaser Banner */}
        <div className="relative overflow-hidden bg-emerald-50 rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-emerald-100 group">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 opacity-60"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Text Content */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <SparklesIcon className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800">المساعد الذكي <span className="text-emerald-600">AI</span></h3>
                    <span className="bg-emerald-100 text-emerald-700 border-0 px-3 py-1 rounded-xl font-black text-xs animate-pulse">قريباً</span>
                  </div>
                  <p className="text-slate-500 font-bold text-sm">رفيقك الذكي في كل محاضرة</p>
                </div>
              </div>
              <p className="text-slate-600 font-bold text-sm sm:text-base max-w-xl leading-relaxed mb-6">
                نعمل على تطوير مساعد شخصي بالذكاء الاصطناعي لمرافقتك في المحاضرات الأونلاين. سيتمكن من الإجابة على أسئلتك <span className="text-emerald-700">بالصوت والكتابة</span>، تلخيص المحاضرات، ومساعدتك في فهم المواد المعقدة لحظة بلحظة!
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center justify-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-xl px-4 py-2.5 text-slate-700 font-black text-sm">
                  <MicrophoneIcon className="w-5 h-5 text-emerald-600" />
                  <span>تفاعل صوتي</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-xl px-4 py-2.5 text-slate-700 font-black text-sm">
                  <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-teal-600" />
                  <span>محادثة نصية</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Classroom Tabs */}
        {classroomGroups.length > 1 && (
          <div className="bg-white rounded-2xl shadow-[0_4px_0_0_rgba(226,232,240,1)] border border-slate-100 p-2 sm:p-3">
            <div className="flex flex-wrap gap-2">
              {classroomGroups.map((cg) => {
                const isActive = cg.classroom.id === activeClassroomId;
                const now = new Date();
                const start = cg.classroom.startDate ? new Date(cg.classroom.startDate) : null;
                const end = cg.classroom.endDate ? new Date(cg.classroom.endDate) : null;
                const isCurrent = start && end && now >= start && now <= end;
                
                return (
                  <button
                    key={cg.classroom.id}
                    onClick={() => setActiveClassroomId(cg.classroom.id)}
                    className={`relative flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-sm sm:text-base font-black transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-50 text-slate-800 border-2 border-amber-500 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-2 border-transparent'
                    }`}
                  >
                    <span className="relative z-10">{cg.classroom.name}</span>
                    <span className={`relative z-10 flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-lg text-xs font-black ${
                      isActive ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {cg.contents.length}
                    </span>
                    {isCurrent && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Training Contents Grid */}
        {displayContents.length > 0 ? (
          <div className="space-y-4">
            {activeGroup && (
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-emerald-600" />
                  {activeGroup.classroom.name}
                </h3>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                  {displayContents.length} مقررات
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {displayContents.map((content) => (
                <Link
                  href={`/trainee-dashboard/content/${content.id}`}
                  key={content.id} 
                  className="group bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-600/5 hover:border-emerald-200 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                      <BookOpenIcon className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100/50 flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {content.lecturesCount || 0} محاضرة
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {content.name}
                    </h4>
                    <p className="text-sm text-slate-500 font-medium">
                      {content.semester === 'FIRST' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-emerald-600 group-hover:text-emerald-700">
                    <span>عرض المحاضرات</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-12 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpenIcon className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {classroomGroups.length > 0 ? 'لا يوجد مقررات لهذا الفصل' : 'لا يوجد مقررات دراسية'}
            </h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              {classroomGroups.length > 0
                ? 'لم يتم إضافة مقررات دراسية لهذا الفصل الدراسي بعد.'
                : 'لم يتم تخصيص مقررات دراسية لبرنامجك التدريبي حتى الآن.'}
            </p>
            <div className="inline-flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-right max-w-md">
              <ExclamationTriangleIcon className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-800 mb-1">ملاحظة هامة</h4>
                <p className="text-xs text-emerald-600 leading-relaxed">
                  سيتم إضافة المقررات الدراسية والمحاضرات تدريجياً من قبل إدارة المركز. يرجى متابعة هذه الصفحة بانتظام.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
