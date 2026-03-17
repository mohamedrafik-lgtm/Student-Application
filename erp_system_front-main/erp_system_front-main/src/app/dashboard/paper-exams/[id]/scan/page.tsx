'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import PageHeader from '@/app/components/PageHeader';
import { scanAnswerSheet, getAnswerSheetByCode } from '@/lib/paper-exams-api';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, CameraIcon, PhotoIcon, BoltIcon, ArrowUpTrayIcon, StopIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';
import jsQR from 'jsqr';
import Webcam from 'react-webcam';
import { analyzeOMRWithOpenAI, OpenAIOMRResult } from '@/lib/openai-vision-api';
import { enhanceOMRImage } from '@/lib/image-processor';
import Script from 'next/script';

export default function ScanAnswerSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const examId = parseInt(resolvedParams.id);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotatedCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'upload' | 'camera' | 'batch'>('camera');
  const [scanStep, setScanStep] = useState<'select' | 'capture' | 'processing' | 'review' | 'batch-upload' | 'batch-processing' | 'batch-summary'>('select');
  const [cameraReady, setCameraReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [currentSheet, setCurrentSheet] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedAnswers, setDetectedAnswers] = useState<OpenAIOMRResult[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [sheetCodeInput, setSheetCodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [batchSessions, setBatchSessions] = useState<any[]>([]); // العمليات السابقة
  const [sessionDetails, setSessionDetails] = useState<any>(null); // تفاصيل الجلسة المحددة

  // حالة لعملية استخراج الرقم القومي
  const [extractingNationalId, setExtractingNationalId] = useState(false);
  const [manualNationalIdInput, setManualNationalIdInput] = useState(false);
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [showManualResults, setShowManualResults] = useState(false);

  // حالات التصحيح المتعدد (Batch)
  const [batchPdfFile, setBatchPdfFile] = useState<File | null>(null);
  const [batchImages, setBatchImages] = useState<string[]>([]);
  const [batchSheets, setBatchSheets] = useState<any[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchCompleted, setBatchCompleted] = useState<any[]>([]);
  const [batchFailed, setBatchFailed] = useState<any[]>([]);
  const [batchSkipped, setBatchSkipped] = useState<any[]>([]); // الأوراق المتجاهلة
  const [batchPaused, setBatchPaused] = useState(false);
  const [batchSessionId, setBatchSessionId] = useState<string | null>(null); // معرف الجلسة
  const [uploadProgress, setUploadProgress] = useState<number>(0); // نسبة رفع الملف
  const [isUploading, setIsUploading] = useState(false); // حالة الرفع
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null); // مسار الملف المرفوع
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // التحقق من كون الجهاز جوال
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      return mobileRegex.test(userAgent.toLowerCase());
    };
    setIsMobile(checkIfMobile());
  }, []);

  // تحميل العمليات السابقة من localStorage
  useEffect(() => {
    loadBatchSessions();
  }, [examId]);

  const loadBatchSessions = async () => {
    try {
      const sessions = await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions`);
      setBatchSessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Fallback to localStorage
      const sessions: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('batch_')) {
          try {
            const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
            if (sessionData.examId === examId) {
              sessions.push(sessionData);
            }
          } catch (e) {
            console.error('Error loading session:', e);
          }
        }
      }
      sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setBatchSessions(sessions);
    }
  };

  const deleteBatchSession = async (sessionId: string) => {
    try {
      await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      localStorage.removeItem(`batch_${sessionId}`);
      loadBatchSessions();
      toast.success('تم حذف السجل');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('فشل حذف السجل');
    }
  };

  const viewSessionDetails = (sessionId: string) => {
    router.push(`/dashboard/paper-exams/${examId}/batch-log`);
  };

  // حفظ التقدم عند إغلاق الصفحة
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (processing && batchSessionId) {
        const savedSession = JSON.parse(localStorage.getItem(batchSessionId) || '{}');
        savedSession.status = 'paused';
        savedSession.currentIndex = batchCurrentIndex;
        savedSession.lastUpdate = new Date().toISOString();
        localStorage.setItem(batchSessionId, JSON.stringify(savedSession));
        
        e.preventDefault();
        e.returnValue = 'عملية التصحيح قيد التنفيذ. هل تريد المغادرة؟';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [processing, batchSessionId, batchCurrentIndex]);

  // معالجة رفع PDF
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('يرجى رفع ملف PDF فقط');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 100 MB');
      return;
    }

    setBatchPdfFile(file);
    setUploadProgress(0);
    setIsUploading(true);
    setUploadedFilePath(null);

    try {
      // رفع الملف إلى السيرفر مع متابعة التقدم
      const formData = new FormData();
      formData.append('file', file);

      // الحصول على الـ token من localStorage أو من الكوكيز
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1] || localStorage.getItem('token') || localStorage.getItem('auth_token');
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      if (!token) {
        toast.error('يرجى تسجيل الدخول أولاً');
        setIsUploading(false);
        return;
      }

      const xhr = new XMLHttpRequest();
      
      // متابعة تقدم الرفع
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        console.log('Upload response:', xhr.status, xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              setUploadedFilePath(response.filePath);
              setIsUploading(false);
              toast.success('تم رفع الملف بنجاح');
            } else {
              setIsUploading(false);
              setUploadProgress(0);
              toast.error(response.message || 'فشل في رفع الملف');
            }
          } catch (e) {
            setIsUploading(false);
            setUploadProgress(0);
            toast.error('خطأ في معالجة الاستجابة');
          }
        } else {
          console.error('Upload failed:', xhr.status, xhr.responseText);
          setIsUploading(false);
          setUploadProgress(0);
          let errorMessage = 'فشل في رفع الملف';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch (e) {}
          toast.error(`${errorMessage} (${xhr.status})`);
        }
      };

      xhr.onerror = () => {
        console.error('XHR error');
        setIsUploading(false);
        setUploadProgress(0);
        toast.error('فشل في الاتصال بالسيرفر');
      };

      xhr.open('POST', `${API_URL}/paper-exams/${examId}/batch-grading/upload-pdf`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(error.message || 'فشل في رفع الملف');
    }
  };

  // بدء التصحيح المتعدد
  const handleStartBatchProcessing = async () => {
    if (!batchPdfFile) {
      toast.error('يرجى رفع ملف PDF أولاً');
      return;
    }

    if (!uploadedFilePath) {
      toast.error('انتظر حتى يكتمل رفع الملف');
      return;
    }

    if (isUploading) {
      toast.error('جاري رفع الملف، انتظر حتى يكتمل');
      return;
    }

    try {
      setProcessing(true);
      toast.loading('جاري تحويل PDF إلى صور...', { id: 'pdf-convert' });

      // تحويل PDF إلى صور باستخدام مكتبة pdf.js
      const images = await convertPdfToImages(batchPdfFile);
      
      if (images.length === 0) {
        toast.error('لم يتم العثور على صفحات في الملف', { id: 'pdf-convert' });
        return;
      }

      setBatchImages(images);
      toast.success(`تم تحويل ${images.length} صفحة بنجاح`, { id: 'pdf-convert' });
      
      setScanStep('batch-processing');
      setBatchCurrentIndex(0);
      
      // بدء التصحيح التلقائي - مع تمرير مسار الملف
      processBatchSheets(images, uploadedFilePath);
      
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      toast.error('فشل في معالجة ملف PDF', { id: 'pdf-convert' });
      setProcessing(false);
    }
  };

  // تحويل PDF إلى صور
  const convertPdfToImages = async (file: File): Promise<string[]> => {
    // استخدام Canvas لتحويل صفحات PDF إلى صور
    const pdfjsLib = (window as any).pdfjsLib;
    
    if (!pdfjsLib) {
      throw new Error('مكتبة PDF.js غير محملة');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      images.push(imageDataUrl);
    }

    return images;
  };

  // معالجة الأوراق بشكل تلقائي
  const processBatchSheets = async (images: string[], filePath?: string) => {
    try {
      // إنشاء جلسة جديدة في قاعدة البيانات
      const sessionResponse = await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: batchPdfFile?.name || 'unknown.pdf',
          filePath: filePath || uploadedFilePath || '',
          totalPages: images.length,
        }),
      });
      
      const sessionId = sessionResponse.id;
      setBatchSessionId(sessionId);
      
      // متغيرات محلية لتتبع الإحصائيات
      let localCompleted = 0;
      let localAlreadyGraded = 0;
      let localSkipped = 0;
      let localFailed = 0;
      
      // حفظ أيضاً في localStorage كنسخة احتياطية
      localStorage.setItem(`batch_${sessionId}`, JSON.stringify({
        sessionId,
        examId,
        totalPages: images.length,
        status: 'processing',
        startTime: new Date().toISOString(),
      }));
      
      for (let i = 0; i < images.length; i++) {
        if (batchPaused) {
          // تحديث الحالة للإيقاف المؤقت
          await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'PAUSED',
              currentIndex: i,
            }),
          });
          
          // انتظار حتى يتم استئناف العملية
          await new Promise(resolve => {
            const interval = setInterval(() => {
              if (!batchPaused) {
                clearInterval(interval);
                resolve(true);
              }
            }, 500);
          });
          
          // تحديث للاستئناف
          await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'PROCESSING',
            }),
          });
        }

        setBatchCurrentIndex(i);
        
        try {
          setProcessingStep(`جاري تحليل الصفحة ${i + 1} من ${images.length}...`);
          
          // تحليل الورقة
          const result = await analyzeBatchSheet(images[i], i + 1);
          
          if (result.success) {
            // حفظ النتيجة في DB
            await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}/results`, {
              method: 'POST',
              body: JSON.stringify({
                sheetId: result.result?.id || result.sheet.id,
                pageNumber: i + 1,
                studentName: result.sheet.student?.name || result.sheet.trainee?.nameAr,
                nationalId: result.sheet.nationalId,
                score: result.sheet.score,
                totalQuestions: result.sheet.totalQuestions,
                answeredQuestions: result.sheet.answeredQuestions,
                correctAnswers: result.sheet.correctAnswers,
                wrongAnswers: result.sheet.wrongAnswers,
                answersDetail: result.sheet.answersDetail,
              }),
            });
            
            localCompleted++;
            setBatchCompleted(prev => [...prev, result.sheet]);
            toast.success(`${result.sheet.student?.name || result.sheet.trainee?.nameAr} - ${result.sheet.score}/${result.sheet.totalQuestions} درجة`);
            
          } else if (result.alreadyGraded) {
            // حفظ المصححة سابقاً في DB
            await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}/already-graded`, {
              method: 'POST',
              body: JSON.stringify({
                pageNumber: i + 1,
                nationalId: result.nationalId,
                studentName: result.studentName,
                previousScore: result.previousScore,
              }),
            });
            
            localAlreadyGraded++;
            setBatchSkipped(prev => [...prev, {
              pageNumber: i + 1,
              error: `تم تصحيحها سابقاً - الدرجة: ${result.previousScore}`,
              nationalId: result.nationalId,
              studentName: result.studentName,
              alreadyGraded: true,
            }]);
            toast(`${result.studentName || 'طالب غير محدد'} - مصححة سابقاً (${result.previousScore} درجة)`, { duration: 2000 });
            
          } else if (result.skipped) {
            // حفظ المتجاهلة في DB
            await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}/skipped`, {
              method: 'POST',
              body: JSON.stringify({
                pageNumber: i + 1,
                reason: result.error,
                nationalId: result.nationalId,
              }),
            });
            
            localSkipped++;
            setBatchSkipped(prev => [...prev, {
              pageNumber: i + 1,
              error: result.error,
              nationalId: result.nationalId,
            }]);
            toast(`صفحة ${i + 1}: ${result.error}`, { duration: 2000 });
            
          } else {
            // حفظ الفشل في DB
            await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}/failures`, {
              method: 'POST',
              body: JSON.stringify({
                pageNumber: i + 1,
                error: result.error,
                nationalId: result.nationalId,
              }),
            });
            
            localFailed++;
            setBatchFailed(prev => [...prev, {
              pageNumber: i + 1,
              error: result.error,
              nationalId: result.nationalId,
            }]);
            toast.error(`صفحة ${i + 1}: ${result.error}`, { duration: 3000 });
          }
          
        } catch (error: any) {
          console.error(`Error processing page ${i + 1}:`, error);
          
          // حفظ الفشل
          await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}/failures`, {
            method: 'POST',
            body: JSON.stringify({
              pageNumber: i + 1,
              error: error.message,
              nationalId: null, // لا يوجد رقم قومي في حالة الخطأ
            }),
          });
          
          localFailed++;
          setBatchFailed(prev => [...prev, {
            pageNumber: i + 1,
            error: error.message || 'خطأ غير معروف',
            nationalId: null,
          }]);
        }
        
        // تأخير بسيط بين الأوراق
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // استخدام العدادات المحلية بدلاً من state
      const finalCompleted = localCompleted;
      const finalAlreadyGraded = localAlreadyGraded;
      const finalSkipped = localSkipped;
      const finalFailed = localFailed;
      
      // تحديث الحالة النهائية مع الإحصائيات الكاملة
      await fetchAPI(`/paper-exams/${examId}/batch-grading/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'COMPLETED',
          currentIndex: images.length,
          completedCount: finalCompleted,
          alreadyGradedCount: finalAlreadyGraded,
          skippedCount: finalSkipped,
          failedCount: finalFailed,
        }),
      });
      
      // تحديث localStorage
      localStorage.setItem(`batch_${sessionId}`, JSON.stringify({
        sessionId,
        examId,
        totalPages: images.length,
        status: 'completed',
        endTime: new Date().toISOString(),
      }));
      
      // إعادة تحميل قائمة العمليات
      loadBatchSessions();
      
      setProcessing(false);
      setScanStep('batch-summary');
      toast.success('انتهى التصحيح التلقائي');
      
    } catch (error: any) {
      console.error('Error in batch processing:', error);
      toast.error('حدث خطأ في عملية التصحيح');
      setProcessing(false);
    }
  };

  // تحليل ورقة واحدة في التصحيح المتعدد
  const analyzeBatchSheet = async (imageDataUrl: string, pageNumber: number) => {
    try {
      setProcessingStep('معالجة الصورة...');
      const enhancedImage = await enhanceOMRImage(imageDataUrl);
      
      setProcessingStep('Codex Vision يحلل...');
      
      const response = await fetchAPI('/openai-vision/analyze-omr-with-national-id', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: enhancedImage,
          numberOfQuestions: currentSheet?.model?.questions?.length || 50
        }),
      });

      // تخطي الأوراق التي لم يتم التعرف على رقمها القومي
      if (!response.nationalId) {
        return { success: false, error: 'تم تجاهل الورقة - لم يتم العثور على رقم قومي', skipped: true };
      }

      // البحث عن الطالب
      setProcessingStep('البحث عن الطالب...');
      const sheet = await searchTraineeByNationalId(response.nationalId, true); // تخطي فحص الورقة المصححة
      
      // تخطي الطلاب غير الموجودين في الامتحان
      if (!sheet) {
        return { success: false, error: 'تم تجاهل الورقة - الطالب غير موجود في الامتحان', skipped: true, nationalId: response.nationalId };
      }

      // إذا كانت الورقة مصححة سابقاً
      if (sheet.alreadyGraded) {
        return { 
          success: false, 
          error: 'تم تصحيح هذه الورقة سابقاً', 
          alreadyGraded: true, 
          nationalId: response.nationalId,
          studentName: sheet.trainee?.nameAr,
          previousScore: sheet.previousScore,
        };
      }

      // تخطي الطلاب الذين ليس لديهم إجابات
      if (!response.answers || response.answers.length === 0) {
        return { success: false, error: 'تم تجاهل الورقة - لا توجد إجابات', skipped: true, nationalId: response.nationalId };
      }

      // حفظ الإجابات تلقائياً بدون مراجعة
      setProcessingStep('حفظ النتائج...');
      
      // مطابقة الإجابات
      const questions = sheet?.model?.questions || [];
      const mappedAnswers = response.answers.map((result: any) => {
        const question = questions[result.questionNumber - 1];
        if (!question) return null;
        
        const symbol = result.selectedSymbol.toUpperCase().trim();
        const options = question.question.options;
        const isTrueFalseQuestion = options.length === 2 && 
          options.some((o: any) => o.text === 'صحيح' || o.text === 'صح') &&
          options.some((o: any) => o.text === 'خطأ' || o.text === 'خطا');
        
        const selectedOption = question.question.options.find((opt: any, optIndex: number) => {
          if (isTrueFalseQuestion && (symbol === 'T' || symbol === 'F')) {
            const isTrue = opt.text === 'صحيح' || opt.text === 'صح';
            return (symbol === 'T' && isTrue) || (symbol === 'F' && !isTrue);
          } else {
            const englishLetter = ['A', 'B', 'C', 'D', 'E'][optIndex];
            return englishLetter === symbol;
          }
        });
        
        if (!selectedOption) return null;
        
        return {
          questionId: question.questionId,
          selectedOptionId: selectedOption.id,
          confidence: result.confidence,
          questionNumber: result.questionNumber,
          isCorrect: selectedOption.id === question.question.correctOptionId,
        };
      }).filter(Boolean);

      // حفظ في قاعدة البيانات
      const ocrData: any = {
        answers: {},
        confidence: {},
      };

      mappedAnswers.forEach((answer: any) => {
        ocrData.answers[answer.questionId] = answer.selectedOptionId;
        ocrData.confidence[answer.questionId] = answer.confidence;
      });

      const result = await fetchAPI('/paper-exams/scan-answer-sheet', {
        method: 'POST',
        body: JSON.stringify({
          sheetCode: sheet.sheetCode,
          ocrData,
          scannedImageUrl: imageDataUrl,
        }),
      });

      const answeredQuestions = mappedAnswers.length;
      const correctAnswers = mappedAnswers.filter((a: any) => a.isCorrect).length;
      const wrongAnswers = answeredQuestions - correctAnswers;
      
      return { 
        success: true, 
        sheet: {
          ...sheet,
          nationalId: response.nationalId,
          answers: mappedAnswers,
          score: correctAnswers,
          answeredQuestions,
          correctAnswers,
          wrongAnswers,
          totalQuestions: questions.length,
          answersDetail: mappedAnswers.map((a: any) => ({
            questionNumber: a.questionNumber,
            isCorrect: a.isCorrect,
            confidence: a.confidence,
          })),
        },
        result, // نتيجة الحفظ في DB
      };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // إعادة محاولة ورقة فاشلة
  const handleRetryFailedSheet = async (pageNumber: number) => {
    const imageIndex = pageNumber - 1;
    if (imageIndex >= batchImages.length) return;
    
    toast.loading('جاري إعادة المحاولة...', { id: 'retry' });
    
    try {
      const result = await analyzeBatchSheet(batchImages[imageIndex], pageNumber);
      
      if (result.success) {
        // إزالة من القائمة الفاشلة
        setBatchFailed(prev => prev.filter(s => s.pageNumber !== pageNumber));
        // إضافة للناجحة
        setBatchCompleted(prev => [...prev, result.sheet]);
        toast.success('تم التصحيح بنجاح', { id: 'retry' });
      } else {
        toast.error(result.error, { id: 'retry' });
      }
    } catch (error: any) {
      toast.error('فشلت إعادة المحاولة', { id: 'retry' });
    }
  };

  // تصحيح يدوي لورقة فاشلة
  const handleManualGradeFailedSheet = (pageNumber: number) => {
    const imageIndex = pageNumber - 1;
    if (imageIndex >= batchImages.length) return;
    
    // الانتقال للتصحيح اليدوي
    setCapturedImage(batchImages[imageIndex]);
    setScanStep('review');
    setMode('upload');
  };

  // إيقاف التصحيح المتعدد
  const handleStopBatchProcessing = () => {
    setBatchPaused(true);
    setProcessing(false);
    toast('تم إيقاف التصحيح');
  };

  // فتح الكاميرا
  const openCamera = () => {
    if (isMobile) {
      // على الجوال: فتح كاميرا الهاتف مباشرة
      cameraInputRef.current?.click();
    } else {
      // على الكمبيوتر: استخدام react-webcam
      setShowWebcam(true);
    }
  };

  // إغلاق الكاميرا
  const closeCamera = () => {
    setShowWebcam(false);
  };

  // التقاط الصورة من webcam
  const captureFromWebcam = useCallback(async () => {
    if (!webcamRef.current) {
      toast.error('الكاميرا غير جاهزة');
      return;
    }

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('فشل في التقاط الصورة');
        return;
      }

      setCapturedImage(imageSrc);
      setScanStep('processing');
      closeCamera();
      toast.success('✓ تم التقاط الصورة');
      
      // تحليل الصورة
      if (mode === 'camera') {
        await analyzeOMRWithNationalId(imageSrc);
      } else {
        await analyzeOMRImage(imageSrc);
      }
    } catch (error) {
      console.error('خطأ في التقاط الصورة:', error);
      toast.error('فشل في التقاط الصورة');
    }
  }, [mode]);

  // استخراج الرقم القومي من صورة OMR
  const extractNationalIdFromImage = async (imageDataUrl: string): Promise<string | null> => {
    try {
      setExtractingNationalId(true);
      setProcessingStep('استخراج الرقم القومي من الصورة...');
      
      const response = await fetchAPI('/openai-vision/extract-national-id', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: imageDataUrl }),
      });
      
      return response.nationalId || null;
    } catch (error) {
      console.error('Error extracting national ID:', error);
      return null;
    } finally {
      setExtractingNationalId(false);
    }
  };

  // البحث عن متدرب بالرقم القومي
  const searchTraineeByNationalId = async (nationalId: string, skipGradedCheck = false) => {
    try {
      console.log('🔍 البحث عن متدرب بالرقم القومي:', nationalId);
      const results = await fetchAPI(`/paper-exams/${examId}/search-students?q=${nationalId}`);
      console.log('📊 نتائج البحث:', results);
      
      if (results && results.length > 0) {
        const trainee = results[0];
        console.log('✓ تم العثور على متدرب:', trainee);
        
        const sheet = await getAnswerSheetByCode(trainee.sheetCode || trainee.nationalId);
        console.log('📄 ورقة الإجابة:', sheet);
        
        if (sheet.paperExamId !== examId) {
          toast.error('هذه الورقة لا تنتمي لهذا الاختبار');
          return null;
        }

        // في وضع batch، نتحقق من الورقة المصححة ونرجع معلومات خاصة
        if (sheet.status === 'GRADED') {
          if (skipGradedCheck) {
            // إرجاع معلومات للأوراق المصححة سابقاً
            return {
              ...sheet,
              alreadyGraded: true,
              previousScore: sheet.score,
            };
          } else {
            toast.error(
              `هذه الورقة مصححة بالفعل!\n\n${sheet.trainee.nameAr}\nالدرجة: ${sheet.score}/${sheet.totalPoints}\n${sheet.passed ? 'ناجح' : 'راسب'}`,
              { duration: 5000 }
            );
            return null;
          }
        }

        setCurrentSheet(sheet);
        if (!skipGradedCheck) {
          toast.success(`✓ ${sheet.trainee.nameAr}`);
        }
        return sheet;
      }
      console.log('❌ لم يتم العثور على نتائج');
      return null;
    } catch (error) {
      console.error('❌ خطأ في البحث عن المتدرب:', error);
      return null;
    }
  };

  // دالة مطابقة وحفظ الإجابات (لتجنب التكرار)
  const mapAndSaveAnswers = async (sheet: any, answers: OpenAIOMRResult[]) => {
    setProcessingStep('مطابقة الإجابات مع النموذج');
    setAnalysisProgress(80);
    
    const questions = sheet?.model?.questions || [];
    
    if (questions.length === 0) {
      toast.error('لم يتم العثور على أسئلة في النموذج');
      setScanStep('select');
      setProcessing(false);
      return;
    }
    
    // مطابقة الإجابات المكتشفة مع أسئلة النموذج
    const mappedAnswers = answers.map((result: OpenAIOMRResult) => {
      const question = questions[result.questionNumber - 1];
      if (!question) return null;
      
      const symbol = result.selectedSymbol.toUpperCase().trim();
      const options = question.question.options;
      const isTrueFalseQuestion = options.length === 2 && 
        options.some((o: any) => o.text === 'صحيح' || o.text === 'صح') &&
        options.some((o: any) => o.text === 'خطأ' || o.text === 'خطا');
      
      const selectedOption = question.question.options.find((opt: any, optIndex: number) => {
        if (isTrueFalseQuestion && (symbol === 'T' || symbol === 'F')) {
          const isTrue = opt.text === 'صحيح' || opt.text === 'صح';
          return (symbol === 'T' && isTrue) || (symbol === 'F' && !isTrue);
        } else {
          const englishLetter = ['A', 'B', 'C', 'D', 'E'][optIndex];
          return englishLetter === symbol;
        }
      });
      
      if (!selectedOption) return null;
      
      return {
        questionId: question.questionId,
        selectedOptionId: selectedOption.id,
        confidence: result.confidence
      };
    }).filter(Boolean);
    
    setDetectedAnswers(answers);
    setSelectedAnswers(mappedAnswers);
    setCurrentSheet(sheet);
    setAnalysisProgress(100);
    setProcessingStep('حفظ النتائج تلقائياً...');
    
    // حفظ تلقائي بدون مراجعة
    await handleGradingAutomatic(mappedAnswers, sheet);
    
    toast.success(`✓ تم التصحيح التلقائي`);
    setScanStep('select');
    setProcessing(false);
  };

  // تحليل OMR كامل: الرقم القومي + الإجابات معاً
  const analyzeOMRWithNationalId = async (imageDataUrl: string) => {
    try {
      setProcessing(true);
      
      setProcessingStep('تحميل الصورة');
      setAnalysisProgress(10);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProcessingStep('معالجة الصورة وتحسين الجودة');
      setAnalysisProgress(20);
      const enhancedImage = await enhanceOMRImage(imageDataUrl);
      
      setProcessingStep('Codex Vision يحلل: الرقم القومي + الإجابات معاً');
      setAnalysisProgress(40);
      
      // تحليل كامل في طلب واحد
      const response = await fetchAPI('/openai-vision/analyze-omr-with-national-id', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: enhancedImage,
          numberOfQuestions: 50
        }),
      });
      
      const { nationalId, answers } = response;
      
      setAnalysisProgress(60);
      
      if (nationalId) {
        toast.success(`✓ تم استخراج الرقم القومي: ${nationalId}`);
        setProcessingStep('البحث عن المتدرب...');
        setAnalysisProgress(70);
        
        const sheet = await searchTraineeByNationalId(nationalId);
        
        if (sheet) {
          // تم العثور على المتدرب - مطابقة الإجابات
          await mapAndSaveAnswers(sheet, answers);
        } else {
          // لم يتم العثور على المتدرب - تفعيل البحث اليدوي مع حفظ الإجابات
          setDetectedAnswers(answers);
          setManualNationalIdInput(true);
          setCapturedImage(imageDataUrl);
          setScanStep('select');
          setProcessing(false);
          toast.error('لم يتم العثور على المتدرب. يرجى إدخال الرقم القومي أو الاسم يدوياً');
        }
      } else {
        // فشل استخراج الرقم القومي - تفعيل البحث اليدوي مع حفظ الإجابات
        setDetectedAnswers(answers);
        setManualNationalIdInput(true);
        setCapturedImage(imageDataUrl);
        setScanStep('select');
        setProcessing(false);
        toast.error('لم يتم التعرف على الرقم القومي تلقائياً');
      }
      
    } catch (error: any) {
      console.error('Error analyzing OMR:', error);
      toast.error(error.message || 'فشل في تحليل الصورة');
      setScanStep('select');
    } finally {
      setProcessing(false);
    }
  };

  // تحميل ورقة الإجابة بالكود
  const loadSheetByCode = async (sheetCode: string) => {
    try {
      setProcessing(true);
      
      const sheet = await getAnswerSheetByCode(sheetCode);
      
      if (sheet.paperExamId !== examId) {
        toast.error('هذه الورقة لا تنتمي لهذا الاختبار');
        setProcessing(false);
        return;
      }

      if (sheet.status === 'GRADED') {
        toast.error(
          `هذه الورقة مصححة بالفعل!\n\n${sheet.trainee.nameAr}\nالدرجة: ${sheet.score}/${sheet.totalPoints}\n${sheet.passed ? 'ناجح' : 'راسب'}`,
          { duration: 5000 }
        );
        setProcessing(false);
        return;
      }

      setCurrentSheet(sheet);
      
      if (mode === 'camera') {
        // Camera mode: انتقل لمرحلة التقاط الصورة
        setScanStep('capture');
        toast.success(`${sheet.trainee.nameAr}\nالآن التقط صورة ورقة الإجابة`);
      } else {
        // Upload mode: لا نفتح fileInput تلقائياً
        toast.success(`${sheet.trainee.nameAr}\nالآن ارفع صورة ورقة الإجابة`);
      }
      
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تحميل الورقة');
    } finally {
      setProcessing(false);
    }
  };

  // بحث live
  useEffect(() => {
    const searchStudents = async () => {
      if (sheetCodeInput.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      try {
        const results = await fetchAPI(`/paper-exams/${examId}/search-students?q=${sheetCodeInput}`);
        setSearchResults(results || []);
        setShowResults(true);
      } catch (error) {
        setSearchResults([]);
      }
    };

    const timer = setTimeout(searchStudents, 300);
    return () => clearTimeout(timer);
  }, [sheetCodeInput, examId]);

  // رفع صورة OMR
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      setScanStep('processing');
      toast.success('✓ تم رفع الصورة');
      
      // إذا كان mode = camera (التصوير المباشر)، تحليل كامل
      if (mode === 'camera') {
        await analyzeOMRWithNationalId(imageData);
      } else {
        // mode = upload (الطريقة العادية)
        await analyzeOMRImage(imageData);
      }
    };
    reader.onerror = () => {
      toast.error('فشل في قراءة الصورة');
    };
    reader.readAsDataURL(file);
  }, [currentSheet, mode]);

  // تحليل صورة OMR
  const analyzeOMRImage = async (imageDataUrl: string) => {
    try {
      setProcessing(true);
      
      setProcessingStep('تحميل الصورة');
      setAnalysisProgress(5);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProcessingStep('معالجة الصورة (Grayscale + تباين)');
      setAnalysisProgress(15);
      const enhancedImage = await enhanceOMRImage(imageDataUrl);
      
      setProcessingStep('تحويل لأبيض وأسود');
      setAnalysisProgress(30);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStep('Vision AI يحلل الإجابات بذكاء');
      
      // الأسئلة مرتبة بالفعل في database (تم ترتيبها عند إنشاء النموذج)
      const questions = currentSheet?.model?.questions || [];
      
      if (questions.length === 0) {
        throw new Error('لا توجد أسئلة في النموذج');
      }
      
      // استخدام Vision AI للتحليل
      const numberOfQuestions = questions.length;
      let detectedResults;
      
      try {
        detectedResults = await analyzeOMRWithOpenAI(enhancedImage, numberOfQuestions);
      } catch (error: any) {
        // التحقق من خطأ عدم توفر Vision AI
        if (error.message && (error.message.includes('MISTRAL_API_KEY') || error.message.includes('Vision AI'))) {
          toast.error('خدمات Vision AI غير متاحة لديك. يرجى تكوين المفتاح في إعدادات المطورين');
          setProcessing(false);
          setScanStep('select');
          return;
        }
        throw error; // إعادة رمي الأخطاء الأخرى
      }
      
      setAnalysisProgress(70);
      
      // عرض الصورة مع النتائج
      if (annotatedCanvasRef.current && detectedResults.length > 0) {
        const img = new Image();
        img.src = imageDataUrl;
        await new Promise(resolve => {
          img.onload = () => {
            if (annotatedCanvasRef.current) {
              annotatedCanvasRef.current.width = img.width;
              annotatedCanvasRef.current.height = img.height;
              const ctx = annotatedCanvasRef.current.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                // رسم علامات على الإجابات المكتشفة
                ctx.fillStyle = '#00ff00';
                ctx.font = 'bold 24px Arial';
                detectedResults.forEach(result => {
                  ctx.fillText(
                    `✓ Q${result.questionNumber}: ${result.selectedSymbol}`,
                    20,
                    40 + (result.questionNumber - 1) * 30
                  );
                });
              }
            }
            resolve(true);
          };
        });
      }
      
      setAnalysisProgress(90);
      
      // تحويل نتائج OCR إلى تنسيق التصحيح (الحروف الإنجليزية)
      console.log('📋 بدء تحويل النتائج...');
      console.log('📋 عدد الأسئلة:', questions.length);
      console.log('📋 النتائج المكتشفة:', detectedResults);
      
      const mappedAnswers = detectedResults.map(result => {
        console.log(`🔍 معالجة السؤال ${result.questionNumber}: ${result.selectedSymbol}`);
        
        // الأسئلة مرتبة بالفعل في database
        const question = questions[result.questionNumber - 1];
        if (!question) {
          console.warn(`❌ السؤال ${result.questionNumber} غير موجود في القائمة`);
          return null;
        }
        
        console.log(`📌 السؤال ${result.questionNumber}:`, {
          questionId: question.questionId,
          options: question.question?.options?.map((o: any, i: number) => `${['A','B','C','D'][i]}: ${o.text}`)
        });
        
        const symbol = result.selectedSymbol.toUpperCase().trim();
        
        // تحديد نوع السؤال: صح/خطأ فقط إذا كان عدد الخيارات 2
        const options = question.question.options;
        const isTrueFalseQuestion = options.length === 2 && 
          options.some((o: any) => o.text === 'صحيح' || o.text === 'صح') &&
          options.some((o: any) => o.text === 'خطأ' || o.text === 'خطا');
        
        console.log(`   نوع السؤال: ${isTrueFalseQuestion ? 'صح/خطأ' : 'اختيار من متعدد'}`);
        
        // البحث عن الخيار بناءً على الحرف الإنجليزي
        const selectedOption = question.question.options.find((opt: any, optIndex: number) => {
          if (isTrueFalseQuestion && (symbol === 'T' || symbol === 'F')) {
            // T = صح/True، F = خطأ/False - فقط للأسئلة ذات خيارين
            const isTrue = opt.text === 'صحيح' || opt.text === 'صح';
            return (symbol === 'T' && isTrue) || (symbol === 'F' && !isTrue);
          } else {
            // اختيار من متعدد: A B C D يطابق index 0 1 2 3
            const englishLetter = ['A', 'B', 'C', 'D', 'E'][optIndex];
            const isMatch = englishLetter === symbol;
            console.log(`   مقارنة: ${englishLetter} === ${symbol} ? ${isMatch}`);
            return isMatch;
          }
        });
        
        if (!selectedOption) {
          console.warn(`❌ لم يتم العثور على خيار للسؤال ${result.questionNumber} مع الرمز ${symbol}`);
          console.warn('الخيارات المتاحة:', question.question.options.map((o: any, i: number) => `${['A','B','C','D'][i]}: ${o.text} (id: ${o.id})`));
          return null;
        }
        
        console.log(`✅ السؤال ${result.questionNumber}: ${symbol} → ${selectedOption.text} (id: ${selectedOption.id})`);
        
        return {
          questionId: question.questionId,
          selectedOptionId: selectedOption.id,
          confidence: result.confidence
        };
      }).filter(a => a !== null);
      
      console.log('📊 النتائج النهائية المحولة:', mappedAnswers);
      
      setDetectedAnswers(detectedResults);
      setSelectedAnswers(mappedAnswers);
      setAnalysisProgress(100);
      
      toast.dismiss('analysis');
      
      if (detectedResults.length > 0) {
        toast.success(`تم التعرف على ${detectedResults.length} إجابة تلقائياً!`, { duration: 4000 });
      } else {
        toast.error('لم يتم التعرف على أي إجابة. تحقق من جودة الصورة.');
      }
      
      setScanStep('review');
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.dismiss('analysis');
      toast.error('فشل التحليل: ' + (error.message || 'خطأ غير معروف'));
      setScanStep('review');
    } finally {
      setProcessing(false);
      setAnalysisProgress(0);
      setProcessingStep('');
    }
  };

  // التصحيح
  const handleGrading = async () => {
    if (!currentSheet || selectedAnswers.length === 0) {
      toast.error('لا توجد إجابات للتصحيح');
      return;
    }

    try {
      setProcessing(true);
      
      const ocrData: any = {
        answers: {},
        confidence: {},
      };

      selectedAnswers.forEach((answer) => {
        if (answer.questionId && answer.selectedOptionId) {
          ocrData.answers[answer.questionId] = answer.selectedOptionId;
          ocrData.confidence[answer.questionId] = answer.confidence || 1.0;
        }
      });

      const result = await scanAnswerSheet({
        sheetCode: currentSheet.sheetCode,
        ocrData,
      });

      toast.success(
        `تم التصحيح بنجاح!\n\n${result.trainee.nameAr}\n${result.score}/${result.totalPoints} (${result.percentage.toFixed(1)}%)\n${result.passed ? 'ناجح' : 'راسب'}`,
        { duration: 6000 }
      );

      setScannedCount(prev => prev + 1);
      
      setTimeout(() => {
        resetScanning();
      }, 2000);
      
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في التصحيح');
    } finally {
      setProcessing(false);
    }
  };

  // التصحيح التلقائي (بدون مراجعة)
  const handleGradingAutomatic = async (answers: any[], sheet: any) => {
    try {
      const ocrData: any = {
        answers: {},
        confidence: {},
      };

      answers.forEach((answer) => {
        if (answer.questionId && answer.selectedOptionId) {
          ocrData.answers[answer.questionId] = answer.selectedOptionId;
          ocrData.confidence[answer.questionId] = answer.confidence || 1.0;
        }
      });

      const result = await fetchAPI('/paper-exams/scan-answer-sheet', {
        method: 'POST',
        body: JSON.stringify({
          sheetCode: sheet.sheetCode,
          ocrData,
          scannedImageUrl: capturedImage,
        }),
      });

      setScannedCount(prev => prev + 1);
      
    } catch (error: any) {
      throw error;
    }
  };

  const resetScanning = () => {
    setCurrentSheet(null);
    setSelectedAnswers([]);
    setDetectedAnswers([]);
    setCapturedImage(null);
    setAnalysisProgress(0);
    setSheetCodeInput('');
    setScanStep('select');
  };

  return (
    <>
      {/* تحميل مكتبة PDF.js */}
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          // تفعيل worker
          if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
        }}
      />
      
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
      {/* العنوان */}
      <div className="bg-blue-600 text-white rounded-lg p-4 md:p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 md:mb-2">تصحيح OMR الذكي</h1>
        <p className="text-sm md:text-base text-blue-100">مدعوم بـ <span className="font-bold">Codex Vision</span> - دقة عالية</p>
      </div>
      
      {/* تعليمات */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-3 md:p-4 rounded-lg">
        <p className="font-bold text-blue-900 mb-2 text-sm md:text-base">للحصول على أفضل كفاءة:</p>
        <ul className="text-xs md:text-sm text-blue-800 space-y-1">
          <li>✓ صورة واضحة وعالية الجودة</li>
          <li>✓ إضاءة جيدة ومتساوية</li>
          <li>✓ ورقة مستوية بدون طيات</li>
          <li>✓ تظليل قوي بقلم رصاص</li>
        </ul>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border border-slate-200">
          <CheckCircleIcon className="w-6 h-6 md:w-10 md:h-10 text-green-600 mb-1 md:mb-2" />
          <p className="text-xl md:text-3xl font-bold text-slate-900">{scannedCount}</p>
          <p className="text-xs md:text-sm text-slate-600">أوراق مصححة</p>
        </div>
        <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border border-slate-200">
          <BoltIcon className="w-6 h-6 md:w-10 md:h-10 text-blue-600 mb-1 md:mb-2" />
          <p className="text-sm md:text-lg font-bold text-slate-900">
            {scanStep === 'select' ? 'اختيار' : scanStep === 'capture' ? 'التقاط' : scanStep === 'processing' ? 'معالجة' : 'مراجعة'}
          </p>
          <p className="text-xs md:text-sm text-slate-600">الخطوة</p>
        </div>
        <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border border-slate-200">
          <PhotoIcon className="w-6 h-6 md:w-10 md:h-10 text-blue-600 mb-1 md:mb-2" />
          <p className="text-xl md:text-3xl font-bold text-slate-900">
            {selectedAnswers.length}/{currentSheet?.model?.questions?.length || 0}
          </p>
          <p className="text-xs md:text-sm text-slate-600">إجابات</p>
        </div>
      </div>

      {/* خطوة 1: اختيار الطريقة */}
      {scanStep === 'select' && (
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h3 className="text-base md:text-lg font-bold text-slate-900">اختر طريقة التصحيح</h3>
            <Button
              onClick={() => router.push(`/dashboard/paper-exams/${examId}/batch-log`)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              سجل العمليات {batchSessions.length > 0 && `(${batchSessions.length})`}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
            <Button
              onClick={() => {
                setMode('camera');
                setManualNationalIdInput(false);
              }}
              className={`${mode === 'camera' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'} text-xs md:text-sm px-3 md:px-4 py-2`}
            >
              <CameraIcon className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              تصحيح بالكاميرا
            </Button>
            <Button
              onClick={() => {
                setMode('upload');
                setManualNationalIdInput(false);
              }}
              className={`${mode === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'} text-xs md:text-sm px-3 md:px-4 py-2`}
            >
              <ArrowUpTrayIcon className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              رفع صورة (يدوي)
            </Button>
            <Button
              onClick={() => {
                setMode('batch');
                setScanStep('batch-upload');
              }}
              className={`${mode === 'batch' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700'} text-xs md:text-sm px-3 md:px-4 py-2`}
            >
              <CheckCircleIcon className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              تصحيح متعدد (PDF)
            </Button>
          </div>

          {mode === 'camera' ? (
            <div className="space-y-3 md:space-y-4">
              <div className="bg-green-50 border-l-4 border-green-600 p-2 md:p-3 rounded mb-3 md:mb-4">
                <p className="text-xs md:text-sm text-green-800">
                  <strong>التصحيح الذكي:</strong> صوّر أو ارفع صورة ورقة الإجابة. سيتم استخراج الرقم القومي تلقائياً
                </p>
              </div>

              {manualNationalIdInput && (
                <div className="bg-yellow-50 border-l-4 border-yellow-600 p-3 md:p-4 rounded mb-3 md:mb-4">
                  <p className="font-bold text-sm md:text-base text-yellow-900 mb-1 md:mb-2">لم يتم التعرف على الرقم القومي</p>
                  <p className="text-xs md:text-sm text-yellow-800 mb-2 md:mb-3">يرجى إدخال الرقم القومي أو الاسم:</p>
                  
                  {detectedAnswers.length > 0 && (
                    <div className="bg-green-100 border border-green-400 rounded-lg p-2 mb-3 text-center">
                      <p className="text-green-800 text-sm font-bold">تم حفظ {detectedAnswers.length} إجابة - سيتم استخدامها مباشرة</p>
                    </div>
                  )}
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={nationalIdInput}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setNationalIdInput(value);
                        
                        // بحث live
                        if (value.length >= 2) {
                          try {
                            const results = await fetchAPI(`/paper-exams/${examId}/search-students?q=${value}`);
                            setManualSearchResults(results || []);
                            setShowManualResults(true);
                          } catch (error) {
                            setManualSearchResults([]);
                          }
                        } else {
                          setManualSearchResults([]);
                          setShowManualResults(false);
                        }
                      }}
                      onFocus={() => nationalIdInput.length >= 2 && setShowManualResults(true)}
                      placeholder="اسم الطالب أو الرقم القومي"
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-yellow-400 rounded-lg"
                    />
                    
                    {/* نتائج البحث */}
                    {showManualResults && manualSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-yellow-400 rounded-lg shadow-sm z-10 max-h-60 overflow-y-auto">
                        {manualSearchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={async () => {
                              setNationalIdInput(result.nameAr);
                              setShowManualResults(false);
                              
                              // البحث عن المتدرب وتحميل ورقته
                              const sheet = await searchTraineeByNationalId(result.nationalId);
                              if (sheet) {
                                setManualNationalIdInput(false);
                                // استخدام الإجابات المحفوظة مسبقاً
                                if (detectedAnswers.length > 0) {
                                  await mapAndSaveAnswers(sheet, detectedAnswers);
                                } else {
                                  toast.error('لا توجد إجابات محفوظة');
                                }
                              }
                            }}
                            className="w-full px-4 py-3 text-right hover:bg-yellow-50 border-b border-slate-100 last:border-0"
                          >
                            <p className="font-bold text-slate-900">{result.nameAr}</p>
                            <p className="text-sm text-slate-600">{result.nationalId}</p>
                            {result.sheetCode && <p className="text-xs text-yellow-600">{result.sheetCode}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* زر التقاط بالكاميرا */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={openCamera}
                  className="block border-3 border-dashed border-green-500 rounded-lg p-4 md:p-8 text-center bg-green-50 cursor-pointer hover:bg-green-100 transition-all w-full"
                >
                  <CameraIcon className="w-8 h-8 md:w-12 md:h-12 text-green-600 mx-auto mb-1 md:mb-3" />
                  <p className="text-sm md:text-base font-bold text-slate-900">التقط صورة</p>
                  <p className="text-xs text-slate-600 mt-0.5 md:mt-1">فتح الكاميرا</p>
                </button>

                {/* زر رفع من المعرض */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="gallery-upload"
                />
                <label
                  htmlFor="gallery-upload"
                  className="block border-3 border-dashed border-blue-500 rounded-lg p-4 md:p-8 text-center bg-blue-50 cursor-pointer hover:bg-blue-100 transition-all"
                >
                  <PhotoIcon className="w-8 h-8 md:w-12 md:h-12 text-blue-600 mx-auto mb-1 md:mb-3" />
                  <p className="text-sm md:text-base font-bold text-slate-900">رفع صورة</p>
                  <p className="text-xs text-slate-600 mt-0.5 md:mt-1">اختر من المعرض</p>
                </label>
              </div>

              <p className="text-center text-xs md:text-sm text-slate-500 mt-1 md:mt-2">
                سيتم استخراج الرقم القومي تلقائياً
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-2 md:p-3 rounded mb-3 md:mb-4">
                <p className="text-xs md:text-sm text-yellow-800">
                  <strong>الطريقة اليدوية:</strong> ابحث أولاً، ثم ارفع صورة الورقة
                </p>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={sheetCodeInput}
                  onChange={(e) => setSheetCodeInput(e.target.value)}
                  onFocus={() => sheetCodeInput.length >= 2 && setShowResults(true)}
                  placeholder="اسم الطالب أو الرقم القومي"
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-slate-300 rounded-lg"
                />
                
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-sm z-10 max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          setSheetCodeInput(result.sheetCode || result.nationalId);
                          setShowResults(false);
                          loadSheetByCode(result.sheetCode || result.nationalId);
                        }}
                        className="w-full px-4 py-3 text-right hover:bg-blue-50 border-b border-slate-100 last:border-0"
                      >
                        <p className="font-bold text-slate-900">{result.nameAr}</p>
                        <p className="text-sm text-slate-600">{result.nationalId}</p>
                        {result.sheetCode && <p className="text-xs text-blue-600">{result.sheetCode}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {currentSheet && (
                <div>
                  <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded mb-4">
                    <p className="font-bold text-lg text-slate-900">{currentSheet.trainee.nameAr}</p>
                    <p className="text-sm text-slate-600">النموذج: {currentSheet.model.modelName}</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="omr-upload-manual"
                  />
                  <label
                    htmlFor="omr-upload-manual"
                    className="block border-3 border-dashed border-blue-500 rounded-lg p-10 text-center bg-blue-50 cursor-pointer hover:bg-blue-100"
                  >
                    <ArrowUpTrayIcon className="w-16 h-16 text-blue-600 mx-auto mb-3" />
                    <p className="text-lg font-bold text-slate-900">اضغط لرفع الصورة</p>
                    <p className="text-sm text-slate-700">JPG أو PNG - جودة عالية</p>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* نافذة الكاميرا للكمبيوتر */}
      {showWebcam && !isMobile && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">التقط صورة ورقة الإجابة</h3>
              <Button variant="outline" onClick={closeCamera}>
                إلغاء
              </Button>
            </div>
            
            <div className="relative rounded-lg overflow-hidden bg-black">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: 'user',
                  width: 1920,
                  height: 1080
                }}
                className="w-full"
                onUserMedia={() => setCameraReady(true)}
              />
            </div>

            {cameraReady && (
              <div className="mt-4 flex justify-center gap-3">
                <Button onClick={captureFromWebcam} className="bg-green-600 hover:bg-green-700">
                  <CameraIcon className="ml-2 w-5 h-5" />
                  التقط الصورة
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* خطوة 2: المعالجة */}
      {scanStep === 'processing' && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 border border-slate-200">
          <div className="text-center space-y-3 md:space-y-6">
            <div className="relative mx-auto w-16 h-16 md:w-24 md:h-24">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BoltIcon className="w-8 h-8 md:w-12 md:h-12 text-blue-600 animate-pulse" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-1 md:mb-2">Codex Vision</h3>
              <p className="text-sm md:text-lg text-blue-600 font-semibold">{processingStep}</p>
            </div>
            
            <div className="max-w-md mx-auto px-2">
              <div className="w-full bg-slate-200 rounded-full h-2 md:h-3">
                <div
                  className="h-2 md:h-3 bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <p className="text-lg md:text-xl font-bold text-slate-900 mt-1 md:mt-2">{analysisProgress}%</p>
            </div>
            
            {/* مراحل المعالجة */}
            <div className="flex flex-col gap-1.5 md:gap-2 text-xs md:text-sm">
              <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-center ${analysisProgress >= 5 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {analysisProgress >= 5 ? '✓' : '○'} تحميل الصورة
              </div>
              <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-center ${analysisProgress >= 15 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {analysisProgress >= 15 ? '✓' : '○'} معالجة (Grayscale + تباين)
              </div>
              <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-center ${analysisProgress >= 30 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {analysisProgress >= 30 ? '✓' : '○'} تحويل لأبيض/أسود
              </div>
              <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-center ${analysisProgress >= 50 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {analysisProgress >= 50 ? '✓' : '○'} تحليل Codex Vision
              </div>
            </div>
          </div>
        </div>
      )}

      {/* خطوة 3: المراجعة */}
      {scanStep === 'review' && currentSheet && (
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 border border-slate-200">
          <div className="mb-4 md:mb-6">
            <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-2">المراجعة والتصحيح</h3>
            <div className="p-3 md:p-4 bg-green-50 rounded-lg md:rounded-xl border-2 border-green-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm md:text-lg truncate">{currentSheet.trainee.nameAr}</p>
                  <p className="text-xs md:text-sm text-slate-600 truncate">النموذج: {currentSheet.model.modelName}</p>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-xl md:text-3xl font-bold text-green-700">
                    {selectedAnswers.length}/{currentSheet.model.questions?.length || 0}
                  </p>
                  <p className="text-xs md:text-sm text-slate-600">إجابات</p>
                </div>
              </div>
            </div>
          </div>

          {/* أزرار التحكم - أعلى الصفحة */}
          <div className="flex gap-2 md:gap-3 mb-4 md:mb-6">
            <Button
              onClick={handleGrading}
              disabled={selectedAnswers.length === 0 || processing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 md:py-4 text-sm md:text-lg"
            >
              <CheckCircleIcon className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              {processing ? 'جاري التصحيح...' : 'تصحيح الورقة'}
            </Button>
            <Button onClick={resetScanning} variant="outline" className="px-4 md:px-6 py-3 md:py-4 text-sm md:text-base" disabled={processing}>
              <XCircleIcon className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              إلغاء
            </Button>
          </div>

          {capturedImage && (
            <div className="mb-4 md:mb-6">
              <h4 className="font-bold text-sm md:text-base mb-2 md:mb-3 flex items-center gap-2">
                <PhotoIcon className="text-blue-600 w-4 h-4 md:w-5 md:h-5" />
                صورة الورقة + النتائج
                {detectedAnswers.length > 0 && (
                  <span className="bg-green-100 text-green-700 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold">
                    ✓ {detectedAnswers.length} مكتشفة
                  </span>
                )}
              </h4>
              <div className="rounded-lg md:rounded-xl overflow-hidden border-2 md:border-4 border-green-500 shadow-sm">
                {detectedAnswers.length > 0 && annotatedCanvasRef.current ? (
                  <canvas
                    ref={annotatedCanvasRef}
                    className="w-full object-contain bg-slate-100"
                    style={{ maxHeight: '400px' }}
                  />
                ) : (
                  <img 
                    src={capturedImage} 
                    alt="Answer Sheet" 
                    className="w-full object-contain bg-slate-100"
                    style={{ maxHeight: '400px' }}
                  />
                )}
              </div>
              {detectedAnswers.length > 0 && (
                <div className="mt-2 md:mt-3 p-2 md:p-4 bg-green-50 border-2 border-green-300 rounded-lg md:rounded-xl text-center">
                  <p className="font-bold text-xs md:text-base text-green-900">
                    الدوائر الخضراء = الإجابات المكتشفة
                  </p>
                  <p className="text-xs md:text-sm text-green-800">عدّل يدوياً أدناه إذا كان هناك خطأ</p>
                </div>
              )}
            </div>
          )}

          {/* الأسئلة */}
          <div className="mb-4 md:mb-6">
            <h4 className="font-bold text-sm md:text-lg mb-2 md:mb-4">الإجابات</h4>
            
            {!currentSheet.model.questions || currentSheet.model.questions.length === 0 ? (
              <div className="p-4 md:p-6 bg-red-50 border-2 border-red-300 rounded-lg md:rounded-xl text-center">
                <XCircleIcon className="w-12 h-12 md:w-16 md:h-16 text-red-600 mx-auto mb-2 md:mb-3" />
                <p className="font-bold text-red-900 text-base md:text-lg">خطأ: لا توجد أسئلة!</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {currentSheet.model.questions.map((examQuestion: any, index: number) => {
                  const currentAnswer = selectedAnswers.find(
                    a => a.questionId === examQuestion.questionId
                  );
                  
                  return (
                    <div key={examQuestion.id} className="border-2 rounded-lg md:rounded-xl p-2 md:p-4 bg-white">
                      <p className="font-bold text-xs md:text-base mb-2 md:mb-3 flex items-center gap-1 md:gap-2">
                        <span className="w-6 h-6 md:w-8 md:h-8 text-xs md:text-base bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="line-clamp-2">{examQuestion.question.text}</span>
                      </p>
                      <div className="space-y-1 md:space-y-2">
                        {examQuestion.question.options.map((option: any, optionIndex: number) => {
                          const isSelected = currentAnswer?.selectedOptionId === option.id;
                          const optionLabels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
                          
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                const newAnswers = selectedAnswers.filter(
                                  a => a.questionId !== examQuestion.questionId
                                );
                                newAnswers.push({
                                  questionId: examQuestion.questionId,
                                  selectedOptionId: option.id,
                                  confidence: 1.0
                                });
                                setSelectedAnswers(newAnswers);
                              }}
                              className={`w-full p-2 md:p-3 rounded-lg border-2 transition-all text-right ${
                                isSelected
                                  ? 'border-green-500 bg-green-50 scale-[1.02]'
                                  : 'border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 md:gap-3">
                                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'border-green-600 bg-green-600' : 'border-slate-300'
                                }`}>
                                  {isSelected && <CheckCircleIcon className="text-white w-3 h-3 md:w-4 md:h-4" />}
                                </div>
                                <span className="font-bold text-xs md:text-base">{optionLabels[optionIndex]}.</span>
                                <span className="text-xs md:text-sm flex-1 text-right line-clamp-2">{option.text}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* أزرار التحكم - أسفل الصفحة */}
          <div className="flex gap-2 md:gap-3">
            <Button
              onClick={handleGrading}
              disabled={selectedAnswers.length === 0 || processing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 md:py-6 text-sm md:text-xl"
            >
              <CheckCircleIcon className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              {processing ? 'جاري التصحيح...' : 'تصحيح الورقة'}
            </Button>
            <Button onClick={resetScanning} variant="outline" className="px-4 md:px-8 py-4 md:py-6 text-sm md:text-base" disabled={processing}>
              <XCircleIcon className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* واجهة رفع PDF للتصحيح المتعدد */}
      {scanStep === 'batch-upload' && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 border border-slate-200">
          <div className="text-center space-y-4 md:space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-green-50 rounded-full">
                <CheckCircleIcon className="w-12 h-12 md:w-16 md:h-16 text-green-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">التصحيح المتعدد</h3>
              <p className="text-sm md:text-base text-slate-600">
                ارفع ملف PDF يحتوي على أوراق الإجابة (صفحة واحدة لكل طالب)
              </p>
            </div>

            {/* منطقة رفع PDF */}
            <div className={`border-3 border-dashed rounded-xl p-8 md:p-12 transition-all ${
              isUploading ? 'border-blue-500 bg-blue-50' : 
              uploadedFilePath ? 'border-green-500 bg-green-50' : 
              'border-green-500 bg-green-50 hover:bg-green-100 cursor-pointer'
            }`}
                 onClick={() => !isUploading && pdfInputRef.current?.click()}>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
                disabled={isUploading}
              />
              
              {!batchPdfFile ? (
                <div className="text-center">
                  <ArrowUpTrayIcon className="w-12 h-12 md:w-16 md:h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-base md:text-lg font-bold text-slate-900 mb-2">
                    اسحب ملف PDF هنا أو انقر للاختيار
                  </p>
                  <p className="text-xs md:text-sm text-slate-600">
                    الحد الأقصى: 100 MB
                  </p>
                </div>
              ) : isUploading ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <svg className="animate-spin" viewBox="0 0 100 100">
                      <circle 
                        className="text-blue-200" 
                        strokeWidth="8" 
                        stroke="currentColor" 
                        fill="transparent"
                        r="40" 
                        cx="50" 
                        cy="50"
                      />
                      <circle 
                        className="text-blue-600" 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                        stroke="currentColor" 
                        fill="transparent"
                        r="40" 
                        cx="50" 
                        cy="50"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - uploadProgress / 100)}`}
                        style={{ transition: 'stroke-dashoffset 0.3s' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-700">
                      {uploadProgress}%
                    </span>
                  </div>
                  <p className="text-base md:text-lg font-bold text-blue-900 mb-2">
                    جاري رفع الملف...
                  </p>
                  <p className="text-xs md:text-sm text-blue-700">
                    {batchPdfFile.name}
                  </p>
                  {/* شريط التقدم */}
                  <div className="w-full bg-blue-200 rounded-full h-3 mt-4">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    {uploadProgress < 100 ? 'يرجى الانتظار حتى اكتمال الرفع...' : 'جاري معالجة الملف...'}
                  </p>
                </div>
              ) : uploadedFilePath ? (
                <div className="text-center">
                  <CheckCircleIcon className="w-12 h-12 md:w-16 md:h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-base md:text-lg font-bold text-green-700 mb-2">
                    تم رفع الملف بنجاح
                  </p>
                  <p className="text-sm text-slate-900 mb-1">
                    {batchPdfFile.name}
                  </p>
                  <p className="text-xs md:text-sm text-slate-600">
                    {(batchPdfFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBatchPdfFile(null);
                      setUploadedFilePath(null);
                      setUploadProgress(0);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    تغيير الملف
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <CheckCircleIcon className="w-12 h-12 md:w-16 md:h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-base md:text-lg font-bold text-slate-900 mb-2">
                    {batchPdfFile.name}
                  </p>
                  <p className="text-xs md:text-sm text-slate-600">
                    {(batchPdfFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBatchPdfFile(null);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    تغيير الملف
                  </Button>
                </div>
              )}
            </div>

            {/* معلومات مهمة */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded text-right">
              <p className="text-sm font-bold text-blue-900 mb-2">معلومات مهمة:</p>
              <ul className="text-xs md:text-sm text-blue-800 space-y-1">
                <li>• سيتم التعرف على الطلاب تلقائياً من الرقم القومي</li>
                <li>• كل صفحة يجب أن تحتوي على ورقة إجابة طالب واحد فقط</li>
                <li>• سيتم حفظ النتائج تلقائياً بعد كل ورقة بدون مراجعة</li>
                <li>• الأوراق غير المعروفة أو بدون إجابات سيتم تجاهلها</li>
                <li>• يمكنك إغلاق الجهاز والعودة لاحقاً - التقدم محفوظ</li>
                <li>• يمكنك مراجعة العمليات السابقة من "سجل العمليات"</li>
              </ul>
            </div>

            {/* أزرار التحكم */}
            <div className="flex gap-3 justify-center pt-4">
              <Button
                onClick={handleStartBatchProcessing}
                disabled={!batchPdfFile || !uploadedFilePath || isUploading || processing}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              >
                {processing ? 'جاري المعالجة...' : 'بدء التصحيح التلقائي'}
              </Button>
              <Button
                onClick={() => {
                  setScanStep('select');
                  setMode('camera');
                  setBatchPdfFile(null);
                }}
                variant="outline"
                className="px-6 py-3"
              >
                إلغاء
              </Button>
            </div>

            {/* عرض العمليات السابقة */}
            {batchSessions.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h4 className="text-lg font-bold text-slate-900 mb-4">العمليات السابقة</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {batchSessions.slice(0, 5).map((session, index) => {
                    const isCompleted = session.status === 'COMPLETED';
                    const totalProcessed = (session.completedCount || 0) + (session.alreadyGradedCount || 0) + (session.skippedCount || 0) + (session.failedCount || 0);
                    const progress = (totalProcessed / session.totalPages) * 100;

                    return (
                      <div key={session.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isCompleted ? <span>✓</span> : <span>→</span>}
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {session.fileName || `عملية #${index + 1}`}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(session.startTime).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-green-700">✓ {session.completedCount || 0}</span>
                          <span className="text-yellow-700">⊘ {session.skippedCount || 0}</span>
                          <span className="text-red-700">✗ {session.failedCount || 0}</span>
                          <span className="text-slate-600 mr-auto">{Math.round(progress)}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {batchSessions.length > 5 && (
                    <Button
                      onClick={() => setScanStep('batch-history')}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      عرض الكل ({batchSessions.length})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* واجهة التصحيح التلقائي */}
      {scanStep === 'batch-processing' && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 border border-slate-200">
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            {/* العنوان */}
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  Codex Vision - تصحيح تلقائي
                </h3>
                <p className="text-sm md:text-base text-slate-600">
                  جاري تصحيح الأوراق تلقائياً...
                </p>
              </div>
              <Button
                onClick={() => router.push(`/dashboard/paper-exams/${examId}/batch-log`)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                السجل الكامل
              </Button>
            </div>

            {/* التقدم الإجمالي */}
            <div className="bg-blue-50 rounded-xl p-4 md:p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-base md:text-lg font-bold text-slate-900">التقدم الإجمالي</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600">
                  {batchCompleted.length + batchFailed.length + batchSkipped.length}/{batchImages.length}
                </p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 md:h-4 mb-2">
                <div
                  className="h-3 md:h-4 bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${((batchCompleted.length + batchFailed.length + batchSkipped.length) / batchImages.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm md:text-base text-slate-600 text-center">
                {Math.round(((batchCompleted.length + batchFailed.length + batchSkipped.length) / batchImages.length) * 100)}%
              </p>
              
              {/* إحصائيات سريعة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="bg-green-100 rounded-lg p-3 text-center border-2 border-green-300">
                  <p className="text-xs text-green-800 font-semibold">نجح</p>
                  <p className="text-2xl font-bold text-green-700">{batchCompleted.length}</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-3 text-center border-2 border-blue-300">
                  <p className="text-xs text-blue-800 font-semibold">مصحح سابقاً</p>
                  <p className="text-2xl font-bold text-blue-700">{batchSkipped.filter((s: any) => s.alreadyGraded).length}</p>
                </div>
                <div className="bg-yellow-100 rounded-lg p-3 text-center border-2 border-yellow-300">
                  <p className="text-xs text-yellow-800 font-semibold">متجاهل</p>
                  <p className="text-2xl font-bold text-yellow-700">{batchSkipped.filter((s: any) => !s.alreadyGraded).length}</p>
                </div>
                <div className="bg-red-100 rounded-lg p-3 text-center border-2 border-red-300">
                  <p className="text-xs text-red-800 font-semibold">فشل</p>
                  <p className="text-2xl font-bold text-red-700">{batchFailed.length}</p>
                </div>
              </div>
            </div>

            {/* الطالب الحالي */}
            {batchCurrentIndex < batchImages.length && !batchPaused && (
              <div className="bg-white border-2 border-blue-400 rounded-xl p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                  <p className="text-base md:text-lg font-bold text-blue-900">جاري التصحيح:</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm md:text-base text-slate-700">
                    <span className="font-bold">الصفحة:</span> {batchCurrentIndex + 1}/{batchImages.length}
                  </p>
                  <p className="text-sm md:text-base text-slate-700">
                    <span className="font-bold">الحالة:</span> {processingStep || 'جاري التحليل...'}
                  </p>
                </div>
              </div>
            )}

            {/* تم التصحيح */}
            {batchCompleted.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-300">
                <p className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  تم التصحيح ({batchCompleted.length}):
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {batchCompleted.slice(-5).reverse().map((sheet, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-sm font-bold text-slate-900">
                        ✓ {sheet.student?.name || 'طالب غير محدد'}
                      </p>
                      <p className="text-xs text-slate-600">
                        الدرجة: {sheet.score || 0}/{currentSheet?.model?.questions?.length || 50}
                      </p>
                    </div>
                  ))}
                  {batchCompleted.length > 5 && (
                    <p className="text-xs text-slate-500 text-center">
                      ... و {batchCompleted.length - 5} آخرين
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* الأوراق المتجاهلة */}
            {batchSkipped.length > 0 && (
              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-300">
                <p className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                  <BoltIcon className="w-5 h-5" />
                  أوراق متجاهلة ({batchSkipped.length}):
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {batchSkipped.map((sheet, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                      <p className="text-sm font-bold text-slate-900">
                        {sheet.alreadyGraded ? '' : '⊘'} الصفحة {sheet.pageNumber}
                      </p>
                      {sheet.studentName && (
                        <p className="text-sm font-semibold text-blue-900">{sheet.studentName}</p>
                      )}
                      <p className="text-xs text-yellow-700">{sheet.error}</p>
                      {sheet.nationalId && (
                        <p className="text-xs text-slate-500 mt-1">الرقم القومي: {sheet.nationalId}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* فشل التصحيح */}
            {batchFailed.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-300">
                <p className="font-bold text-red-900 mb-3 flex items-center gap-2">
                  <XCircleIcon className="w-5 h-5" />
                  فشل التصحيح ({batchFailed.length}):
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {batchFailed.map((sheet, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-red-200">
                      <p className="text-sm font-bold text-slate-900">
                        ✗ الصفحة {sheet.pageNumber}
                      </p>
                      <p className="text-xs text-red-600 mb-2">{sheet.error}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleRetryFailedSheet(sheet.pageNumber)}
                        >
                          إعادة المحاولة
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleManualGradeFailedSheet(sheet.pageNumber)}
                        >
                          تصحيح يدوي
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* أزرار التحكم */}
            <div className="flex gap-3 justify-center pt-4">
              {batchCurrentIndex < batchImages.length ? (
                <>
                  <Button
                    onClick={() => setBatchPaused(!batchPaused)}
                    variant="outline"
                    className="px-6 py-3"
                  >
                    {batchPaused ? <><PlayIcon className="w-4 h-4 ml-1" /> استئناف</> : <><PauseIcon className="w-4 h-4 ml-1" /> إيقاف مؤقت</>}
                  </Button>
                  <Button
                    onClick={handleStopBatchProcessing}
                    variant="outline"
                    className="px-6 py-3 text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <StopIcon className="w-4 h-4 ml-1" /> إيقاف
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setScanStep('batch-summary')}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                >
                  عرض الملخص النهائي
                </Button>
              )}
            </div>

            {/* عرض العمليات السابقة */}
            {batchSessions.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-slate-900">سجل العمليات السابقة</h4>
                  <Button
                    onClick={() => router.push(`/dashboard/paper-exams/${examId}/batch-log`)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    عرض الكل ({batchSessions.length})
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {batchSessions.slice(0, 6).map((session, index) => {
                    const isCompleted = session.status === 'COMPLETED';
                    const isPaused = session.status === 'PAUSED';
                    const totalProcessed = (session.completedCount || 0) + (session.alreadyGradedCount || 0) + (session.skippedCount || 0) + (session.failedCount || 0);
                    const progress = (totalProcessed / session.totalPages) * 100;

                    return (
                      <div key={session.id} className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200 hover:border-blue-400 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isCompleted && <span className="text-lg">✓</span>}
                            {isPaused && <span className="text-lg">●</span>}
                            {!isCompleted && !isPaused && <span className="text-lg">→</span>}
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                              {session.fileName || `عملية #${batchSessions.length - index}`}
                            </p>
                          </div>
                          <button
                            onClick={() => router.push(`/dashboard/paper-exams/${examId}/batch-log`)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            عرض
                          </button>
                        </div>
                        
                        {/* شريط التقدم صغير */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                          <div
                            className="h-1.5 bg-blue-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-green-700 font-semibold bg-green-50 px-2 py-1 rounded">✓ {session.completedCount || 0}</span>
                            {(session.alreadyGradedCount || 0) > 0 && (
                              <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded">{session.alreadyGradedCount}</span>
                            )}
                            {(session.skippedCount || 0) > 0 && (
                              <span className="text-yellow-700 bg-yellow-50 px-2 py-1 rounded">⊘ {session.skippedCount}</span>
                            )}
                            {(session.failedCount || 0) > 0 && (
                              <span className="text-red-700 bg-red-50 px-2 py-1 rounded">✗ {session.failedCount}</span>
                            )}
                          </div>
                          <span className="text-slate-600 font-bold">{Math.round(progress)}%</span>
                        </div>
                        
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(session.startTime).toLocaleString('ar-EG', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ملخص التصحيح المتعدد */}
      {scanStep === 'batch-summary' && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 border border-slate-200">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* رأس الصفحة */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-6 bg-green-50 rounded-full border-4 border-green-500">
                  <CheckCircleIcon className="w-16 h-16 md:w-20 md:h-20 text-green-600" />
                </div>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                اكتملت عملية التصحيح
              </h3>
              <p className="text-lg text-slate-600">
                تم معالجة {batchImages.length} ورقة
              </p>
            </div>

            {/* إحصائيات مفصلة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-green-50 rounded-xl p-6 border-2 border-green-300 text-center">
                <div className="text-5xl font-bold text-green-700 mb-2">
                  {batchCompleted.length}
                </div>
                <div className="flex items-center justify-center gap-2 text-green-800">
                  <CheckCircleIcon className="w-6 h-6" />
                  <span className="font-semibold">نجح</span>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-300 text-center">
                <div className="text-5xl font-bold text-blue-700 mb-2">
                  {batchSkipped.filter((s: any) => s.alreadyGraded).length}
                </div>
                <div className="flex items-center justify-center gap-2 text-blue-800">
                  <span className="font-semibold">مصحح سابقاً</span>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-300 text-center">
                <div className="text-5xl font-bold text-yellow-700 mb-2">
                  {batchSkipped.filter((s: any) => !s.alreadyGraded).length}
                </div>
                <div className="flex items-center justify-center gap-2 text-yellow-800">
                  <span className="font-semibold">متجاهل</span>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-6 border-2 border-red-300 text-center">
                <div className="text-5xl font-bold text-red-700 mb-2">
                  {batchFailed.length}
                </div>
                <div className="flex items-center justify-center gap-2 text-red-800">
                  <XCircleIcon className="w-6 h-6" />
                  <span className="font-semibold">فشل</span>
                </div>
              </div>
            </div>

            {/* تفاصيل الطلاب الناجحين */}
            {batchCompleted.length > 0 && (
              <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                <h4 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6" />
                  الطلاب الذين تم تصحيحهم ({batchCompleted.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {batchCompleted.map((sheet: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-green-200 hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-lg">
                            {sheet.student?.name || sheet.trainee?.nameAr}
                          </p>
                          <p className="text-sm text-slate-600">
                            {sheet.nationalId}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="bg-green-100 rounded-lg px-4 py-2 border border-green-300">
                            <p className="text-3xl font-bold text-green-700">
                              {sheet.score}
                            </p>
                            <p className="text-xs text-slate-600">من {sheet.totalQuestions}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-4 text-sm">
                        <span className="text-green-700">✓ {sheet.correctAnswers} صحيح</span>
                        <span className="text-red-700">✗ {sheet.wrongAnswers} خطأ</span>
                        <span className="text-slate-600">{sheet.answeredQuestions} مجاب</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* تفاصيل المصححة سابقاً */}
            {batchSkipped.filter((s: any) => s.alreadyGraded).length > 0 && (
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <h4 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  الأوراق المصححة سابقاً ({batchSkipped.filter((s: any) => s.alreadyGraded).length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batchSkipped.filter((s: any) => s.alreadyGraded).map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">صفحة {item.pageNumber}</p>
                          <p className="text-sm text-slate-600">{item.error}</p>
                          {item.nationalId && (
                            <p className="text-xs text-slate-500">{item.nationalId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* تفاصيل المتجاهلة */}
            {batchSkipped.filter((s: any) => !s.alreadyGraded).length > 0 && (
              <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
                <h4 className="text-xl font-bold text-yellow-900 mb-4 flex items-center gap-2">
                  الأوراق المتجاهلة ({batchSkipped.filter((s: any) => !s.alreadyGraded).length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batchSkipped.filter((s: any) => !s.alreadyGraded).map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">صفحة {item.pageNumber}</p>
                          <p className="text-sm text-slate-600">{item.error}</p>
                          {item.nationalId && (
                            <p className="text-xs text-slate-500">{item.nationalId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* تفاصيل الفاشلة */}
            {batchFailed.length > 0 && (
              <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                <h4 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                  <XCircleIcon className="w-6 h-6" />
                  الأوراق الفاشلة ({batchFailed.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batchFailed.map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">صفحة {item.pageNumber}</p>
                          <p className="text-sm text-red-600">{item.error}</p>
                          {item.nationalId && (
                            <p className="text-xs text-slate-500">{item.nationalId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* أزرار */}
            <div className="flex gap-3 justify-center pt-6 border-t">
              <Button
                onClick={() => router.push(`/dashboard/paper-exams/${examId}/batch-log`)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg"
              >
                عرض السجل الكامل
              </Button>
              <Button
                onClick={() => {
                  setScanStep('select');
                  setMode('camera');
                  setBatchPdfFile(null);
                  setBatchImages([]);
                  setBatchCompleted([]);
                  setBatchFailed([]);
                  setBatchSkipped([]);
                  setBatchCurrentIndex(0);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              >
                العودة للرئيسية
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/paper-exams/${examId}/batch-log`)}
                variant="outline"
                className="px-8 py-4 text-lg border-2"
              >
                عرض كل العمليات
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}