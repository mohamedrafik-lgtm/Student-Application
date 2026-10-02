'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string): string => {
  const standardPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/;
  const shortPattern = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/;
  const embedPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/;
  
  const match = url.match(standardPattern) || url.match(shortPattern) || url.match(embedPattern);
  const videoId = match && match[1] ? match[1] : '';
  
  return `https://www.youtube.com/embed/${videoId}`;
};

import {
  ArrowLeftIcon,
  BookOpenIcon,
  PlayIcon,
  DocumentIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  SparklesIcon,
  MicrophoneIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { useTraineeProfile } from '../../../hooks/useTraineeProfile';
import LoadingScreen from '../../../components/LoadingScreen';
import { fetchAPI, SERVER_BASE_URL } from '@/lib/api';
import { toast } from 'react-hot-toast';




export default function LecturePage() {
  const { profile: traineeData, loading: profileLoading, error: profileError } = useTraineeProfile();
  const { lectureId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [lecture, setLecture] = useState<{
    id: number;
    title: string;
    description?: string;
    youtubeUrl?: string;
    pdfFile?: string;
    chapter: number;
    order: number;
    type: string;
    contentId: number;
  } | null>(null);
  const [trainingContent, setTrainingContent] = useState<{
    id: number;
    name: string;
    code: string;
    programId: number;
  } | null>(null);

  const loadLecture = useCallback(async () => {
    try {
      setLoading(true);
      
      // جلب بيانات المحاضرة
      const lectureData = await fetchAPI(`/lectures/${lectureId}`);
      console.log('بيانات المحاضرة:', lectureData);
      
      if (!lectureData) {
        toast.error('المحاضرة غير موجودة');
        return;
      }
      
      setLecture(lectureData);
      
      // جلب بيانات المحتوى التدريبي
      if (lectureData.contentId) {
        const contentData = await fetchAPI(`/training-contents/${lectureData.contentId}`);
        
        // التحقق من أن المتدرب مسجل في هذا المحتوى
        const traineeProgramId = traineeData?.trainee?.program?.id;
        if (contentData.programId !== traineeProgramId) {
          toast.error('غير مسموح لك بالوصول لهذه المحاضرة');
          return;
        }
        
        setTrainingContent(contentData);
      }
      
    } catch (error) {
      console.error('خطأ في تحميل المحاضرة:', error);
      toast.error('حدث خطأ أثناء تحميل المحاضرة');
    } finally {
      setLoading(false);
    }
  }, [lectureId, traineeData]);

  useEffect(() => {
    if (traineeData?.trainee && lectureId) {
      loadLecture();
    }
  }, [traineeData, lectureId, loadLecture]);


  const getPdfUrl = () => {
    if (!lecture?.pdfFile) return '';
    
    if (lecture.pdfFile.startsWith('http')) {
      return lecture.pdfFile;
    }
    
    return lecture.pdfFile.startsWith('/') ? `${SERVER_BASE_URL}${lecture.pdfFile}` : `${SERVER_BASE_URL}/${lecture.pdfFile}`;
  };

  const getDownloadUrl = () => {
    const url = getPdfUrl();
    return url ? `${url}#toolbar=1&navpanes=1&scrollbar=1` : '';
  };

  if (profileLoading || loading) {
    return (
      <LoadingScreen 
        message="جاري تحميل المحاضرة..." 
        submessage="نجهز لك المحتوى التعليمي"
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

  if (!lecture) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">المحاضرة غير متاحة</h3>
          <p className="text-gray-600 mb-4">لم يتم العثور على هذه المحاضرة</p>
          <Link 
            href="/trainee-dashboard/content"
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            العودة للمقررات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Section */}
      <div className="bg-emerald-600 text-white pt-8 pb-16 px-4 sm:px-6 rounded-b-[2.5rem] shadow-sm">
        <div className="max-w-5xl mx-auto">
          <Link 
            href={trainingContent ? `/trainee-dashboard/content/${trainingContent.id}` : '/trainee-dashboard/content'}
            className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white text-sm mb-6 transition-colors font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة للمحاضرات
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-sm flex-shrink-0">
                <PlayIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-emerald-100 text-sm font-medium">
                    {trainingContent?.name || 'المحتوى التدريبي'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                  <span className="text-emerald-100 text-sm font-medium">
                    الباب {lecture.chapter}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                  {lecture.title}
                </h1>
                {lecture.description && (
                  <p className="text-emerald-50 text-sm max-w-2xl leading-relaxed">
                    {lecture.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-xl">
                <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
                <span className="text-white font-bold">المحاضرة #{lecture.order}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Video Section */}
            {lecture.youtubeUrl && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PlayIcon className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">فيديو المحاضرة</h3>
                    <p className="text-sm text-slate-500">مشاهدة الشرح المرئي</p>
                  </div>
                </div>
                <div className="p-4 sm:p-6 bg-slate-50/50">
                  <div className="relative pb-[56.25%] h-0 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-900">
                    <iframe 
                      src={getYouTubeEmbedUrl(lecture.youtubeUrl)}
                      className="absolute top-0 left-0 w-full h-full"
                      allowFullScreen
                      title={lecture.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                  </div>
                </div>
              </div>
            )}

            {/* PDF Section */}
            {lecture.pdfFile && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <DocumentIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">المادة التعليمية (PDF)</h3>
                      <p className="text-sm text-slate-500">متوفر للعرض والتحميل</p>
                    </div>
                  </div>
                  <a
                    href={getDownloadUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${lecture.title}.pdf`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    تحميل الملف
                  </a>
                </div>
                <div className="p-4 sm:p-6 bg-slate-50/50">
                  <div className="relative w-full h-[600px] sm:h-[800px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                    <iframe 
                      src={getPdfUrl()}
                      className="w-full h-full"
                      title={`${lecture.title} - المادة التعليمية`}
                    ></iframe>
                  </div>
                </div>
              </div>
            )}

            {/* No Content Available */}
            {!lecture.youtubeUrl && !lecture.pdfFile && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-12 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <ExclamationTriangleIcon className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">المحتوى غير متاح حالياً</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  لم يتم رفع محتوى لهذه المحاضرة بعد. سيتم إشعارك عند إضافة المحتوى من قبل المدرب.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Lecture Info */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-emerald-600" />
                تفاصيل المحاضرة
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-500 font-medium">رقم المحاضرة</span>
                  <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg shadow-sm">#{lecture.order}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-500 font-medium">الباب</span>
                  <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg shadow-sm">{lecture.chapter}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-500 font-medium">النوع</span>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100/50">
                    {lecture.type === 'BOTH' ? 'مختلط' : 
                     lecture.type === 'VIDEO' ? 'فيديو' : 'مادة مكتوبة'}
                  </span>
                </div>
                
                {/* Content Availability */}
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 px-1">المحتوى المتوفر</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                          <PlayIcon className="w-4 h-4 text-rose-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">فيديو</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                        lecture.youtubeUrl ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {lecture.youtubeUrl ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <DocumentIcon className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">مادة PDF</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                        lecture.pdfFile ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {lecture.pdfFile ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {trainingContent && (
                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <div className="mb-3">
                      <span className="text-xs text-slate-500 font-medium block mb-1">المقرر الدراسي</span>
                      <span className="text-sm font-bold text-slate-900">{trainingContent.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Assistant Teaser Banner - Sidebar Version */}
            <div className="relative overflow-hidden bg-emerald-50 rounded-3xl p-6 shadow-sm border border-emerald-100 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-100 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 opacity-60"></div>
              
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <SparklesIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-slate-800">المساعد الذكي <span className="text-emerald-600">AI</span></h3>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 border-0 px-2 py-0.5 rounded-lg font-black text-[10px] animate-pulse inline-block">قريباً</span>
                  </div>
                </div>
                
                <p className="text-slate-600 font-bold text-xs leading-relaxed">
                  نعمل على تطوير مساعد شخصي بالذكاء الاصطناعي لمرافقتك في المحاضرات. سيتمكن من الإجابة على أسئلتك <span className="text-emerald-700">بالصوت والكتابة</span> وتلخيص المحاضرات!
                </p>
                
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-lg px-3 py-2 text-slate-700 font-black text-xs">
                    <MicrophoneIcon className="w-4 h-4 text-emerald-600" />
                    <span>تفاعل صوتي</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-lg px-3 py-2 text-slate-700 font-black text-xs">
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-teal-600" />
                    <span>محادثة نصية</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">إجراءات سريعة</h3>
              <div className="space-y-3">
                <Link
                  href={trainingContent ? `/trainee-dashboard/content/${trainingContent.id}` : '/trainee-dashboard/content'}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-sm font-bold transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-emerald-600">
                    <BookOpenIcon className="h-4 w-4" />
                  </div>
                  العودة للمحاضرات
                </Link>
                <Link
                  href="/trainee-dashboard/content"
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-sm font-bold transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:text-emerald-600">
                    <AcademicCapIcon className="h-4 w-4" />
                  </div>
                  جميع المقررات
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
