'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchAPI, uploadFile, getImageUrl } from '@/lib/api';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  DocumentIcon, 
  PlayIcon, 
  PlusIcon, 
  ArrowDownTrayIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { TibaSelect } from '@/app/components/ui/Select';
import { TibaModal } from '@/components/ui/tiba-modal';
import { PDFModal } from '@/components/ui/pdf-modal';

// YouTube Modal Component
interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

const YouTubeModal = ({ isOpen, onClose, videoUrl, title }: YouTubeModalProps) => {
  if (!isOpen) return null;
  
  const getYouTubeVideoId = (url: string): string => {
    const standardPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/;
    const shortPattern = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/;
    const embedPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/;
    const match = url.match(standardPattern) || url.match(shortPattern) || url.match(embedPattern);
    return match && match[1] ? match[1] : '';
  };
  
  const videoId = getYouTubeVideoId(videoUrl);
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <XMarkIcon className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative pb-[56.25%] h-0">
            <iframe src={embedUrl} className="absolute top-0 left-0 w-full h-full rounded-lg" allowFullScreen title={title} />
          </div>
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  );
};

// Lecture type options
const typeOptions = [
  { value: 'VIDEO', label: 'فيديو' },
  { value: 'PDF', label: 'ملف PDF' },
  { value: 'BOTH', label: 'فيديو وملف PDF' },
];

// Chapter options
const chapterOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `الباب ${i + 1}`,
}));

export default function LecturesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const contentId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [trainingContent, setTrainingContent] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [groupedLectures, setGroupedLectures] = useState<{[key: number]: any[]}>({});
  const [expandedChapters, setExpandedChapters] = useState<{[key: number]: boolean}>({});
  
  // State for lecture form
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLectureId, setEditingLectureId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chapter, setChapter] = useState(1);
  const [order, setOrder] = useState(1);
  const [type, setType] = useState('VIDEO'); // VIDEO, PDF, BOTH
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para el modal de PDF
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [selectedLectureTitle, setSelectedLectureTitle] = useState<string>('');
  
  // Estado para el modal de YouTube
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string>('');
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && contentId) {
      const loadData = async () => {
        try {
          setLoading(true);
          const [contentData, lecturesData] = await Promise.all([
            fetchAPI(`/training-contents/${contentId}`),
            fetchAPI(`/lectures/content/${contentId}`)
          ]);
          
          console.log('Datos de lecturas recibidos:', lecturesData);
          if (lecturesData && lecturesData.length > 0) {
            console.log('Primera lectura:', lecturesData[0]);
            console.log('Tipo de ID de la primera lectura:', typeof lecturesData[0].id);
          }
          
          setTrainingContent(contentData);
          setLectures(lecturesData || []);
          
          // Agrupar lecturas por capítulo
          const grouped = groupLecturesByChapter(lecturesData || []);
          setGroupedLectures(grouped);
          
          // Inicializar todos los capítulos como expandidos
          const chapters = Object.keys(grouped).map(Number);
          const expanded = chapters.reduce((acc, chapter) => {
            acc[chapter] = true;
            return acc;
          }, {} as {[key: number]: boolean});
          setExpandedChapters(expanded);
          
        } catch (error) {
          console.error('Error loading data:', error);
          toast.error('حدث خطأ أثناء تحميل البيانات');
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [isAuthenticated, contentId]);
  
  // Función para agrupar lecturas por capítulo
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
  
  // Función para alternar la expansión de un capítulo
  const toggleChapter = (chapter: number) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapter]: !prev[chapter]
    }));
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.error('يرجى اختيار ملف PDF');
        return;
      }
      setPdfFile(file);
      setPdfFileName(file.name);
    }
  };
  
  // Función para editar una lectura
  const editLecture = (lecture: any) => {
    console.log('Editando lectura:', lecture);
    console.log('ID de la lectura:', lecture.id);
    console.log('Tipo de ID:', typeof lecture.id);
    
    setTitle(lecture.title);
    setDescription(lecture.description || '');
    setChapter(lecture.chapter);
    setOrder(lecture.order);
    setType(lecture.type);
    setYoutubeUrl(lecture.youtubeUrl || '');
    setPdfFileName(lecture.pdfFile ? 'ملف PDF موجود' : '');
    setPdfFile(null);
    setIsEditMode(true);
    setEditingLectureId(Number(lecture.id)); // Asegurarnos de que el ID sea un número
    setShowForm(true);
    
    // Desplazar hasta el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // التحقق من البيانات المدخلة
      if (!title) {
        throw new Error('يرجى إدخال عنوان المحاضرة');
      }
      
      if (type === 'VIDEO' || type === 'BOTH') {
        if (!youtubeUrl) {
          throw new Error('يرجى إدخال رابط فيديو اليوتيوب');
        }
      }
      
      if ((type === 'PDF' || type === 'BOTH') && !isEditMode && !pdfFile) {
        throw new Error('يرجى اختيار ملف PDF');
      }
      
      // رفع ملف PDF إذا وجد
      let pdfFileUrl = '';
      if (pdfFile) {
        const uploadResult = await uploadFile(pdfFile, 'lectures');
        pdfFileUrl = uploadResult.url;
      }
      
      // Validar y formatear la URL de YouTube
      const formattedYoutubeUrl = type === 'VIDEO' || type === 'BOTH' ? validateYoutubeUrl(youtubeUrl) : null;
      
      if (isEditMode) {
        // تحديث المحاضرة
        const lectureData = {
          title,
          description,
          chapter,
          order,
          type,
          youtubeUrl: formattedYoutubeUrl,
          ...(pdfFile ? { pdfFile: pdfFileUrl } : {})
        };
        
        // Asegurarnos de que el ID sea un número
        const numericId = Number(editingLectureId);
        console.log('ID de edición convertido a número:', numericId);
        
        const result = await fetchAPI(`/lectures/${numericId}`, {
          method: 'PATCH',
          body: JSON.stringify(lectureData),
        });
        
        // تحديث قائمة المحاضرات
        setLectures(lectures.map(l => l.id === editingLectureId ? result : l));
        
        toast.success('تم تحديث المحاضرة بنجاح');
      } else {
        // إنشاء محاضرة جديدة
        const lectureData = {
          title,
          description,
          chapter,
          order,
          type,
          youtubeUrl: formattedYoutubeUrl,
          pdfFile: type === 'PDF' || type === 'BOTH' ? pdfFileUrl : null,
          contentId: Number(contentId)
        };
        
        const result = await fetchAPI('/lectures', {
          method: 'POST',
          body: JSON.stringify(lectureData),
        });
        
        console.log('Nueva lectura creada con ID:', result.id);
        console.log('Tipo de ID devuelto:', typeof result.id);
        
        // Usar el ID real devuelto por el backend
        setLectures([...lectures, result]);
        toast.success('تم إضافة المحاضرة بنجاح');
      }
      
      // Actualizar lecturas agrupadas usando los datos reales
      if (isEditMode) {
        const updatedLectures = lectures.map(l => {
          if (l.id === editingLectureId) {
            return { 
              ...l, 
              title, 
              description, 
              chapter, 
              order, 
              type, 
              youtubeUrl: type === 'VIDEO' || type === 'BOTH' ? youtubeUrl : null, 
              ...(pdfFile ? { pdfFile: pdfFileUrl } : {}) 
            };
          }
          return l;
        });
        setLectures(updatedLectures);
        setGroupedLectures(groupLecturesByChapter(updatedLectures));
      } else {
        // Recargar los datos para asegurarnos de tener los IDs correctos
        try {
          const lecturesData = await fetchAPI(`/lectures/content/${contentId}`);
          setLectures(lecturesData || []);
          setGroupedLectures(groupLecturesByChapter(lecturesData || []));
        } catch (error) {
          console.error('Error reloading lectures:', error);
        }
      }
      
      // Resetear el formulario
      resetForm();
    } catch (error) {
      console.error('Error creating/updating lecture:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ المحاضرة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setChapter(1);
    setOrder(1);
    setType('VIDEO');
    setYoutubeUrl('');
    setPdfFile(null);
    setPdfFileName('');
    setShowForm(false);
    setIsEditMode(false);
    setEditingLectureId(null);
  };

  const deleteLecture = async (lectureId: number) => {
    try {
      setIsDeleting(lectureId);
      const idString = String(lectureId).trim();
      console.log('ID a eliminar (como string):', idString);
      
      try {
        // Intentar eliminar la lectura
        await fetchAPI(`/lectures/${idString}`, { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        toast.success('تم حذف المحاضرة بنجاح');
      } catch (error) {
        console.error('Error al eliminar la lectura en el backend:', error);
        // Si hay un error, simplemente continuamos para eliminar la lectura de la UI
        // Esto permite eliminar lecturas recién añadidas que no existen en el backend
        toast.error('تم إزالة المحاضرة من الواجهة فقط');
      }
      
      // Siempre actualizamos la UI, incluso si falla la eliminación en el backend
      const updatedLectures = lectures.filter(lecture => lecture.id !== lectureId);
      setLectures(updatedLectures);
      setGroupedLectures(groupLecturesByChapter(updatedLectures));
    } catch (error) {
      console.error('Error general al eliminar la lectura:', error);
      toast.error('حدث خطأ أثناء حذف المحاضرة');
    } finally {
      setIsDeleting(null);
    }
  };
  
  // دالة لفتح المشاهد PDF
  const openPdfViewer = (pdfUrl: string, lectureTitle: string) => {
    setSelectedPdf(pdfUrl);
    setSelectedLectureTitle(lectureTitle);
    setPdfModalOpen(true);
  };
  
  // Función para abrir el visualizador de YouTube
  const openYoutubeViewer = (youtubeUrl: string, lectureTitle: string) => {
    setSelectedYoutubeUrl(youtubeUrl);
    setSelectedVideoTitle(lectureTitle);
    setYoutubeModalOpen(true);
  };

  // Función para validar y formatear enlaces de YouTube
  const validateYoutubeUrl = (url: string): string => {
    // Si la URL está vacía, devolverla como está
    if (!url) return url;
    
    // Intentar extraer el ID del video de YouTube de diferentes formatos de URL
    let videoId = '';
    
    // Patrón para URLs de YouTube estándar (https://www.youtube.com/watch?v=VIDEO_ID)
    const standardPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/;
    // Patrón para URLs cortas de YouTube (https://youtu.be/VIDEO_ID)
    const shortPattern = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/;
    // Patrón para URLs de YouTube embebidas (https://www.youtube.com/embed/VIDEO_ID)
    const embedPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/;
    
    let match = url.match(standardPattern) || url.match(shortPattern) || url.match(embedPattern);
    
    if (match && match[1]) {
      videoId = match[1];
      // Devolver la URL completa en formato estándar
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // Si no se pudo extraer un ID válido, devolver la URL original
    return url;
  };

  const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputUrl = e.target.value;
    setYoutubeUrl(inputUrl);
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-32 mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-28 bg-slate-50 rounded-lg" />
                <div className="h-28 bg-slate-50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`محاضرات ${trainingContent?.name || 'المحتوى التدريبي'}`}
        description={trainingContent?.code ? `كود المقرر: ${trainingContent.code}` : ''}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'المحتوى التدريبي', href: '/dashboard/training-contents' },
          { label: `محاضرات ${trainingContent?.name || 'المحتوى التدريبي'}` },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant={showForm ? 'default' : 'outline'}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              onClick={() => {
                if (showForm && isEditMode) {
                  resetForm();
                } else {
                  setShowForm(!showForm);
                }
              }}
            >
              {showForm ? (isEditMode ? 'إلغاء التعديل' : 'إلغاء') : 'إضافة محاضرة'}
            </Button>
            <Link href="/dashboard/training-contents">
              <Button variant="outline" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                العودة
              </Button>
            </Link>
          </div>
        }
      />

      {/* Lecture Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">
              {isEditMode ? 'تعديل المحاضرة' : 'إضافة محاضرة جديدة'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">عنوان المحاضرة</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="أدخل عنوان المحاضرة"
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">نوع المحاضرة</label>
                <TibaSelect
                  options={typeOptions}
                  value={type}
                  onChange={(val) => setType(val || 'VIDEO')}
                  instanceId="lecture-type-select"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">الباب</label>
                <TibaSelect
                  options={chapterOptions}
                  value={chapter.toString()}
                  onChange={(val) => setChapter(Number(val || 1))}
                  instanceId="lecture-chapter-select"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">ترتيب المحاضرة</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">وصف المحاضرة</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="أدخل وصف المحاضرة (اختياري)"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                rows={3}
              />
            </div>
            
            {(type === 'VIDEO' || type === 'BOTH') && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">رابط فيديو اليوتيوب</label>
                <input
                  value={youtubeUrl}
                  onChange={handleYoutubeUrlChange}
                  placeholder="أدخل رابط اليوتيوب كاملاً"
                  required={type === 'VIDEO' || type === 'BOTH'}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            )}
            
            {(type === 'PDF' || type === 'BOTH') && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">ملف PDF</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium text-slate-700">
                    {isEditMode ? 'تغيير الملف' : 'اختيار ملف'}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-sm text-slate-500">
                    {pdfFileName || 'لم يتم اختيار ملف'}
                    {isEditMode && !pdfFile && pdfFileName && (
                      <span className="text-blue-600 mr-2">(سيتم الاحتفاظ بالملف الحالي)</span>
                    )}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                {isEditMode ? 'حفظ التعديلات' : 'إضافة المحاضرة'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lectures grouped by chapter */}
      <div className="space-y-5">
        {Object.entries(groupedLectures).length > 0 ? (
          Object.entries(groupedLectures)
            .sort(([chapterA], [chapterB]) => Number(chapterA) - Number(chapterB))
            .map(([ch, chapterLectures]) => (
              <div key={ch} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div 
                  className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-blue-50/50 to-slate-50/50 flex justify-between items-center cursor-pointer hover:bg-blue-50/30 transition-colors"
                  onClick={() => toggleChapter(Number(ch))}
                >
                  <h3 className="text-base font-bold text-slate-800">الباب {ch}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{chapterLectures.length} محاضرة</span>
                    {expandedChapters[Number(ch)] ? (
                      <ChevronUpIcon className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
                
                {expandedChapters[Number(ch)] && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {chapterLectures
                        .sort((a: any, b: any) => a.order - b.order)
                        .map((lecture: any) => (
                          <div key={lecture.id} className="rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-all shadow-sm hover:shadow p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-semibold text-slate-800 flex-1">{lecture.title}</h4>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<PencilIcon className="w-3.5 h-3.5" />}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editLecture({ ...lecture, id: Number(lecture.id) });
                                  }}
                                >
                                  تعديل
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(Number(lecture.id));
                                  }}
                                  isLoading={isDeleting === Number(lecture.id)}
                                  disabled={isDeleting === Number(lecture.id)}
                                >
                                  حذف
                                </Button>
                              </div>
                            </div>
                            
                            <span className="inline-flex items-center bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                              ترتيب {lecture.order}
                            </span>
                            
                            {lecture.description && (
                              <p className="text-sm text-slate-600 border-r-2 border-slate-200 pr-3">{lecture.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 pt-1">
                              {lecture.youtubeUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openYoutubeViewer(lecture.youtubeUrl, lecture.title);
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors border border-red-200"
                                >
                                  <PlayIcon className="h-3.5 w-3.5 ml-1" /> مشاهدة الفيديو
                                </button>
                              )}
                              {lecture.pdfFile && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPdfViewer(lecture.pdfFile, lecture.title);
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                                  >
                                    <DocumentIcon className="h-3.5 w-3.5 ml-1" /> عرض PDF
                                  </button>
                                  <a
                                    href={getImageUrl(lecture.pdfFile)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={`${lecture.title}.pdf`}
                                    className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
                                  >
                                    <ArrowDownTrayIcon className="h-3.5 w-3.5 ml-1" /> تحميل PDF
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <DocumentIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">لا توجد محاضرات لهذا المحتوى التدريبي حتى الآن.</p>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <TibaModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="تأكيد حذف المحاضرة"
        subtitle="هل أنت متأكد من حذف هذه المحاضرة؟ لا يمكن التراجع عن هذا الإجراء."
        variant="danger"
        size="sm"
        icon={<ExclamationTriangleIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="danger" onClick={() => { if (deleteConfirm) { deleteLecture(deleteConfirm); setDeleteConfirm(null); } }}>
              نعم، احذف المحاضرة
            </Button>
          </div>
        }
      />

      <PDFModal 
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfUrl={selectedPdf}
        title={selectedLectureTitle}
      />
      
      <YouTubeModal
        isOpen={youtubeModalOpen}
        onClose={() => setYoutubeModalOpen(false)}
        videoUrl={selectedYoutubeUrl}
        title={selectedVideoTitle}
      />
    </div>
  );
}