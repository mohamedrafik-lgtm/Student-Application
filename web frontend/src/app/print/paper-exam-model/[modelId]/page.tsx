'use client';

import { useState, useEffect, use } from 'react';
import { fetchAPI } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

export default function PrintExamModelPage({ params }: { params: Promise<{ modelId: string }> }) {
  const resolvedParams = use(params);
  const modelId = parseInt(resolvedParams.modelId);
  const searchParams = useSearchParams();
  const downloadMode = searchParams.get('download') === 'true';
  
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [modelId]);

  const loadData = async () => {
    try {
      const modelData = await fetchAPI(`/paper-exams/models/${modelId}`);
      setModel(modelData);
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && model) {
      if (downloadMode) {
        // تحميل كـ Word
        setTimeout(() => {
          const element = document.getElementById('exam-content');
          if (element) {
            const html = element.innerHTML;
            const blob = new Blob([
              `<!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <title>${model.paperExam.title} - ${model.modelName}</title>
                <style>
                  @page { size: A4; margin: 2.5cm; }
                  body {
                    font-family: 'Simplified Arabic', 'Traditional Arabic', 'Arial', sans-serif;
                    direction: rtl;
                    line-height: 1.8;
                    font-size: 14pt;
                    color: #000;
                  }
                  .header {
                    text-align: center;
                    border: 3px double #000;
                    padding: 15px;
                    margin-bottom: 25px;
                    background-color: #f5f5f5;
                  }
                  .header h1 { font-size: 22pt; font-weight: bold; margin: 5px 0; }
                  .header h2 { font-size: 18pt; font-weight: bold; margin: 5px 0; color: #333; }
                  .header p { font-size: 12pt; margin: 3px 0; }
                  .info-box {
                    border: 2px solid #000;
                    padding: 10px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                  }
                  .info-box span { font-weight: bold; }
                  .student-info {
                    border: 2px solid #000;
                    padding: 10px;
                    margin-bottom: 20px;
                  }
                  .instructions {
                    background-color: #fffbeb;
                    border: 2px solid #f59e0b;
                    padding: 10px;
                    margin-bottom: 20px;
                    border-radius: 5px;
                  }
                  .question {
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 15px;
                  }
                  .question-header {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                  }
                  .question-num {
                    font-weight: bold;
                    font-size: 16pt;
                    min-width: 30px;
                  }
                  .question-text {
                    font-size: 14pt;
                    line-height: 1.8;
                    flex: 1;
                  }
                  .options {
                    margin-right: 40px;
                    margin-top: 10px;
                  }
                  .option {
                    margin: 10px 0;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                  }
                  .option-label {
                    font-weight: bold;
                    min-width: 40px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                  }
                  .circle {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #000;
                    border-radius: 50%;
                    display: inline-block;
                  }
                  .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #000;
                    font-size: 11pt;
                  }
                </style>
              </head>
              <body>${html}</body>
              </html>`
            ], { type: 'application/msword' });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${model.paperExam.title} - ${model.modelName}.doc`;
            link.click();
            URL.revokeObjectURL(url);
            
            // إغلاق النافذة بعد التحميل
            setTimeout(() => window.close(), 1000);
          }
        }, 500);
      } else {
        // طباعة عادية
        setTimeout(() => window.print(), 500);
      }
    }
  }, [loading, model, downloadMode]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
  }

  if (!model) {
    return <div>النموذج غير موجود</div>;
  }

  // حروف إنجليزية لتوافق ورقة OMR
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="p-8 bg-white max-w-4xl mx-auto" id="exam-content">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .compact-question {
          break-inside: avoid;
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-8 border-b-4 border-black pb-4">
        <h1 className="text-3xl font-bold mb-2">{model.paperExam.trainingContent.program.nameAr}</h1>
        <h2 className="text-2xl font-bold mb-3">{model.paperExam.title}</h2>
        <div className="flex justify-around items-center mt-4 pt-4 border-t-2 border-slate-300">
          <p>نموذج: <span className="font-bold text-xl">{model.modelName}</span></p>
          <p>المدة: <span className="font-bold">{model.paperExam.duration} دقيقة</span></p>
          <p>الدرجات: <span className="font-bold">{model.paperExam.totalMarks} درجة</span></p>
        </div>
      </div>

      {/* بيانات الطالب */}
      <div className="border-2 border-black p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-semibold">الاسم: </span>
            <span className="inline-block w-64 border-b-2 border-dotted border-slate-600"></span>
          </div>
          <div>
            <span className="font-semibold">الرقم القومي: </span>
            <span className="inline-block w-48 border-b-2 border-dotted border-slate-600"></span>
          </div>
        </div>
      </div>

      {/* التعليمات */}
      {model.paperExam.instructions && (
        <div className="bg-slate-100 border-2 border-slate-400 p-4 mb-6">
          <h3 className="font-bold mb-2">◆ التعليمات:</h3>
          <p className="whitespace-pre-wrap text-sm">{model.paperExam.instructions}</p>
        </div>
      )}

      {/* الأسئلة - بنفس الترتيب من database */}
      <div className="space-y-4">
        {model.questions?.map((examQuestion: any, index: number) => (
          <div key={examQuestion.id} className="compact-question border-b pb-3">
            <div className="flex gap-2">
              <span className="font-bold text-base min-w-[30px]">{index + 1}.</span>
              <div className="flex-1">
                <p className="text-base mb-2 leading-normal">{examQuestion.question.text}</p>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mr-4 text-sm">
                  {examQuestion.question.options.map((option: any, optionIndex: number) => (
                    <div key={option.id} className="flex items-start gap-2">
                      <div className="flex items-center gap-1 min-w-[50px] flex-shrink-0">
                        <div className="w-4 h-4 border-2 border-black rounded-full flex-shrink-0"></div>
                        <span className="font-semibold">{optionLabels[optionIndex]}.</span>
                      </div>
                      <p className="flex-1 leading-tight">{option.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-black text-center">
        <p className="text-sm">نهاية الأسئلة - بالتوفيق</p>
        <p className="text-xs text-slate-600 mt-2">
          تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
        </p>
      </div>
    </div>
  );
}