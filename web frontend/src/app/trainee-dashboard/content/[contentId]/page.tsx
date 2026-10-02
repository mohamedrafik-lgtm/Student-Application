'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  PlayIcon,
  DocumentIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AcademicCapIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  SparklesIcon,
  MicrophoneIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../../hooks/useTraineeProfile';
import LoadingScreen from '../../components/LoadingScreen';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ContentLecturesPage() {
  const { profile: traineeData, loading: profileLoading, error: profileError } = useTraineeProfile();
  const { contentId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [trainingContent, setTrainingContent] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [groupedLectures, setGroupedLectures] = useState<{[key: number]: any[]}>({});
  const [expandedChapters, setExpandedChapters] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    if (traineeData?.trainee && contentId) {
      loadContentAndLectures();
    }
  }, [traineeData, contentId]);

  const loadContentAndLectures = async () => {
    try {
      setLoading(true);
      
      // جلب بيانات المحتوى والمحاضرات
      const [contentData, lecturesData] = await Promise.all([
        fetchAPI(`/training-contents/${contentId}`),
        fetchAPI(`/lectures/content/${contentId}`)
      ]);
      
      console.log('بيانات المحتوى:', contentData);
      console.log('المحاضرات:', lecturesData);
      
      // التحقق من أن المتدرب مسجل في هذا المحتوى
      const traineeProgramId = traineeData?.trainee?.programId;
      if (contentData.programId !== traineeProgramId) {
        toast.error('غير مسموح لك بالوصول لهذا المحتوى');
        return;
      }
      
      setTrainingContent(contentData);
      setLectures(lecturesData || []);
      
      // تجميع المحاضرات حسب الأبواب
      const grouped = groupLecturesByChapter(lecturesData || []);
      setGroupedLectures(grouped);
      
      // توسيع جميع الأبواب
      const chapters = Object.keys(grouped).map(Number);
      const expanded = chapters.reduce((acc, chapter) => {
        acc[chapter] = true;
        return acc;
      }, {} as {[key: number]: boolean});
      setExpandedChapters(expanded);
      
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const groupLecturesByChapter = (lectures: any[]) => {
    return lectures.reduce((acc, lecture) => {
      const chapter = lecture.chapter;
      if (!acc[chapter]) {
        acc[chapter] = [];
      }
      acc[chapter].push(lecture);
      return acc;
    }, {} as {[key: number]: any[]});
  };

  const toggleChapter = (chapter: number) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapter]: !prev[chapter]
    }));
  };

  if (profileLoading || loading) {
    return (
      <LoadingScreen 
        message="جاري تحميل المحاضرات..." 
        submessage="نجهز لك المحاضرات والمواد التعليمية"
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
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/trainee-dashboard/content" 
            className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white text-sm mb-6 transition-colors font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة للمقررات
          </Link>
          
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-sm flex-shrink-0">
              <BookOpenIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
                {trainingContent?.name || 'المحتوى التدريبي'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-emerald-100 text-sm font-medium">
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                  <PlayIcon className="w-4 h-4" />
                  {lectures.length} محاضرة
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 space-y-6">
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

        {/* Lectures by Chapters */}
        {Object.entries(groupedLectures).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedLectures)
              .sort(([chapterA], [chapterB]) => Number(chapterA) - Number(chapterB))
              .map(([chapter, chapterLectures]) => (
                <div key={chapter} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
                  <button 
                    className="w-full p-5 sm:p-6 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors text-right"
                    onClick={() => toggleChapter(Number(chapter))}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0">
                        {chapter}
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-0.5">الباب {chapter}</h3>
                        <p className="text-sm text-slate-500 font-medium">{chapterLectures.length} محاضرات</p>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 ${expandedChapters[Number(chapter)] ? 'bg-emerald-50 text-emerald-600 rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                      <ChevronDownIcon className="w-5 h-5" />
                    </div>
                  </button>
                  
                  <div className={`grid transition-all duration-300 ease-in-out ${expandedChapters[Number(chapter)] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 bg-slate-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                          {chapterLectures
                            .sort((a, b) => a.order - b.order)
                            .map((lecture) => (
                              <Link
                                href={`/trainee-dashboard/content/lecture/${lecture.id}`}
                                key={lecture.id} 
                                className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col h-full"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 pl-3">
                                    <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-1.5">
                                      {lecture.title}
                                    </h4>
                                  </div>
                                  <span className="w-8 h-8 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {lecture.order}
                                  </span>
                                </div>
                                
                                <div className="mt-auto pt-4 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    {lecture.youtubeUrl && (
                                      <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center" title="فيديو">
                                        <PlayIcon className="w-4 h-4" />
                                      </span>
                                    )}
                                    {lecture.pdfFile && (
                                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center" title="ملف PDF">
                                        <DocumentIcon className="w-4 h-4" />
                                      </span>
                                    )}
                                    {lecture.type && (
                                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                        {lecture.type === 'BOTH' ? 'مختلط' : 
                                         lecture.type === 'VIDEO' ? 'فيديو' : 'مادة مكتوبة'}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                                    عرض
                                    <ArrowLeftIcon className="w-3 h-3" />
                                  </div>
                                </div>
                              </Link>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-12 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpenIcon className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد محاضرات متاحة</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              لم يتم رفع محاضرات لهذا المقرر بعد. سيتم إشعارك عند إضافة محاضرات جديدة.
            </p>
            <div className="inline-flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-right max-w-md">
              <ClockIcon className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-800 mb-1">معلومة</h4>
                <p className="text-xs text-emerald-600 leading-relaxed">
                  سيتم إضافة المحاضرات تدريجياً من قبل المدربين. تابع هذه الصفحة للاطلاع على آخر المستجدات.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
