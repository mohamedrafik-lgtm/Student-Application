'use client';

import { useState, useEffect, use } from 'react';
import QRCode from 'qrcode';
import { fetchAPI } from '@/lib/api';

export default function PrintAnswerSheetPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const resolvedParams = use(params);
  const sheetId = resolvedParams.sheetId;
  
  const [sheet, setSheet] = useState<any>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sheetId]);

  const loadData = async () => {
    try {
      const sheetData = await fetchAPI(`/paper-exams/answer-sheet/${sheetId}`);
      setSheet(sheetData);
      
      // توليد QR Code
      const qrDataURL = await QRCode.toDataURL(sheetData.qrCodeData, {
        width: 200,
        margin: 1,
      });
      setQrCodeDataUrl(qrDataURL);
      
    } catch (error) {
      console.error('Error loading sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && sheet) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, sheet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!sheet) {
    return <div>ورقة الإجابة غير موجودة</div>;
  }

  return (
    <div className="p-8 bg-white">
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
        
        .bubble {
          width: 24px;
          height: 24px;
          border: 2px solid #000;
          border-radius: 50%;
          display: inline-block;
        }
        
        .bubble-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .question-number {
          font-weight: bold;
          min-width: 40px;
        }
      `}</style>

      {/* Header */}
      <div className="border-b-4 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">ورقة الإجابة - نظام الدوائر</h1>
            <p className="text-lg">{sheet.paperExam.title}</p>
            <p className="text-sm text-slate-700">{sheet.paperExam.trainingContent.name}</p>
          </div>
          <div className="text-center">
            <img src={qrCodeDataUrl} alt="QR Code" className="w-32 h-32" />
            <p className="text-xs mt-1">{sheet.sheetCode}</p>
          </div>
        </div>
      </div>

      {/* بيانات المتدرب */}
      <div className="border-2 border-black p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-semibold">الاسم:</p>
            <p className="text-lg border-b-2 border-dotted border-slate-400 pb-1">{sheet.trainee.nameAr}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">الرقم القومي:</p>
            <p className="text-lg border-b-2 border-dotted border-slate-400 pb-1">{sheet.trainee.nationalId}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">النموذج:</p>
            <p className="text-lg border-b-2 border-dotted border-slate-400 pb-1 font-bold">{sheet.model.modelName}</p>
          </div>
        </div>
      </div>

      {/* تعليمات */}
      <div className="bg-slate-100 border-2 border-slate-400 p-4 mb-6">
        <h3 className="font-bold mb-2">◆ تعليمات هامة:</h3>
        <ul className="text-sm space-y-1">
          <li>• استخدم قلم رصاص أسود فقط</li>
          <li>• املأ الدائرة بالكامل</li>
          <li>• لا تكتب خارج الدوائر</li>
          <li>• إجابة واحدة فقط لكل سؤال</li>
          <li>• للتغيير: امسح جيداً ثم املأ الدائرة الجديدة</li>
        </ul>
      </div>

      {/* الأسئلة مع نظام الدوائر */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold mb-4 bg-slate-100 p-3 rounded">
          الأسئلة - اختر الإجابة الصحيحة بتعبئة الدائرة
        </h3>
        
        {sheet.model.questions?.map((examQuestion: any, index: number) => {
          const optionLabels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
          
          return (
            <div key={examQuestion.id} className="border-b-2 border-slate-300 pb-4">
              {/* نص السؤال */}
              <div className="flex gap-3 mb-3">
                <span className="font-bold text-lg">{index + 1}.</span>
                <p className="text-lg leading-relaxed flex-1">{examQuestion.question.text}</p>
              </div>
              
              {/* الخيارات مع الدوائر */}
              <div className="mr-8 space-y-2">
                {examQuestion.question.options.map((option: any, optionIndex: number) => (
                  <div key={option.id} className="flex items-start gap-3">
                    <div className="flex items-center gap-2 min-w-[60px] flex-shrink-0">
                      <span className="font-semibold text-base">{optionLabels[optionIndex]}.</span>
                      <div className="bubble"></div>
                    </div>
                    <p className="flex-1 leading-relaxed pt-1">{option.text}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-black text-center">
        <p className="text-sm text-slate-600">
          نهاية ورقة الإجابة - تأكد من ملء جميع البيانات بشكل صحيح
        </p>
      </div>
    </div>
  );
}